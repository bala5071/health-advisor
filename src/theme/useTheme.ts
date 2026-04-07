import { useColorScheme } from 'react-native';
import { useSettingsStore } from '../stores/useSettingsStore';
import { lightTheme, darkTheme } from './colors';
import { typography } from './typography';
import { spacing } from './spacing';
import { gradients } from './gradients';

export const useTheme = () => {
  const systemTheme = useColorScheme();
  const { theme: appTheme } = useSettingsStore();

  const resolvedTheme = systemTheme || (appTheme === 'dark' ? 'dark' : 'light');

  const colors = resolvedTheme === 'light' ? lightTheme : darkTheme;

  return {
    ...colors,
    typography,
    spacing,
    gradients,
    cardStyle: {
      borderRadius: 12,
      shadowColor: '#000',
      shadowOpacity: 0.06,
      shadowRadius: 8,
      shadowOffset: { width: 0, height: 3 },
      elevation: 2,
      backgroundColor: colors.card,
    },
  };
};
