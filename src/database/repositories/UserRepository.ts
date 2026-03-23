import { Q } from '@nozbe/watermelondb';
import database from '../DatabaseManager';
import HealthProfile from '../models/HealthProfile';

const healthProfiles = database.collections.get<HealthProfile>('health_profiles');

export const UserRepository = {
  async createHealthProfile(data: Partial<HealthProfile>) {
    return await database.write(async () => {
      const newProfile = await healthProfiles.create(profile => {
        Object.assign(profile, data);
      });
      return newProfile;
    });
  },

  async getHealthProfile(userId: string) {
    const profile = await healthProfiles.query(Q.where('user_id', userId)).fetch();
    return profile.length > 0 ? profile[0] : null;
  },

  async updateHealthProfile(userId: string, data: Partial<HealthProfile>) {
    const profile = await this.getHealthProfile(userId);
    if (profile) {
      return await database.write(async () => {
        const updatedProfile = await profile.update(item => {
          Object.assign(item, data);
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
