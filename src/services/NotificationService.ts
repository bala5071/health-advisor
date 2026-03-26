import { supabase } from '../supabase/client';
import { storage } from './storage';

export type NotificationPreferences = {
  weeklyReportReady: boolean;
  severeAllergenAlert: boolean;
  dailyNoScanNudge: boolean;
};

const PREFS_KEY = 'notif:prefs:v1';
const WEEKLY_ID_KEY = 'notif:weekly_id';
const NUDGE_ID_KEY = 'notif:nudge_id';

const defaultPrefs: NotificationPreferences = {
  weeklyReportReady: true,
  severeAllergenAlert: true,
  dailyNoScanNudge: false,
};

const safeJsonParse = (v: string | null): any => {
  if (!v) return null;
  try {
    return JSON.parse(v);
  } catch {
    return null;
  }
};

const getNotifications = () => {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    return require('expo-notifications') as any;
  } catch {
    throw new Error('expo-notifications is required for notifications. Install with: npx expo install expo-notifications');
  }
};

const ensureAndroidChannel = async () => {
  try {
    const Notifications = getNotifications();
    await Notifications.setNotificationChannelAsync('health', {
      name: 'Health Alerts',
      importance: Notifications.AndroidImportance?.HIGH ?? 4,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#FF231F7C',
    });
  } catch {
    // ignore
  }
};

const nowMs = () => Date.now();

const tryGetLastScanAt = async (userId: string): Promise<number> => {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const repos = require('../database/repositories') as typeof import('../database/repositories');
    const scans = await repos.ScanRepository.getScans(userId);
    let max = 0;
    for (const s of scans as any[]) {
      const ts = typeof (s as any)?._raw?.created_at === 'number' ? (s as any)._raw.created_at : 0;
      if (ts > max) max = ts;
    }
    return max;
  } catch {
    return 0;
  }
};

export class NotificationService {
  static async requestPermissions(): Promise<boolean> {
    const Notifications = getNotifications();
    await ensureAndroidChannel();

    const settings = await Notifications.getPermissionsAsync();
    if (settings?.granted) return true;

    const req = await Notifications.requestPermissionsAsync();
    return Boolean(req?.granted);
  }

  static async getCachedPreferences(): Promise<NotificationPreferences> {
    const raw = await storage.getItem(PREFS_KEY);
    const parsed = safeJsonParse(raw);
    if (parsed && typeof parsed === 'object') {
      return {
        weeklyReportReady: Boolean(parsed.weeklyReportReady),
        severeAllergenAlert: Boolean(parsed.severeAllergenAlert),
        dailyNoScanNudge: Boolean(parsed.dailyNoScanNudge),
      };
    }
    return { ...defaultPrefs };
  }

  static async setCachedPreferences(prefs: NotificationPreferences): Promise<void> {
    await storage.setItem(PREFS_KEY, JSON.stringify(prefs));
  }

  static async loadPreferences(userId: string): Promise<NotificationPreferences> {
    const cached = await this.getCachedPreferences();

    try {
      const { data, error } = await supabase
        .from('notification_prefs')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        const prefs: NotificationPreferences = {
          weeklyReportReady: Boolean((data as any).weekly_report_ready),
          severeAllergenAlert: Boolean((data as any).severe_allergen_alert),
          dailyNoScanNudge: Boolean((data as any).daily_no_scan_nudge),
        };
        await this.setCachedPreferences(prefs);
        return prefs;
      }
    } catch {
      // ignore
    }

    return cached;
  }

  static async savePreferences(userId: string, prefs: NotificationPreferences): Promise<void> {
    await this.setCachedPreferences(prefs);

    try {
      await supabase.from('notification_prefs').upsert(
        {
          user_id: userId,
          weekly_report_ready: prefs.weeklyReportReady,
          severe_allergen_alert: prefs.severeAllergenAlert,
          daily_no_scan_nudge: prefs.dailyNoScanNudge,
          updated_at: nowMs(),
        },
        { onConflict: 'user_id' },
      );
    } catch {
      // ignore
    }

    await this.applyScheduling(userId, prefs).catch(() => undefined);
  }

  static async applyScheduling(userId: string, prefs: NotificationPreferences): Promise<void> {
    const Notifications = getNotifications();
    await ensureAndroidChannel();

    const granted = await this.requestPermissions().catch(() => false);
    if (!granted) return;

    // Weekly report ready (recurring)
    try {
      const existingId = await storage.getItem(WEEKLY_ID_KEY);
      if (existingId) {
        await Notifications.cancelScheduledNotificationAsync(existingId).catch(() => undefined);
        await storage.removeItem(WEEKLY_ID_KEY);
      }

      if (prefs.weeklyReportReady) {
        const id = await Notifications.scheduleNotificationAsync({
          content: {
            title: 'Weekly report is ready',
            body: 'Your health summary report has been generated. Tap to review.',
            sound: true,
            channelId: 'health',
          },
          trigger: {
            weekday: 2, // Monday-ish (Expo: 1=Sunday)
            hour: 9,
            minute: 0,
            repeats: true,
          },
        });
        await storage.setItem(WEEKLY_ID_KEY, String(id));
      }
    } catch {
      // ignore
    }

    // Daily nudge if no scan in 2 days: schedule next morning if condition holds at scheduling time.
    try {
      const existingNudgeId = await storage.getItem(NUDGE_ID_KEY);
      if (existingNudgeId) {
        await Notifications.cancelScheduledNotificationAsync(existingNudgeId).catch(() => undefined);
        await storage.removeItem(NUDGE_ID_KEY);
      }

      if (prefs.dailyNoScanNudge) {
        const lastScanAt = await tryGetLastScanAt(userId);
        const twoDaysAgo = nowMs() - 2 * 24 * 60 * 60 * 1000;
        if (!lastScanAt || lastScanAt < twoDaysAgo) {
          const id = await Notifications.scheduleNotificationAsync({
            content: {
              title: 'Quick check-in',
              body: 'No scans logged recently. Scan a label to keep your trends up to date.',
              sound: false,
              channelId: 'health',
            },
            trigger: {
              hour: 10,
              minute: 0,
              repeats: false,
            },
          });
          await storage.setItem(NUDGE_ID_KEY, String(id));
        }
      }
    } catch {
      // ignore
    }
  }

  static async triggerSevereAllergenAlert(opts: {
    userId: string;
    allergenNames: string[];
  }): Promise<void> {
    try {
      const prefs = await this.loadPreferences(opts.userId);
      if (!prefs.severeAllergenAlert) return;

      const granted = await this.requestPermissions().catch(() => false);
      if (!granted) return;

      const Notifications = getNotifications();
      await ensureAndroidChannel();

      const names = (opts.allergenNames || []).slice(0, 4).join(', ');
      await Notifications.scheduleNotificationAsync({
        content: {
          title: 'Severe allergen detected',
          body: names ? `Potential severe exposure: ${names}` : 'Potential severe allergen exposure detected.',
          sound: true,
          channelId: 'health',
        },
        trigger: null,
      });
    } catch {
      // ignore
    }
  }
}
