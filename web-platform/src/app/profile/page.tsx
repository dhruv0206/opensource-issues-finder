import { DashboardLayout } from '@/components/DashboardLayout';
import { ComingSoon } from '@/components/ComingSoon';

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
