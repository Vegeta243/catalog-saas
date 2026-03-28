'use client';

import { useState, useEffect } from 'react';
import { Send, Mail, Clock, CheckCircle } from 'lucide-react';

const SUBJECTS = [
  'Problème technique',
  'Facturation / Abonnement',
  'Connexion Shopify',
  'Suggestion de fonctionnalité',
  'Question légale / RGPD',
  'Autre',
];

export default function ContactPage() {
  const [form, setForm] = useState({ name: '', email: '', subject: '', message: '' });
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => { document.title = 'Nous contacter | EcomPilot'; }, []);

  async function handleSend() {
    if (!form.name.trim() || !form.email.trim() || !form.subject.trim() || !form.message.trim()) {
      setError('Veuillez remplir tous les champs obligatoires');
      return;
    }
    setSending(true);
    setError('');
    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erreur envoi');
      setSent(true);
      setForm({ name: '', email: '', subject: '', message: '' });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : '';
      setError(msg || "Erreur lors de l'envoi. Contactez-nous directement à support@ecompilotelite.com");
    }
    setSending(false);
  }

  if (sent) {
    return (
      <div className="max-w-xl mx-auto py-12 px-4 text-center">
        <CheckCircle className="w-14 h-14 mx-auto mb-4" style={{ color: '#10b981' }} />
        <h2 className="text-xl font-bold mb-2" style={{ color: 'var(--text-primary)' }}>
          Message envoyé !
        </h2>
        <p className="text-sm mb-6" style={{ color: 'var(--text-secondary)' }}>
          Nous répondons sous 24h en semaine. Vous recevrez une réponse à votre adresse email.
        </p>
        <button
          onClick={() => setSent(false)}
          className="px-5 py-2.5 rounded-xl text-sm font-medium"
          style={{ background: 'var(--apple-blue)', color: '#fff', border: 'none', cursor: 'pointer' }}
        >
          Envoyer un autre message
        </button>
      </div>
    );
  }

  const inp: React.CSSProperties = {
    width: '100%',
    background: 'var(--surface-primary)',
    border: '1px solid var(--apple-gray-200)',
    borderRadius: '10px',
    color: 'var(--text-primary)',
    fontSize: '14px',
    padding: '10px 14px',
    boxSizing: 'border-box',
    outline: 'none',
    fontFamily: 'inherit',
  };

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-0 py-2">
      <div className="mb-6">
        <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
          Nous contacter
        </h1>
        <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
          Notre équipe répond sous 24h en semaine
        </p>
      </div>

      {/* Contact info cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
        {[
          { label: 'Support', value: 'support@ecompilotelite.com', href: 'mailto:support@ecompilotelite.com', icon: Mail },
          { label: 'Commercial', value: 'contact@ecompilotelite.com', href: 'mailto:contact@ecompilotelite.com', icon: Mail },
          { label: 'Délai de réponse', value: '< 24h en semaine', href: null, icon: Clock },
        ].map((item) => {
          const Icon = item.icon;
          return (
            <div key={item.label} className="rounded-xl border p-3"
              style={{ background: 'var(--surface-primary)', borderColor: 'var(--apple-gray-200)' }}>
              <div className="flex items-center gap-2 mb-1">
                <Icon className="w-3.5 h-3.5" style={{ color: 'var(--text-secondary)' }} />
                <span className="text-xs font-medium uppercase" style={{ color: 'var(--text-tertiary)', letterSpacing: '0.05em' }}>
                  {item.label}
                </span>
              </div>
              {item.href ? (
                <a href={item.href} className="text-xs font-medium" style={{ color: '#4f8ef7', textDecoration: 'none', wordBreak: 'break-all' }}>
                  {item.value}
                </a>
              ) : (
                <p className="text-xs font-medium" style={{ color: 'var(--text-primary)', margin: 0 }}>{item.value}</p>
              )}
            </div>
          );
        })}
      </div>

      {/* Form */}
      <div className="rounded-2xl border p-5"
        style={{ background: 'var(--surface-primary)', borderColor: 'var(--apple-gray-200)' }}>
        <p className="text-base font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>
          Formulaire de contact
        </p>
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>
              Nom <span style={{ color: '#ef4444' }}>*</span>
            </label>
            <input
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="Votre nom"
              style={inp}
            />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>
              Email <span style={{ color: '#ef4444' }}>*</span>
            </label>
            <input
              type="email"
              value={form.email}
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              placeholder="votre@email.com"
              style={inp}
            />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>
              Sujet <span style={{ color: '#ef4444' }}>*</span>
            </label>
            <select
              value={form.subject}
              onChange={(e) => setForm((f) => ({ ...f, subject: e.target.value }))}
              style={{ ...inp, cursor: 'pointer' }}
            >
              <option value="">Sélectionner une catégorie...</option>
              {SUBJECTS.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>
              Message <span style={{ color: '#ef4444' }}>*</span>
            </label>
            <textarea
              value={form.message}
              onChange={(e) => setForm((f) => ({ ...f, message: e.target.value }))}
              placeholder="Décrivez votre problème ou question en détail..."
              rows={5}
              style={{ ...inp, resize: 'vertical' }}
            />
          </div>

          {error && (
            <p className="text-sm" style={{ color: '#ef4444' }}>{error}</p>
          )}

          <button
            onClick={handleSend}
            disabled={sending}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold transition-opacity"
            style={{ background: 'var(--apple-blue)', color: '#fff', border: 'none', cursor: 'pointer', opacity: sending ? 0.6 : 1 }}
          >
            <Send className="w-4 h-4" />
            {sending ? 'Envoi en cours...' : 'Envoyer le message'}
          </button>
        </div>
      </div>

      <p className="text-xs text-center mt-4" style={{ color: 'var(--text-tertiary)' }}>
        Pour les questions de facturation urgentes :{' '}
        <a href="mailto:billing@ecompilotelite.com" style={{ color: '#4f8ef7', textDecoration: 'none' }}>
          billing@ecompilotelite.com
        </a>
      </p>
    </div>
  );
}
