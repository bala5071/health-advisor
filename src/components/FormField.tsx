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
      allowFontScaling
      style={[styles.input, { borderColor: theme.border, color: theme.text, backgroundColor: theme.surface }]}
      placeholder={placeholder}
      placeholderTextColor={theme.textSecondary}
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
    minHeight: 44,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 8,
    borderRadius: 8,
    fontSize: 15,
    lineHeight: 23,
  },
});
