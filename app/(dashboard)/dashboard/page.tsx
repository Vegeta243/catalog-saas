import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server';

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();
  const userEmail = session?.user?.email || 'Utilisateur';

  return (
    <div className="p-8 bg-gray-100 min-h-screen">
      <div className="bg-white shadow-2xl rounded-lg p-6 mb-8">
        <h1 className="text-4xl font-extrabold text-gray-900 mb-4">Tableau de bord</h1>
        <p className="text-lg text-gray-700">Gérez votre catalogue Shopify</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white shadow-lg rounded-lg p-6">
          <h2 className="text-2xl font-bold text-gray-900">Produits</h2>
          <p className="text-gray-600">Statistiques à venir</p>
        </div>
        <div className="bg-white shadow-lg rounded-lg p-6">
          <h2 className="text-2xl font-bold text-gray-900">Boutiques connectées</h2>
          <p className="text-gray-600">Statistiques à venir</p>
        </div>
        <div className="bg-white shadow-lg rounded-lg p-6">
          <h2 className="text-2xl font-bold text-gray-900">Tâches en cours</h2>
          <p className="text-gray-600">Statistiques à venir</p>
        </div>
      </div>
    </div>
  );
}