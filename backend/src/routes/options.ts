import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { requireAuth, type AuthenticatedRequest } from '../middleware/auth.js';
import { generateMediaUploadUrl, generateDownloadUrl } from '../lib/s3.js';
import {
  mediaTypeFromMime,
  OPTION_ALLOWED_CONTENT_TYPES,
  OPTION_DESCRIPTION_MAX_LENGTH,
} from '@backbone/shared/constants';
import { MediaType, OptionStatus } from '@backbone/shared/types';
import { notifyProductionMembers } from '../services/notification-service.js';

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

// Create an option for an element
optionsRouter.post('/api/elements/:elementId/options', requireAuth, async (req, res) => {
  try {
    const authReq = req as AuthenticatedRequest;
    const { elementId } = req.params;
    const { mediaType, description, s3Key, fileName, externalUrl, thumbnailS3Key } = req.body;

    // Find element with script to get productionId
    const element = await prisma.element.findUnique({
      where: { id: elementId },
      include: { script: { select: { productionId: true } } },
    });

    if (!element) {
      res.status(404).json({ error: 'Element not found' });
      return;
    }

    // Check membership
    const membership = await prisma.productionMember.findUnique({
      where: {
        productionId_userId: {
          productionId: element.script.productionId,
          userId: authReq.user.userId,
        },
      },
    });

    if (!membership) {
      res.status(403).json({ error: 'You are not a member of this production' });
      return;
    }

    // Check if element is locked (has an approved option)
    const approvedOption = await prisma.approval.findFirst({
      where: {
        decision: 'APPROVED',
        option: {
          elementId,
          status: OptionStatus.ACTIVE,
        },
      },
    });

    if (approvedOption) {
      res.status(409).json({ error: 'Element is locked: an option has been approved' });
      return;
    }

    // Validate mediaType
    if (!mediaType || !Object.values(MediaType).includes(mediaType)) {
      res.status(400).json({ error: 'Valid mediaType is required' });
      return;
    }

    // Validate description length
    if (description && description.length > OPTION_DESCRIPTION_MAX_LENGTH) {
      res.status(400).json({
        error: `Description must not exceed ${OPTION_DESCRIPTION_MAX_LENGTH} characters`,
      });
      return;
    }

    // Validate LINK requires externalUrl
    if (mediaType === MediaType.LINK && !externalUrl) {
      res.status(400).json({ error: 'externalUrl is required for LINK options' });
      return;
    }

    // Validate externalUrl format for LINK options
    if (mediaType === MediaType.LINK && externalUrl) {
      try {
        const url = new URL(externalUrl);
        if (url.protocol !== 'http:' && url.protocol !== 'https:') {
          throw new Error('Invalid protocol');
        }
      } catch {
        res.status(400).json({ error: 'externalUrl must be a valid HTTP or HTTPS URL' });
        return;
      }
    }

    // Validate file-based types require s3Key
    if (mediaType !== MediaType.LINK && !s3Key) {
      res.status(400).json({ error: 's3Key is required for file-based options' });
      return;
    }

    const option = await prisma.option.create({
      data: {
        elementId,
        mediaType,
        description: description || null,
        s3Key: s3Key || null,
        fileName: fileName || null,
        externalUrl: externalUrl || null,
        thumbnailS3Key: thumbnailS3Key || null,
        status: OptionStatus.ACTIVE,
        readyForReview: false,
        uploadedById: authReq.user.userId,
      },
    });

    res.status(201).json({ option });
  } catch (error) {
    console.error('Create option error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// List options for an element
optionsRouter.get('/api/elements/:elementId/options', requireAuth, async (req, res) => {
  try {
    const authReq = req as AuthenticatedRequest;
    const { elementId } = req.params;
    const includeArchived = req.query.includeArchived === 'true';

    // Find element with script to get productionId
    const element = await prisma.element.findUnique({
      where: { id: elementId },
      include: { script: { select: { productionId: true } } },
    });

    if (!element) {
      res.status(404).json({ error: 'Element not found' });
      return;
    }

    // Check membership
    const membership = await prisma.productionMember.findUnique({
      where: {
        productionId_userId: {
          productionId: element.script.productionId,
          userId: authReq.user.userId,
        },
      },
    });

    if (!membership) {
      res.status(403).json({ error: 'You are not a member of this production' });
      return;
    }

    const where: { elementId: string; status?: OptionStatus } = { elementId };
    if (!includeArchived) {
      where.status = OptionStatus.ACTIVE;
    }

    const options = await prisma.option.findMany({
      where,
      include: { uploadedBy: { select: { id: true, name: true } } },
      orderBy: { createdAt: 'desc' },
    });

    res.json({ options });
  } catch (error) {
    console.error('List options error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update an option (description, readyForReview, status)
optionsRouter.patch('/api/options/:id', requireAuth, async (req, res) => {
  try {
    const authReq = req as AuthenticatedRequest;
    const { id } = req.params;
    const { description, readyForReview, status } = req.body;

    // Find option with element→script to get productionId
    const option = await prisma.option.findUnique({
      where: { id },
      include: { element: { include: { script: { select: { productionId: true } } } } },
    });

    if (!option) {
      res.status(404).json({ error: 'Option not found' });
      return;
    }

    // Check membership
    const membership = await prisma.productionMember.findUnique({
      where: {
        productionId_userId: {
          productionId: option.element.script.productionId,
          userId: authReq.user.userId,
        },
      },
    });

    if (!membership) {
      res.status(403).json({ error: 'You are not a member of this production' });
      return;
    }

    // Validate description length
    if (description !== undefined && description.length > OPTION_DESCRIPTION_MAX_LENGTH) {
      res.status(400).json({
        error: `Description must not exceed ${OPTION_DESCRIPTION_MAX_LENGTH} characters`,
      });
      return;
    }

    const updateData: { description?: string; readyForReview?: boolean; status?: OptionStatus } =
      {};
    if (description !== undefined) updateData.description = description;
    if (readyForReview !== undefined) updateData.readyForReview = readyForReview;
    if (status !== undefined) updateData.status = status;

    const updated = await prisma.option.update({
      where: { id },
      data: updateData,
    });

    // Update element workflow state when option marked readyForReview
    if (readyForReview === true && option.element.workflowState === 'PENDING') {
      await prisma.element.update({
        where: { id: option.elementId },
        data: { workflowState: 'OUTSTANDING' },
      });
    }

    // Notify production members when option marked ready for review
    if (readyForReview === true) {
      const elementName = option.element.name ?? 'an element';
      const productionId = option.element.script.productionId;
      const link = `/productions/${productionId}/scripts/${option.element.scriptId}/elements/${option.elementId}`;
      await notifyProductionMembers(
        productionId,
        authReq.user.userId,
        'OPTION_READY',
        `New option on ${elementName} is ready for review`,
        link,
      );
    }

    res.json({ option: updated });
  } catch (error) {
    console.error('Update option error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export { optionsRouter };
