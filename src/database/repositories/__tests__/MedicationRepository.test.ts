/// <reference types="jest" />

import { MedicationRepository } from '../MedicationRepository';
import { UserRepository } from '../UserRepository';

describe('MedicationRepository', () => {
  it('should create, read, update, and delete a medication', async () => {
    const userId = 'test-user';
    const profile = await UserRepository.createHealthProfile({ userId });

    const medicationData = { health_profile_id: profile.id, name: 'Ibuprofen', dosage: '200mg' };

    // Create
    const newMedication = await MedicationRepository.createMedication(medicationData);
    expect(newMedication.name).toBe('Ibuprofen');

    // Read
    const medications = await MedicationRepository.getMedications(profile.id);
    expect(medications.length).toBeGreaterThan(0);
    expect(medications[0].dosage).toBe('200mg');

    // Update
    const updatedMedicationData = { dosage: '400mg' };
    const updatedMedication = await MedicationRepository.updateMedication(newMedication.id, updatedMedicationData);
    expect(updatedMedication.dosage).toBe('400mg');

    // Delete
    await MedicationRepository.deleteMedication(newMedication.id);
    // Add assertion for soft delete if needed
  });
});
