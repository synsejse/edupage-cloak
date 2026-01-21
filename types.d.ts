// --- jQuery Types ---

interface JQueryStatic {
  Deferred(): any;
}

interface JQuery {
  etestPlayer: {
    (options?: any): JQuery;
    defaults: any;
  };
}

// --- EduPage Types ---

interface QuestionWidget {
  id: string;
  element: HTMLElement[];
  props: {
    isSecured?: boolean;
    correctAnswers?: string[];
    answers?: Array<{ answerid: string; text: string }>;
    pairs?: Array<{ itemid: string; r_itemid: string; l: string; r: string }>;
    groups?: Array<{ title: string; items: Array<{ itemid: string; text: string }> }>;
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

// --- Global Window Extensions ---

interface Window {
  jQuery?: any;
  $: any;
  materialObj: MaterialObj;
  toast: {
    info: (msg: string, duration?: number) => void;
    warn: (msg: string, duration?: number) => void;
    error: (msg: string, duration?: number) => void;
    success: (msg: string, duration?: number) => void;
    debug: (msg: string, duration?: number) => void;
    clear: () => void;
  };
  __interceptorRules: InterceptorRule[];
  __answerRevealer: AnswerRevealerAPI;
  __originalXHR: typeof XMLHttpRequest;
  __originalFetch: typeof fetch;
}

// --- Document Extensions ---

interface Document {
  webkitVisibilityState: string;
  mozFullScreenElement: any;
  webkitFullscreenElement: any;
}

