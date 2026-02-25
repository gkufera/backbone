import { prisma } from '../lib/prisma';
import { ElementType, ElementStatus, ElementSource } from '@backbone/shared/types';
import type { SceneInfo } from '@backbone/shared/types';

/**
 * Generate implied wardrobe and hair & makeup elements from scene data.
 * Returns the count of newly created elements.
 */
export async function generateImpliedElements(
  scriptId: string,
  productionId: string,
  sceneData: SceneInfo[],
  mode: 'per-scene' | 'per-character',
): Promise<number> {
  // Look up Costume and Hair & Makeup departments
  const departments = await prisma.department.findMany({
    where: { productionId, deletedAt: null },
    select: { id: true, name: true },
  });
  const deptMap = new Map(departments.map((d) => [d.name, d.id]));
  const costumeId = deptMap.get('Costume') ?? null;
  const hmId = deptMap.get('Hair & Makeup') ?? null;

  const elementsToCreate: Array<{
    scriptId: string;
    name: string;
    type: string;
    departmentId: string | null;
    status: string;
    source: string;
  }> = [];

  if (mode === 'per-scene') {
    for (const scene of sceneData) {
      for (const character of scene.characters) {
        elementsToCreate.push({
          scriptId,
          name: `${character} - Wardrobe (Scene ${scene.sceneNumber})`,
          type: ElementType.OTHER,
          departmentId: costumeId,
          status: ElementStatus.ACTIVE,
          source: ElementSource.AUTO,
        });
        elementsToCreate.push({
          scriptId,
          name: `${character} - Hair & Makeup (Scene ${scene.sceneNumber})`,
          type: ElementType.OTHER,
          departmentId: hmId,
          status: ElementStatus.ACTIVE,
          source: ElementSource.AUTO,
        });
      }
    }
  } else {
    const allCharacters = new Set<string>();
    for (const scene of sceneData) {
      for (const character of scene.characters) {
        allCharacters.add(character);
      }
    }
    for (const character of allCharacters) {
      elementsToCreate.push({
        scriptId,
        name: `${character} - Wardrobe`,
        type: ElementType.OTHER,
        departmentId: costumeId,
        status: ElementStatus.ACTIVE,
        source: ElementSource.AUTO,
      });
      elementsToCreate.push({
        scriptId,
        name: `${character} - Hair & Makeup`,
        type: ElementType.OTHER,
        departmentId: hmId,
        status: ElementStatus.ACTIVE,
        source: ElementSource.AUTO,
      });
    }
  }

  // Filter out elements that already exist to prevent duplicates on re-run
  const existing = await prisma.element.findMany({
    where: { scriptId, status: ElementStatus.ACTIVE },
    select: { name: true },
  });
  const existingNames = new Set(existing.map((e) => e.name));
  const filtered = elementsToCreate.filter((e) => !existingNames.has(e.name));

  if (filtered.length > 0) {
    await prisma.element.createMany({ data: filtered });
  }

  return filtered.length;
}
