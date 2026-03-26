import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ScrollView, Text, StyleSheet } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import Card from '../../src/components/common/Card';
import Button from '../../src/components/common/Button';
import { useTheme } from '../../src/theme/useTheme';
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
  const theme = useTheme();
  const router = useRouter();
  const params = useLocalSearchParams();

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
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={[styles.title, { color: theme.text }]}>{title}</Text>

      {loading ? (
        <Card>
          <Text style={[styles.text, { color: theme.text }]}>Loading…</Text>
        </Card>
      ) : null}

      {error ? (
        <Card>
          <Text style={[styles.text, { color: theme.text }]}>Failed to load: {error}</Text>
          <Button title="Back" onPress={() => router.back()} />
        </Card>
      ) : null}

      {!loading && !error ? (
        <>
          {clinicFlag ? <ClinicAlert message={summary} /> : null}

          <Card>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>Summary</Text>
            <Text style={[styles.text, { color: theme.text }]}>{summary}</Text>
          </Card>

          <Card>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>Insights</Text>

            <Text style={[styles.subTitle, { color: theme.text }]}>Key stats</Text>
            <Text style={[styles.text, { color: theme.text }]}>
              Scans: {String(insights?.stats?.windowTrend?.count ?? '')}
            </Text>
            {typeof insights?.stats?.windowTrend?.avgCalories === 'number' ? (
              <Text style={[styles.text, { color: theme.text }]}>Avg calories: {Math.round(insights.stats.windowTrend.avgCalories)} kcal</Text>
            ) : null}
            {typeof insights?.stats?.windowTrend?.avgSodiumMg === 'number' ? (
              <Text style={[styles.text, { color: theme.text }]}>Avg sodium: {Math.round(insights.stats.windowTrend.avgSodiumMg)} mg</Text>
            ) : null}
            {typeof insights?.stats?.windowTrend?.avgSugarG === 'number' ? (
              <Text style={[styles.text, { color: theme.text }]}>Avg sugar: {Math.round(insights.stats.windowTrend.avgSugarG)} g</Text>
            ) : null}

            <Text style={[styles.subTitle, { color: theme.text }]}>Verdict distribution</Text>
            <Text style={[styles.mono, { color: theme.text }]}>
              {JSON.stringify(insights?.stats?.windowTrend?.verdictDistribution ?? {}, null, 2)}
            </Text>

            <Text style={[styles.subTitle, { color: theme.text }]}>Trends</Text>
            <Text style={[styles.mono, { color: theme.text }]}>
              {JSON.stringify(insights?.trends ?? insights?.recommendations?.trends ?? {}, null, 2)}
            </Text>

            <Text style={[styles.subTitle, { color: theme.text }]}>Risk patterns</Text>
            {Array.isArray(insights?.riskPatterns) && insights.riskPatterns.length > 0 ? (
              insights.riskPatterns.map((p: any, idx: number) => (
                <Text key={String(idx)} style={[styles.text, { color: theme.text }]}>
                  {String(p?.pattern || '')}: {String(p?.recommendation || '')}
                </Text>
              ))
            ) : (
              <Text style={[styles.text, { color: theme.text }]}>No high-risk patterns detected for this period.</Text>
            )}
          </Card>

          <Card>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>Export</Text>
            <Button title="Export PDF" onPress={exportPdf} />
            <Button title="Back" onPress={() => router.back()} variant="secondary" />
          </Card>
        </>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
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
  subTitle: {
    fontSize: 13,
    fontWeight: '900',
    marginTop: 12,
    marginBottom: 8,
    opacity: 0.9,
  },
  text: {
    fontSize: 14,
    fontWeight: '700',
  },
  mono: {
    fontSize: 12,
    fontFamily: 'monospace',
  },
});
