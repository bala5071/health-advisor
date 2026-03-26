import { useAuth } from "../../src/components/AuthProvider";
import { Stack, useRouter } from "expo-router";
import React, { useState } from "react";
import { View, Text, TextInput, Alert } from "react-native";
import { useTheme } from "../../src/theme/useTheme";
import Button from "../../src/components/common/Button";

const SignUp = () => {
  const router = useRouter();
  const theme = useTheme();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const { signUp } = useAuth();

  const handleSignUp = async () => {
    const { error } = await signUp({ email, password });
    if (error) {
      Alert.alert("Error", error.message);
    } else {
      Alert.alert(
        "Success",
        "Please check your email for a verification link.",
      );
    }
  };

  return (
    <View style={{ flex: 1, justifyContent: "center", padding: 16, backgroundColor: theme.background }}>
      <Stack.Screen options={{ title: "Sign Up" }} />
      <Text style={{ fontSize: 24, marginBottom: 16, color: theme.text }} accessibilityRole="header">
        Sign Up
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
      <Button title="Sign Up" onPress={handleSignUp} accessibilityHint="Creates your account" />
      <View style={{ marginTop: 16 }}>
        <Button title="Back to Login" onPress={() => router.replace("/(auth)/login")} variant="secondary" accessibilityHint="Returns to login" />
      </View>
      <View style={{ marginTop: 8 }}>
        <Button
          title="Forgot password?"
          onPress={() => router.push("/(auth)/forgot-password")}
          variant="secondary"
          accessibilityHint="Opens password reset"
        />
      </View>
    </View>
  );
};

export default SignUp;
