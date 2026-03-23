import React from 'react';
import { View, TextInput, StyleSheet } from 'react-native';

interface FormFieldProps {
  placeholder: string;
  value: string;
  onChangeText: (text: string) => void;
}

export default function FormField({ placeholder, value, onChangeText }: FormFieldProps) {
  return (
    <TextInput
      style={styles.input}
      placeholder={placeholder}
      value={value}
      onChangeText={onChangeText}
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
