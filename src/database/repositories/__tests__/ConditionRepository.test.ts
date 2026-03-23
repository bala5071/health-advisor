/// <reference types="jest" />

import { ConditionRepository } from '../ConditionRepository';
import { UserRepository } from '../UserRepository';

describe('ConditionRepository', () => {
  it('should create, read, update, and delete a condition', async () => {
    const userId = 'test-user';
    const profile = await UserRepository.createHealthProfile({ userId });

    const conditionData = { health_profile_id: profile.id, name: 'Asthma' };

    // Create
    const newCondition = await ConditionRepository.createCondition(conditionData);
    expect(newCondition.name).toBe('Asthma');

    // Read
    const conditions = await ConditionRepository.getConditions(profile.id);
    expect(conditions.length).toBeGreaterThan(0);
    expect(conditions[0].name).toBe('Asthma');

    // Update
    const updatedConditionData = { name: 'Severe Asthma' };
    const updatedCondition = await ConditionRepository.updateCondition(newCondition.id, updatedConditionData);
    expect(updatedCondition.name).toBe('Severe Asthma');

    // Delete
    await ConditionRepository.deleteCondition(newCondition.id);
    // Add assertion for soft delete if needed
  });
});
