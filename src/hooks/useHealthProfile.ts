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
  const [loading, setLoading] = useState(true);
  const [initialized, setInitialized] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const ensureProfile = useCallback(
    async (repos: Repositories) => {
      if (!user?.id) return null;

      let profile = await repos.UserRepository.getHealthProfile(user.id);
      if (!profile) {
        profile = await repos.UserRepository.createHealthProfile({ user_id: user.id } as any);
      }

      setHealthProfile(profile);
      return profile;
    },
    [user?.id],
  );

  const fetchProfile = useCallback(async () => {
    setLoading(true);
    setError(null);
    const repos = tryGetRepositories();
    if (!repos) {
      setDbAvailable(false);
      setHealthProfile(null);
      setConditions([]);
      setAllergies([]);
      setMedications([]);
      setLoading(false);
      setInitialized(true);
      return;
    }

    setDbAvailable(true);

    if (!user?.id) {
      setHealthProfile(null);
      setConditions([]);
      setAllergies([]);
      setMedications([]);
      setLoading(false);
      setInitialized(true);
      return;
    }

    try {
      const profile = await ensureProfile(repos);
      setHealthProfile(profile);

      if (!profile?.id) {
        setConditions([]);
        setAllergies([]);
        setMedications([]);
        return;
      }

      const [userConditions, userAllergies, userMedications] = await Promise.all([
        repos.ConditionRepository.getConditions(profile.id),
        repos.AllergyRepository.getAllergies(profile.id),
        repos.MedicationRepository.getMedications(profile.id),
      ]);
      setConditions(userConditions);
      setAllergies(userAllergies);
      setMedications(userMedications);
    } catch (e: any) {
      console.error('Failed to fetch health profile and related records', e);
      setError(String(e?.message || e));
    } finally {
      setLoading(false);
      setInitialized(true);
    }
  }, [ensureProfile, user]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  const updateHealthProfile = async (data: Partial<any>): Promise<boolean> => {
    const repos = tryGetRepositories();
    if (!repos) {
      setDbAvailable(false);
      setError('Local database is unavailable.');
      return false;
    }

    if (!user?.id) {
      setError('Sign in to update profile.');
      return false;
    }

    try {
      setError(null);
      await ensureProfile(repos);
      await repos.UserRepository.updateHealthProfile(user.id, data);
      await fetchProfile();
      return true;
    } catch (e: any) {
      console.error('Failed to update health profile', e);
      setError(String(e?.message || e));
      return false;
    }
  };

  const addCondition = async (name: string): Promise<boolean> => {
    const repos = tryGetRepositories();
    if (!repos) {
      setDbAvailable(false);
      setError('Local database is unavailable.');
      return false;
    }

    const trimmedName = String(name ?? '').trim();
    if (!trimmedName) {
      return false;
    }

    try {
      setError(null);
      const profile = await ensureProfile(repos);
      if (!profile?.id) {
        setError('Unable to resolve health profile.');
        return false;
      }
      await repos.ConditionRepository.createCondition({
        health_profile_id: profile.id,
        name: trimmedName,
      } as any);
      const userConditions = await repos.ConditionRepository.getConditions(profile.id);
      setConditions(userConditions);
      return true;
    } catch (e: any) {
      console.error('Failed to add condition', e);
      setError(String(e?.message || e));
      return false;
    }
  };

  const deleteCondition = async (conditionId: string): Promise<boolean> => {
    const repos = tryGetRepositories();
    if (!repos) {
      setDbAvailable(false);
      setError('Local database is unavailable.');
      return false;
    }

    try {
      setError(null);
      const previous = conditions;
      setConditions(previous.filter(c => c.id !== conditionId));
      await repos.ConditionRepository.deleteCondition(conditionId);
      return true;
    } catch (e: any) {
      console.error('Failed to delete condition', e);
      setConditions(previous => previous.some(c => c.id === conditionId) ? previous : conditions);
      setError(String(e?.message || e));
      return false;
    }
  };

  const addAllergy = async (allergy: { name: string; severity: string }): Promise<boolean> => {
    const repos = tryGetRepositories();
    if (!repos) {
      setDbAvailable(false);
      setError('Local database is unavailable.');
      return false;
    }

    const name = String(allergy?.name ?? '').trim();
    const severity = String(allergy?.severity ?? '').trim();
    if (!name) {
      return false;
    }

    try {
      setError(null);
      const profile = await ensureProfile(repos);
      if (!profile?.id) {
        setError('Unable to resolve health profile.');
        return false;
      }
      await repos.AllergyRepository.createAllergy({
        health_profile_id: profile.id,
        name,
        severity,
      } as any);
      const userAllergies = await repos.AllergyRepository.getAllergies(profile.id);
      setAllergies(userAllergies);
      return true;
    } catch (e: any) {
      console.error('Failed to add allergy', e);
      setError(String(e?.message || e));
      return false;
    }
  };

  const deleteAllergy = async (allergyId: string): Promise<boolean> => {
    const repos = tryGetRepositories();
    if (!repos) {
      setDbAvailable(false);
      setError('Local database is unavailable.');
      return false;
    }

    try {
      setError(null);
      const previous = allergies;
      setAllergies(previous.filter(a => a.id !== allergyId));
      await repos.AllergyRepository.deleteAllergy(allergyId);
      return true;
    } catch (e: any) {
      console.error('Failed to delete allergy', e);
      setAllergies(previous => previous.some(a => a.id === allergyId) ? previous : allergies);
      setError(String(e?.message || e));
      return false;
    }
  };

  const addMedication = async (medication: { name: string; dosage: string; frequency: string; notes: string }): Promise<boolean> => {
    const repos = tryGetRepositories();
    if (!repos) {
      setDbAvailable(false);
      setError('Local database is unavailable.');
      return false;
    }

    const name = String(medication?.name ?? '').trim();
    if (!name) {
      return false;
    }

    try {
      setError(null);
      const profile = await ensureProfile(repos);
      if (!profile?.id) {
        setError('Unable to resolve health profile.');
        return false;
      }
      await repos.MedicationRepository.createMedication({
        health_profile_id: profile.id,
        name,
        dosage: String(medication?.dosage ?? '').trim(),
        frequency: String(medication?.frequency ?? '').trim(),
        notes: String(medication?.notes ?? '').trim(),
      } as any);
      const userMedications = await repos.MedicationRepository.getMedications(profile.id);
      setMedications(userMedications);
      return true;
    } catch (e: any) {
      console.error('Failed to add medication', e);
      setError(String(e?.message || e));
      return false;
    }
  };

  const deleteMedication = async (medicationId: string): Promise<boolean> => {
    const repos = tryGetRepositories();
    if (!repos) {
      setDbAvailable(false);
      setError('Local database is unavailable.');
      return false;
    }

    try {
      setError(null);
      const previous = medications;
      setMedications(previous.filter(m => m.id !== medicationId));
      await repos.MedicationRepository.deleteMedication(medicationId);
      return true;
    } catch (e: any) {
      console.error('Failed to delete medication', e);
      setMedications(previous => previous.some(m => m.id === medicationId) ? previous : medications);
      setError(String(e?.message || e));
      return false;
    }
  };

  return {
    dbAvailable,
    loading,
    initialized,
    isSignedIn: Boolean(user?.id),
    error,
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
