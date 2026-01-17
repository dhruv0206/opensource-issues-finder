'use client';

import { Sparkles } from 'lucide-react';

export function BetaBanner() {
    return (
        <div className="bg-primary/10 border-b border-primary/20 px-8 py-3">
            <div className="max-w-4xl mx-auto flex items-center justify-center gap-3 text-sm">
                <Sparkles className="h-4 w-4 text-primary animate-pulse" />
                <p>
                    <span className="font-semibold text-primary">Search is Live! 🚀</span>
                    <span className="mx-2 text-muted-foreground">|</span>
                    <span className="text-muted-foreground">
                        <span className="text-foreground font-medium">Showcase your actual work</span> and make your <span className="text-foreground font-medium">Work Portfolio</span>.
                        Verified Profiles coming soon!
                    </span>
                </p>
            </div>
        </div>
    );
}
