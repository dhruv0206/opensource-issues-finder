'use client';

import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface PaginationProps {
    currentPage: number;
    totalPages: number;
    totalItems?: number;
    itemsPerPage?: number;
    onPageChange: (page: number) => void;
    showItemCount?: boolean;
    className?: string;
}

export function Pagination({
    currentPage,
    totalPages,
    totalItems,
    itemsPerPage = 10,
    onPageChange,
    showItemCount = true,
    className = '',
}: PaginationProps) {
    // Don't render if only 1 page
    if (totalPages <= 1) {
        return showItemCount && totalItems ? (
            <div className={`text-sm text-muted-foreground ${className}`}>
                Showing {totalItems} {totalItems === 1 ? 'item' : 'items'}
            </div>
        ) : null;
    }

    // Calculate which page buttons to show
    const getPageNumbers = () => {
        const pages: (number | '...')[] = [];
        const showEllipsisStart = currentPage > 3;
        const showEllipsisEnd = currentPage < totalPages - 2;

        // Always show first page
        pages.push(1);

        if (showEllipsisStart) {
            pages.push('...');
        }

        // Show pages around current
        for (let i = Math.max(2, currentPage - 1); i <= Math.min(totalPages - 1, currentPage + 1); i++) {
            if (!pages.includes(i)) {
                pages.push(i);
            }
        }

        if (showEllipsisEnd) {
            pages.push('...');
        }

        // Always show last page
        if (totalPages > 1 && !pages.includes(totalPages)) {
            pages.push(totalPages);
        }

        return pages;
    };

    const startItem = (currentPage - 1) * itemsPerPage + 1;
    const endItem = Math.min(currentPage * itemsPerPage, totalItems || 0);

    return (
        <div className={`flex flex-col sm:flex-row items-center justify-between gap-4 ${className}`}>
            {/* Item count */}
            {showItemCount && totalItems !== undefined && (
                <p className="text-sm text-muted-foreground">
                    Showing {startItem}-{endItem} of {totalItems} items
                </p>
            )}

            {/* Pagination controls */}
            <div className="flex items-center gap-1">
                {/* Previous button */}
                <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onPageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                    className="h-8 w-8 p-0"
                >
                    <ChevronLeft className="h-4 w-4" />
                </Button>

                {/* Page numbers */}
                {getPageNumbers().map((page, index) => (
                    page === '...' ? (
                        <span key={`ellipsis-${index}`} className="px-2 text-muted-foreground">
                            ...
                        </span>
                    ) : (
                        <Button
                            key={page}
                            variant={currentPage === page ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => onPageChange(page)}
                            className="h-8 w-8 p-0"
                        >
                            {page}
                        </Button>
                    )
                ))}

                {/* Next button */}
                <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onPageChange(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    className="h-8 w-8 p-0"
                >
                    <ChevronRight className="h-4 w-4" />
                </Button>
            </div>
        </div>
    );
}
