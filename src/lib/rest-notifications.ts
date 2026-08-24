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

let pluginPromise: Promise<LocalNotificationsPlugin | null> | null = null;

async function getPlugin(): Promise<LocalNotificationsPlugin | null> {
  if (typeof window === 'undefined') return null;

  pluginPromise ??= import('@capacitor/local-notifications')
    .then((module) => module.LocalNotifications)
    .catch(() => null);

  return pluginPromise;
}

/**
 * Asks the OS for permission. Returns whether notifications can be delivered.
 * Must be called from a user gesture: both browsers and iOS require it.
 */
export async function requestRestNotificationPermission(): Promise<boolean> {
  const plugin = await getPlugin();
  if (!plugin) return false;

  try {
    const current = await plugin.checkPermissions();
    if (current.display === 'granted') return true;
    if (current.display === 'denied') return false;

    const requested = await plugin.requestPermissions();
    return requested.display === 'granted';
  } catch {
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

  const plugin = await getPlugin();
  if (!plugin) return;

  try {
    const permission = await plugin.checkPermissions();
    if (permission.display !== 'granted') return;

    await plugin.cancel({ notifications: [{ id: REST_NOTIFICATION_ID }] });
    await plugin.schedule({
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
  } catch {
    // Permission revoked mid-session, or the platform refused to schedule.
    // The in-app chime still covers the foreground case.
  }
}

/** Withdraws a pending alert: the rest was skipped, or ended with the app open. */
export async function cancelRestNotification(): Promise<void> {
  const plugin = await getPlugin();
  if (!plugin) return;

  try {
    await plugin.cancel({ notifications: [{ id: REST_NOTIFICATION_ID }] });
  } catch {
    // Nothing pending, or the platform has no scheduler. Either way, done.
  }
}
