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
    style.textContent = `
      #edupage-cloak-toast-container {
        position: fixed;
        top: 10px;
        left: 50%;
        transform: translateX(-50%);
        z-index: 999999;
        pointer-events: none;
        width: 90%;
        max-width: 500px;
        display: grid;
        grid-template-columns: 1fr;
        grid-auto-rows: auto;
        gap: 8px;
        align-content: start;
      }

      #edupage-cloak-toast-container.bottom {
        top: auto;
        bottom: 10px;
      }

      .edupage-toast {
        padding: 12px 16px;
        border-radius: 6px;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        font-size: 14px;
        font-weight: 500;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
        pointer-events: auto;
        cursor: pointer;
        word-wrap: break-word;
        max-width: 100%;
        width: 100%;
        box-sizing: border-box;
        animation: slideIn 0.3s ease-out forwards;
        position: relative;
        min-height: 20px;
      }

      .edupage-toast.removing {
        animation: slideOut 0.3s ease-in forwards;
      }

      .edupage-toast.info {
        background: #2f80ed;
        color: #fff;
      }

      .edupage-toast.warn {
        background: #f1c40f;
        color: #663c00;
      }

      .edupage-toast.error {
        background: #c0392b;
        color: #fff;
      }

      .edupage-toast.success {
        background: #27ae60;
        color: #fff;
      }

      .edupage-toast.debug {
        background: #7f8c8d;
        color: #fff;
      }

      @keyframes slideIn {
        from {
          opacity: 0;
          transform: translateY(-10px);
        }
        to {
          opacity: 1;
          transform: translateY(0);
        }
      }

      @keyframes slideOut {
        from {
          opacity: 1;
          transform: translateY(0);
          max-height: 200px;
          margin-bottom: 8px;
        }
        to {
          opacity: 0;
          transform: translateY(-10px);
          max-height: 0;
          margin-bottom: 0;
          padding-top: 0;
          padding-bottom: 0;
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
    toastEl.textContent = message;
    toastEl.setAttribute('data-toast-id', id);

    // Click to dismiss
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
