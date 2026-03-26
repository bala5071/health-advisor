import { supabase } from "../../src/supabase/client";
import { Stack, useRouter } from "expo-router";
import React, { useState } from "react";
import { View, Text, TextInput, Alert } from "react-native";
import { useTheme } from "../../src/theme/useTheme";
import Button from "../../src/components/common/Button";

const ForgotPassword = () => {
  const router = useRouter();
  const theme = useTheme();
  const [email, setEmail] = useState("");

  const handleResetPassword = async () => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: "health-advisor://reset-password",
    });
    if (error) {
      Alert.alert("Error", error.message);
    } else {
      Alert.alert(
        "Success",
        "Please check your email for a password reset link.",
      );
    }
  };

  return (
    <View style={{ flex: 1, justifyContent: "center", padding: 16, backgroundColor: theme.background }}>
      <Stack.Screen options={{ title: "Forgot Password" }} />
      <Text style={{ fontSize: 24, marginBottom: 16, color: theme.text }} accessibilityRole="header">
        Forgot Password
      </Text>
      <TextInput
        placeholder="Email"
        placeholderTextColor={theme.secondary}
        value={email}
        onChangeText={setEmail}
        style={{ borderWidth: 1, borderColor: theme.secondary, color: theme.text, padding: 8, marginBottom: 16, borderRadius: 4 }}
        autoCapitalize="none"
        autoComplete="email"
        keyboardType="email-address"
        accessibilityLabel="Email"
      />
      <Button title="Reset Password" onPress={handleResetPassword} accessibilityHint="Sends a password reset email" />
      <View style={{ marginTop: 16 }}>
        <Button title="Back to Login" onPress={() => router.replace("/(auth)/login")} variant="secondary" accessibilityHint="Returns to login" />
      </View>
      <View style={{ marginTop: 8 }}>
        <Button title="Create an account" onPress={() => router.push("/(auth)/signup")} accessibilityHint="Opens the sign up screen" />
      </View>
    </View>
  );
};

export default ForgotPassword;
