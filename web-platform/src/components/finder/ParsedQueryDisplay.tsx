'use client';

import { motion } from 'framer-motion';
import { ParsedQuery } from '@/lib/api';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { XMarkIcon, SparklesIcon } from '@heroicons/react/24/outline';

interface ParsedQueryDisplayProps {
    parsedQuery: ParsedQuery;
    onClear: () => void;
}

export function ParsedQueryDisplay({ parsedQuery, onClear }: ParsedQueryDisplayProps) {
    const filters: { label: string; value: string }[] = [];

    if (parsedQuery.language) {
        filters.push({ label: 'Language', value: parsedQuery.language });
    }
    if (parsedQuery.min_stars) {
        filters.push({ label: 'Min Stars', value: `${parsedQuery.min_stars.toLocaleString()}+` });
    }
    if (parsedQuery.difficulty) {
        filters.push({ label: 'Difficulty', value: parsedQuery.difficulty });
    }
    if (parsedQuery.days_ago) {
        filters.push({ label: 'Updated', value: `Last ${parsedQuery.days_ago} days` });
    }
    if (parsedQuery.sort_by && parsedQuery.sort_by !== 'relevance') {
        const sortDisplayMap: Record<string, string> = {
            'recency': 'Recently Discussed',
            'recently_discussed': 'Recently Discussed',
            'newest': 'Newest',
            'stars': 'Most Stars'
        };
        filters.push({ label: 'Sort', value: sortDisplayMap[parsedQuery.sort_by] || parsedQuery.sort_by });
    }
    if (parsedQuery.labels && parsedQuery.labels.length > 0) {
        filters.push({ label: 'Labels', value: parsedQuery.labels.join(', ') });
    }

    if (filters.length === 0) {
        return null;
    }

    return (
        <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6"
        >
            <Alert>
                <SparklesIcon className="h-4 w-4" />
                <AlertTitle className="flex items-center justify-between">
                    <span>AI extracted filters from your query</span>
                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={onClear}>
                        <XMarkIcon className="h-4 w-4" />
                    </Button>
                </AlertTitle>
                <AlertDescription>
                    <div className="flex flex-wrap gap-2 mt-2">
                        {filters.map((filter) => (
                            <Badge key={filter.label} variant="secondary" className="text-sm">
                                <span className="text-muted-foreground mr-1">{filter.label}:</span>
                                <span className="font-medium">{filter.value}</span>
                            </Badge>
                        ))}
                    </div>
                </AlertDescription>
            </Alert>
        </motion.div>
    );
}
