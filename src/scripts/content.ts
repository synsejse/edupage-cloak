// Content Script
// Injects the patch scripts into the page context

import { createLogger } from './internal';
import interceptorCode from './interceptor.js?raw';

(function (): void {
  'use strict';

  const logger = createLogger('content');

  logger.info('Content script loaded');

  /**
   * Inject XHR/Fetch interceptor synchronously BEFORE any page scripts run.
   * This MUST be inline (textContent) to execute synchronously.
   */
  const injectXHRPatchSync = (): void => {
    const script = document.createElement('script');
    // This code runs synchronously in the page context
    script.textContent = interceptorCode;
    (document.head || document.documentElement).appendChild(script);
    script.remove();
  };

  // Inject XHR patch IMMEDIATELY (synchronous)
  injectXHRPatchSync();

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
