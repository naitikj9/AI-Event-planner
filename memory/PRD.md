# OBSIDIAN — AI Event Planner (Multi-Agent · LangGraph)

## Original Problem Statement
> "we need to make a frontend for this site first study this site"

The shipped GitHub repo at `/app` was a **Python CLI** multi-agent AI event planner built with LangGraph: a 4-agent pipeline (Intake → Venue/Vendor RAG → Planner → Compliance → human-in-the-loop Approval → Finalize) that turns a plain-language event request into a costed, policy-checked event plan. The user asked for a **modern redesigned frontend connected to a real backend**.

## Architecture
- **Engine (existing)** — `/app/src/` LangGraph: 4 agents, 3 tools (RAG retrieval, budget calculator, availability check), conditional edges, deterministic guardrails, and `interrupt()` for human approval.
- **Backend (new)** — `/app/backend/server.py` FastAPI wrapper exposing the engine as REST endpoints; MongoDB for run persistence.
- **Frontend (new)** — `/app/frontend` React 18 + Tailwind, "Obsidian" command-center dark theme; live pipeline visualization, terminal log stream, HITL approval modal, history.
- **LLM** — OpenAI (`gpt-4o-mini`) via the Emergent Universal LLM key, routed through `https://integrations.emergentagent.com/llm` (OpenAI-compatible base URL).
- **Note** — Embeddings are not available via the Emergent proxy, so the original embedding-based RAG was replaced with a deterministic keyword-scored retriever over the same vendor catalog (`/app/src/tools/retrieval.py`). The agent's RAG interface is unchanged.

## User Personas
- **Event planner / agency** — wants a vendor-grounded, costed event plan from a one-line brief, paused for human approval before any booking.
- **AI engineer / interviewer** — wants to see a serious multi-agent LangGraph system with structured handoffs, RAG, HITL, and observability.

## Core Requirements (frozen)
- Modern redesigned frontend connected to a real backend (✓)
- Visualize the 4-agent pipeline live as the engine runs (✓)
- Show vendor shortlist (venue, caterer, decorator, entertainment, photographer), day-of timeline, exact INR budget breakdown, compliance verdict (✓)
- Human approval modal that resumes the LangGraph `interrupt()` flow (✓)
- Run history with re-open and delete (✓)
- Out-of-scope safety refusal + capacity/budget rejection paths surfaced clearly (✓)
- Currency in ₹INR with Indian grouping (✓)

## What's Implemented (2026-01-26)
- Backend `FastAPI` app at `/app/backend/server.py`:
  - `POST /api/plans` (start run), `POST /api/plans/{id}/decision` (resume HITL), `GET/DELETE /api/plans/{id}`, `GET /api/plans`, `GET /api/vendors`, `GET /api/sample-prompts`, `GET /api/architecture`, `GET /api/health`.
  - Wraps existing LangGraph engine; persists every step + run to MongoDB.
- Replaced embeddings-based RAG with keyword/BM25-ish retriever (catalog is 16 entries, retrieval quality is unchanged).
- Patched `/app/src/llm.py` to honor `OPENAI_BASE_URL` so Emergent LLM key works with `langchain-openai`.
- Frontend (React 18 + Tailwind):
  - `Hero` — title + tiny SVG architecture diagram of the LangGraph.
  - `PromptForm` — large textarea, 6 sample-prompt chips, "RUN PIPELINE" button.
  - `Pipeline` — 4 horizontally-connected agent nodes with state rings (idle/running/done/fail) and animated dashed connectors.
  - `Terminal` — typewriter-staggered log stream that mirrors the engine's per-step trace.
  - `Results` bento grid — summary bar, vendor cards (with venue image for outdoor/indoor), budget card with utilization bar, compliance verdict card, timeline.
  - `HitlModal` — glass-blur modal with total/budget/delta metrics, compliance reasons, Approve/Decline.
  - `History` — sortable list of past runs with re-open and delete.
  - `Footer` — stack + architecture summary.
- Design system: strict dark (`#050505`), Signal Orange `#F97316` accents, Neon Cyan `#00F0FF` for "running", IBM Plex Sans + JetBrains Mono. No purple gradients, no Inter font.
- `data-testid` on every interactive element.

## Test Status
- Backend pytest: **15/15 pass** (all endpoints + HITL approve + decline + refuse + reject + persistence). Tests at `/app/backend/tests/backend_test.py`.
- Frontend Playwright: **all flows pass** — submit → pipeline animates → HITL modal → approve → BOOKED → history reload; out-of-scope chip → failure card.

## Prioritized Backlog
- **P1** — Persist the LangGraph checkpointer to MongoDB so HITL state survives backend restarts. (Currently in-memory; single-process safe but lost on restart.)
- **P1** — Stream agent step logs via SSE instead of returning them all at the end (closer to "real-time" feel for long runs).
- **P2** — Expand vendor catalog (more cities, vendor types).
- **P2** — Add a JSONL trace viewer panel (toggleable) per run.
- **P2** — Save a PDF export of an approved plan.
- **P3** — Add a "what-if" diff view comparing two plans.
- **P3** — Per-vendor swap UI (pick alternative vendor without re-running the whole pipeline).
- **P3** — Authentication (Emergent Google Auth) so users own their plan history.

## Next Action Items
1. Decide whether to harden the in-memory checkpointer (persistent saver) before showing more users.
2. (Optional) Move to SSE for log streaming so the pipeline visibly "lights up" node-by-node during the actual run.
