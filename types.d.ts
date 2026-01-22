// --- EduPage Types ---

interface QuestionWidget {
  id: string;
  element: HTMLElement[];
  props: {
    isSecured?: boolean;
    correctAnswers?: string[];
    answers?: Array<{ answerid: string; text: string }>;
    pairs?: Array<{ itemid: string; r_itemid: string; l: string; r: string }>;
    groups?: Array<{
      title: string;
      items: Array<{ itemid: string; text: string }>;
    }>;
    points?: Array<{ pointid: string; r_pointid: string }>;
    correctExpression?: string;
  };
  answersExtended?: Record<string, unknown>;
  getWidgetClass(): string;
}

interface MaterialObj {
  isSecured: boolean;
  getAllAnswerWidgets(): QuestionWidget[];
}

interface AnswerRevealerAPI {
  show: () => void;
  hide: () => void;
  toggle: () => void;
  isShowing: boolean;
}

interface InterceptorRule {
  pattern: RegExp;
  modifier: (content: string, url: string) => string | Promise<string>;
}

// --- Toast Types ---

type ToastType = 'info' | 'warn' | 'error' | 'success' | 'debug';

interface ToastOptions {
  duration?: number; // milliseconds, 0 = permanent
  type?: ToastType;
  position?: 'top' | 'bottom';
}

// --- Global Window Extensions ---

interface Window {
  jQuery?: any;
  $: any;
  materialObj: MaterialObj | null;
  toast: {
    info: (msg: string, duration?: number) => void;
    warn: (msg: string, duration?: number) => void;
    error: (msg: string, duration?: number) => void;
    success: (msg: string, duration?: number) => void;
    debug: (msg: string, duration?: number) => void;
    show: (msg: string, options?: ToastOptions) => void;
    clear: () => void;
  };
  __interceptorRules: InterceptorRule[];
  __answerRevealer: AnswerRevealerAPI;
  __originalXHR: typeof XMLHttpRequest;
  __originalFetch: typeof fetch;
}
