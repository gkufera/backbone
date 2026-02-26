import { Router } from 'express';
import { prisma } from '../lib/prisma';
import { requireAuth, type AuthenticatedRequest } from '../middleware/auth';
import { parsePagination } from '../lib/pagination';
import { generateUploadUrl, generateDownloadUrl } from '../lib/s3';
import { processScript } from '../services/script-processor';
import { processRevision } from '../services/revision-processor';
import { getProgress } from '../services/processing-progress';
import { SCRIPT_ALLOWED_MIME_TYPES } from '@backbone/shared/constants';
import { ScriptStatus, ScriptFormat, ElementStatus, NotificationType, OptionStatus, ApprovalDecision } from '@backbone/shared/types';
import type { SceneInfo } from '@backbone/shared/types';
import { notifyProductionMembers } from '../services/notification-service';
import { generateImpliedElements } from '../services/implied-elements';
import { requireActiveProduction } from '../lib/require-active-production';

const scriptsRouter = Router();

// Generate presigned upload URL
scriptsRouter.post('/api/scripts/upload-url', requireAuth, async (req, res) => {
  try {
    const { fileName, contentType } = req.body;

    if (!fileName) {
      res.status(400).json({ error: 'fileName is required' });
      return;
    }

    if (!contentType || !(SCRIPT_ALLOWED_MIME_TYPES as readonly string[]).includes(contentType)) {
      res.status(400).json({ error: 'Only PDF and FDX files are allowed' });
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

    // Block mutations on PENDING productions
    if (!(await requireActiveProduction(id, res))) return;

    if (!title || !fileName || !s3Key) {
      res.status(400).json({ error: 'title, fileName, and s3Key are required' });
      return;
    }

    const format = fileName.toLowerCase().endsWith('.fdx') ? ScriptFormat.FDX : ScriptFormat.PDF;

    const script = await prisma.script.create({
      data: {
        productionId: id,
        title,
        fileName,
        s3Key,
        status: ScriptStatus.PROCESSING,
        format,
        uploadedById: authReq.user.userId,
      },
    });

    // Fire-and-forget: process the script asynchronously
    processScript(script.id, s3Key).catch((err) =>
      console.error('Background script processing failed:', err),
    );

    // Fire-and-forget: notify all members about new script
    notifyProductionMembers(
      id,
      authReq.user.userId,
      NotificationType.SCRIPT_UPLOADED,
      `New script uploaded: "${title}"`,
      `/productions/${id}/scripts/${script.id}`,
    ).catch((err) => console.error('Failed to send script upload notifications:', err));

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

    const { take, skip } = parsePagination(req);
    const scripts = await prisma.script.findMany({
      where: { productionId: id },
      orderBy: { createdAt: 'desc' },
      take,
      skip,
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
            department: {
              select: { id: true, name: true, color: true },
            },
            _count: {
              select: { options: { where: { status: OptionStatus.ACTIVE } } },
            },
            options: {
              where: { status: OptionStatus.ACTIVE },
              select: {
                approvals: {
                  where: { tentative: false },
                  select: { decision: true },
                  orderBy: { createdAt: 'desc' as const },
                  take: 1,
                },
              },
            },
          },
        },
      },
    });

    if (!script) {
      res.status(404).json({ error: 'Script not found' });
      return;
    }

    // Compute approvalTemperature per element
    const elementsWithTemp = script.elements.map((elem) => {
      const decisions = elem.options.flatMap((opt) =>
        opt.approvals.map((a) => a.decision),
      );

      let approvalTemperature: string | null = null;
      if (decisions.length > 0) {
        if (decisions.includes(ApprovalDecision.APPROVED)) {
          approvalTemperature = 'green';
        } else if (decisions.includes(ApprovalDecision.MAYBE)) {
          approvalTemperature = 'yellow';
        } else {
          approvalTemperature = 'red';
        }
      }

      // Remove the raw options approval data (only keep _count)
      const { options: _opts, ...rest } = elem;
      return { ...rest, approvalTemperature };
    });

    res.json({ script: { ...script, elements: elementsWithTemp } });
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

      // Block mutations on PENDING productions
      if (!(await requireActiveProduction(id, res))) return;

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

      const revisionFormat = fileName.toLowerCase().endsWith('.fdx') ? ScriptFormat.FDX : ScriptFormat.PDF;

      const script = await prisma.script.create({
        data: {
          productionId: id,
          title,
          fileName,
          s3Key,
          status: ScriptStatus.PROCESSING,
          format: revisionFormat,
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

// Get processing status for a script
scriptsRouter.get('/api/scripts/:scriptId/processing-status', requireAuth, async (req, res) => {
  try {
    const authReq = req as AuthenticatedRequest;
    const { scriptId } = req.params;

    const script = await prisma.script.findUnique({
      where: { id: scriptId },
    });

    if (!script) {
      res.status(404).json({ error: 'Script not found' });
      return;
    }

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

    const progress = getProgress(scriptId);
    res.json({ status: script.status, progress });
  } catch (error) {
    console.error('Get processing status error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Accept elements and transition REVIEWING → READY
scriptsRouter.post('/api/scripts/:scriptId/accept-elements', requireAuth, async (req, res) => {
  try {
    const authReq = req as AuthenticatedRequest;
    const { scriptId } = req.params;

    const script = await prisma.script.findUnique({
      where: { id: scriptId },
    });

    if (!script) {
      res.status(404).json({ error: 'Script not found' });
      return;
    }

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

    if (script.status !== ScriptStatus.REVIEWING) {
      res.status(400).json({ error: 'Script must be in REVIEWING status' });
      return;
    }

    try {
      await prisma.script.update({
        where: { id: scriptId, status: ScriptStatus.REVIEWING },
        data: { status: ScriptStatus.READY },
      });
    } catch (updateError: any) {
      if (updateError?.code === 'P2025') {
        res.status(409).json({ error: 'Script status was changed by another request' });
        return;
      }
      throw updateError;
    }

    res.json({ message: 'Elements accepted, script is now READY' });
  } catch (error) {
    console.error('Accept elements error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Generate implied wardrobe/H&M elements from sceneData
scriptsRouter.post('/api/scripts/:scriptId/generate-implied', requireAuth, async (req, res) => {
  try {
    const authReq = req as AuthenticatedRequest;
    const { scriptId } = req.params;
    const { mode } = req.body;

    const script = await prisma.script.findUnique({
      where: { id: scriptId },
    });

    if (!script) {
      res.status(404).json({ error: 'Script not found' });
      return;
    }

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

    if (script.status !== ScriptStatus.REVIEWING) {
      res.status(400).json({ error: 'Script must be in REVIEWING status' });
      return;
    }

    const sceneData = script.sceneData as SceneInfo[] | null;
    if (!sceneData || sceneData.length === 0) {
      res.status(400).json({ error: 'No scene data available' });
      return;
    }

    const count = await generateImpliedElements(scriptId, script.productionId, sceneData, mode);

    res.json({ message: `Created ${count} implied elements`, count });
  } catch (error) {
    console.error('Generate implied elements error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export { scriptsRouter };
