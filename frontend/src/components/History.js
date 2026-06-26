import React, { useEffect, useState } from "react";
import { History as HistoryIcon, Trash2, ExternalLink } from "lucide-react";
import { api } from "../lib/api";
import { cn, shortINR, STATUS_META } from "../lib/utils";

export default function History({ refreshKey, onPick }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);

  const reload = async () => {
    setLoading(true);
    try {
      const d = await api.listPlans();
      setItems(d.plans || []);
    } catch (e) {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    reload();
  }, [refreshKey]);

  const remove = async (e, id) => {
    e.stopPropagation();
    await api.deletePlan(id);
    reload();
  };

  return (
    <section className="border-b hairline" data-testid="history-section">
      <div className="max-w-7xl mx-auto px-6 lg:px-10 py-10">
        <div className="flex items-baseline justify-between mb-4">
          <div>
            <p className="text-[11px] font-mono uppercase tracking-[0.25em] text-accent-cyan">
              &gt; RUN_HISTORY
            </p>
            <h3 className="font-bold text-lg tracking-tight mt-0.5 flex items-center gap-2">
              <HistoryIcon size={16} className="text-accent-orange" />
              Past pipeline runs
            </h3>
          </div>
          <button
            type="button"
            data-testid="history-refresh"
            onClick={reload}
            className="text-[11px] font-mono uppercase tracking-widest text-ink-muted hover:text-accent-orange"
          >
            {loading ? "loading…" : "refresh ›"}
          </button>
        </div>

        {items.length === 0 ? (
          <div className="hairline bg-bg-surface/40 rounded-sm p-6 text-center text-ink-muted font-mono text-[12px] uppercase tracking-widest">
            no runs yet — submit a prompt to populate
          </div>
        ) : (
          <div className="hairline bg-bg-surface rounded-sm overflow-hidden">
            <div className="grid grid-cols-12 gap-3 px-4 py-2 border-b hairline bg-black text-[10px] font-mono uppercase tracking-widest text-ink-muted">
              <div className="col-span-1">#</div>
              <div className="col-span-5">request</div>
              <div className="col-span-2">status</div>
              <div className="col-span-2">cost / budget</div>
              <div className="col-span-2 text-right">actions</div>
            </div>
            {items.map((it, idx) => {
              const meta = STATUS_META[it.status] || { label: (it.status || "—").toUpperCase(), tone: "secondary" };
              const tone = {
                green: "text-accent-green",
                amber: "text-accent-orange",
                red: "text-accent-red",
                cyan: "text-accent-cyan",
                secondary: "text-ink-secondary",
              }[meta.tone];
              return (
                <div
                  key={it.plan_id}
                  role="button"
                  tabIndex={0}
                  data-testid={`history-row-${idx}`}
                  onClick={() => onPick(it.plan_id)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      onPick(it.plan_id);
                    }
                  }}
                  className="w-full grid grid-cols-12 gap-3 px-4 py-3 border-b hairline last:border-b-0 hover:bg-bg-surfaceHover transition-colors text-left items-center cursor-pointer focus:outline-none focus:bg-bg-surfaceHover"
                >
                  <div className="col-span-1 font-mono text-[11px] text-ink-muted">
                    {String(idx + 1).padStart(2, "0")}
                  </div>
                  <div className="col-span-5 min-w-0">
                    <div className="text-[13px] text-ink-primary truncate">{it.request}</div>
                    <div className="font-mono text-[10px] text-ink-muted uppercase tracking-widest mt-0.5">
                      {it.event_type || "event"} · {it.city || "—"} · {it.guest_count || 0} guests
                    </div>
                  </div>
                  <div className="col-span-2">
                    <span className={cn("font-mono text-[10px] uppercase tracking-widest", tone)}>
                      ● {meta.label}
                    </span>
                  </div>
                  <div className="col-span-2 font-mono text-[12px] text-ink-secondary">
                    {shortINR(it.total_cost_inr)} / {shortINR(it.budget_inr)}
                  </div>
                  <div className="col-span-2 flex justify-end gap-2">
                    <span className="text-[11px] font-mono text-accent-cyan inline-flex items-center gap-1">
                      open <ExternalLink size={11} />
                    </span>
                    <button
                      type="button"
                      data-testid={`history-delete-${idx}`}
                      onClick={(e) => remove(e, it.plan_id)}
                      className="text-ink-muted hover:text-accent-red"
                      aria-label="delete"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
