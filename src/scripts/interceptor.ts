// Interceptor - XHR and Fetch proxy for modifying EduPage requests

import { createLogger, toast } from './internal';

(function () {
  'use strict';

  const logger = createLogger('interceptor');
  const OriginalXHR = window.XMLHttpRequest;
  const originalFetch = window.fetch.bind(window);

  // Initialize interceptor rules storage
  window.__interceptorRules = window.__interceptorRules || [];
  window.__originalXHR = OriginalXHR;
  window.__originalFetch = originalFetch;

  toast.info('Network interceptor loaded', 3000);
  logger.info('XHR and Fetch interceptor initialized');

  // Find matching rule for a URL
  function findMatchingRule(url: string): InterceptorRule | undefined {
    return window.__interceptorRules.find((r) => r.pattern.test(url));
  }

  // XHR Proxy class
  class XHRProxy extends OriginalXHR {
    private _url = '';
    private _method = '';
    private _headers: Record<string, string> = {};
    private _interceptedResponse: string | null = null;
    private _interceptedStatus = 0;
    private _interceptedStatusText = '';

    open(
      method: string,
      url: string | URL,
      async = true,
      username?: string | null,
      password?: string | null
    ): void {
      this._method = method;
      this._url = url.toString();
      // @ts-ignore - signature mismatch but works correctly
      super.open(method, url, async, username, password);
    }

    setRequestHeader(header: string, value: string): void {
      this._headers[header] = value;
      super.setRequestHeader(header, value);
    }

    send(body?: Document | XMLHttpRequestBodyInit | null): void {
      const rule = findMatchingRule(this._url);

      if (!rule) {
        super.send(body);
        return;
      }

      logger.info(`XHR intercepting: ${this._url}`);

      const init: RequestInit = {
        method: this._method,
        headers: this._headers,
        body: body as BodyInit,
        credentials: this.withCredentials ? 'include' : 'same-origin',
      };

      window
        .fetch(this._url, init)
        .then(async (response) => {
          const text = await response.text();
          // Apply the modifier function to transform the response
          this._interceptedResponse = await rule.modifier(text, this._url);
          this._interceptedStatus = response.status;
          this._interceptedStatusText = response.statusText;

          this.dispatchEvent(new Event('readystatechange'));
          this.dispatchEvent(new Event('load'));
          this.onload?.(new ProgressEvent('load'));
        })
        .catch((err) => {
          logger.error(`XHR error: ${err}`);
          toast.error(`XHR interception failed: ${this._url}`, 0);
          this._interceptedStatus = 0;
          this.dispatchEvent(new Event('error'));
          this.onerror?.(new ProgressEvent('error'));
        });
    }

    get responseText(): string {
      return this._interceptedResponse ?? super.responseText;
    }

    get response(): unknown {
      return this._interceptedResponse ?? super.response;
    }

    get status(): number {
      return this._interceptedResponse !== null
        ? this._interceptedStatus
        : super.status;
    }

    get statusText(): string {
      return this._interceptedResponse !== null
        ? this._interceptedStatusText
        : super.statusText;
    }

    get readyState(): number {
      return this._interceptedResponse !== null ? 4 : super.readyState;
    }
  }

  window.XMLHttpRequest = XHRProxy;

  // Fetch proxy
  async function patchedFetch(
    input: RequestInfo | URL,
    init?: RequestInit
  ): Promise<Response> {
    const url =
      typeof input === 'string'
        ? input
        : input instanceof URL
          ? input.toString()
          : input.url;

    const rule = findMatchingRule(url);

    if (!rule) {
      return originalFetch(input, init);
    }

    logger.info(`Fetch intercepting: ${url}`);

    try {
      const response = await originalFetch(input, init);

      if (!response.ok) {
        return response;
      }

      const text = await response.text();
      const modified = await rule.modifier(text, url);

      return new Response(modified, {
        status: response.status,
        statusText: response.statusText,
        headers: response.headers,
      });
    } catch (e) {
      logger.error(`Fetch error: ${e}`);
      toast.error(`Fetch interception failed: ${url}`, 0);
      throw e;
    }
  }

  // Preserve static properties from original fetch
  Object.assign(patchedFetch, originalFetch);
  window.fetch = patchedFetch as typeof fetch;
})();
