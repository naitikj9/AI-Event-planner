# Vayu Events — AI Event Planner (Multi-Agent · LangGraph)

## Original Problem Statement
> "we need to make a frontend for this site first study this site"
>
> Iteration 2 ask (Hinglish): "bro mereko consumer ke liye fe banana hai, hamre liye bhi rakh sakta hai but dusre url par … ek event planning site ho usme ek feature 'plan your event with AI'. Form khule asking guest range like 0-50, 51-100 till 300+, location, kya karna hai. Phir woh input hmare pipeline mai jaye. Iska demo dena consumer ke end aur hmare end se approval/decline ka option."

A pre-existing CLI multi-agent LangGraph planner in `/app/src` (Intake → Vendor RAG → Planner → Compliance → HITL) needed a full web product around it: a consumer-facing event-planning site that submits into the pipeline, plus an internal admin/agent console where the team approves or declines plans.

## Architecture
- **Engine** — `/app/src/` LangGraph: 4 agents, 3 tools (RAG retrieval, budget calculator, availability check), conditional edges, deterministic guardrails, `interrupt()` for human approval. RAG retrieval was switched from OpenAI embeddings → deterministic keyword scoring (Emergent LLM proxy doesn't expose embedding models).
- **Backend** — `/app/backend/server.py` FastAPI wrapper + MongoDB persistence.
- **Frontend** — `/app/frontend` React 18 + Tailwind + React Router with two distinct surfaces:
  - **Consumer (`/`, `/plan`, `/plan/:id`, `/about`)** — "Vayu Events" warm ivory + emerald + gold theme, Cormorant Garamond serif headings.
  - **Admin (`/admin`)** — "Obsidian" dark command-center theme (the original technical view) with a pending-approval queue.
- **LLM** — `gpt-4o-mini` via Emergent Universal Key through `https://integrations.emergentagent.com/llm`.

## User Personas
- **Consumer** — wants a clean, premium event-planning experience: pick occasion, guest range, city/date, preferences → get a beautiful plan with vendors, timeline, budget; waits for a human coordinator to confirm.
- **Vayu coordinator (admin)** — sees pending plans in a queue, drills into the agent console (logs, pipeline, vendor card, budget delta) and approves/declines each one.

## Core Requirements (frozen)
- Consumer 4-step wizard: occasion → guest range bucket → city + date → preferences (budget, indoor/outdoor, notes). ✓
- Consumer "plan demo" page with status banner (awaiting / confirmed / declined). ✓
- Admin console with pending-approval queue + HITL approve/decline. ✓
- Consumer plan auto-polls and updates when admin acts. ✓
- Separate visual theme per surface; both still use the same backend + LangGraph. ✓

## What's Implemented (2026-01-26)
### Backend
- Endpoints (all `/api/*`): `POST /plans`, `POST /plans/{id}/decision`, `GET/DELETE /plans/{id}`, `GET /plans?pending_only=true`, `GET /vendors`, `GET /sample-prompts`, `GET /architecture`, `GET /health`.
- Wraps existing LangGraph engine; persists every step + run to MongoDB.
- Replaced embeddings-based RAG with keyword/BM25-ish retriever.
- `/app/src/llm.py` honors `OPENAI_BASE_URL` so the Emergent key plugs into `langchain-openai`.
### Frontend
- React Router with consumer + admin surfaces.
- Consumer pages: `Landing`, `Wizard`, `PlanView`, `About`.
- Admin: `AdminDashboard` (pending queue polling /api/plans every 5s + the original Hero/PromptForm/Pipeline/Terminal/Results/History/HitlModal).
- Tailwind theme extended with `ivory`, `emerald`, `gold`, `rose`, `slate` palettes and a `font-serif` Cormorant Garamond family.
- `data-testid` on every interactive element across both surfaces.

## Test Status
- Backend pytest: **16/16 pass** (incl. new `pending_only` filter).
- Frontend Playwright: 100% pass — landing CTAs, 4-step wizard, plan preview (awaiting → confirmed), admin pending queue → HITL approve/decline, refuse path, decline path.

## Prioritized Backlog
- **P1** — Persist LangGraph checkpointer to MongoDB (currently `MemorySaver`; HITL state is lost on backend restart).
- **P1** — Stream agent step logs via SSE so admin pipeline truly lights up node-by-node in real time.
- **P2** — Tighten admin behavior: `409` if `/decision` is called on a non-`awaiting_approval` plan.
- **P2** — Expand vendor catalog to more Indian cities (Chennai, Hyderabad, Kolkata, Pune).
- **P2** — Show an "over budget by ₹X" chip on consumer PlanView when total exceeds budget.
- **P2** — Email/WhatsApp notification to admin when a new consumer plan lands in the queue.
- **P3** — Authentication (Emergent Google Auth) so consumers own their plan history.
- **P3** — PDF export of an approved plan + per-vendor swap UI.

## Next Action Items
1. Decide whether to harden the in-memory checkpointer (persistent saver) before broader use.
2. Add the over-budget chip + admin notification when consumer plan submitted.
3. (Optional) SSE log streaming for true real-time pipeline animation.
