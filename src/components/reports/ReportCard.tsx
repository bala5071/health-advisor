import React, { useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
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

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.85} style={styles.row}>
      <View style={styles.left}>
        <View style={[styles.iconCircle, { backgroundColor: clinicVisitFlag ? '#FF3B30' : '#34C759' }]}>
          <Ionicons name="document-text" size={17} color="#FFFFFF" />
        </View>
        <View style={styles.textWrap}>
          <Text style={[styles.title, { color: theme.text }]} numberOfLines={1}>{title}</Text>
          <Text style={[styles.summary, { color: theme.textSecondary }]} numberOfLines={1}>{summary}</Text>
        </View>
      </View>
      <View style={styles.right}>
        <Text style={[styles.ts, { color: theme.textSecondary }]}>{ts}</Text>
        <Ionicons name="chevron-forward" size={17} color="#C7C7CC" />
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  row: {
    minHeight: 50,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
  },
  left: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconCircle: {
    width: 30,
    height: 30,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  textWrap: {
    flex: 1,
  },
  title: {
    fontSize: 17,
    fontWeight: '400',
  },
  ts: {
    fontSize: 15,
    fontWeight: '400',
    marginRight: 6,
  },
  summary: {
    fontSize: 13,
    fontWeight: '400',
  },
  right: {
    flexDirection: 'row',
    alignItems: 'center',
  },
});
