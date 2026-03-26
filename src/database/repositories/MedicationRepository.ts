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

export const MedicationRepository = {
  async createMedication(data: Partial<Medication>) {
    return await database.write(async () => {
      const newMedication = await getMedicationsCollection().create(medication => {
        const normalized = normalizeMedicationData(data as any);
        Object.assign(medication, normalized);

        const hpId = (data as any).health_profile_id ?? (data as any).healthProfileId;
        if (hpId != null) {
          (medication as any)._raw.health_profile_id = hpId;
        }
      });

      await newMedication.update(async (item: any) => {
        const normalized = normalizeMedicationData(data as any);
        if (normalized?.name != null) item.name = await EncryptionService.maybeEncrypt(normalized.name);
        if (normalized?.dosage != null) item.dosage = await EncryptionService.maybeEncrypt(normalized.dosage);
        if (normalized?.frequency != null) item.frequency = await EncryptionService.maybeEncrypt(normalized.frequency);
        if (normalized?.notes != null) item.notes = await EncryptionService.maybeEncrypt(normalized.notes);
      });

      return {
        id: newMedication.id,
        name: await EncryptionService.maybeDecrypt((newMedication as any).name),
        dosage: await EncryptionService.maybeDecrypt((newMedication as any).dosage),
        frequency: await EncryptionService.maybeDecrypt((newMedication as any).frequency),
        notes: await EncryptionService.maybeDecrypt((newMedication as any).notes),
        health_profile_id: (newMedication as any)?._raw?.health_profile_id,
      } as any;
    });
  },

  async getMedications(healthProfileId: string) {
    const rows = await getMedicationsCollection().query(Q.where('health_profile_id', healthProfileId)).fetch();
    const out: any[] = [];
    for (const r of rows as any[]) {
      out.push({
        id: r.id,
        name: await EncryptionService.maybeDecrypt(r.name),
        dosage: await EncryptionService.maybeDecrypt(r.dosage),
        frequency: await EncryptionService.maybeDecrypt(r.frequency),
        notes: await EncryptionService.maybeDecrypt(r.notes),
        health_profile_id: (r as any)?._raw?.health_profile_id,
      });
    }
    return out;
  },

  async updateMedication(medicationId: string, data: Partial<Medication>) {
    const medication = await getMedicationsCollection().find(medicationId);
    return await database.write(async () => {
      const updatedMedication = await medication.update(item => {
        const normalized = normalizeMedicationData(data as any);
        Object.assign(item, normalized);

        const hpId = (data as any).health_profile_id ?? (data as any).healthProfileId;
        if (hpId != null) {
          (item as any)._raw.health_profile_id = hpId;
        }
      });

      await updatedMedication.update(async (item: any) => {
        const normalized = normalizeMedicationData(data as any);
        if (normalized?.name != null) item.name = await EncryptionService.maybeEncrypt(normalized.name);
        if (normalized?.dosage != null) item.dosage = await EncryptionService.maybeEncrypt(normalized.dosage);
        if (normalized?.frequency != null) item.frequency = await EncryptionService.maybeEncrypt(normalized.frequency);
        if (normalized?.notes != null) item.notes = await EncryptionService.maybeEncrypt(normalized.notes);
      });

      return {
        id: updatedMedication.id,
        name: await EncryptionService.maybeDecrypt((updatedMedication as any).name),
        dosage: await EncryptionService.maybeDecrypt((updatedMedication as any).dosage),
        frequency: await EncryptionService.maybeDecrypt((updatedMedication as any).frequency),
        notes: await EncryptionService.maybeDecrypt((updatedMedication as any).notes),
        health_profile_id: (updatedMedication as any)?._raw?.health_profile_id,
      } as any;
    });
  },

  async deleteMedication(medicationId: string) {
    const medication = await getMedicationsCollection().find(medicationId);
    return await database.write(async () => {
      await medication.markAsDeleted();
    });
  },
};
