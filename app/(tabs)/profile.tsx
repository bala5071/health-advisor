import React, { useState } from 'react';
import { View, Text, Button, ScrollView, StyleSheet } from 'react-native';
import { useHealthProfile } from '../../src/hooks/useHealthProfile';
import ListItem from '../../src/components/ListItem';
import FormField from '../../src/components/FormField';

export default function ProfileScreen() {
  const {
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
    <ScrollView style={styles.container}>
      <Text style={styles.header}>Health Profile</Text>
      {healthProfile && (
        <View>
          <FormField
            placeholder="Dietary Preferences"
            value={healthProfile.dietaryPreferences}
            onChangeText={(text) => setHealthProfile({ ...healthProfile, dietaryPreferences: text })}
          />
          <FormField
            placeholder="Health Goals"
            value={healthProfile.healthGoals}
            onChangeText={(text) => setHealthProfile({ ...healthProfile, healthGoals: text })}
          />
          <Button title="Save Profile" onPress={() => updateHealthProfile(healthProfile._raw)} />
        </View>
      )}

      <Text style={styles.header}>Health Conditions</Text>
      <FormField placeholder="New Condition" value={newCondition} onChangeText={setNewCondition} />
      <Button title="Add Condition" onPress={handleAddCondition} />
      {conditions.map(condition => (
        <ListItem key={condition.id} item={condition} onEdit={() => { /* Handle edit */ }} onDelete={() => deleteCondition(condition.id)} />
      ))}

      <Text style={styles.header}>Allergies</Text>
      <FormField placeholder="Allergy Name" value={newAllergy.name} onChangeText={(text) => setNewAllergy({ ...newAllergy, name: text })} />
      <FormField placeholder="Severity" value={newAllergy.severity} onChangeText={(text) => setNewAllergy({ ...newAllergy, severity: text })} />
      <Button title="Add Allergy" onPress={handleAddAllergy} />
      {allergies.map(allergy => (
        <ListItem key={allergy.id} item={allergy} onEdit={() => { /* Handle edit */ }} onDelete={() => deleteAllergy(allergy.id)} />
      ))}

      <Text style={styles.header}>Medications</Text>
      <FormField placeholder="Medication Name" value={newMedication.name} onChangeText={(text) => setNewMedication({ ...newMedication, name: text })} />
      <FormField placeholder="Dosage" value={newMedication.dosage} onChangeText={(text) => setNewMedication({ ...newMedication, dosage: text })} />
      <FormField placeholder="Frequency" value={newMedication.frequency} onChangeText={(text) => setNewMedication({ ...newMedication, frequency: text })} />
      <FormField placeholder="Dietary Interactions" value={newMedication.notes} onChangeText={(text) => setNewMedication({ ...newMedication, notes: text })} />
      <Button title="Add Medication" onPress={handleAddMedication} />
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
