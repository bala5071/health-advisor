import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
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
      <View style={[styles.wrap, { backgroundColor: '#FFF5F5', borderColor: '#FF3B30' }]}>
        <View style={styles.headerRow}>
          <View style={styles.iconCircle}>
            <Ionicons name="warning" size={16} color="#FFFFFF" />
          </View>
          <Text style={[styles.title, { color: theme.danger }]}>Clinic Visit Recommended</Text>
        </View>
        <Text style={[styles.text, { color: theme.text }]}>{message}</Text>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  wrap: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    gap: 8,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  iconCircle: {
    width: 24,
    height: 24,
    borderRadius: 8,
    backgroundColor: '#FF3B30',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 17,
    fontWeight: '600',
  },
  text: {
    fontSize: 15,
    fontWeight: '400',
    lineHeight: 20,
  },
});
