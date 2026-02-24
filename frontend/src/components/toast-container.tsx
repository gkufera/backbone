'use client';

import { useToast } from '../lib/toast-context';

export function ToastContainer() {
  const { toasts, dismiss } = useToast();

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`mac-toast ${toast.type === 'error' ? 'mac-toast-error' : ''}`}
        >
          <span className="font-mono text-sm">{toast.message}</span>
          <button
            onClick={() => dismiss(toast.id)}
            aria-label="Dismiss"
            className="ml-3 text-xs"
          >
            X
          </button>
        </div>
      ))}
    </div>
  );
}
