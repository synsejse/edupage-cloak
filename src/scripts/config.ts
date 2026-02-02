// Centralized configuration for EduPage Cloak extension

export const CONFIG = {
  // Known etestPlayer.js version - update this when verifying compatibility
  KNOWN_ETEST_PLAYER_VERSION: '285016',

  // Extension version (should match manifest.json)
  EXTENSION_VERSION: '0.3.0',

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
  DEBUG_MODE: localStorage.getItem('edupage-cloak-debug') === 'true',

  // Storage keys
  STORAGE_KEYS: {
    DEBUG: 'edupage-cloak-debug',
    ANSWER_REVEALER_STATE: 'edupage-cloak-revealer-state',
  },

  // Global window keys (for singleton patterns)
  GLOBAL_KEYS: {
    LOGGER: '__edupage_cloak_logger__',
    TOAST: '__edupage_cloak_toast__',
  },
} as const;

// Type exports for better type inference
export type ToastDurationType = keyof typeof CONFIG.TOAST_DURATION;
