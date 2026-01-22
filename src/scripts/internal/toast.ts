// Toast Utility
// Display timed debug messages on screen for mobile debugging
// Uses a global singleton pattern to prevent duplicate declarations when
// multiple scripts import this module in the same execution context (MAIN world)

import toastStyles from '../styles/toast.css';

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

// SVG icons for each toast type
const ICONS: Record<ToastType, string> = {
  info: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>`,
  warn: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><path d="M12 9v4"/><path d="M12 17h.01"/></svg>`,
  error: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="m15 9-6 6"/><path d="m9 9 6 6"/></svg>`,
  success: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="m9 12 2 2 4-4"/></svg>`,
  debug: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m18 16 4-4-4-4"/><path d="m6 8-4 4 4 4"/><path d="m14.5 4-5 16"/></svg>`,
};

function createToastManager(): ToastAPI {
  let container: HTMLElement | null = null;
  let messageCount = 0;
  let initialized = false;

  function initialize(): void {
    if (initialized) return;

    // Check if styles already exist
    if (document.getElementById('toast-styles')) {
      initialized = true;
      return;
    }

    // Add styles to document
    const style = document.createElement('style');
    style.id = 'toast-styles';
    style.textContent = toastStyles;
    (document.head || document.documentElement).appendChild(style);

    initialized = true;
  }

  function ensureContainer(position: 'top' | 'bottom' = 'top'): HTMLElement {
    initialize();

    // Always check if container exists in DOM first
    if (!container) {
      container = document.getElementById(
        'edupage-cloak-toast-container'
      ) as HTMLElement;
    }

    // If still not found, create it
    if (!container || !document.documentElement.contains(container)) {
      // Remove any orphaned containers first
      const existing = document.querySelectorAll(
        '#edupage-cloak-toast-container'
      );
      existing.forEach((el) => el.remove());

      container = document.createElement('div');
      container.id = 'edupage-cloak-toast-container';

      // Wait for body to be ready
      if (document.body) {
        document.body.appendChild(container);
      } else {
        document.documentElement.appendChild(container);
      }
    }

    // Update position class
    if (position === 'bottom') {
      container.classList.add('bottom');
    } else {
      container.classList.remove('bottom');
    }

    return container;
  }

  function show(message: string, options: ToastOptions = {}): void {
    const { duration = 3000, type = 'info', position = 'top' } = options;

    const toastContainer = ensureContainer(position);

    const toastEl = document.createElement('div');
    const id = `toast-${++messageCount}`;
    toastEl.id = id;
    toastEl.className = `edupage-toast ${type}`;
    toastEl.setAttribute('data-toast-id', id);
    toastEl.setAttribute('role', 'alert');
    toastEl.setAttribute('aria-live', 'polite');

    // Create icon
    const iconEl = document.createElement('div');
    iconEl.className = 'edupage-toast-icon';
    iconEl.innerHTML = ICONS[type];

    // Create content wrapper
    const contentEl = document.createElement('div');
    contentEl.className = 'edupage-toast-content';

    // Create message
    const messageEl = document.createElement('p');
    messageEl.className = 'edupage-toast-message';
    messageEl.textContent = message;
    contentEl.appendChild(messageEl);

    // Create close button
    const closeEl = document.createElement('button');
    closeEl.className = 'edupage-toast-close';
    closeEl.setAttribute('aria-label', 'Dismiss notification');
    closeEl.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>`;
    closeEl.addEventListener('click', (e) => {
      e.stopPropagation();
      dismiss(toastEl);
    });

    // Assemble toast
    toastEl.appendChild(iconEl);
    toastEl.appendChild(contentEl);
    toastEl.appendChild(closeEl);

    // Add progress bar for timed toasts
    let progressEl: HTMLElement | null = null;
    if (duration > 0) {
      progressEl = document.createElement('div');
      progressEl.className = 'edupage-toast-progress';
      progressEl.style.animation = `progressShrink ${duration}ms linear forwards`;
      toastEl.appendChild(progressEl);
    }

    // Click anywhere on toast to dismiss
    toastEl.addEventListener('click', () => {
      dismiss(toastEl);
    });

    // Add to container (new toasts go to the bottom)
    toastContainer.appendChild(toastEl);

    // Auto dismiss with pause on hover
    if (duration > 0) {
      let timeoutId: ReturnType<typeof setTimeout> | null = null;
      let remainingTime = duration;
      let startTime = Date.now();
      let currentProgress = 1; // 1 = full bar, 0 = empty

      const startTimer = () => {
        startTime = Date.now();
        timeoutId = setTimeout(() => {
          dismiss(toastEl);
        }, remainingTime);
      };

      const pauseTimer = () => {
        if (timeoutId) {
          clearTimeout(timeoutId);
          timeoutId = null;
          const elapsed = Date.now() - startTime;
          remainingTime -= elapsed;
          if (remainingTime < 0) remainingTime = 0;
          // Calculate current progress (how much of the bar is left)
          currentProgress = remainingTime / duration;
        }
        // Pause progress bar by setting a static transform
        if (progressEl) {
          progressEl.style.animation = 'none';
          progressEl.style.transform = `scaleX(${currentProgress})`;
        }
      };

      const resumeTimer = () => {
        if (remainingTime > 0 && progressEl) {
          // Create a custom animation that starts from current progress
          const animationName = `progressResume_${id}`;
          const keyframes = `
            @keyframes ${animationName} {
              from { transform: scaleX(${currentProgress}); }
              to { transform: scaleX(0); }
            }
          `;
          // Inject keyframes if not already present
          let styleEl = document.getElementById(`${animationName}-style`);
          if (!styleEl) {
            styleEl = document.createElement('style');
            styleEl.id = `${animationName}-style`;
            document.head.appendChild(styleEl);
          }
          styleEl.textContent = keyframes;

          // Apply the animation
          progressEl.style.animation = `${animationName} ${remainingTime}ms linear forwards`;
          startTimer();
        }
      };

      toastEl.addEventListener('mouseenter', pauseTimer);
      toastEl.addEventListener('mouseleave', resumeTimer);

      // Start initial timer
      startTimer();
    }
  }

  function dismiss(toastEl: HTMLElement): void {
    if (!toastEl.parentElement) return;

    toastEl.classList.add('removing');

    setTimeout(() => {
      toastEl.remove();

      // Clean up container if empty
      if (container && container.children.length === 0) {
        container.remove();
        container = null;
      }
    }, 300);
  }

  function clear(): void {
    if (container) {
      container.remove();
      container = null;
    }
  }

  return {
    info: (msg: string, duration = 3000) =>
      show(msg, { type: 'info', duration }),

    warn: (msg: string, duration = 3000) =>
      show(msg, { type: 'warn', duration }),

    error: (msg: string, duration = 5000) =>
      show(msg, { type: 'error', duration }),

    success: (msg: string, duration = 3000) =>
      show(msg, { type: 'success', duration }),

    debug: (msg: string, duration = 2000) =>
      show(msg, { type: 'debug', duration }),

    show: (msg: string, options?: ToastOptions) => show(msg, options),

    clear: () => clear(),
  };
}

// Use existing global instance if available, otherwise create new one
function getToast(): ToastAPI {
  if (typeof window !== 'undefined') {
    // Return existing instance if already initialized
    const existing = (window as any)[TOAST_GLOBAL_KEY] as ToastAPI | undefined;
    if (existing) {
      return existing;
    }

    // Create and store new instance
    const instance = createToastManager();
    (window as any)[TOAST_GLOBAL_KEY] = instance;
    window.toast = instance;
    return instance;
  }

  // Fallback for non-browser environments (shouldn't happen, but type-safe)
  return createToastManager();
}

// Export the singleton
export const toast = getToast();
