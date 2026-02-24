import { useState, useEffect } from 'react';
import { optionsApi } from './api';

/**
 * Hook that resolves an S3 key to a presigned download URL.
 * Returns null while loading or if s3Key is null/on error.
 */
export function useMediaUrl(s3Key: string | null): string | null {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!s3Key) {
      setUrl(null);
      return;
    }

    let cancelled = false;

    optionsApi
      .getDownloadUrl(s3Key)
      .then(({ downloadUrl }) => {
        if (!cancelled) {
          setUrl(downloadUrl);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setUrl(null);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [s3Key]);

  return url;
}
