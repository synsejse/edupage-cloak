// Logger - Simple singleton logger with styled console output

const LOGGER_GLOBAL_KEY = '__edupage_cloak_logger__';

type LogLevel = 'error' | 'warn' | 'info' | 'debug';

export interface Logger {
  name?: string;
  error(msg: string): void;
  warn(msg: string): void;
  info(msg: string): void;
  debug(msg: string): void;
  child(name: string): Logger;
  time(label: string): void;
  timeEnd(label: string): void;
}

interface LoggerFactory {
  createLogger: (name?: string) => Logger;
}

declare global {
  interface Window {
    [LOGGER_GLOBAL_KEY]?: LoggerFactory;
  }
}

// Console styles for each log level
const STYLES = {
  tag: 'background:#222;color:#fff;padding:1px 6px;border-radius:3px;font-weight:700;',
  error: 'color:#fff;background:#c0392b;padding:1px 4px;border-radius:2px;',
  warn: 'color:#663c00;background:#f1c40f;padding:1px 4px;border-radius:2px;',
  info: 'color:#2f80ed;font-weight:600;',
  debug: 'color:#7f8c8d;font-style:italic;',
} as const;

const CONSOLE_METHODS: Record<LogLevel, 'error' | 'warn' | 'info' | 'log'> = {
  error: 'error',
  warn: 'warn',
  info: 'info',
  debug: 'log',
};

// Safe console method accessor
const getConsoleMethod = (method: keyof Console) =>
  (console[method] as (...args: unknown[]) => void)?.bind(console) ??
  console.log.bind(console);

function print(level: LogLevel, name: string | undefined, msg: string): void {
  const tag = `[${name ?? 'log'}]`;
  const timestamp = new Date().toISOString();

  getConsoleMethod(CONSOLE_METHODS[level])(
    `%c${tag}%c %c${timestamp}%c ${msg}`,
    STYLES.tag,
    'color:inherit;font-size:11px;margin-left:6px;',
    STYLES[level],
    'color:inherit;'
  );
}

function createLoggerImpl(name?: string): Logger {
  const timerLabel = (label: string) => `${name ?? 'log'}:${label}`;

  return {
    name,
    error: (msg) => print('error', name, msg),
    warn: (msg) => print('warn', name, msg),
    info: (msg) => print('info', name, msg),
    debug: (msg) => print('debug', name, msg),

    child(childName) {
      return createLoggerImpl(name ? `${name}:${childName}` : childName);
    },

    time(label) {
      try {
        getConsoleMethod('time')(timerLabel(label));
      } catch {
        // Ignore timer errors
      }
    },

    timeEnd(label) {
      try {
        getConsoleMethod('timeEnd')(timerLabel(label));
      } catch {
        // Ignore timer errors
      }
    },
  };
}

// Singleton factory getter
function getLoggerFactory(): LoggerFactory {
  if (typeof window === 'undefined') {
    return { createLogger: createLoggerImpl };
  }

  if (!window[LOGGER_GLOBAL_KEY]) {
    window[LOGGER_GLOBAL_KEY] = { createLogger: createLoggerImpl };
  }

  return window[LOGGER_GLOBAL_KEY];
}

export const createLogger = getLoggerFactory().createLogger;
