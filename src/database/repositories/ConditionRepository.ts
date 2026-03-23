import { Q } from '@nozbe/watermelondb';
import database from '../DatabaseManager';
import Condition from '../models/Condition';

const conditions = database.collections.get<Condition>('conditions');

export const ConditionRepository = {
  async createCondition(data: Partial<Condition>) {
    return await database.write(async () => {
      const newCondition = await conditions.create(condition => {
        Object.assign(condition, data);
      });
      return newCondition;
    });
  },

  async getConditions(healthProfileId: string) {
    return await conditions.query(Q.where('health_profile_id', healthProfileId)).fetch();
  },

  async updateCondition(conditionId: string, data: Partial<Condition>) {
    const condition = await conditions.find(conditionId);
    return await database.write(async () => {
      const updatedCondition = await condition.update(item => {
        Object.assign(item, data);
      });
      return updatedCondition;
    });
  },

  async deleteCondition(conditionId: string) {
    const condition = await conditions.find(conditionId);
    return await database.write(async () => {
      await condition.markAsDeleted();
    });
  },
};
