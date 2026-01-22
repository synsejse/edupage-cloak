// Interceptor Script
// Patches XHR and Fetch to intercept and modify EduPage requests

import { createLogger } from './internal';

(function () {
  'use strict';

  const logger = createLogger('interceptor');
  const OriginalXHR = window.XMLHttpRequest;
  const originalFetch = window.fetch.bind(window);

  // Storage for interceptor rules (will be populated by inject.js later)
  window.__interceptorRules = window.__interceptorRules || [];
  window.__originalXHR = OriginalXHR;
  window.__originalFetch = originalFetch;

  // XHR Proxy
  class XHRProxy extends OriginalXHR {
    private _url: string | undefined;
    private _method: string | undefined;
    private _headers: Record<string, string>;
    private _overrideResponseText: string | null;
    private _overrideStatus: number | null;
    private _overrideStatusText: string | null;
    private _overrideReadyState: number | null;

    constructor() {
      super();
      this._url = undefined;
      this._method = undefined;
      this._headers = {};
      this._overrideResponseText = null;
      this._overrideStatus = null;
      this._overrideStatusText = null;
      this._overrideReadyState = null;
    }

    open(
      method: string,
      url: string | URL,
      async: boolean = true,
      username?: string | null,
      password?: string | null
    ): void {
      this._method = method;
      this._url = typeof url === 'string' ? url : url.toString();
      // @ts-ignore - TS signature mismatch with standard XHR open but this is correct for proxying
      super.open(method, url, async, username, password);
    }

    setRequestHeader(header: string, value: string): void {
      this._headers[header] = value;
      super.setRequestHeader(header, value);
    }

    send(body?: Document | XMLHttpRequestBodyInit | null): void {
      const url = this._url;
      const rules = window.__interceptorRules || [];
      const matchedRule = url ? rules.find((r) => r.pattern.test(url)) : null;

      if (matchedRule && url && this._method) {
        logger.info(`XHR intercepting: ${url}`);

        const init: RequestInit = {
          method: this._method,
          headers: this._headers,
          body: body as BodyInit,
        };
        if (this.withCredentials) init.credentials = 'include';

        // Use patched fetch (which also applies modifiers)
        window
          .fetch(url, init)
          .then(async (response) => {
            const text = await response.text();
            this._overrideResponseText = text;
            this._overrideStatus = response.status;
            this._overrideStatusText = response.statusText;
            this._overrideReadyState = 4; // DONE

            this.dispatchEvent(new Event('readystatechange'));
            this.dispatchEvent(new Event('load'));
            if (this.onload) {
              // @ts-ignore - event type mismatch is fine here
              this.onload(new Event('load'));
            }
          })
          .catch((err) => {
            logger.error(`XHR error: ${err}`);
            this._overrideStatus = 0;
            this.dispatchEvent(new Event('error'));
            if (this.onerror) {
              // @ts-ignore
              this.onerror(new Event('error'));
            }
          });
        return;
      }

      super.send(body);
    }

    get responseText(): string {
      return this._overrideResponseText !== null
        ? this._overrideResponseText
        : super.responseText;
    }
    get response(): any {
      return this._overrideResponseText !== null
        ? this._overrideResponseText
        : super.response;
    }
    get status(): number {
      return this._overrideStatus !== null
        ? this._overrideStatus
        : super.status;
    }
    get statusText(): string {
      return this._overrideStatusText !== null
        ? this._overrideStatusText
        : super.statusText;
    }
    get readyState(): number {
      return this._overrideReadyState !== null
        ? this._overrideReadyState
        : super.readyState;
    }
  }

  window.XMLHttpRequest = XHRProxy;

  // Fetch patch
  const patchedFetch = async function (
    input: RequestInfo | URL,
    init?: RequestInit
  ): Promise<Response> {
    let url: string;
    if (typeof input === 'string') {
      url = input;
    } else if (input instanceof URL) {
      url = input.toString();
    } else {
      url = input.url;
    }

    const rules = window.__interceptorRules || [];
    const matchedRule = rules.find((r) => r.pattern.test(url));

    if (matchedRule) {
      logger.info(`Fetch intercepting: ${url}`);
      try {
        const response = await originalFetch(input, init);
        if (!response.ok) return response;
        const text = await response.text();
        const modifiedText = await matchedRule.modifier(text, url);
        return new Response(modifiedText, {
          status: response.status,
          statusText: response.statusText,
          headers: response.headers,
        });
      } catch (e) {
        logger.error(`Fetch error: ${e}`);
        throw e;
      }
    }
    return originalFetch(input, init);
  };

  // Copy static properties from original fetch (like preconnect)
  Object.assign(patchedFetch, originalFetch);
  window.fetch = patchedFetch as typeof fetch;
})();
