"use client";

import { useState, useEffect } from "react";

interface Product {
  id: string;
  title: string;
  price: number;
  status: string;
  images: { src: string }[];
}

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedProducts, setSelectedProducts] = useState<string[]>([]);
  const [newPrice, setNewPrice] = useState<string>("");
  const [bulkError, setBulkError] = useState<string | null>(null);
  const [bulkSuccess, setBulkSuccess] = useState<string | null>(null);

  const fetchProducts = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/shopify/products");
      if (!response.ok) {
        throw new Error("Erreur lors de la récupération des produits.");
      }
      const data = await response.json();
      setProducts(data.products || []);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const toggleSelectProduct = (productId: string) => {
    setSelectedProducts((prev) =>
      prev.includes(productId)
        ? prev.filter((id) => id !== productId)
        : [...prev, productId]
    );
  };

  const selectAllProducts = () => {
    setSelectedProducts(products.map((product) => product.id));
  };

  const deselectAllProducts = () => {
    setSelectedProducts([]);
  };

  const applyNewPrice = async () => {
    setBulkError(null);
    setBulkSuccess(null);
    try {
      const response = await fetch("/api/shopify/bulk-update", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productIds: selectedProducts,
          newPrice,
        }),
      });
      if (!response.ok) {
        throw new Error("Erreur lors de la mise à jour des prix.");
      }
      setBulkSuccess("Prix mis à jour avec succès.");
      fetchProducts();
    } catch (err) {
      setBulkError((err as Error).message);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  return (
    <div className="p-8 bg-gray-100 min-h-screen">
      <div className="bg-white shadow-2xl rounded-lg p-6 mb-8">
        <h1 className="text-4xl font-extrabold text-black mb-4">Produits</h1>
        <button
          onClick={fetchProducts}
          className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
        >
          Rafraîchir
        </button>
      </div>

      {loading && <p className="text-lg text-black">Chargement...</p>}
      {error && <p className="text-lg text-red-500">{error}</p>}

      <div className="mt-8">
        <input
          type="text"
          placeholder="Rechercher des produits"
          className="border border-gray-300 rounded px-4 py-2 w-full text-black placeholder-black"
        />
        <button className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 mt-4">
          Filtrer
        </button>
      </div>

      <table className="w-full text-sm text-left text-black mt-6">
        <thead className="text-xs text-black uppercase bg-gray-50">
          <tr>
            <th scope="col" className="px-4 py-2">Image</th>
            <th scope="col" className="px-4 py-2">Titre</th>
            <th scope="col" className="px-4 py-2">Prix</th>
            <th scope="col" className="px-4 py-2">Statut</th>
            <th scope="col" className="px-4 py-2">Actions</th>
          </tr>
        </thead>
        <tbody>
          {products.map((product) => (
            <tr key={product.id} className="bg-white border-b">
              <td className="px-4 py-2">
                <img
                  src={product.images[0]?.src || "/placeholder.png"}
                  alt={product.title}
                  className="w-12 h-12 object-cover"
                />
              </td>
              <td className="px-4 py-2 text-black">{product.title}</td>
              <td className="px-4 py-2 text-black">{product.price} €</td>
              <td className="px-4 py-2 text-black">{product.status}</td>
              <td className="px-4 py-2">
                <button className="text-blue-500 hover:underline">Modifier</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {selectedProducts.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 bg-white shadow-lg p-4 border-t border-gray-200 flex items-center justify-between">
          <input
            type="text"
            value={newPrice}
            onChange={(e) => setNewPrice(e.target.value)}
            placeholder="Nouveau prix"
            className="border border-gray-300 rounded px-4 py-2 mr-4"
          />
          <button
            onClick={applyNewPrice}
            className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600"
          >
            Appliquer le prix
          </button>
        </div>
      )}

      {bulkError && <p className="text-lg text-red-500 mt-4">{bulkError}</p>}
      {bulkSuccess && <p className="text-lg text-green-500 mt-4">{bulkSuccess}</p>}
    </div>
  );
}