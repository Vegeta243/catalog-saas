import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server';

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();
  const userEmail = session?.user?.email || 'Utilisateur';

  // Fetch products from the API route
  const productsResponse = await fetch(`${process.env.NEXT_PUBLIC_SITE_URL}/api/shopify/products`);
  const productsData = await productsResponse.json();
  const products = productsData.products || [];

  return (
    <div className="p-8 bg-gray-100 min-h-screen">
      <div className="bg-white shadow-2xl rounded-lg p-6 mb-8">
        <h1 className="text-4xl font-extrabold text-gray-900 mb-4">Tableau de bord</h1>
        <p className="text-lg text-gray-700">Gérez votre catalogue Shopify</p>
      </div>
      <div className="bg-white shadow-lg rounded-lg p-6 mb-8">
        <h2 className="text-2xl font-bold text-gray-900">Mes Produits ({products.length})</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 mt-4">
          {products.map((product: any) => (
            <div key={product.id} className="bg-white shadow-md rounded-lg p-4 border border-gray-200">
              <h3 className="text-lg font-bold text-gray-900 mb-2">{product.title}</h3>
              <span className="inline-block bg-green-100 text-green-800 text-sm font-medium px-2 py-1 rounded">
                {product.variants?.[0]?.price || 'N/A'} €
              </span>
            </div>
          ))}
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
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