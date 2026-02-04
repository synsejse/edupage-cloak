// Asset Module Declarations
declare module '*.css' {
  const content: string;
  export default content;
}

// Toast Types

type ToastType = 'info' | 'warn' | 'error' | 'success' | 'debug';

interface ToastOptions {
  duration?: number; // milliseconds, 0 = permanent
  type?: ToastType;
  position?: 'top' | 'bottom';
}

interface ToastAPI {
  info(msg: string, duration?: number): void;
  warn(msg: string, duration?: number): void;
  error(msg: string, duration?: number): void;
  success(msg: string, duration?: number): void;
  debug(msg: string, duration?: number): void;
  show(msg: string, options?: ToastOptions): void;
  clear(): void;
}

// Interceptor Types

interface InterceptorRule {
  pattern: RegExp;
  modifier: (content: string, url: string) => string | Promise<string>;
}

// Global Window Extensions
// Note: JQuery and JQueryStatic types are provided by @types/jquery

interface Window {
  jQuery?: JQueryStatic;
  $?: JQueryStatic;
  toast: ToastAPI;
  __interceptorRules: InterceptorRule[];
  __originalXHR: typeof XMLHttpRequest;
  __originalFetch: typeof fetch;
}
