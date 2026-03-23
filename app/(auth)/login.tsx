import { useAuth } from "../../src/components/AuthProvider";
import { Stack } from "expo-router";
import React, { useState } from "react";
import { View, Text, TextInput, Button, Alert } from "react-native";

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const { signIn, signInWithGoogle, signInWithApple } = useAuth();

  const handleLogin = async () => {
    const { error } = await signIn({ email, password });
    if (error) {
      Alert.alert("Error", error.message);
    }
  };

  return (
    <View style={{ flex: 1, justifyContent: "center", padding: 16 }}>
      <Stack.Screen options={{ title: "Login" }} />
      <Text style={{ fontSize: 24, marginBottom: 16 }}>Login</Text>
      <TextInput
        placeholder="Email"
        value={email}
        onChangeText={setEmail}
        style={{ borderWidth: 1, padding: 8, marginBottom: 8 }}
        autoCapitalize="none"
      />
      <TextInput
        placeholder="Password"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        style={{ borderWidth: 1, padding: 8, marginBottom: 16 }}
      />
      <Button title="Login" onPress={handleLogin} />
      <View style={{ marginTop: 16 }}>
        <Button title="Sign in with Google" onPress={signInWithGoogle} />
      </View>
      <View style={{ marginTop: 8 }}>
        <Button title="Sign in with Apple" onPress={signInWithApple} />
      </View>
    </View>
  );
};

export default Login;
