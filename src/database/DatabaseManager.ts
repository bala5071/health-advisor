import 'reflect-metadata';
import { Database } from '@nozbe/watermelondb';
import SQLiteAdapter from '@nozbe/watermelondb/adapters/sqlite';
import schema from './schema';
import migrations from './migrations';
import { HealthProfile, Scan, Report, Allergy, Medication, Condition } from './models';

const adapter = new SQLiteAdapter({
  schema,
  migrations,
  jsi: true, // JSI is required for synchronous connections
  onSetUpError: (error) => {
    // Handle database setup errors
    console.error("Database setup error:", error);
  },
});

const database = new Database({
  adapter,
  modelClasses: [
    HealthProfile,
    Scan,
    Report,
    Allergy,
    Medication,
    Condition,
  ],
});

export default database;
