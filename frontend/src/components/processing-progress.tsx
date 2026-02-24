'use client';

import { useState, useEffect, useRef } from 'react';
import { scriptsApi } from '../lib/api';

interface ProcessingProgressProps {
  scriptId: string;
  onComplete: (newStatus: string) => void;
}

const TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes
const MAX_CONSECUTIVE_ERRORS = 3;

export function ProcessingProgress({ scriptId, onComplete }: ProcessingProgressProps) {
  const [percent, setPercent] = useState(0);
  const [step, setStep] = useState('Starting...');
  const [pollError, setPollError] = useState<string | null>(null);
  const [timedOut, setTimedOut] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const errorCountRef = useRef(0);
  const startTimeRef = useRef(Date.now());

  useEffect(() => {
    let cancelled = false;

    async function poll() {
      // Check for timeout
      if (Date.now() - startTimeRef.current > TIMEOUT_MS) {
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
        setTimedOut(true);
        return;
      }

      try {
        const { status, progress } = await scriptsApi.getProcessingStatus(scriptId);

        if (cancelled) return;

        // Reset error count on success
        errorCountRef.current = 0;
        setPollError(null);

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
        errorCountRef.current += 1;
        if (errorCountRef.current >= MAX_CONSECUTIVE_ERRORS) {
          setPollError('Polling failed — unable to reach server. Retrying...');
        }
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
        {timedOut ? (
          <p className="text-sm font-bold">
            Processing is taking longer than expected. Please refresh the page to check status.
          </p>
        ) : (
          <>
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
            {pollError && (
              <p className="mt-2 text-sm font-bold">{pollError}</p>
            )}
          </>
        )}
      </div>
    </div>
  );
}
