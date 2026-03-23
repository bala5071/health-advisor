import { Q } from '@nozbe/watermelondb';
import database from '../DatabaseManager';
import Medication from '../models/Medication';

const medications = database.collections.get<Medication>('medications');

export const MedicationRepository = {
  async createMedication(data: Partial<Medication>) {
    return await database.write(async () => {
      const newMedication = await medications.create(medication => {
        Object.assign(medication, data);
      });
      return newMedication;
    });
  },

  async getMedications(healthProfileId: string) {
    return await medications.query(Q.where('health_profile_id', healthProfileId)).fetch();
  },

  async updateMedication(medicationId: string, data: Partial<Medication>) {
    const medication = await medications.find(medicationId);
    return await database.write(async () => {
      const updatedMedication = await medication.update(item => {
        Object.assign(item, data);
      });
      return updatedMedication;
    });
  },

  async deleteMedication(medicationId: string) {
    const medication = await medications.find(medicationId);
    return await database.write(async () => {
      await medication.markAsDeleted();
    });
  },
};
