import { Q } from '@nozbe/watermelondb';
import database from '../DatabaseManager';
import Condition from '../models/Condition';
import { EncryptionService } from '../../services/EncryptionService';

const getConditionsCollection = () => database.collections.get<Condition>('conditions');

const normalizeConditionData = (data: Partial<Condition> & Record<string, any>) => {
  if (!data) return {} as Partial<Condition>;
  return {
    ...(data.name != null ? { name: data.name } : null),
    ...(data.notes != null ? { notes: data.notes } : null),
  } as Partial<Condition>;
};

const encryptConditionData = async (data: Partial<Condition> & Record<string, any>) => {
  const normalized = normalizeConditionData(data);
  return {
    ...normalized,
    ...(normalized?.name != null ? { name: await EncryptionService.maybeEncrypt(normalized.name) } : null),
    ...(normalized?.notes != null ? { notes: await EncryptionService.maybeEncrypt(normalized.notes) } : null),
  } as Record<string, any>;
};

const getHealthProfileId = (data: Partial<Condition> & Record<string, any>) => (
  (data as any)?.health_profile_id ?? (data as any)?.healthProfileId ?? null
);

const mapConditionRow = async (row: any) => ({
  id: row.id,
  name: await EncryptionService.maybeDecrypt(row.name),
  notes: await EncryptionService.maybeDecrypt(row.notes),
  health_profile_id: row.healthProfileId,
});

export const ConditionRepository = {
  async createCondition(data: Partial<Condition>) {
    try {
      const hpId = getHealthProfileId(data as any);
      if (!hpId) {
        throw new Error('health_profile_id is required to create a condition');
      }

      const encrypted = await encryptConditionData(data as any);
      return await database.write(async () => {
        const newCondition = await getConditionsCollection().create(condition => {
          Object.assign(condition, encrypted);
          (condition as any).healthProfileId = hpId;
        });

        return await mapConditionRow(newCondition as any);
      });
    } catch (error: any) {
      throw new Error(`Failed to create condition: ${String(error?.message ?? error)}`);
    }
  },

  async getConditions(healthProfileId: string) {
    try {
      const rows = await getConditionsCollection().query(Q.where('health_profile_id', healthProfileId)).fetch();
      const out: any[] = [];
      for (const r of rows as any[]) {
        out.push(await mapConditionRow(r));
      }
      return out;
    } catch (error: any) {
      throw new Error(`Failed to fetch conditions: ${String(error?.message ?? error)}`);
    }
  },

  async updateCondition(conditionId: string, data: Partial<Condition>) {
    const condition = await getConditionsCollection().find(conditionId);
    const encrypted = await encryptConditionData(data as any);
    return await database.write(async () => {
      const updatedCondition = await condition.update(item => {
        Object.assign(item, encrypted);

        const hpId = getHealthProfileId(data as any);
        if (hpId != null) {
          (item as any).healthProfileId = hpId;
        }
      });

      return await mapConditionRow(updatedCondition as any);
    });
  },

  async deleteCondition(conditionId: string) {
    try {
      const condition = await getConditionsCollection().find(conditionId);
      return await database.write(async () => {
        await condition.markAsDeleted();
      });
    } catch (error: any) {
      throw new Error(`Failed to delete condition: ${String(error?.message ?? error)}`);
    }
  },
};
