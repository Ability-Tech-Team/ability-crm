'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Download,
  ArrowUpDown,
} from 'lucide-react';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { Link } from '@/src/i18n/navigation';
import { exportExcel } from '@/src/lib/exportExcel';

export type SortDirection = 'asc' | 'desc';

export type ColumnDef<T> = {
  id: string;
  label: string;
  headerTooltip?: string;
  accessorKey?: keyof T;
  cell?: (row: T, index: number) => React.ReactNode;
  headerClassName?: string;
  cellClassName?: string;
  defaultVisible?: boolean;
  alwaysVisible?: boolean;
  sortable?: boolean;
  /**
   * When the table is rendered with `rowHref`, set this to opt the column
   * out of being wrapped in the row's `<Link>`. Use for action columns whose
   * cells contain their own buttons or links to avoid nested interactives.
   */
  disableRowLink?: boolean;
};

export type DataTableProps<T> = {
  title?: string;
  columns: ColumnDef<T>[];
  data: T[];
  rowKey?: (row: T, index: number) => string | number;
  className?: string;
  tableClassName?: string;
  showColumnToggle?: boolean;
  initialVisibleColumnIds?: string[];
  onVisibleColumnsChange?: (visibleIds: string[]) => void;
  emptyState?: string;
  loading?: boolean;
  itemsPerPage?: number;
  pageSizeOptions?: number[];
  columnsLabel?: string;
  allColumnsLabel?: string;
  persistKey?: string;
  onRowClick?: (row: T) => void;
  /**
   * When provided, each row is rendered as a hyperlink to the returned URL,
   * preserving Ctrl/middle-click → new tab and right-click → copy link.
   * Takes precedence over `onRowClick` for navigation. Return `undefined` to
   * disable the link for a specific row.
   */
  rowHref?: (row: T) => string | undefined;
  /** Optional per-row extra CSS classes appended to the <tr> className. */
  rowClassName?: (row: T, index: number) => string | undefined;
  /** Optional per-row title attribute (browser tooltip on hover). */
  rowTitle?: (row: T) => string | undefined;
  /**
   * When provided and returns true, the row is treated as non-interactive:
   * no cursor-pointer, no hover background, and onRowClick is not invoked.
   * `rowHref` is also skipped for that row.
   */
  rowDisabled?: (row: T) => boolean;
  exportEnabled?: boolean;
  exportFileName?: string;
  /** Backend endpoint that returns an Excel buffer when `is_excel=1`. */
  exportEndpoint?: string;
  /** Active filter params forwarded to the backend export endpoint. */
  exportParams?: Record<string, unknown>;
  totalCount?: number;
  currentPage?: number;
  totalPages?: number;
  pageSize?: number;
  onPageChange?: (page: number) => void;
  onPageSizeChange?: (size: number) => void;
};

const DEFAULT_EMPTY_STATE = 'No data available.';

export default function DataTable<T>({
  title,
  columns,
  data,
  rowKey,
  className = '',
  tableClassName = '',
  showColumnToggle = true,
  initialVisibleColumnIds,
  onVisibleColumnsChange,
  emptyState = DEFAULT_EMPTY_STATE,
  loading = false,
  itemsPerPage = 5,
  pageSizeOptions = [5, 10, 25, 50, 100],
  columnsLabel,
  allColumnsLabel,
  persistKey,
  onRowClick,
  rowHref,
  rowClassName,
  rowTitle,
  rowDisabled,
  exportEnabled = false,
  exportFileName = 'export',
  exportEndpoint,
  exportParams,
  totalCount,
  currentPage: controlledCurrentPage,
  totalPages: controlledTotalPages,
  pageSize: controlledPageSize,
  onPageChange,
  onPageSizeChange,
}: DataTableProps<T>) {
  const tPagination = useTranslations('pagination');
  const tExport = useTranslations('export');
  const resolvedColumnsLabel = columnsLabel ?? tPagination('columns');
  const resolvedAllColumnsLabel = allColumnsLabel ?? tPagination('all');
  const [internalCurrentPage, setInternalCurrentPage] = useState(1);
  const [internalPageSize, setInternalPageSize] = useState(itemsPerPage);
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const selectAllRef = useRef<HTMLInputElement>(null);

  const isServerPagination =
    totalCount !== undefined ||
    controlledCurrentPage !== undefined ||
    controlledTotalPages !== undefined ||
    !!onPageChange;

  const pageSize = controlledPageSize ?? internalPageSize;
  const currentPage = controlledCurrentPage ?? internalCurrentPage;
  const totalItems = totalCount ?? data.length;

  const defaultVisibleIds = useMemo(
    () =>
      columns
        .filter((col) => col.defaultVisible !== false)
        .map((col) => col.id),
    [columns],
  );

  const alwaysVisibleIds = useMemo(
    () => columns.filter((col) => col.alwaysVisible).map((col) => col.id),
    [columns],
  );

  // Initialize with lazy function to load from localStorage
  const [visibleIds, setVisibleIds] = useState<string[]>(() => {
    if (persistKey && typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem(persistKey);
        if (stored) {
          const parsed = JSON.parse(stored);
          const filtered = parsed.filter((id: string) =>
            columns.some((column) => column.id === id),
          );
          // Always include alwaysVisible columns
          const alwaysIds = columns
            .filter((col) => col.alwaysVisible)
            .map((col) => col.id);
          return Array.from(new Set([...alwaysIds, ...filtered]));
        }
      } catch (error) {
        console.error('Failed to load persisted column visibility:', error);
      }
    }
    return initialVisibleColumnIds ?? defaultVisibleIds;
  });

  // Persist to localStorage and notify on change
  useEffect(() => {
    if (persistKey && typeof window !== 'undefined') {
      try {
        localStorage.setItem(persistKey, JSON.stringify(visibleIds));
      } catch (error) {
        console.error('Failed to persist column visibility:', error);
      }
    }
    onVisibleColumnsChange?.(visibleIds);
  }, [visibleIds, persistKey, onVisibleColumnsChange]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest('[data-dropdown="columns"]')) {
        setIsDropdownOpen(false);
      }
    };

    if (isDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () =>
        document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isDropdownOpen]);

  const visibleColumns = useMemo(
    () => columns.filter((column) => visibleIds.includes(column.id)),
    [columns, visibleIds],
  );

  const toggableColumns = columns.filter((col) => !col.alwaysVisible);
  const visibleToggableCount = toggableColumns.filter((col) =>
    visibleIds.includes(col.id),
  ).length;
  const areAllColumnsVisible =
    toggableColumns.length > 0 &&
    visibleToggableCount === toggableColumns.length;
  const isSomeColumnsVisible = visibleToggableCount > 0;

  useEffect(() => {
    if (selectAllRef.current) {
      selectAllRef.current.indeterminate =
        isSomeColumnsVisible && !areAllColumnsVisible;
    }
  }, [isSomeColumnsVisible, areAllColumnsVisible]);

  const toggleColumn = (id: string) => {
    if (alwaysVisibleIds.includes(id)) return;
    setVisibleIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id],
    );
  };

  const toggleAllColumns = () => {
    setVisibleIds((prev) => {
      const allColumnIds = columns.map((column) => column.id);
      const toggableIds = allColumnIds.filter(
        (id) => !alwaysVisibleIds.includes(id),
      );
      const selectedCount = toggableIds.filter((id) =>
        prev.includes(id),
      ).length;

      if (selectedCount === toggableIds.length) {
        // Hide all toggable columns, keep always-visible ones
        return alwaysVisibleIds;
      }

      return allColumnIds;
    });
  };

  const handleExport = async () => {
    if (isExporting || !exportEndpoint) return;

    try {
      setIsExporting(true);
      await exportExcel({
        endpoint: exportEndpoint,
        params: exportParams,
        fileName: exportFileName,
      });
    } catch (error) {
      console.error('Failed to export table data:', error);
      toast.error(error instanceof Error ? error.message : tExport('failed'));
    } finally {
      setIsExporting(false);
    }
  };

  const getCellValue = (row: T, column: ColumnDef<T>, index: number) => {
    if (column.cell) {
      return column.cell(row, index);
    }

    if (column.accessorKey) {
      return row[column.accessorKey] as React.ReactNode;
    }

    return null;
  };

  const handleSort = (columnId: string) => {
    if (sortColumn === columnId) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortColumn(columnId);
      setSortDirection('asc');
    }
  };

  const sortedData = useMemo(() => {
    if (!sortColumn) return data;
    const col = columns.find((c) => c.id === sortColumn);
    if (!col) return data;
    const key = col.accessorKey ?? col.id;
    return [...data].sort((a, b) => {
      const aVal = (a as Record<string, unknown>)[key as string];
      const bVal = (b as Record<string, unknown>)[key as string];
      if (aVal == null && bVal == null) return 0;
      if (aVal == null) return 1;
      if (bVal == null) return -1;
      const aStr = String(aVal);
      const bStr = String(bVal);
      const cmp = aStr.localeCompare(bStr, undefined, {
        numeric: true,
        sensitivity: 'base',
      });
      return sortDirection === 'asc' ? cmp : -cmp;
    });
  }, [data, sortColumn, sortDirection, columns]);

  const paginatedData = useMemo(() => {
    if (isServerPagination) {
      return sortedData;
    }

    const start = (currentPage - 1) * pageSize;
    const end = start + pageSize;
    return sortedData.slice(start, end);
  }, [sortedData, currentPage, pageSize, isServerPagination]);

  const totalPages =
    controlledTotalPages ?? Math.max(1, Math.ceil(totalItems / pageSize));

  const visibleItemCount = paginatedData.length;
  const visibleRangeStart =
    visibleItemCount > 0 ? (currentPage - 1) * pageSize + 1 : 0;
  const visibleRangeEnd =
    visibleItemCount > 0
      ? Math.min((currentPage - 1) * pageSize + visibleItemCount, totalItems)
      : 0;

  const pageNumbers = useMemo(() => {
    if (totalPages <= 7) {
      return Array.from({ length: totalPages }, (_, i) => i + 1) as (
        | number
        | null
      )[];
    }
    const pages: (number | null)[] = [1];
    const rangeStart = Math.max(2, currentPage - 1);
    const rangeEnd = Math.min(totalPages - 1, currentPage + 1);

    if (rangeStart > 2) pages.push(null);
    for (let i = rangeStart; i <= rangeEnd; i++) pages.push(i);
    if (rangeEnd < totalPages - 1) pages.push(null);
    pages.push(totalPages);
    return pages;
  }, [totalPages, currentPage]);

  const hasVisibleColumns = visibleColumns.length > 0;

  return (
    <section className={`flex flex-col gap-4 ${className}`}>
      {(title || showColumnToggle || exportEnabled) && (
        <div className="flex flex-wrap items-start justify-between gap-4">
          {title && (
            <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
          )}

          <div className="flex items-center gap-2">
            {exportEnabled &&
              exportEndpoint &&
              (data.length > 0 || totalItems > 0) && (
                <button
                  onClick={handleExport}
                  disabled={isExporting}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg border border-slate-300 bg-white text-sm font-medium text-gray-700 hover:bg-slate-50 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  <Download size={16} />
                  {isExporting
                    ? `${tPagination('exportExcel')}...`
                    : tPagination('exportExcel')}
                </button>
              )}

            {showColumnToggle && columns.length > 0 && (
              <div className="relative" data-dropdown="columns">
                <button
                  onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg border border-slate-300 bg-white text-sm font-medium text-gray-700 hover:bg-slate-50 transition-colors"
                >
                  {resolvedColumnsLabel}
                  <ChevronDown
                    size={16}
                    className={`transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`}
                  />
                </button>

                {isDropdownOpen && (
                  <div className="absolute right-0 mt-1 w-48 bg-white border border-slate-300 rounded-lg shadow-lg z-10">
                    <div className="p-3 space-y-2 max-h-64 overflow-y-auto">
                      <label className="flex items-center gap-2 text-sm font-medium text-gray-700 hover:bg-slate-100 p-2 rounded cursor-pointer border-b border-slate-200 pb-3 mb-1">
                        <input
                          ref={selectAllRef}
                          type="checkbox"
                          className="h-4 w-4 accent-sky-500 cursor-pointer"
                          checked={areAllColumnsVisible}
                          onChange={toggleAllColumns}
                        />
                        <span>{resolvedAllColumnsLabel}</span>
                      </label>
                      {columns.map((column) => (
                        <label
                          key={column.id}
                          className={`flex items-center gap-2 text-sm text-gray-700 p-2 rounded ${
                            column.alwaysVisible
                              ? 'opacity-60 cursor-not-allowed'
                              : 'hover:bg-slate-100 cursor-pointer'
                          }`}
                        >
                          <input
                            type="checkbox"
                            className="h-4 w-4 accent-sky-500"
                            style={{
                              cursor: column.alwaysVisible
                                ? 'not-allowed'
                                : 'pointer',
                            }}
                            checked={visibleIds.includes(column.id)}
                            disabled={column.alwaysVisible}
                            onChange={() => toggleColumn(column.id)}
                          />
                          <span>{column.label}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      <div className="w-full overflow-auto rounded-2xl border border-slate-100 bg-white">
        <table className={`min-w-full text-sm ${tableClassName}`}>
          <thead className="bg-slate-50 text-start text-slate-600">
            <tr>
              {hasVisibleColumns ? (
                visibleColumns.map((column) => (
                  <th
                    key={column.id}
                    title={column.headerTooltip}
                    className={`px-4 py-3 text-start align-middle font-semibold ${
                      column.headerClassName || ''
                    } ${column.sortable ? 'cursor-pointer select-none hover:bg-slate-100 transition-colors' : ''}`}
                    onClick={
                      column.sortable ? () => handleSort(column.id) : undefined
                    }
                  >
                    <span
                      className={`inline-flex items-center gap-1 ${column.sortable ? '' : ''}`}
                    >
                      {column.label}
                      {column.sortable &&
                        (sortColumn === column.id ? (
                          sortDirection === 'asc' ? (
                            <ChevronUp size={14} className="text-sky-600" />
                          ) : (
                            <ChevronDown size={14} className="text-sky-600" />
                          )
                        ) : (
                          <ArrowUpDown size={14} className="text-slate-400" />
                        ))}
                    </span>
                  </th>
                ))
              ) : (
                <th className="px-4 py-3 font-semibold">No columns selected</th>
              )}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <tr key={`skeleton-${i}`} className="border-t animate-pulse">
                  {(hasVisibleColumns
                    ? visibleColumns
                    : [{ id: '_placeholder' }]
                  ).map((col) => (
                    <td key={col.id} className="px-4 py-3">
                      <div className="h-4 bg-slate-200 rounded w-3/4" />
                    </td>
                  ))}
                </tr>
              ))
            ) : data.length === 0 ? (
              <tr>
                <td
                  colSpan={Math.max(visibleColumns.length, 1)}
                  className="px-4 py-6 text-center text-slate-500"
                >
                  {emptyState}
                </td>
              </tr>
            ) : (
              paginatedData.map((row, index) => {
                const absoluteIndex = (currentPage - 1) * pageSize + index;
                const disabled = rowDisabled?.(row) ?? false;
                const href = disabled ? undefined : rowHref?.(row);
                const isInteractive = !disabled && (!!href || !!onRowClick);
                const extraClass = rowClassName?.(row, absoluteIndex) ?? '';
                const title = rowTitle?.(row);
                return (
                  <tr
                    key={rowKey ? rowKey(row, absoluteIndex) : absoluteIndex}
                    className={`border-t${isInteractive ? ' cursor-pointer hover:bg-sky-100 active:bg-sky-200 transition-colors' : ''}${extraClass ? ` ${extraClass}` : ''}`}
                    onClick={
                      disabled || href ? undefined : () => onRowClick?.(row)
                    }
                    title={title}
                  >
                    {hasVisibleColumns ? (
                      visibleColumns.map((column) => {
                        const cellContent = getCellValue(
                          row,
                          column,
                          (currentPage - 1) * pageSize + index + 1,
                        );
                        const wrapWithLink = !!href && !column.disableRowLink;
                        return (
                          <td
                            key={`${absoluteIndex}-${column.id}`}
                            className={`text-start align-middle text-slate-700 ${
                              wrapWithLink ? 'p-0' : 'px-4 py-3'
                            } ${column.cellClassName || ''}`}
                          >
                            {wrapWithLink ? (
                              <Link
                                href={href!}
                                className="block px-4 py-3 text-inherit no-underline"
                              >
                                {cellContent}
                              </Link>
                            ) : (
                              cellContent
                            )}
                          </td>
                        );
                      })
                    ) : (
                      <td className="px-4 py-6 text-center text-slate-500">
                        Select at least one column to view data.
                      </td>
                    )}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <p>
            {tPagination('showing')} {visibleRangeStart} {tPagination('to')}{' '}
            {visibleRangeEnd} {tPagination('of')} {totalItems}
          </p>
          <select
            value={pageSize}
            onChange={(e) => {
              const newPageSize = Number(e.target.value);
              if (onPageSizeChange) {
                onPageSizeChange(newPageSize);
              } else {
                setInternalPageSize(newPageSize);
              }

              if (onPageChange) {
                onPageChange(1);
              } else {
                setInternalCurrentPage(1);
              }
            }}
            className="px-2 py-1 rounded-lg border border-slate-300 bg-white text-sm text-gray-700 cursor-pointer focus:outline-none focus:ring-2 focus:ring-sky-400"
          >
            {pageSizeOptions.map((size) => (
              <option key={size} value={size}>
                {size} {tPagination('perPage')}
              </option>
            ))}
          </select>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => {
              const nextPage = Math.max(currentPage - 1, 1);
              if (onPageChange) {
                onPageChange(nextPage);
              } else {
                setInternalCurrentPage(nextPage);
              }
            }}
            disabled={currentPage === 1}
            className="flex items-center gap-1 px-3 py-2 rounded-lg border border-slate-300 text-sm font-medium text-gray-700 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            aria-label={tPagination('previousPage')}
          >
            <ChevronLeft size={16} />
          </button>
          <div className="flex items-center gap-1">
            {pageNumbers.map((page, i) =>
              page === null ? (
                <span
                  key={`ellipsis-${i}`}
                  className="px-2 py-2 text-sm text-slate-400 select-none"
                >
                  &hellip;
                </span>
              ) : (
                <button
                  key={page}
                  onClick={() => {
                    if (onPageChange) {
                      onPageChange(page);
                    } else {
                      setInternalCurrentPage(page);
                    }
                  }}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    currentPage === page
                      ? 'bg-sky-500 text-white'
                      : 'border border-slate-300 text-gray-700 hover:bg-slate-50'
                  }`}
                >
                  {page}
                </button>
              ),
            )}
          </div>
          <button
            onClick={() => {
              const nextPage = Math.min(currentPage + 1, totalPages);
              if (onPageChange) {
                onPageChange(nextPage);
              } else {
                setInternalCurrentPage(nextPage);
              }
            }}
            disabled={currentPage === totalPages}
            className="flex items-center gap-1 px-3 py-2 rounded-lg border border-slate-300 text-sm font-medium text-gray-700 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            aria-label={tPagination('nextPage')}
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>
    </section>
  );
}
