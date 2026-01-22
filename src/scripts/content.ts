// Content Script - Inject patch scripts into page context

import { createLogger } from './internal';

const logger = createLogger('content');

logger.info('Content script loaded');

// Inject a script into the Main World (page context)
function injectScript(filename: string, name: string): void {
  const script = document.createElement('script');
  script.src = chrome.runtime.getURL(filename);
  script.onload = () => {
    logger.info(`${name} loaded`);
    script.remove();
  };
  (document.head || document.documentElement).appendChild(script);
}

// Inject required scripts
injectScript('inject.js', 'Tracking blocker');
injectScript('answer-revealer.js', 'Answer revealer');

logger.info('Injection initiated');
