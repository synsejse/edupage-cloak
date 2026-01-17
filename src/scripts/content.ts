// Content Script
// Injects the patch script into the page context

import { createLogger } from './logger';

(function (): void {
  'use strict';

  const logger = createLogger('content');

  logger.info('Content script loaded');

  // Create and inject the patch script
  const script = document.createElement('script');
  script.src = chrome.runtime.getURL('inject.js');
  script.onload = (): void => {
    logger.info('Patch script loaded');
    script.remove();
  };

  // Inject as early as possible
  (document.head || document.documentElement).appendChild(script);

  logger.info('Injection initiated');
})();
