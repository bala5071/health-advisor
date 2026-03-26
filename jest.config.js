module.exports = {
  preset: 'react-native',
  setupFiles: ["./jest.globals.js"],
  transformIgnorePatterns: [
    "node_modules/(?!((jest-)?react-native|@react-native(-community)?)|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@unimodules/.*|unimodules|sentry-expo|native-base|react-native-svg)",
  ],
  setupFilesAfterEnv: ["./jest.setup.js"],
  testPathIgnorePatterns: [
    "/node_modules/",
    "<rootDir>/src/database/repositories/__tests__/",
  ],
};
