"""LeadEmpire CRM backend regression tests."""
import os, time, uuid, pytest, requests

BASE = os.environ.get("REACT_APP_BACKEND_URL", "https://leadempire-crm.preview.emergentagent.com").rstrip("/")
API = f"{BASE}/api"

DEMO_EMAIL = "demo@example.com"
DEMO_PASS = "Demo@1234"


@pytest.fixture(scope="session")
def demo_token():
    r = requests.post(f"{API}/auth/login", json={"email": DEMO_EMAIL, "password": DEMO_PASS})
    if r.status_code != 200:
        # Try signup
        r = requests.post(f"{API}/auth/signup", json={
            "company_name": "Demo Realty", "full_name": "Demo Owner",
            "email": DEMO_EMAIL, "password": DEMO_PASS,
        })
        assert r.status_code == 200, r.text
        token = r.json()["token"]
        requests.post(f"{API}/demo/seed", headers={"Authorization": f"Bearer {token}"})
        return token
    return r.json()["token"]


@pytest.fixture(scope="session")
def headers(demo_token):
    return {"Authorization": f"Bearer {demo_token}"}


# ---- Auth ----
def test_auth_me(headers):
    r = requests.get(f"{API}/auth/me", headers=headers)
    assert r.status_code == 200
    j = r.json()
    assert j["user"]["email"] == DEMO_EMAIL
    assert "workspace" in j and j["workspace"]["name"]


def test_login_invalid():
    r = requests.post(f"{API}/auth/login", json={"email": DEMO_EMAIL, "password": "wrong"})
    assert r.status_code == 401


def test_signup_duplicate():
    r = requests.post(f"{API}/auth/signup", json={
        "company_name": "X", "full_name": "X", "email": DEMO_EMAIL, "password": "abc12345"})
    assert r.status_code == 400


# ---- Leads ----
def test_leads_list_and_filter(headers):
    r = requests.get(f"{API}/leads", headers=headers)
    assert r.status_code == 200
    assert isinstance(r.json(), list)
    r2 = requests.get(f"{API}/leads?stage=Hot", headers=headers)
    assert r2.status_code == 200
    for l in r2.json():
        assert l["stage"] == "Hot"
    r3 = requests.get(f"{API}/leads?q=Rohit", headers=headers)
    assert r3.status_code == 200


def test_lead_create_duplicate_and_update(headers):
    mob = f"9{uuid.uuid4().int % 10**9:09d}"
    r = requests.post(f"{API}/leads", headers=headers, json={
        "name": "TEST_Lead", "mobile": mob, "city": "BLR", "budget": 1000000})
    assert r.status_code == 200, r.text
    lead = r.json()
    assert "id" in lead and lead["mobile"] == mob
    lid = lead["id"]
    # duplicate
    r2 = requests.post(f"{API}/leads", headers=headers, json={"name": "Dup", "mobile": mob})
    assert r2.status_code == 200 and r2.json().get("duplicate") is True
    # patch stage (kanban)
    r3 = requests.patch(f"{API}/leads/{lid}", headers=headers, json={"stage": "Interested"})
    assert r3.status_code == 200 and r3.json()["stage"] == "Interested"
    # GET verify
    r4 = requests.get(f"{API}/leads/{lid}", headers=headers)
    assert r4.status_code == 200 and r4.json()["stage"] == "Interested"
    pytest.shared_lead_id = lid
    pytest.shared_mobile = mob


# ---- Calls ----
def test_call_log_updates_stage(headers):
    lid = pytest.shared_lead_id
    r = requests.post(f"{API}/calls", headers=headers, json={
        "lead_id": lid, "duration_seconds": 60, "disposition": "Interested"})
    assert r.status_code == 200
    rl = requests.get(f"{API}/leads/{lid}", headers=headers).json()
    assert rl["stage"] == "Interested"


# ---- Followups ----
def test_followup_creates(headers):
    lid = pytest.shared_lead_id
    r = requests.post(f"{API}/followups", headers=headers, json={
        "lead_id": lid, "due_at": "2026-02-01T10:00:00Z", "note": "call back"})
    assert r.status_code == 200
    rl = requests.get(f"{API}/leads/{lid}", headers=headers).json()
    assert rl["followup_date"] == "2026-02-01T10:00:00Z"


# ---- Projects/Units ----
def test_projects_units_flow(headers):
    pr = requests.post(f"{API}/projects", headers=headers, json={"name": "TEST_Proj", "location": "X"})
    assert pr.status_code == 200
    pid = pr.json()["id"]
    pl = requests.get(f"{API}/projects", headers=headers)
    assert pr.json()["id"] in [p["id"] for p in pl.json()]
    ur = requests.post(f"{API}/units", headers=headers, json={
        "project_id": pid, "unit_no": "A101", "size_sqft": 1200, "price": 5000000, "status": "Available"})
    assert ur.status_code == 200
    uid = ur.json()["id"]
    upd = requests.patch(f"{API}/units/{uid}", headers=headers, json={"status": "Hold"})
    assert upd.status_code == 200 and upd.json()["status"] == "Hold"
    pytest.shared_project_id = pid
    pytest.shared_unit_id = uid


# ---- Site Visits ----
def test_site_visits(headers):
    lid = pytest.shared_lead_id
    r = requests.post(f"{API}/site-visits", headers=headers, json={
        "lead_id": lid, "project_id": pytest.shared_project_id, "scheduled_at": "2026-02-05T11:00:00Z"})
    assert r.status_code == 200
    sv_id = r.json()["id"]
    rl = requests.get(f"{API}/leads/{lid}", headers=headers).json()
    assert rl["stage"] == "Site Visit Planned"
    upd = requests.patch(f"{API}/site-visits/{sv_id}", headers=headers, json={"status": "Completed"})
    assert upd.status_code == 200
    rl2 = requests.get(f"{API}/leads/{lid}", headers=headers).json()
    assert rl2["stage"] == "Site Visit Done"


# ---- Bookings/Payments ----
def test_bookings_payments(headers):
    lid = pytest.shared_lead_id
    r = requests.post(f"{API}/bookings", headers=headers, json={
        "lead_id": lid, "project_id": pytest.shared_project_id,
        "unit_id": pytest.shared_unit_id, "total_amount": 5000000, "token_amount": 100000})
    assert r.status_code == 200
    bid = r.json()["id"]
    assert r.json()["paid_amount"] == 100000
    # Lead -> Booked
    rl = requests.get(f"{API}/leads/{lid}", headers=headers).json()
    assert rl["stage"] == "Booked"
    # Unit -> Sold
    units = requests.get(f"{API}/units?project_id={pytest.shared_project_id}", headers=headers).json()
    u = next(u for u in units if u["id"] == pytest.shared_unit_id)
    assert u["status"] == "Sold"
    # add payment
    p = requests.post(f"{API}/payments", headers=headers, json={"booking_id": bid, "amount": 50000})
    assert p.status_code == 200
    bookings = requests.get(f"{API}/bookings", headers=headers).json()
    bk = next(b for b in bookings if b["id"] == bid)
    assert bk["paid_amount"] == 150000


# ---- Dashboard ----
def test_dashboard_stats(headers):
    r = requests.get(f"{API}/dashboard/stats", headers=headers)
    assert r.status_code == 200
    j = r.json()
    for k in ["total_leads", "booked", "won", "lost", "hot", "conversion_pct", "revenue", "sources", "stages"]:
        assert k in j


# ---- Multi-tenant isolation ----
def test_multitenant_isolation():
    em = f"test_{uuid.uuid4().hex[:8]}@x.com"
    s = requests.post(f"{API}/auth/signup", json={
        "company_name": "Other Co", "full_name": "U2", "email": em, "password": "Pass@1234"})
    assert s.status_code == 200
    tok2 = s.json()["token"]
    h2 = {"Authorization": f"Bearer {tok2}"}
    leads = requests.get(f"{API}/leads", headers=h2).json()
    assert leads == [] or all(l.get("workspace_id") != pytest.shared_lead_id for l in leads)
    # cannot read demo lead
    r = requests.get(f"{API}/leads/{pytest.shared_lead_id}", headers=h2)
    assert r.status_code == 404


# ---- AI ----
def test_ai_lead_score(headers):
    r = requests.post(f"{API}/ai/lead-score", headers=headers,
                      json={"lead_id": pytest.shared_lead_id}, timeout=60)
    if r.status_code != 200:
        pytest.skip(f"AI external dep: {r.status_code} {r.text[:120]}")
    j = r.json()
    assert "score" in j and "label" in j


def test_ai_next_action(headers):
    r = requests.post(f"{API}/ai/next-action", headers=headers,
                      json={"lead_id": pytest.shared_lead_id}, timeout=60)
    if r.status_code != 200:
        pytest.skip(f"AI external dep: {r.status_code}")
    assert "action" in r.json()


def test_ai_summary(headers):
    r = requests.post(f"{API}/ai/summary", headers=headers,
                      json={"lead_id": pytest.shared_lead_id}, timeout=60)
    if r.status_code != 200:
        pytest.skip(f"AI external dep: {r.status_code}")
    assert "summary" in r.json()


# ---- Demo seed ----
def test_demo_seed_idempotent(headers):
    r = requests.post(f"{API}/demo/seed", headers=headers)
    assert r.status_code == 200
