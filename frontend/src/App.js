import React, { useEffect, useRef, useState } from "react";
import Hero from "./components/Hero";
import PromptForm from "./components/PromptForm";
import Pipeline from "./components/Pipeline";
import Terminal from "./components/Terminal";
import Results from "./components/Results";
import HitlModal from "./components/HitlModal";
import History from "./components/History";
import Footer from "./components/Footer";
import { api } from "./lib/api";

export default function App() {
  const [architecture, setArchitecture] = useState(null);
  const [state, setState] = useState(null);
  const [running, setRunning] = useState(false);
  const [decisionBusy, setDecisionBusy] = useState(false);
  const [hitlOpen, setHitlOpen] = useState(false);
  const [error, setError] = useState(null);
  const [historyKey, setHistoryKey] = useState(0);
  const resultsRef = useRef(null);

  useEffect(() => {
    api.architecture().then(setArchitecture).catch(() => {});
  }, []);

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
      // hydrate the stream_logs alongside
      setState({ plan_id: doc.plan_id, ...s, stream_logs: doc.stream_logs || s.log || [] });
      setHitlOpen(s.status === "awaiting_approval");
      scrollToResults();
    } catch (e) {
      setError(e.message);
    }
  };

  const logsForUI =
    (state?.stream_logs && state.stream_logs.length > 0
      ? state.stream_logs
      : (state?.log || []).map((line) => {
          // line: "[node] message"
          const m = /^\[(.+?)\]\s+(.*)$/.exec(line || "");
          return m ? { node: m[1], message: m[2] } : { node: "info", message: line };
        }));

  return (
    <div className="min-h-screen flex flex-col" data-testid="app-root">
      <TopNav running={running} />
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

function TopNav({ running }) {
  return (
    <header className="sticky top-0 z-40 backdrop-blur bg-black/70 border-b hairline" data-testid="top-nav">
      <div className="max-w-7xl mx-auto px-6 lg:px-10 h-12 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-6 h-6 grid place-items-center hairline-strong rounded-sm bg-bg-surface">
            <span className="block w-2 h-2 rounded-full bg-accent-orange animate-pulse" />
          </div>
          <span className="font-black tracking-tight text-[15px]">
            OBSIDIAN
            <span className="text-ink-muted font-normal ml-2 hidden md:inline">
              / event-planner-orchestrator
            </span>
          </span>
        </div>
        <div className="flex items-center gap-3 font-mono text-[11px] uppercase tracking-widest text-ink-secondary">
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
          <span className="hidden md:inline text-ink-muted">·</span>
          <span>v1.0</span>
        </div>
      </div>
    </header>
  );
}
