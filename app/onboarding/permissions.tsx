import { View, Text, Button, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { Camera } from 'expo-camera';
import { useOnboarding } from '@/src/hooks/useOnboarding';

const Permissions = () => {
  const router = useRouter();
  const { setOnboardingComplete } = useOnboarding();

  const requestPermissions = async () => {
    const { status: cameraStatus } = await Camera.requestCameraPermissionsAsync();
    const { status: microphoneStatus } = await Camera.requestMicrophonePermissionsAsync();

    if (cameraStatus !== 'granted' || microphoneStatus !== 'granted') {
      Alert.alert('Permissions required', 'Please grant camera and microphone permissions in your device settings.');
    } else {
      setOnboardingComplete();
      router.replace('/(auth)/login');
    }
  };

  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 }}>
      <Text style={{ fontSize: 24, marginBottom: 20 }}>Permissions</Text>
      <Text style={{ textAlign: 'center', marginBottom: 40 }}>
        To scan products and get the full experience, we need access to your camera and microphone.
      </Text>
      <Button title="Grant Permissions" onPress={requestPermissions} />
    </View>
  );
};

export default Permissions;
