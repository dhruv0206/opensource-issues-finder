'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
    GitPullRequest,
    PlayCircle,
    CheckCircle2,
    Clock
} from 'lucide-react';

interface ActivityItem {
    id: string;
    type: 'started' | 'submitted' | 'verified';
    issueTitle: string;
    repoName: string;
    timestamp: string;
}

interface ActivityTimelineProps {
    activities: ActivityItem[];
}

const activityConfig = {
    started: {
        icon: PlayCircle,
        label: 'Started working on',
        color: 'text-blue-500',
        bgColor: 'bg-blue-500/10',
    },
    submitted: {
        icon: GitPullRequest,
        label: 'Submitted PR for',
        color: 'text-yellow-500',
        bgColor: 'bg-yellow-500/10',
    },
    verified: {
        icon: CheckCircle2,
        label: 'PR verified for',
        color: 'text-green-500',
        bgColor: 'bg-green-500/10',
    },
};

function formatRelativeTime(dateString: string): string {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
}

export function ActivityTimeline({ activities }: ActivityTimelineProps) {
    if (activities.length === 0) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                        <Clock className="h-5 w-5" />
                        Recent Activity
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-muted-foreground text-sm">
                        No activity yet. Start tracking an issue to see your progress here!
                    </p>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                    <Clock className="h-5 w-5" />
                    Recent Activity
                </CardTitle>
            </CardHeader>
            <CardContent>
                <div className="space-y-4">
                    {activities.map((activity, index) => {
                        const config = activityConfig[activity.type];
                        const Icon = config.icon;

                        return (
                            <div key={activity.id} className="flex gap-4">
                                {/* Timeline line */}
                                <div className="flex flex-col items-center">
                                    <div className={`p-2 rounded-full ${config.bgColor}`}>
                                        <Icon className={`h-4 w-4 ${config.color}`} />
                                    </div>
                                    {index < activities.length - 1 && (
                                        <div className="w-px h-full bg-border mt-2" />
                                    )}
                                </div>

                                {/* Content */}
                                <div className="flex-1 pb-4">
                                    <p className="text-sm">
                                        <span className="text-muted-foreground">{config.label}</span>{' '}
                                        <span className="font-medium">{activity.issueTitle}</span>
                                    </p>
                                    <div className="flex items-center gap-2 mt-1">
                                        <Badge variant="outline" className="text-xs">
                                            {activity.repoName}
                                        </Badge>
                                        <span className="text-xs text-muted-foreground">
                                            {formatRelativeTime(activity.timestamp)}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </CardContent>
        </Card>
    );
}
