(function () {
  const TAG = '[EduPage Rooftop]';
  const COLORS = {
    blocked:
      'background: #3d0000; color: #ff4d4d; font-weight: bold; border-radius: 3px; padding: 0 3px;',
    patch: 'color: #2ed573; font-weight: bold;',
    info: 'color: #70a1ff;',
  };

  // --- 1. Refined Registry ---
  const BLOCKED = {
    // These keys are specific to tracking logs, NOT the test content itself
    keys: ['answerLog', 'answerLogByWidget', 'answerLogId', 'collection'],
    // These namespaces are purely for tracking events
    namespaces: ['etestplayer', 'etestplayeral'],
    // These functions are for the logger
    strings: ['addAnswerLogEvent', 'zipLog'],
  };

  const log = (
    msg: string,
    type: keyof typeof COLORS = 'info',
    ...args: any[]
  ) => {
    console.log(`%c${TAG}%c ${msg}`, COLORS[type], 'color: inherit;', ...args);
  };

  // Improved check: Only block if it looks like a tracking log
  const isTrackingPayload = (val: any): boolean => {
    if (typeof val !== 'string') return false;
    const lower = val.toLowerCase();
    // We no longer block the broad term "etest" to avoid breaking the test loader
    return (
      BLOCKED.keys.some((k) => lower.includes(k.toLowerCase())) ||
      BLOCKED.strings.some((s) => lower.includes(s.toLowerCase()))
    );
  };

  const scrub = (obj: any): boolean => {
    if (!obj || typeof obj !== 'object') return false;
    let found = false;
    for (const key of Object.keys(obj)) {
      if (
        BLOCKED.keys.some((k) => key.toLowerCase().includes(k.toLowerCase()))
      ) {
        delete obj[key];
        found = true;
      } else if (typeof obj[key] === 'object') {
        if (scrub(obj[key])) found = true;
      }
    }
    return found;
  };

  // --- 2. Stealth Storage (Proxy Pattern) ---
  const createStorageProxy = (type: 'localStorage' | 'sessionStorage') => {
    const originalStorage = window[type];
    const handler: ProxyHandler<Storage> = {
      get: (target, prop: string) => {
        const val = target[prop as keyof Storage];
        if (prop === 'setItem' || prop === 'getItem') {
          return (key: string, value?: string) => {
            // Only block storage if the KEY is strictly a tracking key
            if (
              BLOCKED.keys.some((k) =>
                key.toLowerCase().includes(k.toLowerCase())
              )
            ) {
              log(`Blocked ${type} ${prop.toUpperCase()}: ${key}`, 'blocked');
              return prop === 'getItem' ? null : undefined;
            }
            return prop === 'setItem'
              ? target.setItem(key, value!)
              : target.getItem(key);
          };
        }
        return typeof val === 'function' ? val.bind(target) : val;
      },
    };
    Object.defineProperty(window, type, {
      value: new Proxy(originalStorage, handler),
      configurable: true,
    });
  };

  // --- 3. API Interceptors ---
  const patchJQuery = ($: any) => {
    // 3a. Event Interceptor (The strongest layer)
    const _on = $.fn.on;
    $.fn.on = function (events: string, ...args: any[]) {
      if (
        typeof events === 'string' &&
        BLOCKED.namespaces.some((ns) => events.includes(`.${ns}`))
      ) {
        log(`Prevented tracking event: ${events}`, 'blocked');
        return this;
      }
      return _on.apply(this, [events, ...args]);
    };

    // 3b. AJAX Interceptor (Refined)
    const _ajax = $.ajax;
    $.ajax = function (urlOrSettings: any, settings?: any) {
      const cfg =
        typeof urlOrSettings === 'object' ? urlOrSettings : settings || {};
      const url =
        cfg.url || (typeof urlOrSettings === 'string' ? urlOrSettings : '');

      // LOGIC: Only block if it's a POST request containing tracking keys.
      // Do NOT block GET requests (which load the test).
      const isPost =
        cfg.type?.toUpperCase() === 'POST' ||
        cfg.method?.toUpperCase() === 'POST';

      if (isPost && (isTrackingPayload(cfg.data) || scrub(cfg.data))) {
        log(`Scrubbed tracking data from POST: ${url}`, 'blocked');
        // If data is now empty or only had logs, return success dummy
        if (!cfg.data || Object.keys(cfg.data).length === 0) {
          return $.Deferred().resolve().promise();
        }
      }

      return _ajax.apply(this, [urlOrSettings, settings]);
    };

    // 3c. Plugin Wrapper
    const _player = $.fn.etestPlayer;
    if (_player) {
      $.fn.etestPlayer = function (opts: any) {
        log(
          'etestPlayer detected: Initializing with useAnswerLog=false',
          'patch'
        );
        return _player.call(this, { ...opts, useAnswerLog: false });
      };
      $.fn.etestPlayer.defaults = _player.defaults;
    }
  };

  // --- 4. Visibility & Fullscreen (Kept the same) ---
  const stayActive = () => {
    Object.defineProperties(document, {
      hidden: { get: () => false, configurable: true },
      visibilityState: { get: () => 'visible', configurable: true },
    });
    document.hasFocus = () => true;
  };

  // --- Execution ---
  createStorageProxy('localStorage');
  createStorageProxy('sessionStorage');
  stayActive();

  const jqInterval = setInterval(() => {
    if (window.jQuery?.fn?.on) {
      patchJQuery(window.jQuery);
      if (window.jQuery.fn.etestPlayer) {
        clearInterval(jqInterval);
        log('All systems nominal. Tracking suppressed.', 'patch');
      }
    }
  }, 100);
  setTimeout(() => clearInterval(jqInterval), 10000);
})();
