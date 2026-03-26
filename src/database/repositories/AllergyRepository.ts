import { Q } from '@nozbe/watermelondb';
import database from '../DatabaseManager';
import Allergy from '../models/Allergy';
import { EncryptionService } from '../../services/EncryptionService';

const getAllergiesCollection = () => database.collections.get<Allergy>('allergies');

const normalizeAllergyData = (data: Partial<Allergy> & Record<string, any>) => {
  if (!data) return {} as Partial<Allergy>;
  return {
    ...(data.name != null ? { name: data.name } : null),
    ...(data.severity != null ? { severity: data.severity } : null),
    ...(data.notes != null ? { notes: data.notes } : null),
  } as Partial<Allergy>;
};

export const AllergyRepository = {
  async createAllergy(data: Partial<Allergy>) {
    return await database.write(async () => {
      const newAllergy = await getAllergiesCollection().create(allergy => {
        const normalized = normalizeAllergyData(data as any);
        Object.assign(allergy, normalized);

        const hpId = (data as any).health_profile_id ?? (data as any).healthProfileId;
        if (hpId != null) {
          (allergy as any)._raw.health_profile_id = hpId;
        }
      });

      await newAllergy.update(async (item: any) => {
        const normalized = normalizeAllergyData(data as any);
        if (normalized?.name != null) item.name = await EncryptionService.maybeEncrypt(normalized.name);
        if (normalized?.notes != null) item.notes = await EncryptionService.maybeEncrypt(normalized.notes);
      });

      return {
        id: newAllergy.id,
        name: await EncryptionService.maybeDecrypt((newAllergy as any).name),
        severity: (newAllergy as any).severity,
        notes: await EncryptionService.maybeDecrypt((newAllergy as any).notes),
        health_profile_id: (newAllergy as any)?._raw?.health_profile_id,
      } as any;
    });
  },

  async getAllergies(healthProfileId: string) {
    const rows = await getAllergiesCollection().query(Q.where('health_profile_id', healthProfileId)).fetch();
    const out: any[] = [];
    for (const r of rows as any[]) {
      out.push({
        id: r.id,
        name: await EncryptionService.maybeDecrypt(r.name),
        severity: r.severity,
        notes: await EncryptionService.maybeDecrypt(r.notes),
        health_profile_id: (r as any)?._raw?.health_profile_id,
      });
    }
    return out;
  },

  async updateAllergy(allergyId: string, data: Partial<Allergy>) {
    const allergy = await getAllergiesCollection().find(allergyId);
    return await database.write(async () => {
      const updatedAllergy = await allergy.update(item => {
        const normalized = normalizeAllergyData(data as any);
        Object.assign(item, normalized);

        const hpId = (data as any).health_profile_id ?? (data as any).healthProfileId;
        if (hpId != null) {
          (item as any)._raw.health_profile_id = hpId;
        }
      });

      await updatedAllergy.update(async (item: any) => {
        const normalized = normalizeAllergyData(data as any);
        if (normalized?.name != null) item.name = await EncryptionService.maybeEncrypt(normalized.name);
        if (normalized?.notes != null) item.notes = await EncryptionService.maybeEncrypt(normalized.notes);
      });

      return {
        id: updatedAllergy.id,
        name: await EncryptionService.maybeDecrypt((updatedAllergy as any).name),
        severity: (updatedAllergy as any).severity,
        notes: await EncryptionService.maybeDecrypt((updatedAllergy as any).notes),
        health_profile_id: (updatedAllergy as any)?._raw?.health_profile_id,
      } as any;
    });
  },

  async deleteAllergy(allergyId: string) {
    const allergy = await getAllergiesCollection().find(allergyId);
    return await database.write(async () => {
      await allergy.markAsDeleted();
    });
  },
};
