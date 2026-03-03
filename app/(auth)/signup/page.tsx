"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import Link from 'next/link';

export default function SignupPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const handleSignup = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.target as HTMLFormElement;
    const password = form.password.value;
    const confirmPassword = form.confirmPassword.value;

    if (password !== confirmPassword) {
      setError('Les mots de passe ne correspondent pas.');
      return;
    }

    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signUp({ email, password });

      if (error) {
        setError(error.message);
      } else {
        router.push('/dashboard');
      }
    } catch (error: any) {
      setError(error.message);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-100">
      <div className="w-full max-w-md p-10 bg-white shadow-2xl rounded-lg">
        <h1 className="text-4xl font-extrabold mb-8 text-center text-black">Créer un compte</h1>
        {error && <p className="text-red-500 mb-4 text-center">{error}</p>}
        <form onSubmit={handleSignup}>
          <div className="mb-6">
            <label htmlFor="email" className="block text-lg font-medium text-black">Adresse e-mail</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-2 block w-full p-3 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 text-black placeholder-black"
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
          <div className="mb-6">
            <label htmlFor="confirm-password" className="block text-lg font-medium text-black">Confirmer le mot de passe</label>
            <input
              id="confirm-password"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="mt-2 block w-full p-3 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 text-black placeholder-black"
              required
            />
          </div>
          <button type="submit" className="w-full bg-blue-700 text-white py-3 px-4 rounded-lg hover:bg-blue-800 text-lg font-semibold">S'inscrire</button>
        </form>
        <p className="mt-6 text-center text-sm text-black">
          Vous avez déjà un compte ? <Link href="/login" className="text-blue-500 hover:underline">Connectez-vous</Link>
        </p>
      </div>
    </div>
  );
}