import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import Card from './Card';
import { useTheme } from '../../theme/useTheme';

const cycleMessages = [
  'Detecting product...',
  'Reading nutrition label...',
  'Analyzing ingredients...',
  'Generating recommendation...',
];

export default function ProcessingOverlay({ visible }: { visible: boolean }) {
  const theme = useTheme();
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (!visible) return;
    const id = setInterval(() => {
      setIndex((i) => (i + 1) % cycleMessages.length);
    }, 1800);
    return () => clearInterval(id);
  }, [visible]);

  const message = useMemo(() => cycleMessages[index], [index]);

  if (!visible) return null;

  return (
    <View style={[styles.backdrop, { backgroundColor: theme.overlay }]}> 
      <View style={[styles.gradient, { backgroundColor: theme.surface }]} />
      <Card>
        <View style={styles.content}>
          <ActivityIndicator size="large" color={theme.primary} />
          <Text style={[styles.title, { color: theme.text }]}>Health Advisor</Text>
          <Text style={[styles.message, { color: theme.textSecondary }]}>{message}</Text>
        </View>
      </Card>
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.25)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    zIndex: 30,
  },
  gradient: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.12,
  },
  content: {
    alignItems: 'center',
    gap: 8,
    minWidth: 240,
  },
  title: {
    fontSize: 18,
    fontWeight: '900',
  },
  message: {
    fontSize: 14,
    fontWeight: '700',
    textAlign: 'center',
  },
});
