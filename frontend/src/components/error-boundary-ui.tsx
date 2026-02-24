'use client';

interface ErrorBoundaryUIProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export function ErrorBoundaryUI({ reset }: ErrorBoundaryUIProps) {
  return (
    <div className="mx-auto max-w-xl p-6">
      <div className="mac-alert-error p-4">
        <h2 className="mb-2 text-lg">Something went wrong</h2>
        <p className="mb-4 font-mono text-sm">
          An unexpected error occurred. Please try again.
        </p>
        <button onClick={reset} className="mac-btn-primary">
          Try Again
        </button>
      </div>
    </div>
  );
}
