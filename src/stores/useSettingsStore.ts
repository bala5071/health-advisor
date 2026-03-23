import { create } from 'zustand';

interface SettingsState {
  theme: 'light' | 'dark' | 'system';
  notifications: {
    enabled: boolean;
    frequency: 'daily' | 'weekly' | 'monthly';
  };
  setTheme: (theme: 'light' | 'dark' | 'system') => void;
  setNotificationSettings: (settings: SettingsState['notifications']) => void;
}

export const useSettingsStore = create<SettingsState>((set) => ({
  theme: 'system',
  notifications: {
    enabled: true,
    frequency: 'daily',
  },
  setTheme: (theme) => set({ theme }),
  setNotificationSettings: (notifications) => set({ notifications }),
}));
