import { appSchema, tableSchema } from '@nozbe/watermelondb';

export default appSchema({
  version: 2,
  tables: [
    tableSchema({
      name: 'health_profiles',
      columns: [
        { name: 'user_id', type: 'string', isIndexed: true },
        { name: 'date_of_birth', type: 'number', isOptional: true },
        { name: 'gender', type: 'string', isOptional: true },
        { name: 'blood_type', type: 'string', isOptional: true },
        { name: 'height', type: 'number', isOptional: true },
        { name: 'weight', type: 'number', isOptional: true },
        { name: 'dietary_preferences', type: 'string', isOptional: true },
        { name: 'health_goals', type: 'string', isOptional: true },
        { name: 'created_at', type: 'number' },
        { name: 'updated_at', type: 'number' },
      ],
    }),
    tableSchema({
      name: 'scans',
      columns: [
        { name: 'user_id', type: 'string', isIndexed: true },
        { name: 'type', type: 'string' },
        { name: 'data', type: 'string' }, // JSON string
        { name: 'created_at', type: 'number' },
      ],
    }),
    tableSchema({
      name: 'reports',
      columns: [
        { name: 'user_id', type: 'string', isIndexed: true },
        { name: 'scan_id', type: 'string', isIndexed: true },
        { name: 'summary', type: 'string' },
        { name: 'recommendations', type: 'string' }, // JSON string
        { name: 'created_at', type: 'number' },
      ],
    }),
    tableSchema({
      name: 'allergies',
      columns: [
        { name: 'health_profile_id', type: 'string', isIndexed: true },
        { name: 'name', type: 'string' },
        { name: 'severity', type: 'string', isOptional: true },
        { name: 'notes', type: 'string', isOptional: true },
      ],
    }),
    tableSchema({
      name: 'medications',
      columns: [
        { name: 'health_profile_id', type: 'string', isIndexed: true },
        { name: 'name', type: 'string' },
        { name: 'dosage', type: 'string', isOptional: true },
        { name: 'frequency', type: 'string', isOptional: true },
        { name: 'notes', type: 'string', isOptional: true },
      ],
    }),
    tableSchema({
      name: 'conditions',
      columns: [
        { name: 'health_profile_id', type: 'string', isIndexed: true },
        { name: 'name', type: 'string' },
        { name: 'notes', type: 'string', isOptional: true },
      ],
    }),
  ],
});
