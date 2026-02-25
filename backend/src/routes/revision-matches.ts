import { Router } from 'express';
import { prisma } from '../lib/prisma';
import { requireAuth, type AuthenticatedRequest } from '../middleware/auth';
import { ElementStatus, ElementSource, OptionStatus, ScriptStatus, RevisionMatchDecision } from '@backbone/shared/types';

const revisionMatchesRouter = Router();

const VALID_DECISIONS = Object.values(RevisionMatchDecision);

// Get revision matches for a script
revisionMatchesRouter.get(
  '/api/scripts/:scriptId/revision-matches',
  requireAuth,
  async (req, res) => {
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
        res.status(403).json({ error: 'Not a member of this production' });
        return;
      }

      if (script.status !== ScriptStatus.RECONCILING) {
        res.status(400).json({ error: 'Script is not in RECONCILING status' });
        return;
      }

      const matches = await prisma.revisionMatch.findMany({
        where: { newScriptId: scriptId },
        include: {
          oldElement: {
            include: {
              _count: { select: { options: { where: { status: OptionStatus.ACTIVE } } } },
              options: {
                where: { status: OptionStatus.ACTIVE },
                include: {
                  approvals: {
                    select: { decision: true },
                  },
                },
              },
            },
          },
        },
        orderBy: { createdAt: 'asc' },
      });

      res.json({ matches });
    } catch (error) {
      console.error('Get revision matches error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  },
);

// Resolve revision matches
revisionMatchesRouter.post(
  '/api/scripts/:scriptId/revision-matches/resolve',
  requireAuth,
  async (req, res) => {
    try {
      const authReq = req as AuthenticatedRequest;
      const { scriptId } = req.params;
      const { decisions } = req.body;

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
        res.status(403).json({ error: 'Not a member of this production' });
        return;
      }

      if (script.status !== ScriptStatus.RECONCILING) {
        res.status(400).json({ error: 'Script is not in RECONCILING status' });
        return;
      }

      if (!decisions || !Array.isArray(decisions)) {
        res.status(400).json({ error: 'decisions array is required' });
        return;
      }

      // Validate all decisions
      for (const d of decisions) {
        if (!d.matchId || !VALID_DECISIONS.includes(d.decision)) {
          res.status(400).json({
            error: `Invalid decision. Must be one of: ${VALID_DECISIONS.join(', ')}`,
          });
          return;
        }
      }

      // Load all matches for this script
      const matches = await prisma.revisionMatch.findMany({
        where: { newScriptId: scriptId },
      });

      const matchMap = new Map(matches.map((m) => [m.id, m]));

      // Validate all matchIds exist
      const unknownIds = decisions
        .map((d: { matchId: string }) => d.matchId)
        .filter((id: string) => !matchMap.has(id));
      if (unknownIds.length > 0) {
        res.status(400).json({
          error: `Unknown matchIds: ${unknownIds.join(', ')}`,
        });
        return;
      }

      // Process decisions in a transaction
      await prisma.$transaction(async (tx) => {
        for (const { matchId, decision, departmentId } of decisions) {
          const match = matchMap.get(matchId)!;

          switch (decision) {
            case RevisionMatchDecision.MAP:
              // Update old element's scriptId, name, and highlight data to new script
              if (match.oldElementId) {
                await tx.element.update({
                  where: { id: match.oldElementId },
                  data: {
                    scriptId,
                    name: match.detectedName,
                    highlightPage: match.detectedPage,
                    highlightText: match.detectedHighlightText,
                    ...(departmentId !== undefined ? { departmentId } : {}),
                  },
                });
              }
              break;

            case RevisionMatchDecision.CREATE_NEW:
              // Create a new element on the new script
              await tx.element.createMany({
                data: [
                  {
                    scriptId,
                    name: match.detectedName,
                    type: match.detectedType,
                    highlightPage: match.detectedPage,
                    highlightText: match.detectedHighlightText,
                    departmentId: departmentId ?? null,
                    status: ElementStatus.ACTIVE,
                    source: ElementSource.AUTO,
                  },
                ],
              });
              break;

            case RevisionMatchDecision.KEEP:
              // Migrate old element to new script (keep its data)
              if (match.oldElementId) {
                await tx.element.update({
                  where: { id: match.oldElementId },
                  data: {
                    scriptId,
                    ...(departmentId !== undefined ? { departmentId } : {}),
                  },
                });
              }
              break;

            case RevisionMatchDecision.ARCHIVE:
              // Set old element status to ARCHIVED
              if (match.oldElementId) {
                await tx.element.update({
                  where: { id: match.oldElementId },
                  data: { status: ElementStatus.ARCHIVED },
                });
              }
              break;
          }

          // Mark match as resolved
          await tx.revisionMatch.update({
            where: { id: matchId },
            data: { userDecision: decision, resolved: true },
          });
        }

        // Transition script to READY
        await tx.script.update({
          where: { id: scriptId },
          data: { status: ScriptStatus.READY },
        });
      });

      res.json({ message: 'Reconciliation complete' });
    } catch (error) {
      console.error('Resolve revision matches error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  },
);

export { revisionMatchesRouter };
