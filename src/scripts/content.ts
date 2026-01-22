// Content Script
// Injects the patch scripts into the page context

import { createLogger } from './internal';
(function (): void {
  'use strict';

  const logger = createLogger('content');

  logger.info('Content script loaded');

  /**
   * Helper to inject a script into the Main World (page context).
   * This is necessary to access and patch window-level objects like jQuery.
   */
  const injectScript = (filename: string, name: string): void => {
    const script = document.createElement('script');
    script.src = chrome.runtime.getURL(filename);
    script.onload = (): void => {
      logger.info(`${name} loaded`);
      script.remove(); // Remove tag from DOM after execution to stay clean
    };
    (document.head || document.documentElement).appendChild(script);
  };

  injectScript('inject.js', 'Tracking blocker script');
  injectScript('answer-revealer.js', 'Answer revealer script');

  logger.info('Injection initiated');
})();
