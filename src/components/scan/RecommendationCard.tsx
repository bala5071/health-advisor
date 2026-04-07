import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
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
        icon: '✅',
        bg: '#2ECC71',
        text: '#FFFFFF',
      };
    }
    if (verdict === 'CAUTION') {
      return {
        icon: '⚠️',
        bg: '#F39C12',
        text: '#FFFFFF',
      };
    }
    return {
      icon: '🚫',
      bg: '#E74C3C',
      text: '#FFFFFF',
    };
  }, [verdict]);

  const label = verdict;

  return (
    <Animated.View entering={FadeInDown.springify().damping(18).stiffness(220)}>
      <Card>
        <View style={[styles.container, { backgroundColor: palette.bg }]}> 
          <View style={styles.verdictRow}>
            <Text allowFontScaling style={styles.icon}>{palette.icon}</Text>
            <Text allowFontScaling style={[styles.verdict, { color: palette.text }]}>{label}</Text>
          </View>
          {title ? <Text allowFontScaling style={[styles.title, { color: '#FFFFFF' }]}>{title}</Text> : null}
          {subtitle ? <Text allowFontScaling style={[styles.subtitle, { color: '#F4FFF7' }]}>{subtitle}</Text> : null}
        </View>
      </Card>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 16,
    padding: 18,
    gap: 10,
  },
  verdictRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  icon: {
    fontSize: 24,
  },
  verdict: {
    fontSize: 28,
    fontWeight: '700',
    lineHeight: 42,
    letterSpacing: 0.5,
  },
  title: {
    fontSize: 22,
    fontWeight: '600',
    lineHeight: 33,
  },
  subtitle: {
    fontSize: 15,
    fontWeight: '500',
    lineHeight: 23,
  },
});
