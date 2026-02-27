'use client';

import { useState, useEffect, useCallback } from 'react';
import type { OptionResponse, ApprovalResponse, OptionAssetResponse } from '../lib/api';
import { useMediaUrl } from '../lib/use-media-url';
import { ApprovalButtons } from './approval-buttons';
import { ApprovalHistory } from './approval-history';
import { OptionNotes } from './option-notes';

interface OptionLightboxProps {
  option: OptionResponse;
  productionId: string;
  onClose: () => void;
  onApprove: (decision: string, note?: string) => void;
  disableApproval?: boolean;
  approvals?: ApprovalResponse[];
  onConfirmApproval?: (approvalId: string) => void;
  composerName?: string;
  composerDepartment?: string;
}

export function OptionLightbox({
  option,
  productionId,
  onClose,
  onApprove,
  disableApproval,
  approvals,
  onConfirmApproval,
  composerName,
  composerDepartment,
}: OptionLightboxProps) {
  const assets = option.assets ?? [];
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    setCurrentIndex(0);
  }, [option.id]);

  const currentAsset: OptionAssetResponse | undefined = assets[currentIndex];
  const mediaUrl = useMediaUrl(currentAsset?.s3Key ?? null);

  const goNext = useCallback(() => {
    if (currentIndex < assets.length - 1) {
      setCurrentIndex((i) => i + 1);
    }
  }, [currentIndex, assets.length]);

  const goPrev = useCallback(() => {
    if (currentIndex > 0) {
      setCurrentIndex((i) => i - 1);
    }
  }, [currentIndex]);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'ArrowRight') {
        goNext();
      } else if (e.key === 'ArrowLeft') {
        goPrev();
      }
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose, goNext, goPrev]);

  function handleBackdropClick(e: React.MouseEvent) {
    if (e.target === e.currentTarget) {
      onClose();
    }
  }

  function renderAssetMedia(asset: OptionAssetResponse | undefined, url: string | null) {
    // External URL link (no assets)
    if (option.externalUrl && !asset) {
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

    if (!asset) {
      return <span className="text-lg">{option.mediaType}</span>;
    }

    // Loading state
    if (!url) {
      return <span className="text-lg">{asset.mediaType}</span>;
    }

    switch (asset.mediaType) {
      case 'IMAGE':
        return (
          <img
            src={url}
            alt={asset.fileName ?? 'Image'}
            className="max-h-[60vh] max-w-full"
            style={{ imageRendering: 'auto' }}
          />
        );
      case 'VIDEO':
        return (
          <video controls className="max-h-[60vh] max-w-full">
            <source src={url} />
          </video>
        );
      case 'AUDIO':
        return (
          <audio controls className="w-full">
            <source src={url} />
          </audio>
        );
      case 'PDF':
        return (
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="font-mono text-sm"
          >
            Download PDF: {asset.fileName ?? 'file.pdf'}
          </a>
        );
      default:
        return <span className="text-lg">{asset.mediaType}</span>;
    }
  }

  const titleText = currentAsset?.fileName ?? option.mediaType;

  return (
    <div
      data-testid="lightbox-backdrop"
      className="fixed inset-0 bg-white flex items-center justify-center z-50"
      onClick={handleBackdropClick}
    >
      <div className="mac-window max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="mac-window-title flex items-center justify-between">
          <span>{titleText}</span>
          <button
            onClick={onClose}
            className="bg-transparent border-none text-white hover:bg-white hover:text-black px-2"
          >
            X
          </button>
        </div>
        <div className="mac-window-body">
          {/* Media preview area */}
          <div className="border-2 border-black p-6 mb-4 flex items-center justify-center min-h-[200px] relative">
            {assets.length > 1 && (
              <button
                onClick={goPrev}
                disabled={currentIndex === 0}
                className="absolute left-2 border-2 border-black px-2 py-1 text-sm bg-white text-black hover:bg-black hover:text-white disabled:opacity-50"
                aria-label="Previous asset"
              >
                &lt;
              </button>
            )}
            {renderAssetMedia(currentAsset, mediaUrl)}
            {assets.length > 1 && (
              <button
                onClick={goNext}
                disabled={currentIndex === assets.length - 1}
                className="absolute right-2 border-2 border-black px-2 py-1 text-sm bg-white text-black hover:bg-black hover:text-white disabled:opacity-50"
                aria-label="Next asset"
              >
                &gt;
              </button>
            )}
          </div>

          {/* Asset counter */}
          {assets.length > 1 && (
            <p className="text-xs text-center mb-4 font-mono" data-testid="asset-counter">
              {currentIndex + 1} / {assets.length}
            </p>
          )}

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
                  .filter((a) => a.tentative)
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

          {/* Option notes */}
          <OptionNotes optionId={option.id} productionId={productionId} composerName={composerName} composerDepartment={composerDepartment} />

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
