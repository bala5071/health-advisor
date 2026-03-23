export interface UserHealthProfile {
  userId: string;
  dob: Date;
  sex: 'male' | 'female' | 'other';
  height: number; // in cm
  weight: number; // in kg
  conditions: HealthCondition[];
  allergies: Allergy[];
  medications: Medication[];
}

export interface HealthCondition {
  id: string;
  name: string;
  startDate: Date;
  notes?: string;
}

export interface Allergy {
  id: string;
  name: string;
  severity: 'mild' | 'moderate' | 'severe';
  reaction: string;
}

export interface Medication {
  id: string;
  name: string;
  dosage: string;
  frequency: string;
  reason: string;
}
