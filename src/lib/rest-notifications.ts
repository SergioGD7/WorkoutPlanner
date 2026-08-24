/**
 * Rest-timer notifications.
 *
 * The in-app chime only reaches you while the app is on screen and awake. In a
 * gym you put the phone in a pocket, the WebView gets suspended and the timer
 * tick stops running — so the alert has to be handed to the operating system
 * *in advance*, scheduled for the moment the rest ends.
 *
 * `@capacitor/local-notifications` does exactly that on iOS and Android. Its web
 * implementation falls back to the Notifications API, which is no better than
 * what the app already did in a browser, but no worse — so one code path covers
 * every platform.
 *
 * The plugin is imported lazily: the web bundle should not pay for it up front,
 * and importing it eagerly would run Capacitor's bootstrap during SSG.
 */

/** Fixed id: there is only ever one rest running, so scheduling replaces it. */
const REST_NOTIFICATION_ID = 1;

type LocalNotificationsPlugin = typeof import('@capacitor/local-notifications')['LocalNotifications'];

/**
 * The plugin is kept boxed inside an object, and never resolved from a promise
 * on its own. Capacitor plugins are Proxies that turn *any* property access into
 * a native call, including `.then`. Resolving one directly makes the promise
 * machinery treat it as a thenable and invoke `LocalNotifications.then()`, which
 * fails with "not implemented on android" and the plugin never arrives. Boxing
 * it keeps the awaited value a plain object.
 */
type PluginBox = { plugin: LocalNotificationsPlugin };

let pluginPromise: Promise<PluginBox | null> | null = null;

function getPlugin(): Promise<PluginBox | null> {
  if (typeof window === 'undefined') return Promise.resolve(null);

  pluginPromise ??= import('@capacitor/local-notifications')
    .then((module): PluginBox => ({ plugin: module.LocalNotifications }))
    .catch((error) => {
      console.error('Local notifications plugin unavailable:', error);
      return null;
    });

  return pluginPromise;
}

/**
 * Asks the OS for permission. Returns whether notifications can be delivered.
 * Must be called from a user gesture: both browsers and iOS require it.
 */
export async function requestRestNotificationPermission(): Promise<boolean> {
  const box = await getPlugin();
  if (!box) return false;

  try {
    const current = await box.plugin.checkPermissions();
    if (current.display === 'granted') return true;
    if (current.display === 'denied') return false;

    const requested = await box.plugin.requestPermissions();
    return requested.display === 'granted';
  } catch (error) {
    console.error('Could not obtain notification permission:', error);
    return false;
  }
}

/**
 * Books the alert with the OS for `endsAt`. Safe to call repeatedly: the fixed
 * id means a reschedule (say, after "+15s") replaces the pending one.
 */
export async function scheduleRestNotification(
  endsAt: number,
  title: string,
  body: string,
): Promise<void> {
  // Nothing to deliver if the moment has already passed.
  if (endsAt <= Date.now()) return;

  const box = await getPlugin();
  if (!box) return;

  try {
    const permission = await box.plugin.checkPermissions();
    if (permission.display !== 'granted') return;

    await box.plugin.cancel({ notifications: [{ id: REST_NOTIFICATION_ID }] });
    await box.plugin.schedule({
      notifications: [
        {
          id: REST_NOTIFICATION_ID,
          title,
          body,
          schedule: {
            at: new Date(endsAt),
            // Fire at the exact second rather than in a batched wake-up window;
            // a rest timer that goes off a minute late is useless.
            allowWhileIdle: true,
          },
        },
      ],
    });
  } catch (error) {
    // Permission revoked mid-session, or the platform refused to schedule.
    // The in-app chime still covers the foreground case.
    console.error('Could not schedule the rest notification:', error);
  }
}

/** Withdraws a pending alert: the rest was skipped, or ended with the app open. */
export async function cancelRestNotification(): Promise<void> {
  const box = await getPlugin();
  if (!box) return;

  try {
    await box.plugin.cancel({ notifications: [{ id: REST_NOTIFICATION_ID }] });
  } catch {
    // Nothing pending, or the platform has no scheduler. Either way, done.
  }
}
