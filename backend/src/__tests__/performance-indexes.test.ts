import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

/**
 * Validates that performance indexes exist in the Prisma schema
 * for frequently queried fields. These indexes prevent full table scans
 * on hot query paths (element lists, option galleries, membership checks, etc).
 */
describe('Database performance indexes', () => {
  const schemaPath = resolve(__dirname, '../../../prisma/schema.prisma');
  const schema = readFileSync(schemaPath, 'utf-8');

  function getModelBlock(modelName: string): string {
    const regex = new RegExp(`model ${modelName} \\{([^}]+)\\}`, 's');
    const match = schema.match(regex);
    if (!match) throw new Error(`Model ${modelName} not found in schema`);
    return match[1];
  }

  it('Element has index on [scriptId, deletedAt]', () => {
    const block = getModelBlock('Element');
    expect(block).toContain('@@index([scriptId, deletedAt])');
  });

  it('Option has index on [elementId]', () => {
    const block = getModelBlock('Option');
    expect(block).toContain('@@index([elementId])');
  });

  it('ProductionMember has index on [productionId, deletedAt]', () => {
    const block = getModelBlock('ProductionMember');
    expect(block).toContain('@@index([productionId, deletedAt])');
  });

  it('Script has index on [productionId, status]', () => {
    const block = getModelBlock('Script');
    expect(block).toContain('@@index([productionId, status])');
  });

  it('Department has index on [productionId, deletedAt]', () => {
    const block = getModelBlock('Department');
    expect(block).toContain('@@index([productionId, deletedAt])');
  });

  it('Note has index on [optionId]', () => {
    const block = getModelBlock('Note');
    expect(block).toContain('@@index([optionId])');
  });

  it('Notification has index on [userId, productionId, read] (pre-existing)', () => {
    const block = getModelBlock('Notification');
    expect(block).toContain('@@index([userId, productionId, read])');
  });

  it('DirectorNote has index on [scriptId, deletedAt] (pre-existing)', () => {
    const block = getModelBlock('DirectorNote');
    expect(block).toContain('@@index([scriptId, deletedAt])');
  });
});
