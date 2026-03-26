export type Verdict = 'APPROVED' | 'CAUTION' | 'AVOID' | 'UNKNOWN';
export type UserAction = 'accepted' | 'rejected' | 'unknown';

export type TrendWindow = {
  days: 7 | 30;
  fromTs: number;
  toTs: number;
  count: number;
  avgCalories?: number | null;
  avgSodiumMg?: number | null;
  avgSugarG?: number | null;
  verdictDistribution: Record<Verdict, number>;
};

export type ComplianceStats = {
  totalWithAction: number;
  accepted: number;
  rejected: number;
  complianceRate: number; // accepted / (accepted + rejected)
};

export type TrackerSnapshot = {
  ts: number;
  verdict: Verdict;
  userAction: UserAction;
  calories?: number | null;
  sodiumMg?: number | null;
  sugarG?: number | null;
};

const clamp01 = (n: number) => Math.max(0, Math.min(1, n));

const toVerdict = (v: any): Verdict => {
  const s = String(v || '').toUpperCase();
  if (s === 'APPROVED' || s === 'CAUTION' || s === 'AVOID') return s;
  return 'UNKNOWN';
};

export const NutritionCalculator = {
  toSnapshot(raw: any): TrackerSnapshot | null {
    try {
      const ts =
        typeof raw?.created_at === 'number'
          ? raw.created_at
          : typeof raw?.ts === 'number'
            ? raw.ts
            : typeof raw?.timestamp === 'number'
              ? raw.timestamp
              : null;
      if (!ts) return null;

      const verdict = toVerdict(raw?.verdict ?? raw?.recommendation?.verdict);

      const ua = String(raw?.userAction || raw?.user_action || '').toLowerCase();
      const userAction: UserAction = ua === 'accepted' ? 'accepted' : ua === 'rejected' ? 'rejected' : 'unknown';

      // Support both NutritionAgent and legacy shapes
      const nutrition = raw?.nutritionResult?.nutrition ?? raw?.nutrition ?? raw?.analysis?.nutritionResult?.nutrition;
      const calories =
        typeof nutrition?.caloriesKcal === 'number'
          ? nutrition.caloriesKcal
          : typeof nutrition?.calories === 'number'
            ? nutrition.calories
            : null;
      const sodiumMg =
        typeof nutrition?.sodiumMg === 'number'
          ? nutrition.sodiumMg
          : typeof nutrition?.sodium === 'number'
            ? nutrition.sodium
            : null;
      const sugarG =
        typeof nutrition?.totalSugarsG === 'number'
          ? nutrition.totalSugarsG
          : typeof nutrition?.sugar === 'number'
            ? nutrition.sugar
            : typeof nutrition?.sugars === 'number'
              ? nutrition.sugars
              : null;

      return {
        ts,
        verdict,
        userAction,
        calories,
        sodiumMg,
        sugarG,
      };
    } catch {
      return null;
    }
  },

  window(snapshots: TrackerSnapshot[], days: 7 | 30, nowTs = Date.now()): TrackerSnapshot[] {
    const fromTs = nowTs - days * 24 * 60 * 60 * 1000;
    return (snapshots || []).filter((s) => typeof s.ts === 'number' && s.ts >= fromTs && s.ts <= nowTs);
  },

  compliance(snapshots: TrackerSnapshot[]): ComplianceStats {
    let accepted = 0;
    let rejected = 0;

    for (const s of snapshots || []) {
      if (s.userAction === 'accepted') accepted++;
      else if (s.userAction === 'rejected') rejected++;
    }

    const totalWithAction = accepted + rejected;
    const complianceRate = totalWithAction > 0 ? accepted / totalWithAction : 0;

    return {
      totalWithAction,
      accepted,
      rejected,
      complianceRate: clamp01(complianceRate),
    };
  },

  verdictDistribution(snapshots: TrackerSnapshot[]): Record<Verdict, number> {
    const out: Record<Verdict, number> = {
      APPROVED: 0,
      CAUTION: 0,
      AVOID: 0,
      UNKNOWN: 0,
    };

    for (const s of snapshots || []) {
      out[s.verdict] = (out[s.verdict] ?? 0) + 1;
    }

    return out;
  },

  averageOf(snapshots: TrackerSnapshot[], key: 'calories' | 'sodiumMg' | 'sugarG'): number | null {
    let sum = 0;
    let count = 0;
    for (const s of snapshots || []) {
      const v = (s as any)[key];
      if (typeof v === 'number' && Number.isFinite(v)) {
        sum += v;
        count++;
      }
    }
    if (count === 0) return null;
    return sum / count;
  },

  trendWindow(snapshots: TrackerSnapshot[], days: 7 | 30, nowTs = Date.now()): TrendWindow {
    const toTs = nowTs;
    const fromTs = nowTs - days * 24 * 60 * 60 * 1000;
    const win = this.window(snapshots, days, nowTs);

    return {
      days,
      fromTs,
      toTs,
      count: win.length,
      avgCalories: this.averageOf(win, 'calories'),
      avgSodiumMg: this.averageOf(win, 'sodiumMg'),
      avgSugarG: this.averageOf(win, 'sugarG'),
      verdictDistribution: this.verdictDistribution(win),
    };
  },

  trends(snapshots: TrackerSnapshot[], nowTs = Date.now()): { sevenDay: TrendWindow; thirtyDay: TrendWindow } {
    return {
      sevenDay: this.trendWindow(snapshots, 7, nowTs),
      thirtyDay: this.trendWindow(snapshots, 30, nowTs),
    };
  },
};
