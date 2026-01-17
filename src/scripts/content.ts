// EduPage Rooftop - Content Script
// Injects the patch script into the page context

(function (): void {
  'use strict';

  console.log('[EduPage Rooftop] Content script loaded');

  // Create and inject the patch script
  const script = document.createElement('script');
  script.src = chrome.runtime.getURL('inject.js');
  script.onload = (): void => {
    console.log('[EduPage Rooftop] Patch script loaded');
    script.remove();
  };

  // Inject as early as possible
  (document.head || document.documentElement).appendChild(script);

  console.log('[EduPage Rooftop] Injection initiated');
})();
