import { describe, it, expect } from 'vitest';
import { validateS3KeyForProduction } from '../lib/s3-validation';

describe('validateS3KeyForProduction', () => {
  it('returns true for valid scripts prefix', () => {
    expect(
      validateS3KeyForProduction('scripts/prod-1/uuid/test.pdf', 'prod-1', 'scripts'),
    ).toBe(true);
  });

  it('returns true for valid options prefix', () => {
    expect(
      validateS3KeyForProduction('options/prod-1/uuid/photo.jpg', 'prod-1', 'options'),
    ).toBe(true);
  });

  it('returns false when productionId does not match', () => {
    expect(
      validateS3KeyForProduction('scripts/prod-2/uuid/test.pdf', 'prod-1', 'scripts'),
    ).toBe(false);
  });

  it('returns false when prefix type does not match', () => {
    expect(
      validateS3KeyForProduction('options/prod-1/uuid/test.pdf', 'prod-1', 'scripts'),
    ).toBe(false);
  });

  it('returns false for completely wrong prefix', () => {
    expect(
      validateS3KeyForProduction('other/prod-1/uuid/test.pdf', 'prod-1', 'scripts'),
    ).toBe(false);
  });

  it('returns false for empty s3Key', () => {
    expect(validateS3KeyForProduction('', 'prod-1', 'scripts')).toBe(false);
  });

  it('returns false for partial prefix match (no trailing slash)', () => {
    expect(
      validateS3KeyForProduction('scripts/prod-1extra/uuid/test.pdf', 'prod-1', 'scripts'),
    ).toBe(false);
  });
});
