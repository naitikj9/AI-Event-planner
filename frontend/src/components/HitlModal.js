import React from "react";
import { AnimatePresence, motion } from "framer-motion";
import { CheckCircle2, XCircle, ShieldAlert, Loader2 } from "lucide-react";
import { inr } from "../lib/utils";

export default function HitlModal({ open, state, onDecide, busy }) {
  if (!open) return null;
  const interrupt = state?.interrupt;
  const plan = state?.plan || {};
  const req = state?.requirements || {};
  const compliance = state?.compliance || {};

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-black/80 backdrop-blur-2xl flex items-center justify-center p-4"
        data-testid="hitl-modal"
      >
        <motion.div
          initial={{ scale: 0.98, y: 10, opacity: 0 }}
          animate={{ scale: 1, y: 0, opacity: 1 }}
          exit={{ scale: 0.98, opacity: 0 }}
          transition={{ duration: 0.25 }}
          className="w-full max-w-2xl hairline-strong bg-bg-surface rounded-sm shadow-glowOrange"
        >
          <div className="flex items-center justify-between border-b hairline px-5 py-3">
            <div className="flex items-center gap-2 text-accent-orange font-mono text-[12px] uppercase tracking-widest">
              <ShieldAlert size={14} />
              human approval required
            </div>
            <div className="font-mono text-[11px] text-ink-muted">node: human_approval</div>
          </div>

          <div className="p-6">
            <h3 className="font-black text-2xl tracking-tight">
              Approve booking for {req.event_type} in {req.city}?
            </h3>
            <p className="mt-2 text-ink-secondary text-[14px] leading-relaxed">
              The compliance agent paused the pipeline before any booking is
              committed. Review the highlights and approve, or decline to halt
              the run.
            </p>

            <div className="grid grid-cols-3 gap-3 mt-5">
              <Metric label="total" value={inr(plan.total_cost_inr)} tone="orange" />
              <Metric label="budget" value={inr(req.budget_inr)} />
              <Metric
                label="delta"
                value={
                  (plan.total_cost_inr || 0) > (req.budget_inr || 0)
                    ? `+${inr((plan.total_cost_inr || 0) - (req.budget_inr || 0))}`
                    : `−${inr((req.budget_inr || 0) - (plan.total_cost_inr || 0))}`
                }
                tone={
                  (plan.total_cost_inr || 0) > (req.budget_inr || 0) ? "red" : "green"
                }
              />
            </div>

            {interrupt?.summary && (
              <pre className="mt-4 bg-black hairline rounded-sm px-4 py-3 font-mono text-[12px] text-ink-secondary whitespace-pre-wrap leading-relaxed">
                {interrupt.summary}
              </pre>
            )}

            {compliance.violations?.length > 0 && (
              <div className="mt-3">
                <div className="font-mono text-[10px] uppercase tracking-widest text-accent-orange mb-1">
                  reasons
                </div>
                <ul className="space-y-1 text-[12.5px] text-ink-secondary">
                  {compliance.violations.map((v, i) => (
                    <li key={i}>• {v}</li>
                  ))}
                </ul>
              </div>
            )}

            <div className="mt-6 grid grid-cols-2 gap-3">
              <button
                data-testid="hitl-decline-button"
                disabled={busy}
                onClick={() => onDecide("decline")}
                className="px-5 py-3 hairline-strong bg-bg-surface hover:border-accent-red hover:text-accent-red transition-all font-bold uppercase tracking-widest text-sm rounded-sm disabled:opacity-40 flex items-center justify-center gap-2"
              >
                <XCircle size={16} /> Decline
              </button>
              <button
                data-testid="hitl-approve-button"
                disabled={busy}
                onClick={() => onDecide("approve")}
                className="px-5 py-3 bg-accent-orange hover:bg-accent-orangeHover text-black font-bold uppercase tracking-widest text-sm rounded-sm transition-all disabled:opacity-40 flex items-center justify-center gap-2"
              >
                {busy ? (
                  <Loader2 className="animate-spin" size={16} />
                ) : (
                  <CheckCircle2 size={16} />
                )}
                Approve & Book
              </button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

function Metric({ label, value, tone }) {
  const color =
    tone === "orange"
      ? "text-accent-orange"
      : tone === "red"
      ? "text-accent-red"
      : tone === "green"
      ? "text-accent-green"
      : "text-ink-primary";
  return (
    <div className="hairline bg-black rounded-sm p-3">
      <div className="text-[10px] font-mono uppercase tracking-widest text-ink-muted">
        {label}
      </div>
      <div className={`font-mono font-bold text-lg ${color}`}>{value}</div>
    </div>
  );
}
