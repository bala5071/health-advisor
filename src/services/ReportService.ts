import { storage } from './storage';
import { ReportingAgent } from '../agents/ReportingAgent';

const WEEKLY_KEY = 'reports:last_weekly_run_at';
const MONTHLY_KEY = 'reports:last_monthly_run_at';

const dayMs = 24 * 60 * 60 * 1000;

const safeNumber = (v: string | null): number => {
  const n = v ? Number(v) : 0;
  return Number.isFinite(n) ? n : 0;
};

const safeJsonParse = (v: string | null): any => {
  if (!v) return null;
  try {
    return JSON.parse(v);
  } catch {
    return null;
  }
};

const SETTINGS_KEY = 'settings:v1';

const getReportFrequency = async (): Promise<'weekly' | 'monthly' | 'none'> => {
  const raw = await storage.getItem(SETTINGS_KEY);
  const parsed = safeJsonParse(raw);
  const freq = parsed?.reportFrequency;
  if (freq === 'weekly' || freq === 'monthly' || freq === 'none') return freq;
  return 'weekly';
};

const shouldRun = (lastRunAt: number, periodDays: number, nowTs: number) => {
  if (!lastRunAt) return true;
  return nowTs - lastRunAt >= periodDays * dayMs;
};

export class ReportService {
  /**
   * Best-effort scheduler:
   * - Always safe to call on app open.
   * - Generates weekly/monthly reports if enough time has passed.
   */
  static async onAppOpen(userId: string): Promise<void> {
    const nowTs = Date.now();

    const reportFrequency = await getReportFrequency().catch(() => 'weekly' as const);
    if (reportFrequency === 'none') {
      await this.tryRegisterBackgroundJob().catch(() => undefined);
      return;
    }

    const lastWeekly = safeNumber(await storage.getItem(WEEKLY_KEY));
    const lastMonthly = safeNumber(await storage.getItem(MONTHLY_KEY));

    if (reportFrequency === 'weekly' && shouldRun(lastWeekly, 7, nowTs)) {
      await ReportingAgent.generateWeekly(userId).catch(() => undefined);
      await storage.setItem(WEEKLY_KEY, String(nowTs));
    }

    if (reportFrequency === 'monthly' && shouldRun(lastMonthly, 30, nowTs)) {
      await ReportingAgent.generateMonthly(userId).catch(() => undefined);
      await storage.setItem(MONTHLY_KEY, String(nowTs));
    }

    // Optional: background fetch registration (dynamic)
    await this.tryRegisterBackgroundJob().catch(() => undefined);
  }

  static async tryRegisterBackgroundJob(): Promise<void> {
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const BackgroundFetch = require('expo-background-fetch') as any;
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const TaskManager = require('expo-task-manager') as any;
      if (!BackgroundFetch?.registerTaskAsync || !TaskManager?.defineTask) return;

      const TASK_NAME = 'health_advisor_reports_task';
      if (!TaskManager.isTaskDefined?.(TASK_NAME)) {
        TaskManager.defineTask(TASK_NAME, async () => {
          return BackgroundFetch.BackgroundFetchResult.NoData;
        });
      }

      const status = await BackgroundFetch.getStatusAsync();
      if (status !== BackgroundFetch.BackgroundFetchStatus.Available) return;

      const tasks = await BackgroundFetch.getRegisteredTasksAsync();
      if (Array.isArray(tasks) && tasks.some((t: any) => t.taskName === TASK_NAME)) return;

      await BackgroundFetch.registerTaskAsync(TASK_NAME, {
        minimumInterval: 6 * 60 * 60,
        stopOnTerminate: false,
        startOnBoot: true,
      });
    } catch {
      // ignore
    }
  }
}
