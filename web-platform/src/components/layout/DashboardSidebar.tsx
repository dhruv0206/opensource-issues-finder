'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import {
    LayoutDashboard,
    Search,
    UserCircle,
    Settings,
    LogOut,
    Github,
    ClipboardList
} from 'lucide-react';
const menuItems = [
    {
        name: 'Dashboard',
        icon: LayoutDashboard,
        href: '/dashboard',
    },
    {
        name: 'My Issues',
        icon: ClipboardList,
        href: '/issues',
    },
    {
        name: 'Open Source Finder',
        icon: Search,
        href: '/finder',
    },
    {
        name: 'Profile',
        icon: UserCircle,
        href: '/profile',
    },
    {
        name: 'Settings',
        icon: Settings,
        href: '/settings',
    },
];

import { useSession, signIn, signOut } from '@/lib/auth-client';
import { LogIn } from 'lucide-react';

export function DashboardSidebar() {
    const pathname = usePathname();
    const router = useRouter();
    const { data: session } = useSession();

    const handleSignOut = async () => {
        await signOut();
        router.push('/');
    };

    const handleSignIn = () => {
        signIn.social({ provider: 'github' });
    };

    return (
        <div className="h-screen w-64 border-r border-border bg-card flex flex-col fixed left-0 top-0">
            <div className="p-6 border-b border-border">
                <Link href="/" className="flex items-center gap-2 font-bold text-lg">
                    <Github className="h-6 w-6" />
                    <span>ContribFinder</span>
                </Link>
            </div>

            <nav className="flex-1 p-4 space-y-2">
                {menuItems.map((item) => {
                    const Icon = item.icon;
                    // Highlight 'Open Source Finder' if on root path or /finder
                    const isActive = pathname === item.href || (item.href === '/finder' && pathname === '/');

                    return (
                        <Link key={item.href} href={item.href}>
                            <Button
                                variant={isActive ? "secondary" : "ghost"}
                                className={`w-full justify-start gap-3 ${isActive ? 'bg-secondary' : ''}`}
                            >
                                <Icon className="h-5 w-5" />
                                {item.name}
                            </Button>
                        </Link>
                    );
                })}
            </nav>

            <div className="p-4 border-t border-border">
                {session ? (
                    <Button
                        variant="ghost"
                        className="w-full justify-start gap-3 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                        onClick={handleSignOut}
                    >
                        <LogOut className="h-5 w-5" />
                        Sign Out
                    </Button>
                ) : (
                    <Button
                        variant="ghost"
                        className="w-full justify-start gap-3 text-primary hover:text-primary hover:bg-primary/10"
                        onClick={handleSignIn}
                    >
                        <LogIn className="h-5 w-5" />
                        Sign In
                    </Button>
                )}
            </div>
        </div>
    );
}
