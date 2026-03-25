"use client";

import { createClient } from "@/lib/supabase/client";
import { useEffect, useState, useCallback } from "react";
import {
  CalendarDays, Plus, ChevronLeft, ChevronRight, Sparkles,
  DollarSign, Package, Wand2, Download, Tag, PartyPopper,
  Clock, CheckCircle2, X, Loader2
} from "lucide-react";

interface CalendarEvent {
  id: string;
  title: string;
  description: string;
  event_type: string;
  scheduled_at: string;
  completed_at: string | null;
  status: string;
  product_ids: string[];
  action_params: Record<string, unknown>;
}

interface Suggestion {
  title: string;
  event_type: string;
  scheduled_at: string;
  reasoning: string;
  products_affected: string;
}

const EVENT_TYPES = [
  { value: "price_change", label: "Modifier les prix", icon: DollarSign, color: "#eab308" },
  { value: "ai_optimization", label: "Optimisation IA", icon: Wand2, color: "#8b5cf6" },
  { value: "restock", label: "Alerte stock", icon: Package, color: "#3b82f6" },
  { value: "promotion", label: "Promotion", icon: PartyPopper, color: "#ec4899" },
  { value: "import", label: "Import produits", icon: Download, color: "#06b6d4" },
  { value: "custom", label: "Personnalisé", icon: Tag, color: "#6b7280" },
];

const STATUS_BADGES: Record<string, { label: string; className: string }> = {
  pending: { label: "En attente", className: "bg-yellow-50 text-yellow-700" },
  in_progress: { label: "En cours", className: "bg-blue-50 text-blue-700" },
  completed: { label: "Terminé", className: "bg-green-50 text-green-700" },
  cancelled: { label: "Annulé", className: "bg-gray-100 text-gray-500" },
};

const MONTHS_FR = ["Janvier", "Février", "Mars", "Avril", "Mai", "Juin", "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"];
const DAYS_FR = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];

export default function CalendrierPage() {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [modalStep, setModalStep] = useState(1);
  const [filter, setFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [suggestLoading, setSuggestLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Form state
  const [formType, setFormType] = useState("");
  const [formTitle, setFormTitle] = useState("");
  const [formDesc, setFormDesc] = useState("");
  const [formDate, setFormDate] = useState("");
  const [formTime, setFormTime] = useState("09:00");
  const [formRepeat, setFormRepeat] = useState("never");

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  useEffect(() => { document.title = "Calendrier | EcomPilot"; }, []);

  const fetchEvents = useCallback(async () => {
    setLoading(true);
    const from = new Date(year, month, 1).toISOString();
    const to = new Date(year, month + 1, 0, 23, 59, 59).toISOString();
    const params = new URLSearchParams({ from, to });
    if (filter !== "all") params.set("type", filter);

    try {
      const res = await fetch(`/api/calendar?${params}`);
      const data = await res.json();
      setEvents(data.events || []);
    } catch { /* silent */ }
    setLoading(false);
  }, [year, month, filter]);

  useEffect(() => { fetchEvents(); }, [fetchEvents]);

  const handleSuggest = async () => {
    setSuggestLoading(true);
    try {
      const res = await fetch("/api/calendar/suggest", { method: "POST" });
      const data = await res.json();
      setSuggestions(data.suggestions || []);
    } catch { /* silent */ }
    setSuggestLoading(false);
  };

  const addSuggestionToCalendar = async (s: Suggestion) => {
    await fetch("/api/calendar", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: s.title,
        event_type: s.event_type,
        scheduled_at: s.scheduled_at,
        description: s.reasoning,
      }),
    });
    setSuggestions(prev => prev.filter(x => x !== s));
    fetchEvents();
  };

  const openCreateModal = (day?: Date) => {
    setFormType("");
    setFormTitle("");
    setFormDesc("");
    setFormDate(day ? day.toISOString().split("T")[0] : "");
    setFormTime("09:00");
    setFormRepeat("never");
    setModalStep(1);
    setShowModal(true);
  };

  const handleCreateEvent = async () => {
    if (!formType || !formTitle || !formDate) {
      alert("Remplissez le type, le titre et la date.");
      return;
    }
    setSaving(true);
    const scheduled_at = new Date(`${formDate}T${formTime}:00`).toISOString();
    try {
      const res = await fetch("/api/calendar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: formTitle,
          description: formDesc,
          event_type: formType,
          scheduled_at,
          product_ids: [],
          action_params: {},
          repeat: formRepeat,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `Erreur ${res.status}`);
      setShowModal(false);
      fetchEvents();
    } catch (e) {

      alert(`Échec : ${(e as Error).message}`);
    }
    setSaving(false);
  };

  const handleDeleteEvent = async (id: string) => {
    await fetch("/api/calendar", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    fetchEvents();
  };

  const handleCompleteEvent = async (id: string) => {
    await fetch("/api/calendar", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, status: "completed", completed_at: new Date().toISOString() }),
    });
    fetchEvents();
  };

  // Calendar grid
  const firstDayOfMonth = new Date(year, month, 1);
  const lastDayOfMonth = new Date(year, month + 1, 0);
  const startDay = (firstDayOfMonth.getDay() + 6) % 7; // Monday = 0
  const totalDays = lastDayOfMonth.getDate();
  const today = new Date();

  const calendarDays: (number | null)[] = [];
  for (let i = 0; i < startDay; i++) calendarDays.push(null);
  for (let d = 1; d <= totalDays; d++) calendarDays.push(d);

  const getEventsForDay = (day: number) => {
    return events.filter(e => {
      const d = new Date(e.scheduled_at);
      return d.getDate() === day && d.getMonth() === month && d.getFullYear() === year;
    });
  };

  const getTypeConfig = (type: string) => EVENT_TYPES.find(t => t.value === type) || EVENT_TYPES[5];

  const upcoming = events
    .filter(e => new Date(e.scheduled_at) >= today && e.status !== "completed")
    .sort((a, b) => new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime())
    .slice(0, 7);

  const selectedDayEvents = selectedDay
    ? events.filter(e => {
        const d = new Date(e.scheduled_at);
        return d.getDate() === selectedDay.getDate() && d.getMonth() === selectedDay.getMonth() && d.getFullYear() === selectedDay.getFullYear();
      })
    : [];

  return (
    <div className="max-w-[1400px] mx-auto px-4 sm:px-6 py-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <CalendarDays className="w-6 h-6 text-blue-600" /> Calendrier
          </h1>
          <p className="text-sm text-gray-500 mt-1">Planifiez et automatisez vos actions e-commerce</p>
        </div>
        <div className="flex gap-2">
          <button onClick={handleSuggest} disabled={suggestLoading}
            className="flex items-center gap-2 px-4 py-2 bg-purple-50 text-purple-700 rounded-lg text-sm font-medium hover:bg-purple-100 disabled:opacity-50 border border-purple-200">
            <Sparkles className={`w-4 h-4 ${suggestLoading ? "animate-spin" : ""}`} />
            {suggestLoading ? "Analyse..." : "Suggestions IA"}
          </button>
          <button onClick={() => openCreateModal()}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700">
            <Plus className="w-4 h-4" /> Planifier une action
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* LEFT SIDEBAR */}
        <div className="space-y-4">
          {/* Quick filters */}
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <h3 className="text-xs font-semibold text-gray-500 uppercase mb-3">Filtres</h3>
            <div className="space-y-1">
              <button onClick={() => setFilter("all")}
                className={`w-full text-left px-3 py-2 rounded-lg text-sm ${filter === "all" ? "bg-blue-50 text-blue-700 font-medium" : "text-gray-600 hover:bg-gray-50"}`}>
                Tous
              </button>
              {EVENT_TYPES.map(t => (
                <button key={t.value} onClick={() => setFilter(t.value)}
                  className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm ${filter === t.value ? "bg-blue-50 text-blue-700 font-medium" : "text-gray-600 hover:bg-gray-50"}`}>
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: t.color }} />
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* Upcoming */}
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <h3 className="text-xs font-semibold text-gray-500 uppercase mb-3">
              <Clock className="w-3 h-3 inline mr-1" /> À venir (7 jours)
            </h3>
            {upcoming.length === 0 ? (
              <p className="text-xs text-gray-400 text-center py-4">Aucun événement à venir</p>
            ) : (
              <div className="space-y-2">
                {upcoming.map(e => {
                  const tc = getTypeConfig(e.event_type);
                  return (
                    <div key={e.id} className="flex items-start gap-2 p-2 rounded-lg hover:bg-gray-50">
                      <div className="w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0" style={{ backgroundColor: tc.color }} />
                      <div className="min-w-0">
                        <p className="text-xs font-medium text-gray-800 truncate">{e.title}</p>
                        <p className="text-[10px] text-gray-400">
                          {new Date(e.scheduled_at).toLocaleDateString("fr-FR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* MAIN CALENDAR */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            {/* Month navigation */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
              <button onClick={() => setCurrentDate(new Date(year, month - 1))}
                className="p-1.5 hover:bg-gray-100 rounded-lg"><ChevronLeft className="w-4 h-4" /></button>
              <h2 className="text-sm font-semibold text-gray-800">
                {MONTHS_FR[month]} {year}
              </h2>
              <button onClick={() => setCurrentDate(new Date(year, month + 1))}
                className="p-1.5 hover:bg-gray-100 rounded-lg"><ChevronRight className="w-4 h-4" /></button>
            </div>

            {/* Day headers */}
            <div className="grid grid-cols-7 border-b border-gray-100">
              {DAYS_FR.map(d => (
                <div key={d} className="text-center text-[10px] font-medium text-gray-400 py-2">{d}</div>
              ))}
            </div>

            {/* Calendar grid */}
            {loading ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
              </div>
            ) : (
              <div className="grid grid-cols-7">
                {calendarDays.map((day, i) => {
                  if (day === null) return <div key={`empty-${i}`} className="h-24 border-b border-r border-gray-50" />;
                  const dayEvents = getEventsForDay(day);
                  const isToday = day === today.getDate() && month === today.getMonth() && year === today.getFullYear();
                  const isSelected = selectedDay && day === selectedDay.getDate() && month === selectedDay.getMonth() && year === selectedDay.getFullYear();
                  return (
                    <div key={day}
                      onClick={() => setSelectedDay(new Date(year, month, day))}
                      className={`h-24 border-b border-r border-gray-50 p-1.5 cursor-pointer transition-colors hover:bg-blue-50/50 ${isSelected ? "bg-blue-50" : ""}`}>
                      <div className={`text-xs font-medium mb-1 w-6 h-6 flex items-center justify-center rounded-full ${isToday ? "bg-blue-600 text-white" : "text-gray-600"}`}>
                        {day}
                      </div>
                      <div className="space-y-0.5">
                        {dayEvents.slice(0, 3).map(e => {
                          const tc = getTypeConfig(e.event_type);
                          return (
                            <div key={e.id} className="flex items-center gap-1">
                              <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: tc.color }} />
                              <span className="text-[9px] text-gray-600 truncate">{e.title}</span>
                            </div>
                          );
                        })}
                        {dayEvents.length > 3 && (
                          <span className="text-[9px] text-gray-400">+{dayEvents.length - 3} de plus</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Selected day detail */}
          {selectedDay && (
            <div className="mt-4 bg-white rounded-xl border border-gray-200 p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-gray-800">
                  {selectedDay.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" })}
                </h3>
                <button onClick={() => openCreateModal(selectedDay)}
                  className="text-xs text-blue-600 hover:underline font-medium flex items-center gap-1">
                  <Plus className="w-3 h-3" /> Ajouter
                </button>
              </div>
              {selectedDayEvents.length === 0 ? (
                <p className="text-xs text-gray-400 text-center py-4">Aucun événement ce jour</p>
              ) : (
                <div className="space-y-2">
                  {selectedDayEvents.map(e => {
                    const tc = getTypeConfig(e.event_type);
                    const IconComp = tc.icon;
                    const badge = STATUS_BADGES[e.status] || STATUS_BADGES.pending;
                    return (
                      <div key={e.id} className="flex items-start gap-3 p-3 rounded-lg border border-gray-100 hover:bg-gray-50">
                        <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: tc.color + "15" }}>
                          <IconComp className="w-4 h-4" style={{ color: tc.color }} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-gray-800">{e.title}</span>
                            <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${badge.className}`}>{badge.label}</span>
                          </div>
                          {e.description && <p className="text-xs text-gray-500 mt-0.5">{e.description}</p>}
                          <p className="text-[10px] text-gray-400 mt-1">
                            {new Date(e.scheduled_at).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
                          </p>
                        </div>
                        <div className="flex gap-1">
                          {e.status !== "completed" && (
                            <button onClick={() => handleCompleteEvent(e.id)} className="p-1 hover:bg-green-50 rounded">
                              <CheckCircle2 className="w-4 h-4 text-green-500" />
                            </button>
                          )}
                          <button onClick={() => handleDeleteEvent(e.id)} className="p-1 hover:bg-red-50 rounded">
                            <X className="w-4 h-4 text-red-400" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        {/* RIGHT PANEL — AI Suggestions */}
        <div>
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <h3 className="text-xs font-semibold text-gray-500 uppercase mb-3 flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-purple-500" /> Suggestions IA
            </h3>
            {suggestions.length === 0 ? (
              <div className="text-center py-6">
                <Sparkles className="w-8 h-8 text-purple-200 mx-auto mb-2" />
                <p className="text-xs text-gray-400 mb-3">Cliquez sur &quot;Suggestions IA&quot; pour des recommandations basées sur votre catalogue</p>
                <p className="text-[10px] text-gray-300">Coût : 2 tâches</p>
              </div>
            ) : (
              <div className="space-y-3">
                {suggestions.map((s, i) => {
                  const tc = getTypeConfig(s.event_type);
                  return (
                    <div key={i} className="p-3 rounded-lg border border-purple-100 bg-purple-50/30">
                      <div className="flex items-start gap-2 mb-2">
                        <div className="w-1.5 h-1.5 rounded-full mt-1.5" style={{ backgroundColor: tc.color }} />
                        <div>
                          <p className="text-xs font-medium text-gray-800">{s.title}</p>
                          <p className="text-[10px] text-gray-500 mt-0.5">{s.reasoning}</p>
                          <p className="text-[10px] text-purple-500 mt-1">
                            {new Date(s.scheduled_at).toLocaleDateString("fr-FR", { day: "numeric", month: "short" })}
                          </p>
                        </div>
                      </div>
                      <button onClick={() => addSuggestionToCalendar(s)}
                        className="w-full text-[10px] font-medium text-purple-700 bg-purple-100 hover:bg-purple-200 rounded py-1.5 transition-colors">
                        Ajouter au calendrier
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* CREATE EVENT MODAL */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 relative">
            <button onClick={() => setShowModal(false)} className="absolute top-4 right-4 p-1 hover:bg-gray-100 rounded">
              <X className="w-4 h-4 text-gray-400" />
            </button>

            <h2 className="text-lg font-bold text-gray-900 mb-1">Planifier une action</h2>
            <p className="text-xs text-gray-500 mb-4">Étape {modalStep}/2</p>

            {modalStep === 1 && (
              <div className="space-y-2">
                <p className="text-sm font-medium text-gray-700 mb-2">Que voulez-vous faire ?</p>
                {EVENT_TYPES.map(t => {
                  const IconComp = t.icon;
                  return (
                    <button key={t.value}
                      onClick={() => { setFormType(t.value); setFormTitle(t.label); setModalStep(2); }}
                      className={`w-full flex items-center gap-3 p-3 rounded-lg border transition-colors text-left ${formType === t.value ? "border-blue-400 bg-blue-50" : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"}`}>
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: t.color + "20" }}>
                        <IconComp className="w-4 h-4" style={{ color: t.color }} />
                      </div>
                      <span className="text-sm font-medium text-gray-700">{t.label}</span>
                    </button>
                  );
                })}
              </div>
            )}

            {modalStep === 2 && (
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Titre</label>
                  <input value={formTitle} onChange={e => setFormTitle(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-200 focus:border-blue-400 outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Description (optionnel)</label>
                  <textarea value={formDesc} onChange={e => setFormDesc(e.target.value)} rows={2}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-200 focus:border-blue-400 outline-none resize-none" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Date</label>
                    <input type="date" value={formDate} onChange={e => setFormDate(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-200 focus:border-blue-400 outline-none" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Heure</label>
                    <input type="time" value={formTime} onChange={e => setFormTime(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-200 focus:border-blue-400 outline-none" />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Répéter</label>
                  <select value={formRepeat} onChange={e => setFormRepeat(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-200 focus:border-blue-400 outline-none">
                    <option value="never">Jamais</option>
                    <option value="weekly">Chaque semaine</option>
                    <option value="monthly">Chaque mois</option>
                  </select>
                </div>
                <div className="flex gap-2 pt-2">
                  <button onClick={() => setModalStep(1)} className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm hover:bg-gray-50">
                    Retour
                  </button>
                  <button onClick={handleCreateEvent} disabled={saving || !formTitle || !formDate}
                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2">
                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                    {saving ? "Création..." : "Créer"}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
