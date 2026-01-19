// Mobile Redirect Script
// Handles bidirectional redirection between mobile and desktop views
// Execution: Only on initial page load to prevent accidental refreshes

import { createLogger } from './logger';
import { UAParser } from 'ua-parser-js';

(function () {
  const logger = createLogger('mobile-redirect');
  const MOBILE_BREAKPOINT = 768;

  /**
   * Identifies if the current environment is a mobile
   * based on User Agent. Does not include Apple devices.
   */
  const isMobileEnvironment = (): boolean => {
    const parser = new UAParser(navigator.userAgent);
    const device = parser.getDevice();

    return device.type === 'mobile' && device.vendor !== 'Apple';
  };

  /**
   * Performs the redirect check once on load.
   */
  const runRedirectCheck = (): void => {
    const { hostname, pathname, origin, search, hash } = window.location;

    // Only execute on EduPage domains
    if (!hostname.includes('edupage.org')) return;

    const isMobile = isMobileEnvironment();
    const isCurrentlyOnAppView = pathname.startsWith('/app/');

    // Case 1: On mobile environment but standard view -> Move to App
    if (isMobile && !isCurrentlyOnAppView) {
      const appUrl = `${origin}/app/${search}${hash}`;
      logger.info(`Mobile environment detected. Redirecting to app: ${appUrl}`);
      window.location.href = appUrl;
      return;
    }

    // Case 2: On desktop environment but mobile app view -> Move to Standard
    if (!isMobile && isCurrentlyOnAppView) {
      // Reconstruct the URL by removing the '/app/' prefix
      // Example: origin/app/?query -> origin/?query
      const normalUrl = `${origin}/${search}${hash}`;
      logger.info(
        `Desktop environment detected. Returning to standard view: ${normalUrl}`
      );
      window.location.href = normalUrl;
      return;
    }

    logger.debug(
      `Environment matches view. (Mobile: ${isMobile}, App View: ${isCurrentlyOnAppView})`
    );
  };

  // Run only once immediately on load
  runRedirectCheck();
})();
