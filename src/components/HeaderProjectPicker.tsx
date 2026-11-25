'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { Check, ChevronDown } from 'lucide-react';
import { useTranslations } from 'next-intl';
import type { AccessibleProject } from '@/src/services/projects';

/**
 * The Super Admin's project in the header (src/lib/projectScope.ts): the
 * header's project pill, opening a list styled like the app's dropdown
 * (src/components/ui/Select.tsx) instead of the browser's.
 */
export default function HeaderProjectPicker({
  projects,
  value,
  onChange,
}: {
  projects: AccessibleProject[];
  value: number | null;
  onChange: (projectId: number) => void;
}) {
  const t = useTranslations('common');
  const listId = useId();
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const optionRefs = useRef<(HTMLLIElement | null)[]>([]);

  const selected = projects.find((project) => project.id === value);
  const term = search.trim().toLowerCase();
  const shown = term
    ? projects.filter((project) => project.name.toLowerCase().includes(term))
    : projects;

  const close = (refocus = false) => {
    setIsOpen(false);
    setSearch('');
    setFocusedIndex(-1);
    if (refocus) buttonRef.current?.focus();
  };

  const choose = (project: AccessibleProject) => {
    close(true);
    if (project.id !== value) onChange(project.id);
  };

  useEffect(() => {
    if (!isOpen) return;
    searchRef.current?.focus();
    const onPointerDown = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) close();
    };
    document.addEventListener('mousedown', onPointerDown);
    return () => document.removeEventListener('mousedown', onPointerDown);
  }, [isOpen]);

  useEffect(() => {
    optionRefs.current[focusedIndex]?.scrollIntoView({ block: 'nearest' });
  }, [focusedIndex]);

  const onKeyDown = (event: React.KeyboardEvent) => {
    if (!isOpen) {
      if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
        event.preventDefault();
        setIsOpen(true);
      }
      return;
    }
    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        setFocusedIndex((index) => Math.min(index + 1, shown.length - 1));
        break;
      case 'ArrowUp':
        event.preventDefault();
        setFocusedIndex((index) => Math.max(index - 1, 0));
        break;
      case 'Enter':
        if (focusedIndex >= 0 && shown[focusedIndex]) {
          event.preventDefault();
          choose(shown[focusedIndex]);
        }
        break;
      case 'Escape':
        event.preventDefault();
        close(true);
        break;
      case 'Tab':
        close();
        break;
    }
  };

  return (
    <div ref={rootRef} className="relative max-w-full" onKeyDown={onKeyDown}>
      <button
        ref={buttonRef}
        type="button"
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-controls={isOpen ? listId : undefined}
        onClick={() => (isOpen ? close() : setIsOpen(true))}
        className="max-w-full cursor-pointer rounded-full border border-sky-100 bg-linear-to-r from-sky-50 via-white to-cyan-50 px-3 py-1 text-center shadow-sm transition-shadow hover:shadow focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300 sm:px-5 sm:py-1.5"
      >
        <span className="block truncate text-[11px] font-semibold uppercase tracking-[0.28em] text-sky-700 sm:text-xs">
          {t('project')}
        </span>
        <span className="flex items-center justify-center gap-1.5">
          <span className="truncate text-sm font-bold text-slate-700 sm:text-base">
            {selected?.name ?? t('selectOption')}
          </span>
          <ChevronDown
            size={16}
            aria-hidden
            className={`shrink-0 text-sky-700 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
          />
        </span>
      </button>

      {isOpen ? (
        <div className="absolute left-1/2 top-full z-50 mt-2 w-64 max-w-[90vw] -translate-x-1/2 overflow-hidden rounded-lg border border-gray-200 bg-white text-start shadow-lg">
          <div className="border-b border-gray-100 p-2">
            <input
              ref={searchRef}
              type="text"
              value={search}
              aria-label={t('searchOptions')}
              placeholder={t('searchOptions')}
              onChange={(event) => {
                setSearch(event.target.value);
                setFocusedIndex(0);
              }}
              className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-400/20"
            />
          </div>
          <ul
            id={listId}
            role="listbox"
            aria-label={t('project')}
            className="max-h-48 overflow-y-auto"
          >
            {shown.length ? (
              shown.map((project, index) => {
                const isSelected = project.id === value;
                return (
                  <li
                    key={project.id}
                    ref={(element) => {
                      optionRefs.current[index] = element;
                    }}
                    role="option"
                    aria-selected={isSelected}
                    onClick={() => choose(project)}
                    onMouseEnter={() => setFocusedIndex(index)}
                    className={`flex cursor-pointer items-center justify-between gap-2 px-3 py-2 text-sm transition-colors duration-150 hover:bg-sky-50 hover:text-sky-700 ${
                      isSelected
                        ? 'bg-sky-100 font-medium text-sky-800'
                        : 'text-gray-900'
                    } ${focusedIndex === index ? 'bg-sky-50 text-sky-700' : ''}`}
                  >
                    <span className="truncate">{project.name}</span>
                    {isSelected ? (
                      <Check size={16} aria-hidden className="shrink-0 text-sky-600" />
                    ) : null}
                  </li>
                );
              })
            ) : (
              <li className="px-3 py-6 text-center text-sm text-gray-500">
                {t('noOptionsFound')}
              </li>
            )}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
