import { supabase } from "../../src/supabase/client";
import { Stack, useRouter } from "expo-router";
import React, { useState } from "react";
import { View, Text, TextInput, Alert, ScrollView, StyleSheet } from "react-native";
import { useTheme } from "../../src/theme/useTheme";
import Button from "../../src/components/common/Button";
import Card from "../../src/components/common/Card";

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
    <ScrollView
      style={[styles.root, { backgroundColor: theme.background }]}
      contentContainerStyle={styles.container}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
    >
      <Stack.Screen options={{ title: "Forgot Password" }} />
      <Text style={[styles.title, theme.typography.display, { color: theme.text }]} accessibilityRole="header">
        Forgot Password
      </Text>
      <Card>
        <TextInput
          placeholder="Email"
          placeholderTextColor={theme.secondary}
          value={email}
          onChangeText={setEmail}
          style={[styles.input, { borderColor: theme.border, color: theme.text, backgroundColor: theme.surface }]}
          autoCapitalize="none"
          autoComplete="email"
          keyboardType="email-address"
          accessibilityLabel="Email"
        />
        <Button title="Reset Password" onPress={handleResetPassword} accessibilityHint="Sends a password reset email" />
      </Card>
      <View style={styles.buttonWrap}>
        <Button title="Back to Login" onPress={() => router.replace("/(auth)/login")} variant="secondary" accessibilityHint="Returns to login" />
      </View>
      <View style={styles.compactButtonWrap}>
        <Button title="Create an account" onPress={() => router.push("/(auth)/signup")} accessibilityHint="Opens the sign up screen" />
      </View>
    </ScrollView>
  );
};

export default ForgotPassword;

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  container: {
    padding: 16,
    gap: 8,
  },
  title: {
    paddingTop: 8,
    paddingBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    minHeight: 48,
    paddingHorizontal: 12,
    marginBottom: 10,
    fontSize: 17,
  },
  buttonWrap: {
    marginTop: 8,
  },
  compactButtonWrap: {
    marginTop: 2,
  },
});
