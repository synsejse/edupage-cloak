// Logger
// Just a simple logger

export type LogLevelName = 'error' | 'warn' | 'info' | 'debug' | 'silent';

/* ---------------------------------- styles -------------------------------- */

type StyleMap = Record<LogLevelName | 'tag', string>;

const STYLES: StyleMap = {
  tag: 'background:#222;color:#fff;padding:1px 6px;border-radius:3px;font-weight:700;',

  error: 'color:#fff;background:#c0392b;padding:1px 4px;border-radius:2px;',
  warn: 'color:#663c00;background:#f1c40f;padding:1px 4px;border-radius:2px;',
  info: 'color:#2f80ed;font-weight:600;',
  debug: 'color:#7f8c8d;font-style:italic;',

  // not used, but keeps TS happy
  silent: 'color:inherit;',
};

type ConsoleMethod = (...args: unknown[]) => void;

const safe = <K extends keyof Console>(key: K): ConsoleMethod =>
  (console[key] ?? console.log).bind(console);

const safeConsole = {
  log: safe('log'),
  info: safe('info'),
  warn: safe('warn'),
  error: safe('error'),
  time: safe('time'),
  timeEnd: safe('timeEnd'),
};

const CONSOLE_METHOD: Record<LogLevelName, keyof typeof safeConsole> = {
  error: 'error',
  warn: 'warn',
  info: 'info',
  debug: 'log',
  silent: 'log',
};

const now = () => new Date().toISOString();

function print(level: LogLevelName, name: string | undefined, msg: string) {
  if (level === 'silent') return;

  const tag = name ? `[${name}]` : '[log]';
  const base = `%c${tag}%c %c${now()}%c ${msg}`;

  const args = [
    base,
    STYLES.tag,
    'color:inherit;font-size:11px;margin-left:6px;',
    STYLES[level],
    'color:inherit;',
  ];

  safeConsole[CONSOLE_METHOD[level]](...args);
}

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

export function createLogger(name?: string): Logger {
  const makeTimerLabel = (label: string) => `${name ?? 'log'}:${label}`;

  const write = (lvl: LogLevelName, msg: string) => print(lvl, name, msg);

  return {
    name,

    error: (m) => write('error', m),
    warn: (m) => write('warn', m),
    info: (m) => write('info', m),
    debug: (m) => write('debug', m),

    child(childName) {
      return createLogger(name ? `${name}:${childName}` : childName);
    },

    time(label) {
      try {
        safeConsole.time(makeTimerLabel(label));
      } catch {}
    },

    timeEnd(label) {
      try {
        safeConsole.timeEnd(makeTimerLabel(label));
      } catch {}
    },
  };
}
