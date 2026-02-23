import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { requireAuth, type AuthenticatedRequest } from '../middleware/auth.js';
import { generateUploadUrl } from '../lib/s3.js';
import { processScript } from '../services/script-processor.js';
import { SCRIPT_ALLOWED_MIME_TYPES } from '@backbone/shared/constants';
import { ScriptStatus, ElementStatus } from '@backbone/shared/types';

const scriptsRouter = Router();

// Generate presigned upload URL
scriptsRouter.post('/api/scripts/upload-url', requireAuth, async (req, res) => {
  try {
    const { fileName, contentType } = req.body;

    if (!fileName) {
      res.status(400).json({ error: 'fileName is required' });
      return;
    }

    if (!contentType || !SCRIPT_ALLOWED_MIME_TYPES.includes(contentType as any)) {
      res.status(400).json({ error: 'Only PDF files are allowed' });
      return;
    }

    const result = await generateUploadUrl(fileName, contentType);
    res.json(result);
  } catch (error) {
    console.error('Generate upload URL error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create a script record after upload
scriptsRouter.post('/api/productions/:id/scripts', requireAuth, async (req, res) => {
  try {
    const authReq = req as AuthenticatedRequest;
    const { id } = req.params;
    const { title, fileName, s3Key } = req.body;

    // Check membership
    const membership = await prisma.productionMember.findUnique({
      where: {
        productionId_userId: {
          productionId: id,
          userId: authReq.user.userId,
        },
      },
    });

    if (!membership) {
      const exists = await prisma.production.findUnique({ where: { id } });
      if (!exists) {
        res.status(404).json({ error: 'Production not found' });
        return;
      }
      res.status(403).json({ error: 'You are not a member of this production' });
      return;
    }

    if (!title || !fileName || !s3Key) {
      res.status(400).json({ error: 'title, fileName, and s3Key are required' });
      return;
    }

    const script = await prisma.script.create({
      data: {
        productionId: id,
        title,
        fileName,
        s3Key,
        status: ScriptStatus.PROCESSING,
        uploadedById: authReq.user.userId,
      },
    });

    // Fire-and-forget: process the script asynchronously
    processScript(script.id, s3Key).catch((err) =>
      console.error('Background script processing failed:', err),
    );

    res.status(201).json({ script });
  } catch (error) {
    console.error('Create script error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// List scripts for a production
scriptsRouter.get('/api/productions/:id/scripts', requireAuth, async (req, res) => {
  try {
    const authReq = req as AuthenticatedRequest;
    const { id } = req.params;

    // Check membership
    const membership = await prisma.productionMember.findUnique({
      where: {
        productionId_userId: {
          productionId: id,
          userId: authReq.user.userId,
        },
      },
    });

    if (!membership) {
      res.status(403).json({ error: 'You are not a member of this production' });
      return;
    }

    const scripts = await prisma.script.findMany({
      where: { productionId: id },
      orderBy: { createdAt: 'desc' },
    });

    res.json({ scripts });
  } catch (error) {
    console.error('List scripts error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get a single script with elements
scriptsRouter.get('/api/productions/:id/scripts/:scriptId', requireAuth, async (req, res) => {
  try {
    const authReq = req as AuthenticatedRequest;
    const { id, scriptId } = req.params;

    // Check membership
    const membership = await prisma.productionMember.findUnique({
      where: {
        productionId_userId: {
          productionId: id,
          userId: authReq.user.userId,
        },
      },
    });

    if (!membership) {
      res.status(403).json({ error: 'You are not a member of this production' });
      return;
    }

    const script = await prisma.script.findUnique({
      where: { id: scriptId, productionId: id },
      include: {
        elements: {
          where: { status: ElementStatus.ACTIVE },
          orderBy: { name: 'asc' },
        },
      },
    });

    if (!script) {
      res.status(404).json({ error: 'Script not found' });
      return;
    }

    res.json({ script });
  } catch (error) {
    console.error('Get script error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export { scriptsRouter };
