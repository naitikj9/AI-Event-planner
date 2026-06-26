import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Heart,
  Briefcase,
  Cake,
  Gem,
  Sparkles,
  Users,
  MapPin,
  Calendar,
  ArrowLeft,
  ArrowRight,
  Loader2,
  Check,
} from "lucide-react";
import ConsumerNav from "../components/ConsumerNav";
import ConsumerFooter from "../components/ConsumerFooter";
import { api } from "../lib/api";
import { cn, inr } from "../lib/utils";

const EVENT_OPTIONS = [
  { id: "wedding", label: "Wedding", icon: Heart, sub: "ceremony · reception · multi-day" },
  { id: "corporate", label: "Corporate", icon: Briefcase, sub: "conference · offsite · launch" },
  { id: "birthday", label: "Birthday", icon: Cake, sub: "intimate · rooftop · themed" },
  { id: "anniversary", label: "Anniversary", icon: Gem, sub: "milestone · family · couples" },
  { id: "conference", label: "Conference", icon: Briefcase, sub: "seminar · panel · workshop" },
  { id: "party", label: "Party", icon: Sparkles, sub: "cocktail · celebration · social" },
];

const GUEST_BUCKETS = [
  { id: "0-50", label: "Up to 50", value: 40 },
  { id: "51-100", label: "51 – 100", value: 80 },
  { id: "101-150", label: "101 – 150", value: 130 },
  { id: "151-200", label: "151 – 200", value: 180 },
  { id: "201-300", label: "201 – 300", value: 250 },
  { id: "300+", label: "300+", value: 350 },
];

const CITIES = ["Bangalore", "Mumbai", "Delhi"];

const BUDGET_BUCKETS = [
  { id: "1L", label: "Under ₹1 lakh", value: 80000 },
  { id: "3L", label: "₹1 – 3 lakh", value: 200000 },
  { id: "8L", label: "₹3 – 8 lakh", value: 600000 },
  { id: "15L", label: "₹8 – 15 lakh", value: 1100000 },
  { id: "15L+", label: "₹15 lakh+", value: 1800000 },
];

const SETTING_OPTIONS = [
  { id: "any", label: "Either works" },
  { id: "indoor", label: "Indoor" },
  { id: "outdoor", label: "Outdoor" },
];

const TOTAL_STEPS = 4;

export default function Wizard() {
  const nav = useNavigate();
  const [step, setStep] = useState(1);
  const [data, setData] = useState({
    event_type: "",
    guests: null, // bucket object
    city: "",
    date: "",
    budget: null, // bucket object
    setting: "any",
    notes: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const canProceed = useMemo(() => {
    if (step === 1) return !!data.event_type;
    if (step === 2) return !!data.guests;
    if (step === 3) return !!data.city.trim();
    if (step === 4) return true;
    return false;
  }, [step, data]);

  const update = (patch) => setData((d) => ({ ...d, ...patch }));

  const buildPrompt = () => {
    const parts = [];
    parts.push(
      `Plan a ${data.event_type} in ${data.city} for ${data.guests.value} guests`
    );
    if (data.budget) parts.push(`with a budget of around ${inr(data.budget.value)}`);
    if (data.date) parts.push(`on ${data.date}`);
    if (data.setting && data.setting !== "any") parts.push(`${data.setting} setting`);
    if (data.notes.trim()) parts.push(data.notes.trim());
    return parts.join(", ") + ".";
  };

  const submit = async () => {
    setSubmitting(true);
    setError(null);
    try {
      const res = await api.createPlan(buildPrompt());
      nav(`/plan/${res.plan_id}`, { state: { initial: res } });
    } catch (e) {
      setError(e?.response?.data?.detail || e.message);
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-ivory-50 text-slate-ink flex flex-col" data-testid="wizard-root">
      <ConsumerNav />

      <div className="flex-1">
        <div className="max-w-4xl mx-auto px-6 lg:px-10 py-12 md:py-16">
          <ProgressBar step={step} total={TOTAL_STEPS} />

          <div className="mt-10 min-h-[420px]">
            <AnimatePresence mode="wait">
              <motion.div
                key={step}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.25 }}
              >
                {step === 1 && (
                  <StepEvent
                    selected={data.event_type}
                    onPick={(id) => update({ event_type: id })}
                  />
                )}
                {step === 2 && (
                  <StepGuests
                    selected={data.guests?.id}
                    onPick={(b) => update({ guests: b })}
                  />
                )}
                {step === 3 && (
                  <StepWhereWhen
                    city={data.city}
                    date={data.date}
                    onCity={(city) => update({ city })}
                    onDate={(date) => update({ date })}
                  />
                )}
                {step === 4 && (
                  <StepPrefs
                    budget={data.budget?.id}
                    setting={data.setting}
                    notes={data.notes}
                    onBudget={(b) => update({ budget: b })}
                    onSetting={(s) => update({ setting: s })}
                    onNotes={(n) => update({ notes: n })}
                  />
                )}
              </motion.div>
            </AnimatePresence>
          </div>

          {error && (
            <div
              data-testid="wizard-error"
              className="mt-6 border border-rose-600/30 bg-rose-600/5 text-rose-600 px-4 py-3 rounded-sm text-[13px]"
            >
              {error}
            </div>
          )}

          <div className="mt-10 flex items-center justify-between border-t border-ivory-200 pt-6">
            <button
              type="button"
              data-testid="wizard-back"
              disabled={step === 1 || submitting}
              onClick={() => setStep((s) => Math.max(1, s - 1))}
              className="inline-flex items-center gap-1.5 text-[13px] text-slate-mid hover:text-emerald-800 disabled:opacity-30"
            >
              <ArrowLeft size={14} /> Back
            </button>

            {step < TOTAL_STEPS ? (
              <button
                type="button"
                data-testid="wizard-next"
                disabled={!canProceed || submitting}
                onClick={() => setStep((s) => Math.min(TOTAL_STEPS, s + 1))}
                className="inline-flex items-center gap-2 px-6 py-3 bg-emerald-800 text-ivory-50 hover:bg-emerald-900 rounded-full text-[13.5px] font-medium disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                Continue <ArrowRight size={14} />
              </button>
            ) : (
              <button
                type="button"
                data-testid="wizard-submit"
                disabled={!canProceed || submitting}
                onClick={submit}
                className="inline-flex items-center gap-2 px-7 py-3 bg-emerald-800 text-ivory-50 hover:bg-emerald-900 rounded-full text-[13.5px] font-medium disabled:opacity-50 transition-colors"
              >
                {submitting ? (
                  <>
                    <Loader2 size={14} className="animate-spin" /> Planning your event…
                  </>
                ) : (
                  <>
                    <Sparkles size={14} /> Plan my event
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>

      <ConsumerFooter />
    </div>
  );
}

function ProgressBar({ step, total }) {
  const titles = ["Occasion", "Guests", "Where & when", "Preferences"];
  return (
    <div data-testid="wizard-progress">
      <div className="flex items-center justify-between text-[11px] font-mono tracking-[0.2em] uppercase text-gold-600 mb-3">
        <span>step {String(step).padStart(2, "0")} / {String(total).padStart(2, "0")}</span>
        <span className="text-slate-soft">{titles[step - 1]}</span>
      </div>
      <div className="h-px bg-ivory-200 relative">
        <motion.div
          className="absolute inset-y-0 left-0 bg-emerald-800"
          initial={false}
          animate={{ width: `${(step / total) * 100}%` }}
          transition={{ duration: 0.35 }}
        />
      </div>
    </div>
  );
}

function StepEvent({ selected, onPick }) {
  return (
    <div>
      <h2 className="font-serif text-4xl md:text-5xl tracking-tight leading-tight">
        What are we <span className="italic text-emerald-800">celebrating?</span>
      </h2>
      <p className="mt-3 text-slate-mid text-[14px]">Pick the occasion — we&apos;ll tailor everything around it.</p>
      <div className="mt-8 grid grid-cols-2 md:grid-cols-3 gap-3">
        {EVENT_OPTIONS.map((o) => {
          const Icon = o.icon;
          const active = selected === o.id;
          return (
            <button
              key={o.id}
              type="button"
              data-testid={`event-${o.id}`}
              onClick={() => onPick(o.id)}
              className={cn(
                "text-left p-5 border rounded-sm transition-all group",
                active
                  ? "border-emerald-800 bg-emerald-50 shadow-sm"
                  : "border-ivory-200 bg-ivory-50 hover:border-emerald-800/40"
              )}
            >
              <div
                className={cn(
                  "inline-flex items-center justify-center w-9 h-9 rounded-full border",
                  active
                    ? "bg-emerald-800 border-emerald-800 text-ivory-50"
                    : "bg-ivory-100 border-ivory-200 text-emerald-800"
                )}
              >
                <Icon size={16} />
              </div>
              <div className="mt-3 font-serif text-xl tracking-tight">{o.label}</div>
              <div className="text-[12px] text-slate-mid mt-0.5">{o.sub}</div>
              {active && (
                <div className="mt-2 inline-flex items-center gap-1 text-[11px] text-emerald-800 font-medium">
                  <Check size={12} /> selected
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function StepGuests({ selected, onPick }) {
  return (
    <div>
      <h2 className="font-serif text-4xl md:text-5xl tracking-tight leading-tight">
        How many <span className="italic text-emerald-800">guests?</span>
      </h2>
      <p className="mt-3 text-slate-mid text-[14px] flex items-center gap-2">
        <Users size={14} /> Pick the closest range — we use this to match venue capacity.
      </p>
      <div className="mt-8 grid grid-cols-2 md:grid-cols-3 gap-3">
        {GUEST_BUCKETS.map((b) => {
          const active = selected === b.id;
          return (
            <button
              key={b.id}
              type="button"
              data-testid={`guests-${b.id}`}
              onClick={() => onPick(b)}
              className={cn(
                "px-5 py-6 text-center border rounded-sm transition-all",
                active
                  ? "border-emerald-800 bg-emerald-50"
                  : "border-ivory-200 bg-ivory-50 hover:border-emerald-800/40"
              )}
            >
              <div className="font-serif text-3xl tracking-tight text-slate-ink">
                {b.label}
              </div>
              <div className="text-[11px] tracking-wider uppercase font-mono text-gold-600 mt-1">
                guests
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function StepWhereWhen({ city, date, onCity, onDate }) {
  return (
    <div>
      <h2 className="font-serif text-4xl md:text-5xl tracking-tight leading-tight">
        Where &amp; <span className="italic text-emerald-800">when?</span>
      </h2>
      <p className="mt-3 text-slate-mid text-[14px]">We currently plan in Bangalore, Mumbai and Delhi.</p>

      <div className="mt-8">
        <div className="font-mono text-[11px] tracking-widest uppercase text-gold-600 mb-3 flex items-center gap-2">
          <MapPin size={12} /> city
        </div>
        <div className="grid grid-cols-3 gap-3">
          {CITIES.map((c) => {
            const active = city === c;
            return (
              <button
                key={c}
                type="button"
                data-testid={`city-${c.toLowerCase()}`}
                onClick={() => onCity(c)}
                className={cn(
                  "px-5 py-5 text-center border rounded-sm transition-all",
                  active
                    ? "border-emerald-800 bg-emerald-50"
                    : "border-ivory-200 bg-ivory-50 hover:border-emerald-800/40"
                )}
              >
                <div className="font-serif text-2xl tracking-tight">{c}</div>
              </button>
            );
          })}
        </div>
        <input
          data-testid="city-other"
          type="text"
          value={CITIES.includes(city) ? "" : city}
          onChange={(e) => onCity(e.target.value)}
          placeholder="Or type another city…"
          className="mt-3 w-full bg-ivory-50 border border-ivory-200 focus:border-emerald-800 outline-none px-4 py-3 rounded-sm text-[14px]"
        />
      </div>

      <div className="mt-8">
        <div className="font-mono text-[11px] tracking-widest uppercase text-gold-600 mb-3 flex items-center gap-2">
          <Calendar size={12} /> date <span className="text-slate-soft normal-case tracking-normal font-sans">(optional)</span>
        </div>
        <input
          data-testid="event-date"
          type="date"
          value={date}
          onChange={(e) => onDate(e.target.value)}
          className="w-full max-w-xs bg-ivory-50 border border-ivory-200 focus:border-emerald-800 outline-none px-4 py-3 rounded-sm text-[14px]"
        />
      </div>
    </div>
  );
}

function StepPrefs({ budget, setting, notes, onBudget, onSetting, onNotes }) {
  return (
    <div>
      <h2 className="font-serif text-4xl md:text-5xl tracking-tight leading-tight">
        A few <span className="italic text-emerald-800">preferences.</span>
      </h2>
      <p className="mt-3 text-slate-mid text-[14px]">All optional — skip what you don&apos;t care about.</p>

      <div className="mt-8">
        <div className="font-mono text-[11px] tracking-widest uppercase text-gold-600 mb-3">budget</div>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {BUDGET_BUCKETS.map((b) => {
            const active = budget === b.id;
            return (
              <button
                key={b.id}
                type="button"
                data-testid={`budget-${b.id}`}
                onClick={() => onBudget(b)}
                className={cn(
                  "px-3 py-4 text-center border rounded-sm transition-all",
                  active
                    ? "border-emerald-800 bg-emerald-50"
                    : "border-ivory-200 bg-ivory-50 hover:border-emerald-800/40"
                )}
              >
                <div className="font-serif text-lg tracking-tight leading-tight">{b.label}</div>
              </button>
            );
          })}
        </div>
      </div>

      <div className="mt-8">
        <div className="font-mono text-[11px] tracking-widest uppercase text-gold-600 mb-3">indoor or outdoor</div>
        <div className="grid grid-cols-3 gap-3">
          {SETTING_OPTIONS.map((s) => {
            const active = setting === s.id;
            return (
              <button
                key={s.id}
                type="button"
                data-testid={`setting-${s.id}`}
                onClick={() => onSetting(s.id)}
                className={cn(
                  "px-5 py-3.5 border rounded-sm transition-all text-[14px]",
                  active
                    ? "border-emerald-800 bg-emerald-50 text-emerald-800"
                    : "border-ivory-200 bg-ivory-50 hover:border-emerald-800/40"
                )}
              >
                {s.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="mt-8">
        <div className="font-mono text-[11px] tracking-widest uppercase text-gold-600 mb-3">
          anything else? <span className="text-slate-soft normal-case tracking-normal font-sans">(cuisine, photography, theme…)</span>
        </div>
        <textarea
          data-testid="prefs-notes"
          value={notes}
          onChange={(e) => onNotes(e.target.value)}
          rows={3}
          placeholder="e.g. multi-cuisine food, need photography, prefer pure veg…"
          className="w-full bg-ivory-50 border border-ivory-200 focus:border-emerald-800 outline-none px-4 py-3 rounded-sm text-[14px] resize-none"
        />
      </div>
    </div>
  );
}
