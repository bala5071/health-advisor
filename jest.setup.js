import 'reflect-metadata';

jest.mock('react-native-sqlite-storage');

jest.mock('expo-file-system', () => ({
  documentDirectory: 'file://test-docs/',
  makeDirectoryAsync: jest.fn(async () => undefined),
  writeAsStringAsync: jest.fn(async () => undefined),
  readAsStringAsync: jest.fn(async () => '{}'),
  getInfoAsync: jest.fn(async () => ({ exists: false, size: 0 })),
  deleteAsync: jest.fn(async () => undefined),
  EncodingType: { UTF8: 'utf8' },
  createDownloadResumable: jest.fn(() => ({
    downloadAsync: jest.fn(async () => ({ uri: 'file://downloaded' })),
    resumeAsync: jest.fn(async () => ({ uri: 'file://downloaded' })),
    savable: jest.fn(async () => ({ resumeData: null })),
  })),
}));

jest.mock('expo-file-system/legacy', () => ({
  documentDirectory: 'file://test-docs/',
  makeDirectoryAsync: jest.fn(async () => undefined),
  writeAsStringAsync: jest.fn(async () => undefined),
  readAsStringAsync: jest.fn(async () => '{}'),
  getInfoAsync: jest.fn(async () => ({ exists: false, size: 0 })),
  deleteAsync: jest.fn(async () => undefined),
  EncodingType: { UTF8: 'utf8' },
  createDownloadResumable: jest.fn(() => ({
    downloadAsync: jest.fn(async () => ({ uri: 'file://downloaded' })),
    resumeAsync: jest.fn(async () => ({ uri: 'file://downloaded' })),
    savable: jest.fn(async () => ({ resumeData: null })),
  })),
}));

const mockSecureStoreMemory = new Map();

jest.mock('expo-secure-store', () => ({
  setItemAsync: jest.fn(async (key, value) => {
    mockSecureStoreMemory.set(String(key), String(value));
  }),
  getItemAsync: jest.fn(async (key) => mockSecureStoreMemory.get(String(key)) ?? null),
  deleteItemAsync: jest.fn(async (key) => {
    mockSecureStoreMemory.delete(String(key));
  }),
}));

jest.mock('expo-linking', () => ({
  createURL: jest.fn(() => 'health-advisor://oauth-callback'),
  useURL: jest.fn(() => null),
  parse: jest.fn(() => ({ queryParams: {} })),
  getInitialURL: jest.fn(async () => null),
}));

jest.mock('expo-web-browser', () => ({
  maybeCompleteAuthSession: jest.fn(() => undefined),
  openAuthSessionAsync: jest.fn(async () => ({ type: 'success' })),
}));
