import { Router } from 'express';
import { prisma } from '../lib/prisma';
import { requireAuth, type AuthenticatedRequest } from '../middleware/auth';

const testSeedRouter = Router();

testSeedRouter.post('/api/test/seed-production', requireAuth, async (req, res) => {
  if (process.env.NODE_ENV !== 'test') {
    res.status(403).json({ error: 'Test endpoints are only available in test environment' });
    return;
  }

  try {
    const authReq = req as AuthenticatedRequest;
    const userId = authReq.user.userId;

    const result = await prisma.$transaction(async (tx) => {
      // Create production
      const production = await tx.production.create({
        data: {
          title: 'Test Production',
          status: 'ACTIVE',
          createdById: userId,
        },
      });

      // Create ADMIN membership
      await tx.productionMember.create({
        data: {
          productionId: production.id,
          userId,
          role: 'ADMIN',
        },
      });

      // Create departments
      const deptData = [
        { name: 'Cast', color: '#E63946' },
        { name: 'Locations', color: '#264653' },
      ];
      const departments: { id: string; name: string }[] = [];
      for (const d of deptData) {
        const dept = await tx.department.create({
          data: {
            productionId: production.id,
            name: d.name,
            color: d.color,
          },
        });
        departments.push({ id: dept.id, name: dept.name });
      }

      // Create READY script (fake s3Key — no actual S3 upload)
      const script = await tx.script.create({
        data: {
          productionId: production.id,
          title: 'Test Script',
          fileName: 'test-script.pdf',
          s3Key: 'test/fake-script-key.pdf',
          pageCount: 10,
          status: 'READY',
          version: 1,
          uploadedById: userId,
        },
      });

      // Create 5 elements: 2 CHARACTER, 2 LOCATION, 1 OTHER
      const elementDefs = [
        { name: 'John', type: 'CHARACTER', page: 1 },
        { name: 'Sarah', type: 'CHARACTER', page: 2 },
        { name: 'Office', type: 'LOCATION', page: 1 },
        { name: 'Park', type: 'LOCATION', page: 3 },
        { name: 'Car Keys', type: 'OTHER', page: 5 },
      ];

      const elements: { id: string; name: string; type: string; optionId: string }[] = [];

      for (let i = 0; i < elementDefs.length; i++) {
        const def = elementDefs[i];
        const element = await tx.element.create({
          data: {
            scriptId: script.id,
            name: def.name,
            type: def.type,
            highlightPage: def.page,
            status: 'ACTIVE',
            source: 'AUTO',
            workflowState: 'PENDING',
          },
        });

        // Create 1 LINK option per element (first 2 readyForReview=true)
        const option = await tx.option.create({
          data: {
            elementId: element.id,
            mediaType: 'LINK',
            description: `Reference for ${def.name}`,
            externalUrl: `https://example.com/${def.name.toLowerCase().replace(/\s+/g, '-')}`,
            status: 'ACTIVE',
            readyForReview: i < 2,
            uploadedById: userId,
          },
        });

        elements.push({
          id: element.id,
          name: element.name,
          type: def.type,
          optionId: option.id,
        });
      }

      return { production, script, elements, departments };
    });

    res.status(201).json({
      productionId: result.production.id,
      scriptId: result.script.id,
      elements: result.elements,
      departments: result.departments,
    });
  } catch (error) {
    console.error('Test seed error:', error);
    res.status(500).json({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : String(error),
    });
  }
});

testSeedRouter.post(
  '/api/test/activate-production/:id',
  requireAuth,
  async (req, res) => {
    if (process.env.NODE_ENV !== 'test') {
      res.status(403).json({ error: 'Test endpoints are only available in test environment' });
      return;
    }

    try {
      const production = await prisma.production.update({
        where: { id: req.params.id },
        data: { status: 'ACTIVE' },
      });
      res.json({ id: production.id, status: production.status });
    } catch (error) {
      res.status(500).json({
        error: 'Internal server error',
        details: error instanceof Error ? error.message : String(error),
      });
    }
  },
);

export { testSeedRouter };
