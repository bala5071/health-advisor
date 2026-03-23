import React from 'react';
import { View, Text, Button, StyleSheet } from 'react-native';

interface ListItemProps {
  item: any;
  onEdit: (item: any) => void;
  onDelete: (item: any) => void;
}

export default function ListItem({ item, onEdit, onDelete }: ListItemProps) {
  return (
    <View style={styles.container}>
      <Text>{item.name}</Text>
      <View style={styles.buttons}>
        <Button title="Edit" onPress={() => onEdit(item)} />
        <Button title="Delete" onPress={() => onDelete(item)} />
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
