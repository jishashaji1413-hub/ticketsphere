import { ChevronLeft, ChevronRight } from 'lucide-react';

interface PaginationBarProps {
  page: number;
  totalPages: number;
  total: number;
  limit: number;
  onPageChange: (nextPage: number) => void;
  onLimitChange?: (nextLimit: number) => void;
}

export function PaginationBar({
  page,
  totalPages,
  total,
  limit,
  onPageChange,
  onLimitChange,
}: PaginationBarProps) {
  if (total === 0) return null;

  const start = (page - 1) * limit + 1;
  const end = Math.min(page * limit, total);
  const safeTotalPages = Math.max(1, totalPages);

  // Build compact window of page numbers (up to 5 centered around current page)
  const pages: number[] = [];
  const half = 2;
  let minPage = Math.max(1, page - half);
  const maxPage = Math.min(safeTotalPages, minPage + 4);
  minPage = Math.max(1, maxPage - 4);
  for (let p = minPage; p <= maxPage; p += 1) {
    pages.push(p);
  }

  return (
    <div className="px-4 sm:px-5 py-3 border-t border-zinc-200/80 dark:border-zinc-800/80 flex flex-wrap items-center justify-between gap-3 text-xs text-zinc-500 dark:text-zinc-400">
      <div className="flex flex-wrap items-center gap-3">
        <span>
          Showing <span className="font-mono font-semibold text-zinc-800 dark:text-zinc-200">{start}</span>–
          <span className="font-mono font-semibold text-zinc-800 dark:text-zinc-200">{end}</span> of{' '}
          <span className="font-mono font-semibold text-zinc-800 dark:text-zinc-200">{total}</span>
        </span>
        {onLimitChange && (
          <label className="inline-flex items-center gap-1.5">
            <span>Rows:</span>
            <select
              value={limit}
              onChange={(e) => onLimitChange(Number(e.target.value))}
              className="rounded-lg border border-zinc-200 bg-zinc-50 text-zinc-700 dark:border-zinc-800 dark:bg-[#111215] px-2 py-1 text-xs font-medium dark:text-zinc-200 focus:border-blue-500 focus:outline-none"
            >
              {[10, 15, 25, 50].map((size) => (
                <option key={size} value={size}>
                  {size}
                </option>
              ))}
            </select>
          </label>
        )}
      </div>

      <div className="flex items-center gap-1">
        <button
          type="button"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
          className="p-1.5 rounded-lg border border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-[#111215] dark:text-zinc-300 dark:hover:bg-zinc-800 disabled:opacity-40"
          aria-label="Previous page"
        >
          <ChevronLeft className="h-3.5 w-3.5" />
        </button>
        {pages.map((p) => (
          <button
            key={p}
            type="button"
            onClick={() => onPageChange(p)}
            className={`min-w-[28px] h-7 px-2 rounded-lg text-xs font-mono font-semibold transition ${
              p === page
                ? 'bg-blue-600 text-white shadow-2xs'
                : 'border border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-[#111215] dark:text-zinc-300 dark:hover:bg-zinc-800'
            }`}
          >
            {p}
          </button>
        ))}
        <button
          type="button"
          disabled={page >= safeTotalPages}
          onClick={() => onPageChange(page + 1)}
          className="p-1.5 rounded-lg border border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-[#111215] dark:text-zinc-300 dark:hover:bg-zinc-800 disabled:opacity-40"
          aria-label="Next page"
        >
          <ChevronRight className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}
