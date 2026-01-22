// Inject Script
// Block EduPage tracking functionality
import { createLogger, toast } from './internal';

(function () {
  const logger = createLogger('inject');

  // Show initial load message - longer duration for visibility
  toast.success('EduPage Cloak loaded', 4000);

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
          // Don't spam toasts for each blocked event - just log
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

    logger.info('Visibility spoofing active');
    toast.info('Visibility spoofing active', 3000);
  };

  // --- 4. JSON.stringify Interceptor for answerLog ---
  const patchJSONStringify = () => {
    const originalStringify = JSON.stringify;

    JSON.stringify = function (value: any, ...args: any[]) {
      // Check if this looks like answerLogByWidget structure
      // It's an object with event keys or cardid#index keys
      if (value && typeof value === 'object') {
        const keys = Object.keys(value);

        // Check if it has 'events' key or keys matching pattern "cardid#index"
        const hasEvents = keys.includes('events');
        const hasCardPattern = keys.some((k) => k.includes('#'));

        if (hasEvents || hasCardPattern) {
          logger.info(
            'JSON.stringify intercepted - answerLogByWidget detected'
          );

          try {
            let eventTypes: string[] = [];
            let eventCount = 0;
            let answerCount = 0;

            // Log events if present
            if (value.events && Array.isArray(value.events)) {
              eventCount = value.events.length;
              // Extract unique event types
              const types = value.events.map((e: any) => e.type as string);
              eventTypes = [...new Set(types)].filter(
                (t): t is string => typeof t === 'string'
              );

              logger.info(
                `Events: ${eventCount} (types: ${eventTypes.join(', ')})`
              );
            }

            // Count answer entries
            const answerKeys = keys.filter((k) => k.includes('#'));
            answerCount = answerKeys.length;

            if (answerCount > 0) {
              logger.info(`Answer entries: ${answerCount}`);
            }

            // Log the full JSON (can be large!)
            const fullJson = originalStringify.call(this, value, ...args);
            logger.info(`Answer entries: ${answerCount}`);
            logger.info(
              `Full answerLog JSON: ${fullJson.substring(0, 500)}...`
            );

            // Filter out boring event types
            const boringTypes = ['PLAYER_INITED', 'ANSWER'];
            const interestingTypes = eventTypes.filter(
              (t) => !boringTypes.includes(t)
            );

            // Only show toast if there are interesting events (ignore routine answers)
            if (interestingTypes.length > 0) {
              const mainTypes = interestingTypes.slice(0, 3).join(', ');
              const interestingCount = value.events.filter(
                (e: any) => !boringTypes.includes(e.type)
              ).length;

              toast.warn(
                `Tracking detected: ${interestingCount} events (${mainTypes})`,
                5000
              );
            }
          } catch (e) {
            logger.error(`Error processing answerLogByWidget: ${e}`);
            toast.error('Error processing tracking data', 0);
          }
        }
      }

      // Call original stringify
      return originalStringify.call(this, value, ...args);
    };

    logger.info('JSON.stringify patched for answerLog');
    toast.info('JSON interceptor ready', 3000);
  };

  // --- 5. Fetch/XHR Interceptor Rules ---
  // Register rules with the synchronously-injected interceptor from content.ts
  // Expose materialObj globally to allow inspection/modification
  const setupInterceptorRules = () => {
    window.__interceptorRules = window.__interceptorRules || [];
    window.__interceptorRules.push({
      pattern: /elearning\/pics\/js\/etest\/etestPlayer\.js/,
      modifier: (content) => {
        logger.info('Patching etestPlayer.js: Exposing materialObj');
        toast.success('Test player intercepted', 4000);
        return content.replace(
          'var materialObj = null;',
          'window.materialObj = null;'
        );
      },
    });
    logger.info('Registered interceptor for etestPlayer.js');
    toast.info('Network interceptor ready', 3000);
  };

  // --- 6. jQuery Watcher ---
  const watchForJQuery = () => {
    const jqInterval = setInterval(() => {
      if (window.jQuery?.fn?.on) {
        patchJQuery(window.jQuery);
        clearInterval(jqInterval);
        logger.info('jQuery patched - tracking events blocked');
        toast.success('Event tracking blocked', 4000);
      }
    }, 100);

    // Timeout after 10 seconds
    setTimeout(() => {
      clearInterval(jqInterval);
      if (!window.jQuery?.fn?.on) {
        logger.warn('jQuery not detected after 10s');
        toast.error('jQuery not found - some blocking may not work', 0);
      }
    }, 10000);
  };

  // --- Execute all patches ---
  logger.info('Starting injection sequence...');

  // Step 1: Visibility spoofing (immediate)
  stayActive();

  // Step 2: JSON interceptor (immediate)
  patchJSONStringify();

  // Step 3: Network interceptor rules (immediate)
  setupInterceptorRules();

  // Step 4: jQuery watcher (async, polls until found)
  watchForJQuery();

  logger.info('Injection sequence complete');
})();
