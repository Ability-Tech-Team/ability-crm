'use client';

import { PlusCircle } from 'lucide-react';

type DefinitionPageHeaderProps = {
  title: string;
  description?: string;
  addLabel: string;
  canAdd?: boolean;
  onAdd?: () => void;
};

export default function DefinitionPageHeader({
  title,
  description,
  addLabel,
  canAdd = false,
  onAdd,
}: DefinitionPageHeaderProps) {
  return (
    <div className="mb-2 flex items-center justify-between gap-4">
      <div>
        <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
        {description ? (
          <p className="mt-1 text-sm text-slate-500">{description}</p>
        ) : null}
      </div>

      {canAdd && onAdd ? (
        <button
          onClick={onAdd}
          className="inline-flex items-center gap-1.5 rounded-lg bg-sky-400 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-sky-700"
        >
          <PlusCircle size={18} />
          {addLabel}
        </button>
      ) : null}
    </div>
  );
}
