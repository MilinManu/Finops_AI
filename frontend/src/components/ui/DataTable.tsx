import React from 'react';
import { cn } from '../../utils/formatters';

export interface Column<T> {
  header: string;
  accessorKey?: keyof T;
  cell?: (item: T) => React.ReactNode;
  className?: string;
}

interface DataTableProps<T> {
  data: T[];
  columns: Column<T>[];
  keyExtractor: (item: T) => string;
  isLoading?: boolean;
  emptyMessage?: string;
}

export function DataTable<T>({
  data,
  columns,
  keyExtractor,
  isLoading,
  emptyMessage = 'No records found',
}: DataTableProps<T>) {
  if (isLoading) {
    return (
      <div className="p-8 text-center text-slate-400 animate-pulse text-sm">
        Loading table data...
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="p-8 text-center text-slate-400 text-sm">
        {emptyMessage}
      </div>
    );
  }

  return (
    <div className="w-full overflow-x-auto rounded-xl border border-slate-800 bg-[#0b1329]/60">
      <table className="w-full text-left text-sm text-slate-300">
        <thead className="bg-[#0f172a] text-xs uppercase tracking-wider text-slate-400 border-b border-slate-800">
          <tr>
            {columns.map((col, idx) => (
              <th key={idx} className={cn('px-4 py-3.5 font-semibold', col.className)}>
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-800/60">
          {data.map((item) => (
            <tr
              key={keyExtractor(item)}
              className="hover:bg-slate-800/40 transition-colors"
            >
              {columns.map((col, idx) => (
                <td key={idx} className={cn('px-4 py-3.5 text-slate-200', col.className)}>
                  {col.cell
                    ? col.cell(item)
                    : col.accessorKey
                    ? String(item[col.accessorKey] ?? '')
                    : null}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
