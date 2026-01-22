// Toast - Singleton notification system with progress bar and hover-to-pause

import toastStyles from '../styles/toast.css';
import { icons } from '../icons';

const TOAST_GLOBAL_KEY = '__edupage_cloak_toast__';

interface ToastAPI {
  info: (msg: string, duration?: number) => void;
  warn: (msg: string, duration?: number) => void;
  error: (msg: string, duration?: number) => void;
  success: (msg: string, duration?: number) => void;
  debug: (msg: string, duration?: number) => void;
  show: (msg: string, options?: ToastOptions) => void;
  clear: () => void;
}

// Shared style element for dynamic keyframes
let dynamicStyleEl: HTMLStyleElement | null = null;

function ensureDynamicStyles(): HTMLStyleElement {
  if (!dynamicStyleEl || !document.head.contains(dynamicStyleEl)) {
    dynamicStyleEl = document.createElement('style');
    dynamicStyleEl.id = 'toast-dynamic-styles';
    document.head.appendChild(dynamicStyleEl);
  }
  return dynamicStyleEl;
}

function createToastManager(): ToastAPI {
  let container: HTMLElement | null = null;
  let messageCount = 0;
  let stylesInitialized = false;

  function initStyles(): void {
    if (stylesInitialized || document.getElementById('toast-styles')) {
      stylesInitialized = true;
      return;
    }

    const style = document.createElement('style');
    style.id = 'toast-styles';
    style.textContent = toastStyles;
    (document.head || document.documentElement).appendChild(style);
    stylesInitialized = true;
  }

  function getContainer(position: 'top' | 'bottom' = 'top'): HTMLElement {
    initStyles();

    // Check if existing container is still in DOM
    if (container && !document.documentElement.contains(container)) {
      container = null;
    }

    if (!container) {
      // Clean up orphaned containers
      document
        .querySelectorAll('#edupage-cloak-toast-container')
        .forEach((el) => el.remove());

      container = document.createElement('div');
      container.id = 'edupage-cloak-toast-container';
      (document.body || document.documentElement).appendChild(container);
    }

    container.classList.toggle('bottom', position === 'bottom');
    return container;
  }

  function dismiss(toastEl: HTMLElement): void {
    if (!toastEl.parentElement) return;

    toastEl.classList.add('removing');

    setTimeout(() => {
      toastEl.remove();

      // Clean up empty container
      if (container?.children.length === 0) {
        container.remove();
        container = null;
      }
    }, 300);
  }

  function show(message: string, options: ToastOptions = {}): void {
    const { duration = 3000, type = 'info', position = 'top' } = options;
    const toastContainer = getContainer(position);
    const id = `toast-${++messageCount}`;

    // Build toast element
    const toastEl = document.createElement('div');
    toastEl.id = id;
    toastEl.className = `edupage-toast ${type}`;
    toastEl.setAttribute('role', 'alert');
    toastEl.setAttribute('aria-live', 'polite');

    toastEl.innerHTML = `
      <div class="edupage-toast-icon">${icons[type]}</div>
      <div class="edupage-toast-content">
        <p class="edupage-toast-message">${escapeHtml(message)}</p>
      </div>
      <button class="edupage-toast-close" aria-label="Dismiss notification">${icons.close}</button>
      ${duration > 0 ? '<div class="edupage-toast-progress"></div>' : ''}
    `;

    // Event handlers
    const closeBtn = toastEl.querySelector('.edupage-toast-close')!;
    closeBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      dismiss(toastEl);
    });

    toastEl.addEventListener('click', () => dismiss(toastEl));

    // Progress bar and auto-dismiss
    if (duration > 0) {
      const progressEl = toastEl.querySelector<HTMLElement>(
        '.edupage-toast-progress'
      )!;
      progressEl.style.animation = `progressShrink ${duration}ms linear forwards`;

      let timeoutId: ReturnType<typeof setTimeout>;
      let remainingTime = duration;
      let startTime = Date.now();
      let progress = 1; // 1 = full, 0 = empty

      const startTimer = () => {
        startTime = Date.now();
        timeoutId = setTimeout(() => dismiss(toastEl), remainingTime);
      };

      const pauseTimer = () => {
        clearTimeout(timeoutId);
        const elapsed = Date.now() - startTime;
        remainingTime = Math.max(0, remainingTime - elapsed);
        progress = remainingTime / duration;

        // Freeze progress bar at current position
        progressEl.style.animation = 'none';
        progressEl.style.transform = `scaleX(${progress})`;
      };

      const resumeTimer = () => {
        if (remainingTime <= 0) return;

        // Create resume animation starting from current progress
        const animName = `progressResume_${id}`;
        const styleEl = ensureDynamicStyles();
        styleEl.textContent += `
          @keyframes ${animName} {
            from { transform: scaleX(${progress}); }
            to { transform: scaleX(0); }
          }
        `;

        progressEl.style.animation = `${animName} ${remainingTime}ms linear forwards`;
        startTimer();
      };

      toastEl.addEventListener('mouseenter', pauseTimer);
      toastEl.addEventListener('mouseleave', resumeTimer);
      startTimer();
    }

    toastContainer.appendChild(toastEl);
  }

  function clear(): void {
    container?.remove();
    container = null;
  }

  return {
    info: (msg, duration = 3000) => show(msg, { type: 'info', duration }),
    warn: (msg, duration = 3000) => show(msg, { type: 'warn', duration }),
    error: (msg, duration = 5000) => show(msg, { type: 'error', duration }),
    success: (msg, duration = 3000) => show(msg, { type: 'success', duration }),
    debug: (msg, duration = 2000) => show(msg, { type: 'debug', duration }),
    show,
    clear,
  };
}

// Simple HTML escaping
function escapeHtml(text: string): string {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Singleton getter
function getToast(): ToastAPI {
  if (typeof window === 'undefined') {
    return createToastManager();
  }

  const win = window as unknown as Record<string, unknown>;
  const existing = win[TOAST_GLOBAL_KEY] as ToastAPI | undefined;

  if (existing) {
    return existing;
  }

  const instance = createToastManager();
  win[TOAST_GLOBAL_KEY] = instance;
  window.toast = instance;
  return instance;
}

export const toast = getToast();
