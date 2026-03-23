import { View, Text, TextInput, Button } from 'react-native';
import { useRouter } from 'expo-router';
import { useState } from 'react';

const HealthProfile = () => {
  const router = useRouter();
  const [age, setAge] = useState('');
  const [sex, setSex] = useState('');
  const [weight, setWeight] = useState('');
  const [height, setHeight] = useState('');

  return (
    <View style={{ flex: 1, justifyContent: 'center', padding: 20 }}>
      <Text style={{ fontSize: 24, marginBottom: 20 }}>Tell us about yourself</Text>
      <TextInput placeholder="Age" value={age} onChangeText={setAge} keyboardType="numeric" style={{ borderWidth: 1, padding: 10, marginBottom: 10 }} />
      <TextInput placeholder="Sex" value={sex} onChangeText={setSex} style={{ borderWidth: 1, padding: 10, marginBottom: 10 }} />
      <TextInput placeholder="Weight (kg)" value={weight} onChangeText={setWeight} keyboardType="numeric" style={{ borderWidth: 1, padding: 10, marginBottom: 10 }} />
      <TextInput placeholder="Height (cm)" value={height} onChangeText={setHeight} keyboardType="numeric" style={{ borderWidth: 1, padding: 10, marginBottom: 20 }} />
      <Button title="Continue" onPress={() => router.push('/onboarding/permissions')} />
    </View>
  );
};

export default HealthProfile;
