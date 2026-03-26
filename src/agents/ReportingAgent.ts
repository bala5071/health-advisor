import { supabase } from '../supabase/client';
import { NutritionCalculator, TrackerSnapshot } from '../utils/nutritionCalculator';
import { HEALTH_KB } from '../ai/knowledge/HealthKnowledgeBase';

type Repositories = typeof import('../database/repositories');

const tryGetRepositories = (): Repositories | null => {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    return require('../database/repositories') as Repositories;
  } catch {
    return null;
  }
};

const safeJsonParse = (v: any): any => {
  if (typeof v !== 'string') return v;
  try {
    return JSON.parse(v);
  } catch {
    return null;
  }
};

const countSevereAllergenExposures = (scanPayloads: any[]): number => {
  let c = 0;
  for (const p of scanPayloads) {
    const allergy = p?.allergyResult;
    const matches = Array.isArray(allergy?.matchedAllergens) ? allergy.matchedAllergens : [];
    if (matches.some((m: any) => String(m?.severity || '').toLowerCase() === 'severe')) {
      c += 1;
    }
  }
  return c;
};

const countFlag = (scanPayloads: any[], flag: 'highSodium' | 'highSugar' | 'highSaturatedFat'): number => {
  let c = 0;
  for (const p of scanPayloads) {
    const flags = p?.nutritionResult?.flags;
    if (flags?.[flag]) c += 1;
  }
  return c;
};

const trendLabel = (prev: number | null, curr: number | null): 'increasing' | 'decreasing' | 'stable' => {
  if (prev == null || curr == null) return 'stable';
  const delta = curr - prev;
  if (Math.abs(delta) < Math.max(1, curr * 0.05)) return 'stable';
  return delta > 0 ? 'increasing' : 'decreasing';
};

export type GeneratedReport = {
  period: 'weekly' | 'monthly';
  fromTs: number;
  toTs: number;
  summary: string;
  recommendations: any;
  clinicVisitFlag: boolean;
  stats: any;
  representativeScanId: string | null;
};

export class ReportingAgent {
  /**
   * Generates a report for a given period and saves to WatermelonDB.
   * Also pushes summary-only metadata to Supabase.
   */
  static async generateAndSave(userId: string, period: 'weekly' | 'monthly'): Promise<GeneratedReport | null> {
    const repos = tryGetRepositories();
    if (!repos) return null;

    const days = period === 'weekly' ? 7 : 30;
    const toTs = Date.now();
    const fromTs = toTs - days * 24 * 60 * 60 * 1000;

    const scans = await repos.ScanRepository.getScans(userId);
    const windowScans = (scans as any[])
      .map((s) => ({
        id: String(s?.id),
        createdAt: typeof s?._raw?.created_at === 'number' ? s._raw.created_at : Date.now(),
        payload: safeJsonParse(s?.data) ?? {},
      }))
      .filter((s) => s.createdAt >= fromTs && s.createdAt <= toTs)
      .sort((a, b) => a.createdAt - b.createdAt);

    const payloads = windowScans.map((s) => s.payload);
    const representativeScanId = windowScans.length > 0 ? windowScans[windowScans.length - 1].id : null;

    const snapshots: TrackerSnapshot[] = payloads
      .map((p) => NutritionCalculator.toSnapshot(p))
      .filter(Boolean) as any;

    const windowTrend = NutritionCalculator.trendWindow(snapshots, days as any, toTs);

    // Compare last half vs first half for trend direction
    const mid = fromTs + (toTs - fromTs) / 2;
    const firstHalf = snapshots.filter((s) => s.ts < mid);
    const secondHalf = snapshots.filter((s) => s.ts >= mid);

    const avgSodiumFirst = NutritionCalculator.averageOf(firstHalf, 'sodiumMg');
    const avgSodiumSecond = NutritionCalculator.averageOf(secondHalf, 'sodiumMg');
    const avgSugarFirst = NutritionCalculator.averageOf(firstHalf, 'sugarG');
    const avgSugarSecond = NutritionCalculator.averageOf(secondHalf, 'sugarG');
    const avgCaloriesFirst = NutritionCalculator.averageOf(firstHalf, 'calories');
    const avgCaloriesSecond = NutritionCalculator.averageOf(secondHalf, 'calories');

    const sodiumTrend = trendLabel(avgSodiumFirst, avgSodiumSecond);
    const sugarTrend = trendLabel(avgSugarFirst, avgSugarSecond);
    const caloriesTrend = trendLabel(avgCaloriesFirst, avgCaloriesSecond);

    const severeAllergenExposures = countSevereAllergenExposures(payloads);
    const clinicVisitFlag = period === 'weekly' ? severeAllergenExposures > 3 : false;

    const highSodiumCount = countFlag(payloads, 'highSodium');
    const highSugarCount = countFlag(payloads, 'highSugar');

    const threshold = HEALTH_KB.thresholds;

    const riskPatterns: Array<{ pattern: string; explanation: string; recommendation: string }> = [];

    if (highSodiumCount >= Math.max(3, Math.ceil(payloads.length * 0.4))) {
      riskPatterns.push({
        pattern: 'Consistent high sodium choices',
        explanation:
          'Multiple scans were flagged as high sodium. High sodium intake can worsen blood pressure and fluid retention for some people.',
        recommendation: 'Prefer low-sodium versions and limit processed/packaged foods where possible.',
      });
    }

    if (highSugarCount >= Math.max(3, Math.ceil(payloads.length * 0.4))) {
      riskPatterns.push({
        pattern: 'Consistent high sugar choices',
        explanation:
          'Multiple scans were flagged as high sugar. High sugar intake can make blood glucose control harder and increase calorie intake.',
        recommendation: 'Choose lower-sugar alternatives and increase fiber/protein pairing when eating carbs.',
      });
    }

    if ((windowTrend.avgSodiumMg ?? 0) >= 600) {
      riskPatterns.push({
        pattern: 'High average sodium per scan',
        explanation: 'Your average sodium per scanned item was high relative to typical daily targets.',
        recommendation: `Aim to keep sodium lower; FDA guideline is ${threshold.sodiumMgPerDayFDA} mg/day total.`,
      });
    }

    if (clinicVisitFlag) {
      riskPatterns.push({
        pattern: 'Repeated severe allergen exposure risk',
        explanation:
          'Severe allergen matches were detected more than three times this week. This may indicate repeated exposure risk.',
        recommendation:
          'If you experienced symptoms or have severe allergy history, consider contacting a clinician/allergist for guidance.',
      });
    }

    const summaryLines: string[] = [];
    summaryLines.push(
      `${period === 'weekly' ? 'Weekly' : 'Monthly'} report for the last ${days} days: ${payloads.length} scan(s).`,
    );
    summaryLines.push(`Verdicts: ${JSON.stringify(windowTrend.verdictDistribution)}`);

    if (windowTrend.avgSodiumMg != null) summaryLines.push(`Avg sodium: ${Math.round(windowTrend.avgSodiumMg)} mg`);
    if (windowTrend.avgSugarG != null) summaryLines.push(`Avg sugar: ${Math.round(windowTrend.avgSugarG)} g`);
    if (windowTrend.avgCalories != null) summaryLines.push(`Avg calories: ${Math.round(windowTrend.avgCalories)} kcal`);

    summaryLines.push(`Trends: sodium=${sodiumTrend}, sugar=${sugarTrend}, calories=${caloriesTrend}`);

    if (clinicVisitFlag) {
      summaryLines.push('Clinic flag: repeated severe allergen exposure detected this week.');
    }

    const report: GeneratedReport = {
      period,
      fromTs,
      toTs,
      summary: summaryLines.join(' '),
      recommendations: {
        riskPatterns,
        trends: {
          sodium: sodiumTrend,
          sugar: sugarTrend,
          calories: caloriesTrend,
        },
        stats: windowTrend,
      },
      clinicVisitFlag,
      stats: {
        windowTrend,
        severeAllergenExposures,
        highSodiumCount,
        highSugarCount,
      },
      representativeScanId,
    };

    // Save to WatermelonDB (Report requires scan_id; we attach the most recent scan in the window if present)
    if (representativeScanId) {
      await repos.ReportRepository.createReport({
        userId,
        scanId: representativeScanId,
        summary: report.summary,
        recommendations: JSON.stringify({
          period,
          fromTs,
          toTs,
          clinicVisitFlag,
          riskPatterns,
          stats: report.stats,
        }),
      } as any);
    }

    // Push summary-only to Supabase (no health profile, no scan payload)
    try {
      const row = {
        id: `${userId}:${period}:${fromTs}`, // deterministic
        user_id: userId,
        period,
        from_ts: fromTs,
        to_ts: toTs,
        created_at: toTs,
        summary: report.summary,
        clinic_visit_flag: clinicVisitFlag,
        counts: {
          scans: payloads.length,
          severe_allergen_exposures: severeAllergenExposures,
        },
      };

      await supabase.from('report_summaries').upsert(row, { onConflict: 'id' });
    } catch {
      // ignore sync failures
    }

    return report;
  }

  static async generateWeekly(userId: string) {
    return await this.generateAndSave(userId, 'weekly');
  }

  static async generateMonthly(userId: string) {
    return await this.generateAndSave(userId, 'monthly');
  }
}
