// Toast Utility
// Display timed debug messages on screen for mobile debugging
// Uses a global singleton pattern to prevent duplicate declarations when
// multiple scripts import this module in the same execution context (MAIN world)

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
    // Use viewport-relative units to stay consistent regardless of page zoom
    // 1vmin = 1% of the smaller viewport dimension
    style.textContent = `
      #edupage-cloak-toast-container {
        position: fixed;
        top: max(1.5vmin, 10px);
        left: 50%;
        transform: translateX(-50%);
        z-index: 999999;
        pointer-events: none;
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: max(1vmin, 8px);
        width: min(90vw, 420px);
      }

      #edupage-cloak-toast-container.bottom {
        top: auto;
        bottom: max(1.5vmin, 10px);
      }

      .edupage-toast {
        display: flex;
        align-items: flex-start;
        gap: max(1.2vmin, 10px);
        padding: max(1.4vmin, 12px) max(1.6vmin, 14px);
        border-radius: max(1.2vmin, 10px);
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', sans-serif;
        font-size: max(1.4vmin, 13px);
        font-weight: 500;
        line-height: 1.4;
        box-shadow:
          0 max(0.4vmin, 3px) max(0.8vmin, 6px) -1px rgba(0, 0, 0, 0.15),
          0 max(0.2vmin, 2px) max(0.4vmin, 4px) -2px rgba(0, 0, 0, 0.1),
          0 0 0 1px rgba(0, 0, 0, 0.05);
        pointer-events: auto;
        cursor: pointer;
        word-wrap: break-word;
        box-sizing: border-box;
        width: 100%;
        animation: toastSlideIn 0.35s cubic-bezier(0.21, 1.02, 0.73, 1) forwards;
        position: relative;
        overflow: hidden;
        backdrop-filter: blur(8px);
        -webkit-backdrop-filter: blur(8px);
        transition: transform 0.2s ease, box-shadow 0.2s ease;
      }

      .edupage-toast:hover {
        transform: translateY(max(-0.2vmin, -2px)) scale(1.01);
        box-shadow:
          0 max(1vmin, 8px) max(1.5vmin, 12px) -3px rgba(0, 0, 0, 0.15),
          0 max(0.4vmin, 4px) max(0.6vmin, 6px) -4px rgba(0, 0, 0, 0.1),
          0 0 0 1px rgba(0, 0, 0, 0.05);
      }

      .edupage-toast:hover .edupage-toast-progress {
        animation-play-state: paused;
      }

      .edupage-toast-icon {
        flex-shrink: 0;
        display: flex;
        align-items: center;
        justify-content: center;
        width: max(2.4vmin, 22px);
        height: max(2.4vmin, 22px);
        border-radius: 50%;
        background: rgba(255, 255, 255, 0.2);
      }

      .edupage-toast-icon svg {
        width: max(1.6vmin, 14px);
        height: max(1.6vmin, 14px);
      }

      .edupage-toast-content {
        flex: 1;
        min-width: 0;
        padding-top: max(0.2vmin, 2px);
      }

      .edupage-toast-message {
        margin: 0;
        word-break: break-word;
      }

      .edupage-toast-close {
        flex-shrink: 0;
        display: flex;
        align-items: center;
        justify-content: center;
        width: max(2vmin, 18px);
        height: max(2vmin, 18px);
        border: none;
        background: rgba(255, 255, 255, 0.1);
        border-radius: 50%;
        cursor: pointer;
        opacity: 0.7;
        transition: opacity 0.2s, background 0.2s, transform 0.2s;
        color: inherit;
        padding: 0;
        margin-top: max(0.2vmin, 2px);
      }

      .edupage-toast-close:hover {
        opacity: 1;
        background: rgba(255, 255, 255, 0.25);
        transform: scale(1.15);
      }

      .edupage-toast-close svg {
        width: max(1.2vmin, 11px);
        height: max(1.2vmin, 11px);
      }

      .edupage-toast-progress {
        position: absolute;
        bottom: 0;
        left: 0;
        width: 100%;
        height: max(0.3vmin, 3px);
        background: rgba(255, 255, 255, 0.4);
        border-radius: 0 0 max(1.2vmin, 10px) max(1.2vmin, 10px);
        transform-origin: left;
      }

      .edupage-toast.removing {
        animation: toastSlideOut 0.3s cubic-bezier(0.06, 0.71, 0.55, 1) forwards;
      }

      /* Type-specific styles */
      .edupage-toast.info {
        background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
        color: #fff;
      }

      .edupage-toast.warn {
        background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
        color: #fff;
      }

      .edupage-toast.error {
        background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
        color: #fff;
      }

      .edupage-toast.success {
        background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%);
        color: #fff;
      }

      .edupage-toast.debug {
        background: linear-gradient(135deg, #6b7280 0%, #4b5563 100%);
        color: #fff;
      }

      @keyframes toastSlideIn {
        0% {
          opacity: 0;
          transform: translateY(-20px) scale(0.95);
        }
        100% {
          opacity: 1;
          transform: translateY(0) scale(1);
        }
      }

      @keyframes toastSlideOut {
        0% {
          opacity: 1;
          transform: translateY(0) scale(1);
          max-height: 150px;
          margin-bottom: 0;
        }
        100% {
          opacity: 0;
          transform: translateY(-10px) scale(0.95);
          max-height: 0;
          margin-bottom: max(-1vmin, -8px);
          padding-top: 0;
          padding-bottom: 0;
        }
      }

      @keyframes progressShrink {
        from {
          transform: scaleX(1);
        }
        to {
          transform: scaleX(0);
        }
      }

      /* Dark mode support */
      @media (prefers-color-scheme: dark) {
        .edupage-toast {
          box-shadow:
            0 max(0.4vmin, 3px) max(0.8vmin, 6px) -1px rgba(0, 0, 0, 0.35),
            0 max(0.2vmin, 2px) max(0.4vmin, 4px) -2px rgba(0, 0, 0, 0.25),
            0 0 0 1px rgba(255, 255, 255, 0.05);
        }

        .edupage-toast:hover {
          box-shadow:
            0 max(1vmin, 8px) max(1.5vmin, 12px) -3px rgba(0, 0, 0, 0.45),
            0 max(0.4vmin, 4px) max(0.6vmin, 6px) -4px rgba(0, 0, 0, 0.35),
            0 0 0 1px rgba(255, 255, 255, 0.05);
        }
      }

      /* Reduced motion */
      @media (prefers-reduced-motion: reduce) {
        .edupage-toast {
          animation: none;
          opacity: 1;
        }
        .edupage-toast.removing {
          animation: none;
          display: none;
        }
        .edupage-toast-progress {
          animation: none !important;
        }
      }
    `;
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
    if (duration > 0) {
      const progressEl = document.createElement('div');
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

    // Auto dismiss
    if (duration > 0) {
      setTimeout(() => {
        dismiss(toastEl);
      }, duration);
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
