'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { VerifyPRButton } from '@/components/VerifyPRButton';
import {
    ExternalLink,
    Clock,
    CheckCircle,
    XCircle,
    AlertCircle,
    Trash2,
    RefreshCw
} from 'lucide-react';

interface TrackedIssue {
    id: string;
    user_id: string;
    issue_url: string;
    repo_owner: string;
    repo_name: string;
    issue_number: number;
    issue_title: string | null;
    status: string;
    started_at: string;
    pr_url: string | null;
    verified_at: string | null;
    check_count: number;
}

interface TrackedIssuesDashboardProps {
    userId: string;
}

const statusConfig: Record<string, { icon: React.ElementType; label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
    in_progress: { icon: Clock, label: 'In Progress', variant: 'secondary' },
    pr_submitted: { icon: AlertCircle, label: 'Awaiting Verification', variant: 'outline' },
    verified: { icon: CheckCircle, label: 'Verified', variant: 'default' },
    expired: { icon: XCircle, label: 'Expired', variant: 'destructive' },
    abandoned: { icon: XCircle, label: 'Abandoned', variant: 'destructive' },
};

function formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
    });
}

export function TrackedIssuesDashboard({ userId }: TrackedIssuesDashboardProps) {
    const [issues, setIssues] = useState<TrackedIssue[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchIssues = async () => {
        setLoading(true);
        setError(null);

        const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

        try {
            const response = await fetch(`${API_BASE_URL}/api/issues/tracked/${userId}`);
            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.detail || 'Failed to fetch issues');
            }

            setIssues(data.issues);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Something went wrong');
        } finally {
            setLoading(false);
        }
    };

    const handleAbandon = async (issueId: string) => {
        const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
        try {
            const response = await fetch(`${API_BASE_URL}/api/issues/abandon`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ user_id: userId, issue_id: issueId }),
            });

            if (response.ok) {
                setIssues(issues.filter(issue => issue.id !== issueId));
            }
        } catch (err) {
            console.error('Failed to abandon issue:', err);
        }
    };

    useEffect(() => {
        if (userId) {
            fetchIssues();
        }
    }, [userId]);

    if (loading) {
        return (
            <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                    <Card key={i}>
                        <CardHeader>
                            <Skeleton className="h-4 w-48" />
                            <Skeleton className="h-6 w-full" />
                        </CardHeader>
                        <CardContent>
                            <Skeleton className="h-8 w-32" />
                        </CardContent>
                    </Card>
                ))}
            </div>
        );
    }

    if (error) {
        return (
            <Card>
                <CardContent className="py-8 text-center">
                    <p className="text-destructive mb-4">{error}</p>
                    <Button variant="outline" onClick={fetchIssues}>
                        <RefreshCw className="h-4 w-4 mr-2" />
                        Try Again
                    </Button>
                </CardContent>
            </Card>
        );
    }

    if (issues.length === 0) {
        return (
            <Card>
                <CardContent className="py-12 text-center">
                    <Clock className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <h3 className="text-lg font-medium mb-2">No Tracked Issues</h3>
                    <p className="text-muted-foreground mb-4">
                        Start working on an issue to track your progress here.
                    </p>
                    <Button variant="outline" asChild>
                        <a href="/">Browse Issues</a>
                    </Button>
                </CardContent>
            </Card>
        );
    }

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold">Tracked Issues ({issues.length})</h2>
                <Button variant="ghost" size="sm" onClick={fetchIssues}>
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Refresh
                </Button>
            </div>

            {issues.map((issue) => {
                const config = statusConfig[issue.status] || statusConfig.in_progress;
                const StatusIcon = config.icon;

                return (
                    <Card key={issue.id}>
                        <CardHeader className="pb-3">
                            <CardDescription className="flex items-center justify-between">
                                <a
                                    href={`https://github.com/${issue.repo_owner}/${issue.repo_name}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="font-medium hover:text-primary transition-colors"
                                >
                                    {issue.repo_owner}/{issue.repo_name}
                                </a>
                                <Badge variant={config.variant} className="gap-1">
                                    <StatusIcon className="h-3 w-3" />
                                    {config.label}
                                </Badge>
                            </CardDescription>

                            <CardTitle className="text-lg">
                                <a
                                    href={issue.issue_url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="hover:text-primary transition-colors flex items-start gap-2"
                                >
                                    <span className="text-muted-foreground">#{issue.issue_number}</span>
                                    <span>{issue.issue_title || 'Untitled Issue'}</span>
                                    <ExternalLink className="h-4 w-4 flex-shrink-0 mt-1 opacity-50" />
                                </a>
                            </CardTitle>
                        </CardHeader>

                        <CardContent className="pt-0">
                            <div className="flex items-center justify-between">
                                <p className="text-xs text-muted-foreground">
                                    Started: {formatDate(issue.started_at)}
                                    {issue.verified_at && ` • Verified: ${formatDate(issue.verified_at)}`}
                                </p>

                                <div className="flex items-center gap-2">
                                    {issue.status === 'in_progress' && (
                                        <VerifyPRButton
                                            issueId={issue.id}
                                            userId={userId}
                                            currentStatus={issue.status}
                                            prUrl={issue.pr_url || undefined}
                                            onVerify={() => fetchIssues()}
                                        />
                                    )}

                                    {issue.status === 'pr_submitted' && (
                                        <VerifyPRButton
                                            issueId={issue.id}
                                            userId={userId}
                                            currentStatus={issue.status}
                                            prUrl={issue.pr_url || undefined}
                                            onVerify={() => fetchIssues()}
                                        />
                                    )}

                                    {issue.status !== 'verified' && (
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => handleAbandon(issue.id)}
                                            className="text-muted-foreground hover:text-destructive"
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    )}
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                );
            })}
        </div>
    );
}
