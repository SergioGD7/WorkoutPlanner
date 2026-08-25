/**
 * Scheduled local notifications: the rest timer's chime and the workout reminder.
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

/**
 * Fixed ids, one per kind of alert. Scheduling with the same id replaces the
 * pending one, and cancelling one never disturbs the other.
 */
export const REST_NOTIFICATION_ID = 1;
export const REMINDER_NOTIFICATION_ID = 2;
export const WORK_NOTIFICATION_ID = 3;
export const TEST_NOTIFICATION_ID = 9;

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
 * Android delivers every notification through a channel, and the channel — not
 * the notification — decides how loudly it lands. The plugin's default channel
 * is created at importance 3, which files the alert quietly in the shade: no
 * banner, no sound over another app. That is indistinguishable from "the
 * notification never arrived" when your phone is in a pocket and you are three
 * apps away, which is the only situation this feature exists for.
 *
 * Importance 5 is the heads-up banner. The channel is created once; its settings
 * are fixed at creation, so the id carries a version suffix — Android ignores
 * changes to an existing channel, and a new id is the only way to raise the
 * importance for someone who already has the old one.
 */
const CHANNEL_ID = 'workout-alerts-v2';

let channelPromise: Promise<void> | null = null;

function ensureChannel(box: PluginBox): Promise<void> {
  channelPromise ??= box.plugin
    .createChannel({
      id: CHANNEL_ID,
      name: 'Workout alerts',
      description: 'Rest timers, set timers and workout reminders',
      importance: 5,
      visibility: 1,
      vibration: true,
    })
    .catch(() => {
      // iOS and the web have no channels; the call is simply not implemented
      // there and the notification works without one.
    });

  return channelPromise;
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

    // Deliberately no early return on 'denied'. Android reports POST_NOTIFICATIONS
    // as denied *before it has ever asked*, so treating that as final meant the
    // system prompt never appeared and the toggle could never be switched on.
    // Asking again when it is genuinely denied is harmless: the platform answers
    // from its own record without showing anything.
    const requested = await box.plugin.requestPermissions();
    return requested.display === 'granted';
  } catch (error) {
    console.error('Could not obtain notification permission:', error);
    return false;
  }
}

/**
 * Books an alert with the OS for `at`. Safe to call repeatedly: the fixed id
 * means a reschedule (say, after "+15s") replaces the pending one.
 */
export async function scheduleNotification(
  id: number,
  at: number,
  title: string,
  body: string,
): Promise<void> {
  // Nothing to deliver if the moment has already passed.
  if (at <= Date.now()) return;

  const box = await getPlugin();
  if (!box) return;

  try {
    const permission = await box.plugin.checkPermissions();
    if (permission.display !== 'granted') return;

    await ensureChannel(box);

    // Its own try: cancelling an id with nothing pending is expected, and on
    // some platforms it rejects. Sharing a block with the schedule below meant
    // that rejection skipped the scheduling entirely — the alert was silently
    // never booked.
    try {
      await box.plugin.cancel({ notifications: [{ id }] });
    } catch {
      // Nothing was pending. Carry on and book the new one.
    }

    await box.plugin.schedule({
      notifications: [
        {
          id,
          title,
          body,
          channelId: CHANNEL_ID,
          schedule: {
            at: new Date(at),
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
    console.error('Could not schedule the notification:', error);
  }
}

/** Withdraws a pending alert: the rest was skipped, or the day got logged. */
export async function cancelNotification(id: number): Promise<void> {
  const box = await getPlugin();
  if (!box) return;

  try {
    await box.plugin.cancel({ notifications: [{ id }] });
  } catch {
    // Nothing pending, or the platform has no scheduler. Either way, done.
  }
}

/** Convenience wrappers so callers don't juggle ids. */
export const scheduleRestNotification = (at: number, title: string, body: string) =>
  scheduleNotification(REST_NOTIFICATION_ID, at, title, body);

export const cancelRestNotification = () => cancelNotification(REST_NOTIFICATION_ID);

/** What happened when we tried to book an alert. */
export type NotificationCheck = 'scheduled' | 'denied' | 'unavailable' | 'failed';

/**
 * Books an alert a few seconds out and reports what the OS actually said.
 *
 * "The notification never arrived" has half a dozen causes that look identical
 * from inside the app — permission never granted, exact alarms switched off, the
 * manufacturer's battery saver killing the process — and none of them are
 * visible in a rest timer that ends three minutes from now. This is the short
 * loop: press it, leave the app, and either it lands or it does not.
 */
export async function scheduleTestNotification(
  delaySeconds: number,
  title: string,
  body: string,
): Promise<NotificationCheck> {
  const box = await getPlugin();
  if (!box) return 'unavailable';

  try {
    const permission = await box.plugin.checkPermissions();
    if (permission.display !== 'granted') return 'denied';

    await ensureChannel(box);
    await scheduleNotification(TEST_NOTIFICATION_ID, Date.now() + delaySeconds * 1000, title, body);
    return 'scheduled';
  } catch (error) {
    console.error('Test notification failed:', error);
    return 'failed';
  }
}
