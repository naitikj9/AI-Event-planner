import React, { useEffect, useState } from "react";
import { ArrowRight, Sparkles, Loader2 } from "lucide-react";
import { api } from "../lib/api";

export default function PromptForm({ onSubmit, loading }) {
  const [text, setText] = useState("");
  const [prompts, setPrompts] = useState([]);

  useEffect(() => {
    api.samplePrompts().then((d) => setPrompts(d.prompts || [])).catch(() => {});
  }, []);

  const submit = (e) => {
    e?.preventDefault();
    if (!text.trim() || loading) return;
    onSubmit(text.trim());
  };

  return (
    <section className="border-b hairline" data-testid="prompt-form-section">
      <div className="max-w-7xl mx-auto px-6 lg:px-10 py-10">
        <div className="flex items-baseline justify-between mb-4">
          <div>
            <p className="text-[11px] font-mono uppercase tracking-[0.25em] text-accent-cyan">
              &gt; INPUT_PROMPT
            </p>
            <h2 className="font-black text-2xl md:text-3xl tracking-tight mt-1">
              Describe the event in one line.
            </h2>
          </div>
          <div className="hidden md:block text-[11px] font-mono uppercase tracking-widest text-ink-muted">
            free text · the intake agent parses everything
          </div>
        </div>

        <form onSubmit={submit} className="grid grid-cols-1 lg:grid-cols-12 gap-3 items-start">
          <div className="lg:col-span-9">
            <div className="relative hairline-strong rounded-sm bg-black focus-within:border-accent-orange transition-colors">
              <textarea
                data-testid="prompt-textarea"
                value={text}
                onChange={(e) => setText(e.target.value)}
                rows={4}
                placeholder="Plan a wedding in Bangalore for 150 guests with a budget of ₹8 lakh on 2026-12-18, outdoor, multi-cuisine food, need photography…"
                className="w-full bg-transparent px-4 py-3 font-mono text-[14px] text-ink-primary placeholder:text-ink-muted outline-none resize-none"
              />
              <div className="flex items-center justify-between px-4 py-2 border-t hairline text-[11px] font-mono text-ink-muted">
                <span>SHIFT+ENTER for newline · {text.length}/2000</span>
                <span className="hidden md:inline">currency ₹INR · cities: Bangalore · Mumbai · Delhi</span>
              </div>
            </div>
          </div>

          <div className="lg:col-span-3">
            <button
              type="submit"
              disabled={loading || !text.trim()}
              data-testid="submit-plan-button"
              className="w-full h-full min-h-[120px] flex flex-col items-center justify-center gap-2 px-6 py-4 bg-accent-orange text-black font-bold uppercase tracking-widest text-sm rounded-sm hover:bg-accent-orangeHover transition-all disabled:opacity-40 disabled:cursor-not-allowed group"
            >
              {loading ? (
                <>
                  <Loader2 className="animate-spin" size={28} />
                  <span>orchestrating…</span>
                </>
              ) : (
                <>
                  <Sparkles size={28} />
                  <span>run pipeline</span>
                  <span className="text-[11px] font-mono opacity-70 flex items-center gap-1">
                    invoke 4-agent graph <ArrowRight size={12} />
                  </span>
                </>
              )}
            </button>
          </div>
        </form>

        <div className="mt-5 flex flex-wrap items-center gap-2">
          <span className="text-[10px] uppercase tracking-widest text-ink-muted font-mono mr-2">
            sample prompts ›
          </span>
          {prompts.map((p, i) => (
            <button
              type="button"
              key={i}
              data-testid={`prompt-chip-${i}`}
              onClick={() => setText(p.text)}
              disabled={loading}
              className="px-3 py-1.5 hairline bg-bg-surface text-[12px] text-ink-secondary font-mono hover:text-accent-orange hover:border-accent-orange transition-colors rounded-sm disabled:opacity-50"
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}
