import { Q } from '@nozbe/watermelondb';
import database from '../DatabaseManager';
import Allergy from '../models/Allergy';

const allergies = database.collections.get<Allergy>('allergies');

export const AllergyRepository = {
  async createAllergy(data: Partial<Allergy>) {
    return await database.write(async () => {
      const newAllergy = await allergies.create(allergy => {
        Object.assign(allergy, data);
      });
      return newAllergy;
    });
  },

  async getAllergies(healthProfileId: string) {
    return await allergies.query(Q.where('health_profile_id', healthProfileId)).fetch();
  },

  async updateAllergy(allergyId: string, data: Partial<Allergy>) {
    const allergy = await allergies.find(allergyId);
    return await database.write(async () => {
      const updatedAllergy = await allergy.update(item => {
        Object.assign(item, data);
      });
      return updatedAllergy;
    });
  },

  async deleteAllergy(allergyId: string) {
    const allergy = await allergies.find(allergyId);
    return await database.write(async () => {
      await allergy.markAsDeleted();
    });
  },
};
