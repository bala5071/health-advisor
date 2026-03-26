import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  TouchableOpacity,
} from 'react-native';
import { useRouter } from 'expo-router';
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

  const badgeColor = (verdict: ScanRow['verdict']) => {
    if (verdict === 'APPROVED') return 'rgba(46, 204, 113, 0.16)';
    if (verdict === 'CAUTION') return 'rgba(241, 196, 15, 0.18)';
    if (verdict === 'AVOID') return 'rgba(231, 76, 60, 0.16)';
    return 'rgba(127, 140, 141, 0.14)';
  };

  const renderItem = ({ item }: { item: ScanRow }) => (
    <TouchableOpacity
      onPress={() => router.push(`/scan/${encodeURIComponent(item.id)}`)}
      activeOpacity={0.85}
      accessibilityRole="button"
      accessibilityLabel={`Open scan. ${item.productName}. Verdict ${item.verdict}.`}
      accessibilityHint="Opens scan details"
    >
      <Card>
        <View style={styles.rowTop}>
          <View style={[styles.badge, { backgroundColor: badgeColor(item.verdict) }]}> 
            <Text style={[styles.badgeText, { color: theme.text }]}>{item.verdict}</Text>
          </View>
          <Text style={[styles.ts, { color: theme.text }]}>{formatTs(item.createdAt)}</Text>
        </View>
        <Text style={[styles.name, { color: theme.text }]} numberOfLines={2}>
          {item.productName}
        </Text>
      </Card>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <Text style={[styles.title, { color: theme.text }]}>History</Text>

      {!user?.id ? (
        <Card>
          <Text style={[styles.text, { color: theme.text }]}>Sign in to view your scan history.</Text>
        </Card>
      ) : null}

      <Card>
        <Text style={[styles.sectionTitle, { color: theme.text }]}>Filters</Text>

        <View style={styles.filterRow}>
          <Button title={dateRange === 'ALL' ? 'All (date)' : 'All (date)'} onPress={() => setDateRange('ALL')} variant={dateRange === 'ALL' ? 'primary' : 'secondary'} />
          <Button title="7D" onPress={() => setDateRange('7D')} variant={dateRange === '7D' ? 'primary' : 'secondary'} />
          <Button title="30D" onPress={() => setDateRange('30D')} variant={dateRange === '30D' ? 'primary' : 'secondary'} />
        </View>

        <View style={styles.filterRow}>
          <Button title="All" onPress={() => setVerdictFilter('ALL')} variant={verdictFilter === 'ALL' ? 'primary' : 'secondary'} />
          <Button title="Approved" onPress={() => setVerdictFilter('APPROVED')} variant={verdictFilter === 'APPROVED' ? 'primary' : 'secondary'} />
          <Button title="Caution" onPress={() => setVerdictFilter('CAUTION')} variant={verdictFilter === 'CAUTION' ? 'primary' : 'secondary'} />
          <Button title="Avoid" onPress={() => setVerdictFilter('AVOID')} variant={verdictFilter === 'AVOID' ? 'primary' : 'secondary'} />
        </View>
      </Card>

      {error ? (
        <Card>
          <Text style={[styles.text, { color: theme.text }]}>Failed to load history: {error}</Text>
        </Card>
      ) : null}

      <FlatList
        data={paginated}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        onEndReached={() => {
          if (pageSize < filtered.length) setPageSize((p) => p + 20);
        }}
        onEndReachedThreshold={0.6}
        ListEmptyComponent={
          <Card>
            <Text style={[styles.text, { color: theme.text }]}>No scans found for the selected filters.</Text>
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
    fontSize: 22,
    fontWeight: '900',
    textAlign: 'center',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '900',
    marginBottom: 10,
  },
  text: {
    fontSize: 14,
    fontWeight: '700',
  },
  filterRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    justifyContent: 'space-between',
  },
  list: {
    paddingBottom: 24,
    gap: 8,
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
    fontSize: 12,
    fontWeight: '700',
    opacity: 0.75,
  },
  name: {
    fontSize: 15,
    fontWeight: '900',
  },
});
