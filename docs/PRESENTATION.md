# Presentation Script (10 min + 5 min Q&A)

Mapped to the brief's required structure. Times are cues, not scripts to read
verbatim. Every team member should be able to explain the whole flow *and* their
own part.

---

## 0:00–1:00 — Problem, target user, why it matters
- **Product:** an AI Event Planner. You describe an event in one sentence; a team
  of AI agents produces a costed, policy-checked plan and asks you to approve
  before booking.
- **Target user:** event organisers / families / company admins who don't know
  vendor prices, capacities, or how to budget an event.
- **Why it matters:** event planning is error-prone and expensive; a wrong-capacity
  venue or a blown budget is a real, costly mistake.

## 1:00–2:00 — Why this needs a multi-agent system
- It's a **pipeline of different skills**, not one question: understand → research
  → cost & schedule → check policy → get human sign-off.
- A single LLM prompt **hallucinates prices, ignores capacity, and has no safe
  approval step.** We give each step to a specialized agent with a typed handoff,
  so the system is reliable, inspectable, and safe.

## 2:00–4:00 — Architecture (use the diagram in README)
- **State:** one shared object flows through the graph; each agent adds its piece.
- **4 agents:** Intake → Venue/Vendor (RAG) → Planner → Compliance.
- **Tools:** RAG retriever, budget calculator, availability check.
- **Routing:** 4 conditional edges (refuse / reject / approve / escalate).
- **Structured handoffs:** Pydantic schemas between agents.
- Point at `src/graph.py` to show nodes + edges, and `src/schemas.py` for handoffs.

## 4:00–7:00 — Live demo
Run these in order:

1. **Happy path with approval** (shows full pipeline + HITL):
   ```
   python -m src.app "Plan a wedding in Bangalore for 150 guests, budget 8 lakh, on 2026-12-18, outdoor, need photography"
   ```
   Narrate the step logs: intake parse → RAG retrieves 8 vendors → venue selected →
   budget computed → compliance says *needs human* → **type `approve`** → booked plan.

2. **Decline path** — run the same, type `decline` → "nothing was booked." (HITL both ways.)

3. **Guardrail refusal**:
   ```
   python -m src.app "plan a party for a weapons smuggling celebration"
   ```
   → politely refused by the safety guardrail.

4. **Open a trace** in `runs/trace-*.jsonl` to show observability.

## 7:00–8:30 — Evaluation, guardrails, debugging, limitations
- Run the suite:
  ```
  python -m tests.test_cases
  ```
  → **8/8 scenarios pass**, covering booked / declined / auto-approved / refused
  (×2 guardrails) / rejected (×2). Show the results table.
- **Guardrails:** safety screen, input validation, capacity/budget policy, human
  approval, price-integrity (numbers from data, not the LLM).
- **Debugging/observability:** per-step console logs + JSONL traces (+ optional
  LangSmith).
- **Limitations:** small JSON catalog, mock availability API, simulated booking.

## 8:30–10:00 — Individual contributions
Each member: 60–90 seconds on *their* part, the design decision they made, and how
it connects to the whole. Use `docs/INDIVIDUAL_CONTRIBUTION_TEMPLATE.md`.

---

## Likely Q&A — be ready

**Q: Why LangGraph and not just function calls?**
State management + conditional routing + the ability to *pause* for human approval
(checkpointing) come built in; LangGraph makes the flow explicit and inspectable.

**Q: Where exactly is RAG, and why is it justified?**
`src/tools/retrieval.py` — we embed the vendor catalog and semantically search it.
Justified because vendor choice must be **grounded in real, current options**, not
invented. Without it the agent would hallucinate venues/prices.

**Q: How do you stop the LLM hallucinating prices?**
The LLM only *chooses* an id; prices/capacities are looked up from the catalog
(`get_vendor_by_id`) and the budget is computed by a deterministic tool.

**Q: What makes an action "high-impact" / triggers human approval?**
Compliance rules in `agents/compliance.py`: total ≥ ₹2 lakh, or over budget. These
escalate to the `human_approval` interrupt before any booking.

**Q: What happens on a bad/unsafe request?**
Two layers: a keyword safety screen and the LLM's `in_scope` flag → `refuse`; plus
input validation (guest/budget bounds) → also `refuse`. Demonstrated in tests.

**Q: How is state shared and not lost across the pause?**
A checkpointer (`MemorySaver`) persists the state while interrupted; resume uses
`Command(resume=...)`.
