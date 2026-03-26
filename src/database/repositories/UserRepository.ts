import { Q } from '@nozbe/watermelondb';
import database from '../DatabaseManager';
import HealthProfile from '../models/HealthProfile';

const getHealthProfiles = () => database.collections.get<HealthProfile>('health_profiles');

const normalizeHealthProfileData = (data: Partial<HealthProfile> & Record<string, any>) => {
  if (!data) return {} as Partial<HealthProfile>;

  return {
    ...(data.user_id != null ? { userId: data.user_id } : null),
    ...(data.userId != null ? { userId: data.userId } : null),
    ...(data.date_of_birth != null ? { dateOfBirth: data.date_of_birth } : null),
    ...(data.dateOfBirth != null ? { dateOfBirth: data.dateOfBirth } : null),
    ...(data.gender != null ? { gender: data.gender } : null),
    ...(data.blood_type != null ? { bloodType: data.blood_type } : null),
    ...(data.bloodType != null ? { bloodType: data.bloodType } : null),
    ...(data.height != null ? { height: data.height } : null),
    ...(data.weight != null ? { weight: data.weight } : null),
    ...(data.dietary_preferences != null ? { dietaryPreferences: data.dietary_preferences } : null),
    ...(data.dietaryPreferences != null ? { dietaryPreferences: data.dietaryPreferences } : null),
    ...(data.health_goals != null ? { healthGoals: data.health_goals } : null),
    ...(data.healthGoals != null ? { healthGoals: data.healthGoals } : null),
  } as Partial<HealthProfile>;
};

export const UserRepository = {
  async createHealthProfile(data: Partial<HealthProfile>) {
    return await database.write(async () => {
      const newProfile = await getHealthProfiles().create(profile => {
        const normalized = normalizeHealthProfileData(data as any);
        Object.assign(profile, normalized);

        const now = Date.now();
        (profile as any)._raw.created_at ??= now;
        (profile as any)._raw.updated_at ??= now;
      });
      return newProfile;
    });
  },

  async getHealthProfile(userId: string) {
    const profile = await getHealthProfiles().query(Q.where('user_id', userId)).fetch();
    return profile.length > 0 ? profile[0] : null;
  },

  async updateHealthProfile(userId: string, data: Partial<HealthProfile>) {
    const profile = await this.getHealthProfile(userId);
    if (profile) {
      return await database.write(async () => {
        const updatedProfile = await profile.update(item => {
          const normalized = normalizeHealthProfileData(data as any);
          Object.assign(item, normalized);
          (item as any)._raw.updated_at = Date.now();
        });
        return updatedProfile;
      });
    }
    return null;
  },

  async deleteHealthProfile(userId: string) {
    const profile = await this.getHealthProfile(userId);
    if (profile) {
      return await database.write(async () => {
        await profile.markAsDeleted();
      });
    }
  },
};
