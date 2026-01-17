'use client';

import { motion } from 'framer-motion';
import { StarIcon, ChatBubbleLeftIcon, ArrowTopRightOnSquareIcon } from '@heroicons/react/24/outline';
import { StarIcon as StarIconSolid } from '@heroicons/react/24/solid';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { StartWorkingButton } from '@/components/finder/StartWorkingButton';
import { SearchResult } from '@/lib/api';

interface IssueCardProps {
    issue: SearchResult;
    index: number;
    userId?: string;
}

const labelVariants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
    'good first issue': 'default',
    'help wanted': 'secondary',
    'bug': 'destructive',
    'documentation': 'outline',
};

function getLabelVariant(label: string): 'default' | 'secondary' | 'destructive' | 'outline' {
    const lowerLabel = label.toLowerCase();
    return labelVariants[lowerLabel] || 'outline';
}

function formatDate(dateString: string): string {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
    if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`;
    return `${Math.floor(diffDays / 365)} years ago`;
}

function formatNumber(num: number): string {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}k`;
    return num.toString();
}

// Extract repo owner and name from URL
function parseRepoUrl(repoUrl: string): { owner: string; name: string } {
    const match = repoUrl.match(/github\.com\/([^/]+)\/([^/]+)/);
    if (match) {
        return { owner: match[1], name: match[2] };
    }
    return { owner: '', name: '' };
}

export function IssueCard({ issue, index, userId }: IssueCardProps) {
    const { owner, name } = parseRepoUrl(issue.repo_url);

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: index * 0.05 }}
        >
            <Card className="hover:border-muted-foreground/50 transition-colors">
                <CardHeader className="pb-3">
                    {/* Repository Info */}
                    <CardDescription className="flex items-center gap-2">
                        <a
                            href={issue.repo_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="font-medium hover:text-primary transition-colors"
                        >
                            {issue.repo_full_name}
                        </a>
                        <span className="flex items-center gap-1">
                            <StarIconSolid className="h-4 w-4 text-yellow-500" />
                            {formatNumber(issue.repo_stars)}
                        </span>
                        {issue.language && (
                            <Badge variant="outline" className="text-xs">
                                {issue.language}
                            </Badge>
                        )}
                    </CardDescription>

                    {/* Issue Title */}
                    <CardTitle className="text-lg">
                        <a
                            href={issue.issue_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="hover:text-primary transition-colors flex items-start gap-2"
                        >
                            <span className="text-muted-foreground">#{issue.issue_number}</span>
                            <span>{issue.title}</span>
                            <ArrowTopRightOnSquareIcon className="h-4 w-4 flex-shrink-0 mt-1 opacity-50" />
                        </a>
                    </CardTitle>
                </CardHeader>

                <CardContent className="pt-0">
                    {/* Issue Body Preview */}
                    {issue.body && (
                        <p className="text-muted-foreground text-sm mb-3 line-clamp-2">
                            {issue.body}
                        </p>
                    )}

                    {/* Labels */}
                    {issue.labels.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mb-3">
                            {issue.labels.slice(0, 5).map((label) => (
                                <Badge key={label} variant={getLabelVariant(label)} className="text-xs">
                                    {label}
                                </Badge>
                            ))}
                            {issue.labels.length > 5 && (
                                <Badge variant="outline" className="text-xs">
                                    +{issue.labels.length - 5} more
                                </Badge>
                            )}
                        </div>
                    )}

                    {/* Footer */}
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                            <ChatBubbleLeftIcon className="h-4 w-4" />
                            {issue.comments_count} comments
                        </span>
                        <span>Created: {formatDate(issue.created_at)}</span>
                        <span>Updated: {formatDate(issue.updated_at)}</span>
                        <span className="ml-auto flex items-center gap-2">
                            <span>Match: {(issue.score * 100).toFixed(0)}%</span>
                            <StartWorkingButton
                                issueUrl={issue.issue_url}
                                repoOwner={owner}
                                repoName={name}
                                issueNumber={issue.issue_number}
                                issueTitle={issue.title}
                                userId={userId}
                            />
                        </span>
                    </div>
                </CardContent>
            </Card>
        </motion.div>
    );
}

