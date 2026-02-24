'use client';

import { useEffect } from 'react';
import type { OptionResponse, ApprovalResponse } from '../lib/api';
import { useMediaUrl } from '../lib/use-media-url';
import { ApprovalButtons } from './approval-buttons';
import { ApprovalHistory } from './approval-history';

interface OptionLightboxProps {
  option: OptionResponse;
  onClose: () => void;
  onApprove: (decision: string, note?: string) => void;
  disableApproval?: boolean;
  approvals?: ApprovalResponse[];
  onConfirmApproval?: (approvalId: string) => void;
}

export function OptionLightbox({
  option,
  onClose,
  onApprove,
  disableApproval,
  approvals,
  onConfirmApproval,
}: OptionLightboxProps) {
  const mediaUrl = useMediaUrl(option.s3Key);

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

  function renderMedia() {
    // External URL link
    if (option.externalUrl) {
      return (
        <a
          href={option.externalUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="font-mono text-sm"
        >
          {option.externalUrl}
        </a>
      );
    }

    // Loading state
    if (!mediaUrl) {
      return <span className="text-lg font-bold">{option.mediaType}</span>;
    }

    switch (option.mediaType) {
      case 'IMAGE':
        return (
          <img
            src={mediaUrl}
            alt={option.fileName ?? 'Image'}
            className="max-h-[60vh] max-w-full"
            style={{ imageRendering: 'auto' }}
          />
        );
      case 'VIDEO':
        return (
          <video controls className="max-h-[60vh] max-w-full">
            <source src={mediaUrl} />
          </video>
        );
      case 'AUDIO':
        return (
          <audio controls className="w-full">
            <source src={mediaUrl} />
          </audio>
        );
      case 'PDF':
        return (
          <a
            href={mediaUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="font-mono text-sm"
          >
            Download PDF: {option.fileName ?? 'file.pdf'}
          </a>
        );
      default:
        return <span className="text-lg font-bold">{option.mediaType}</span>;
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
            {renderMedia()}
          </div>

          {/* Description */}
          {option.description && (
            <p className="text-sm mb-4">{option.description}</p>
          )}

          {/* Approval history */}
          {approvals && approvals.length > 0 && (
            <div className="mb-4">
              <ApprovalHistory approvals={approvals} />
              {onConfirmApproval &&
                approvals
                  .filter((a) => a.tentative && !a.confirmedAt)
                  .map((a) => (
                    <button
                      key={a.id}
                      onClick={() => onConfirmApproval(a.id)}
                      className="mt-1 px-2 py-1 text-xs border-2 border-black"
                    >
                      Confirm
                    </button>
                  ))}
            </div>
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
