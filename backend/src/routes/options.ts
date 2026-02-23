import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { generateMediaUploadUrl, generateDownloadUrl } from '../lib/s3.js';
import { mediaTypeFromMime, OPTION_ALLOWED_CONTENT_TYPES } from '@backbone/shared/constants';

const optionsRouter = Router();

// Generate presigned upload URL for option media
optionsRouter.post('/api/options/upload-url', requireAuth, async (req, res) => {
  try {
    const { fileName, contentType, thumbnailFileName } = req.body;

    if (!fileName) {
      res.status(400).json({ error: 'fileName is required' });
      return;
    }

    if (!contentType || !OPTION_ALLOWED_CONTENT_TYPES.includes(contentType)) {
      res.status(400).json({ error: 'Unsupported content type' });
      return;
    }

    const mediaType = mediaTypeFromMime(contentType);
    const { uploadUrl, s3Key } = await generateMediaUploadUrl(fileName, contentType);

    const result: Record<string, string | null> = { uploadUrl, s3Key, mediaType };

    if (thumbnailFileName) {
      const thumbnail = await generateMediaUploadUrl(thumbnailFileName, 'image/jpeg');
      result.thumbnailUploadUrl = thumbnail.uploadUrl;
      result.thumbnailS3Key = thumbnail.s3Key;
    }

    res.json(result);
  } catch (error) {
    console.error('Generate option upload URL error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Generate presigned download URL for option media
optionsRouter.get('/api/options/download-url', requireAuth, async (req, res) => {
  try {
    const s3Key = req.query.s3Key as string;

    if (!s3Key) {
      res.status(400).json({ error: 's3Key is required' });
      return;
    }

    const downloadUrl = await generateDownloadUrl(s3Key);
    res.json({ downloadUrl });
  } catch (error) {
    console.error('Generate download URL error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export { optionsRouter };
