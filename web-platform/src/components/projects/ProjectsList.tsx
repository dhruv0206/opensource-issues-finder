"use client"

import { useEffect, useState } from 'react';
import { VerifiedProjectCard } from '@/components/profile/VerifiedProjectCard';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function ProjectsList({ userId, currentUser }: { userId: string, currentUser?: string }) {
    const [projects, setProjects] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        async function fetchProjects() {
            try {
                const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
                // Reuse the public profile endpoint logic for now, but filtered for current user
                // Or better, create a specific 'my-projects' endpoint. 
                // For V1 speed, we can fetch the user's public profile data using their ID/Username if we had it.
                // But we only have userId here.
                // Let's rely on the profile endpoint which needs username.
                // Actually, let's just fetch from the DB directly via a new endpoint or reusing existing logic.
                // Wait, creating a new endpoint is safer.
                // Let's assume we create GET /api/users/me/projects

                const response = await fetch(`${API_URL}/api/users/me/projects`, {
                    credentials: 'include',
                    headers: {
                        'X-User-Id': userId,
                    },
                });

                if (!response.ok) throw new Error("Failed to fetch projects");

                const data = await response.json();
                setProjects(data.projects);
            } catch (err) {
                console.error(err);
                setError("Failed to load projects");
            } finally {
                setLoading(false);
            }
        }
        fetchProjects();
    }, [userId]);

    if (loading) return <Skeleton className="h-48 w-full" />;

    if (error) {
        return (
            <Card>
                <CardContent className="p-6 text-center text-red-500">
                    <AlertCircle className="w-8 h-8 mx-auto mb-2" />
                    {error}
                </CardContent>
            </Card>
        );
    }

    if (projects.length === 0) {
        return (
            <Card className="border-dashed">
                <CardContent className="p-12 text-center text-muted-foreground">
                    <p>No verified projects yet. Import one to start!</p>
                </CardContent>
            </Card>
        );
    }

    return (
        <div className="space-y-4">
            {projects.map((p, i) => (
                <VerifiedProjectCard key={i} project={p} currentUser={currentUser} />
            ))}
        </div>
    );
}
