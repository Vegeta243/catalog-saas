"use client";

import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const supabase = createClient();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  return (
    <div className="flex min-h-screen">
      <aside className="w-64 bg-[#1a1a2e] text-white p-6">
        <div className="mb-8">
          <h1 className="text-2xl font-extrabold">Catalog SaaS</h1>
        </div>
        <nav>
          <ul>
            <li className="mb-4">
              <a href="/dashboard" className="flex items-center py-2 px-4 rounded hover:bg-white hover:text-[#1a1a2e]">
                Dashboard
              </a>
            </li>
            <li className="mb-4">
              <a href="/catalogue" className="flex items-center py-2 px-4 rounded hover:bg-white hover:text-[#1a1a2e]">
                Catalogue
              </a>
            </li>
            <li>
              <button
                onClick={handleLogout}
                className="w-full text-left flex items-center py-2 px-4 rounded hover:bg-white hover:text-[#1a1a2e]"
              >
                Se déconnecter
              </button>
            </li>
          </ul>
        </nav>
      </aside>
      <main className="flex-1 p-8 bg-gray-100">
        {children}
      </main>
    </div>
  );
}