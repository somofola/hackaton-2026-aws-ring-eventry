import React from "react";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";

export const buildPageList = (
  current: number,
  total: number,
): (number | "ellipsis")[] => {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const pages: (number | "ellipsis")[] = [1];
  const start = Math.max(2, current - 1);
  const end = Math.min(total - 1, current + 1);
  if (start > 2) pages.push("ellipsis");
  for (let i = start; i <= end; i++) pages.push(i);
  if (end < total - 1) pages.push("ellipsis");
  pages.push(total);
  return pages;
};

export interface ListPaginationProps {
  currentPage: number;
  totalPages: number;
  totalItems?: number;
  pageSize?: number;
  onPageChange: (page: number) => void;
  itemLabel?: string;
  className?: string;
}

const ListPagination: React.FC<ListPaginationProps> = ({
  currentPage,
  totalPages,
  totalItems,
  pageSize,
  onPageChange,
  itemLabel = "items",
  className = "",
}) => {
  if (totalPages <= 1 && (totalItems ?? 0) <= (pageSize ?? 0)) return null;

  const safePage = Math.max(1, Math.min(currentPage, Math.max(1, totalPages)));
  const showingFrom =
    totalItems && pageSize ? (safePage - 1) * pageSize + 1 : null;
  const showingTo =
    totalItems && pageSize ? Math.min(safePage * pageSize, totalItems) : null;

  return (
    <div
      className={`flex flex-col gap-3 pt-4 sm:flex-row sm:items-center sm:justify-between ${className}`}
    >
      {totalItems !== undefined && showingFrom !== null ? (
        <p className="text-sm text-gray-500">
          Showing {showingFrom}–{showingTo} of {totalItems} {itemLabel}
        </p>
      ) : (
        <p className="text-sm text-gray-500">
          Page {safePage} of {Math.max(1, totalPages)}
        </p>
      )}
      <div className="flex flex-wrap items-center gap-1">
        <Button
          size="sm"
          variant="outline"
          onClick={() => onPageChange(Math.max(1, safePage - 1))}
          disabled={safePage <= 1}
          aria-label="Previous page"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        {buildPageList(safePage, Math.max(1, totalPages)).map((item, idx) =>
          item === "ellipsis" ? (
            <span
              key={`ellipsis-${idx}`}
              className="px-2 text-sm text-gray-400 select-none"
              aria-hidden="true"
            >
              …
            </span>
          ) : (
            <Button
              key={item}
              size="sm"
              variant={item === safePage ? "default" : "outline"}
              onClick={() => onPageChange(item)}
              aria-label={`Page ${item}`}
              aria-current={item === safePage ? "page" : undefined}
              className="min-w-9 px-3"
            >
              {item}
            </Button>
          ),
        )}
        <Button
          size="sm"
          variant="outline"
          onClick={() => onPageChange(Math.min(totalPages, safePage + 1))}
          disabled={safePage >= totalPages}
          aria-label="Next page"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
};

export default ListPagination;
