'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useResponseMessage } from '@/src/hooks/useResponseMessage';
import { getErrorCode } from '@/src/lib/apiErrors';
import {
  getImport,
  uploadImport,
  type ImportKind,
  type ImportRecord,
} from '@/src/services/imports';
import {
  importPhase,
  isImportPhaseDone,
  nextImportPollDelay,
  type ImportPhase,
} from '../utils';

/**
 * Upload one sheet of `kind` and follow it: the share of the file sent, then
 * the import worker's run (`GET /imports/:id` every few seconds, with its
 * progress), until it has finished. Choosing another file, or leaving the
 * page, stops following; the import itself goes on, and the history shows it.
 */
export function useImportUpload(kind: ImportKind) {
  const { success: showSuccess, error: showError } = useResponseMessage();
  const [file, setFile] = useState<File | null>(null);
  const [phase, setPhase] = useState<ImportPhase>('idle');
  const [uploadFraction, setUploadFraction] = useState(0);
  const [result, setResult] = useState<ImportRecord | null>(null);
  // Sheets accepted so far: a new one empties the file input.
  const [acceptedCount, setAcceptedCount] = useState(0);

  // Each upload is a run; an answer from an older run is dropped.
  const runRef = useRef(0);
  const timerRef = useRef<number | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const stopFollowing = useCallback(() => {
    runRef.current += 1;
    if (timerRef.current !== null) window.clearTimeout(timerRef.current);
    timerRef.current = null;
    abortRef.current?.abort();
    abortRef.current = null;
  }, []);

  useEffect(() => stopFollowing, [stopFollowing]);

  const follow = useCallback(async (id: number, run: number) => {
    let failures = 0;
    while (runRef.current === run) {
      // A cleared timer never resolves: stopFollowing ends the loop here.
      await new Promise<void>((resolve) => {
        timerRef.current = window.setTimeout(
          resolve,
          nextImportPollDelay(failures),
        );
      });
      if (runRef.current !== run) return;

      const controller = new AbortController();
      abortRef.current = controller;
      try {
        const record = await getImport(id, controller.signal);
        if (runRef.current !== run) return;
        failures = 0;
        if (record) {
          const next = importPhase(record);
          setResult(record);
          setPhase(next);
          if (isImportPhaseDone(next)) return;
        }
      } catch (err) {
        if (runRef.current !== run || controller.signal.aborted) return;
        // An import that is gone won't come back; the history tells the rest.
        if (getErrorCode(err) === 'IMPORT_JOB_NOT_FOUND') {
          setPhase('finished');
          return;
        }
        failures += 1;
      }
    }
  }, []);

  const selectFile = useCallback(
    (next: File | null) => {
      stopFollowing();
      setFile(next);
      setResult(null);
      setPhase('idle');
      setUploadFraction(0);
    },
    [stopFollowing],
  );

  const isUploading = phase === 'uploading';

  const handleUpload = useCallback(async () => {
    if (!file || isUploading) return;

    stopFollowing();
    const run = runRef.current;
    setPhase('uploading');
    setUploadFraction(0);
    setResult(null);

    try {
      const record = await uploadImport(kind, file, {
        onUploadProgress: (fraction) => {
          if (runRef.current === run) setUploadFraction(fraction);
        },
      });
      if (runRef.current !== run) return;

      setFile(null);
      setAcceptedCount((count) => count + 1);
      setUploadFraction(1);
      setResult(record);
      showSuccess('uploadSuccess');

      if (!record) {
        // Accepted, but the answer named no import to follow.
        setPhase('finished');
        return;
      }
      const next = importPhase(record);
      setPhase(next);
      if (!isImportPhaseDone(next)) void follow(record.id, run);
    } catch (err) {
      if (runRef.current !== run) return;
      setPhase('idle');
      setUploadFraction(0);
      showError(err);
    }
  }, [
    file,
    follow,
    isUploading,
    kind,
    showError,
    showSuccess,
    stopFollowing,
  ]);

  return {
    file,
    selectFile,
    phase,
    isUploading,
    uploadFraction,
    result,
    acceptedCount,
    /** The sheet was accepted: the result panel (progress, then counts) shows. */
    hasUploaded: phase !== 'idle' && phase !== 'uploading',
    handleUpload,
  };
}
