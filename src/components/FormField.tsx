import React from 'react';
import { TextInput, StyleSheet } from 'react-native';
import { useTheme } from '../theme/useTheme';

interface FormFieldProps {
  placeholder: string;
  value: string;
  onChangeText: (text: string) => void;
  accessibilityLabel?: string;
}

export default function FormField({ placeholder, value, onChangeText, accessibilityLabel }: FormFieldProps) {
  const theme = useTheme();
  return (
    <TextInput
      style={[styles.input, { borderColor: theme.secondary, color: theme.text }]}
      placeholder={placeholder}
      placeholderTextColor={theme.secondary}
      value={value}
      onChangeText={onChangeText}
      accessibilityLabel={accessibilityLabel ?? placeholder}
    />
  );
}

const styles = StyleSheet.create({
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    padding: 8,
    marginBottom: 8,
    borderRadius: 4,
  },
});
