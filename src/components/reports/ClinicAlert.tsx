import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Card from '../common/Card';
import { useTheme } from '../../theme/useTheme';

export default function ClinicAlert({
  message,
}: {
  message: string;
}) {
  const theme = useTheme();

  return (
    <Card>
      <View style={[styles.wrap, { backgroundColor: 'rgba(231, 76, 60, 0.12)', borderColor: theme.danger }]}>
        <Text style={[styles.title, { color: theme.danger }]}>Clinic Visit Recommended</Text>
        <Text style={[styles.text, { color: theme.text }]}>{message}</Text>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  wrap: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 14,
    gap: 8,
  },
  title: {
    fontSize: 14,
    fontWeight: '900',
  },
  text: {
    fontSize: 13,
    fontWeight: '700',
    opacity: 0.9,
  },
});
