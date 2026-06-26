import React, { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Terminal as TermIcon, ArrowLeft, Inbox } from "lucide-react";
import Hero from "../components/Hero";
import PromptForm from "../components/PromptForm";
import Pipeline from "../components/Pipeline";
import Terminal from "../components/Terminal";
import Results from "../components/Results";
import HitlModal from "../components/HitlModal";
import History from "../components/History";
import Footer from "../components/Footer";
import { api } from "../lib/api";
import { cn, shortINR, STATUS_META } from "../lib/utils";

export default function AdminDashboard() {
  const [architecture, setArchitecture] = useState(null);
  const [state, setState] = useState(null);
  const [running, setRunning] = useState(false);
  const [decisionBusy, setDecisionBusy] = useState(false);
  const [hitlOpen, setHitlOpen] = useState(false);
  const [error, setError] = useState(null);
  const [historyKey, setHistoryKey] = useState(0);
  const [pending, setPending] = useState([]);
  const resultsRef = useRef(null);

  useEffect(() => {
    api.architecture().then(setArchitecture).catch(() => {});
  }, []);

  // poll pending queue every 5s so admin sees new consumer submissions
  useEffect(() => {
    const reload = () =>
      api
        .listPlans()
        .then((d) => setPending((d.plans || []).filter((p) => p.status === "awaiting_approval")))
        .catch(() => {});
    reload();
    const t = setInterval(reload, 5000);
    return () => clearInterval(t);
  }, [historyKey]);

  const scrollToResults = () => {
    setTimeout(() => {
      resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 150);
  };

  const handleSubmit = async (text) => {
    setError(null);
    setRunning(true);
    setState({
      requirements: null,
      stream_logs: [],
      log: [],
      status: "running",
      user_request: text,
    });
    scrollToResults();
    try {
      const res = await api.createPlan(text);
      setState(res);
      if (res.status === "awaiting_approval") setHitlOpen(true);
      setHistoryKey((k) => k + 1);
    } catch (e) {
      const msg = e?.response?.data?.detail || e.message || "Pipeline failed";
      setError(String(msg));
    } finally {
      setRunning(false);
    }
  };

  const handleDecide = async (decision) => {
    if (!state?.plan_id) return;
    setDecisionBusy(true);
    try {
      const res = await api.decide(state.plan_id, decision);
      setState(res);
      setHitlOpen(res.status === "awaiting_approval");
      setHistoryKey((k) => k + 1);
    } catch (e) {
      setError(e?.response?.data?.detail || e.message);
    } finally {
      setDecisionBusy(false);
    }
  };

  const handlePickPlan = async (planId) => {
    setError(null);
    try {
      const doc = await api.getPlan(planId);
      const s = doc.state || {};
      setState({ plan_id: doc.plan_id, ...s, stream_logs: doc.stream_logs || s.log || [] });
      setHitlOpen(s.status === "awaiting_approval");
      scrollToResults();
    } catch (e) {
      setError(e.message);
    }
  };

  const logsForUI =
    state?.stream_logs && state.stream_logs.length > 0
      ? state.stream_logs
      : (state?.log || []).map((line) => {
          const m = /^\[(.+?)\]\s+(.*)$/.exec(line || "");
          return m ? { node: m[1], message: m[2] } : { node: "info", message: line };
        });

  return (
    <div className="min-h-screen flex flex-col bg-bg-app text-ink-primary font-sans" data-testid="admin-root">
      <TopNav running={running} pendingCount={pending.length} />

      {/* Pending queue */}
      {pending.length > 0 && (
        <PendingQueue pending={pending} onPick={handlePickPlan} />
      )}

      <Hero />
      <PromptForm onSubmit={handleSubmit} loading={running} />

      <div ref={resultsRef}>
        <Pipeline
          state={state}
          logs={logsForUI}
          running={running}
          architecture={architecture}
        />
        <Terminal logs={logsForUI} running={running} status={state?.status} />
        {error && (
          <div className="max-w-7xl mx-auto px-6 lg:px-10 py-4">
            <div className="hairline border-accent-red/40 bg-accent-red/10 rounded-sm p-4 font-mono text-[12.5px] text-accent-red" data-testid="error-banner">
              ERROR · {error}
            </div>
          </div>
        )}
        {state?.requirements && <Results state={state} />}
      </div>

      <History refreshKey={historyKey} onPick={handlePickPlan} />
      <Footer />

      <HitlModal
        open={hitlOpen}
        state={state}
        onDecide={handleDecide}
        busy={decisionBusy}
      />
    </div>
  );
}

function TopNav({ running, pendingCount }) {
  return (
    <header className="sticky top-0 z-40 backdrop-blur bg-black/70 border-b hairline" data-testid="admin-nav">
      <div className="max-w-7xl mx-auto px-6 lg:px-10 h-12 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link to="/" className="inline-flex items-center gap-1.5 text-[11px] text-ink-muted hover:text-accent-orange font-mono uppercase tracking-widest mr-3" data-testid="back-to-consumer">
            <ArrowLeft size={12} /> consumer
          </Link>
          <div className="w-6 h-6 grid place-items-center hairline-strong rounded-sm bg-bg-surface">
            <span className="block w-2 h-2 rounded-full bg-accent-orange animate-pulse" />
          </div>
          <span className="font-black tracking-tight text-[15px]">
            OBSIDIAN
            <span className="text-ink-muted font-normal ml-2 hidden md:inline">
              / admin · agent console
            </span>
          </span>
        </div>
        <div className="flex items-center gap-3 font-mono text-[11px] uppercase tracking-widest text-ink-secondary">
          {pendingCount > 0 && (
            <span className="inline-flex items-center gap-1.5 text-accent-orange">
              <Inbox size={12} /> {pendingCount} pending
            </span>
          )}
          <span className="hidden md:inline text-ink-muted">·</span>
          <span className="hidden md:inline">
            {running ? (
              <span className="text-accent-cyan flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 bg-accent-cyan rounded-full animate-pulse" />
                graph running
              </span>
            ) : (
              <span className="text-ink-muted">graph idle</span>
            )}
          </span>
        </div>
      </div>
    </header>
  );
}

function PendingQueue({ pending, onPick }) {
  return (
    <section
      data-testid="pending-queue"
      className="border-b hairline bg-accent-orange/5"
    >
      <div className="max-w-7xl mx-auto px-6 lg:px-10 py-6">
        <div className="flex items-baseline justify-between mb-4">
          <div className="flex items-center gap-3">
            <Inbox className="text-accent-orange" size={18} />
            <div>
              <div className="font-mono text-[11px] tracking-[0.25em] uppercase text-accent-orange">
                › approval_queue
              </div>
              <div className="font-bold text-lg tracking-tight">
                {pending.length} consumer plan{pending.length === 1 ? "" : "s"} waiting for your review
              </div>
            </div>
          </div>
          <div className="text-[11px] font-mono text-ink-muted uppercase tracking-widest">
            polls every 5s
          </div>
        </div>
        <div className="hairline bg-bg-surface rounded-sm overflow-hidden">
          {pending.map((p, idx) => {
            const meta = STATUS_META[p.status] || { label: (p.status || "—").toUpperCase(), tone: "amber" };
            return (
              <button
                key={p.plan_id}
                type="button"
                data-testid={`pending-row-${idx}`}
                onClick={() => onPick(p.plan_id)}
                className="w-full grid grid-cols-12 gap-3 px-4 py-3 border-b hairline last:border-b-0 hover:bg-bg-surfaceHover transition-colors text-left items-center"
              >
                <div className="col-span-1 font-mono text-[11px] text-accent-orange">
                  #{String(idx + 1).padStart(2, "0")}
                </div>
                <div className="col-span-6 min-w-0">
                  <div className="text-[13px] text-ink-primary truncate">{p.request}</div>
                  <div className="font-mono text-[10px] text-ink-muted uppercase tracking-widest mt-0.5">
                    {p.event_type || "event"} · {p.city || "—"} · {p.guest_count || 0} guests
                  </div>
                </div>
                <div className="col-span-3 font-mono text-[12px] text-ink-secondary">
                  {shortINR(p.total_cost_inr)} / {shortINR(p.budget_inr)}
                </div>
                <div className="col-span-2 text-right">
                  <span className="px-3 py-1 hairline rounded-sm font-mono text-[10px] uppercase tracking-widest text-accent-orange border-accent-orange/40">
                    ● {meta.label}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
}
