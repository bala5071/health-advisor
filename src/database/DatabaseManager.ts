import 'reflect-metadata';
import '../utils/watermelonPolyfill';
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

const isJestRuntime = (): boolean => typeof process !== 'undefined' && process.env?.JEST_WORKER_ID != null;

const createDatabase = (): Database => {
  const onSetUpError = (error: unknown) => {
    console.error('Database setup error:', error);
  };

  const adapter = isJestRuntime()
    ? (() => {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const LokiJSAdapter = require('@nozbe/watermelondb/adapters/lokijs').default;
        return new LokiJSAdapter({
          schema,
          dbName: 'health-advisor-test-db',
          useWebWorker: false,
          useIncrementalIndexedDB: false,
          onSetUpError,
        });
      })()
    : new SQLiteAdapter({
        schema,
        migrations,
        jsi: false,
        onSetUpError,
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
