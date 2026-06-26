import React, { useEffect, useRef, useState } from "react";
import { Terminal as TermIcon } from "lucide-react";
import { cn, NODE_LABEL } from "../lib/utils";

/** Streaming-feel terminal that staggers in the run's log entries. */
export default function Terminal({ logs, running, status }) {
  const [shown, setShown] = useState(0);
  const ref = useRef(null);

  useEffect(() => {
    setShown(0);
  }, [logs?.length, status]);

  useEffect(() => {
    if (!logs || logs.length === 0) return;
    if (shown >= logs.length) return;
    const t = setTimeout(() => setShown((s) => s + 1), 380);
    return () => clearTimeout(t);
  }, [shown, logs]);

  useEffect(() => {
    ref.current?.scrollTo({ top: ref.current.scrollHeight, behavior: "smooth" });
  }, [shown]);

  const visible = (logs || []).slice(0, shown);
  const isStreaming = (running || shown < (logs?.length || 0));

  return (
    <section className="border-b hairline" data-testid="terminal-section">
      <div className="max-w-7xl mx-auto px-6 lg:px-10 py-8">
        <div className="flex items-baseline justify-between mb-3">
          <div className="flex items-center gap-2">
            <TermIcon size={14} className="text-accent-cyan" />
            <p className="text-[11px] font-mono uppercase tracking-[0.25em] text-accent-cyan">
              &gt; LOG_STREAM
            </p>
          </div>
          <span className="text-[11px] font-mono text-ink-muted uppercase tracking-widest">
            {logs?.length || 0} step{(logs?.length || 0) === 1 ? "" : "s"}
          </span>
        </div>

        <div className="bg-black hairline rounded-sm">
          <div className="flex items-center justify-between px-4 py-2 border-b hairline text-[11px] font-mono text-ink-muted">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-accent-red/70" />
              <span className="w-2.5 h-2.5 rounded-full bg-accent-amber/70" />
              <span className="w-2.5 h-2.5 rounded-full bg-accent-green/70" />
              <span className="ml-3">obsidian@planner: ~/runs</span>
            </div>
            <span>{status?.toUpperCase() || "READY"}</span>
          </div>
          <div
            ref={ref}
            data-testid="terminal-logs"
            className="font-mono text-[12.5px] leading-[1.65] px-4 py-3 max-h-[280px] min-h-[160px] overflow-y-auto no-scrollbar"
          >
            {visible.length === 0 && (
              <div className="text-ink-muted">
                $ awaiting input… <span className="caret" />
              </div>
            )}
            {visible.map((l, i) => (
              <LogLine key={i} line={l} />
            ))}
            {isStreaming && visible.length > 0 && (
              <div className="text-accent-cyan flex items-center gap-1.5">
                <span>$</span>
                <span className="caret">streaming</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

function LogLine({ line }) {
  const node = NODE_LABEL[line.node] || line.node.toUpperCase();
  const color = cn(
    line.node === "refusal" || line.node === "reject" || line.node === "declined"
      ? "text-accent-red"
      : line.node === "finalize"
      ? "text-accent-green"
      : line.node === "human_approval"
      ? "text-accent-orange"
      : "text-accent-cyan"
  );
  return (
    <div className="grid grid-cols-[16px_120px_1fr] gap-2 items-baseline">
      <span className="text-ink-muted">›</span>
      <span className={color}>[{node}]</span>
      <span className="text-ink-primary/90">{line.message}</span>
    </div>
  );
}
