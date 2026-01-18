'use client';

import { Sparkles } from 'lucide-react';

export function BetaBanner() {
    return (
        <div className="bg-primary/10 border-b border-primary/20 px-8 py-3">
            <div className="max-w-4xl mx-auto flex items-center justify-center gap-3 text-sm">
                <Sparkles className="h-4 w-4 text-primary animate-pulse" />
                <p>
                    <span className="font-semibold text-primary">Verified Profiles Live! ✅</span>
                    <span className="mx-2 text-muted-foreground">|</span>
                    <span className="text-muted-foreground">
                        Build your <span className="text-foreground font-medium">Developer Portfolio</span> with verified contributions.
                        <span className="text-primary font-medium"> Projects coming soon!</span>
                    </span>
                </p>
            </div>
        </div>
    );
}
