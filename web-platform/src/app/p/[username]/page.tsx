import { Metadata } from 'next';
import { ProfileLayout } from '@/components/profile/ProfileLayout';
import { ProfileContent } from '@/components/profile/ProfileContent';

interface PageProps {
    params: Promise<{ username: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
    const { username } = await params;

    return {
        title: `${username} | DevProof`,
        description: `View ${username}'s verified open source contributions on DevProof.`,
        openGraph: {
            title: `${username}'s Developer Portfolio`,
            description: `Check out ${username}'s verified open source contributions.`,
            type: 'profile',
        },
    };
}

export default async function PublicProfilePage({ params }: PageProps) {
    const { username } = await params;

    return (
        <ProfileLayout>
            <ProfileContent username={username} />
        </ProfileLayout>
    );
}
