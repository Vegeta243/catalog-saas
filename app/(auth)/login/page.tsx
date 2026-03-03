"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import Link from 'next/link';

export default function LoginPage() {
  console.log('Supabase URL:', process.env.NEXT_PUBLIC_SUPABASE_URL);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);

    try {
      const supabase = createClient();
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });

      console.log('Login response:', { data, error }); // Log the full response object

      if (error) {
        console.log('Login error:', JSON.stringify(error)); // Log the exact error
        setError(error.message);
      } else {
        router.push('/dashboard');
      }
    } catch (err) {
      setError('An unexpected error occurred.');
      console.error('Unexpected login error:', err);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-100">
      <div className="w-full max-w-md p-10 bg-white shadow-2xl rounded-lg">
        <h1 className="text-4xl font-extrabold mb-8 text-center text-gray-900">Se connecter</h1>
        {error && <p className="text-red-500 mb-4 text-center">{error}</p>}
        <form onSubmit={handleLogin}>
          <div className="mb-6">
            <label htmlFor="email" className="block text-lg font-medium text-gray-700">Email</label>
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
            <label htmlFor="password" className="block text-lg font-medium text-gray-700">Mot de passe</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-2 block w-full p-3 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 text-gray-900 placeholder-gray-900"
              required
            />
          </div>
          <button type="submit" className="w-full bg-blue-700 text-white py-3 px-4 rounded-lg hover:bg-blue-800 text-lg font-semibold">Se connecter</button>
        </form>
        <p className="mt-6 text-center text-sm text-gray-600">
          Pas encore de compte ? <Link href="/signup" className="text-blue-700 hover:underline">S'inscrire</Link>
        </p>
      </div>
    </div>
  );
}