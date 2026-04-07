import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, FlatList, RefreshControl, Pressable, useWindowDimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../src/theme/useTheme';
import { useAuth } from '../../src/components/AuthProvider';
import ReportCard from '../../src/components/reports/ReportCard';
import ClinicAlert from '../../src/components/reports/ClinicAlert';
import InlineErrorCard from '../../src/components/common/InlineErrorCard';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeInDown } from 'react-native-reanimated';

const safeJsonParse = (v: any): any => {
  if (typeof v !== 'string') return v;
  try {
    return JSON.parse(v);
  } catch {
    return null;
  }
};

type ReportRow = {
  id: string;
  createdAt: number;
  title: string;
  period: 'weekly' | 'monthly' | 'unknown';
  summary: string;
  clinicVisitFlag: boolean;
  stats?: any;
};

export default function Reports() {
  useTheme();
  const router = useRouter();
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const isTablet = width >= 768;

  const [reports, setReports] = useState<ReportRow[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toastError, setToastError] = useState<string | null>(null);
  const [windowFilter, setWindowFilter] = useState<'weekly' | 'monthly'>('weekly');

  const load = useCallback(async () => {
    try {
      setError(null);
      if (!user?.id) {
        setReports([]);
        return;
      }
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const repos = require('../../src/database/repositories') as typeof import('../../src/database/repositories');
      const rows = await repos.ReportRepository.getReports(user.id);

      const mapped: ReportRow[] = (rows as any[])
        .map((r: any) => {
          const createdAt = typeof r?._raw?.created_at === 'number' ? r._raw.created_at : Date.now();
          const summary = String(r?.summary ?? '');
          const rec = safeJsonParse(r?.recommendations) ?? {};
          const clinicVisitFlag = Boolean(rec?.clinicVisitFlag);
          const period = String(rec?.period || '').toLowerCase();
          const normalizedPeriod: ReportRow['period'] =
            period === 'weekly' || period === 'monthly' ? period : 'unknown';
          const title = normalizedPeriod === 'weekly' ? 'Weekly Report' : normalizedPeriod === 'monthly' ? 'Monthly Report' : 'Health Report';
          return {
            id: String(r?.id),
            createdAt,
            title,
            period: normalizedPeriod,
            summary,
            clinicVisitFlag,
            stats: rec?.stats ?? null,
          };
        })
        .sort((a, b) => b.createdAt - a.createdAt);

      setReports(mapped);
    } catch (e: any) {
      const msg = String(e?.message || e);
      setError(msg);
      setToastError(msg);
    }
  }, [user?.id]);

  useEffect(() => {
    if (!toastError) return;
    const id = setTimeout(() => setToastError(null), 4000);
    return () => clearTimeout(id);
  }, [toastError]);

  useEffect(() => {
    load();
  }, [load]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  const urgent = useMemo(() => reports.find((r) => r.clinicVisitFlag), [reports]);

  const visibleReports = useMemo(() => {
    if (windowFilter === 'weekly') {
      return reports.filter((r) => r.period === 'weekly' || r.period === 'unknown');
    }
    return reports.filter((r) => r.period === 'monthly' || r.period === 'unknown');
  }, [reports, windowFilter]);

  return (
    <View style={styles.container}>
      <FlatList
        data={visibleReports}
        keyExtractor={(r, index) => r.id || `report-${index}`}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        contentContainerStyle={[
          styles.listContent,
          { paddingTop: insets.top + 8, paddingBottom: insets.bottom + 84 },
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        numColumns={isTablet ? 2 : 1}
        columnWrapperStyle={isTablet ? styles.columnWrap : undefined}
        ListHeaderComponent={
          <View style={styles.header}>
            <Text allowFontScaling style={styles.screenTitle}>Reports</Text>

            {!user?.id ? (
              <View style={styles.group}>
                <View style={styles.row}>
                  <Text allowFontScaling style={styles.rowLabel}>Sign in to view reports.</Text>
                </View>
              </View>
            ) : null}

            {urgent ? <ClinicAlert message={urgent.summary} /> : null}

            <Text allowFontScaling style={styles.sectionHeader}>SUMMARY</Text>
            <View style={styles.group}>
              <View style={styles.row}>
                <View style={styles.rowLeft}>
                  <View style={[styles.iconCircle, { backgroundColor: '#34C759' }]}>
                    <Ionicons name="document-text" size={17} color="#FFFFFF" />
                  </View>
                  <Text allowFontScaling style={styles.rowLabel}>
                    {windowFilter === 'weekly' ? 'This Week' : 'This Month'}
                  </Text>
                </View>
                <Text allowFontScaling style={styles.rowValue}>
                  {visibleReports.length} report{visibleReports.length !== 1 ? 's' : ''}
                </Text>
              </View>
              <View style={styles.separator} />
              <View style={styles.row}>
                <View style={styles.rowLeft}>
                  <View style={[styles.iconCircle, { backgroundColor: '#007AFF' }]}>
                    <Ionicons name="checkmark-circle" size={17} color="#FFFFFF" />
                  </View>
                  <Text allowFontScaling style={styles.rowLabel}>Approval Rate</Text>
                </View>
                <Text allowFontScaling style={styles.rowValue}>
                  {visibleReports.length > 0 ? 'View reports' : '—'}
                </Text>
              </View>
            </View>

            <View style={styles.segmentWrap}>
              <Pressable
                onPress={() => setWindowFilter('weekly')}
                style={[styles.segmentPill, windowFilter === 'weekly' ? styles.segmentPillActive : null]}
              >
                <Text
                  allowFontScaling
                  style={[styles.segmentText, windowFilter === 'weekly' ? styles.segmentTextActive : null]}
                >
                  Weekly
                </Text>
              </Pressable>
              <Pressable
                onPress={() => setWindowFilter('monthly')}
                style={[styles.segmentPill, windowFilter === 'monthly' ? styles.segmentPillActive : null]}
              >
                <Text
                  allowFontScaling
                  style={[styles.segmentText, windowFilter === 'monthly' ? styles.segmentPillActive : null]}
                >
                  Monthly
                </Text>
              </Pressable>
            </View>

            <Text allowFontScaling style={styles.sectionHeader}>NUTRITION TRENDS</Text>
            <View style={styles.group}>
              <View style={styles.row}>
                <View style={styles.rowLeft}>
                  <View style={[styles.iconCircle, { backgroundColor: '#5856D6' }]}>
                    <Ionicons name="stats-chart" size={17} color="#FFFFFF" />
                  </View>
                  <View>
                    <Text style={styles.rowLabel}>Nutrition Trends</Text>
                    <Text style={styles.comingSoonText}>Coming soon</Text>
                  </View>
                </View>
              </View>
            </View>

            {error ? (
              <InlineErrorCard message={`Failed to load reports: ${error}`} onRetry={onRefresh} />
            ) : null}

            {visibleReports.length > 0 ? (
              <Text allowFontScaling style={styles.sectionHeader}>REPORT HISTORY</Text>
            ) : null}
          </View>
        }
        renderItem={({ item, index }) => (
          <Animated.View
            entering={FadeInDown.delay(index * 50).duration(300)}
            style={[
              styles.reportItemWrap,
              index === 0 ? styles.reportItemFirst : null,
              index === visibleReports.length - 1 ? styles.reportItemLast : null,
              isTablet ? styles.reportCell : null,
            ]}
          >
            {index > 0 ? <View style={styles.separator} /> : null}
            <ReportCard
              title={item.title}
              summary={item.summary}
              createdAt={item.createdAt}
              clinicVisitFlag={item.clinicVisitFlag}
              onPress={() => router.push(`/reports/${encodeURIComponent(item.id)}`)}
            />
          </Animated.View>
        )}
        ListEmptyComponent={
          !error ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyEmoji}>📊</Text>
              <Text allowFontScaling style={styles.emptyTitle}>No reports yet</Text>
              <Text allowFontScaling style={styles.emptySub}>Keep scanning to generate insights.</Text>
            </View>
          ) : null
        }
      />

      {toastError ? (
        <View style={[styles.toast, { bottom: insets.bottom + 96 }]}>
          <Text allowFontScaling style={styles.toastText}>{toastError}</Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F2F2F7',
  },
  listContent: {
    paddingBottom: 30,
  },
  header: {
    paddingBottom: 0,
  },
  screenTitle: {
    fontSize: 34,
    fontWeight: '700',
    color: '#1C1C1E',
    paddingHorizontal: 16,
    paddingBottom: 4,
    textAlign: 'left',
  },
  sectionHeader: {
    fontSize: 13,
    textTransform: 'uppercase',
    color: '#6D6D72',
    paddingTop: 24,
    paddingBottom: 6,
    paddingHorizontal: 16,
    letterSpacing: 0.3,
    fontWeight: '600',
  },
  group: {
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#E5E5EA',
  },
  row: {
    minHeight: 50,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
  },
  rowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  rowLabel: {
    fontSize: 17,
    color: '#1C1C1E',
    fontWeight: '400',
  },
  rowValue: {
    fontSize: 15,
    color: '#8E8E93',
    fontWeight: '400',
  },
  comingSoonText: {
    fontSize: 12,
    color: '#8E8E93',
    fontWeight: '400',
    marginTop: 1,
  },
  separator: {
    height: 1,
    marginLeft: 16,
    backgroundColor: '#E5E5EA',
  },
  iconCircle: {
    width: 30,
    height: 30,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  segmentWrap: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    marginTop: 20,
    borderRadius: 9,
    backgroundColor: '#E9E9ED',
    padding: 2,
    gap: 2,
    alignSelf: 'flex-start',
  },
  segmentPill: {
    minHeight: 34,
    paddingHorizontal: 16,
    borderRadius: 7,
    alignItems: 'center',
    justifyContent: 'center',
  },
  segmentPillActive: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 2,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },
  segmentText: {
    fontSize: 13,
    color: '#6D6D72',
    fontWeight: '500',
  },
  segmentTextActive: {
    color: '#1C1C1E',
    fontWeight: '700',
  },
  reportItemWrap: {
    backgroundColor: '#FFFFFF',
  },
  reportItemFirst: {
    borderTopWidth: 1,
    borderTopColor: '#E5E5EA',
  },
  reportItemLast: {
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  reportCell: {
    flex: 1,
  },
  columnWrap: {
    justifyContent: 'space-between',
    gap: 12,
    paddingHorizontal: 16,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 48,
    paddingHorizontal: 32,
  },
  emptyEmoji: {
    fontSize: 40,
    marginBottom: 12,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#1C1C1E',
    marginBottom: 6,
    textAlign: 'center',
  },
  emptySub: {
    fontSize: 15,
    color: '#8E8E93',
    textAlign: 'center',
    lineHeight: 22,
  },
  toast: {
    position: 'absolute',
    left: 16,
    right: 16,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#FF3B30',
  },
  toastText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
  },
  text: {
    fontSize: 15,
    color: '#1C1C1E',
  },
  subtext: {
    fontSize: 13,
    color: '#8E8E93',
    marginTop: 4,
  },
});
