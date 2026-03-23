/// <reference types="jest" />

import { ReportRepository } from '../ReportRepository';
import { ScanRepository } from '../ScanRepository';


describe('ReportRepository', () => {
  it('should create and read a report', async () => {
    const userId = 'test-user';
    const scanData = { userId, type: 'blood_pressure', data: '{}' };
    const newScan = await ScanRepository.createScan(scanData);

    const reportData = { userId, scan_id: newScan.id, summary: 'All good' };

    // Create
    const newReport = await ReportRepository.createReport(reportData);
    expect(newReport.userId).toBe(userId);

    // Read
    const reports = await ReportRepository.getReports(userId);
    expect(reports.length).toBeGreaterThan(0);
    expect(reports[0].summary).toBe('All good');
  });
});
