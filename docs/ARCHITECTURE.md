# Architecture Deep Dive

This document explains *how* the system works and *why* it is designed this way —
the material you need to answer Q&A in the evaluation.

## 1. Mental model

The system is a **directed graph of nodes**. A single dictionary — the **state** —
enters at `START`, flows from node to node, and each node reads what it needs and
writes back a small update. Branches in the graph ("conditional edges") look at
the current state and decide where to go next. One node (`human_approval`) can
**pause the whole graph** until a person responds.

```
START → intake → [route] → research → [route] → planner → compliance → [route] → finalize → END
                    │                     │                                │
                    └→ refuse → END       └→ reject → END    human_approval ┘→ declined → END
```

## 2. The shared state (`src/state.py`)

```python
class PlannerState(TypedDict, total=False):
    user_request: str                      # input
    requirements: EventRequirements        # intake's output
    retrieved_context: list[str]           # what RAG saw
    shortlist: VendorShortlist             # venue agent's output
    plan: EventPlan                        # planner's output
    compliance: ComplianceResult           # compliance's output
    human_decision: str                    # "approve" / "decline"
    status: str                            # running|refused|rejected|declined|needs_approval|booked
    final_message: str                     # what the user sees
    log: Annotated[list[str], operator.add]  # appended by every node
```

Key design points:
- **One object, many writers.** Each agent adds its piece; later agents read
  earlier pieces. This is the rubric's *"information passed, stored, retrieved and
  reused cleanly across the system."*
- **`log` uses a reducer** (`operator.add`). When two updates both touch `log`,
  LangGraph *concatenates* the lists instead of overwriting — so we keep a full
  audit trail.
- **Pydantic models in state** are persisted across the human-approval pause by a
  checkpointer; we register them with a custom serializer (`_make_serializer` in
  `graph.py`) so serialization is clean.

## 3. Structured handoffs (`src/schemas.py`)

Every agent returns a **Pydantic model**, never free text. We get this for free via
`llm.with_structured_output(SomeModel)`: the LLM is forced to emit JSON matching the
schema, and LangChain re-prompts on a mismatch. The four contracts:

`EventRequirements → VendorShortlist → EventPlan → ComplianceResult`

This is why handoffs are reliable: the planner can trust that `shortlist.venue.id`
exists and is a string, because the schema guarantees it.

## 4. The agents

### 🧾 Intake (`agents/intake.py`)
1. Deterministic safety screen (`screen_request`) — blocks obvious unsafe requests
   *before* spending an LLM call.
2. LLM extraction into `EventRequirements`, including `in_scope` (is this even an
   event request?) and shorthand handling (`"8 lakh" → 800000`).

### 🔎 Venue & Vendor — the RAG agent (`agents/venue.py`)
This is the **retrieval-augmented** step, and it has 3 sub-stages:
1. **Retrieve:** build a natural-language query from the requirements and run a
   semantic search over the embedded catalog (`retrieve_vendors` tool).
2. **Select:** the LLM picks one vendor per category *from the retrieved candidates
   only* (it cannot invent vendors).
3. **Verify:** prices/names are overwritten from the catalog by id, and the chosen
   venue's date is checked with the `check_availability` tool. **The LLM never
   supplies a number** — it only chooses; the data supplies the facts.

### 📅 Planner (`agents/planner.py`)
- Budget is computed by the **`calculate_budget` tool** (per-plate × guests, plus
  flat/per-day costs) — deterministic and auditable.
- The LLM writes only the **timeline** and a summary, grounded in the chosen vendors.

### 🛡️ Compliance (`agents/compliance.py`)
Deliberately **rule-based, not LLM-based** — safety logic shouldn't depend on model
chance. It checks: venue present? capacity ≥ guests? venue available? over budget?
and emits a `decision`:
- `reject` — hard failure (no venue, over capacity, >25% over budget)
- `needs_human` — high-impact (slightly over budget, or total ≥ ₹2 lakh)
- `approve_auto` — within policy

## 5. Routing / branching (`src/graph.py`)

Four conditional edges turn the pipeline into a real decision system:

| Router | Decides |
|--------|---------|
| `route_after_intake` | refuse (unsafe/invalid) vs continue |
| `route_after_research` | reject (no venue) vs plan |
| `route_after_compliance` | finalize vs human approval vs reject |
| `route_after_human` | finalize vs declined |

## 6. Human-in-the-loop (`human_approval` node)

For high-impact actions (booking that spends real money) the graph calls
`interrupt(payload)`. This **suspends execution and returns control to the caller**
(`runner.py`), which shows the plan and asks the user. The answer is fed back with
`Command(resume="approve")`, the node re-runs, and `interrupt()` now returns that
answer. A **checkpointer** (`MemorySaver`) holds the paused state — without it,
resume would be impossible.

## 7. Tools (`src/tools/`)

| Tool | Type | Purpose |
|------|------|---------|
| `retrieve_vendors` | RAG / vector search | ground vendor choice in the real catalog |
| `calculate_budget` | deterministic compute | exact, auditable totals |
| `check_availability` | mock external API | is the venue free on the date? |

All three are real LangChain `@tool`s.

## 8. Observability (`src/logging_utils.py`)

Every node calls `log_step(node, message, data)`, which (a) prints a readable line
and (b) appends a JSON record to `runs/trace-<id>.jsonl`. You can open that file to
see exactly what each agent received and produced — the rubric's *"clear
logs/intermediate outputs."* Optional **LangSmith** tracing turns on by setting
`LANGCHAIN_TRACING_V2=true` and a key in `.env`.

## 9. Guardrails summary

- **Input safety screen** (keyword) and **LLM in-scope check** at intake.
- **Input validation** (guest/budget bounds) before any planning.
- **Capacity, availability, budget** policy checks in compliance.
- **Human approval** gate before the high-impact "book" action.
- **Price integrity:** numbers always come from data, never the LLM.

## 10. Known limitations (good to mention in the viva)

- Catalog is a small JSON file (16 vendors); a production system would use a real DB.
- `check_availability` is a mock; a real calendar API would replace it.
- Compliance thresholds are simple constants in `config.py`.
- The "booking" is simulated (no real emails/payments are sent).
