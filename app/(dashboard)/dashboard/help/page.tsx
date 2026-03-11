"use client";

import { useState, useEffect } from "react";
import {
  HelpCircle, MessageSquare, Send, ChevronDown, ChevronUp, Search,
  BookOpen, Zap, Image, Settings, CreditCard, ShoppingBag, RefreshCw,
  CheckCircle, Clock, AlertCircle, Plus, Tag,
} from "lucide-react";
import { useToast } from "@/lib/toast";

interface FAQItem {
  id: string;
  question: string;
  answer: string;
  category: string;
}

interface Reply {
  id: string;
  author_role: "user" | "admin";
  message: string;
  created_at: string;
}

interface Ticket {
  id: string;
  subject: string;
  message: string;
  category: string;
  status: "open" | "in_progress" | "resolved" | "closed";
  created_at: string;
  support_ticket_replies: Reply[];
}

const FAQ_DATA: FAQItem[] = [
  {
    id: "1", category: "general",
    question: "Comment connecter ma boutique Shopify ?",
    answer: "Allez dans **Mes boutiques** dans le menu de gauche, puis cliquez sur **Ajouter une boutique**. Entrez votre domaine Shopify (ex : ma-boutique ou ma-boutique.myshopify.com) et cliquez Ajouter. Pour que vos produits soient accessibles, cliquez ensuite sur **Connecter** (bouton orange) sur la carte de votre boutique afin de finaliser la connexion via l'accès OAuth Shopify.",
  },
  {
    id: "2", category: "ai",
    question: "Comment fonctionne l'optimisation IA ?",
    answer: "Notre IA utilise GPT-4o-mini pour analyser vos fiches produits et générer des titres SEO-optimisés, des descriptions attrayantes et des tags pertinents. Chaque génération consomme 1 tâche. Vous pouvez optimiser en masse depuis la page Optimisation IA.",
  },
  {
    id: "3", category: "ai",
    question: "Que signifie le score SEO ?",
    answer: "Le score SEO (0-100) évalue la qualité de votre fiche produit selon 4 critères : longueur du titre (30 pts max — idéalement 50 à 70 caractères), richesse de la description (40 pts max — idéalement 100+ mots), nombre de tags (20 pts max — 5+ tags recommandés), et présence d'images (10 pts). Un score > 70 est considéré comme bon.",
  },
  {
    id: "4", category: "images",
    question: "Quels formats d'image sont supportés ?",
    answer: "EcomPilot supporte JPG, PNG et WebP en entrée. Vous pouvez exporter en WebP (recommandé pour le web), PNG (sans perte) ou JPEG. Les images peuvent être redimensionnées aux tailles standards Shopify, Instagram, Facebook, etc.",
  },
  {
    id: "5", category: "automation",
    question: "Comment créer une règle d'automatisation ?",
    answer: "Allez dans Automatisations > Nouvelle règle. Définissez une condition (stock bas, prix seuil, planification...) et une action (modifier prix, ajouter tag, archiver...). La règle s'exécutera automatiquement ou manuellement selon votre choix.",
  },
  {
    id: "6", category: "billing",
    question: "Comment changer de plan ?",
    answer: "Allez dans **Mon forfait** dans le menu de gauche pour voir vos tâches restantes et les plans disponibles. Vous pouvez upgrader à tout moment pour obtenir plus de tâches mensuelles.",
  },
  {
    id: "7", category: "general",
    question: "Mes données sont-elles sécurisées ?",
    answer: "Oui, toutes les données transitent en HTTPS. Nous utilisons Supabase pour l'authentification et le stockage sécurisé. Vos clés API sont chiffrées en base de données et ne sont jamais exposées côté client.",
  },
  {
    id: "8", category: "products",
    question: "Comment modifier mes produits en masse ?",
    answer: "Sur la page Produits, sélectionnez les produits avec les cases à cocher, puis utilisez la barre d'actions en masse pour modifier les prix, tags, statuts ou générer du contenu IA pour tous les produits sélectionnés.",
  },
];

function renderMarkdown(text: string): React.ReactNode {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return <strong key={i}>{part.slice(2, -2)}</strong>;
    }
    return part;
  });
}

const CATEGORIES = [
  { id: "all", label: "Tout", icon: <BookOpen className="w-3.5 h-3.5" /> },
  { id: "general", label: "Général", icon: <HelpCircle className="w-3.5 h-3.5" /> },
  { id: "ai", label: "IA", icon: <Zap className="w-3.5 h-3.5" /> },
  { id: "images", label: "Images", icon: <Image className="w-3.5 h-3.5" /> },
  { id: "automation", label: "Automation", icon: <Settings className="w-3.5 h-3.5" /> },
  { id: "products", label: "Produits", icon: <ShoppingBag className="w-3.5 h-3.5" /> },
  { id: "billing", label: "Facturation", icon: <CreditCard className="w-3.5 h-3.5" /> },
];

const STATUS_META: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  open:        { label: "Ouvert",    color: "bg-red-100 text-red-700",      icon: <AlertCircle className="w-3 h-3" /> },
  in_progress: { label: "En cours", color: "bg-yellow-100 text-yellow-700", icon: <Clock className="w-3 h-3" /> },
  resolved:    { label: "Résolu",   color: "bg-green-100 text-green-700",   icon: <CheckCircle className="w-3 h-3" /> },
  closed:      { label: "Fermé",    color: "bg-gray-100 text-gray-500",     icon: <CheckCircle className="w-3 h-3" /> },
};

const TICKET_CATEGORIES = [
  { value: "general", label: "Général" },
  { value: "technical", label: "Problème technique" },
  { value: "billing", label: "Facturation" },
  { value: "shopify", label: "Connexion Shopify" },
  { value: "ai", label: "Fonctionnalités IA" },
  { value: "other", label: "Autre" },
];

type MainTab = "faq" | "contact" | "tickets";

export default function HelpPage() {
  const { addToast } = useToast();
  const [mainTab, setMainTab] = useState<MainTab>("faq");

  // FAQ
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [expandedFAQ, setExpandedFAQ] = useState<string | null>(null);

  // Ticket form
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [ticketCategory, setTicketCategory] = useState("general");
  const [submitting, setSubmitting] = useState(false);

  // My tickets
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [ticketsLoading, setTicketsLoading] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);

  const loadTickets = async () => {
    setTicketsLoading(true);
    try {
      const res = await fetch("/api/support");
      const data = await res.json();
      if (data.tickets) setTickets(data.tickets);
    } catch { /* silent */ }
    setTicketsLoading(false);
  };

  useEffect(() => {
    if (mainTab === "tickets") loadTickets();
  }, [mainTab]);

  const handleSubmitTicket = async () => {
    if (!subject.trim() || !message.trim()) {
      addToast("Veuillez remplir le sujet et le message.", "error");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/support", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subject: subject.trim(), message: message.trim(), category: ticketCategory }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erreur lors de l envoi");
      addToast("Demande envoyee ! Nous vous repondrons sous 24-48h.", "success");
      setSubject("");
      setMessage("");
      setTicketCategory("general");
      setMainTab("tickets");
      loadTickets();
    } catch (err) {
      addToast((err as Error).message, "error");
    }
    setSubmitting(false);
  };

  const filteredFAQ = FAQ_DATA.filter((item) => {
    const matchesCategory = category === "all" || item.category === category;
    const matchesSearch = !search || item.question.toLowerCase().includes(search.toLowerCase())
      || item.answer.toLowerCase().includes(search.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-xl md:text-2xl font-bold" style={{ color: "#0f172a" }}>Centre d&apos;aide</h1>
        <p className="text-sm mt-1" style={{ color: "#64748b" }}>FAQ, support et suivi de vos demandes</p>
      </div>

      <div className="flex gap-1 p-1 bg-gray-100 rounded-xl mb-6 w-fit">
        {([
          ["faq", "FAQ", <HelpCircle key="faq" className="w-4 h-4" />],
          ["contact", "Nouvelle demande", <Plus key="contact" className="w-4 h-4" />],
          ["tickets", "Mes demandes", <MessageSquare key="tickets" className="w-4 h-4" />],
        ] as [MainTab, string, React.ReactNode][]).map(([id, label, icon]) => (
          <button key={id} onClick={() => setMainTab(id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${mainTab === id ? "bg-white text-blue-600 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}>
            {icon}{label}
          </button>
        ))}
      </div>

      {mainTab === "faq" && (
        <div>
          <div className="relative mb-5">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "#94a3b8" }} />
            <input type="text" value={search} onChange={(e) => setSearch(e.target.value)}
              placeholder="Rechercher dans l'aide..."
              className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl text-sm focus:border-blue-400 outline-none bg-white"
              style={{ color: "#0f172a" }} />
          </div>
          <div className="flex items-center gap-2 mb-5 overflow-x-auto pb-1">
            {CATEGORIES.map((cat) => (
              <button key={cat.id} onClick={() => setCategory(cat.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${category === cat.id ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}>
                {cat.icon}{cat.label}
              </button>
            ))}
          </div>
          <div className="space-y-3">
            {filteredFAQ.length === 0 ? (
              <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
                <HelpCircle className="w-10 h-10 mx-auto mb-3 text-gray-200" />
                <p className="text-sm font-medium text-gray-700">Aucun resultat</p>
                <button onClick={() => setMainTab("contact")}
                  className="mt-3 px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-sm font-medium text-white">
                  Contacter le support
                </button>
              </div>
            ) : filteredFAQ.map((item) => (
              <div key={item.id}
                className={`bg-white rounded-xl border transition-all ${expandedFAQ === item.id ? "border-blue-200 shadow-sm" : "border-gray-200"}`}>
                <button onClick={() => setExpandedFAQ(expandedFAQ === item.id ? null : item.id)}
                  className="w-full flex items-center justify-between p-4 text-left gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
                      <HelpCircle className="w-3.5 h-3.5 text-blue-600" />
                    </div>
                    <span className="text-sm font-medium" style={{ color: "#0f172a" }}>{item.question}</span>
                  </div>
                  {expandedFAQ === item.id
                    ? <ChevronUp className="w-4 h-4 shrink-0 text-gray-400" />
                    : <ChevronDown className="w-4 h-4 shrink-0 text-gray-400" />}
                </button>
                {expandedFAQ === item.id && (
                  <div className="px-4 pb-4">
                    <div className="ml-9 text-sm leading-relaxed text-gray-600">
                      {renderMarkdown(item.answer)}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {mainTab === "contact" && (
        <div className="bg-white rounded-xl border border-gray-200 p-6 max-w-2xl">
          <h2 className="text-base font-semibold mb-1 text-gray-900">Nouvelle demande de support</h2>
          <p className="text-xs text-gray-400 mb-5">Notre equipe vous repondra sous 24-48h ouvrables.</p>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1.5">Categorie</label>
              <select value={ticketCategory} onChange={e => setTicketCategory(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm bg-white focus:border-blue-400 outline-none text-gray-800">
                {TICKET_CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1.5">Sujet</label>
              <input type="text" value={subject} onChange={e => setSubject(e.target.value)}
                placeholder="Ex : Impossible de connecter ma boutique"
                maxLength={200}
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:border-blue-400 outline-none text-gray-800" />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1.5">Message</label>
              <textarea value={message} onChange={e => setMessage(e.target.value)}
                rows={6} maxLength={5000}
                placeholder="Decrivez votre probleme en detail..."
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm resize-none focus:border-blue-400 outline-none text-gray-800" />
              <p className="text-xs text-gray-400 text-right mt-1">{message.length}/5000</p>
            </div>
            <button onClick={handleSubmitTicket} disabled={submitting || !subject.trim() || !message.trim()}
              className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-lg text-sm font-medium text-white transition-colors">
              {submitting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              Envoyer la demande
            </button>
          </div>
        </div>
      )}

      {mainTab === "tickets" && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold text-gray-900">Mes demandes</h2>
            <button onClick={loadTickets} className="flex items-center gap-1.5 px-3 py-1.5 border border-gray-200 rounded-lg text-xs hover:bg-gray-50">
              <RefreshCw className="w-3.5 h-3.5" /> Actualiser
            </button>
          </div>
          {ticketsLoading ? (
            <div className="text-center py-12 text-gray-400 text-sm">Chargement...</div>
          ) : tickets.length === 0 ? (
            <div className="bg-white rounded-xl border border-dashed border-gray-300 p-12 text-center">
              <MessageSquare className="w-10 h-10 mx-auto mb-3 text-gray-200" />
              <p className="text-sm font-medium text-gray-600">Aucune demande pour le moment</p>
              <button onClick={() => setMainTab("contact")}
                className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-sm font-medium text-white transition-colors">
                <Plus className="w-4 h-4" /> Nouvelle demande
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div className="space-y-3">
                {tickets.map(ticket => {
                  const sm = STATUS_META[ticket.status] || STATUS_META.open;
                  return (
                    <button key={ticket.id}
                      onClick={() => setSelectedTicket(selectedTicket?.id === ticket.id ? null : ticket)}
                      className={`w-full text-left p-4 rounded-xl border transition-all ${selectedTicket?.id === ticket.id ? "border-blue-400 bg-blue-50" : "bg-white border-gray-200 hover:border-gray-300"}`}>
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <span className="text-sm font-medium text-gray-900 line-clamp-1">{ticket.subject}</span>
                        <span className={`flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium whitespace-nowrap ${sm.color}`}>
                          {sm.icon}{sm.label}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-gray-400">
                        <span className="flex items-center gap-1"><Tag className="w-3 h-3" />{ticket.category}</span>
                        <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{new Date(ticket.created_at).toLocaleDateString("fr-FR")}</span>
                        <span className="flex items-center gap-1"><MessageSquare className="w-3 h-3" />{ticket.support_ticket_replies?.length || 0}</span>
                      </div>
                    </button>
                  );
                })}
              </div>
              {selectedTicket && (
                <div className="bg-white rounded-xl border border-gray-200 p-5">
                  <h3 className="font-semibold text-gray-900 text-sm mb-3">{selectedTicket.subject}</h3>
                  <div className="space-y-3 max-h-96 overflow-y-auto">
                    <div className="bg-gray-50 rounded-lg p-3 text-sm text-gray-700">
                      <span className="text-xs text-gray-400 block mb-1">Votre message initial</span>
                      {selectedTicket.message}
                    </div>
                    {(selectedTicket.support_ticket_replies || []).map(reply => (
                      <div key={reply.id}
                        className={`rounded-lg p-3 text-sm ${reply.author_role === "admin" ? "bg-blue-50 text-blue-900" : "bg-gray-50 text-gray-700"}`}>
                        <span className="text-xs block mb-1" style={{ color: reply.author_role === "admin" ? "#1d4ed8" : "#6b7280" }}>
                          {reply.author_role === "admin" ? "Support EcomPilot" : "Vous"} · {new Date(reply.created_at).toLocaleDateString("fr-FR")}
                        </span>
                        {reply.message}
                      </div>
                    ))}
                    {(selectedTicket.support_ticket_replies?.length || 0) === 0 && (
                      <p className="text-xs text-gray-400 text-center py-4">En attente de reponse...</p>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
