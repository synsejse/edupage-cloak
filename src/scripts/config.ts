// Centralized configuration for EduPage Cloak extension

export const CONFIG = {
  // Known etestPlayer.js SHA-256 checksum - update this when verifying compatibility
  KNOWN_ETEST_PLAYER_CHECKSUM:
    '4b1b7466753b3a1a1f5cd1fd7f9ce5e0aff69858a6a3e6c7ff73cd6f674b6e88',

  // jQuery detection timeout (ms)
  JQUERY_WAIT_TIMEOUT: 10000,

  // jQuery poll interval (ms)
  JQUERY_POLL_INTERVAL: 100,

  // Toast default durations (ms)
  TOAST_DURATION: {
    INFO: 3000,
    WARN: 3000,
    ERROR: 5000,
    SUCCESS: 3000,
    DEBUG: 2000,
  },

  // Feature flags
  DEBUG_MODE:
    typeof localStorage !== 'undefined' &&
    localStorage.getItem('edupage-cloak-debug') === 'true',

  // Storage keys
  STORAGE_KEYS: {
    DEBUG: 'edupage-cloak-debug',
  },

  // Global window keys (for singleton patterns)
  GLOBAL_KEYS: {
    LOGGER: '__edupage_cloak_logger__',
    TOAST: '__edupage_cloak_toast__',
  },
} as const;

// Type exports for better type inference
export type ToastDurationType = keyof typeof CONFIG.TOAST_DURATION;
