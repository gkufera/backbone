import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { requireAuth, type AuthenticatedRequest } from '../middleware/auth.js';
import { generateUploadUrl, generateDownloadUrl } from '../lib/s3.js';
import { processScript } from '../services/script-processor.js';
import { processRevision } from '../services/revision-processor.js';
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
          include: {
            _count: {
              select: { options: { where: { status: 'ACTIVE' } } },
            },
          },
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

// Upload a new revision of an existing script
scriptsRouter.post(
  '/api/productions/:id/scripts/:scriptId/revisions',
  requireAuth,
  async (req, res) => {
    try {
      const authReq = req as AuthenticatedRequest;
      const { id, scriptId } = req.params;
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
        res.status(403).json({ error: 'You are not a member of this production' });
        return;
      }

      // Find parent script
      const parentScript = await prisma.script.findUnique({
        where: { id: scriptId, productionId: id },
      });

      if (!parentScript) {
        res.status(404).json({ error: 'Parent script not found' });
        return;
      }

      if (parentScript.status !== ScriptStatus.READY) {
        res.status(400).json({ error: 'Parent script must be READY to upload a revision' });
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
          version: parentScript.version + 1,
          parentScriptId: scriptId,
          uploadedById: authReq.user.userId,
        },
      });

      // Fire-and-forget: process the revision asynchronously
      processRevision(script.id, scriptId, s3Key).catch((err) =>
        console.error('Background revision processing failed:', err),
      );

      res.status(201).json({ script });
    } catch (error) {
      console.error('Upload revision error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  },
);

// Get version history for a script
scriptsRouter.get(
  '/api/productions/:id/scripts/:scriptId/versions',
  requireAuth,
  async (req, res) => {
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
      });

      if (!script) {
        res.status(404).json({ error: 'Script not found' });
        return;
      }

      // Walk the chain: find all scripts in the version chain
      // Get all scripts in this production and filter the chain
      const allScripts = await prisma.script.findMany({
        where: { productionId: id },
        orderBy: { version: 'desc' },
        select: {
          id: true,
          title: true,
          version: true,
          status: true,
          pageCount: true,
          createdAt: true,
          parentScriptId: true,
        },
      });

      // Build version chain by traversing parentScriptId
      const scriptMap = new Map(allScripts.map((s) => [s.id, s]));
      const chain: typeof allScripts = [];

      // Walk up from current script to root
      let current = scriptMap.get(scriptId);
      while (current) {
        chain.push(current);
        current = current.parentScriptId ? scriptMap.get(current.parentScriptId) : undefined;
      }

      // Also find any child scripts that link to scripts in our chain
      const chainIds = new Set(chain.map((s) => s.id));
      for (const s of allScripts) {
        if (!chainIds.has(s.id) && s.parentScriptId && chainIds.has(s.parentScriptId)) {
          chain.push(s);
          chainIds.add(s.id);
        }
      }

      // Sort by version descending
      chain.sort((a, b) => b.version - a.version);

      res.json({ versions: chain });
    } catch (error) {
      console.error('Get versions error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  },
);

// Generate presigned download URL for a script's PDF
scriptsRouter.get('/api/scripts/:scriptId/download-url', requireAuth, async (req, res) => {
  try {
    const authReq = req as AuthenticatedRequest;
    const { scriptId } = req.params;

    // Find script to get productionId and s3Key
    const script = await prisma.script.findUnique({
      where: { id: scriptId },
    });

    if (!script) {
      res.status(404).json({ error: 'Script not found' });
      return;
    }

    // Check membership
    const membership = await prisma.productionMember.findUnique({
      where: {
        productionId_userId: {
          productionId: script.productionId,
          userId: authReq.user.userId,
        },
      },
    });

    if (!membership) {
      res.status(403).json({ error: 'You are not a member of this production' });
      return;
    }

    const downloadUrl = await generateDownloadUrl(script.s3Key);
    res.json({ downloadUrl });
  } catch (error) {
    console.error('Generate download URL error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export { scriptsRouter };
