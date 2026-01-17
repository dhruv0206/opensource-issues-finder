'use client';

import { useEffect, useState } from 'react';
import { StatsCard } from '@/components/dashboard/StatsCard';
import { ActivityTimeline } from '@/components/dashboard/ActivityTimeline';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import Link from 'next/link';
import {
    CheckCircle2,
    Clock,
    GitFork,
    ArrowRight,
    AlertCircle
} from 'lucide-react';

interface DashboardStats {
    verifiedPRs: number;
    inProgress: number;
    prSubmitted: number;
    repositories: number;
    recentActivity: Array<{
        id: string;
        type: 'started' | 'submitted' | 'verified';
        issueTitle: string;
        repoName: string;
        timestamp: string;
    }>;
    activeIssues: Array<{
        id: string;
        title: string;
        repoName: string;
        status: string;
        createdAt: string;
    }>;
}

interface DashboardContentProps {
    userId: string;
}

export function DashboardContent({ userId }: DashboardContentProps) {
    const [stats, setStats] = useState<DashboardStats | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        async function fetchStats() {
            try {
                const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
                const response = await fetch(`${API_URL}/api/users/me/stats`, {
                    credentials: 'include',
                    headers: {
                        'X-User-Id': userId,
                    },
                });

                if (!response.ok) {
                    throw new Error('Failed to fetch stats');
                }

                const data = await response.json();
                setStats(data);
            } catch (err) {
                console.error('Error fetching dashboard stats:', err);
                setError('Failed to load dashboard stats');
            } finally {
                setLoading(false);
            }
        }

        fetchStats();
    }, [userId]);

    if (loading) {
        return (
            <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {[...Array(4)].map((_, i) => (
                        <Card key={i}>
                            <CardContent className="p-6">
                                <Skeleton className="h-4 w-24 mb-2" />
                                <Skeleton className="h-8 w-16" />
                            </CardContent>
                        </Card>
                    ))}
                </div>
                <Card>
                    <CardContent className="p-6">
                        <Skeleton className="h-4 w-32 mb-4" />
                        <Skeleton className="h-20 w-full" />
                    </CardContent>
                </Card>
            </div>
        );
    }

    if (error || !stats) {
        return (
            <Card>
                <CardContent className="p-6 text-center">
                    <AlertCircle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">{error || 'Unable to load dashboard'}</p>
                    <Button variant="outline" className="mt-4" onClick={() => window.location.reload()}>
                        Try Again
                    </Button>
                </CardContent>
            </Card>
        );
    }

    return (
        <div className="space-y-6">
            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatsCard
                    title="Verified PRs"
                    value={stats.verifiedPRs}
                    icon={CheckCircle2}
                    description="Successfully merged"
                />
                <StatsCard
                    title="In Progress"
                    value={stats.inProgress}
                    icon={Clock}
                    description="Currently working on"
                />
                <StatsCard
                    title="PR Submitted"
                    value={stats.prSubmitted}
                    icon={GitFork}
                    description="Awaiting verification"
                />
                <StatsCard
                    title="Repositories"
                    value={stats.repositories}
                    icon={GitFork}
                    description="Unique repos contributed to"
                />
            </div>

            {/* Two Column Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Activity Timeline */}
                <ActivityTimeline activities={stats.recentActivity} />

                {/* Quick Actions / Active Issues */}
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between">
                        <CardTitle className="text-lg">Active Issues</CardTitle>
                        <Link href="/issues">
                            <Button variant="ghost" size="sm">
                                View All <ArrowRight className="h-4 w-4 ml-1" />
                            </Button>
                        </Link>
                    </CardHeader>
                    <CardContent>
                        {stats.activeIssues.length === 0 ? (
                            <div className="text-center py-8">
                                <p className="text-muted-foreground text-sm mb-4">
                                    No active issues. Start contributing!
                                </p>
                                <Link href="/finder">
                                    <Button>Find Issues</Button>
                                </Link>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {stats.activeIssues.slice(0, 5).map((issue) => (
                                    <div
                                        key={issue.id}
                                        className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                                    >
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-medium truncate">
                                                {issue.title}
                                            </p>
                                            <p className="text-xs text-muted-foreground">
                                                {issue.repoName}
                                            </p>
                                        </div>
                                        <Badge
                                            variant={issue.status === 'pr_submitted' ? 'default' : 'secondary'}
                                        >
                                            {issue.status === 'in_progress' ? 'In Progress' : 'PR Submitted'}
                                        </Badge>
                                    </div>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
