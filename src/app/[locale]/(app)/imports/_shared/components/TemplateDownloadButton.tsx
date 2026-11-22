'use client';

import { useTranslations } from 'next-intl';
import { Download } from 'lucide-react';
import Button from '@/src/components/ui/Button';
import type { ImportTemplateKind } from '@/src/services/imports';
import { useImportTemplate } from '../hooks/useImportTemplate';

/** The empty sheet for an import, with its columns in the names the import reads. */
export default function TemplateDownloadButton({
  kind,
}: {
  kind: ImportTemplateKind;
}) {
  const t = useTranslations('imports.template');
  const { isDownloading, download } = useImportTemplate(kind);

  return (
    <Button
      type="button"
      variant="secondary"
      size="sm"
      isLoading={isDownloading}
      disabled={isDownloading}
      onClick={() => void download()}
    >
      <Download size={16} aria-hidden />
      {isDownloading ? t('downloading') : t('download')}
    </Button>
  );
}
