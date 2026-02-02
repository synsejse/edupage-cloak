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

// Get the first DOM element from a widget's jQuery element
function getElement(widget: QuestionWidget): HTMLElement | null {
  // widget.element is a jQuery object, access first element with [0]
  if (!widget.element) return null;
  return widget.element[0] ?? null;
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
function warnIfSecured(widget: QuestionWidget): void {
  if (widget.props.isSecured) {
    const el = getElement(widget);
    el?.before(
      createInfoBox('Secured question - answers may be incorrect', true)
    );
  }
}

// Check if question has no answer
function checkNoAnswer(widget: QuestionWidget): boolean {
  const widgetClass = widget.getWidgetClass();

  const answerMap: Record<string, unknown> = {
    ConnectAnswerETestWidget: widget.props.pairs,
    GroupsAnswerETestWidget: widget.props.groups,
    OrderingAnswerETestWidget: widget.props.answers,
    MapAnswerETestWidget: widget.props.points,
    SvgAnswerETestWidget: widget.props.correctExpression,
  };

  const answers = answerMap[widgetClass] ?? widget.props.correctAnswers;

  if (!answers || (Array.isArray(answers) && answers.length === 0)) {
    const el = getElement(widget);
    el?.before(createInfoBox('No answer found for this question', true));
    return true;
  }

  return false;
}

// Escape HTML to prevent XSS
function escapeHtml(text: string): string {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Question handlers - keyed by WidgetClassName
const handlers: Partial<
  Record<WidgetClassName, (widget: QuestionWidget) => void>
> = {
  AbcdAnswerETestWidget(widget) {
    const answers = widget.props.correctAnswers;
    if (!answers || answers.length === 0) {
      checkNoAnswer(widget);
      return;
    }

    warnIfSecured(widget);

    const container = document.querySelector(`[data-wid="${widget.id}"]`);
    for (const id of answers) {
      container
        ?.querySelectorAll<HTMLElement>(`[data-answerid="${id}"]`)
        .forEach((el) => el.classList.add('edu-hack', 'border'));
    }
  },

  InputAnswerETestWidget(widget) {
    if (checkNoAnswer(widget)) return;
    warnIfSecured(widget);

    const correctAnswers = widget.props.correctAnswers ?? [];
    const text = correctAnswers.map((a) => `"${escapeHtml(a)}"`).join(' OR ');

    const el = getElement(widget);
    el?.before(createInfoBox(`<strong>Answer:</strong> ${text}`));

    // Also show incorrect answers if present (for drag-drop style inputs)
    const incorrectAnswers = widget.props.incorrectAnswers;
    if (incorrectAnswers && incorrectAnswers.length > 0) {
      logger.debug(
        `InputAnswer has ${incorrectAnswers.length} distractor answers`
      );
    }
  },

  OrderingAnswerETestWidget(widget) {
    if (checkNoAnswer(widget)) return;
    warnIfSecured(widget);

    const answers = widget.props.answers ?? [];
    const items = answers.map((a) => `<li>${escapeHtml(a.text)}</li>`).join('');

    const el = getElement(widget);
    el?.before(
      createInfoBox(`<strong>Correct order:</strong><ol>${items}</ol>`)
    );
  },

  GroupsAnswerETestWidget(widget) {
    const groups = widget.props.groups;
    if (!groups || groups.length === 0) {
      checkNoAnswer(widget);
      return;
    }

    warnIfSecured(widget);

    const html = groups
      .map((g) => {
        const items = g.items
          .map((i) => `<li>${escapeHtml(i.text)}</li>`)
          .join('');
        return `<div><strong>${escapeHtml(g.title)}</strong><ol>${items}</ol></div>`;
      })
      .join('');

    const el = getElement(widget);
    el?.before(createInfoBox(`<strong>Correct grouping:</strong>${html}`));
  },

  ConnectAnswerETestWidget(widget) {
    const pairs = widget.props.pairs;
    if (!pairs || pairs.length === 0) {
      checkNoAnswer(widget);
      return;
    }

    warnIfSecured(widget);

    const items = pairs
      .map((p) => `<li>${escapeHtml(p.l)} ↔ ${escapeHtml(p.r)}</li>`)
      .join('');

    const el = getElement(widget);
    el?.before(
      createInfoBox(`<strong>Correct pairs:</strong><ol>${items}</ol>`)
    );

    el?.classList.add('edu-hack', 'border');
  },

  MapAnswerETestWidget(widget) {
    const points = widget.props.points;
    if (!points || points.length === 0) {
      checkNoAnswer(widget);
      return;
    }

    warnIfSecured(widget);

    for (const p of points) {
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

    // Show point mapping info
    const el = getElement(widget);
    const info = points
      .filter((p) => p.text)
      .map((p) => `<li>${escapeHtml(p.text ?? '')}</li>`)
      .join('');

    if (info) {
      el?.before(createInfoBox(`<strong>Map points:</strong><ol>${info}</ol>`));
    }
  },

  SvgAnswerETestWidget(widget) {
    const expr = widget.props.correctExpression;
    if (!expr) {
      checkNoAnswer(widget);
      return;
    }

    warnIfSecured(widget);

    const answers = parseSvgExpression(expr);
    const answersExtended = widget.answersExtended as
      | SvgAnswerExtended
      | undefined;

    for (const key of Object.keys(answersExtended ?? {})) {
      const el = document.querySelector<SVGElement>(`#wq${widget.id}---${key}`);
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

    const items = answers.map((a) => `<li>${escapeHtml(a)}</li>`).join('');
    const el = getElement(widget);
    el?.before(
      createInfoBox(`<strong>Correct answers:</strong><ol>${items}</ol>`)
    );
  },

  ElaborationETestWidget(widget) {
    warnIfSecured(widget);

    const { maxScore, enableUpload } = widget.props;

    const uploadEnabled = enableUpload === 'enabled';
    const info = [
      '<strong>Essay/Elaboration question</strong>',
      `Max score: ${maxScore ?? 'N/A'}`,
      uploadEnabled ? 'File upload enabled' : null,
      '(No correct answer - manually graded)',
    ]
      .filter(Boolean)
      .join('<br>');

    const el = getElement(widget);
    el?.before(createInfoBox(info));
    logger.debug(`Elaboration: maxScore=${maxScore}, upload=${uploadEnabled}`);
  },

  // Handle image-based answer widgets
  ImageAnswerETestWidget(widget) {
    warnIfSecured(widget);

    const el = getElement(widget);
    el?.before(
      createInfoBox(
        '<strong>Image selection question</strong><br>(Visual answer required)',
        false
      )
    );
  },

  // Handle iframe-based widgets (external content)
  IframeAnswerETestWidget(widget) {
    warnIfSecured(widget);

    const el = getElement(widget);
    el?.before(
      createInfoBox(
        '<strong>External content question</strong><br>(Answer in embedded frame)',
        false
      )
    );
  },
};

// Main API functions
function showAnswers(): void {
  ensureStyles();

  const materialObj = window.materialObj;
  if (!materialObj) {
    logger.error('materialObj not found');
    showToast(
      'error',
      'Test not loaded yet - wait for page to fully load',
      5000
    );
    return;
  }

  // Check if test is secured
  if (materialObj.isSecured || materialObj.isSecuredCards) {
    logger.warn('Test is secured - some answers may not be available');
    showToast('error', 'Test is secured - answers may be hidden', 5000);
  }

  const widgets = materialObj.getAllAnswerWidgets();
  logger.info(`Processing ${widgets.length} answer widgets`);

  let processed = 0;
  let skipped = 0;

  for (const widget of widgets) {
    try {
      const widgetClass = widget.getWidgetClass();
      const handler = handlers[widgetClass];

      if (handler) {
        handler(widget);
        processed++;
      } else {
        // Try to handle unknown widget types gracefully
        logger.warn(`Unknown widget type: ${widgetClass}`);
        skipped++;

        // Show generic info for unknown types
        const el = getElement(widget);
        if (el) {
          el.before(
            createInfoBox(
              `<em>Unknown question type: ${escapeHtml(widgetClass)}</em>`,
              true
            )
          );
        }
      }
    } catch (e) {
      logger.error(`Error processing widget ${widget.id}: ${e}`);
      skipped++;
    }
  }

  isShowing = true;
  logger.info(`Answers shown: ${processed} processed, ${skipped} skipped`);
  showToast('success', `Revealed ${processed} answers`, 3000);
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

  // Clear SVG originals cache
  svgOriginals = {};
  svgIndex = 0;

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
