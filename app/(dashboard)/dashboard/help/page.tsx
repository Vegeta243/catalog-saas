"use client";

import { useState, useRef, useEffect } from "react";
import {
  HelpCircle, MessageSquare, Send, ChevronDown, ChevronUp, Search,
  BookOpen, Zap, Image, Settings, CreditCard, ShoppingBag, Bot,
  User, RefreshCw, ExternalLink, ThumbsUp, ThumbsDown, X,
} from "lucide-react";
import { useToast } from "@/lib/toast";

interface FAQItem {
  id: string;
  question: string;
  answer: string;
  category: string;
}

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

const FAQ_DATA: FAQItem[] = [
  {
    id: "1", category: "general",
    question: "Comment connecter ma boutique Shopify ?",
    answer: "Allez dans Paramètres > Clés API, puis entrez votre token d'accès Shopify Admin API. Vous pouvez le créer depuis votre admin Shopify dans Apps > Développer des apps. Assurez-vous d'activer les permissions read_products et write_products.",
  },
  {
    id: "2", category: "ai",
    question: "Comment fonctionne l'optimisation IA ?",
    answer: "Notre IA utilise GPT-4o-mini pour analyser vos fiches produits et générer des titres SEO-optimisés, des descriptions attrayantes et des tags pertinents. Chaque génération consomme 1 tâche. Vous pouvez optimiser en masse depuis la page Optimisation IA.",
  },
  {
    id: "3", category: "ai",
    question: "Que signifie le score SEO ?",
    answer: "Le score SEO (0-100) évalue la qualité de votre fiche produit selon 5 critères : longueur du titre (20 pts), présence de description (25 pts), nombre de tags (20 pts), images (20 pts) et prix configuré (15 pts). Un score > 70 est considéré comme bon.",
  },
  {
    id: "4", category: "images",
    question: "Quels formats d'image sont supportés ?",
    answer: "EcomPilot supporte JPG, PNG, WebP et GIF en entrée. Vous pouvez exporter en WebP (recommandé pour le web), PNG (sans perte) ou JPEG. Les images peuvent être redimensionnées aux tailles standards Shopify, Instagram, Facebook, etc.",
  },
  {
    id: "5", category: "automation",
    question: "Comment créer une règle d'automatisation ?",
    answer: "Allez dans Automatisations > Nouvelle règle. Définissez une condition (stock bas, prix seuil, planification...) et une action (modifier prix, ajouter tag, archiver...). La règle s'exécutera automatiquement ou manuellement selon votre choix.",
  },
  {
    id: "6", category: "billing",
    question: "Comment changer de plan ?",
    answer: "Rendez-vous dans Paramètres > Facturation pour voir les plans disponibles. Le changement de plan est immédiat et la différence est calculée au prorata. Vous pouvez upgrader ou downgrader à tout moment.",
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

const CATEGORIES = [
  { id: "all", label: "Tout", icon: <BookOpen className="w-3.5 h-3.5" /> },
  { id: "general", label: "Général", icon: <HelpCircle className="w-3.5 h-3.5" /> },
  { id: "ai", label: "IA", icon: <Zap className="w-3.5 h-3.5" /> },
  { id: "images", label: "Images", icon: <Image className="w-3.5 h-3.5" /> },
  { id: "automation", label: "Automation", icon: <Settings className="w-3.5 h-3.5" /> },
  { id: "products", label: "Produits", icon: <ShoppingBag className="w-3.5 h-3.5" /> },
  { id: "billing", label: "Facturation", icon: <CreditCard className="w-3.5 h-3.5" /> },
];

export default function HelpPage() {
  const { addToast } = useToast();
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [expandedFAQ, setExpandedFAQ] = useState<string | null>(null);
  const [showChat, setShowChat] = useState(false);
  const [chatInput, setChatInput] = useState("");
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    {
      id: "welcome",
      role: "assistant",
      content: "Bonjour ! Je suis l'assistant EcomPilot. Comment puis-je vous aider ? Vous pouvez me poser des questions sur les fonctionnalités, l'optimisation SEO, les automatisations, etc.",
      timestamp: new Date(),
    },
  ]);
  const [chatLoading, setChatLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages]);

  const filteredFAQ = FAQ_DATA.filter((item) => {
    const matchesCategory = category === "all" || item.category === category;
    const matchesSearch = !search || item.question.toLowerCase().includes(search.toLowerCase())
      || item.answer.toLowerCase().includes(search.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const sendChatMessage = async () => {
    if (!chatInput.trim()) return;

    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      role: "user",
      content: chatInput.trim(),
      timestamp: new Date(),
    };
    setChatMessages((prev) => [...prev, userMsg]);
    setChatInput("");
    setChatLoading(true);

    try {
      const res = await fetch("/api/ai/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "title",
          product: {
            title: chatInput.trim(),
            description: `Tu es l'assistant IA d'EcomPilot, un SaaS pour gérer des catalogues Shopify. Réponds de manière concise et utile. La question de l'utilisateur est: "${chatInput.trim()}". Réponds en français en te basant sur les fonctionnalités: optimisation SEO IA, édition en masse, traitement d'images, automatisations, gestion de produits Shopify.`,
          },
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setChatMessages((prev) => [...prev, {
          id: (Date.now() + 1).toString(),
          role: "assistant",
          content: data.title || data.description || "Je suis désolé, je n'ai pas pu générer de réponse. Consultez la FAQ ci-dessous ou contactez le support.",
          timestamp: new Date(),
        }]);
      } else {
        // Fallback response
        const faqMatch = FAQ_DATA.find((f) =>
          chatInput.toLowerCase().includes(f.question.toLowerCase().split(" ").slice(0, 3).join(" "))
          || f.question.toLowerCase().includes(chatInput.toLowerCase().split(" ").slice(0, 3).join(" "))
        );

        setChatMessages((prev) => [...prev, {
          id: (Date.now() + 1).toString(),
          role: "assistant",
          content: faqMatch
            ? faqMatch.answer
            : "Je ne suis pas en mesure de répondre en ce moment. Consultez la FAQ ci-dessous pour trouver votre réponse, ou contactez le support à support@ecompilot.com.",
          timestamp: new Date(),
        }]);
      }
    } catch {
      setChatMessages((prev) => [...prev, {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: "Une erreur est survenue. Veuillez réessayer ou consulter la FAQ ci-dessous.",
        timestamp: new Date(),
      }]);
    } finally {
      setChatLoading(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: "#0f172a" }}>Centre d&apos;aide</h1>
          <p className="text-sm mt-1" style={{ color: "#64748b" }}>Trouvez des réponses ou discutez avec notre assistant IA</p>
        </div>
        <button onClick={() => setShowChat(!showChat)}
          className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 rounded-lg text-sm font-medium transition-colors">
          <MessageSquare className="w-4 h-4" style={{ color: "#fff" }} />
          <span style={{ color: "#fff" }}>{showChat ? "Fermer le chat" : "Chat IA"}</span>
        </button>
      </div>

      <div className="flex gap-6">
        {/* Main content */}
        <div className={`${showChat ? "flex-1" : "w-full"}`}>
          {/* Search */}
          <div className="relative mb-6">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "#94a3b8" }} />
            <input type="text" value={search} onChange={(e) => setSearch(e.target.value)}
              placeholder="Rechercher dans l'aide..."
              className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl text-sm focus:border-blue-400 focus:ring-1 focus:ring-blue-400 outline-none bg-white"
              style={{ color: "#0f172a" }} />
          </div>

          {/* Category tabs */}
          <div className="flex items-center gap-2 mb-6 overflow-x-auto pb-1">
            {CATEGORIES.map((cat) => (
              <button key={cat.id} onClick={() => setCategory(cat.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${category === cat.id ? "bg-blue-600" : "bg-gray-100 hover:bg-gray-200"}`}
                style={{ color: category === cat.id ? "#fff" : "#374151" }}>
                {cat.icon}
                {cat.label}
              </button>
            ))}
          </div>

          {/* Quick help cards */}
          {!search && category === "all" && (
            <div className="grid grid-cols-3 gap-4 mb-6">
              {[
                { icon: <Zap className="w-5 h-5" style={{ color: "#f59e0b" }} />, title: "Démarrage rapide", desc: "Connectez votre boutique en 2 minutes", bg: "bg-amber-50" },
                { icon: <BookOpen className="w-5 h-5" style={{ color: "#2563eb" }} />, title: "Documentation", desc: "Guides détaillés de chaque fonctionnalité", bg: "bg-blue-50" },
                { icon: <MessageSquare className="w-5 h-5" style={{ color: "#059669" }} />, title: "Support", desc: "Contactez-nous à support@ecompilot.com", bg: "bg-emerald-50" },
              ].map((card) => (
                <div key={card.title} className={`${card.bg} rounded-xl p-4 cursor-pointer hover:shadow-sm transition-shadow`}>
                  <div className="mb-2">{card.icon}</div>
                  <p className="text-sm font-semibold" style={{ color: "#0f172a" }}>{card.title}</p>
                  <p className="text-xs mt-1" style={{ color: "#64748b" }}>{card.desc}</p>
                </div>
              ))}
            </div>
          )}

          {/* FAQ accordion */}
          <div className="space-y-3">
            {filteredFAQ.length === 0 ? (
              <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
                <HelpCircle className="w-10 h-10 mx-auto mb-3" style={{ color: "#cbd5e1" }} />
                <p className="text-sm font-medium" style={{ color: "#0f172a" }}>Aucun résultat trouvé</p>
                <p className="text-xs mt-1" style={{ color: "#64748b" }}>Essayez un autre terme ou utilisez le chat IA</p>
              </div>
            ) : (
              filteredFAQ.map((item) => (
                <div key={item.id}
                  className={`bg-white rounded-xl border transition-all ${expandedFAQ === item.id ? "border-blue-200 shadow-sm" : "border-gray-200"}`}>
                  <button onClick={() => setExpandedFAQ(expandedFAQ === item.id ? null : item.id)}
                    className="w-full flex items-center justify-between p-4 text-left">
                    <div className="flex items-center gap-3">
                      <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
                        <HelpCircle className="w-3.5 h-3.5" style={{ color: "#2563eb" }} />
                      </div>
                      <span className="text-sm font-medium" style={{ color: "#0f172a" }}>{item.question}</span>
                    </div>
                    {expandedFAQ === item.id
                      ? <ChevronUp className="w-4 h-4 shrink-0" style={{ color: "#64748b" }} />
                      : <ChevronDown className="w-4 h-4 shrink-0" style={{ color: "#64748b" }} />}
                  </button>
                  {expandedFAQ === item.id && (
                    <div className="px-4 pb-4 pt-0">
                      <div className="pl-9">
                        <p className="text-sm leading-relaxed" style={{ color: "#4b5563" }}>{item.answer}</p>
                        <div className="flex items-center gap-3 mt-3 pt-3 border-t border-gray-100">
                          <span className="text-xs" style={{ color: "#94a3b8" }}>Cette réponse vous a aidé ?</span>
                          <button onClick={() => addToast("Merci pour votre retour !", "success")}
                            className="p-1 hover:bg-emerald-50 rounded">
                            <ThumbsUp className="w-3.5 h-3.5" style={{ color: "#059669" }} />
                          </button>
                          <button onClick={() => addToast("Nous améliorerons cette réponse", "success")}
                            className="p-1 hover:bg-red-50 rounded">
                            <ThumbsDown className="w-3.5 h-3.5" style={{ color: "#ef4444" }} />
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>

          {/* Contact section */}
          <div className="mt-6 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold" style={{ color: "#fff" }}>Besoin d&apos;aide supplémentaire ?</p>
                <p className="text-xs mt-1 opacity-80" style={{ color: "#fff" }}>
                  Notre équipe support répond sous 24h en semaine
                </p>
              </div>
              <a href="mailto:support@ecompilot.com"
                className="flex items-center gap-2 px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg text-sm font-medium transition-colors"
                style={{ color: "#fff" }}>
                <ExternalLink className="w-4 h-4" /> Contacter le support
              </a>
            </div>
          </div>
        </div>

        {/* Chat panel */}
        {showChat && (
          <div className="w-96 shrink-0">
            <div className="bg-white rounded-xl border border-gray-200 flex flex-col h-[calc(100vh-12rem)] sticky top-4">
              {/* Chat header */}
              <div className="flex items-center justify-between p-4 border-b border-gray-100">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                    <Bot className="w-4 h-4" style={{ color: "#2563eb" }} />
                  </div>
                  <div>
                    <p className="text-sm font-semibold" style={{ color: "#0f172a" }}>Assistant IA</p>
                    <p className="text-[10px]" style={{ color: "#059669" }}>En ligne</p>
                  </div>
                </div>
                <button onClick={() => setShowChat(false)} className="p-1 hover:bg-gray-100 rounded">
                  <X className="w-4 h-4" style={{ color: "#64748b" }} />
                </button>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {chatMessages.map((msg) => (
                  <div key={msg.id} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                    <div className={`flex items-start gap-2 max-w-[85%] ${msg.role === "user" ? "flex-row-reverse" : ""}`}>
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 ${msg.role === "user" ? "bg-blue-600" : "bg-blue-100"}`}>
                        {msg.role === "user"
                          ? <User className="w-3 h-3" style={{ color: "#fff" }} />
                          : <Bot className="w-3 h-3" style={{ color: "#2563eb" }} />}
                      </div>
                      <div className={`rounded-xl px-3 py-2 text-xs leading-relaxed ${msg.role === "user"
                        ? "bg-blue-600"
                        : "bg-gray-100"}`}
                        style={{ color: msg.role === "user" ? "#fff" : "#374151" }}>
                        {msg.content}
                      </div>
                    </div>
                  </div>
                ))}
                {chatLoading && (
                  <div className="flex justify-start">
                    <div className="flex items-start gap-2">
                      <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center">
                        <Bot className="w-3 h-3" style={{ color: "#2563eb" }} />
                      </div>
                      <div className="bg-gray-100 rounded-xl px-4 py-3">
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" style={{ color: "#2563eb" }} />
                      </div>
                    </div>
                  </div>
                )}
                <div ref={chatEndRef} />
              </div>

              {/* Input */}
              <div className="p-3 border-t border-gray-100">
                <div className="flex items-center gap-2">
                  <input type="text" value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && sendChatMessage()}
                    placeholder="Posez votre question..."
                    className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-xs focus:border-blue-400 outline-none"
                    style={{ color: "#0f172a" }} />
                  <button onClick={sendChatMessage} disabled={!chatInput.trim() || chatLoading}
                    className="p-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-lg transition-colors">
                    <Send className="w-3.5 h-3.5" style={{ color: "#fff" }} />
                  </button>
                </div>
                <p className="text-[10px] text-center mt-2" style={{ color: "#94a3b8" }}>
                  Propulsé par GPT-4o-mini • 1 tâche par message
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
