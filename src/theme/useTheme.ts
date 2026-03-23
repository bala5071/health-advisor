import { useColorScheme } from 'react-native';
import { useSettingsStore } from '../stores/useSettingsStore';
import { lightTheme, darkTheme } from './colors';

export const useTheme = () => {
  const systemTheme = useColorScheme();
  const { theme: appTheme } = useSettingsStore();

  const resolvedTheme = appTheme === 'system' ? systemTheme || 'light' : appTheme;

  return resolvedTheme === 'light' ? lightTheme : darkTheme;
};
