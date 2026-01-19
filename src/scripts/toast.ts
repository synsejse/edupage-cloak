// Toast Utility
// Display timed debug messages on screen for mobile debugging

export type ToastType = 'info' | 'warn' | 'error' | 'success' | 'debug';

interface ToastOptions {
  duration?: number; // milliseconds, 0 = permanent
  type?: ToastType;
  position?: 'top' | 'bottom';
}

class ToastManager {
  private container: HTMLElement | null = null;
  private messageCount = 0;
  private initialized = false;

  private initialize(): void {
    if (this.initialized) return;

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
    document.head.appendChild(style);

    this.initialized = true;
  }

  private ensureContainer(position: 'top' | 'bottom' = 'top'): HTMLElement {
    this.initialize();

    // Always check if container exists in DOM first
    if (!this.container) {
      this.container = document.getElementById(
        'edupage-cloak-toast-container'
      ) as HTMLElement;
    }

    // If still not found, create it
    if (!this.container || !document.body.contains(this.container)) {
      // Remove any orphaned containers first
      const existing = document.querySelectorAll(
        '#edupage-cloak-toast-container'
      );
      existing.forEach((el) => el.remove());

      this.container = document.createElement('div');
      this.container.id = 'edupage-cloak-toast-container';

      // Wait for body to be ready
      if (document.body) {
        document.body.appendChild(this.container);
      } else {
        document.documentElement.appendChild(this.container);
      }
    }

    // Update position class
    if (position === 'bottom') {
      this.container.classList.add('bottom');
    } else {
      this.container.classList.remove('bottom');
    }

    return this.container;
  }

  show(message: string, options: ToastOptions = {}): void {
    const { duration = 3000, type = 'info', position = 'top' } = options;

    const container = this.ensureContainer(position);

    const toast = document.createElement('div');
    const id = `toast-${++this.messageCount}`;
    toast.id = id;
    toast.className = `edupage-toast ${type}`;
    toast.textContent = message;
    toast.setAttribute('data-toast-id', id);

    // Click to dismiss
    toast.addEventListener('click', () => {
      this.dismiss(toast);
    });

    // Add to container (new toasts go to the bottom)
    container.appendChild(toast);

    // Auto dismiss
    if (duration > 0) {
      setTimeout(() => {
        this.dismiss(toast);
      }, duration);
    }
  }

  private dismiss(toast: HTMLElement): void {
    if (!toast.parentElement) return;

    toast.classList.add('removing');

    setTimeout(() => {
      toast.remove();

      // Clean up container if empty
      if (this.container && this.container.children.length === 0) {
        this.container.remove();
        this.container = null;
      }
    }, 300);
  }

  clear(): void {
    if (this.container) {
      this.container.remove();
      this.container = null;
    }
  }
}

// Singleton instance
const toastManager = new ToastManager();

// Export convenient methods
export const toast = {
  info: (msg: string, duration = 3000) =>
    toastManager.show(msg, { type: 'info', duration }),

  warn: (msg: string, duration = 3000) =>
    toastManager.show(msg, { type: 'warn', duration }),

  error: (msg: string, duration = 5000) =>
    toastManager.show(msg, { type: 'error', duration }),

  success: (msg: string, duration = 3000) =>
    toastManager.show(msg, { type: 'success', duration }),

  debug: (msg: string, duration = 2000) =>
    toastManager.show(msg, { type: 'debug', duration }),

  show: (msg: string, options?: ToastOptions) =>
    toastManager.show(msg, options),

  clear: () => toastManager.clear(),
};

// Make it globally available for easy debugging
if (typeof window !== 'undefined') {
  (window as any).toast = toast;
}
