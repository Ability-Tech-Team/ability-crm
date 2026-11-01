'use client';

import FileDropZone from '@/src/components/ui/FileDropZone';
import RentalFormSection from './RentalFormSection';

type TenantAttachmentsSectionProps = {
  title: string;
  helperText: string;
  attachmentsLabel: string;
  emptyText: string;
  attachments: File[];
  onChange: (files: File[]) => void;
};

export default function TenantAttachmentsSection({
  title,
  helperText,
  attachmentsLabel,
  emptyText,
  attachments,
  onChange,
}: TenantAttachmentsSectionProps) {
  return (
    <RentalFormSection
      title={title}
      helperText={helperText}
      contentClassName="space-y-3"
    >
      <FileDropZone
        label={attachmentsLabel}
        name="tenant-attachments"
        files={attachments}
        onChange={onChange}
      />

      {!attachments.length && (
        <p className="text-sm text-slate-500">{emptyText}</p>
      )}
    </RentalFormSection>
  );
}
