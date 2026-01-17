'use client';

import { useEffect, useState } from 'react';
import { getStats } from '@/lib/api';

interface StatsBarProps {
    className?: string;
}

export function StatsBar({ className }: StatsBarProps) {
    const [totalIssues, setTotalIssues] = useState<number | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        async function loadStats() {
            try {
                const stats = await getStats();
                setTotalIssues(stats.total_issues);
            } catch (err) {
                console.error('Failed to load stats:', err);
            } finally {
                setIsLoading(false);
            }
        }
        loadStats();
    }, []);

    if (isLoading) {
        return (
            <div className={`text-sm text-muted-foreground ${className}`}>
                <span className="inline-block w-20 h-4 bg-muted/50 rounded animate-pulse" />
            </div>
        );
    }

    if (totalIssues === null) return null;

    const formattedCount = totalIssues.toLocaleString();

    return (
        <div className={`flex items-center gap-2 text-sm text-muted-foreground ${className}`}>
            <span className="inline-flex items-center gap-1.5">
                <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
                <span className="font-medium text-foreground">{formattedCount}</span>
                <span>issues indexed</span>
            </span>
        </div>
    );
}
