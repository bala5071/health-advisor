import { supabase } from "../../src/supabase/client";
import { Stack } from "expo-router";
import React, { useState } from "react";
import { View, Text, TextInput, Button, Alert } from "react-native";

const ForgotPassword = () => {
  const [email, setEmail] = useState("");

  const handleResetPassword = async () => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: "exp://127.0.0.1:8081/--/auth/reset-password",
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
    <View style={{ flex: 1, justifyContent: "center", padding: 16 }}>
      <Stack.Screen options={{ title: "Forgot Password" }} />
      <Text style={{ fontSize: 24, marginBottom: 16 }}>Forgot Password</Text>
      <TextInput
        placeholder="Email"
        value={email}
        onChangeText={setEmail}
        style={{ borderWidth: 1, padding: 8, marginBottom: 16 }}
        autoCapitalize="none"
      />
      <Button title="Reset Password" onPress={handleResetPassword} />
    </View>
  );
};

export default ForgotPassword;
