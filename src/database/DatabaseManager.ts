import 'reflect-metadata';
import { NativeModules } from 'react-native';
import { Database } from '@nozbe/watermelondb';
import SQLiteAdapter from '@nozbe/watermelondb/adapters/sqlite';
import schema from './schema';
import migrations from './migrations';
import { HealthProfile, Scan, Report, Allergy, Medication, Condition, USDAFood } from './models';

const WATERMELONDB_UNAVAILABLE_ERROR =
  'NativeModules.DatabaseBridge is not defined. WatermelonDB native module is unavailable in this runtime (e.g., Expo Go).';

const isWatermelonDbAvailable = (): boolean => {
  try {
    const { Database } = require('@nozbe/watermelondb');
    return Boolean(Database);
  } catch {
    return false;
  }
};

const createDatabase = (): Database => {
  const adapter = new SQLiteAdapter({
    schema,
    migrations,
    jsi: true, // JSI is required for synchronous connections
    onSetUpError: (error) => {
      // Handle database setup errors
      console.error('Database setup error:', error);
    },
  });

  return new Database({
    adapter,
    modelClasses: [
      HealthProfile,
      Scan,
      Report,
      Allergy,
      Medication,
      Condition,
      USDAFood,
    ],
  });
};

const database: Database = isWatermelonDbAvailable()
  ? createDatabase()
  : (new Proxy(
      {},
      {
        get() {
          throw new Error(WATERMELONDB_UNAVAILABLE_ERROR);
        },
      },
    ) as any);

export default database;
