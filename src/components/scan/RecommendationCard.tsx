import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Card from '../common/Card';
import { useTheme } from '../../theme/useTheme';

export type Verdict = 'APPROVED' | 'CAUTION' | 'AVOID';

export default function RecommendationCard({
  verdict,
  title,
  subtitle,
}: {
  verdict: Verdict;
  title?: string;
  subtitle?: string;
}) {
  const theme = useTheme();

  const palette = useMemo(() => {
    if (verdict === 'APPROVED') {
      return {
        bg: 'rgba(46, 204, 113, 0.12)',
        border: 'rgba(46, 204, 113, 0.45)',
        text: '#1D6B3A',
      };
    }
    if (verdict === 'CAUTION') {
      return {
        bg: 'rgba(241, 196, 15, 0.14)',
        border: 'rgba(241, 196, 15, 0.55)',
        text: '#6A4B00',
      };
    }
    return {
      bg: 'rgba(231, 76, 60, 0.12)',
      border: 'rgba(231, 76, 60, 0.55)',
      text: theme.danger,
    };
  }, [theme.danger, verdict]);

  const label = verdict;

  return (
    <Card>
      <View style={[styles.container, { backgroundColor: palette.bg, borderColor: palette.border }]}>
        <Text style={[styles.verdict, { color: palette.text }]}>{label}</Text>
        {title ? <Text style={[styles.title, { color: theme.text }]}>{title}</Text> : null}
        {subtitle ? <Text style={[styles.subtitle, { color: theme.text }]}>{subtitle}</Text> : null}
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  container: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 14,
    gap: 6,
  },
  verdict: {
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 1,
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
  },
  subtitle: {
    fontSize: 14,
    fontWeight: '600',
  },
});
