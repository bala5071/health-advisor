import { create } from 'zustand';
import { storage } from '../services/storage';

interface SettingsState {
  theme: 'light' | 'dark' | 'system';
  reportFrequency: 'weekly' | 'monthly' | 'none';
  notifications: {
    enabled: boolean;
    frequency: 'daily' | 'weekly' | 'monthly';
  };
  setTheme: (theme: 'light' | 'dark' | 'system') => void;
  setReportFrequency: (frequency: SettingsState['reportFrequency']) => void;
  setNotificationSettings: (settings: SettingsState['notifications']) => void;
  hydrate: () => Promise<void>;
}

const SETTINGS_KEY = 'settings:v1';

const safeJsonParse = (v: string | null): any => {
  if (!v) return null;
  try {
    return JSON.parse(v);
  } catch {
    return null;
  }
};

const persist = async (next: Pick<SettingsState, 'theme' | 'reportFrequency' | 'notifications'>) => {
  await storage.setItem(SETTINGS_KEY, JSON.stringify(next));
};

export const useSettingsStore = create<SettingsState>((set) => ({
  theme: 'system',
  reportFrequency: 'weekly',
  notifications: {
    enabled: true,
    frequency: 'daily',
  },
  setTheme: (theme) =>
    set((s) => {
      const next = { ...s, theme };
      persist({ theme: next.theme, reportFrequency: next.reportFrequency, notifications: next.notifications }).catch(() => undefined);
      return { theme };
    }),
  setReportFrequency: (reportFrequency) =>
    set((s) => {
      const next = { ...s, reportFrequency };
      persist({ theme: next.theme, reportFrequency: next.reportFrequency, notifications: next.notifications }).catch(() => undefined);
      return { reportFrequency };
    }),
  setNotificationSettings: (notifications) =>
    set((s) => {
      const next = { ...s, notifications };
      persist({ theme: next.theme, reportFrequency: next.reportFrequency, notifications: next.notifications }).catch(() => undefined);
      return { notifications };
    }),
  hydrate: async () => {
    const raw = await storage.getItem(SETTINGS_KEY);
    const parsed = safeJsonParse(raw);
    if (!parsed || typeof parsed !== 'object') return;

    const theme = parsed.theme === 'light' || parsed.theme === 'dark' || parsed.theme === 'system' ? parsed.theme : undefined;
    const reportFrequency = parsed.reportFrequency === 'weekly' || parsed.reportFrequency === 'monthly' || parsed.reportFrequency === 'none'
      ? parsed.reportFrequency
      : undefined;
    const notifications = parsed.notifications && typeof parsed.notifications === 'object'
      ? {
          enabled: Boolean(parsed.notifications.enabled),
          frequency:
            parsed.notifications.frequency === 'daily' || parsed.notifications.frequency === 'weekly' || parsed.notifications.frequency === 'monthly'
              ? parsed.notifications.frequency
              : 'daily',
        }
      : undefined;

    set((s) => ({
      theme: theme ?? s.theme,
      reportFrequency: reportFrequency ?? s.reportFrequency,
      notifications: notifications ?? s.notifications,
    }));
  },
}));
