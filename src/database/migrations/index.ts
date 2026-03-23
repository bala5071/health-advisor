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
  ],
});
