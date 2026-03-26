import { Q } from '@nozbe/watermelondb';
import database from '../DatabaseManager';
import Report from '../models/Report';

const getReports = () => database.collections.get<Report>('reports');

const normalizeReportData = (data: Partial<Report> & Record<string, any>) => {
  if (!data) return {} as Partial<Report>;
  return {
    ...(data.user_id != null ? { userId: data.user_id } : null),
    ...(data.userId != null ? { userId: data.userId } : null),
    ...(data.summary != null ? { summary: data.summary } : null),
    ...(data.recommendations != null ? { recommendations: data.recommendations } : null),
  } as Partial<Report>;
};

export const ReportRepository = {
  async createReport(data: Partial<Report>) {
    return await database.write(async () => {
      const newReport = await getReports().create(report => {
        const normalized = normalizeReportData(data as any);
        Object.assign(report, normalized);

        const scanId = (data as any).scan_id ?? (data as any).scanId;
        if (scanId != null) {
          (report as any)._raw.scan_id = scanId;
        }
        (report as any)._raw.created_at ??= Date.now();
      });
      return newReport;
    });
  },

  async getReports(userId: string) {
    return await getReports().query(Q.where('user_id', userId)).fetch();
  },

  async getReportById(reportId: string) {
    return await getReports().find(reportId);
  },
};
