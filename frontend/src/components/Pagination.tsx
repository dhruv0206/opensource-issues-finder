'use client';

import { Button } from '@/components/ui/button';
import { ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/outline';

interface PaginationProps {
    page: number;
    totalPages: number;
    total: number;
    hasNext: boolean;
    hasPrev: boolean;
    onPageChange: (page: number) => void;
    isLoading?: boolean;
}

export function Pagination({
    page,
    totalPages,
    total,
    hasNext,
    hasPrev,
    onPageChange,
    isLoading = false,
}: PaginationProps) {
    if (totalPages <= 1) return null;

    // Calculate visible page numbers
    const getPageNumbers = () => {
        const pages: (number | string)[] = [];
        const delta = 2; // Pages to show on each side of current

        for (let i = 1; i <= totalPages; i++) {
            if (
                i === 1 ||
                i === totalPages ||
                (i >= page - delta && i <= page + delta)
            ) {
                pages.push(i);
            } else if (pages[pages.length - 1] !== '...') {
                pages.push('...');
            }
        }

        return pages;
    };

    return (
        <div className="flex items-center justify-center gap-2 mt-8">
            <Button
                variant="outline"
                size="icon"
                onClick={() => onPageChange(page - 1)}
                disabled={!hasPrev || isLoading}
            >
                <ChevronLeftIcon className="h-4 w-4" />
            </Button>

            <div className="flex items-center gap-1">
                {getPageNumbers().map((pageNum, idx) =>
                    pageNum === '...' ? (
                        <span key={`ellipsis-${idx}`} className="px-2 text-muted-foreground">
                            ...
                        </span>
                    ) : (
                        <Button
                            key={pageNum}
                            variant={pageNum === page ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => onPageChange(pageNum as number)}
                            disabled={isLoading}
                            className="min-w-[40px]"
                        >
                            {pageNum}
                        </Button>
                    )
                )}
            </div>

            <Button
                variant="outline"
                size="icon"
                onClick={() => onPageChange(page + 1)}
                disabled={!hasNext || isLoading}
            >
                <ChevronRightIcon className="h-4 w-4" />
            </Button>

            <span className="ml-4 text-sm text-muted-foreground">
                {total} results
            </span>
        </div>
    );
}
