import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, FlatList, RefreshControl } from 'react-native';
import { useRouter } from 'expo-router';
import Card from '../../src/components/common/Card';
import { useTheme } from '../../src/theme/useTheme';
import { useAuth } from '../../src/components/AuthProvider';
import ReportCard from '../../src/components/reports/ReportCard';
import ClinicAlert from '../../src/components/reports/ClinicAlert';
import HealthChart from '../../src/components/reports/HealthChart';
import Button from '../../src/components/common/Button';

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
  summary: string;
  clinicVisitFlag: boolean;
  stats?: any;
};

export default function Reports() {
  const theme = useTheme();
  const router = useRouter();
  const { user } = useAuth();

  const [reports, setReports] = useState<ReportRow[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
          const title = period === 'weekly' ? 'Weekly Report' : period === 'monthly' ? 'Monthly Report' : 'Health Report';
          return {
            id: String(r?.id),
            createdAt,
            title,
            summary,
            clinicVisitFlag,
            stats: rec?.stats ?? null,
          };
        })
        .sort((a, b) => b.createdAt - a.createdAt);

      setReports(mapped);
    } catch (e: any) {
      setError(String(e?.message || e));
    }
  }, [user?.id]);

  useEffect(() => {
    load();
  }, [load]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  const urgent = useMemo(() => reports.find((r) => r.clinicVisitFlag), [reports]);

  const chartSeries = useMemo(() => {
    const recent = reports.slice(0, 8).reverse();
    const xFor = (createdAt: number) => {
      try {
        return new Date(createdAt).toLocaleDateString();
      } catch {
        return String(createdAt);
      }
    };

    const calories = recent.map((r) => ({
      x: xFor(r.createdAt),
      y: typeof r?.stats?.windowTrend?.avgCalories === 'number' ? r.stats.windowTrend.avgCalories : 0,
    }));

    const sodium = recent.map((r) => ({
      x: xFor(r.createdAt),
      y: typeof r?.stats?.windowTrend?.avgSodiumMg === 'number' ? r.stats.windowTrend.avgSodiumMg : 0,
    }));

    const sugar = recent.map((r) => ({
      x: xFor(r.createdAt),
      y: typeof r?.stats?.windowTrend?.avgSugarG === 'number' ? r.stats.windowTrend.avgSugarG : 0,
    }));

    return [
      { name: 'Calories', type: 'line' as const, data: calories },
      { name: 'Sodium', type: 'bar' as const, data: sodium },
      { name: 'Sugar', type: 'line' as const, data: sugar },
    ];
  }, [reports]);

  return (
    <View style={styles.container}>
      <Text style={[styles.title, { color: theme.text }]}>Reports</Text>

      {!user?.id ? (
        <Card>
          <Text style={[styles.text, { color: theme.text }]}>Sign in to view reports.</Text>
        </Card>
      ) : null}

      {urgent ? (
        <ClinicAlert message={urgent.summary} />
      ) : null}

      <HealthChart title="Trends (calories / sodium / sugar)" series={chartSeries} />

      {error ? (
        <Card>
          <Text style={[styles.text, { color: theme.text }]}>Failed to load reports: {error}</Text>
        </Card>
      ) : null}

      <FlatList
        data={reports}
        keyExtractor={(r) => r.id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <ReportCard
            title={item.title}
            summary={item.summary}
            createdAt={item.createdAt}
            clinicVisitFlag={item.clinicVisitFlag}
            onPress={() => router.push(`/reports/${encodeURIComponent(item.id)}`)}
          />
        )}
        ListEmptyComponent={
          <Card>
            <Text style={[styles.text, { color: theme.text }]}>No reports found yet.</Text>
            <Text style={[styles.subtext, { color: theme.text }]}>Generate scans and reopen the app to trigger report generation.</Text>
            <Button title="Refresh" onPress={onRefresh} />
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
  text: {
    fontSize: 14,
    fontWeight: '700',
  },
  subtext: {
    fontSize: 13,
    fontWeight: '700',
    opacity: 0.75,
    marginTop: 6,
  },
  list: {
    paddingBottom: 30,
    gap: 8,
  },
});
