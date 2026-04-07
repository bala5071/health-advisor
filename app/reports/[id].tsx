import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ScrollView, Text, StyleSheet, View, TouchableOpacity } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import ClinicAlert from '../../src/components/reports/ClinicAlert';

const safeJsonParse = (v: any): any => {
  if (typeof v !== 'string') return v;
  try {
    return JSON.parse(v);
  } catch {
    return null;
  }
};

const toHtml = (title: string, summary: string, insights: any) => {
  const escaped = (s: string) =>
    String(s || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');

  return `
  <html>
    <head>
      <meta charset="utf-8" />
      <style>
        body { font-family: -apple-system, Roboto, Arial; padding: 24px; }
        h1 { font-size: 20px; }
        h2 { font-size: 16px; margin-top: 18px; }
        p, li { font-size: 13px; }
        .badge { display: inline-block; padding: 6px 10px; border-radius: 999px; background: #eef; font-weight: 700; }
        code { white-space: pre-wrap; }
      </style>
    </head>
    <body>
      <h1>${escaped(title)}</h1>
      <p class="badge">Health Advisor Report</p>
      <h2>Summary</h2>
      <p>${escaped(summary)}</p>
      <h2>Insights</h2>
      <code>${escaped(JSON.stringify(insights ?? {}, null, 2))}</code>
    </body>
  </html>`;
};

export default function ReportDetail() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const insets = useSafeAreaInsets();

  const reportId = useMemo(() => {
    const raw = (params as any)?.id;
    const v = Array.isArray(raw) ? raw[0] : raw;
    return typeof v === 'string' ? v : '';
  }, [params]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [title, setTitle] = useState('Health Report');
  const [summary, setSummary] = useState('');
  const [insights, setInsights] = useState<any>(null);
  const [clinicFlag, setClinicFlag] = useState(false);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const repos = require('../../src/database/repositories') as typeof import('../../src/database/repositories');
      const report = await repos.ReportRepository.getReportById(reportId);

      const rec = safeJsonParse((report as any)?.recommendations) ?? {};
      const period = String(rec?.period || '').toLowerCase();
      setTitle(period === 'weekly' ? 'Weekly Report' : period === 'monthly' ? 'Monthly Report' : 'Health Report');
      setSummary(String((report as any)?.summary ?? ''));
      setInsights(rec);
      setClinicFlag(Boolean(rec?.clinicVisitFlag));
    } catch (e: any) {
      setError(String(e?.message || e));
    } finally {
      setLoading(false);
    }
  }, [reportId]);

  useEffect(() => {
    if (!reportId) return;
    load();
  }, [load, reportId]);

  const exportPdf = async () => {
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const mod = require('react-native-html-to-pdf') as any;
      const RNHTMLtoPDF = mod?.default ?? mod;
      if (!RNHTMLtoPDF?.convert) {
        throw new Error('PDF export module unavailable');
      }

      const html = toHtml(title, summary, insights);
      const res = await RNHTMLtoPDF.convert({
        html,
        fileName: `health_report_${reportId}`,
        base64: false,
      });

      const path = res?.filePath;
      if (path) {
        // eslint-disable-next-line no-alert
        alert(`PDF saved: ${path}`);
      }
    } catch (e: any) {
      // eslint-disable-next-line no-alert
      alert(`PDF export failed: ${String(e?.message || e)}`);
    }
  };

  return (
    <View style={[styles.root, { backgroundColor: '#F2F2F7' }]}> 
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton} accessibilityRole="button">
          <Ionicons name="chevron-back" size={22} color="#007AFF" />
          <Text style={styles.backLabel}>Reports</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{title}</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 32 }]}
      >
        {loading ? (
          <View style={styles.loadingCard}>
            <Text style={styles.loadingText}>Loading…</Text>
          </View>
        ) : error ? (
          <View style={styles.errorCard}>
            <Ionicons name="warning" size={16} color="#FF3B30" />
            <Text style={styles.errorText}>Failed to load: {error}</Text>
          </View>
        ) : (
          <>
            {clinicFlag ? <ClinicAlert message={summary} /> : null}

            <View style={styles.periodRow}>
              <View style={styles.periodBadge}>
                <Ionicons name="calendar" size={13} color="#007AFF" style={{ marginRight: 5 }} />
                <Text style={styles.periodBadgeText}>
                  {insights?.period === 'weekly' ? 'Weekly Report' : insights?.period === 'monthly' ? 'Monthly Report' : 'Health Report'}
                </Text>
              </View>
            </View>

            <Text style={styles.groupHeader}>SUMMARY</Text>
            <View style={styles.group}>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryText}>{summary || 'No summary available.'}</Text>
              </View>
            </View>

            <Text style={styles.groupHeader}>KEY STATS</Text>
            <View style={styles.group}>
              {[
                { label: 'Total Scans', value: String(insights?.stats?.windowTrend?.count ?? '—'), icon: 'scan', iconBg: '#007AFF' },
                { label: 'Avg Calories', value: typeof insights?.stats?.windowTrend?.avgCalories === 'number' ? `${Math.round(insights.stats.windowTrend.avgCalories)} kcal` : '—', icon: 'flame', iconBg: '#FF9500' },
                { label: 'Avg Sodium', value: typeof insights?.stats?.windowTrend?.avgSodiumMg === 'number' ? `${Math.round(insights.stats.windowTrend.avgSodiumMg)} mg` : '—', icon: 'water', iconBg: '#5856D6' },
                { label: 'Avg Sugar', value: typeof insights?.stats?.windowTrend?.avgSugarG === 'number' ? `${Math.round(insights.stats.windowTrend.avgSugarG)} g` : '—', icon: 'nutrition', iconBg: '#FF2D55' },
              ].map(({ label, value, icon, iconBg }, idx, arr) => (
                <View key={label}>
                  <View style={styles.statRow}>
                    <View style={[styles.statIcon, { backgroundColor: iconBg }]}> 
                      <Ionicons name={icon as any} size={15} color="#FFFFFF" />
                    </View>
                    <Text style={styles.statLabel}>{label}</Text>
                    <Text style={styles.statValue}>{value}</Text>
                  </View>
                  {idx < arr.length - 1 ? <View style={styles.rowSep} /> : null}
                </View>
              ))}
            </View>

            <Text style={styles.groupHeader}>SCAN VERDICTS</Text>
            <View style={styles.group}>
              {[
                { key: 'APPROVED', label: 'Approved', color: '#34C759', icon: 'checkmark-circle' },
                { key: 'CAUTION', label: 'Caution', color: '#FF9500', icon: 'warning' },
                { key: 'AVOID', label: 'Avoid', color: '#FF3B30', icon: 'close-circle' },
              ].map(({ key, label, color, icon }, idx, arr) => {
                const count = insights?.stats?.windowTrend?.verdictDistribution?.[key] ?? 0;
                const total = insights?.stats?.windowTrend?.count ?? 1;
                const pct = total > 0 ? Math.round((count / total) * 100) : 0;
                return (
                  <View key={key}>
                    <View style={styles.verdictRow}>
                      <View style={[styles.verdictIcon, { backgroundColor: color }]}> 
                        <Ionicons name={icon as any} size={15} color="#FFFFFF" />
                      </View>
                      <Text style={styles.verdictLabel}>{label}</Text>
                      <View style={styles.verdictBarWrap}>
                        <View style={[styles.verdictBar, { width: `${pct}%` as any, backgroundColor: color }]} />
                      </View>
                      <Text style={[styles.verdictCount, { color }]}>{count}</Text>
                    </View>
                    {idx < arr.length - 1 ? <View style={styles.rowSep} /> : null}
                  </View>
                );
              })}
            </View>

            {insights?.trends || insights?.recommendations?.trends ? (
              <>
                <Text style={styles.groupHeader}>TRENDS</Text>
                <View style={styles.group}>
                  {Object.entries(insights?.trends ?? insights?.recommendations?.trends ?? {}).map(([key, value], idx, arr) => {
                    const trendIcon = value === 'increasing' ? 'trending-up' : value === 'decreasing' ? 'trending-down' : 'remove';
                    const trendColor = key === 'calories' || key === 'sodium' || key === 'sugar'
                      ? (value === 'increasing' ? '#FF3B30' : value === 'decreasing' ? '#34C759' : '#8E8E93')
                      : '#8E8E93';
                    const label = key.charAt(0).toUpperCase() + key.slice(1);
                    return (
                      <View key={key}>
                        <View style={styles.trendRow}>
                          <Text style={styles.trendLabel}>{label}</Text>
                          <Ionicons name={trendIcon as any} size={18} color={trendColor} style={{ marginRight: 6 }} />
                          <Text style={[styles.trendValue, { color: trendColor }]}>{String(value)}</Text>
                        </View>
                        {idx < arr.length - 1 ? <View style={styles.rowSep} /> : null}
                      </View>
                    );
                  })}
                </View>
              </>
            ) : null}

            <Text style={styles.groupHeader}>RISK PATTERNS</Text>
            <View style={styles.group}>
              {Array.isArray(insights?.riskPatterns) && insights.riskPatterns.length > 0 ? (
                insights.riskPatterns.map((p: any, idx: number) => (
                  <View key={String(idx)}>
                    <View style={styles.riskRow}>
                      <View style={styles.riskIconCircle}>
                        <Ionicons name="alert-circle" size={16} color="#FF9500" />
                      </View>
                      <View style={styles.riskContent}>
                        <Text style={styles.riskPattern}>{String(p?.pattern ?? '')}</Text>
                        <Text style={styles.riskRec}>{String(p?.recommendation ?? '')}</Text>
                      </View>
                    </View>
                    {idx < insights.riskPatterns.length - 1 ? <View style={styles.rowSep} /> : null}
                  </View>
                ))
              ) : (
                <View style={styles.statRow}>
                  <View style={[styles.statIcon, { backgroundColor: '#34C759' }]}> 
                    <Ionicons name="checkmark" size={15} color="#FFFFFF" />
                  </View>
                  <Text style={styles.statLabel}>No high-risk patterns detected</Text>
                </View>
              )}
            </View>

            <Text style={styles.groupHeader}>EXPORT</Text>
            <View style={styles.group}>
              <TouchableOpacity style={styles.exportRow} onPress={exportPdf}>
                <View style={[styles.statIcon, { backgroundColor: '#FF3B30' }]}> 
                  <Ionicons name="document" size={15} color="#FFFFFF" />
                </View>
                <Text style={styles.exportLabel}>Export as PDF</Text>
                <Ionicons name="chevron-forward" size={17} color="#C7C7CC" />
              </TouchableOpacity>
            </View>
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F2F2F7' },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingBottom: 8, backgroundColor: '#F2F2F7' },
  backButton: { flexDirection: 'row', alignItems: 'center', minWidth: 80, minHeight: 44 },
  backLabel: { fontSize: 17, color: '#007AFF', fontWeight: '400' },
  headerTitle: { flex: 1, textAlign: 'center', fontSize: 17, fontWeight: '600', color: '#1C1C1E' },
  headerSpacer: { minWidth: 80 },
  scroll: { paddingTop: 4 },
  loadingCard: { alignItems: 'center', paddingVertical: 48 },
  loadingText: { fontSize: 15, color: '#8E8E93' },
  errorCard: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, margin: 16, backgroundColor: '#FFF5F5', borderRadius: 12, padding: 14, borderLeftWidth: 3, borderLeftColor: '#FF3B30' },
  errorText: { flex: 1, fontSize: 14, color: '#FF3B30', lineHeight: 20 },
  periodRow: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 4 },
  periodBadge: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', backgroundColor: '#E8F4FD', borderRadius: 20, paddingHorizontal: 10, paddingVertical: 5 },
  periodBadgeText: { fontSize: 13, fontWeight: '600', color: '#007AFF' },
  groupHeader: { fontSize: 13, fontWeight: '600', color: '#6D6D72', textTransform: 'uppercase', letterSpacing: 0.3, paddingHorizontal: 16, paddingTop: 20, paddingBottom: 6 },
  group: { backgroundColor: '#FFFFFF', borderTopWidth: 1, borderBottomWidth: 1, borderColor: '#E5E5EA' },
  rowSep: { height: 1, marginLeft: 56, backgroundColor: '#E5E5EA' },
  summaryRow: { padding: 16 },
  summaryText: { fontSize: 15, fontWeight: '400', color: '#1C1C1E', lineHeight: 22 },
  statRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, gap: 12 },
  statIcon: { width: 30, height: 30, borderRadius: 8, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  statLabel: { flex: 1, fontSize: 15, fontWeight: '400', color: '#1C1C1E' },
  statValue: { fontSize: 15, fontWeight: '500', color: '#8E8E93' },
  verdictRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, gap: 10 },
  verdictIcon: { width: 28, height: 28, borderRadius: 7, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  verdictLabel: { width: 72, fontSize: 15, fontWeight: '400', color: '#1C1C1E' },
  verdictBarWrap: { flex: 1, height: 6, backgroundColor: '#F2F2F7', borderRadius: 3, overflow: 'hidden' },
  verdictBar: { height: 6, borderRadius: 3 },
  verdictCount: { fontSize: 15, fontWeight: '700', minWidth: 24, textAlign: 'right' },
  trendRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14 },
  trendLabel: { flex: 1, fontSize: 15, fontWeight: '400', color: '#1C1C1E' },
  trendValue: { fontSize: 14, fontWeight: '600', textTransform: 'capitalize' },
  riskRow: { flexDirection: 'row', alignItems: 'flex-start', paddingHorizontal: 16, paddingVertical: 14, gap: 12 },
  riskIconCircle: { width: 30, height: 30, borderRadius: 8, backgroundColor: '#FFF8EC', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1 },
  riskContent: { flex: 1 },
  riskPattern: { fontSize: 15, fontWeight: '600', color: '#1C1C1E', marginBottom: 3 },
  riskRec: { fontSize: 13, fontWeight: '400', color: '#8E8E93', lineHeight: 18 },
  exportRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, gap: 12 },
  exportLabel: { flex: 1, fontSize: 17, fontWeight: '400', color: '#1C1C1E' },
});
