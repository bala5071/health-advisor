import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useTheme } from '../../theme/useTheme';

export default function Card({ children }: { children: React.ReactNode }) {
  useTheme();

  return <View style={styles.groupedCard}>{children}</View>;
}

export function RoundedCard({ children }: { children: React.ReactNode }) {
  const theme = useTheme();

  return (
    <View
      style={[
        styles.roundedCard,
        {
          ...theme.cardStyle,
          borderColor: theme.border,
        },
      ]}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  groupedCard: {
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#E5E5EA',
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginVertical: 6,
  },
  roundedCard: {
    borderRadius: 12,
    padding: 16,
    marginVertical: 6,
    borderWidth: 1,
  },
});
