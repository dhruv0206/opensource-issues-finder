'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, Loader2, ExternalLink } from 'lucide-react';

interface VerifyPRButtonProps {
    issueId: string;
    userId: string;
    currentStatus: string;
    prUrl?: string;
    onVerify?: (prUrl: string) => void;
}

export function VerifyPRButton({
    issueId,
    userId,
    currentStatus,
    prUrl: existingPrUrl,
    onVerify,
}: VerifyPRButtonProps) {
    const [open, setOpen] = useState(false);
    const [prUrl, setPrUrl] = useState(existingPrUrl || '');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = async () => {
        if (!prUrl.trim()) {
            setError('Please enter a PR URL');
            return;
        }

        // Validate PR URL format
        const prRegex = /^https:\/\/github\.com\/[\w-]+\/[\w-]+\/pull\/\d+$/;
        if (!prRegex.test(prUrl)) {
            setError('Invalid PR URL. Expected: https://github.com/owner/repo/pull/123');
            return;
        }

        setLoading(true);
        setError(null);

        const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

        try {
            const response = await fetch(`${API_BASE_URL}/api/issues/verify`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    user_id: userId,
                    issue_id: issueId,
                    pr_url: prUrl,
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.detail || 'Failed to submit PR');
            }

            setOpen(false);
            onVerify?.(prUrl);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Something went wrong');
        } finally {
            setLoading(false);
        }
    };

    // Show verified badge if already verified
    if (currentStatus === 'verified') {
        return (
            <Badge className="gap-1 bg-green-500/20 text-green-700 border-green-500/30">
                <CheckCircle className="h-3 w-3" />
                Verified
            </Badge>
        );
    }

    // Show pending badge if PR already submitted
    if (currentStatus === 'pr_submitted' && existingPrUrl) {
        return (
            <div className="flex items-center gap-2">
                <Badge variant="secondary" className="gap-1">
                    <Loader2 className="h-3 w-3 animate-spin" />
                    Pending Verification
                </Badge>
                <a
                    href={existingPrUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-muted-foreground hover:text-primary flex items-center gap-1"
                >
                    View PR <ExternalLink className="h-3 w-3" />
                </a>
            </div>
        );
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="default" size="sm" className="gap-1">
                    <CheckCircle className="h-4 w-4" />
                    Verify My PR
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>Submit Your Pull Request</DialogTitle>
                    <DialogDescription>
                        Enter the URL of your merged or open PR to verify your contribution.
                    </DialogDescription>
                </DialogHeader>

                <div className="py-4 space-y-4">
                    <div>
                        <label htmlFor="pr-url" className="text-sm font-medium">
                            Pull Request URL
                        </label>
                        <Input
                            id="pr-url"
                            placeholder="https://github.com/owner/repo/pull/123"
                            value={prUrl}
                            onChange={(e) => setPrUrl(e.target.value)}
                            className="mt-1"
                        />
                    </div>

                    {error && (
                        <p className="text-sm text-destructive">{error}</p>
                    )}

                    <p className="text-xs text-muted-foreground">
                        We&apos;ll check if the PR references the issue, is authored by you, and is merged.
                    </p>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={() => setOpen(false)}>
                        Cancel
                    </Button>
                    <Button onClick={handleSubmit} disabled={loading}>
                        {loading ? (
                            <>
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                Submitting...
                            </>
                        ) : (
                            'Submit for Verification'
                        )}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
