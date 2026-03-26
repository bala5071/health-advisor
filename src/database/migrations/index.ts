import { schemaMigrations, createTable, addColumns } from '@nozbe/watermelondb/Schema/migrations';

export default schemaMigrations({
  migrations: [
    {
      toVersion: 2,
      steps: [
        addColumns({
          table: 'health_profiles',
          columns: [
            { name: 'dietary_preferences', type: 'string', isOptional: true },
            { name: 'health_goals', type: 'string', isOptional: true },
          ],
        }),
      ],
    },
    {
      toVersion: 3,
      steps: [
        createTable({
          name: 'usda_foods',
          columns: [
            { name: 'fdc_id', type: 'number', isIndexed: true },
            { name: 'name', type: 'string' },
            { name: 'search_name', type: 'string', isIndexed: true },
            { name: 'nutrients_json', type: 'string' },
            { name: 'created_at', type: 'number' },
          ],
        }),
      ],
    },
  ],
});
