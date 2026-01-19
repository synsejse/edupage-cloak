// Inject Script
// Block EduPage tracking functionality

import { createLogger } from './logger';

(function () {
  const logger = createLogger('inject');

  // --- 1. Tracking Event Namespaces ---
  const BLOCKED_NAMESPACES = [
    'etestplayer' /* etestPlayer.js#530 */,
    'etestplayeral' /* etestPlayer.js#2409 */,
    'etestaplayer' /* etestPlayer.js#521 */,
  ];

  // --- 2. jQuery Event Blocker ---
  const patchJQuery = ($: any) => {
    const _on = $.fn.on;
    $.fn.on = function (events: string, ...args: any[]) {
      if (
        typeof events === 'string' &&
        BLOCKED_NAMESPACES.some((ns) => events.includes(`.${ns}`))
      ) {
        logger.info(`Blocked tracking event: ${events}`);
        return this; // Return jQuery object without attaching listener
      }
      return _on.apply(this, [events, ...args]);
    };
  };

  // --- 3. Visibility & Focus Spoofing ---
  const stayActive = () => {
    Object.defineProperties(document, {
      hidden: { get: () => false, configurable: true },
      visibilityState: { get: () => 'visible', configurable: true },
    });
    document.hasFocus = () => true;
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
