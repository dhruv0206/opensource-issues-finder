'use client';

import Link from 'next/link';
import { Github } from 'lucide-react';
import { ThemeToggle } from '@/components/layout/ThemeToggle';

interface ProfileLayoutProps {
    children: React.ReactNode;
}

export function ProfileLayout({ children }: ProfileLayoutProps) {
    return (
        <div className="min-h-screen bg-background">
            {/* Minimal Header */}
            <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-sm border-b border-border">
                <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
                    <Link href="/" className="flex items-center gap-2 font-bold text-lg">
                        <Github className="h-6 w-6" />
                        <span>DevProof</span>
                    </Link>
                    <div className="flex items-center gap-3">
                        <Link
                            href="/"
                            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                        >
                            Find Issues
                        </Link>
                        <ThemeToggle />
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="max-w-4xl mx-auto px-4 py-8">
                {children}
            </main>

            {/* Minimal Footer */}
            <footer className="border-t border-border py-6 mt-12">
                <div className="max-w-4xl mx-auto px-4 text-center text-sm text-muted-foreground">
                    <p>
                        Powered by{' '}
                        <Link href="/" className="font-medium hover:text-foreground">
                            DevProof
                        </Link>
                        {' '}— Verify your open source contributions
                    </p>
                </div>
            </footer>
        </div>
    );
}
