import { Q } from '@nozbe/watermelondb';
import database from '../DatabaseManager';
import Medication from '../models/Medication';
import { EncryptionService } from '../../services/EncryptionService';

const getMedicationsCollection = () => database.collections.get<Medication>('medications');

const normalizeMedicationData = (data: Partial<Medication> & Record<string, any>) => {
  if (!data) return {} as Partial<Medication>;
  return {
    ...(data.name != null ? { name: data.name } : null),
    ...(data.dosage != null ? { dosage: data.dosage } : null),
    ...(data.frequency != null ? { frequency: data.frequency } : null),
    ...(data.notes != null ? { notes: data.notes } : null),
  } as Partial<Medication>;
};

const encryptMedicationData = async (data: Partial<Medication> & Record<string, any>) => {
  const normalized = normalizeMedicationData(data);
  return {
    ...normalized,
    ...(normalized?.name != null ? { name: await EncryptionService.maybeEncrypt(normalized.name) } : null),
    ...(normalized?.dosage != null ? { dosage: await EncryptionService.maybeEncrypt(normalized.dosage) } : null),
    ...(normalized?.frequency != null ? { frequency: await EncryptionService.maybeEncrypt(normalized.frequency) } : null),
    ...(normalized?.notes != null ? { notes: await EncryptionService.maybeEncrypt(normalized.notes) } : null),
  } as Record<string, any>;
};

const getHealthProfileId = (data: Partial<Medication> & Record<string, any>) => (
  (data as any)?.health_profile_id ?? (data as any)?.healthProfileId ?? null
);

const mapMedicationRow = async (row: any) => ({
  id: row.id,
  name: await EncryptionService.maybeDecrypt(row.name),
  dosage: await EncryptionService.maybeDecrypt(row.dosage),
  frequency: await EncryptionService.maybeDecrypt(row.frequency),
  notes: await EncryptionService.maybeDecrypt(row.notes),
  health_profile_id: row.healthProfileId,
});

export const MedicationRepository = {
  async createMedication(data: Partial<Medication>) {
    try {
      const hpId = getHealthProfileId(data as any);
      if (!hpId) {
        throw new Error('health_profile_id is required to create a medication');
      }

      const encrypted = await encryptMedicationData(data as any);
      return await database.write(async () => {
        const newMedication = await getMedicationsCollection().create(medication => {
          Object.assign(medication, encrypted);
          (medication as any).healthProfileId = hpId;
        });

        return await mapMedicationRow(newMedication as any);
      });
    } catch (error: any) {
      throw new Error(`Failed to create medication: ${String(error?.message ?? error)}`);
    }
  },

  async getMedications(healthProfileId: string) {
    try {
      const rows = await getMedicationsCollection().query(Q.where('health_profile_id', healthProfileId)).fetch();
      const out: any[] = [];
      for (const r of rows as any[]) {
        out.push(await mapMedicationRow(r));
      }
      return out;
    } catch (error: any) {
      throw new Error(`Failed to fetch medications: ${String(error?.message ?? error)}`);
    }
  },

  async updateMedication(medicationId: string, data: Partial<Medication>) {
    const medication = await getMedicationsCollection().find(medicationId);
    const encrypted = await encryptMedicationData(data as any);
    return await database.write(async () => {
      const updatedMedication = await medication.update(item => {
        Object.assign(item, encrypted);

        const hpId = getHealthProfileId(data as any);
        if (hpId != null) {
          (item as any).healthProfileId = hpId;
        }
      });

      return await mapMedicationRow(updatedMedication as any);
    });
  },

  async deleteMedication(medicationId: string) {
    try {
      const medication = await getMedicationsCollection().find(medicationId);
      return await database.write(async () => {
        await medication.markAsDeleted();
      });
    } catch (error: any) {
      throw new Error(`Failed to delete medication: ${String(error?.message ?? error)}`);
    }
  },
};
