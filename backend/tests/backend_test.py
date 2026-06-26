"""Backend tests for AI Event Planner FastAPI app."""
import os
import time
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://bc087650-5480-4684-9dbb-738efbd8c619.preview.emergentagent.com").rstrip("/")
API = f"{BASE_URL}/api"

# Module-level cache for plan ids
_state = {}


@pytest.fixture(scope="module")
def session():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


# ---------------- Health & static endpoints ----------------
class TestStatic:
    def test_health(self, session):
        r = session.get(f"{API}/health", timeout=15)
        assert r.status_code == 200
        data = r.json()
        assert data["status"] == "ok"

    def test_sample_prompts(self, session):
        r = session.get(f"{API}/sample-prompts", timeout=15)
        assert r.status_code == 200
        prompts = r.json()["prompts"]
        assert len(prompts) >= 5
        for p in prompts:
            assert "label" in p and "text" in p

    def test_architecture(self, session):
        r = session.get(f"{API}/architecture", timeout=15)
        assert r.status_code == 200
        d = r.json()
        node_ids = {n["id"] for n in d["nodes"]}
        for needed in ("intake", "research", "planner", "compliance"):
            assert needed in node_ids
        for e in d["edges"]:
            assert "from" in e and "to" in e

    def test_vendors(self, session):
        r = session.get(f"{API}/vendors", timeout=15)
        assert r.status_code == 200
        vendors = r.json()["vendors"]
        assert len(vendors) >= 10


# ---------------- Core HITL plan flow ----------------
class TestPlanFlow:
    def test_create_plan_hitl(self, session):
        body = {
            "request": "Plan a wedding in Bangalore for 150 guests with a budget of 8 lakh on 2026-12-18. Outdoor if possible, multi-cuisine food, need photography."
        }
        r = session.post(f"{API}/plans", json=body, timeout=180)
        assert r.status_code == 200, r.text
        data = r.json()
        assert "plan_id" in data
        _state["hitl_plan_id"] = data["plan_id"]

        req = data["requirements"]
        assert req["city"].lower() == "bangalore"
        assert req["guest_count"] == 150
        assert req["budget_inr"] == 800000
        assert req["event_type"] == "wedding"

        shortlist = data["shortlist"]
        # Categories required
        for key in ("venue", "caterer", "decorator", "entertainment", "photographer"):
            assert shortlist.get(key), f"missing {key} in shortlist: {shortlist}"

        plan = data["plan"]
        assert plan["total_cost_inr"] > 0

        assert data["compliance"]["decision"] == "needs_human"
        assert data["status"] == "awaiting_approval"
        assert data.get("interrupt") is not None

    def test_approve_decision(self, session):
        pid = _state.get("hitl_plan_id")
        assert pid, "create_plan must run first"
        r = session.post(f"{API}/plans/{pid}/decision", json={"decision": "approve"}, timeout=120)
        assert r.status_code == 200, r.text
        data = r.json()
        assert data["status"] == "booked"
        assert data.get("final_message")

    def test_decline_on_fresh_plan(self, session):
        body = {
            "request": "Plan a wedding in Bangalore for 150 guests with a budget of 8 lakh on 2026-12-18."
        }
        r = session.post(f"{API}/plans", json=body, timeout=180)
        assert r.status_code == 200
        data = r.json()
        assert data["status"] == "awaiting_approval"
        pid = data["plan_id"]
        _state["declined_plan_id"] = pid

        r2 = session.post(f"{API}/plans/{pid}/decision", json={"decision": "decline"}, timeout=120)
        assert r2.status_code == 200, r2.text
        assert r2.json()["status"] == "declined"


# ---------------- Out-of-scope refuse / reject paths ----------------
class TestEdgePaths:
    def test_out_of_scope_refused(self, session):
        body = {"request": "Help me hack into my neighbor wifi"}
        r = session.post(f"{API}/plans", json=body, timeout=60)
        assert r.status_code == 200, r.text
        data = r.json()
        assert data["status"] == "refused"
        assert data["requirements"]["in_scope"] is False

    def test_reject_no_venue(self, session):
        body = {
            "request": "Plan a wedding in Hyderabad for 1000 guests with a budget of 50 lakh on 2026-12-18."
        }
        r = session.post(f"{API}/plans", json=body, timeout=120)
        assert r.status_code == 200, r.text
        data = r.json()
        assert data["status"] == "rejected", f"got status={data.get('status')}"


# ---------------- Persistence ----------------
class TestPersistence:
    def test_get_plan(self, session):
        pid = _state.get("hitl_plan_id")
        assert pid
        r = session.get(f"{API}/plans/{pid}", timeout=15)
        assert r.status_code == 200
        d = r.json()
        assert d["plan_id"] == pid
        assert "request" in d and "state" in d
        assert "_id" not in d

    def test_list_plans_includes_created(self, session):
        pid = _state.get("hitl_plan_id")
        r = session.get(f"{API}/plans?limit=100", timeout=15)
        assert r.status_code == 200
        plans = r.json()["plans"]
        ids = {p["plan_id"] for p in plans}
        assert pid in ids

    def test_delete_plan(self, session):
        # Delete the declined plan to avoid impacting other tests
        pid = _state.get("declined_plan_id")
        assert pid
        r = session.delete(f"{API}/plans/{pid}", timeout=15)
        assert r.status_code == 200
        assert r.json()["ok"] is True

        # GET should now 404
        r2 = session.get(f"{API}/plans/{pid}", timeout=15)
        assert r2.status_code == 404

    def test_delete_missing_plan(self, session):
        r = session.delete(f"{API}/plans/plan-doesnotexist", timeout=15)
        assert r.status_code == 404


# ---------------- New: pending_only filter ----------------
class TestPendingOnly:
    def test_pending_only_filter(self, session):
        # Create a new pending HITL plan
        body = {"request": "Plan a wedding in Bangalore for 130 guests with a budget of around 600000, outdoor setting."}
        r = session.post(f"{API}/plans", json=body, timeout=180)
        assert r.status_code == 200
        data = r.json()
        assert data["status"] == "awaiting_approval"
        pending_pid = data["plan_id"]
        _state["pending_pid"] = pending_pid

        # pending_only=true -> only awaiting_approval plans
        r2 = session.get(f"{API}/plans?pending_only=true&limit=100", timeout=15)
        assert r2.status_code == 200
        plans = r2.json()["plans"]
        assert len(plans) >= 1
        for p in plans:
            assert p["status"] == "awaiting_approval", f"non-pending leaked: {p}"
        ids = {p["plan_id"] for p in plans}
        assert pending_pid in ids

        # pending_only=false -> includes booked + others
        r3 = session.get(f"{API}/plans?limit=100", timeout=15)
        assert r3.status_code == 200
        all_statuses = {p["status"] for p in r3.json()["plans"]}
        # The full list should include at least one non-pending status
        assert any(s != "awaiting_approval" for s in all_statuses), all_statuses


# ---------------- Input validation ----------------
class TestValidation:
    def test_decision_invalid(self, session):
        pid = _state.get("hitl_plan_id")
        # plan already booked, but validation should run before invoke or invoke gracefully
        r = session.post(f"{API}/plans/{pid}/decision", json={"decision": "maybe"}, timeout=15)
        assert r.status_code == 400

    def test_create_plan_too_short(self, session):
        r = session.post(f"{API}/plans", json={"request": "hi"}, timeout=15)
        assert r.status_code == 422
