'use client';

import { useState, useEffect, useRef } from 'react';
import { scriptsApi } from '../lib/api';

interface ProcessingProgressProps {
  scriptId: string;
  onComplete: (newStatus: string) => void;
}

export function ProcessingProgress({ scriptId, onComplete }: ProcessingProgressProps) {
  const [percent, setPercent] = useState(0);
  const [step, setStep] = useState('Starting...');
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function poll() {
      try {
        const { status, progress } = await scriptsApi.getProcessingStatus(scriptId);

        if (cancelled) return;

        if (status !== 'PROCESSING') {
          if (intervalRef.current) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
          }
          onComplete(status);
          return;
        }

        if (progress) {
          setPercent(progress.percent);
          setStep(progress.step);
        }
      } catch {
        // Silently retry on next interval
      }
    }

    // Initial poll
    poll();

    // Set up polling interval
    intervalRef.current = setInterval(poll, 2000);

    return () => {
      cancelled = true;
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [scriptId, onComplete]);

  return (
    <div className="mac-window">
      <div className="mac-window-title">
        <span>Processing Script</span>
      </div>
      <div className="mac-window-body p-4">
        <div className="border-2 border-black">
          <div
            role="progressbar"
            className="h-4 bg-black transition-all duration-300"
            style={{ width: `${percent}%` }}
            aria-valuenow={percent}
            aria-valuemin={0}
            aria-valuemax={100}
          />
        </div>
        <p className="mt-2 text-sm font-mono">{step}</p>
        <p className="mt-1 text-xs font-mono">{percent}% complete</p>
      </div>
    </div>
  );
}
