import { View, Text, Button } from 'react-native';
import { useRouter } from 'expo-router';

const Welcome = () => {
  const router = useRouter();

  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      <Text style={{ fontSize: 24, marginBottom: 20 }}>Welcome to Health Advisor</Text>
      <Text style={{ textAlign: 'center', marginHorizontal: 20, marginBottom: 40 }}>
        Your personal AI-powered health assistant. Scan products, get health insights, and stay on top of your wellness goals.
      </Text>
      <Button title="Get Started" onPress={() => router.push('/onboarding/health-profile')} />
    </View>
  );
};

export default Welcome;
