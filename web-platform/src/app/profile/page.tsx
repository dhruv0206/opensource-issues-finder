import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { ComingSoon } from '@/components/shared/ComingSoon';

export default function ProfilePage() {
    return (
        <DashboardLayout>
            <ComingSoon
                title="Profile & Portfolio"
                description="We're building a verifiable developer portfolio system where your contributions act as your resume. Check back soon!"
            />
        </DashboardLayout>
    );
}
