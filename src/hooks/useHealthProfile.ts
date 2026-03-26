import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../components/AuthProvider';

type Repositories = typeof import('../database/repositories');

const tryGetRepositories = (): Repositories | null => {
  try {
    // WatermelonDB requires native modules; in Expo Go this may throw during require.
    // Lazy-require prevents route modules from crashing at import time.
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    return require('../database/repositories') as Repositories;
  } catch (e) {
    console.error('Failed to load WatermelonDB repositories. Native DB may be unavailable in this runtime.', e);
    return null;
  }
};

export const useHealthProfile = () => {
  const { user } = useAuth();
  const [healthProfile, setHealthProfile] = useState<any>(null);
  const [conditions, setConditions] = useState<any[]>([]);
  const [allergies, setAllergies] = useState<any[]>([]);
  const [medications, setMedications] = useState<any[]>([]);
  const [dbAvailable, setDbAvailable] = useState(true);

  const fetchProfile = useCallback(async () => {
    const repos = tryGetRepositories();
    if (!repos) {
      setDbAvailable(false);
      setHealthProfile(null);
      setConditions([]);
      setAllergies([]);
      setMedications([]);
      return;
    }

    if (user) {
      const profile = await repos.UserRepository.getHealthProfile(user.id);
      setHealthProfile(profile);
      if (profile) {
        const [userConditions, userAllergies, userMedications] = await Promise.all([
          repos.ConditionRepository.getConditions(profile.id),
          repos.AllergyRepository.getAllergies(profile.id),
          repos.MedicationRepository.getMedications(profile.id),
        ]);
        setConditions(userConditions);
        setAllergies(userAllergies);
        setMedications(userMedications);
      }
    }
  }, [user]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  const updateHealthProfile = async (data: Partial<any>) => {
    const repos = tryGetRepositories();
    if (!repos) {
      setDbAvailable(false);
      return;
    }
    if (healthProfile) {
      await repos.UserRepository.updateHealthProfile(user!.id, data);
      fetchProfile();
    }
  };

  const addCondition = async (name: string) => {
    const repos = tryGetRepositories();
    if (!repos) {
      setDbAvailable(false);
      return;
    }
    if (healthProfile) {
      await repos.ConditionRepository.createCondition({
        health_profile_id: healthProfile.id,
        name,
      } as any);
      fetchProfile();
    }
  };

  const deleteCondition = async (conditionId: string) => {
    const repos = tryGetRepositories();
    if (!repos) {
      setDbAvailable(false);
      return;
    }
    await repos.ConditionRepository.deleteCondition(conditionId);
    fetchProfile();
  };

  const addAllergy = async (allergy: { name: string; severity: string }) => {
    const repos = tryGetRepositories();
    if (!repos) {
      setDbAvailable(false);
      return;
    }
    if (healthProfile) {
      await repos.AllergyRepository.createAllergy({
        health_profile_id: healthProfile.id,
        ...allergy,
      } as any);
      fetchProfile();
    }
  };

  const deleteAllergy = async (allergyId: string) => {
    const repos = tryGetRepositories();
    if (!repos) {
      setDbAvailable(false);
      return;
    }
    await repos.AllergyRepository.deleteAllergy(allergyId);
    fetchProfile();
  };

  const addMedication = async (medication: { name: string; dosage: string; frequency: string; notes: string }) => {
    const repos = tryGetRepositories();
    if (!repos) {
      setDbAvailable(false);
      return;
    }
    if (healthProfile) {
      await repos.MedicationRepository.createMedication({
        health_profile_id: healthProfile.id,
        ...medication,
      } as any);
      fetchProfile();
    }
  };

  const deleteMedication = async (medicationId: string) => {
    const repos = tryGetRepositories();
    if (!repos) {
      setDbAvailable(false);
      return;
    }
    await repos.MedicationRepository.deleteMedication(medicationId);
    fetchProfile();
  };

  return {
    dbAvailable,
    healthProfile,
    conditions,
    allergies,
    medications,
    updateHealthProfile,
    addCondition,
    deleteCondition,
    addAllergy,
    deleteAllergy,
    addMedication,
    deleteMedication,
    setHealthProfile
  };
};
