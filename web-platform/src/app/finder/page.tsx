import { auth } from '@/lib/auth';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { OpenSourceFinder } from '@/components/OpenSourceFinder';
import { DashboardLayout } from '@/components/DashboardLayout';

export default async function FinderPage() {
    const session = await auth.api.getSession({
        headers: await headers(),
    });

    if (!session?.user) {
        redirect('/');
    }

    return (
        <DashboardLayout>
            <main className="container mx-auto px-4 py-8">
                <div className="mb-6 text-center">
                    <h1 className="text-3xl font-bold mb-2">Open Source Finder</h1>
                    <p className="text-muted-foreground">
                        Search for new contribution opportunities.
                    </p>
                </div>
                <OpenSourceFinder />
            </main>
        </DashboardLayout>
    );
}
