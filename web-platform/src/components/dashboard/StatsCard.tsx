'use client';

import { Card, CardContent } from '@/components/ui/card';
import { LucideIcon } from 'lucide-react';

interface StatsCardProps {
    title: string;
    value: number | string;
    icon: LucideIcon;
    description?: string;
    trend?: {
        value: number;
        label: string;
        positive?: boolean;
    };
}

export function StatsCard({ title, value, icon: Icon, description, trend }: StatsCardProps) {
    return (
        <Card className="relative overflow-hidden">
            <CardContent className="p-6">
                <div className="flex items-center justify-between">
                    <div>
                        <p className="text-sm font-medium text-muted-foreground">{title}</p>
                        <p className="text-3xl font-bold mt-1">{value}</p>
                        {description && (
                            <p className="text-xs text-muted-foreground mt-1">{description}</p>
                        )}
                        {trend && (
                            <p className={`text-xs mt-2 ${trend.positive ? 'text-green-500' : 'text-muted-foreground'}`}>
                                {trend.positive ? '↑' : ''} {trend.value} {trend.label}
                            </p>
                        )}
                    </div>
                    <div className="p-3 rounded-full bg-primary/10">
                        <Icon className="h-6 w-6 text-primary" />
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
