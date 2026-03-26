import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../theme/useTheme';
import Button from './common/Button';

interface ListItemProps {
  item: any;
  onEdit: (item: any) => void;
  onDelete: (item: any) => void;
}

export default function ListItem({ item, onEdit, onDelete }: ListItemProps) {
  const theme = useTheme();
  return (
    <View style={[styles.container, { borderBottomColor: theme.secondary }]}>
      <Text style={{ color: theme.text }}>{item.name}</Text>
      <View style={styles.buttons}>
        <Button
          title="Edit"
          onPress={() => onEdit(item)}
          variant="secondary"
          accessibilityLabel={`Edit ${String(item?.name ?? 'item')}`}
          accessibilityHint="Opens edit controls"
        />
        <Button
          title="Delete"
          onPress={() => onDelete(item)}
          variant="danger"
          accessibilityLabel={`Delete ${String(item?.name ?? 'item')}`}
          accessibilityHint="Deletes this item"
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#ccc',
  },
  buttons: {
    flexDirection: 'row',
  },
});
