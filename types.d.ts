// Asset Module Declarations
declare module '*.css' {
  const content: string;
  export default content;
}

// EduPage Types

/**
 * Widget class names returned by getWidgetClass()
 */
type WidgetClassName =
  | 'ETestWidget'
  | 'CompositeETestWidget'
  | 'FBoxETestWidget'
  | 'MainETestWidget'
  | 'HBoxETestWidget'
  | 'PageETestWidget'
  | 'ScannerPageETestWidget'
  | 'AnswerETestWidget'
  | 'AbcdAnswerETestWidget'
  | 'MapAnswerETestWidget'
  | 'OrderingAnswerETestWidget'
  | 'ConnectAnswerETestWidget'
  | 'GroupsAnswerETestWidget'
  | 'IframeAnswerETestWidget'
  | 'ImageAnswerETestWidget'
  | 'SvgAnswerETestWidget'
  | 'InputAnswerETestWidget'
  | 'ElaborationETestWidget';

/**
 * Answer item used in AbcdAnswerETestWidget
 */
interface AnswerItem {
  answerid: string;
  text: string;
  attachements?: Array<{
    src: string;
    name?: string;
    type?: string;
  }>;
}

/**
 * Pair item used in ConnectAnswerETestWidget
 */
interface PairItem {
  itemid?: string;
  r_itemid?: string;
  l: string;
  r: string;
  l_attachements?: unknown[];
  r_attachements?: unknown[];
}

/**
 * Group item used in GroupsAnswerETestWidget
 */
interface GroupItem {
  title: string;
  items: Array<{
    itemid?: string;
    text: string;
    attachements?: unknown[];
  }>;
}

/**
 * Point item used in MapAnswerETestWidget
 */
interface PointItem {
  pointid?: string;
  r_pointid?: string;
  pointIndex?: number;
  x?: number;
  y?: number;
  xx?: number;
  yy?: number;
  text?: string;
  files?: FileItem[];
  relativeToImage?: boolean;
}

/**
 * File item used in FileETestWidget and attachments
 */
interface FileItem {
  src: string;
  name?: string;
  type?: 'image' | 'sound' | 'video' | string;
  id?: number;
}

/**
 * SVG answer extended info used in SvgAnswerETestWidget
 */
interface SvgAnswerExtended {
  [eid: string]: {
    draggable?: boolean;
    droppable?: boolean;
    selectable?: boolean;
    hidden?: boolean;
    hiddenSrc?: boolean;
    infinite?: boolean;
    clickto?: string;
    correct?: boolean;
    value?: string;
  };
}

/**
 * Props for question/answer widgets
 */
interface QuestionProps {
  // Security
  isSecured?: boolean;

  // Scoring
  maxScore?: number;

  // Randomization
  randSeed?: number;
  randSeedNumQuestions?: number;

  // AbcdAnswerETestWidget props
  answers?: AnswerItem[];
  correctAnswers?: string[];
  answersOrder?: 'fixed' | string;
  multipleChoice?: '1' | string;

  // InputAnswerETestWidget props
  incorrectAnswers?: string[];

  // SvgAnswerETestWidget props
  correctExpression?: string;

  // ConnectAnswerETestWidget props
  pairs?: PairItem[];
  playMode?: 'words' | string;

  // GroupsAnswerETestWidget props
  groups?: GroupItem[];

  // MapAnswerETestWidget props
  points?: PointItem[];
  pointPositions?: unknown[];

  // ElaborationETestWidget props
  enableUpload?: 'enabled' | 'disabled' | 'notext';

  // FileETestWidget props
  files?: FileItem[];
  allowReplay?: string;

  // Screen/display props
  cardsPerScreen?: 'single' | 'all' | string;
  playSound?: 'yes' | 'no' | string;

  // Card notes (used for answer feedback)
  cardNotes?: Record<
    string,
    {
      text?: string;
    }
  >;
}

/**
 * Base ETest widget interface
 */
interface QuestionWidget {
  id: string;
  element: JQuery<HTMLElement>;
  props: QuestionProps;
  parent: QuestionWidget | null;
  mainWidget: MainETestWidget | null;

  // Extended answers for SVG widgets
  answersExtended?: SvgAnswerExtended;

  // Methods
  getWidgetClass(): WidgetClassName;
  getWidgetClasses(): WidgetClassName[];
  isA(widgetClass: WidgetClassName | string): boolean;

  // Answer widget methods (available on AnswerETestWidget subclasses)
  isEvaluated?(): boolean;
  evaluate?(): void;
  getScore?(): number | null;
  getMaxScore?(): number;
  getAnswered?(): unknown;
  isSomethingAnswered?(): boolean;
  isCorrect?(answered?: unknown): boolean;
  answeredToStr?(val?: unknown): string;
  disable?(): void;
  showCorrectAnswers?(): boolean;
  getCorrectAnswers?(): boolean;
  needDownloadUnsecuredData?(): boolean;
  isElaborationOrEvaluation?(): boolean;
  getQuestionWidget?(): QuestionWidget;
  hasMultipleSubanswers?(): boolean;
  setAnswersEditMode?(mode: boolean): void;
}

/**
 * Main widget that contains all other widgets
 */
interface MainETestWidget extends QuestionWidget {
  materialObj: MaterialObj | null;
  markCorrectAnswers: boolean;
  markCorrectAnswersMode: string;

  setIsEditing(editing: boolean): void;
  setIsPlaying(playing: boolean): void;
  showCorrectAnswers(): boolean;
  getMarkCorrectAnswersMode(): string;
  setShowCorrectAnswers(val: boolean): void;
  getCardWidgets(): QuestionWidget[];
}

/**
 * Material object - main container for test data
 */
interface MaterialObj {
  // Security flags
  isSecured: boolean;
  isSecuredCards: boolean;

  // Data
  materialData: Record<string, unknown>;
  currentVariantid: string | number;
  co_som: string;
  etestType?: number;

  // Main widget references
  playMainWidget?: MainETestWidget;
  printMainWidget?: MainETestWidget;
  scannerMainWidget?: MainETestWidget;

  // Methods
  getAllAnswerWidgets(variantid?: string | number): QuestionWidget[];
  getAllElaborationWidgets(variantid?: string | number): QuestionWidget[];
  getAnswerWidgets(
    cardid: string,
    variantid?: string | number
  ): QuestionWidget[];
  getVariant(variantid: string | number): unknown[];
  getVariantFlat(variantid: string | number): unknown[];
  getSrcVariantid(variantid: string | number): string | number;
  getCardWidget(
    cardid: string,
    variantid?: string | number
  ): QuestionWidget | null;
  getCardsAllVariants(callback: () => void): void;
  hasOpenAnswer(): boolean;
  isSomethingAnswered(): boolean;
  isTestMeMode?(): boolean;
  getScoreData(variantid?: string | number): ScoreData;
  createPlayMainWidget(
    variantid: string | number,
    elem: HTMLElement | null,
    options?: Record<string, unknown>
  ): MainETestWidget;
}

/**
 * Score data returned by getScoreData
 */
interface ScoreData {
  score: number;
  scoreMax: number;
  scorePercent: number;
  questionsAnswered: number;
  questionsTotal: number;
  isDefined: boolean;
  isSecured: boolean;
  vcardids?: string[];
  seenData?: boolean;
  seenScore?: number;
  seenScoreMax?: number;
  seenScorePercent?: number;
  remainingTime?: number;
  randSeed?: number;
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
// Note: JQuery and JQueryStatic types are provided by @types/jquery

interface Window {
  jQuery?: JQueryStatic;
  $?: JQueryStatic;
  materialObj: MaterialObj | null;
  toast: ToastAPI;
  __interceptorRules: InterceptorRule[];
  __answerRevealer: AnswerRevealerAPI;
  __originalXHR: typeof XMLHttpRequest;
  __originalFetch: typeof fetch;
}
