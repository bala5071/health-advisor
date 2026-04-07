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

const encryptAllergyData = async (data: Partial<Allergy> & Record<string, any>) => {
  const normalized = normalizeAllergyData(data);
  return {
    ...normalized,
    ...(normalized?.name != null ? { name: await EncryptionService.maybeEncrypt(normalized.name) } : null),
    ...(normalized?.notes != null ? { notes: await EncryptionService.maybeEncrypt(normalized.notes) } : null),
  } as Record<string, any>;
};

const getHealthProfileId = (data: Partial<Allergy> & Record<string, any>) => (
  (data as any)?.health_profile_id ?? (data as any)?.healthProfileId ?? null
);

const mapAllergyRow = async (row: any) => ({
  id: row.id,
  name: await EncryptionService.maybeDecrypt(row.name),
  severity: row.severity,
  notes: await EncryptionService.maybeDecrypt(row.notes),
  health_profile_id: row.healthProfileId,
});

export const AllergyRepository = {
  async createAllergy(data: Partial<Allergy>) {
    try {
      const hpId = getHealthProfileId(data as any);
      if (!hpId) {
        throw new Error('health_profile_id is required to create an allergy');
      }

      const encrypted = await encryptAllergyData(data as any);
      return await database.write(async () => {
        const newAllergy = await getAllergiesCollection().create(allergy => {
          Object.assign(allergy, encrypted);
          (allergy as any).healthProfileId = hpId;
        });

        return await mapAllergyRow(newAllergy as any);
      });
    } catch (error: any) {
      throw new Error(`Failed to create allergy: ${String(error?.message ?? error)}`);
    }
  },

  async getAllergies(healthProfileId: string) {
    try {
      const rows = await getAllergiesCollection().query(Q.where('health_profile_id', healthProfileId)).fetch();
      const out: any[] = [];
      for (const r of rows as any[]) {
        out.push(await mapAllergyRow(r));
      }
      return out;
    } catch (error: any) {
      throw new Error(`Failed to fetch allergies: ${String(error?.message ?? error)}`);
    }
  },

  async updateAllergy(allergyId: string, data: Partial<Allergy>) {
    const allergy = await getAllergiesCollection().find(allergyId);
    const encrypted = await encryptAllergyData(data as any);
    return await database.write(async () => {
      const updatedAllergy = await allergy.update(item => {
        Object.assign(item, encrypted);

        const hpId = getHealthProfileId(data as any);
        if (hpId != null) {
          (item as any).healthProfileId = hpId;
        }
      });

      return await mapAllergyRow(updatedAllergy as any);
    });
  },

  async deleteAllergy(allergyId: string) {
    try {
      const allergy = await getAllergiesCollection().find(allergyId);
      return await database.write(async () => {
        await allergy.markAsDeleted();
      });
    } catch (error: any) {
      throw new Error(`Failed to delete allergy: ${String(error?.message ?? error)}`);
    }
  },
};
