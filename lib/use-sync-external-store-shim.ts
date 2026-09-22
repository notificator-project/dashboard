import { useSyncExternalStore } from 'react';

// The package shim is CommonJS, while Base UI's ESM entrypoints import its
// hook as a named export. React 19 already provides the native implementation,
// so expose it through a small ESM-compatible bridge for Vite/RSC.
export { useSyncExternalStore };
