// Inject Script - Block EduPage tracking functionality
import { createLogger, toast } from './internal';

(function () {
  const logger = createLogger('inject');

  toast.success('EduPage Cloak loaded', 4000);

  // Blocked tracking events
  const BLOCKED_EVENTS = new Set([
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
  ]);

  // Block tracking statistics
  const blockStats = {
    blocked: new Map<string, number>(),
    startTime: 0,
    duration: 15000, // 15 second monitoring window
    timeout: null as ReturnType<typeof setTimeout> | null,
  };

  function recordBlock(event: string): void {
    blockStats.blocked.set(event, (blockStats.blocked.get(event) || 0) + 1);
  }

  function isTracking(): boolean {
    return Date.now() - blockStats.startTime < blockStats.duration;
  }

  function generateBlockReport(): void {
    const uniqueEvents = blockStats.blocked.size;
    const totalBlocked = [...blockStats.blocked.values()].reduce(
      (a, b) => a + b,
      0
    );

    if (totalBlocked === 0) {
      logger.info('No tracking events detected during monitoring period');
      toast.info('No tracking events detected', 4000);
      return;
    }

    const events = [...blockStats.blocked.keys()].join(', ');
    logger.info(
      `Blocked ${totalBlocked} events (${uniqueEvents} unique): ${events}`
    );
    toast.success(`All tracking blocked: ${totalBlocked} events`, 5000);
  }

  function startBlockTracking(): void {
    blockStats.startTime = Date.now();
    blockStats.blocked.clear();
    blockStats.timeout = setTimeout(generateBlockReport, blockStats.duration);
    logger.info(
      `Block tracking started (${blockStats.duration / 1000}s window)`
    );
  }

  // jQuery event blocker
  function patchJQuery($: { fn: { on: Function } }): void {
    const originalOn = $.fn.on;

    $.fn.on = function (events: string, ...args: unknown[]) {
      if (typeof events === 'string') {
        const eventList = events.split(/\s+/);
        const blocked = eventList.filter((e) => BLOCKED_EVENTS.has(e));

        if (blocked.length > 0) {
          logger.info(`Blocked: ${blocked.join(', ')}`);
          if (isTracking()) {
            blocked.forEach(recordBlock);
          }
          return this;
        }
      }
      return originalOn.apply(this, [events, ...args]);
    };
  }

  // Visibility & focus spoofing
  function enableVisibilitySpoofing(): void {
    Object.defineProperties(document, {
      hidden: {
        get: () => false,
        configurable: true,
      },
      visibilityState: {
        get: () => 'visible',
        configurable: true,
      },
    });

    document.hasFocus = () => true;

    logger.info('Visibility spoofing active');
    toast.info('Visibility spoofing active', 3000);
  }

  // JSON.stringify interceptor for answerLog detection
  function patchJSONStringify(): void {
    const original = JSON.stringify;

    JSON.stringify = function (value: unknown, ...args: unknown[]) {
      if (value && typeof value === 'object') {
        const keys = Object.keys(value as object);
        const hasEvents = keys.includes('events');
        const hasCardPattern = keys.some((k) => k.includes('#'));

        if (hasEvents || hasCardPattern) {
          logger.info(
            'JSON.stringify intercepted - answerLogByWidget detected'
          );

          try {
            const obj = value as Record<string, unknown>;
            const events = obj.events as Array<{ type: string }> | undefined;

            if (Array.isArray(events)) {
              const types = [...new Set(events.map((e) => e.type))];
              const boringTypes = ['PLAYER_INITED', 'ANSWER'];
              const interesting = types.filter((t) => !boringTypes.includes(t));

              logger.info(
                `Events: ${events.length} (types: ${types.join(', ')})`
              );

              if (interesting.length > 0) {
                const count = events.filter(
                  (e) => !boringTypes.includes(e.type)
                ).length;
                toast.warn(
                  `Tracking detected: ${count} events (${interesting.slice(0, 3).join(', ')})`,
                  5000
                );
              }
            }

            const answerCount = keys.filter((k) => k.includes('#')).length;
            if (answerCount > 0) {
              logger.info(`Answer entries: ${answerCount}`);
            }
          } catch (e) {
            logger.error(`Error processing answerLogByWidget: ${e}`);
            toast.error('Error processing tracking data', 0);
          }
        }
      }

      return original.call(this, value, ...args);
    };

    logger.info('JSON.stringify patched');
    toast.info('JSON interceptor ready', 3000);
  }

  // Network interceptor rules
  function setupInterceptorRules(): void {
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
  }

  // jQuery watcher
  function watchForJQuery(): void {
    const interval = setInterval(() => {
      if (window.jQuery?.fn?.on) {
        clearInterval(interval);
        patchJQuery(window.jQuery);
        logger.info('jQuery patched - tracking events blocked');
        toast.success('Event tracking blocked', 4000);
        startBlockTracking();
      }
    }, 100);

    // Timeout after 10 seconds
    setTimeout(() => {
      clearInterval(interval);
      if (!window.jQuery?.fn?.on) {
        logger.warn('jQuery not detected after 10s');
        toast.error('jQuery not found - some blocking may not work', 0);
      }
    }, 10000);
  }

  // Execute all patches
  logger.info('Starting injection sequence...');

  enableVisibilitySpoofing();
  patchJSONStringify();
  setupInterceptorRules();
  watchForJQuery();

  logger.info('Injection sequence complete');
})();
