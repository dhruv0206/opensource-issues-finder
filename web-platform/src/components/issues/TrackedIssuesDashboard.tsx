'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { VerifyPRButton } from '@/components/issues/VerifyPRButton';
import { Pagination } from '@/components/shared/Pagination';
import {
    ExternalLink,
    Clock,
    CheckCircle,
    XCircle,
    AlertCircle,
    Trash2,
    RefreshCw,
    Plus,
    HelpCircle,
    ChevronDown,
    ChevronUp
} from 'lucide-react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";

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

// Parse GitHub URL: supports both issues and PRs
type GitHubUrlType = 'issue' | 'pr';
interface ParsedGitHubUrl {
    type: GitHubUrlType;
    owner: string;
    repo: string;
    number: number;
}

function parseGitHubUrl(url: string): ParsedGitHubUrl | null {
    // Try issue URL: https://github.com/owner/repo/issues/123
    const issueMatch = url.match(/github\.com\/([^/]+)\/([^/]+)\/issues\/(\d+)/);
    if (issueMatch) {
        return {
            type: 'issue',
            owner: issueMatch[1],
            repo: issueMatch[2],
            number: parseInt(issueMatch[3], 10),
        };
    }

    // Try PR URL: https://github.com/owner/repo/pull/123
    const prMatch = url.match(/github\.com\/([^/]+)\/([^/]+)\/pull\/(\d+)/);
    if (prMatch) {
        return {
            type: 'pr',
            owner: prMatch[1],
            repo: prMatch[2],
            number: parseInt(prMatch[3], 10),
        };
    }

    return null;
}


export function TrackedIssuesDashboard({ userId }: TrackedIssuesDashboardProps) {
    const [issues, setIssues] = useState<TrackedIssue[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Pagination state
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalItems, setTotalItems] = useState(0);
    const ITEMS_PER_PAGE = 10;

    // Track New Issue dialog state
    const [dialogOpen, setDialogOpen] = useState(false);
    const [issueUrl, setIssueUrl] = useState('');
    const [trackingLoading, setTrackingLoading] = useState(false);
    const [trackingError, setTrackingError] = useState<string | null>(null);

    // How it Works section state
    const [showHelp, setShowHelp] = useState(false);

    const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

    const fetchIssues = async (page: number = currentPage) => {
        setLoading(true);
        setError(null);

        try {
            const response = await fetch(
                `${API_BASE_URL}/api/issues/tracked/${userId}?page=${page}&limit=${ITEMS_PER_PAGE}`
            );
            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.detail || 'Failed to fetch issues');
            }

            setIssues(data.issues);
            setTotalPages(data.total_pages);
            setTotalItems(data.total);
            setCurrentPage(page);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Something went wrong');
        } finally {
            setLoading(false);
        }
    };

    const handlePageChange = (page: number) => {
        fetchIssues(page);
    };

    const handleAddToPortfolio = async () => {
        setTrackingError(null);

        const parsed = parseGitHubUrl(issueUrl);
        if (!parsed) {
            setTrackingError('Invalid GitHub URL. Expected: https://github.com/owner/repo/issues/123 or https://github.com/owner/repo/pull/123');
            return;
        }

        setTrackingLoading(true);

        try {
            if (parsed.type === 'issue') {
                // Track as in-progress issue
                const response = await fetch(`${API_BASE_URL}/api/issues/track`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        user_id: userId,
                        issue_url: issueUrl,
                        repo_owner: parsed.owner,
                        repo_name: parsed.repo,
                        issue_number: parsed.number,
                    }),
                });

                const data = await response.json();
                if (!response.ok) {
                    throw new Error(data.detail || 'Failed to track issue');
                }
            } else {
                // PR URL - verify immediately
                const response = await fetch(`${API_BASE_URL}/api/issues/verify-pr`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        user_id: userId,
                        pr_url: issueUrl,
                        repo_owner: parsed.owner,
                        repo_name: parsed.repo,
                        pr_number: parsed.number,
                    }),
                });

                const data = await response.json();
                if (!response.ok) {
                    throw new Error(data.detail || 'Failed to verify PR');
                }
            }

            // Success! Close dialog and refresh
            setDialogOpen(false);
            setIssueUrl('');
            fetchIssues();
        } catch (err) {
            setTrackingError(err instanceof Error ? err.message : 'Something went wrong');
        } finally {
            setTrackingLoading(false);
        }
    };


    const handleAbandon = async (issueId: string) => {
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

    // Track New Issue Dialog Component
    const TrackIssueDialog = (
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
                <Button size="sm">
                    <Plus className="h-4 w-4 mr-2" />
                    Track New Issue
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>Add to Portfolio</DialogTitle>
                    <DialogDescription>
                        Paste a GitHub Issue or PR URL. Issues will be tracked as &quot;in progress&quot;. PRs will be verified immediately.
                    </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                    <div className="space-y-2">
                        <Label htmlFor="issue-url">GitHub URL</Label>
                        <Input
                            id="issue-url"
                            placeholder="https://github.com/owner/repo/issues/123 or .../pull/123"
                            value={issueUrl}
                            onChange={(e) => setIssueUrl(e.target.value)}
                        />
                    </div>
                    {trackingError && (
                        <p className="text-sm text-destructive">{trackingError}</p>
                    )}
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => setDialogOpen(false)}>
                        Cancel
                    </Button>
                    <Button onClick={handleAddToPortfolio} disabled={trackingLoading || !issueUrl}>
                        {trackingLoading ? 'Processing...' : 'Add'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );

    if (loading) {
        return (
            <div className="space-y-4">
                <div className="flex items-center justify-between">
                    <h2 className="text-xl font-semibold">Tracked Issues</h2>
                    {TrackIssueDialog}
                </div>
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
                    <Button variant="outline" onClick={() => fetchIssues()}>
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
                    <div className="flex items-center justify-center gap-2">
                        {TrackIssueDialog}
                        <Button variant="outline" asChild>
                            <a href="/">Browse Issues</a>
                        </Button>
                    </div>
                </CardContent>
            </Card>
        );
    }

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold">Tracked Issues ({issues.length})</h2>
                <div className="flex items-center gap-2">
                    {TrackIssueDialog}
                    <Button variant="ghost" size="sm" onClick={() => fetchIssues()}>
                        <RefreshCw className="h-4 w-4 mr-2" />
                        Refresh
                    </Button>
                </div>
            </div>

            {/* How it Works Section */}
            <Card className="border-dashed">
                <button
                    onClick={() => setShowHelp(!showHelp)}
                    className="w-full px-6 py-3 flex items-center justify-between text-left hover:bg-muted/50 transition-colors"
                >
                    <div className="flex items-center gap-2">
                        <HelpCircle className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium text-sm">How it Works</span>
                    </div>
                    {showHelp ? (
                        <ChevronUp className="h-4 w-4 text-muted-foreground" />
                    ) : (
                        <ChevronDown className="h-4 w-4 text-muted-foreground" />
                    )}
                </button>
                {showHelp && (
                    <CardContent className="pt-0 pb-4">
                        <div className="grid gap-4 md:grid-cols-2 text-sm">
                            <div className="space-y-2">
                                <h4 className="font-semibold flex items-center gap-2">
                                    <Clock className="h-4 w-4" />
                                    Track an Issue
                                </h4>
                                <ol className="list-decimal list-inside text-muted-foreground space-y-1">
                                    <li>Click &quot;Start Working&quot; on search results <span className="italic">(or add manually)</span></li>
                                    <li>Work on the issue &amp; create a PR on GitHub</li>
                                    <li>Click &quot;Verify My PR&quot; and paste your PR URL</li>
                                    <li>System verifies when PR is merged</li>
                                </ol>
                            </div>
                            <div className="space-y-2">
                                <h4 className="font-semibold flex items-center gap-2">
                                    <CheckCircle className="h-4 w-4" />
                                    Add Past Contributions
                                </h4>
                                <ol className="list-decimal list-inside text-muted-foreground space-y-1">
                                    <li>Click &quot;Track New Issue&quot;</li>
                                    <li>Paste a <strong>PR URL</strong> (not issue URL)</li>
                                    <li>Verified instantly if merged &amp; authored by you</li>
                                </ol>
                            </div>
                        </div>
                    </CardContent>
                )}
            </Card>

            {issues.map((issue) => {
                const config = statusConfig[issue.status] || statusConfig.in_progress;
                const StatusIcon = config.icon;

                return (
                    <Card key={issue.id} className="bg-card">
                        <CardContent className="p-6">
                            <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
                                {/* Issue Info */}
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                                        <span>{issue.repo_owner}/{issue.repo_name}</span>
                                    </div>

                                    <h3 className="text-lg font-semibold mb-2 flex items-center gap-2">
                                        <span className="text-primary">#{issue.issue_number}</span>
                                        <span className="truncate">
                                            {issue.issue_title || 'Untitled Issue'}
                                        </span>
                                        <a
                                            href={issue.issue_url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-muted-foreground hover:text-primary transition-colors"
                                        >
                                            <ExternalLink className="h-4 w-4" />
                                        </a>
                                    </h3>

                                    <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                                        <span>
                                            Started: {new Date(issue.started_at).toLocaleDateString()}
                                        </span>
                                        {issue.verified_at && (
                                            <span>
                                                • Verified: {new Date(issue.verified_at).toLocaleDateString()}
                                            </span>
                                        )}
                                    </div>
                                </div>

                                {/* Status & Actions */}
                                <div className="flex flex-wrap items-center gap-2">
                                    <Badge
                                        variant="outline"
                                        className={`flex items-center gap-1`}
                                    >
                                        <StatusIcon className="h-3 w-3" />
                                        {config.label}
                                    </Badge>

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

            {/* Pagination */}
            {totalPages > 1 && (
                <Pagination
                    currentPage={currentPage}
                    totalPages={totalPages}
                    totalItems={totalItems}
                    itemsPerPage={ITEMS_PER_PAGE}
                    onPageChange={handlePageChange}
                    className="mt-6"
                />
            )}
        </div>
    );
}
