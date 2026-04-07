import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Card from './Card';
import Button from './Button';
import { useTheme } from '../../theme/useTheme';

export default function InlineErrorCard({
  message,
  onRetry,
}: {
  message: string;
  onRetry?: () => void;
}) {
  const theme = useTheme();

  return (
    <Card>
      <View style={[styles.row, { borderLeftColor: theme.danger }]}> 
        <Text style={[styles.icon, { color: theme.danger }]}>⚠</Text>
        <View style={styles.content}>
          <Text style={[styles.title, { color: theme.text }]}>Something went wrong</Text>
          <Text style={[styles.message, { color: theme.textSecondary }]}>{message}</Text>
          {onRetry ? <Button title="Retry" onPress={onRetry} /> : null}
        </View>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: 10,
    borderLeftWidth: 4,
    borderRadius: 10,
    paddingLeft: 10,
  },
  icon: {
    fontSize: 18,
    marginTop: 2,
  },
  content: {
    flex: 1,
    gap: 6,
  },
  title: {
    fontSize: 15,
    fontWeight: '800',
  },
  message: {
    fontSize: 13,
    fontWeight: '600',
  },
});
