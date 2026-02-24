'use client';

import type { OptionResponse } from '../lib/api';

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

  return (
    <button
      onClick={onClick}
      className={`${borderClass} w-20 h-20 flex items-center justify-center bg-white cursor-pointer overflow-hidden`}
    >
      {option.thumbnailS3Key ? (
        <span className="text-xs font-mono">{option.fileName ?? 'file'}</span>
      ) : (
        <span className="text-xs font-bold">{option.mediaType}</span>
      )}
    </button>
  );
}
