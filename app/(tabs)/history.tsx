import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  Pressable,
  useWindowDimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeInDown } from 'react-native-reanimated';
import Card from '../../src/components/common/Card';
import Button from '../../src/components/common/Button';
import { useTheme } from '../../src/theme/useTheme';
import { useAuth } from '../../src/components/AuthProvider';

type VerdictFilter = 'ALL' | 'APPROVED' | 'CAUTION' | 'AVOID';
type DateRangeFilter = 'ALL' | '7D' | '30D';

type ScanRow = {
  id: string;
  createdAt: number;
  verdict: VerdictFilter | 'UNKNOWN';
  productName: string;
};

const safeJsonParse = (v: any): any => {
  if (typeof v !== 'string') return v;
  try {
    return JSON.parse(v);
  } catch {
    return null;
  }
};

const normalizeVerdict = (v: any): ScanRow['verdict'] => {
  const s = String(v || '').toUpperCase();
  if (s === 'APPROVED' || s === 'CAUTION' || s === 'AVOID') return s;
  return 'UNKNOWN';
};

const formatTs = (ts: number) => {
  try {
    return new Date(ts).toLocaleString();
  } catch {
    return String(ts);
  }
};

export default function History() {
  const theme = useTheme();
  const router = useRouter();
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const isTablet = width >= 768;

  const [rows, setRows] = useState<ScanRow[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [verdictFilter, setVerdictFilter] = useState<VerdictFilter>('ALL');
  const [dateRange, setDateRange] = useState<DateRangeFilter>('ALL');

  const [pageSize, setPageSize] = useState(20);
  const subscriptionRef = useRef<any>(null);

  const loadRows = useCallback(async () => {
    try {
      setError(null);
      if (!user?.id) {
        setRows([]);
        return;
      }

      // Lazy require so the route doesn't crash in runtimes without native WatermelonDB.
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const databaseMod = require('../../src/database/DatabaseManager') as any;
      const database = databaseMod?.default ?? databaseMod;

      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const wdb = require('@nozbe/watermelondb') as any;
      const Q = wdb?.Q;
      if (!Q) throw new Error('WatermelonDB query helpers unavailable');

      const scans = database.collections.get('scans');
      const records = await scans
        .query(Q.where('user_id', user.id), Q.sortBy('created_at', Q.desc))
        .fetch();

      const mapped: ScanRow[] = (records as any[]).map((r: any) => {
        const createdAt =
          typeof r?._raw?.created_at === 'number'
            ? r._raw.created_at
            : typeof r?.createdAt === 'number'
              ? r.createdAt
              : Date.now();
        const parsed = safeJsonParse(r?.data) ?? {};
        const verdict = normalizeVerdict(parsed?.recommendation?.verdict ?? parsed?.verdict ?? parsed?.tracker?.verdict);
        const productName = String(
          parsed?.visionResult?.productName ?? parsed?.productName ?? parsed?.product?.name ?? 'Unknown product',
        );

        return {
          id: String(r?.id),
          createdAt,
          verdict,
          productName,
        };
      });

      setRows(mapped);
    } catch (e: any) {
      setError(String(e?.message || e));
    }
  }, [user?.id]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      await loadRows();
      if (!mounted) return;

      // Subscribe to changes (observable query) if available.
      try {
        if (!user?.id) return;
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const databaseMod = require('../../src/database/DatabaseManager') as any;
        const database = databaseMod?.default ?? databaseMod;
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const wdb = require('@nozbe/watermelondb') as any;
        const Q = wdb?.Q;
        const scans = database.collections.get('scans');
        const q = scans.query(Q.where('user_id', user.id), Q.sortBy('created_at', Q.desc));
        if (typeof q.observe === 'function') {
          subscriptionRef.current?.unsubscribe?.();
          subscriptionRef.current = q.observe().subscribe(() => {
            loadRows();
          });
        }
      } catch {
        // ignore if observe isn't available
      }
    })();

    return () => {
      mounted = false;
      subscriptionRef.current?.unsubscribe?.();
      subscriptionRef.current = null;
    };
  }, [loadRows, user?.id]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadRows();
    setRefreshing(false);
  }, [loadRows]);

  const filtered = useMemo(() => {
    const now = Date.now();
    const fromTs =
      dateRange === '7D'
        ? now - 7 * 24 * 60 * 60 * 1000
        : dateRange === '30D'
          ? now - 30 * 24 * 60 * 60 * 1000
          : 0;

    return rows
      .filter((r) => (fromTs ? r.createdAt >= fromTs : true))
      .filter((r) => (verdictFilter === 'ALL' ? true : r.verdict === verdictFilter));
  }, [rows, dateRange, verdictFilter]);

  const paginated = useMemo(() => filtered.slice(0, pageSize), [filtered, pageSize]);

  const approvedCount = filtered.filter((r) => r.verdict === 'APPROVED').length;
  const cautionCount = filtered.filter((r) => r.verdict === 'CAUTION').length;
  const avoidCount = filtered.filter((r) => r.verdict === 'AVOID').length;

  const badgeColor = (verdict: ScanRow['verdict']) => {
    if (verdict === 'APPROVED') return 'rgba(46, 204, 113, 0.16)';
    if (verdict === 'CAUTION') return 'rgba(241, 196, 15, 0.18)';
    if (verdict === 'AVOID') return 'rgba(231, 76, 60, 0.16)';
    return 'rgba(127, 140, 141, 0.14)';
  };

  const renderItem = ({ item, index }: { item: ScanRow; index: number }) => (
    <Animated.View entering={FadeInDown.delay(index * 45).duration(300)} style={isTablet ? styles.itemCell : undefined}>
      <Pressable
        onPress={() => router.push(`/scan/${encodeURIComponent(item.id)}`)}
        accessibilityRole="button"
        accessibilityLabel={`Open scan. ${item.productName}. Verdict ${item.verdict}.`}
        accessibilityHint="Opens scan details"
      >
        <Card>
          <View style={styles.rowTop}>
            <View style={[styles.badge, { backgroundColor: badgeColor(item.verdict) }]}>
              <Text allowFontScaling style={[styles.badgeText, { color: theme.text }]}>{item.verdict}</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={theme.textSecondary} />
          </View>
          <Text allowFontScaling style={[styles.name, { color: theme.text }]} numberOfLines={2}>
            {item.productName}
          </Text>
          <Text allowFontScaling style={[styles.ts, { color: theme.textSecondary }]}>{formatTs(item.createdAt)}</Text>
        </Card>
      </Pressable>
    </Animated.View>
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}> 
      <Text allowFontScaling style={[styles.title, { color: theme.text }]}>History</Text>

      <Card>
        <View style={styles.summaryRow}>
          <View style={styles.summaryItem}>
            <Text allowFontScaling style={[styles.summaryValue, { color: theme.text }]}>{filtered.length}</Text>
            <Text allowFontScaling style={[styles.summaryLabel, { color: theme.textSecondary }]}>Scans</Text>
          </View>
          <View style={styles.summaryItem}>
            <Text allowFontScaling style={[styles.summaryValue, { color: theme.approved }]}>{approvedCount}</Text>
            <Text allowFontScaling style={[styles.summaryLabel, { color: theme.textSecondary }]}>Approved</Text>
          </View>
          <View style={styles.summaryItem}>
            <Text allowFontScaling style={[styles.summaryValue, { color: theme.caution }]}>{cautionCount}</Text>
            <Text allowFontScaling style={[styles.summaryLabel, { color: theme.textSecondary }]}>Cautions</Text>
          </View>
          <View style={styles.summaryItem}>
            <Text allowFontScaling style={[styles.summaryValue, { color: theme.avoid }]}>{avoidCount}</Text>
            <Text allowFontScaling style={[styles.summaryLabel, { color: theme.textSecondary }]}>Avoids</Text>
          </View>
        </View>
      </Card>

      {!user?.id ? (
        <Card>
          <Text allowFontScaling style={[styles.text, { color: theme.text }]}>Sign in to view your scan history.</Text>
        </Card>
      ) : null}

      <Card>
        <Text allowFontScaling style={[styles.sectionTitle, { color: theme.text }]}>Filters</Text>

        <View style={styles.filterRow}>
          {([
            { label: 'All dates', value: 'ALL' },
            { label: '7D', value: '7D' },
            { label: '30D', value: '30D' },
          ] as Array<{ label: string; value: DateRangeFilter }>).map((item) => (
            <Pressable
              key={item.value}
              onPress={() => setDateRange(item.value)}
              style={[
                styles.filterPill,
                {
                  backgroundColor: dateRange === item.value ? theme.primary : theme.card,
                  borderColor: dateRange === item.value ? theme.primary : theme.border,
                },
              ]}
            >
              <Text allowFontScaling style={[styles.filterText, { color: dateRange === item.value ? '#FFFFFF' : theme.text }]}>{item.label}</Text>
            </Pressable>
          ))}
        </View>

        <View style={styles.filterRow}>
          {([
            { label: 'All', value: 'ALL' },
            { label: 'Approved', value: 'APPROVED' },
            { label: 'Caution', value: 'CAUTION' },
            { label: 'Avoid', value: 'AVOID' },
          ] as Array<{ label: string; value: VerdictFilter }>).map((item) => (
            <Pressable
              key={item.value}
              onPress={() => setVerdictFilter(item.value)}
              style={[
                styles.filterPill,
                {
                  backgroundColor: verdictFilter === item.value ? theme.primary : theme.card,
                  borderColor: verdictFilter === item.value ? theme.primary : theme.border,
                },
              ]}
            >
              <Text allowFontScaling style={[styles.filterText, { color: verdictFilter === item.value ? '#FFFFFF' : theme.text }]}>{item.label}</Text>
            </Pressable>
          ))}
        </View>
      </Card>

      {error ? (
        <Card>
          <Text allowFontScaling style={[styles.text, { color: theme.text }]}>Failed to load history: {error}</Text>
        </Card>
      ) : null}

      <FlatList
        data={paginated}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        numColumns={isTablet ? 2 : 1}
        columnWrapperStyle={isTablet ? styles.columnWrap : undefined}
        contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + 84 }]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        onEndReached={() => {
          if (pageSize < filtered.length) setPageSize((p) => p + 20);
        }}
        onEndReachedThreshold={0.6}
        ListEmptyComponent={
          <Card>
            <Text allowFontScaling style={[styles.emptyEmoji, { color: theme.textSecondary }]}>🧾</Text>
            <Text allowFontScaling style={[styles.text, { color: theme.text }]}>No scans found for the selected filters.</Text>
            <Button title="Start Scanning" onPress={() => router.push('/scan/capture')} />
          </Card>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    gap: 12,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    lineHeight: 42,
    textAlign: 'left',
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  summaryItem: {
    flex: 1,
    alignItems: 'center',
  },
  summaryValue: {
    fontSize: 22,
    fontWeight: '700',
    lineHeight: 33,
  },
  summaryLabel: {
    fontSize: 13,
    fontWeight: '500',
    lineHeight: 20,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '700',
    lineHeight: 26,
    marginBottom: 10,
  },
  text: {
    fontSize: 15,
    fontWeight: '500',
    lineHeight: 23,
  },
  filterRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  filterPill: {
    minHeight: 44,
    borderWidth: 1,
    borderRadius: 24,
    paddingHorizontal: 12,
    justifyContent: 'center',
  },
  filterText: {
    fontSize: 13,
    fontWeight: '600',
    lineHeight: 20,
  },
  list: {
    paddingBottom: 24,
    gap: 12,
  },
  columnWrap: {
    justifyContent: 'space-between',
    gap: 12,
  },
  itemCell: {
    flex: 1,
  },
  rowTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
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
    fontSize: 13,
    fontWeight: '500',
    lineHeight: 20,
    opacity: 0.75,
    marginTop: 8,
  },
  name: {
    fontSize: 17,
    fontWeight: '600',
    lineHeight: 26,
  },
  emptyEmoji: {
    fontSize: 34,
    textAlign: 'center',
  },
});
