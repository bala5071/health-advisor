import { useAuth } from '../../src/components/AuthProvider';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
  View, Text, TextInput, Alert, Platform,
  ScrollView, StyleSheet, Pressable, KeyboardAvoidingView, useWindowDimensions
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const Login = () => {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const isCompact = height < 740;
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const { signIn, signInWithGoogle, signInWithApple } = useAuth();

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert('Missing fields', 'Please enter your email and password.');
      return;
    }
    try {
      setLoading(true);
      const { error } = await signIn({ email: email.trim(), password });
      if (error) Alert.alert('Sign in failed', error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = async () => {
    const { error } = await signInWithGoogle();
    if (error) Alert.alert('Error', error.message);
  };

  const handleApple = async () => {
    const { error } = await signInWithApple();
    if (error) Alert.alert('Error', error.message);
  };

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          isCompact ? styles.scrollCompact : null,
          { paddingTop: insets.top + (isCompact ? 20 : 40), paddingBottom: insets.bottom + (isCompact ? 20 : 32) },
        ]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={[styles.logoWrap, isCompact ? styles.logoWrapCompact : null]}>
          <View style={styles.logoCircle}>
            <Ionicons name="heart" size={36} color="#FFFFFF" />
          </View>
          <Text style={styles.appName}>Health Advisor</Text>
          <Text style={styles.appTagline}>Your personal AI health companion</Text>
        </View>

        <View style={[styles.form, isCompact ? styles.formCompact : null]}>
          <Text style={styles.formTitle}>Welcome back</Text>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Email</Text>
            <View style={styles.inputWrap}>
              <Ionicons name="mail-outline" size={18} color="#8E8E93" style={styles.inputIcon} />
              <TextInput
                placeholder="you@example.com"
                placeholderTextColor="#C7C7CC"
                value={email}
                onChangeText={setEmail}
                style={styles.input}
                autoCapitalize="none"
                autoComplete="email"
                keyboardType="email-address"
                accessibilityLabel="Email"
              />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Password</Text>
            <View style={styles.inputWrap}>
              <Ionicons name="lock-closed-outline" size={18} color="#8E8E93" style={styles.inputIcon} />
              <TextInput
                placeholder="Your password"
                placeholderTextColor="#C7C7CC"
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                style={[styles.input, styles.inputWithToggle]}
                accessibilityLabel="Password"
              />
              <Pressable onPress={() => setShowPassword((v) => !v)} style={styles.inputToggle}>
                <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={18} color="#8E8E93" />
              </Pressable>
            </View>
          </View>

          <Pressable onPress={() => router.push('/(auth)/forgot-password')} style={styles.forgotWrap}>
            <Text style={styles.forgotText}>Forgot password?</Text>
          </Pressable>

          <Pressable
            style={[styles.primaryButton, loading ? styles.primaryButtonDisabled : null]}
            onPress={handleLogin}
            disabled={loading}
          >
            <Text style={styles.primaryButtonText}>{loading ? 'Signing in…' : 'Sign In'}</Text>
          </Pressable>
        </View>

        <View style={styles.divider}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>or continue with</Text>
          <View style={styles.dividerLine} />
        </View>

        <View style={[styles.socialWrap, isCompact ? styles.socialWrapCompact : null]}>
          <Pressable style={styles.socialButton} onPress={handleGoogle}>
            <Ionicons name="logo-google" size={20} color="#4285F4" />
            <Text style={styles.socialButtonText}>Google</Text>
          </Pressable>
          {Platform.OS === 'ios' ? (
            <Pressable style={styles.socialButton} onPress={handleApple}>
              <Ionicons name="logo-apple" size={20} color="#1C1C1E" />
              <Text style={styles.socialButtonText}>Apple</Text>
            </Pressable>
          ) : null}
        </View>

        <View style={styles.switchRow}>
          <Text style={styles.switchText}>Don't have an account? </Text>
          <Pressable onPress={() => router.push('/(auth)/signup')}>
            <Text style={styles.switchLink}>Sign up</Text>
          </Pressable>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

export default Login;

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F2F2F7' },
  scroll: { paddingHorizontal: 24 },
  scrollCompact: { paddingHorizontal: 18 },
  logoWrap: { alignItems: 'center', marginBottom: 36 },
  logoWrapCompact: { marginBottom: 22 },
  logoCircle: {
    width: 80,
    height: 80,
    borderRadius: 22,
    backgroundColor: '#34C759',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#34C759',
    shadowOpacity: 0.35,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
    marginBottom: 14,
  },
  formCompact: { padding: 16, marginBottom: 14 },
  appName: { fontSize: 24, fontWeight: '700', color: '#1C1C1E', marginBottom: 4 },
  appTagline: { fontSize: 14, color: '#8E8E93', fontWeight: '400' },
  form: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  formTitle: { fontSize: 22, fontWeight: '700', color: '#1C1C1E', marginBottom: 20 },
  inputGroup: { marginBottom: 14 },
  inputLabel: { fontSize: 13, fontWeight: '600', color: '#6D6D72', marginBottom: 6 },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F2F2F7',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E5EA',
    height: 50,
  },
  inputIcon: { marginLeft: 14, marginRight: 4 },
  input: { flex: 1, fontSize: 16, color: '#1C1C1E', paddingHorizontal: 10, height: '100%' },
  inputWithToggle: { paddingRight: 0 },
  inputToggle: { paddingHorizontal: 14, height: '100%', alignItems: 'center', justifyContent: 'center' },
  forgotWrap: { alignSelf: 'flex-end', marginBottom: 20, marginTop: -4 },
  forgotText: { fontSize: 14, color: '#007AFF', fontWeight: '500' },
  primaryButton: {
    height: 52,
    borderRadius: 14,
    backgroundColor: '#34C759',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#34C759',
    shadowOpacity: 0.35,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  primaryButtonDisabled: { opacity: 0.6 },
  primaryButtonText: { fontSize: 17, fontWeight: '700', color: '#FFFFFF' },
  divider: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  dividerLine: { flex: 1, height: 1, backgroundColor: '#E5E5EA' },
  dividerText: { fontSize: 13, color: '#8E8E93', marginHorizontal: 12, fontWeight: '400' },
  socialWrap: { flexDirection: 'row', gap: 12, marginBottom: 28 },
  socialWrapCompact: { marginBottom: 18 },
  socialButton: {
    flex: 1,
    height: 50,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 1.5,
    borderColor: '#E5E5EA',
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  socialButtonText: { fontSize: 15, fontWeight: '600', color: '#1C1C1E' },
  switchRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center' },
  switchText: { fontSize: 15, color: '#8E8E93' },
  switchLink: { fontSize: 15, color: '#34C759', fontWeight: '700' },
});
