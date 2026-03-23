import { Q } from '@nozbe/watermelondb';
import database from '../DatabaseManager';
import Report from '../models/Report';

const reports = database.collections.get<Report>('reports');

export const ReportRepository = {
  async createReport(data: Partial<Report>) {
    return await database.write(async () => {
      const newReport = await reports.create(report => {
        Object.assign(report, data);
      });
      return newReport;
    });
  },

  async getReports(userId: string) {
    return await reports.query(Q.where('user_id', userId)).fetch();
  },

  async getReportById(reportId: string) {
    return await reports.find(reportId);
  },
};
