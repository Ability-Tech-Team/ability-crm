'use client';

import { useCallback, useState } from 'react';
import { useResponseMessage } from '@/src/hooks/useResponseMessage';
import {
  uploadImport,
  type ImportKind,
  type ImportRecord,
} from '@/src/services/imports';

/** Upload one sheet of `kind`, keeping the import's result for display. */
export function useImportUpload(kind: ImportKind) {
  const { success: showSuccess, error: showError } = useResponseMessage();
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [result, setResult] = useState<ImportRecord | null>(null);
  const [hasUploaded, setHasUploaded] = useState(false);

  const selectFile = useCallback((next: File | null) => {
    setFile(next);
    setResult(null);
    setHasUploaded(false);
  }, []);

  const handleUpload = useCallback(async () => {
    if (!file || isUploading) return;

    setIsUploading(true);
    try {
      const record = await uploadImport(kind, file);
      setResult(record);
      setHasUploaded(true);
      setFile(null);
      showSuccess('uploadSuccess');
    } catch (err) {
      showError(err);
    } finally {
      setIsUploading(false);
    }
  }, [file, isUploading, kind, showError, showSuccess]);

  return { file, selectFile, isUploading, result, hasUploaded, handleUpload };
}
