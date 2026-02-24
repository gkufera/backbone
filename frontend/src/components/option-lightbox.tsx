'use client';

import { useEffect } from 'react';
import type { OptionResponse } from '../lib/api';
import { ApprovalButtons } from './approval-buttons';

interface OptionLightboxProps {
  option: OptionResponse;
  onClose: () => void;
  onApprove: (decision: string, note?: string) => void;
  disableApproval?: boolean;
}

export function OptionLightbox({
  option,
  onClose,
  onApprove,
  disableApproval,
}: OptionLightboxProps) {
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        onClose();
      }
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  function handleBackdropClick(e: React.MouseEvent) {
    if (e.target === e.currentTarget) {
      onClose();
    }
  }

  return (
    <div
      data-testid="lightbox-backdrop"
      className="fixed inset-0 bg-white bg-opacity-90 flex items-center justify-center z-50"
      onClick={handleBackdropClick}
    >
      <div className="mac-window max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="mac-window-title flex items-center justify-between">
          <span>{option.fileName ?? option.mediaType}</span>
          <button
            onClick={onClose}
            className="bg-transparent border-none text-white hover:bg-white hover:text-black px-2"
          >
            X
          </button>
        </div>
        <div className="mac-window-body">
          {/* Media preview area */}
          <div className="border-2 border-black p-6 mb-4 flex items-center justify-center min-h-[200px]">
            {option.externalUrl ? (
              <a
                href={option.externalUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="font-mono text-sm"
              >
                {option.externalUrl}
              </a>
            ) : (
              <span className="text-lg font-bold">{option.mediaType}</span>
            )}
          </div>

          {/* Description */}
          {option.description && (
            <p className="text-sm mb-4">{option.description}</p>
          )}

          {/* Approval buttons */}
          <div className="border-t-2 border-black pt-3">
            <ApprovalButtons
              onSubmit={onApprove}
              disabled={disableApproval}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
