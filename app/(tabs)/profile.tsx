import React, { useState } from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useHealthProfile } from '../../src/hooks/useHealthProfile';
import ListItem from '../../src/components/ListItem';
import FormField from '../../src/components/FormField';
import Button from '../../src/components/common/Button';
import { useTheme } from '../../src/theme/useTheme';

export default function ProfileScreen() {
  const router = useRouter();
  const theme = useTheme();
  const {
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
    setHealthProfile,
  } = useHealthProfile();

  const [newCondition, setNewCondition] = useState('');
  const [newAllergy, setNewAllergy] = useState({ name: '', severity: '' });
  const [newMedication, setNewMedication] = useState({ name: '', dosage: '', frequency: '', notes: '' });

  if (!dbAvailable) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 16 }}>
        <Text style={{ fontSize: 16, textAlign: 'center' }}>
          Local database is not available in this runtime. Use a development build to enable WatermelonDB.
        </Text>
      </View>
    );
  }

  const handleAddCondition = () => {
    addCondition(newCondition);
    setNewCondition('');
  };

  const handleAddAllergy = () => {
    addAllergy(newAllergy);
    setNewAllergy({ name: '', severity: '' });
  };

  const handleAddMedication = () => {
    addMedication(newMedication);
    setNewMedication({ name: '', dosage: '', frequency: '', notes: '' });
  };

  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.background }]}>
      <Text style={[styles.header, { color: theme.text }]}>Health Profile</Text>
      <Button
        title="Settings"
        onPress={() => router.push('/settings')}
        accessibilityHint="Opens the settings screen"
      />
      {healthProfile && (
        <View>
          <FormField
            placeholder="Dietary Preferences"
            value={String(healthProfile.dietaryPreferences ?? '')}
            onChangeText={(text) => setHealthProfile({ ...healthProfile, dietaryPreferences: text })}
          />
          <FormField
            placeholder="Health Goals"
            value={String(healthProfile.healthGoals ?? '')}
            onChangeText={(text) => setHealthProfile({ ...healthProfile, healthGoals: text })}
          />
          <Button
            title="Save Profile"
            onPress={() =>
              updateHealthProfile({
                dietaryPreferences: healthProfile.dietaryPreferences,
                healthGoals: healthProfile.healthGoals,
              })
            }
            accessibilityHint="Saves your health profile changes"
          />
        </View>
      )}

      <Text style={[styles.header, { color: theme.text }]}>Health Conditions</Text>
      <FormField placeholder="New Condition" value={newCondition} onChangeText={setNewCondition} />
      <Button title="Add Condition" onPress={handleAddCondition} accessibilityHint="Adds a new health condition" />
      {conditions.map(condition => (
        <ListItem key={condition.id} item={condition} onEdit={() => { /* Handle edit */ }} onDelete={() => deleteCondition(condition.id)} />
      ))}

      <Text style={[styles.header, { color: theme.text }]}>Allergies</Text>
      <FormField placeholder="Allergy Name" value={newAllergy.name} onChangeText={(text) => setNewAllergy({ ...newAllergy, name: text })} />
      <FormField placeholder="Severity" value={newAllergy.severity} onChangeText={(text) => setNewAllergy({ ...newAllergy, severity: text })} />
      <Button title="Add Allergy" onPress={handleAddAllergy} accessibilityHint="Adds a new allergy" />
      {allergies.map(allergy => (
        <ListItem key={allergy.id} item={allergy} onEdit={() => { /* Handle edit */ }} onDelete={() => deleteAllergy(allergy.id)} />
      ))}

      <Text style={[styles.header, { color: theme.text }]}>Medications</Text>
      <FormField placeholder="Medication Name" value={newMedication.name} onChangeText={(text) => setNewMedication({ ...newMedication, name: text })} />
      <FormField placeholder="Dosage" value={newMedication.dosage} onChangeText={(text) => setNewMedication({ ...newMedication, dosage: text })} />
      <FormField placeholder="Frequency" value={newMedication.frequency} onChangeText={(text) => setNewMedication({ ...newMedication, frequency: text })} />
      <FormField placeholder="Dietary Interactions" value={newMedication.notes} onChangeText={(text) => setNewMedication({ ...newMedication, notes: text })} />
      <Button title="Add Medication" onPress={handleAddMedication} accessibilityHint="Adds a new medication" />
      {medications.map(medication => (
        <ListItem key={medication.id} item={medication} onEdit={() => { /* Handle edit */ }} onDelete={() => deleteMedication(medication.id)} />
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  header: {
    fontSize: 24,
    fontWeight: 'bold',
    marginTop: 16,
    marginBottom: 8,
  },
});
