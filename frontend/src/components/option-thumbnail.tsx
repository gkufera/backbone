'use client';

import type { OptionResponse } from '../lib/api';
import { useMediaUrl } from '../lib/use-media-url';

interface OptionThumbnailProps {
  option: OptionResponse;
  approvalState: 'APPROVED' | 'MAYBE' | 'REJECTED' | null;
  onClick: () => void;
}

const BORDER_CLASS: Record<string, string> = {
  APPROVED: 'option-border-approved',
  MAYBE: 'option-border-maybe',
  REJECTED: 'option-border-rejected',
};

export function OptionThumbnail({ option, approvalState, onClick }: OptionThumbnailProps) {
  const borderClass = approvalState ? BORDER_CLASS[approvalState] : 'border-2 border-black';

  // Priority: thumbnailS3Key > s3Key (for IMAGE/VIDEO) > null (text fallback)
  const imageKey =
    option.thumbnailS3Key ??
    (['IMAGE', 'VIDEO'].includes(option.mediaType) ? option.s3Key : null);
  const mediaUrl = useMediaUrl(imageKey);

  return (
    <button
      onClick={onClick}
      className={`${borderClass} relative w-24 h-24 flex items-center justify-center bg-white cursor-pointer overflow-hidden`}
    >
      {mediaUrl ? (
        <img
          src={mediaUrl}
          alt={option.fileName ?? option.mediaType}
          className="w-full h-full object-cover"
          style={{ imageRendering: 'auto' }}
        />
      ) : (
        <span className="text-xs font-bold">{option.mediaType}</span>
      )}
    </button>
  );
}
