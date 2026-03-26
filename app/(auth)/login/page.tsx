"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Mail, Lock, ArrowRight, Eye, EyeOff, Apple } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;
      router.push("/dashboard");
    } catch (err: any) {
      setError(err.message || "Une erreur est survenue");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    try {
      const supabase = createClient();
      await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      });
    } catch (err: any) {
      setError(err.message || "Une erreur est survenue");
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px',
      background: 'linear-gradient(180deg, var(--surface-secondary) 0%, var(--surface-primary) 100%)',
    }}>
      <div style={{
        width: '100%',
        maxWidth: '440px',
        background: 'var(--surface-primary)',
        borderRadius: '28px',
        padding: '48px',
        boxShadow: 'var(--shadow-xl)',
        border: '1px solid var(--apple-gray-200)',
      }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: '40px' }}>
          <h1 style={{
            fontSize: '32px',
            fontWeight: '700',
            background: 'linear-gradient(135deg, var(--apple-blue) 0%, var(--apple-blue-light) 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
            marginBottom: '12px',
          }}>
            EcomPilot
          </h1>
          <p style={{ fontSize: '17px', color: 'var(--text-secondary)', margin: 0 }}>
            Connectez-vous à votre espace
          </p>
        </div>

        {/* Error Message */}
        {error && (
          <div style={{
            padding: '14px 16px',
            background: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            borderRadius: '12px',
            marginBottom: '24px',
            color: '#ef4444',
            fontSize: '14px',
          }}>
            {error}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleLogin}>
          {/* Email */}
          <div style={{ marginBottom: '20px' }}>
            <label style={{
              display: 'block',
              fontSize: '14px',
              fontWeight: '600',
              color: 'var(--text-primary)',
              marginBottom: '8px',
            }}>
              Email
            </label>
            <div style={{
              position: 'relative',
            }}>
              <Mail className="w-5 h-5" style={{
                position: 'absolute',
                left: '16px',
                top: '50%',
                transform: 'translateY(-50%)',
                color: 'var(--text-tertiary)',
              }} />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="vous@exemple.com"
                required
                style={{
                  width: '100%',
                  padding: '14px 16px 14px 48px',
                  background: 'var(--surface-primary)',
                  border: '1px solid var(--apple-gray-200)',
                  borderRadius: '14px',
                  fontSize: '16px',
                  color: 'var(--text-primary)',
                  outline: 'none',
                  transition: 'all 0.2s ease',
                  boxSizing: 'border-box',
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = 'var(--apple-blue)';
                  e.target.style.boxShadow = '0 0 0 3px rgba(59, 130, 246, 0.1)';
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = 'var(--apple-gray-200)';
                  e.target.style.boxShadow = 'none';
                }}
              />
            </div>
          </div>

          {/* Password */}
          <div style={{ marginBottom: '24px' }}>
            <label style={{
              display: 'block',
              fontSize: '14px',
              fontWeight: '600',
              color: 'var(--text-primary)',
              marginBottom: '8px',
            }}>
              Mot de passe
            </label>
            <div style={{
              position: 'relative',
            }}>
              <Lock className="w-5 h-5" style={{
                position: 'absolute',
                left: '16px',
                top: '50%',
                transform: 'translateY(-50%)',
                color: 'var(--text-tertiary)',
              }} />
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                style={{
                  width: '100%',
                  padding: '14px 16px 14px 48px',
                  background: 'var(--surface-primary)',
                  border: '1px solid var(--apple-gray-200)',
                  borderRadius: '14px',
                  fontSize: '16px',
                  color: 'var(--text-primary)',
                  outline: 'none',
                  transition: 'all 0.2s ease',
                  boxSizing: 'border-box',
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = 'var(--apple-blue)';
                  e.target.style.boxShadow = '0 0 0 3px rgba(59, 130, 246, 0.1)';
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = 'var(--apple-gray-200)';
                  e.target.style.boxShadow = 'none';
                }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: 'absolute',
                  right: '16px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  color: 'var(--text-tertiary)',
                  padding: '4px',
                }}
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>

          {/* Forgot Password */}
          <div style={{ textAlign: 'right', marginBottom: '24px' }}>
            <Link
              href="/forgot-password"
              style={{
                fontSize: '14px',
                color: 'var(--apple-blue)',
                textDecoration: 'none',
                fontWeight: '500',
              }}
            >
              Mot de passe oublié ?
            </Link>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
              padding: '16px',
              background: loading ? 'var(--apple-gray-300)' : 'var(--apple-blue)',
              color: 'white',
              border: 'none',
              borderRadius: '14px',
              fontSize: '16px',
              fontWeight: '600',
              cursor: loading ? 'not-allowed' : 'pointer',
              transition: 'all 0.2s ease',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
            }}
            onMouseEnter={(e) => {
              if (!loading) {
                e.currentTarget.style.background = 'var(--apple-blue-hover)';
                e.currentTarget.style.transform = 'scale(1.02)';
              }
            }}
            onMouseLeave={(e) => {
              if (!loading) {
                e.currentTarget.style.background = 'var(--apple-blue)';
                e.currentTarget.style.transform = 'scale(1)';
              }
            }}
          >
            {loading ? 'Connexion...' : (
              <>
                Se connecter
                <ArrowRight className="w-5 h-5" />
              </>
            )}
          </button>
        </form>

        {/* Divider */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '16px',
          margin: '32px 0',
        }}>
          <div style={{ flex: 1, height: '1px', background: 'var(--apple-gray-200)' }} />
          <span style={{ fontSize: '13px', color: 'var(--text-tertiary)', fontWeight: '500' }}>ou</span>
          <div style={{ flex: 1, height: '1px', background: 'var(--apple-gray-200)' }} />
        </div>

        {/* Google Login */}
        <button
          onClick={handleGoogleLogin}
          style={{
            width: '100%',
            padding: '16px',
            background: 'var(--surface-primary)',
            color: 'var(--text-primary)',
            border: '1px solid var(--apple-gray-200)',
            borderRadius: '14px',
            fontSize: '16px',
            fontWeight: '600',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '12px',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'var(--apple-gray-50)';
            e.currentTarget.style.borderColor = 'var(--apple-gray-300)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'var(--surface-primary)';
            e.currentTarget.style.borderColor = 'var(--apple-gray-200)';
          }}
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
          Continuer avec Google
        </button>

        {/* Sign Up Link */}
        <p style={{
          textAlign: 'center',
          fontSize: '14px',
          color: 'var(--text-secondary)',
          marginTop: '32px',
          margin: 0,
        }}>
          Pas encore de compte ?{" "}
          <Link
            href="/signup"
            style={{
              color: 'var(--apple-blue)',
              fontWeight: '600',
              textDecoration: 'none',
            }}
          >
            S'inscrire gratuitement
          </Link>
        </p>
      </div>
    </div>
  );
}
