export const BLOCKED_EVENTS = [
  // Fullscreen
  'webkitfullscreenchange.etestaplayer',
  'mozfullscreenchange.etestaplayer',
  'fullscreenchange.etestaplayer',
  // Navigation
  'beforeunload.etestplayer',
  'remove.etestplayer',
  // Scroll
  'scroll.etestplayer',
  // Visibility/focus
  'visibilitychange.etestplayeral',
  'blur.etestplayeral',
  'focus.etestplayeral',
  'enterBackgroundHandler.etestplayeral',
  'enterForegroundHandler.etestplayeral',
  // Clipboard
  'copy.etestplayeral',
  'paste.etestplayeral',
  'cut.etestplayeral',
  // Keyboard
  'keydown.etestplayeral',
] as const;

export type BlockedEvent = (typeof BLOCKED_EVENTS)[number];
