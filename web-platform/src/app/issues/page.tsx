import { auth } from '@/lib/auth';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { TrackedIssuesDashboard } from '@/components/TrackedIssuesDashboard';
import { DashboardLayout } from '@/components/DashboardLayout';

export default async function MyIssuesPage() {
    const session = await auth.api.getSession({
        headers: await headers(),
    });

    if (!session?.user) {
        redirect('/');
    }

    return (
        <DashboardLayout>
            <main className="container mx-auto px-8 py-8">
                <div className="mb-8">
                    <h1 className="text-3xl font-bold mb-2">My Issues</h1>
                    <p className="text-muted-foreground">
                        Track issues you&apos;re working on and submit your PRs for verification.
                    </p>
                </div>

                <TrackedIssuesDashboard userId={session.user.id} />
            </main>
        </DashboardLayout>
    );
}
