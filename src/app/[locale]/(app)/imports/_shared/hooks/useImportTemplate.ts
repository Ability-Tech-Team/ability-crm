'use client';

import { useCallback, useState } from 'react';
import { useResponseMessage } from '@/src/hooks/useResponseMessage';
import {
  downloadImportTemplate,
  type ImportTemplateKind,
} from '@/src/services/imports';

/** Downloads the empty sheet of `kind`, once at a time. */
export function useImportTemplate(kind: ImportTemplateKind) {
  const { error: showError } = useResponseMessage();
  const [isDownloading, setIsDownloading] = useState(false);

  const download = useCallback(async () => {
    if (isDownloading) return;
    setIsDownloading(true);
    try {
      await downloadImportTemplate(kind);
    } catch (err) {
      showError(err);
    } finally {
      setIsDownloading(false);
    }
  }, [isDownloading, kind, showError]);

  return { isDownloading, download };
}
