'use client';

import { Construction } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

interface ComingSoonProps {
    title: string;
    description: string;
}

export function ComingSoon({ title, description }: ComingSoonProps) {
    return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
            <div className="bg-primary/10 p-4 rounded-full mb-6">
                <Construction className="w-12 h-12 text-primary" />
            </div>
            <h1 className="text-3xl font-bold mb-3">{title}</h1>
            <p className="text-muted-foreground max-w-md mb-8">
                {description}
            </p>
            <div className="flex gap-4">
                <Link href="/">
                    <Button variant="default">
                        Find Opportunities
                    </Button>
                </Link>
            </div>
        </div>
    );
}
