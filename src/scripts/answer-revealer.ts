// Answer Revealer - Shows correct answers for EduPage tests

import { createLogger } from './internal/logger';
import revealerStyles from './styles/answer-revealer.css';
import answerBoxStyles from './styles/answer-boxes.css';

const logger = createLogger('revealer');

// Use global toast exposed by inject.js (may not be ready immediately)
const showToast = (
  type: 'info' | 'success' | 'error',
  msg: string,
  duration = 2000
) => {
  window.toast?.[type]?.(msg, duration);
};

const ANSWER_STYLES_ID = 'edupage-cloak-answer-styles';

// Inject answer box styles into page DOM
function ensureAnswerStyles(): void {
  if (document.getElementById(ANSWER_STYLES_ID)) return;
  const style = document.createElement('style');
  style.id = ANSWER_STYLES_ID;
  style.textContent = answerBoxStyles;
  (document.head || document.documentElement).appendChild(style);
}

let isShowing = false;
const originalSvgContents: Record<number, string> = {};
let svgIndex = 0;

// --- Utility Functions ---

function createInfoBox(html: string, isWarning = false): HTMLDivElement {
  const div = document.createElement('div');
  div.className = `edu-hack edu-hack-info${isWarning ? ' warning' : ''}`;
  div.innerHTML = html;
  return div;
}

function parseSvgExpression(expr: string): string[] {
  const answers: Record<string, string[]> = {};

  expr.split(/&&|\|\|/).forEach((part) => {
    const match = part.match(/g_(\w+)\s*==\s*"(\w+)"/);
    if (match) {
      const [, variable, value] = match;
      (answers[variable] ??= []).push(value);
    }
  });

  return Object.entries(answers).map(
    ([k, v]) => `${k} = ${[...new Set(v)].join(' / ')}`
  );
}

function warnIfSecured(question: QuestionWidget): void {
  if (question.props.isSecured) {
    question.element[0]?.before(
      createInfoBox('Secured question - answers may be incorrect', true)
    );
  }
}

function checkNoAnswer(question: QuestionWidget): boolean {
  const widgetClass = question.getWidgetClass();
  let answers: unknown;

  switch (widgetClass) {
    case 'ConnectAnswerETestWidget':
      answers = question.props.pairs;
      break;
    case 'GroupsAnswerETestWidget':
      answers = question.props.groups;
      break;
    case 'OrderingAnswerETestWidget':
      answers = question.props.answers;
      break;
    case 'MapAnswerETestWidget':
      answers = question.props.points;
      break;
    case 'SvgAnswerETestWidget':
      answers = question.props.correctExpression;
      break;
    default:
      answers = question.props.correctAnswers;
  }

  if (!answers || (Array.isArray(answers) && answers.length === 0)) {
    question.element[0]?.before(
      createInfoBox('No answer found for this question', true)
    );
    return true;
  }
  return false;
}

// --- Question Handlers ---

function handleAbcd(q: QuestionWidget): void {
  const answers = q.props.correctAnswers;
  if (!answers) return;

  warnIfSecured(q);

  const container = document.querySelector(`[data-wid="${q.id}"]`);
  answers.forEach((id) => {
    container
      ?.querySelectorAll<HTMLElement>(`[data-answerid="${id}"]`)
      .forEach((el) => {
        el.classList.add('edu-hack', 'border');
      });
  });
}

function handleInput(q: QuestionWidget): void {
  if (checkNoAnswer(q)) return;
  warnIfSecured(q);

  const text = q.props.correctAnswers!.map((a) => `"${a}"`).join(' OR ');
  q.element[0]?.before(createInfoBox(`<strong>Answer:</strong> ${text}`));
}

function handleOrdering(q: QuestionWidget): void {
  if (checkNoAnswer(q)) return;
  warnIfSecured(q);

  const items = q.props.answers!.map((a) => `<li>${a.text}</li>`).join('');
  q.element[0]?.before(
    createInfoBox(`<strong>Correct order:</strong><ol>${items}</ol>`)
  );
}

function handleGroups(q: QuestionWidget): void {
  warnIfSecured(q);

  const html = q.props
    .groups!.map((g) => {
      const items = g.items.map((i) => `<li>${i.text}</li>`).join('');
      return `<div><strong>${g.title}</strong><ol>${items}</ol></div>`;
    })
    .join('');

  q.element[0]?.before(
    createInfoBox(`<strong>Correct grouping:</strong>${html}`)
  );
}

function handleConnect(q: QuestionWidget): void {
  warnIfSecured(q);

  const items = q.props.pairs!.map((p) => `<li>${p.l} ↔ ${p.r}</li>`).join('');
  q.element[0]?.before(
    createInfoBox(`<strong>Correct pairs:</strong><ol>${items}</ol>`)
  );

  if (q.element[0]) {
    q.element[0].classList.add('edu-hack', 'border');
  }
}

function handleMap(q: QuestionWidget): void {
  warnIfSecured(q);

  q.props.points!.forEach((p) => {
    const answer = document.querySelector<HTMLElement>(
      `[data-id="${p.pointid}"]`
    );
    const target = document.querySelector<HTMLElement>(
      `[data-id="${p.r_pointid}"]`
    );
    if (!answer || !target) return;

    answer.addEventListener(
      'mouseenter',
      () => (target.style.backgroundColor = '#4CAF50')
    );
    answer.addEventListener(
      'mouseleave',
      () => (target.style.backgroundColor = '')
    );
    answer.classList.add('edu-hack');
  });
}

function handleSvg(q: QuestionWidget): void {
  warnIfSecured(q);

  const answers = parseSvgExpression(q.props.correctExpression!);

  Object.keys(q.answersExtended || {}).forEach((key) => {
    const el = document.querySelector<SVGElement>(`#wq${q.id}---${key}`);
    if (!el) return;

    const label = key.replace('g_', '');
    const tspan = el.querySelector('tspan');

    if (tspan) {
      originalSvgContents[svgIndex] = tspan.outerHTML;
      tspan.setAttribute('data-keep-index', String(svgIndex++));
      tspan.textContent = label;
    } else {
      const circle = el.querySelector('circle');
      if (!circle) return;

      originalSvgContents[svgIndex] = el.innerHTML;
      el.setAttribute('data-keep-index', String(svgIndex++));

      const text = document.createElementNS(
        'http://www.w3.org/2000/svg',
        'text'
      );
      const newTspan = document.createElementNS(
        'http://www.w3.org/2000/svg',
        'tspan'
      );
      newTspan.textContent = label;
      newTspan.setAttribute(
        'x',
        String(Number(circle.getAttribute('cx')) - 10)
      );
      newTspan.setAttribute('y', String(Number(circle.getAttribute('cy')) + 8));
      newTspan.style.cssText = 'font-size:24px;font-family:Arial;fill:#FF5722';
      text.appendChild(newTspan);
      el.appendChild(text);
    }
  });

  const items = answers.map((a) => `<li>${a}</li>`).join('');
  q.element[0]?.before(
    createInfoBox(`<strong>Correct answers:</strong><ol>${items}</ol>`)
  );
}

// --- Main API ---

function handleElaboration(q: QuestionWidget): void {
  warnIfSecured(q);

  const { maxScore, enableUpload } = q.props as {
    maxScore?: number;
    enableUpload?: string;
  };

  const uploadEnabled = enableUpload === 'enabled';
  const info = [
    '<strong>Essay/Elaboration question</strong>',
    `Max score: ${maxScore ?? 'N/A'}`,
    uploadEnabled ? 'File upload enabled' : null,
    '(No correct answer - manually graded)',
  ]
    .filter(Boolean)
    .join('<br>');

  q.element[0]?.before(createInfoBox(info));
  logger.debug(
    `ElaborationETestWidget: maxScore=${maxScore}, upload=${uploadEnabled}`
  );
}

const handlers: Record<string, (q: QuestionWidget) => void> = {
  AbcdAnswerETestWidget: handleAbcd,
  InputAnswerETestWidget: handleInput,
  OrderingAnswerETestWidget: handleOrdering,
  GroupsAnswerETestWidget: handleGroups,
  ConnectAnswerETestWidget: handleConnect,
  MapAnswerETestWidget: handleMap,
  SvgAnswerETestWidget: handleSvg,
  ElaborationETestWidget: handleElaboration,
};

function showAnswers(): void {
  ensureAnswerStyles();

  if (!window.materialObj) {
    logger.error('materialObj not found');
    showToast(
      'error',
      'Test not loaded yet - wait for page to fully load',
      5000
    );
    return;
  }

  (window.materialObj as MaterialObj)
    .getAllAnswerWidgets()
    .forEach((q: QuestionWidget) => {
      try {
        const handler = handlers[q.getWidgetClass()];
        if (handler) handler(q);
        else {
          logger.warn(`Unknown widget: ${q.getWidgetClass()}`);
        }
      } catch (e) {
        logger.error(`Error processing widget: ${e}`);
      }
    });

  isShowing = true;
  logger.info('Answers shown');
  showToast('success', 'Answers revealed', 3000);
}

function hideAnswers(): void {
  document
    .querySelectorAll('.edu-hack:not(.border)')
    .forEach((el) => el.remove());
  document.querySelectorAll('.edu-hack.border').forEach((el) => {
    el.classList.remove('edu-hack', 'border');
  });
  document.querySelectorAll('[data-keep-index]').forEach((el) => {
    const idx = el.getAttribute('data-keep-index');
    if (idx && originalSvgContents[Number(idx)]) {
      el.innerHTML = originalSvgContents[Number(idx)];
    }
    el.removeAttribute('data-keep-index');
  });

  isShowing = false;
  logger.info('Answers hidden');
  showToast('info', 'Answers hidden', 2000);
}

function toggleAnswers(): void {
  isShowing ? hideAnswers() : showAnswers();
}

// --- Toggle Button (Shadow DOM for persistence) ---

const CONTAINER_ID = 'edupage-cloak-revealer-root';
let shadowRoot: ShadowRoot | null = null;
let toggleBtn: HTMLButtonElement | null = null;

function createToggleButton(): HTMLButtonElement {
  const btn = document.createElement('button');
  btn.innerHTML = '👁️';
  btn.title = 'Toggle Answers';
  btn.className = 'edupage-revealer-btn';

  btn.addEventListener('click', () => {
    toggleAnswers();
    updateButtonState();
  });

  return btn;
}

function updateButtonState(): void {
  if (!toggleBtn) return;
  toggleBtn.innerHTML = isShowing ? '🙈' : '👁️';
  toggleBtn.classList.toggle('active', isShowing);
  toggleBtn.title = isShowing ? 'Hide Answers' : 'Show Answers';
}

function ensureButtonContainer(): HTMLElement {
  let container = document.getElementById(CONTAINER_ID);

  if (!container || !document.documentElement.contains(container)) {
    // Remove any orphaned containers
    document.querySelectorAll(`#${CONTAINER_ID}`).forEach((el) => el.remove());

    // Create new container with Shadow DOM
    container = document.createElement('div');
    container.id = CONTAINER_ID;

    // Attach shadow root
    shadowRoot = container.attachShadow({ mode: 'closed' });

    // Inject styles into shadow DOM
    const style = document.createElement('style');
    style.textContent = revealerStyles;
    shadowRoot.appendChild(style);

    // Create and add button
    toggleBtn = createToggleButton();
    shadowRoot.appendChild(toggleBtn);

    // Append to documentElement (html) not body - more stable
    document.documentElement.appendChild(container);

    logger.debug('Button container created');
  }

  return container;
}

function initButton(): void {
  ensureButtonContainer();

  // Watch for container removal (SPA navigation) and recreate
  const observer = new MutationObserver(() => {
    const container = document.getElementById(CONTAINER_ID);
    if (!container || !document.documentElement.contains(container)) {
      // Reset state on page change
      isShowing = false;
      ensureButtonContainer();
    }
  });

  observer.observe(document.documentElement, {
    childList: true,
    subtree: true,
  });
}

// Initialize button when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initButton);
} else {
  initButton();
}

// --- Expose API ---

window.__answerRevealer = {
  show: showAnswers,
  hide: hideAnswers,
  toggle: toggleAnswers,
  get isShowing() {
    return isShowing;
  },
};

logger.info('Answer revealer ready');
showToast('info', 'Answer revealer ready', 3000);
