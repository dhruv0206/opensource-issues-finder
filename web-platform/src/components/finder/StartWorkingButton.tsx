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
import { Badge } from '@/components/ui/badge';
import { PlayCircle, CheckCircle, Loader2 } from 'lucide-react';

interface StartWorkingButtonProps {
    issueUrl: string;
    repoOwner: string;
    repoName: string;
    issueNumber: number;
    issueTitle: string;
    userId?: string;
    isTracking?: boolean;
    onTrackingChange?: (isTracking: boolean) => void;
}

export function StartWorkingButton({
    issueUrl,
    repoOwner,
    repoName,
    issueNumber,
    issueTitle,
    userId,
    isTracking = false,
    onTrackingChange,
}: StartWorkingButtonProps) {
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [tracking, setTracking] = useState(isTracking);
    const [error, setError] = useState<string | null>(null);

    const handleStartWorking = async () => {
        if (!userId) {
            setError('Please sign in to track issues');
            return;
        }

        setLoading(true);
        setError(null);

        try {
            const response = await fetch('http://localhost:8000/api/issues/track', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    user_id: userId,
                    issue_url: issueUrl,
                    repo_owner: repoOwner,
                    repo_name: repoName,
                    issue_number: issueNumber,
                    issue_title: issueTitle,
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.detail || 'Failed to track issue');
            }

            setTracking(true);
            setOpen(false);
            onTrackingChange?.(true);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Something went wrong');
        } finally {
            setLoading(false);
        }
    };

    if (tracking) {
        return (
            <Badge variant="secondary" className="gap-1">
                <CheckCircle className="h-3 w-3" />
                Tracking
            </Badge>
        );
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="gap-1">
                    <PlayCircle className="h-4 w-4" />
                    Start Working
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Start Working on This Issue?</DialogTitle>
                    <DialogDescription>
                        This will add the issue to your dashboard so you can track your progress.
                    </DialogDescription>
                </DialogHeader>

                <div className="py-4">
                    <div className="rounded-lg border p-4 space-y-2">
                        <p className="font-medium">
                            {repoOwner}/{repoName} #{issueNumber}
                        </p>
                        <p className="text-sm text-muted-foreground line-clamp-2">
                            {issueTitle}
                        </p>
                    </div>

                    {error && (
                        <p className="text-sm text-destructive mt-2">{error}</p>
                    )}
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={() => setOpen(false)}>
                        Cancel
                    </Button>
                    <Button onClick={handleStartWorking} disabled={loading}>
                        {loading ? (
                            <>
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                Starting...
                            </>
                        ) : (
                            <>
                                <PlayCircle className="h-4 w-4 mr-2" />
                                Start Working
                            </>
                        )}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
