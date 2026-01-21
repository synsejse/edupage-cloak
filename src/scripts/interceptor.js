(function() {
  'use strict';

  const LOG_TAG = '[interceptor]';
  const OriginalXHR = window.XMLHttpRequest;
  const originalFetch = window.fetch.bind(window);
  
  // Storage for interceptor rules (will be populated by inject.js later)
  window.__interceptorRules = window.__interceptorRules || [];
  window.__originalXHR = OriginalXHR;
  window.__originalFetch = originalFetch;
  
  // XHR Proxy
  class XHRProxy extends OriginalXHR {
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
    
    open(method, url, ...args) {
      this._method = method;
      this._url = typeof url === 'string' ? url : url.toString();
      super.open(method, url, ...args);
    }
    
    setRequestHeader(header, value) {
      this._headers[header] = value;
      super.setRequestHeader(header, value);
    }
    
    send(body) {
      const url = this._url;
      const rules = window.__interceptorRules || [];
      const matchedRule = url ? rules.find(r => r.pattern.test(url)) : null;
      
      if (matchedRule && url && this._method) {
        console.log(LOG_TAG, 'XHR intercepting:', url);
        
        const init = {
          method: this._method,
          headers: this._headers,
          body: body,
        };
        if (this.withCredentials) init.credentials = 'include';
        
        // Use patched fetch (which also applies modifiers)
        window.fetch(url, init)
          .then(async (response) => {
            const text = await response.text();
            this._overrideResponseText = text;
            this._overrideStatus = response.status;
            this._overrideStatusText = response.statusText;
            this._overrideReadyState = 4;
            
            this.dispatchEvent(new Event('readystatechange'));
            this.dispatchEvent(new Event('load'));
            if (this.onload) this.onload(new Event('load'));
          })
          .catch((err) => {
            console.error(LOG_TAG, 'XHR error:', err);
            this._overrideStatus = 0;
            this.dispatchEvent(new Event('error'));
            if (this.onerror) this.onerror(new Event('error'));
          });
        return;
      }
      
      super.send(body);
    }
    
    get responseText() { return this._overrideResponseText !== null ? this._overrideResponseText : super.responseText; }
    get response() { return this._overrideResponseText !== null ? this._overrideResponseText : super.response; }
    get status() { return this._overrideStatus !== null ? this._overrideStatus : super.status; }
    get statusText() { return this._overrideStatusText !== null ? this._overrideStatusText : super.statusText; }
    get readyState() { return this._overrideReadyState !== null ? this._overrideReadyState : super.readyState; }
  }
  
  window.XMLHttpRequest = XHRProxy;
  
  // Fetch patch
  window.fetch = async function(input, init) {
    const url = typeof input === 'string' ? input : (input instanceof URL ? input.toString() : input.url);
    const rules = window.__interceptorRules || [];
    const matchedRule = rules.find(r => r.pattern.test(url));
    
    if (matchedRule) {
      console.log(LOG_TAG, 'Fetch intercepting:', url);
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
        console.error(LOG_TAG, 'Fetch error:', e);
        throw e;
      }
    }
    return originalFetch(input, init);
  };
})();
