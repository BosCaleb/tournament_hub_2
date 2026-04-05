import '@testing-library/jest-dom';

// Mock crypto.subtle for PIN hashing tests (available in Node 20 but needs global)
if (typeof globalThis.crypto === 'undefined') {
  const { webcrypto } = await import('node:crypto');
  globalThis.crypto = webcrypto;
}

// Suppress console.error noise from intentional error boundary tests
const originalError = console.error;
beforeEach(() => {
  console.error = (...args) => {
    if (
      typeof args[0] === 'string' &&
      (args[0].includes('Warning:') || args[0].includes('act('))
    ) return;
    originalError(...args);
  };
});
afterEach(() => {
  console.error = originalError;
  localStorage.clear();
  sessionStorage.clear();
});
