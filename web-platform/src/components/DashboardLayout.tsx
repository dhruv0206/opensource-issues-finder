'use client';

import { DashboardSidebar } from '@/components/DashboardSidebar';
import { ThemeToggle } from '@/components/ThemeToggle';
import { BetaBanner } from '@/components/BetaBanner';

export function DashboardLayout({ children }: { children: React.ReactNode }) {
    return (
        <div className="min-h-screen bg-background">
            <DashboardSidebar />

            {/* Main Content Area */}
            <div className="pl-64">
                {/* Top Bar / Header for Dashboard */}
                <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-sm border-b border-border px-8 py-4 flex items-center justify-end">
                    <ThemeToggle />
                </header>

                <BetaBanner />

                {children}
            </div>
        </div>
    );
}
