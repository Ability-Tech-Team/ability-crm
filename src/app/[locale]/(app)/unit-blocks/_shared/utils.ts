import {
  getUnsupportedAttachments,
  UNIT_BLOCK_ALLOWED_EXTENSIONS,
  UNIT_BLOCK_MAX_FILES,
} from '@/src/services/unitBlocks';

type Translate = (
  key: string,
  values?: Record<string, string | number | Date>,
) => string;

/**
 * The message to show when the staged files cannot be sent, or `null` when
 * they are fine. Both block forms apply the same two limits.
 */
export function validateStagedFiles(
  files: File[],
  t: Translate,
): string | null {
  if (files.length > UNIT_BLOCK_MAX_FILES) {
    return t('create.tooManyAttachments', { max: UNIT_BLOCK_MAX_FILES });
  }

  // The proxy rejects an unsupported type with an opaque HTML 403.
  const unsupported = getUnsupportedAttachments(files);
  if (unsupported.length) {
    return t('create.unsupportedAttachment', {
      files: unsupported.join(', '),
      allowed: UNIT_BLOCK_ALLOWED_EXTENSIONS.join(', '),
    });
  }

  return null;
}
