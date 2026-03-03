"use client";

import { useState } from 'react';

export default function ConnectShopify() {
  const [shopDomain, setShopDomain] = useState('');

  const handleConnect = () => {
    if (!shopDomain) return;
    window.location.href = `/api/auth/shopify?shop=${shopDomain}`;
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100">
      <h1 className="text-2xl font-bold mb-4">Connect Your Shopify Store</h1>
      <input
        type="text"
        placeholder="Enter your shop domain (e.g., mystore.myshopify.com)"
        value={shopDomain}
        onChange={(e) => setShopDomain(e.target.value)}
        className="border border-gray-300 rounded px-4 py-2 mb-4 w-80"
      />
      <button
        onClick={handleConnect}
        className="bg-blue-500 text-white px-6 py-2 rounded hover:bg-blue-600"
      >
        Connect Shopify
      </button>
    </div>
  );
}