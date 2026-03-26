// Jest pre-setup globals for jest-expo preset.
// This file must run before jest-expo's preset setup.

if (typeof globalThis.navigator === 'undefined' || globalThis.navigator == null) {
  globalThis.navigator = {};
}

if (typeof globalThis.window === 'undefined' || globalThis.window == null) {
  // Minimal window shim for libraries that assume window exists.
  globalThis.window = globalThis;
}

if (typeof globalThis.document === 'undefined' || globalThis.document == null) {
  globalThis.document = {};
}
