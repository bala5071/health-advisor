import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../components/AuthProvider';
import {
  UserRepository,
  AllergyRepository,
  MedicationRepository,
  ConditionRepository,
} from '../database/repositories';

export const useHealthProfile = () => {
  const { user } = useAuth();
  const [healthProfile, setHealthProfile] = useState<any>(null);
  const [conditions, setConditions] = useState<any[]>([]);
  const [allergies, setAllergies] = useState<any[]>([]);
  const [medications, setMedications] = useState<any[]>([]);

  const fetchProfile = useCallback(async () => {
    if (user) {
      const profile = await UserRepository.getHealthProfile(user.id);
      setHealthProfile(profile);
      if (profile) {
        const [userConditions, userAllergies, userMedications] = await Promise.all([
          ConditionRepository.getConditions(profile.id),
          AllergyRepository.getAllergies(profile.id),
          MedicationRepository.getMedications(profile.id),
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
    if (healthProfile) {
      await UserRepository.updateHealthProfile(user!.id, data);
      fetchProfile();
    }
  };

  const addCondition = async (name: string) => {
    if (healthProfile) {
      await ConditionRepository.createCondition({ health_profile_id: healthProfile.id, name });
      fetchProfile();
    }
  };

  const deleteCondition = async (conditionId: string) => {
    await ConditionRepository.deleteCondition(conditionId);
    fetchProfile();
  };

  const addAllergy = async (allergy: { name: string; severity: string }) => {
    if (healthProfile) {
      await AllergyRepository.createAllergy({ health_profile_id: healthProfile.id, ...allergy });
      fetchProfile();
    }
  };

  const deleteAllergy = async (allergyId: string) => {
    await AllergyRepository.deleteAllergy(allergyId);
    fetchProfile();
  };

  const addMedication = async (medication: { name: string; dosage: string; frequency: string; notes: string }) => {
    if (healthProfile) {
      await MedicationRepository.createMedication({ health_profile_id: healthProfile.id, ...medication });
      fetchProfile();
    }
  };

  const deleteMedication = async (medicationId: string) => {
    await MedicationRepository.deleteMedication(medicationId);
    fetchProfile();
  };

  return {
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
