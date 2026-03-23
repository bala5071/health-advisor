/// <reference types="jest" />

import { AllergyRepository } from '../AllergyRepository';
import { UserRepository } from '../UserRepository';

describe('AllergyRepository', () => {
  it('should create, read, update, and delete an allergy', async () => {
    const userId = 'test-user';
    const profile = await UserRepository.createHealthProfile({ userId });

    const allergyData = { health_profile_id: profile.id, name: 'Peanuts', severity: 'High' };

    // Create
    const newAllergy = await AllergyRepository.createAllergy(allergyData);
    expect(newAllergy.name).toBe('Peanuts');

    // Read
    const allergies = await AllergyRepository.getAllergies(profile.id);
    expect(allergies.length).toBeGreaterThan(0);
    expect(allergies[0].severity).toBe('High');

    // Update
    const updatedAllergyData = { severity: 'Medium' };
    const updatedAllergy = await AllergyRepository.updateAllergy(newAllergy.id, updatedAllergyData);
    expect(updatedAllergy.severity).toBe('Medium');

    // Delete
    await AllergyRepository.deleteAllergy(newAllergy.id);
    // Add assertion for soft delete if needed
  });
});
