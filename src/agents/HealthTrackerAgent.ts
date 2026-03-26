import { NutritionCalculator, TrackerSnapshot, Verdict, UserAction } from '../utils/nutritionCalculator';

type DatabaseMod = typeof import('../database/DatabaseManager');
type ScanModel = typeof import('../database/models/Scan');

const tryGetDatabase = (): any | null => {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const db = require('../database/DatabaseManager') as DatabaseMod;
    return (db as any).default ?? db;
  } catch {
    return null;
  }
};

const getScanModel = (): any | null => {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const mod = require('../database/models/Scan') as ScanModel;
    return (mod as any).default ?? mod;
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

const normalizeVerdict = (v: any): Verdict => {
  const s = String(v || '').toUpperCase();
  if (s === 'APPROVED' || s === 'CAUTION' || s === 'AVOID') return s;
  return 'UNKNOWN';
};

export class HealthTrackerAgent {
  /**
   * Log a scan event into the existing `scans` table. Stores verdict/userAction inside scan.data JSON.
   */
  static async logScan(opts: {
    userId: string;
    scanPayload: any;
    verdict?: Verdict;
    userAction?: UserAction;
    type?: string;
  }): Promise<string | null> {
    try {
      const database = tryGetDatabase();
      if (!database) return null;
      const Scan = getScanModel();
      if (!Scan) return null;

      const scans = database.collections.get('scans');

      const createdAt = Date.now();
      const payload = opts.scanPayload ?? {};
      const verdict = opts.verdict ?? normalizeVerdict(payload?.recommendation?.verdict ?? payload?.verdict);
      const userAction = opts.userAction ?? 'unknown';

      const merged = {
        ...payload,
        tracker: {
          created_at: createdAt,
          verdict,
          userAction,
        },
        verdict,
        userAction,
        created_at: createdAt,
      };

      const row = await database.write(async () => {
        const created = await scans.create((s: any) => {
          s.userId = opts.userId;
          s.type = opts.type ?? 'product_scan';
          s.data = JSON.stringify(merged);
          (s as any)._raw.created_at ??= createdAt;
        });
        return created;
      });

      return String(row?.id ?? null);
    } catch {
      return null;
    }
  }

  /**
   * Update an existing scan's userAction (accepted/rejected) so compliance can be measured.
   */
  static async recordUserAction(opts: {
    scanId: string;
    userId: string;
    userAction: UserAction;
  }): Promise<void> {
    try {
      const database = tryGetDatabase();
      if (!database) return;

      const scans = database.collections.get('scans');
      const scan = await scans.find(opts.scanId);

      await database.write(async () => {
        await scan.update((s: any) => {
          const parsed = safeJsonParse(s.data) ?? {};
          parsed.userAction = opts.userAction;
          parsed.tracker = {
            ...(parsed.tracker ?? {}),
            userAction: opts.userAction,
            updated_at: Date.now(),
          };
          s.data = JSON.stringify(parsed);
        });
      });
    } catch {
      // ignore
    }
  }

  static async getSnapshots(userId: string): Promise<TrackerSnapshot[]> {
    try {
      const repos = (() => {
        try {
          // eslint-disable-next-line @typescript-eslint/no-var-requires
          return require('../database/repositories') as typeof import('../database/repositories');
        } catch {
          return null;
        }
      })();

      if (!repos) return [];
      const scans = await repos.ScanRepository.getScans(userId);
      const out: TrackerSnapshot[] = [];
      for (const s of scans as any[]) {
        const parsed = safeJsonParse(s?.data);
        const createdAt = typeof (s as any)?._raw?.created_at === 'number' ? (s as any)._raw.created_at : Date.now();
        const composed = {
          ...(parsed ?? {}),
          created_at: (parsed?.created_at ?? parsed?.tracker?.created_at ?? createdAt) as number,
          verdict: parsed?.verdict ?? parsed?.tracker?.verdict,
          userAction: parsed?.userAction ?? parsed?.tracker?.userAction,
        };
        const snap = NutritionCalculator.toSnapshot(composed);
        if (snap) out.push(snap);
      }
      return out.sort((a, b) => a.ts - b.ts);
    } catch {
      return [];
    }
  }

  static async getComplianceAndTrends(userId: string): Promise<{
    compliance: ReturnType<typeof NutritionCalculator.compliance>;
    sevenDay: ReturnType<typeof NutritionCalculator.trendWindow>;
    thirtyDay: ReturnType<typeof NutritionCalculator.trendWindow>;
  }> {
    const snaps = await this.getSnapshots(userId);
    const compliance = NutritionCalculator.compliance(snaps);
    const sevenDay = NutritionCalculator.trendWindow(snaps, 7);
    const thirtyDay = NutritionCalculator.trendWindow(snaps, 30);
    return { compliance, sevenDay, thirtyDay };
  }
}
