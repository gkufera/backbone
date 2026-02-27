/**
 * Validates that an s3Key starts with the expected prefix for a given production.
 * This prevents cross-production s3Key reference attacks.
 */
export function validateS3KeyForProduction(
  s3Key: string,
  productionId: string,
  prefix: 'scripts' | 'options',
): boolean {
  return s3Key.startsWith(`${prefix}/${productionId}/`);
}
