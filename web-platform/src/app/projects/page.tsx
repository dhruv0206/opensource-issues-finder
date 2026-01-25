import { auth } from '@/lib/auth';
import { headers } from 'next/headers';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { AddProjectModal } from '@/components/projects/AddProjectModal';
import { ProjectsList } from '@/components/projects/ProjectsList';
import { AuthRequiredModal } from '@/components/shared/AuthRequiredModal';

export default async function ProjectsPage() {
    const session = await auth.api.getSession({
        headers: await headers(),
    });

    if (!session?.user) {
        return (
            <DashboardLayout>
                <AuthRequiredModal
                    message="Track and verify your projects to build your portfolio."
                    title="Sign in to manage projects"
                />
            </DashboardLayout>
        );
    }

    return (
        <DashboardLayout>
            <main className="w-full px-8 py-8">
                <div className="flex justify-between items-center mb-10">
                    <div>
                        <h1 className="text-4xl font-bold mb-3">My Projects</h1>
                        <p className="text-muted-foreground text-lg">
                            Manage your verified open source projects.
                        </p>
                    </div>
                    <AddProjectModal userId={session.user.id} defaultGithubUsername={session.user.name} />
                </div>

                <ProjectsList userId={session.user.id} currentUser={session.user.name} />
            </main>
        </DashboardLayout>
    );
}
