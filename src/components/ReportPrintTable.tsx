'use client';

import { useMemo } from 'react';

export interface PrintColumn<T> {
  label: string;
  accessor: (row: T) => React.ReactNode;
}

interface ReportPrintTableProps<T> {
  title: string;
  dateRange: string;
  columns: PrintColumn<T>[];
  data: T[];
  rowsPerPage?: number;
  summarySection?: React.ReactNode;
  orientation?: 'portrait' | 'landscape';
  printedBy?: string | null;
}

function chunkRows<T>(rows: T[], size: number): T[][] {
  if (rows.length === 0) {
    return [[]];
  }

  const chunks: T[][] = [];
  for (let i = 0; i < rows.length; i += size) {
    chunks.push(rows.slice(i, i + size));
  }

  return chunks;
}

export default function ReportPrintTable<T>({
  title,
  dateRange,
  columns,
  data,
  rowsPerPage,
  summarySection,
  orientation = 'portrait',
  printedBy,
}: ReportPrintTableProps<T>) {
  const safeRowsPerPage =
    typeof rowsPerPage === 'number' && rowsPerPage > 0
      ? rowsPerPage
      : Math.max(data.length, 1);

  const pagedData = useMemo(
    () => chunkRows(data, safeRowsPerPage),
    [data, safeRowsPerPage],
  );

  return (
    <div
      className={
        orientation === 'landscape'
          ? 'print-report print-report--landscape'
          : 'print-report'
      }
    >
      {orientation === 'landscape' && (
        <style>{`@media print { @page { size: A4 landscape; margin: 10mm; } }`}</style>
      )}
      {pagedData.map((pageRows, pageIdx) => (
        <section key={`print-page-${pageIdx}`} className="print-report-page">
          <h1>{title}</h1>
          <p className="print-report-date">{dateRange}</p>
          {printedBy && <p className="print-report-date">{printedBy}</p>}

          {pageIdx === 0 && summarySection}

          <table>
            <thead>
              <tr>
                {columns.map((col, i) => (
                  <th key={i}>{col.label}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {pageRows.map((row, rowIdx) => (
                <tr key={`${pageIdx}-${rowIdx}`}>
                  {columns.map((col, colIdx) => (
                    <td key={colIdx}>{col.accessor(row)}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      ))}
    </div>
  );
}
