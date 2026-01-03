'use client';

import { motion } from 'framer-motion';
import { SearchResult } from '@/lib/api';
import { IssueCard } from './IssueCard';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

interface SearchResultsProps {
    results: SearchResult[];
    isLoading: boolean;
}

export function SearchResults({ results, isLoading }: SearchResultsProps) {
    if (isLoading) {
        return (
            <div className="space-y-4">
                {[...Array(3)].map((_, i) => (
                    <Card key={i}>
                        <CardContent className="p-5">
                            <div className="space-y-3">
                                <Skeleton className="h-4 w-1/3" />
                                <Skeleton className="h-6 w-3/4" />
                                <Skeleton className="h-4 w-full" />
                                <Skeleton className="h-4 w-2/3" />
                                <div className="flex gap-2 pt-2">
                                    <Skeleton className="h-6 w-24 rounded-full" />
                                    <Skeleton className="h-6 w-20 rounded-full" />
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>
        );
    }

    if (results.length === 0) {
        return null;
    }

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-4"
        >
            <p className="text-sm text-muted-foreground mb-4">
                Found {results.length} contribution opportunities
            </p>
            {results.map((issue, index) => (
                <IssueCard key={issue.issue_id} issue={issue} index={index} />
            ))}
        </motion.div>
    );
}
