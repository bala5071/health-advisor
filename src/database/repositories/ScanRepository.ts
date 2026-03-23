import { Q } from '@nozbe/watermelondb';
import database from '../DatabaseManager';
import Scan from '../models/Scan';

const scans = database.collections.get<Scan>('scans');

export const ScanRepository = {
  async createScan(data: Partial<Scan>) {
    return await database.write(async () => {
      const newScan = await scans.create(scan => {
        Object.assign(scan, data);
      });
      return newScan;
    });
  },

  async getScans(userId: string) {
    return await scans.query(Q.where('user_id', userId)).fetch();
  },

  async getScanById(scanId: string) {
    return await scans.find(scanId);
  },
};
