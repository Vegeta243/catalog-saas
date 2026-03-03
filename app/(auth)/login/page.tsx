"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);

    const supabase = createClient();

    console.log('Attempting login with email:', email);

    const { data, error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      console.error('Login error:', error);
      setError(error.message);
    } else {
      console.log('Login successful, user data:', data);
      console.log('Redirecting to /dashboard');
      router.push('/dashboard');
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-100">
      <div className="w-full max-w-md p-10 bg-white shadow-2xl rounded-lg">
        <h1 className="text-4xl font-extrabold mb-8 text-center text-black">Connexion</h1>
        {error && <p className="text-red-500 mb-4 text-center">{error}</p>}
        <form onSubmit={handleLogin}>
          <div className="mb-6">
            <label htmlFor="email" className="block text-lg font-medium text-black">Adresse e-mail</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-2 block w-full p-3 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
              required
            />
          </div>
          <div className="mb-6">
            <label htmlFor="password" className="block text-lg font-medium text-black">Mot de passe</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-2 block w-full p-3 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 text-black placeholder-black"
              required
            />
          </div>
          <button type="submit" className="w-full bg-blue-700 text-white py-3 px-4 rounded-lg hover:bg-blue-800 text-lg font-semibold">Connexion</button>
        </form>
      </div>
    </div>
  );
}