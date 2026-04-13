// Inject Script - Block EduPage tracking functionality
import { sha256Hex } from './checksum';
import { createLogger, toast } from './internal';
import { BLOCKED_EVENTS } from './blocked-events';
import { CONFIG } from './config';

(function () {
  const logger = createLogger('inject');

  toast.success('EduPage Cloak loaded', 4000);

  const blockedEvents = new Set(BLOCKED_EVENTS);

  const TOTAL_TRACKABLE_EVENTS = blockedEvents.size;

  // Block tracking statistics
  const blockStats = {
    blockedEvents: new Set<string>(),
    totalBlocks: 0,
  };

  function reportBlock(events: string[]): void {
    let newEventsBlocked = false;

    for (const event of events) {
      blockStats.totalBlocks++;
      if (!blockStats.blockedEvents.has(event)) {
        blockStats.blockedEvents.add(event);
        newEventsBlocked = true;
      }
    }

    const uniqueBlocked = blockStats.blockedEvents.size;

    // Log every block
    logger.info(
      `Blocked: ${events.join(', ')} (${uniqueBlocked}/${TOTAL_TRACKABLE_EVENTS} event types)`
    );

    // Show toast when new event types are blocked
    if (newEventsBlocked) {
      toast.success(
        `Tracking blocked: ${uniqueBlocked}/${TOTAL_TRACKABLE_EVENTS} event types`,
        3000
      );
    }
  }

  // jQuery event blocker
  function patchJQuery($: JQueryStatic): void {
    const originalOn = $.fn.on;

    // Use type assertion to override the strict jQuery types
    // We need to intercept all .on() calls to block tracking events
    ($.fn as { on: Function }).on = function (
      this: JQuery,
      events: unknown,
      ...args: unknown[]
    ) {
      if (typeof events === 'string') {
        const eventList = events.split(/\s+/);
        const blocked = eventList.filter((e) => blockedEvents.has(e));

        if (blocked.length > 0) {
          reportBlock(blocked);
          return this;
        }
      }
      return originalOn.apply(this, [events, ...args] as Parameters<
        typeof originalOn
      >);
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

  // Check etestPlayer.js checksum and warn if changed
  async function checkEtestPlayerChecksum(
    content: string,
    url: string
  ): Promise<void> {
    const detectedChecksum = await sha256Hex(content);
    logger.info(`etestPlayer.js checksum: ${detectedChecksum}`);

    if (detectedChecksum !== CONFIG.KNOWN_ETEST_PLAYER_CHECKSUM) {
      logger.warn(
        `Checksum mismatch! Expected: ${CONFIG.KNOWN_ETEST_PLAYER_CHECKSUM}, Got: ${detectedChecksum}`
      );
      toast.warn(
        `etestPlayer.js checksum changed (${detectedChecksum.slice(0, 12)}) - extension may need update`,
        0
      );
      logger.warn(`Checksum mismatch detected for ${url}`);
      return;
    }

    logger.info('etestPlayer.js checksum verified');
  }

  // Network interceptor rules
  function setupInterceptorRules(): void {
    window.__interceptorRules = window.__interceptorRules || [];
    window.__interceptorRules.push({
      pattern: /elearning\/pics\/js\/etest\/etestPlayer\.js/,
      modifier: async (content, url) => {
        logger.info('etestPlayer.js detected - checking checksum');

        await checkEtestPlayerChecksum(content, url);

        return content;
      },
    });

    logger.info('Registered checksum checker for etestPlayer.js');
    toast.info('Checksum checker ready', 3000);
  }

  // jQuery watcher
  function watchForJQuery(): void {
    const interval = setInterval(() => {
      if (window.jQuery?.fn?.on) {
        clearInterval(interval);
        patchJQuery(window.jQuery);
        logger.info('jQuery patched - tracking event blocker installed');
        toast.success(
          `Event blocker ready (monitoring ${TOTAL_TRACKABLE_EVENTS} event types)`,
          4000
        );
      }
    }, CONFIG.JQUERY_POLL_INTERVAL);

    // Timeout after configured duration
    setTimeout(() => {
      clearInterval(interval);
      if (!window.jQuery?.fn?.on) {
        logger.warn(
          `jQuery not detected after ${CONFIG.JQUERY_WAIT_TIMEOUT / 1000}s`
        );
        toast.error('jQuery not found - some blocking may not work', 0);
      }
    }, CONFIG.JQUERY_WAIT_TIMEOUT);
  }

  // Execute all patches
  logger.info('Starting injection sequence...');

  enableVisibilitySpoofing();
  patchJSONStringify();
  setupInterceptorRules();
  watchForJQuery();

  logger.info('Injection sequence complete');
})();
