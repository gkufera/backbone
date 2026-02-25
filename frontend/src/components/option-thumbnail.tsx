'use client';

import type { OptionResponse } from '../lib/api';
import { useMediaUrl } from '../lib/use-media-url';

interface OptionThumbnailProps {
  option: OptionResponse;
  approvalState: 'APPROVED' | 'MAYBE' | 'REJECTED' | null;
  onClick: () => void;
  onApprove?: (decision: string) => void;
  readyForReview?: boolean;
  hasNotes?: boolean;
}

const BORDER_CLASS: Record<string, string> = {
  APPROVED: 'option-border-approved',
  REJECTED: 'option-border-rejected',
};

export function OptionThumbnail({
  option,
  approvalState,
  onClick,
  onApprove,
  readyForReview,
  hasNotes,
}: OptionThumbnailProps) {
  const borderClass =
    approvalState && BORDER_CLASS[approvalState]
      ? BORDER_CLASS[approvalState]
      : 'border-2 border-black';

  // Read from assets array (first asset), fall back to null for LINK options
  const firstAsset = option.assets?.[0] ?? null;
  const imageKey =
    firstAsset?.thumbnailS3Key ??
    (firstAsset && ['IMAGE', 'VIDEO'].includes(firstAsset.mediaType) ? firstAsset.s3Key : null);
  const mediaUrl = useMediaUrl(imageKey);

  const showApprovalButtons = readyForReview && onApprove;

  return (
    <div className="flex flex-col items-center">
      <button
        onClick={onClick}
        className={`${borderClass} relative w-24 h-24 flex items-center justify-center bg-white cursor-pointer overflow-hidden`}
      >
        {mediaUrl ? (
          <img
            src={mediaUrl}
            alt={firstAsset?.fileName ?? option.mediaType}
            className="w-full h-full object-cover"
            style={{ imageRendering: 'auto' }}
          />
        ) : (
          <span className="text-xs">{option.mediaType}</span>
        )}

        {approvalState === 'REJECTED' && (
          <div data-testid="rejected-overlay" className="rejected-x-overlay">
            &#x2715;
          </div>
        )}

        {hasNotes && (
          <div
            data-testid="notes-icon"
            className="absolute top-0 right-0 bg-black text-white text-xs px-1 leading-tight"
          >
            &#x1F4C4;
          </div>
        )}
      </button>

      {showApprovalButtons && (
        <div className="flex gap-1 mt-1">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onApprove('APPROVED');
            }}
            className="approval-btn-approved px-1.5 py-0.5 text-xs"
          >
            Y
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onApprove('MAYBE');
            }}
            className="approval-btn-maybe px-1.5 py-0.5 text-xs"
          >
            M
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onApprove('REJECTED');
            }}
            className="approval-btn-rejected px-1.5 py-0.5 text-xs"
          >
            N
          </button>
        </div>
      )}
    </div>
  );
}
