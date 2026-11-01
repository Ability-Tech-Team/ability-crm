'use client';

import Button from '@/src/components/ui/Button';
import Input from '@/src/components/ui/Input';
import Select, { type SelectOption } from '@/src/components/ui/Select';
import type { LocalRelative } from '../types';
import FileDropZone from '@/src/components/ui/FileDropZone';
import RentalFormSection from './RentalFormSection';

type RelativesSectionProps = {
  title: string;
  addLabel: string;
  emptyText: string;
  namePlaceholder: string;
  idTypePlaceholder: string;
  idNumberPlaceholder: string;
  genderPlaceholder: string;
  emailPlaceholder: string;
  phonePlaceholder: string;
  relationshipPlaceholder: string;
  attachmentsLabel: string;
  removeLabel: string;
  relatives: LocalRelative[];
  idTypeOptions: SelectOption[];
  genderOptions: SelectOption[];
  onAdd: () => void;
  onUpdate: (
    relativeId: string,
    field: keyof LocalRelative,
    value: string | File[],
  ) => void;
  onRemove: (relativeId: string) => void;
};

export default function RelativesSection({
  title,
  addLabel,
  emptyText,
  namePlaceholder,
  idTypePlaceholder,
  idNumberPlaceholder,
  genderPlaceholder,
  emailPlaceholder,
  phonePlaceholder,
  relationshipPlaceholder,
  attachmentsLabel,
  removeLabel,
  relatives,
  idTypeOptions,
  genderOptions,
  onAdd,
  onUpdate,
  onRemove,
}: RelativesSectionProps) {
  return (
    <RentalFormSection title={title} collapsible defaultOpen>
      <div className="flex justify-end">
        <Button
          type="button"
          size="sm"
          variant="secondary"
          fullWidth={false}
          onClick={onAdd}
        >
          {addLabel}
        </Button>
      </div>

      {relatives.length === 0 && (
        <p className="text-sm text-slate-500">{emptyText}</p>
      )}

      {relatives.map((relative) => (
        <div
          key={relative.id}
          className="rounded-xl border border-slate-200 bg-white p-4"
        >
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
            <Input
              label={`${namePlaceholder} *`}
              name={`relative-name-${relative.id}`}
              placeholder={namePlaceholder}
              value={relative.customer_name}
              onChange={(event) =>
                onUpdate(relative.id, 'customer_name', event.target.value)
              }
            />
            <Select
              label={`${idTypePlaceholder} *`}
              name={`relative-id-type-${relative.id}`}
              options={idTypeOptions}
              value={relative.idType}
              placeholder={idTypePlaceholder}
              searchable={false}
              onChange={(event) =>
                onUpdate(relative.id, 'idType', event.target.value)
              }
            />
            <Input
              label={`${idNumberPlaceholder} *`}
              name={`relative-id-number-${relative.id}`}
              placeholder={idNumberPlaceholder}
              maxLength={14}
              value={relative.idNumber}
              onChange={(event) =>
                onUpdate(relative.id, 'idNumber', event.target.value)
              }
            />
            <Select
              label={genderPlaceholder}
              name={`relative-gender-${relative.id}`}
              options={genderOptions}
              value={relative.gender}
              placeholder={genderPlaceholder}
              searchable={false}
              onChange={(event) =>
                onUpdate(relative.id, 'gender', event.target.value)
              }
            />
            <Input
              label={emailPlaceholder}
              name={`relative-email-${relative.id}`}
              type="email"
              placeholder={emailPlaceholder}
              value={relative.email}
              onChange={(event) =>
                onUpdate(relative.id, 'email', event.target.value)
              }
            />
            <Input
              label={phonePlaceholder}
              name={`relative-phone-${relative.id}`}
              type="tel"
              inputMode="numeric"
              maxLength={11}
              placeholder={phonePlaceholder}
              value={relative.phone}
              onChange={(event) =>
                onUpdate(relative.id, 'phone', event.target.value)
              }
            />
            <Input
              label={relationshipPlaceholder}
              name={`relative-relationship-${relative.id}`}
              placeholder={relationshipPlaceholder}
              value={relative.relation}
              onChange={(event) =>
                onUpdate(relative.id, 'relation', event.target.value)
              }
            />
            <FileDropZone
              label={attachmentsLabel}
              name={`relative-attachments-${relative.id}`}
              files={relative.attachments ?? []}
              onChange={(merged) =>
                onUpdate(relative.id, 'attachments', merged)
              }
              containerClassName="xl:col-span-2"
            />
          </div>
          <div className="mt-3 flex justify-end">
            <Button
              type="button"
              size="sm"
              variant="danger"
              fullWidth={false}
              onClick={() => onRemove(relative.id)}
            >
              {removeLabel}
            </Button>
          </div>
        </div>
      ))}
    </RentalFormSection>
  );
}
