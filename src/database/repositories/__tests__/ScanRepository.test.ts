/// <reference types="jest" />

import { ScanRepository } from '../ScanRepository';


describe('ScanRepository', () => {
  it('should create and read a scan', async () => {
    const userId = 'test-user';
    const scanData = { userId, type: 'blood_pressure', data: '{}' };

    // Create
    const newScan = await ScanRepository.createScan(scanData);
    expect(newScan.userId).toBe(userId);

    // Read
    const scans = await ScanRepository.getScans(userId);
    expect(scans.length).toBeGreaterThan(0);
    expect(scans[0].type).toBe('blood_pressure');
  });
});
