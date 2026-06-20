# Individual Contribution Document (one per student)

> Every student submits this individually with the GitHub repo link (per the brief).
> Fill in your own. The rubric gives **15%** to how clearly *you* can explain your
> part and how it connects to the whole system.

---

**Name:**
**Roll no / ID:**
**GitHub repo link:**

## 1. My area of ownership
*(Which part of the system did you build/own? e.g. "the Venue & Vendor RAG agent
and the retrieval tool", or "the LangGraph wiring + human-in-the-loop", or
"evaluation + guardrails".)*

## 2. Files I primarily worked on
*(List the files. Examples below — keep only yours.)*
- `src/agents/venue.py`
- `src/tools/retrieval.py`
- `data/knowledge_base/vendors.json`

## 3. What it does and how it connects
*(2–4 sentences: what your component receives, what it produces, and which agent/
node consumes it next.)*

## 4. A design decision I made
*(Pick one real decision and justify it. Examples:
 - "I used an in-memory vector store instead of FAISS so it runs with zero extra
   setup on any laptop."
 - "I made the compliance checks deterministic instead of LLM-based so safety
   decisions don't depend on model chance."
 - "I overwrite vendor prices from the catalog after the LLM picks, to prevent
   hallucinated numbers.")*

## 5. A bug or challenge I solved
*(e.g. "the Windows console couldn't print ₹ — fixed by forcing UTF-8 output", or
"the human-approval pause lost state until I added a checkpointer".)*

## 6. What I would improve with more time
*(e.g. replace the mock availability API with a real calendar; add Delhi vendors;
add per-city tax rules.)*

---

### Suggested ownership split for a 4–5 person team
*(A fair, defensible division. Adjust to reality.)*

| Member | Owns | Key files |
|--------|------|-----------|
| 1 | Intake agent + guardrails | `agents/intake.py`, `guardrails.py`, `schemas.py` |
| 2 | Venue/Vendor **RAG** agent + retrieval tool + catalog | `agents/venue.py`, `tools/retrieval.py`, `data/knowledge_base/vendors.json` |
| 3 | Planner agent + budget & availability tools | `agents/planner.py`, `tools/budget.py`, `tools/availability.py` |
| 4 | LangGraph wiring + **human-in-the-loop** + state | `graph.py`, `state.py`, `runner.py` |
| 5 | Compliance agent + **evaluation** + observability | `agents/compliance.py`, `tests/test_cases.py`, `logging_utils.py` |

> In a 4-person team, merge roles 4 and 5, or split evaluation across everyone.
