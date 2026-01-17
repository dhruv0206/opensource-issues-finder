import { auth } from '@/lib/auth';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { OpenSourceFinder } from '@/components/OpenSourceFinder';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Footer } from '@/components/Footer';

export default async function Home() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  // Redirect to dashboard if user has a session? No, user wants same layout. 
  // User said: "after login the dashboard which shows I want to show even without login but if not logged in in that dashboard UI github search tab should be selected"
  // This implies if LOGGED IN, maybe show Dashboard tab? Or stick to Finder on root?
  // Let's stick to Finder on root for consistency, and user can switch to Dashboard.

  // Wait, "if not logged in... github search tab should be selected".
  // This implies if LOGGED IN, maybe "Dashboard" tab (Tracked Issues) is selected?
  // The current code redirected logged-in users to /dashboard. 
  // Let's keep the redirect if we want the default logged-in view to be Tracked Issues.
  // BUT user said "I don't just want to mention it as open source search but like a platform".
  // Let's keep the redirect logic for now: Logged In -> Dashboard (Tracked Issues). Guest -> Home (Search/Finder).
  // But make Home use DashboardLayout.

  if (session?.user) {
    redirect('/dashboard');
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
        <Footer />
      </main>
    </DashboardLayout>
  );
}
