import { DashboardLayout } from '@/components/DashboardLayout';
import { ComingSoon } from '@/components/ComingSoon';

export default function SettingsPage() {
    return (
        <DashboardLayout>
            <ComingSoon
                title="Settings"
                description="User preferences, notification settings, and account management features are currently under development."
            />
        </DashboardLayout>
    );
}
