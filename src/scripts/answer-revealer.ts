// Answer Revealer - Display correct answers for EduPage tests

import { createLogger } from './internal/logger';
import revealerStyles from './styles/answer-revealer.css';
import answerBoxStyles from './styles/answer-boxes.css';

const logger = createLogger('revealer');

const STYLES_ID = 'edupage-cloak-answer-styles';
const CONTAINER_ID = 'edupage-cloak-revealer-root';

let isShowing = false;
let svgOriginals: Record<number, string> = {};
let svgIndex = 0;
let shadowRoot: ShadowRoot | null = null;
let toggleBtn: HTMLButtonElement | null = null;

// Toast helper - uses global toast from inject.ts
function showToast(
  type: 'info' | 'success' | 'error',
  msg: string,
  duration = 2000
): void {
  window.toast?.[type]?.(msg, duration);
}

// Inject answer box styles into page DOM
function ensureStyles(): void {
  if (document.getElementById(STYLES_ID)) return;

  const style = document.createElement('style');
  style.id = STYLES_ID;
  style.textContent = answerBoxStyles;
  (document.head || document.documentElement).appendChild(style);
}

// Create info box element
function createInfoBox(html: string, isWarning = false): HTMLDivElement {
  const div = document.createElement('div');
  div.className = `edu-hack edu-hack-info${isWarning ? ' warning' : ''}`;
  div.innerHTML = html;
  return div;
}

// Parse SVG expression into readable answers
function parseSvgExpression(expr: string): string[] {
  const answers: Record<string, string[]> = {};

  for (const part of expr.split(/&&|\|\|/)) {
    const match = part.match(/g_(\w+)\s*==\s*"(\w+)"/);
    if (match) {
      const [, variable, value] = match;
      (answers[variable] ??= []).push(value);
    }
  }

  return Object.entries(answers).map(
    ([k, v]) => `${k} = ${[...new Set(v)].join(' / ')}`
  );
}

// Show warning for secured questions
function warnIfSecured(q: QuestionWidget): void {
  if (q.props.isSecured) {
    q.element[0]?.before(
      createInfoBox('Secured question - answers may be incorrect', true)
    );
  }
}

// Check if question has no answer
function checkNoAnswer(q: QuestionWidget): boolean {
  const widgetClass = q.getWidgetClass();

  const answerMap: Record<string, unknown> = {
    ConnectAnswerETestWidget: q.props.pairs,
    GroupsAnswerETestWidget: q.props.groups,
    OrderingAnswerETestWidget: q.props.answers,
    MapAnswerETestWidget: q.props.points,
    SvgAnswerETestWidget: q.props.correctExpression,
  };

  const answers = answerMap[widgetClass] ?? q.props.correctAnswers;

  if (!answers || (Array.isArray(answers) && answers.length === 0)) {
    q.element[0]?.before(
      createInfoBox('No answer found for this question', true)
    );
    return true;
  }

  return false;
}

// Question handlers
const handlers: Record<string, (q: QuestionWidget) => void> = {
  AbcdAnswerETestWidget(q) {
    const answers = q.props.correctAnswers;
    if (!answers) return;

    warnIfSecured(q);

    const container = document.querySelector(`[data-wid="${q.id}"]`);
    for (const id of answers) {
      container
        ?.querySelectorAll<HTMLElement>(`[data-answerid="${id}"]`)
        .forEach((el) => el.classList.add('edu-hack', 'border'));
    }
  },

  InputAnswerETestWidget(q) {
    if (checkNoAnswer(q)) return;
    warnIfSecured(q);

    const text = q.props.correctAnswers!.map((a) => `"${a}"`).join(' OR ');
    q.element[0]?.before(createInfoBox(`<strong>Answer:</strong> ${text}`));
  },

  OrderingAnswerETestWidget(q) {
    if (checkNoAnswer(q)) return;
    warnIfSecured(q);

    const items = q.props.answers!.map((a) => `<li>${a.text}</li>`).join('');
    q.element[0]?.before(
      createInfoBox(`<strong>Correct order:</strong><ol>${items}</ol>`)
    );
  },

  GroupsAnswerETestWidget(q) {
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
  },

  ConnectAnswerETestWidget(q) {
    warnIfSecured(q);

    const items = q.props
      .pairs!.map((p) => `<li>${p.l} ↔ ${p.r}</li>`)
      .join('');
    q.element[0]?.before(
      createInfoBox(`<strong>Correct pairs:</strong><ol>${items}</ol>`)
    );

    q.element[0]?.classList.add('edu-hack', 'border');
  },

  MapAnswerETestWidget(q) {
    warnIfSecured(q);

    for (const p of q.props.points!) {
      const answer = document.querySelector<HTMLElement>(
        `[data-id="${p.pointid}"]`
      );
      const target = document.querySelector<HTMLElement>(
        `[data-id="${p.r_pointid}"]`
      );

      if (!answer || !target) continue;

      answer.addEventListener(
        'mouseenter',
        () => (target.style.backgroundColor = '#4CAF50')
      );
      answer.addEventListener(
        'mouseleave',
        () => (target.style.backgroundColor = '')
      );
      answer.classList.add('edu-hack');
    }
  },

  SvgAnswerETestWidget(q) {
    warnIfSecured(q);

    const answers = parseSvgExpression(q.props.correctExpression!);

    for (const key of Object.keys(q.answersExtended || {})) {
      const el = document.querySelector<SVGElement>(`#wq${q.id}---${key}`);
      if (!el) continue;

      const label = key.replace('g_', '');
      const tspan = el.querySelector('tspan');

      if (tspan) {
        svgOriginals[svgIndex] = tspan.outerHTML;
        tspan.setAttribute('data-keep-index', String(svgIndex++));
        tspan.textContent = label;
      } else {
        const circle = el.querySelector('circle');
        if (!circle) continue;

        svgOriginals[svgIndex] = el.innerHTML;
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
        newTspan.setAttribute(
          'y',
          String(Number(circle.getAttribute('cy')) + 8)
        );
        newTspan.style.cssText =
          'font-size:24px;font-family:Arial;fill:#FF5722';

        text.appendChild(newTspan);
        el.appendChild(text);
      }
    }

    const items = answers.map((a) => `<li>${a}</li>`).join('');
    q.element[0]?.before(
      createInfoBox(`<strong>Correct answers:</strong><ol>${items}</ol>`)
    );
  },

  ElaborationETestWidget(q) {
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
    logger.debug(`Elaboration: maxScore=${maxScore}, upload=${uploadEnabled}`);
  },
};

// Main API functions
function showAnswers(): void {
  ensureStyles();

  if (!window.materialObj) {
    logger.error('materialObj not found');
    showToast(
      'error',
      'Test not loaded yet - wait for page to fully load',
      5000
    );
    return;
  }

  const widgets = (window.materialObj as MaterialObj).getAllAnswerWidgets();

  for (const q of widgets) {
    try {
      const handler = handlers[q.getWidgetClass()];
      if (handler) {
        handler(q);
      } else {
        logger.warn(`Unknown widget: ${q.getWidgetClass()}`);
      }
    } catch (e) {
      logger.error(`Error processing widget: ${e}`);
    }
  }

  isShowing = true;
  logger.info('Answers shown');
  showToast('success', 'Answers revealed', 3000);
}

function hideAnswers(): void {
  // Remove info boxes (non-border elements)
  document
    .querySelectorAll('.edu-hack:not(.border)')
    .forEach((el) => el.remove());

  // Remove highlight borders
  document
    .querySelectorAll('.edu-hack.border')
    .forEach((el) => el.classList.remove('edu-hack', 'border'));

  // Restore SVG elements
  document.querySelectorAll('[data-keep-index]').forEach((el) => {
    const idx = Number(el.getAttribute('data-keep-index'));
    if (svgOriginals[idx]) {
      el.innerHTML = svgOriginals[idx];
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

// Toggle button (Shadow DOM for isolation)
function updateButtonState(): void {
  if (!toggleBtn) return;

  toggleBtn.innerHTML = isShowing ? '🙈' : '👁️';
  toggleBtn.title = isShowing ? 'Hide Answers' : 'Show Answers';
  toggleBtn.classList.toggle('active', isShowing);
}

function createToggleButton(): HTMLButtonElement {
  const btn = document.createElement('button');
  btn.className = 'edupage-revealer-btn';
  btn.innerHTML = '👁️';
  btn.title = 'Toggle Answers';

  btn.addEventListener('click', () => {
    toggleAnswers();
    updateButtonState();
  });

  return btn;
}

function ensureButtonContainer(): void {
  let container = document.getElementById(CONTAINER_ID);

  if (container && document.documentElement.contains(container)) {
    return;
  }

  // Clean up orphaned containers
  document.querySelectorAll(`#${CONTAINER_ID}`).forEach((el) => el.remove());

  // Create new container with Shadow DOM
  container = document.createElement('div');
  container.id = CONTAINER_ID;

  shadowRoot = container.attachShadow({ mode: 'closed' });

  // Inject styles
  const style = document.createElement('style');
  style.textContent = revealerStyles;
  shadowRoot.appendChild(style);

  // Create button
  toggleBtn = createToggleButton();
  shadowRoot.appendChild(toggleBtn);

  // Append to documentElement for stability
  document.documentElement.appendChild(container);

  logger.debug('Button container created');
}

function initButton(): void {
  ensureButtonContainer();

  // Watch for container removal (SPA navigation)
  const observer = new MutationObserver(() => {
    if (!document.getElementById(CONTAINER_ID)) {
      isShowing = false;
      ensureButtonContainer();
    }
  });

  observer.observe(document.documentElement, {
    childList: true,
    subtree: true,
  });
}

// Initialize
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initButton);
} else {
  initButton();
}

// Expose API
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
