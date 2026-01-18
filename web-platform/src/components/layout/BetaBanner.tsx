'use client';

import { Sparkles, AlertTriangle } from 'lucide-react';

export function BetaBanner() {
    return (
        <div className="bg-primary/10 border-b border-primary/20 px-8 py-3">
            <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-center justify-center gap-2 text-sm">
                {/* Maintenance Notice */}
                <div className="flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-yellow-500" />
                    <span className="text-yellow-600 dark:text-yellow-400">
                        Issue fetching paused for maintenance (1 week).
                    </span>
                </div>

                <span className="hidden sm:inline text-muted-foreground">|</span>

                {/* Original Projects Coming Soon */}
                <div className="flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-primary animate-pulse" />
                    <span className="text-muted-foreground">
                        <span className="text-foreground font-medium">Verified Profiles Live!</span>
                        <span className="text-primary font-medium"> Projects coming soon!</span>
                    </span>
                </div>
            </div>
        </div>
    );
}
