import { useAuth } from "../../src/components/AuthProvider";
import { Stack, useRouter } from "expo-router";
import React, { useState } from "react";
import { View, Text, TextInput, Alert, Platform } from "react-native";
import { useTheme } from "../../src/theme/useTheme";
import Button from "../../src/components/common/Button";

const Login = () => {
  const router = useRouter();
  const theme = useTheme();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const { signIn, signInWithGoogle, signInWithApple } = useAuth();

  const handleLogin = async () => {
    const { error } = await signIn({ email, password });
    if (error) {
      Alert.alert("Error", error.message);
    }
  };

  const handleGoogle = async () => {
    const { error } = await signInWithGoogle();
    if (error) Alert.alert("Error", error.message);
  };

  const handleApple = async () => {
    const { error } = await signInWithApple();
    if (error) Alert.alert("Error", error.message);
  };

  return (
    <View style={{ flex: 1, justifyContent: "center", padding: 16, backgroundColor: theme.background }}>
      <Stack.Screen options={{ title: "Login" }} />
      <Text style={{ fontSize: 24, marginBottom: 16, color: theme.text }} accessibilityRole="header">
        Login
      </Text>
      <TextInput
        placeholder="Email"
        placeholderTextColor={theme.secondary}
        value={email}
        onChangeText={setEmail}
        style={{ borderWidth: 1, borderColor: theme.secondary, color: theme.text, padding: 8, marginBottom: 8, borderRadius: 4 }}
        autoCapitalize="none"
        autoComplete="email"
        keyboardType="email-address"
        accessibilityLabel="Email"
      />
      <TextInput
        placeholder="Password"
        placeholderTextColor={theme.secondary}
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        style={{ borderWidth: 1, borderColor: theme.secondary, color: theme.text, padding: 8, marginBottom: 16, borderRadius: 4 }}
        accessibilityLabel="Password"
      />
      <Button title="Login" onPress={handleLogin} accessibilityHint="Signs you into your account" />
      <View style={{ marginTop: 16 }}>
        <Button title="Sign in with Google" onPress={handleGoogle} accessibilityHint="Signs in using Google" variant="secondary" />
      </View>
      <View style={{ marginTop: 8 }}>
        <Button
          title={Platform.OS === "ios" ? "Sign in with Apple" : "Sign in with Apple (iOS only)"}
          onPress={handleApple}
          disabled={Platform.OS !== "ios"}
          accessibilityHint="Signs in using Apple"
          variant="secondary"
        />
      </View>
      <View style={{ marginTop: 16 }}>
        <Button title="Create an account" onPress={() => router.push("/(auth)/signup")} accessibilityHint="Opens the sign up screen" />
      </View>
      <View style={{ marginTop: 8 }}>
        <Button
          title="Forgot password?"
          onPress={() => router.push("/(auth)/forgot-password")}
          accessibilityHint="Opens password reset"
          variant="secondary"
        />
      </View>
    </View>
  );
};

export default Login;
