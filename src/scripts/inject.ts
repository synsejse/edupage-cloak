// Inject Script
// Block EduPage tracking functionality
import { createLogger } from './logger';

(function () {
  const logger = createLogger('inject');

  // --- 1. Blocked Tracking Events ---
  const BLOCKED_EVENTS = [
    // Fullscreen tracking
    'webkitfullscreenchange.etestaplayer',
    'mozfullscreenchange.etestaplayer',
    'fullscreenchange.etestaplayer',

    // Navigation tracking
    'beforeunload.etestplayer',
    'remove.etestplayer',

    // Scroll tracking
    'scroll.etestplayer',

    // Visibility/focus tracking
    'visibilitychange.etestplayeral',
    'blur.etestplayeral',
    'focus.etestplayeral',
    'enterBackgroundHandler.etestplayeral',
    'enterForegroundHandler.etestplayeral',

    // Clipboard tracking
    'copy.etestplayeral',
    'paste.etestplayeral',
    'cut.etestplayeral',

    // Keyboard tracking
    'keydown.etestplayeral',
  ];

  // --- 2. jQuery Event Blocker ---
  const patchJQuery = ($: any) => {
    const _on = $.fn.on;
    $.fn.on = function (events: string, ...args: any[]) {
      if (typeof events === 'string') {
        const eventList = events.split(/\s+/);
        const hasBlockedEvent = eventList.some((event) =>
          BLOCKED_EVENTS.includes(event)
        );

        if (hasBlockedEvent) {
          logger.info(`Blocked tracking event: ${events}`);
          return this;
        }
      }
      return _on.apply(this, [events, ...args]);
    };
  };

  // --- 3. Visibility & Focus Spoofing ---
  const stayActive = () => {
    Object.defineProperties(document, {
      hidden: {
        get: () => {
          logger.info('document.hidden accessed - returning false (visible)');
          return false;
        },
        configurable: true,
      },
      visibilityState: {
        get: () => {
          logger.info(
            'document.visibilityState accessed - returning "visible"'
          );
          return 'visible';
        },
        configurable: true,
      },
    });

    const originalHasFocus = document.hasFocus;
    document.hasFocus = () => {
      logger.info('document.hasFocus() called - returning true');
      return true;
    };
  };

  // --- Execution ---
  stayActive();

  const jqInterval = setInterval(() => {
    if (window.jQuery?.fn?.on) {
      patchJQuery(window.jQuery);
      clearInterval(jqInterval);
      logger.info('Tracking suppressed.');
    }
  }, 100);
  setTimeout(() => clearInterval(jqInterval), 10000);
})();
