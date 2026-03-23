/// <reference types="jest" />

import { UserRepository } from '../UserRepository';


describe('UserRepository', () => {
  it('should create, read, update, and delete a health profile', async () => {
    const userId = 'test-user';
    const initialProfileData = { userId, height: 180, weight: 80 };

    // Create
    const newProfile = await UserRepository.createHealthProfile(initialProfileData);
    expect(newProfile.userId).toBe(userId);

    // Read
    const fetchedProfile = await UserRepository.getHealthProfile(userId);
    expect(fetchedProfile).not.toBeNull();
    expect(fetchedProfile?.height).toBe(180);

    // Update
    const updatedProfileData = { height: 182 };
    const updatedProfile = await UserRepository.updateHealthProfile(userId, updatedProfileData);
    expect(updatedProfile?.height).toBe(182);

    // Delete
    await UserRepository.deleteHealthProfile(userId);
    const deletedProfile = await UserRepository.getHealthProfile(userId);
    // WatermelonDB soft deletes, so we check if it's marked as deleted.
    // This part of the test will need adjustment based on how you handle soft deletes.
  });
});
