'use client';

import { Search } from 'lucide-react';

type DefinitionSearchBarProps = {
  value: string;
  placeholder: string;
  searchLabel: string;
  searchingLabel: string;
  isSearching?: boolean;
  onChange: (value: string) => void;
  onSearch: () => void | Promise<void>;
  onClear: () => void;
  statusValue?: 'all' | 'active' | 'inactive';
  onStatusChange?: (value: 'all' | 'active' | 'inactive') => void;
  allLabel?: string;
  activeLabel?: string;
  inactiveLabel?: string;
};

export default function DefinitionSearchBar({
  value,
  placeholder,
  searchLabel,
  searchingLabel,
  isSearching = false,
  onChange,
  onSearch,
  onClear,
  statusValue,
  onStatusChange,
  allLabel = 'All',
  activeLabel = 'Active',
  inactiveLabel = 'Inactive',
}: DefinitionSearchBarProps) {
  const statusOptions = [
    { value: 'all' as const, label: allLabel },
    { value: 'active' as const, label: activeLabel },
    { value: 'inactive' as const, label: inactiveLabel },
  ];

  return (
    <div className="mb-4 space-y-3">
      <div className="flex items-center gap-2">
        <div className="relative max-w-sm flex-1">
          <input
            type="text"
            value={value}
            onChange={(event) => onChange(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                void onSearch();
              }
            }}
            placeholder={placeholder}
            className="w-full rounded-lg border border-gray-300 py-2 pl-3 pr-10 text-sm outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
          />

          {value ? (
            <button
              onClick={onClear}
              className="absolute right-8 top-1/2 -translate-y-1/2 text-xs text-gray-400 hover:text-gray-600"
            >
              ✕
            </button>
          ) : null}
        </div>

        <button
          onClick={() => void onSearch()}
          disabled={isSearching}
          className="inline-flex items-center gap-1.5 rounded-lg bg-sky-400 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-sky-700 disabled:opacity-50"
        >
          <Search size={16} />
          {isSearching ? searchingLabel : searchLabel}
        </button>
      </div>

      {onStatusChange && statusValue ? (
        <div className="flex flex-wrap items-center gap-2">
          {statusOptions.map((option) => {
            const isSelected = statusValue === option.value;

            return (
              <button
                key={option.value}
                type="button"
                onClick={() => onStatusChange(option.value)}
                className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                  isSelected
                    ? 'bg-sky-600 text-white'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                {option.label}
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
