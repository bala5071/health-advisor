import React, { useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import Card from '../common/Card';
import { useTheme } from '../../theme/useTheme';

export default function ReportCard({
  title,
  summary,
  createdAt,
  clinicVisitFlag,
  onPress,
}: {
  title: string;
  summary: string;
  createdAt: number;
  clinicVisitFlag?: boolean;
  onPress: () => void;
}) {
  const theme = useTheme();

  const ts = useMemo(() => {
    try {
      return new Date(createdAt).toLocaleDateString();
    } catch {
      return String(createdAt);
    }
  }, [createdAt]);

  const badgeColor = clinicVisitFlag ? 'rgba(231, 76, 60, 0.16)' : 'rgba(52, 152, 219, 0.14)';

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.85}>
      <Card>
        <View style={styles.top}>
          <Text style={[styles.title, { color: theme.text }]}>{title}</Text>
          <View style={[styles.badge, { backgroundColor: badgeColor }]}>
            <Text style={[styles.badgeText, { color: theme.text }]}>{clinicVisitFlag ? 'URGENT' : 'REPORT'}</Text>
          </View>
        </View>
        <Text style={[styles.ts, { color: theme.text }]}>{ts}</Text>
        <Text style={[styles.summary, { color: theme.text }]} numberOfLines={3}>
          {summary}
        </Text>
      </Card>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  top: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    marginBottom: 6,
  },
  title: {
    fontSize: 16,
    fontWeight: '900',
    flex: 1,
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '900',
  },
  ts: {
    fontSize: 12,
    fontWeight: '700',
    opacity: 0.7,
    marginBottom: 8,
  },
  summary: {
    fontSize: 13,
    fontWeight: '700',
    opacity: 0.9,
  },
});
