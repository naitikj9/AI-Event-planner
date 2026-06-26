import React from "react";
import { motion } from "framer-motion";
import { Terminal as TermIcon, GitBranch, Cpu } from "lucide-react";

export default function Hero() {
  return (
    <section className="relative overflow-hidden border-b hairline">
      <div className="absolute inset-0 bg-grid opacity-60 pointer-events-none" />
      <div className="absolute inset-0 bg-scanline opacity-40 pointer-events-none" />

      <div className="relative max-w-7xl mx-auto px-6 lg:px-10 pt-10 pb-12 lg:pt-14 lg:pb-16">
        <div className="flex items-center gap-3 text-[11px] uppercase tracking-[0.25em] text-ink-secondary mb-8">
          <span className="inline-flex items-center gap-2 px-2 py-1 hairline-strong rounded-sm">
            <span className="w-1.5 h-1.5 rounded-full bg-accent-cyan animate-pulse" />
            <span>SYSTEM ONLINE</span>
          </span>
          <span className="text-ink-muted">/</span>
          <span>v1.0 · LANGGRAPH ORCHESTRATION</span>
          <span className="hidden md:inline text-ink-muted">/</span>
          <span className="hidden md:inline">4 AGENTS · 3 TOOLS · 1 HUMAN GATE</span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
          <div className="lg:col-span-7">
            <motion.h1
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="font-sans font-black tracking-tight text-4xl md:text-5xl lg:text-[64px] leading-[1.02]"
              data-testid="hero-title"
            >
              Plain English in.
              <br />
              <span className="text-accent-orange">Costed event plan</span> out.
              <br />
              <span className="text-ink-secondary font-bold">A human approves.</span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="mt-6 max-w-2xl text-[15px] text-ink-secondary leading-relaxed"
            >
              <span className="text-accent-cyan font-mono">OBSIDIAN</span> is a
              multi-agent AI system that turns a sentence like{" "}
              <span className="text-ink-primary">
                &ldquo;150-guest wedding in Bangalore for ₹8 lakh on Dec 18, outdoor&rdquo;
              </span>{" "}
              into a vendor-grounded plan with an auditable budget — every step
              policy-checked, every booking paused for your approval.
            </motion.p>

            <div className="mt-8 flex flex-wrap items-center gap-3 text-xs font-mono text-ink-secondary">
              <Stat icon={<Cpu size={13} />} label="agents" value="4" />
              <Stat icon={<GitBranch size={13} />} label="conditional edges" value="4" />
              <Stat icon={<TermIcon size={13} />} label="tools" value="3 (RAG · budget · availability)" />
            </div>
          </div>

          <div className="lg:col-span-5">
            <ArchitectureDiagram />
          </div>
        </div>
      </div>
    </section>
  );
}

function Stat({ icon, label, value }) {
  return (
    <span className="inline-flex items-center gap-2 px-3 py-1.5 hairline rounded-sm bg-bg-surface/60">
      <span className="text-accent-orange">{icon}</span>
      <span className="text-ink-muted uppercase tracking-wider">{label}</span>
      <span className="text-ink-primary">{value}</span>
    </span>
  );
}

function ArchitectureDiagram() {
  // small SVG mermaid-ish overview
  const nodes = [
    { id: "intake", x: 30, y: 35, label: "intake" },
    { id: "vendor", x: 30, y: 105, label: "vendor · rag" },
    { id: "planner", x: 30, y: 175, label: "planner" },
    { id: "compliance", x: 30, y: 245, label: "compliance" },
    { id: "hitl", x: 200, y: 245, label: "human gate", accent: true },
    { id: "book", x: 200, y: 315, label: "✓ booked", success: true },
    { id: "refuse", x: 30, y: 315, label: "refuse / reject", danger: true },
  ];
  return (
    <div
      className="relative w-full hairline bg-bg-surface/50 rounded-sm overflow-hidden"
      style={{ height: 380 }}
      data-testid="hero-architecture"
    >
      <div className="absolute inset-0 bg-grid opacity-40" />
      <svg viewBox="0 0 360 380" className="absolute inset-0 w-full h-full">
        <defs>
          <marker id="arr" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
            <path d="M 0 0 L 10 5 L 0 10 z" fill="#52525B" />
          </marker>
          <marker id="arrOrange" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
            <path d="M 0 0 L 10 5 L 0 10 z" fill="#F97316" />
          </marker>
        </defs>
        {/* vertical chain */}
        <line x1="90" y1="55" x2="90" y2="90" stroke="#52525B" strokeWidth="1.2" markerEnd="url(#arr)" />
        <line x1="90" y1="125" x2="90" y2="160" stroke="#52525B" strokeWidth="1.2" markerEnd="url(#arr)" />
        <line x1="90" y1="195" x2="90" y2="230" stroke="#52525B" strokeWidth="1.2" markerEnd="url(#arr)" />
        {/* compliance -> hitl */}
        <line x1="155" y1="260" x2="200" y2="260" stroke="#F97316" strokeWidth="1.2" markerEnd="url(#arrOrange)" />
        {/* hitl -> book */}
        <line x1="260" y1="275" x2="260" y2="305" stroke="#22C55E" strokeWidth="1.2" markerEnd="url(#arr)" />
        {/* compliance -> refuse */}
        <line x1="90" y1="275" x2="90" y2="305" stroke="#EF4444" strokeOpacity="0.7" strokeWidth="1.2" markerEnd="url(#arr)" strokeDasharray="3 3" />
        {nodes.map((n) => (
          <g key={n.id}>
            <rect
              x={n.x}
              y={n.y}
              width={n.id === "hitl" || n.id === "book" ? 120 : 120}
              height="40"
              fill="#0A0A0A"
              stroke={n.accent ? "#F97316" : n.success ? "#22C55E" : n.danger ? "#EF4444" : "rgba(255,255,255,0.18)"}
              strokeWidth="1"
            />
            <text
              x={n.x + 60}
              y={n.y + 24}
              textAnchor="middle"
              fontFamily="JetBrains Mono"
              fontSize="11"
              fill={n.accent ? "#F97316" : n.success ? "#22C55E" : n.danger ? "#EF4444" : "#FAFAFA"}
              letterSpacing="1"
              style={{ textTransform: "uppercase" }}
            >
              {n.label}
            </text>
          </g>
        ))}
      </svg>
    </div>
  );
}
