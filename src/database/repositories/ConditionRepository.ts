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

export const ConditionRepository = {
  async createCondition(data: Partial<Condition>) {
    return await database.write(async () => {
      const normalized = normalizeConditionData(data as any);
      const newCondition = await getConditionsCollection().create(condition => {
        Object.assign(condition, normalized);

        const hpId = (data as any).health_profile_id ?? (data as any).healthProfileId;
        if (hpId != null) {
          (condition as any)._raw.health_profile_id = hpId;
        }
      });

      // Encrypt after create inside same write transaction
      await newCondition.update(async (item: any) => {
        if (normalized?.name != null) item.name = await EncryptionService.maybeEncrypt(normalized.name);
        if (normalized?.notes != null) item.notes = await EncryptionService.maybeEncrypt(normalized.notes);
      });
      return newCondition;
    });
  },

  async getConditions(healthProfileId: string) {
    const rows = await getConditionsCollection().query(Q.where('health_profile_id', healthProfileId)).fetch();
    const out: any[] = [];
    for (const r of rows as any[]) {
      out.push({
        id: r.id,
        name: await EncryptionService.maybeDecrypt(r.name),
        notes: await EncryptionService.maybeDecrypt(r.notes),
        health_profile_id: (r as any)?._raw?.health_profile_id,
      });
    }
    return out;
  },

  async updateCondition(conditionId: string, data: Partial<Condition>) {
    const condition = await getConditionsCollection().find(conditionId);
    return await database.write(async () => {
      const updatedCondition = await condition.update(item => {
        const normalized = normalizeConditionData(data as any);
        Object.assign(item, normalized);

        const hpId = (data as any).health_profile_id ?? (data as any).healthProfileId;
        if (hpId != null) {
          (item as any)._raw.health_profile_id = hpId;
        }
      });

      await updatedCondition.update(async (item: any) => {
        const normalized = normalizeConditionData(data as any);
        if (normalized?.name != null) item.name = await EncryptionService.maybeEncrypt(normalized.name);
        if (normalized?.notes != null) item.notes = await EncryptionService.maybeEncrypt(normalized.notes);
      });
      return updatedCondition;
    });
  },

  async deleteCondition(conditionId: string) {
    const condition = await getConditionsCollection().find(conditionId);
    return await database.write(async () => {
      await condition.markAsDeleted();
    });
  },
};
