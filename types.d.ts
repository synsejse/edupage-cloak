// Asset Module Declarations
declare module '*.css' {
  const content: string;
  export default content;
}

// EduPage Types

interface QuestionWidget {
  id: string;
  element: HTMLElement[];
  props: QuestionProps;
  answersExtended?: Record<string, unknown>;
  getWidgetClass(): string;
}

interface QuestionProps {
  isSecured?: boolean;
  correctAnswers?: string[];
  correctExpression?: string;
  maxScore?: number;
  enableUpload?: string;
  answers?: Array<{ answerid: string; text: string }>;
  pairs?: Array<{ itemid: string; r_itemid: string; l: string; r: string }>;
  groups?: Array<{
    title: string;
    items: Array<{ itemid: string; text: string }>;
  }>;
  points?: Array<{ pointid: string; r_pointid: string }>;
}

interface MaterialObj {
  isSecured: boolean;
  getAllAnswerWidgets(): QuestionWidget[];
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

interface AnswerRevealerAPI {
  show(): void;
  hide(): void;
  toggle(): void;
  readonly isShowing: boolean;
}

// Global Window Extensions

interface Window {
  jQuery?: { fn: { on: Function } };
  $?: unknown;
  materialObj: MaterialObj | null;
  toast: ToastAPI;
  __interceptorRules: InterceptorRule[];
  __answerRevealer: AnswerRevealerAPI;
  __originalXHR: typeof XMLHttpRequest;
  __originalFetch: typeof fetch;
}
