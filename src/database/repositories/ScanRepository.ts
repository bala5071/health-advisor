import { Q } from '@nozbe/watermelondb';
import database from '../DatabaseManager';
import Scan from '../models/Scan';

const getScans = () => database.collections.get<Scan>('scans');

const normalizeScanData = (data: Partial<Scan> & Record<string, any>) => {
  if (!data) return {} as Partial<Scan>;
  return {
    ...(data.user_id != null ? { userId: data.user_id } : null),
    ...(data.userId != null ? { userId: data.userId } : null),
    ...(data.type != null ? { type: data.type } : null),
    ...(data.data != null ? { data: data.data } : null),
  } as Partial<Scan>;
};

export const ScanRepository = {
  async createScan(data: Partial<Scan>) {
    return await database.write(async () => {
      const newScan = await getScans().create(scan => {
        const normalized = normalizeScanData(data as any);
        Object.assign(scan, normalized);
        (scan as any)._raw.created_at ??= Date.now();
      });
      return newScan;
    });
  },

  async getScans(userId: string) {
    return await getScans().query(Q.where('user_id', userId)).fetch();
  },

  async getScanById(scanId: string) {
    return await getScans().find(scanId);
  },
};
