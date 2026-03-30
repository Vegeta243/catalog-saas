"use client";

import { useState, useEffect, useRef } from "react";
import { Save, RefreshCw, AlertTriangle } from "lucide-react";
import { useToast } from "@/lib/toast";

interface SystemConfig {
  id: number;
  key: string;
  value: Record<string, unknown>;
  description: string;
  updated_at: string;
  updated_by?: string;
}

const CONFIG_META: Record<string, { label: string; icon: string; fields: Array<{ key: string; label: string; type: string }> }> = {
  maintenance_mode: {
    label: "Mode Maintenance",
    icon: "🔧",
    fields: [
      { key: "enabled", label: "Activer la maintenance", type: "boolean" },
      { key: "message", label: "Message affiché aux utilisateurs", type: "text" },
    ],
  },
  announcement_banner: {
    label: "Bannière d'annonce",
    icon: "📢",
    fields: [
      { key: "enabled", label: "Afficher la bannière", type: "boolean" },
      { key: "text", label: "Texte de la bannière", type: "text" },
      { key: "color", label: "Couleur (blue/green/amber/red)", type: "text" },
      { key: "link", label: "Lien (optionnel)", type: "text" },
      { key: "link_text", label: "Texte du lien", type: "text" },
    ],
  },
  plan_limits: {
    label: "Limites des plans",
    icon: "📊",
    fields: [
      { key: "free", label: "Free — tâches/mois", type: "number" },
      { key: "starter", label: "Starter — tâches/mois", type: "number" },
      { key: "pro", label: "Pro — tâches/mois", type: "number" },
      { key: "agency", label: "Agency — tâches/mois", type: "number" },
    ],
  },
  global_settings: {
    label: "Paramètres globaux",
    icon: "⚙️",
    fields: [
      { key: "app_name", label: "Nom de l'application", type: "text" },
      { key: "support_email", label: "Email support", type: "text" },
      { key: "max_referral_discount", label: "Réduction parrainage max (%)", type: "number" },
      { key: "referral_discount_per", label: "Réduction par parrainage (%)", type: "number" },
    ],
  },
};

export default function ConfigClient({ initialConfigs }: { initialConfigs: SystemConfig[] }) {
  const { addToast } = useToast();
  const [configs, setConfigs] = useState<Record<string, SystemConfig>>(
    Object.fromEntries(initialConfigs.map(c => [c.key, c]))
  );
  const [saving, setSaving] = useState<string | null>(null);

  // Demo video state
  const [videoUrl, setVideoUrl] = useState<string | null>(null)
  const [videoLoaded, setVideoLoaded] = useState(false)
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Landing page video slots
  const [heroVideoUrl, setHeroVideoUrl] = useState<string | null>(null)
  const [beforeafterVideoUrl, setBeforeafterVideoUrl] = useState<string | null>(null)
  const [landingVideosLoaded, setLandingVideosLoaded] = useState(false)
  const [uploadingSlot, setUploadingSlot] = useState<'hero' | 'beforeafter' | null>(null)
  const heroFileRef = useRef<HTMLInputElement>(null)
  const beforeafterFileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    fetch('/api/admin/demo-video')
      .then(r => r.json())
      .then(d => { setVideoUrl(d.url || null); setVideoLoaded(true) })
      .catch(() => setVideoLoaded(true))
    // Load landing video slots
    Promise.all([
      fetch('/api/admin/landing-video?slot=hero').then(r => r.json()),
      fetch('/api/admin/landing-video?slot=beforeafter').then(r => r.json()),
    ]).then(([hero, ba]) => {
      setHeroVideoUrl(hero.url || null)
      setBeforeafterVideoUrl(ba.url || null)
      setLandingVideosLoaded(true)
    }).catch(() => setLandingVideosLoaded(true))
  }, [])

  async function handleVideoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    try {
      const fd = new FormData()
      fd.append('video', file)
      const res = await fetch('/api/admin/demo-video', { method: 'POST', body: fd })
      const data = await res.json()
      if (res.ok) {
        setVideoUrl(data.url)
        addToast('Vidéo uploadée avec succès', 'success')
      } else {
        addToast(data.error || 'Erreur upload', 'error')
      }
    } finally {
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  async function handleDeleteVideo() {
    if (!confirm('Supprimer la vidéo de démonstration ?')) return
    const res = await fetch('/api/admin/demo-video', { method: 'DELETE' })
    if (res.ok) {
      setVideoUrl(null)
      addToast('Vidéo supprimée', 'success')
    } else {
      addToast('Erreur lors de la suppression', 'error')
    }
  }

  async function handleLandingVideoUpload(slot: 'hero' | 'beforeafter', e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploadingSlot(slot)
    try {
      const fd = new FormData()
      fd.append('slot', slot)
      fd.append('video', file)
      const res = await fetch('/api/admin/landing-video', { method: 'POST', body: fd })
      const data = await res.json()
      if (res.ok) {
        if (slot === 'hero') setHeroVideoUrl(data.url)
        else setBeforeafterVideoUrl(data.url)
        addToast('Vidéo uploadée avec succès', 'success')
      } else {
        addToast(data.error || 'Erreur upload', 'error')
      }
    } finally {
      setUploadingSlot(null)
      if (slot === 'hero' && heroFileRef.current) heroFileRef.current.value = ''
      if (slot === 'beforeafter' && beforeafterFileRef.current) beforeafterFileRef.current.value = ''
    }
  }

  async function handleDeleteLandingVideo(slot: 'hero' | 'beforeafter') {
    const label = slot === 'hero' ? 'Hero' : 'Avant/Après'
    if (!confirm(`Supprimer la vidéo ${label} ?`)) return
    const res = await fetch(`/api/admin/landing-video?slot=${slot}`, { method: 'DELETE' })
    if (res.ok) {
      if (slot === 'hero') setHeroVideoUrl(null)
      else setBeforeafterVideoUrl(null)
      addToast('Vidéo supprimée', 'success')
    } else {
      addToast('Erreur lors de la suppression', 'error')
    }
  }

  const updateField = (configKey: string, field: string, value: unknown) => {
    setConfigs(cs => ({
      ...cs,
      [configKey]: { ...cs[configKey], value: { ...cs[configKey].value, [field]: value } },
    }));
  };

  const save = async (configKey: string) => {
    setSaving(configKey);
    try {
      const res = await fetch(`/api/admin/config`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: configKey, value: configs[configKey].value }),
      });
      if (res.ok) {
        addToast("Configuration sauvegardée", "success");
      } else {
        addToast("Erreur lors de la sauvegarde", "error");
      }
    } finally {
      setSaving(null);
    }
  };

  const maintenanceEnabled = Boolean(configs["maintenance_mode"]?.value?.enabled);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold" style={{ color: "#0f172a" }}>⚙️ Configuration système</h1>
        <p className="text-sm mt-0.5" style={{ color: "#64748b" }}>Paramètres globaux, maintenance, limites et annonces</p>
      </div>

      {maintenanceEnabled && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0" />
          <p className="text-sm font-medium text-amber-800">⚠️ Mode maintenance ACTIF — les utilisateurs voient le message de maintenance</p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {Object.entries(CONFIG_META).map(([configKey, meta]) => {
          const config = configs[configKey];
          if (!config) return null;
          return (
            <div key={configKey} className="bg-white rounded-2xl border border-gray-200 p-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-semibold" style={{ color: "#0f172a" }}>
                  {meta.icon} {meta.label}
                </h2>
                <span className="text-[10px] text-gray-400">
                  {config.updated_at ? new Date(config.updated_at).toLocaleDateString("fr-FR") : ""}
                </span>
              </div>

              <div className="space-y-3">
                {meta.fields.map(f => (
                  <div key={f.key}>
                    <label className="block text-xs font-medium mb-1" style={{ color: "#374151" }}>{f.label}</label>
                    {f.type === "boolean" ? (
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          id={`${configKey}.${f.key}`}
                          checked={Boolean(config.value[f.key])}
                          onChange={e => updateField(configKey, f.key, e.target.checked)}
                          className="rounded w-4 h-4"
                        />
                        <label htmlFor={`${configKey}.${f.key}`} className="text-xs text-gray-500">
                          {Boolean(config.value[f.key]) ? "Activé" : "Désactivé"}
                        </label>
                      </div>
                    ) : f.type === "number" ? (
                      <input
                        type="number"
                        value={Number(config.value[f.key] ?? 0)}
                        onChange={e => updateField(configKey, f.key, Number(e.target.value))}
                        className="w-full px-3 py-1.5 border border-gray-200 rounded-lg text-sm"
                        style={{ color: "#0f172a" }}
                      />
                    ) : (
                      <input
                        type="text"
                        value={String(config.value[f.key] ?? "")}
                        onChange={e => updateField(configKey, f.key, e.target.value)}
                        className="w-full px-3 py-1.5 border border-gray-200 rounded-lg text-sm"
                        style={{ color: "#0f172a" }}
                      />
                    )}
                  </div>
                ))}
              </div>

              <div className="flex justify-end mt-4 pt-3 border-t border-gray-100">
                <button
                  onClick={() => save(configKey)}
                  disabled={saving === configKey}
                  className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 rounded-lg text-xs font-medium text-white"
                >
                  {saving === configKey
                    ? <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    : <Save className="w-3.5 h-3.5" />}
                  Sauvegarder
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Demo video upload section */}
      <div className="bg-white rounded-2xl border border-gray-200 p-5">
        <h2 className="text-sm font-semibold mb-1" style={{ color: '#0f172a' }}>
          🎥 Vidéo démo (page d&apos;accueil)
        </h2>
        <p className="text-xs mb-4" style={{ color: '#64748b' }}>
          Uploadez une vidéo MP4 de 30-90 secondes. Elle apparaîtra sur la page d&apos;accueil.
        </p>

        {!videoLoaded && (
          <div className="h-8 bg-gray-100 rounded animate-pulse mb-4" />
        )}

        {videoLoaded && videoUrl && (
          <div className="mb-4 rounded-xl overflow-hidden border border-gray-200">
            <video src={videoUrl} controls className="w-full max-h-48 bg-black" />
            <p className="text-xs p-2" style={{ color: '#94a3b8' }}>
              Vidéo actuelle — visible sur la page d&apos;accueil
            </p>
          </div>
        )}

        {videoLoaded && !videoUrl && (
          <div className="mb-4 p-3 bg-gray-50 border border-gray-200 rounded-xl">
            <p className="text-xs" style={{ color: '#94a3b8' }}>Aucune vidéo uploadée — le placeholder s&apos;affiche.</p>
          </div>
        )}

        <div className="flex items-center gap-3">
          <input
            ref={fileInputRef}
            type="file"
            accept="video/mp4,video/webm,video/quicktime"
            onChange={handleVideoUpload}
            className="hidden"
            id="video-upload"
          />
          <label
            htmlFor="video-upload"
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold text-white cursor-pointer transition-colors"
            style={{ backgroundColor: uploading ? '#1d4ed8' : '#2563eb' }}
          >
            {uploading ? (
              <><RefreshCw className="w-3.5 h-3.5 animate-spin" /> Upload en cours...</>
            ) : (
              <>+ Uploader une vidéo</>
            )}
          </label>
          {videoUrl && (
            <button
              onClick={handleDeleteVideo}
              className="px-4 py-2 rounded-lg text-xs font-semibold transition-colors"
              style={{ backgroundColor: 'rgba(239,68,68,0.1)', color: '#ef4444' }}
            >
              Supprimer
            </button>
          )}
        </div>
        <p className="text-xs mt-2" style={{ color: '#94a3b8' }}>
          Formats: MP4, WebM · Max: 100MB
        </p>
      </div>

      {/* Landing page video slots */}
      <div className="bg-white rounded-2xl border border-gray-200 p-5">
        <h2 className="text-sm font-semibold mb-1" style={{ color: '#0f172a' }}>
          🎬 Vidéos Landing Page
        </h2>
        <p className="text-xs mb-5" style={{ color: '#64748b' }}>
          Slot 1 — Hero (vidéo principale) · Slot 2 — Avant/Après. MP4 / WebM / MOV · Max 200MB.
        </p>

        {!landingVideosLoaded && <div className="h-8 bg-gray-100 rounded animate-pulse mb-4" />}

        {landingVideosLoaded && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Hero slot */}
            <div className="border border-gray-200 rounded-xl p-4">
              <p className="text-xs font-semibold mb-3" style={{ color: '#0f172a' }}>Slot 1 — Vidéo Hero</p>
              {heroVideoUrl ? (
                <div className="mb-3 rounded-lg overflow-hidden border border-gray-200">
                  <video src={heroVideoUrl} controls className="w-full max-h-32 bg-black" />
                </div>
              ) : (
                <div className="mb-3 p-2 bg-gray-50 border border-gray-200 rounded-lg">
                  <p className="text-xs" style={{ color: '#94a3b8' }}>Aucune vidéo hero uploadée</p>
                </div>
              )}
              <div className="flex items-center gap-2">
                <input ref={heroFileRef} type="file" accept="video/mp4,video/webm,video/quicktime"
                  onChange={e => handleLandingVideoUpload('hero', e)} className="hidden" id="hero-video-upload" />
                <label htmlFor="hero-video-upload"
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-white cursor-pointer"
                  style={{ backgroundColor: uploadingSlot === 'hero' ? '#1d4ed8' : '#2563eb' }}>
                  {uploadingSlot === 'hero' ? <><RefreshCw className="w-3 h-3 animate-spin" /> Upload...</> : '+ Uploader'}
                </label>
                {heroVideoUrl && (
                  <button onClick={() => handleDeleteLandingVideo('hero')}
                    className="px-3 py-1.5 rounded-lg text-xs font-semibold"
                    style={{ backgroundColor: 'rgba(239,68,68,0.1)', color: '#ef4444' }}>
                    Supprimer
                  </button>
                )}
              </div>
            </div>

            {/* Avant/Après slot */}
            <div className="border border-gray-200 rounded-xl p-4">
              <p className="text-xs font-semibold mb-3" style={{ color: '#0f172a' }}>Slot 2 — Vidéo Avant/Après</p>
              {beforeafterVideoUrl ? (
                <div className="mb-3 rounded-lg overflow-hidden border border-gray-200">
                  <video src={beforeafterVideoUrl} controls className="w-full max-h-32 bg-black" />
                </div>
              ) : (
                <div className="mb-3 p-2 bg-gray-50 border border-gray-200 rounded-lg">
                  <p className="text-xs" style={{ color: '#94a3b8' }}>Aucune vidéo avant/après uploadée</p>
                </div>
              )}
              <div className="flex items-center gap-2">
                <input ref={beforeafterFileRef} type="file" accept="video/mp4,video/webm,video/quicktime"
                  onChange={e => handleLandingVideoUpload('beforeafter', e)} className="hidden" id="beforeafter-video-upload" />
                <label htmlFor="beforeafter-video-upload"
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-white cursor-pointer"
                  style={{ backgroundColor: uploadingSlot === 'beforeafter' ? '#1d4ed8' : '#2563eb' }}>
                  {uploadingSlot === 'beforeafter' ? <><RefreshCw className="w-3 h-3 animate-spin" /> Upload...</> : '+ Uploader'}
                </label>
                {beforeafterVideoUrl && (
                  <button onClick={() => handleDeleteLandingVideo('beforeafter')}
                    className="px-3 py-1.5 rounded-lg text-xs font-semibold"
                    style={{ backgroundColor: 'rgba(239,68,68,0.1)', color: '#ef4444' }}>
                    Supprimer
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* All configs raw view */}
      <div className="bg-white rounded-2xl border border-gray-200 p-5">
        <h2 className="text-sm font-semibold mb-3" style={{ color: "#0f172a" }}>Toutes les clés de configuration</h2>
        <div className="space-y-2">
          {initialConfigs.map(c => (
            <div key={c.key} className="flex items-start justify-between py-2 border-b border-gray-50 last:border-0">
              <div>
                <p className="text-xs font-mono font-medium" style={{ color: "#0f172a" }}>{c.key}</p>
                <p className="text-xs mt-0.5" style={{ color: "#94a3b8" }}>{c.description}</p>
              </div>
              <span className="text-[10px] text-gray-400 whitespace-nowrap ml-4">
                {c.updated_at ? new Date(c.updated_at).toLocaleDateString("fr-FR") : ""}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
