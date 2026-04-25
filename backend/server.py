"""LeadEmpire CRM Backend - FastAPI + MongoDB
Multi-tenant SaaS Real Estate CRM with telecalling, inventory, bookings & AI insights.
"""
from fastapi import FastAPI, APIRouter, HTTPException, Depends, status, Header
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os, logging, uuid, jwt, bcrypt
from pathlib import Path
from pydantic import BaseModel, Field, EmailStr
from typing import List, Optional, Dict, Any
from datetime import datetime, timezone, timedelta

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

JWT_SECRET = os.environ.get('JWT_SECRET', 'change-me')
JWT_ALGO = "HS256"
JWT_EXP_HOURS = 24 * 7

app = FastAPI(title="LeadEmpire CRM API")
api = APIRouter(prefix="/api")

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("leadempire")


# ============ HELPERS ============
def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def new_id() -> str:
    return str(uuid.uuid4())


def hash_password(p: str) -> str:
    return bcrypt.hashpw(p.encode(), bcrypt.gensalt()).decode()


def verify_password(p: str, h: str) -> bool:
    try:
        return bcrypt.checkpw(p.encode(), h.encode())
    except Exception:
        return False


def make_token(user_id: str, workspace_id: str, role: str) -> str:
    payload = {
        "user_id": user_id,
        "workspace_id": workspace_id,
        "role": role,
        "exp": datetime.now(timezone.utc) + timedelta(hours=JWT_EXP_HOURS),
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGO)


async def get_current_user(authorization: Optional[str] = Header(None)) -> Dict[str, Any]:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing token")
    token = authorization.split(" ", 1)[1]
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGO])
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid token")
    user = await db.users.find_one({"id": payload["user_id"]}, {"_id": 0, "password": 0})
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    return user


# ============ MODELS ============
class SignupReq(BaseModel):
    company_name: str
    full_name: str
    email: EmailStr
    password: str
    phone: Optional[str] = None


class LoginReq(BaseModel):
    email: EmailStr
    password: str


class LeadCreate(BaseModel):
    name: str
    mobile: str
    alt_mobile: Optional[str] = None
    email: Optional[str] = None
    budget: Optional[float] = None
    city: Optional[str] = None
    location: Optional[str] = None
    property_type: Optional[str] = None
    source: Optional[str] = "Manual"
    campaign: Optional[str] = None
    notes: Optional[str] = None
    priority: Optional[str] = "Medium"
    interested_project: Optional[str] = None
    assigned_to: Optional[str] = None
    stage: Optional[str] = "New"
    followup_date: Optional[str] = None


class LeadUpdate(BaseModel):
    name: Optional[str] = None
    mobile: Optional[str] = None
    alt_mobile: Optional[str] = None
    email: Optional[str] = None
    budget: Optional[float] = None
    city: Optional[str] = None
    location: Optional[str] = None
    property_type: Optional[str] = None
    source: Optional[str] = None
    notes: Optional[str] = None
    priority: Optional[str] = None
    interested_project: Optional[str] = None
    assigned_to: Optional[str] = None
    stage: Optional[str] = None
    followup_date: Optional[str] = None


class CallLogCreate(BaseModel):
    lead_id: str
    duration_seconds: int = 0
    disposition: str  # Connected | Busy | Not Reachable | Wrong Number | Interested | Not Interested
    notes: Optional[str] = None


class ProjectCreate(BaseModel):
    name: str
    builder: Optional[str] = None
    location: Optional[str] = None
    map_link: Optional[str] = None
    description: Optional[str] = None
    image_url: Optional[str] = None


class UnitCreate(BaseModel):
    project_id: str
    block: Optional[str] = None
    unit_no: str
    size_sqft: Optional[float] = None
    facing: Optional[str] = None
    price: Optional[float] = None
    status: str = "Available"  # Available | Hold | Sold


class SiteVisitCreate(BaseModel):
    lead_id: str
    project_id: Optional[str] = None
    scheduled_at: str
    pickup_address: Optional[str] = None
    notes: Optional[str] = None


class SiteVisitUpdate(BaseModel):
    status: Optional[str] = None  # Scheduled | Completed | No-Show | Cancelled
    feedback: Optional[str] = None


class BookingCreate(BaseModel):
    lead_id: str
    project_id: Optional[str] = None
    unit_id: Optional[str] = None
    total_amount: float
    token_amount: float = 0
    notes: Optional[str] = None


class PaymentCreate(BaseModel):
    booking_id: str
    amount: float
    method: Optional[str] = "Cash"
    notes: Optional[str] = None


class AIRequest(BaseModel):
    lead_id: str


class FollowupCreate(BaseModel):
    lead_id: str
    due_at: str
    note: Optional[str] = None


# ============ AUTH ============
@api.post("/auth/signup")
async def signup(req: SignupReq):
    existing = await db.users.find_one({"email": req.email.lower()})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    workspace_id = new_id()
    user_id = new_id()
    workspace = {
        "id": workspace_id,
        "name": req.company_name,
        "owner_id": user_id,
        "plan": "trial",
        "lead_limit": 1000,
        "user_limit": 3,
        "created_at": now_iso(),
        "branding": {"logo": None, "primary": "#0F172A"},
        "api_key": "lek_" + uuid.uuid4().hex,
        "form_token": uuid.uuid4().hex[:16],
        "default_assignee_id": user_id,
    }
    user = {
        "id": user_id,
        "workspace_id": workspace_id,
        "email": req.email.lower(),
        "full_name": req.full_name,
        "phone": req.phone,
        "password": hash_password(req.password),
        "role": "owner",
        "active": True,
        "created_at": now_iso(),
    }
    await db.workspaces.insert_one(workspace)
    await db.users.insert_one(user)
    token = make_token(user_id, workspace_id, "owner")
    return {
        "token": token,
        "user": {k: v for k, v in user.items() if k != "password" and k != "_id"},
        "workspace": {k: v for k, v in workspace.items() if k != "_id"},
    }


@api.post("/auth/login")
async def login(req: LoginReq):
    user = await db.users.find_one({"email": req.email.lower()})
    if not user or not verify_password(req.password, user["password"]):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    workspace = await db.workspaces.find_one({"id": user["workspace_id"]}, {"_id": 0})
    token = make_token(user["id"], user["workspace_id"], user["role"])
    user.pop("_id", None)
    user.pop("password", None)
    return {"token": token, "user": user, "workspace": workspace}


@api.get("/auth/me")
async def me(current=Depends(get_current_user)):
    workspace = await db.workspaces.find_one({"id": current["workspace_id"]}, {"_id": 0})
    return {"user": current, "workspace": workspace}


# ============ LEADS ============
@api.post("/leads")
async def create_lead(payload: LeadCreate, current=Depends(get_current_user)):
    # duplicate detection on mobile within workspace
    dup = await db.leads.find_one({"workspace_id": current["workspace_id"], "mobile": payload.mobile})
    if dup:
        return {"duplicate": True, "lead_id": dup["id"]}
    lead = payload.model_dump()
    lead.update({
        "id": new_id(),
        "workspace_id": current["workspace_id"],
        "created_by": current["id"],
        "created_at": now_iso(),
        "updated_at": now_iso(),
        "score": None,
    })
    await db.leads.insert_one(lead)
    lead.pop("_id", None)
    return lead


@api.get("/leads")
async def list_leads(stage: Optional[str] = None, q: Optional[str] = None, current=Depends(get_current_user)):
    query: Dict[str, Any] = {"workspace_id": current["workspace_id"]}
    if stage:
        query["stage"] = stage
    if q:
        query["$or"] = [
            {"name": {"$regex": q, "$options": "i"}},
            {"mobile": {"$regex": q, "$options": "i"}},
            {"city": {"$regex": q, "$options": "i"}},
            {"email": {"$regex": q, "$options": "i"}},
        ]
    leads = await db.leads.find(query, {"_id": 0}).sort("created_at", -1).to_list(2000)
    return leads


@api.get("/leads/{lead_id}")
async def get_lead(lead_id: str, current=Depends(get_current_user)):
    lead = await db.leads.find_one({"id": lead_id, "workspace_id": current["workspace_id"]}, {"_id": 0})
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
    return lead


@api.patch("/leads/{lead_id}")
async def update_lead(lead_id: str, payload: LeadUpdate, current=Depends(get_current_user)):
    update_data = payload.model_dump(exclude_unset=True)
    if not update_data:
        raise HTTPException(status_code=400, detail="No fields to update")
    # Duplicate mobile check on edit
    new_mobile = update_data.get("mobile")
    if new_mobile:
        dup = await db.leads.find_one({
            "workspace_id": current["workspace_id"],
            "mobile": new_mobile,
            "id": {"$ne": lead_id},
        })
        if dup:
            raise HTTPException(status_code=400, detail="Another lead with this mobile already exists")
    update_data["updated_at"] = now_iso()
    result = await db.leads.update_one(
        {"id": lead_id, "workspace_id": current["workspace_id"]}, {"$set": update_data}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Lead not found")
    lead = await db.leads.find_one({"id": lead_id}, {"_id": 0})
    return lead


@api.delete("/leads/{lead_id}")
async def delete_lead(lead_id: str, current=Depends(get_current_user)):
    await db.leads.delete_one({"id": lead_id, "workspace_id": current["workspace_id"]})
    return {"ok": True}


# ============ CALLS ============
@api.post("/calls")
async def log_call(payload: CallLogCreate, current=Depends(get_current_user)):
    call = payload.model_dump()
    call.update({
        "id": new_id(),
        "workspace_id": current["workspace_id"],
        "user_id": current["id"],
        "created_at": now_iso(),
    })
    await db.calls.insert_one(call)
    # Auto-update lead stage on connection
    if payload.disposition == "Interested":
        await db.leads.update_one(
            {"id": payload.lead_id, "workspace_id": current["workspace_id"]},
            {"$set": {"stage": "Interested", "updated_at": now_iso()}},
        )
    elif payload.disposition == "Connected":
        await db.leads.update_one(
            {"id": payload.lead_id, "workspace_id": current["workspace_id"], "stage": {"$in": ["New", "Fresh", "Attempted"]}},
            {"$set": {"stage": "Connected", "updated_at": now_iso()}},
        )
    call.pop("_id", None)
    return call


@api.get("/calls")
async def list_calls(lead_id: Optional[str] = None, current=Depends(get_current_user)):
    q = {"workspace_id": current["workspace_id"]}
    if lead_id:
        q["lead_id"] = lead_id
    calls = await db.calls.find(q, {"_id": 0}).sort("created_at", -1).to_list(500)
    return calls


# ============ FOLLOWUPS ============
SALES_ROLES = {"executive", "telecaller", "sales_executive"}


def _is_sales_user(user: Dict[str, Any]) -> bool:
    return user.get("role") in SALES_ROLES


@api.post("/followups")
async def create_followup(payload: FollowupCreate, current=Depends(get_current_user)):
    f = payload.model_dump()
    f.update({"id": new_id(), "workspace_id": current["workspace_id"], "user_id": current["id"],
              "status": "Pending", "created_at": now_iso()})
    await db.followups.insert_one(f)
    await db.leads.update_one(
        {"id": payload.lead_id, "workspace_id": current["workspace_id"]},
        {"$set": {"followup_date": payload.due_at, "updated_at": now_iso()}},
    )
    f.pop("_id", None)
    return f


@api.get("/followups")
async def list_followups(
    lead_id: Optional[str] = None,
    filter: Optional[str] = None,  # today | overdue | upcoming | completed
    scope: Optional[str] = "auto",  # auto | mine | all
    current=Depends(get_current_user),
):
    q: Dict[str, Any] = {"workspace_id": current["workspace_id"]}
    if lead_id:
        q["lead_id"] = lead_id
    # role-based scoping: sales users always see only their own
    if scope == "mine" or (scope == "auto" and _is_sales_user(current)):
        q["user_id"] = current["id"]
    now = datetime.now(timezone.utc)
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0).isoformat()
    today_end = now.replace(hour=23, minute=59, second=59, microsecond=999999).isoformat()
    now_iso_str = now.isoformat()
    if filter == "today":
        q["status"] = "Pending"
        q["due_at"] = {"$gte": today_start, "$lte": today_end}
    elif filter == "overdue":
        q["status"] = "Pending"
        q["due_at"] = {"$lt": today_start}
    elif filter == "upcoming":
        q["status"] = "Pending"
        q["due_at"] = {"$gt": today_end}
    elif filter == "completed":
        q["status"] = "Done"
    items = await db.followups.find(q, {"_id": 0}).sort("due_at", 1).to_list(1000)
    _ = now_iso_str  # reserved
    return items


class FollowupUpdate(BaseModel):
    status: Optional[str] = None  # Pending | Done
    due_at: Optional[str] = None
    note: Optional[str] = None
    next_due_at: Optional[str] = None  # if provided & status=Done, auto-create next followup
    next_note: Optional[str] = None


@api.patch("/followups/{fid}")
async def update_followup(fid: str, payload: FollowupUpdate, current=Depends(get_current_user)):
    existing = await db.followups.find_one({"id": fid, "workspace_id": current["workspace_id"]}, {"_id": 0})
    if not existing:
        raise HTTPException(status_code=404, detail="Follow-up not found")
    if _is_sales_user(current) and existing.get("user_id") != current["id"]:
        raise HTTPException(status_code=403, detail="Not allowed")
    update_data = {k: v for k, v in payload.model_dump(exclude_unset=True).items()
                   if k not in {"next_due_at", "next_note"} and v is not None}
    if update_data:
        update_data["updated_at"] = now_iso()
        await db.followups.update_one({"id": fid}, {"$set": update_data})
    # Auto-create next follow-up if marking Done with next_due_at
    next_followup = None
    if payload.status == "Done" and payload.next_due_at:
        next_followup = {
            "id": new_id(), "workspace_id": current["workspace_id"], "user_id": current["id"],
            "lead_id": existing["lead_id"], "due_at": payload.next_due_at,
            "note": payload.next_note or "", "status": "Pending", "created_at": now_iso(),
        }
        await db.followups.insert_one(next_followup)
        await db.leads.update_one(
            {"id": existing["lead_id"], "workspace_id": current["workspace_id"]},
            {"$set": {"followup_date": payload.next_due_at, "updated_at": now_iso()}},
        )
        next_followup.pop("_id", None)
    updated = await db.followups.find_one({"id": fid}, {"_id": 0})
    return {"followup": updated, "next": next_followup}


@api.delete("/followups/{fid}")
async def delete_followup(fid: str, current=Depends(get_current_user)):
    existing = await db.followups.find_one({"id": fid, "workspace_id": current["workspace_id"]})
    if not existing:
        raise HTTPException(status_code=404, detail="Not found")
    if _is_sales_user(current) and existing.get("user_id") != current["id"]:
        raise HTTPException(status_code=403, detail="Not allowed")
    await db.followups.delete_one({"id": fid})
    return {"ok": True}


# ============ PROJECTS & UNITS ============
@api.post("/projects")
async def create_project(payload: ProjectCreate, current=Depends(get_current_user)):
    p = payload.model_dump()
    p.update({"id": new_id(), "workspace_id": current["workspace_id"], "created_at": now_iso()})
    await db.projects.insert_one(p)
    p.pop("_id", None)
    return p


@api.get("/projects")
async def list_projects(current=Depends(get_current_user)):
    items = await db.projects.find({"workspace_id": current["workspace_id"]}, {"_id": 0}).sort("created_at", -1).to_list(500)
    return items


@api.delete("/projects/{project_id}")
async def delete_project(project_id: str, current=Depends(get_current_user)):
    await db.projects.delete_one({"id": project_id, "workspace_id": current["workspace_id"]})
    await db.units.delete_many({"project_id": project_id, "workspace_id": current["workspace_id"]})
    return {"ok": True}


@api.post("/units")
async def create_unit(payload: UnitCreate, current=Depends(get_current_user)):
    u = payload.model_dump()
    u.update({"id": new_id(), "workspace_id": current["workspace_id"], "created_at": now_iso()})
    await db.units.insert_one(u)
    u.pop("_id", None)
    return u


@api.get("/units")
async def list_units(project_id: Optional[str] = None, current=Depends(get_current_user)):
    q = {"workspace_id": current["workspace_id"]}
    if project_id:
        q["project_id"] = project_id
    items = await db.units.find(q, {"_id": 0}).sort("created_at", -1).to_list(1000)
    return items


@api.patch("/units/{unit_id}")
async def update_unit(unit_id: str, body: Dict[str, Any], current=Depends(get_current_user)):
    body.pop("_id", None)
    body.pop("id", None)
    await db.units.update_one(
        {"id": unit_id, "workspace_id": current["workspace_id"]}, {"$set": body}
    )
    return await db.units.find_one({"id": unit_id}, {"_id": 0})


# ============ SITE VISITS ============
@api.post("/site-visits")
async def create_site_visit(payload: SiteVisitCreate, current=Depends(get_current_user)):
    sv = payload.model_dump()
    sv.update({
        "id": new_id(), "workspace_id": current["workspace_id"], "user_id": current["id"],
        "status": "Scheduled", "feedback": None, "created_at": now_iso(),
    })
    await db.site_visits.insert_one(sv)
    await db.leads.update_one(
        {"id": payload.lead_id, "workspace_id": current["workspace_id"]},
        {"$set": {"stage": "Site Visit Planned", "updated_at": now_iso()}},
    )
    sv.pop("_id", None)
    return sv


@api.get("/site-visits")
async def list_site_visits(current=Depends(get_current_user)):
    items = await db.site_visits.find({"workspace_id": current["workspace_id"]}, {"_id": 0}).sort("scheduled_at", -1).to_list(500)
    return items


@api.patch("/site-visits/{sv_id}")
async def update_site_visit(sv_id: str, payload: SiteVisitUpdate, current=Depends(get_current_user)):
    update_data = {k: v for k, v in payload.model_dump().items() if v is not None}
    await db.site_visits.update_one({"id": sv_id, "workspace_id": current["workspace_id"]}, {"$set": update_data})
    sv = await db.site_visits.find_one({"id": sv_id}, {"_id": 0})
    if sv and payload.status == "Completed":
        await db.leads.update_one(
            {"id": sv["lead_id"], "workspace_id": current["workspace_id"]},
            {"$set": {"stage": "Site Visit Done", "updated_at": now_iso()}},
        )
    return sv


# ============ BOOKINGS & PAYMENTS ============
@api.post("/bookings")
async def create_booking(payload: BookingCreate, current=Depends(get_current_user)):
    b = payload.model_dump()
    b.update({
        "id": new_id(), "workspace_id": current["workspace_id"], "user_id": current["id"],
        "status": "Active", "paid_amount": payload.token_amount, "created_at": now_iso(),
    })
    await db.bookings.insert_one(b)
    if payload.token_amount > 0:
        await db.payments.insert_one({
            "id": new_id(), "workspace_id": current["workspace_id"], "booking_id": b["id"],
            "amount": payload.token_amount, "method": "Token", "notes": "Token booking",
            "created_at": now_iso(),
        })
    if payload.unit_id:
        await db.units.update_one(
            {"id": payload.unit_id, "workspace_id": current["workspace_id"]}, {"$set": {"status": "Sold"}}
        )
    await db.leads.update_one(
        {"id": payload.lead_id, "workspace_id": current["workspace_id"]},
        {"$set": {"stage": "Booked", "updated_at": now_iso()}},
    )
    b.pop("_id", None)
    return b


@api.get("/bookings")
async def list_bookings(current=Depends(get_current_user)):
    items = await db.bookings.find({"workspace_id": current["workspace_id"]}, {"_id": 0}).sort("created_at", -1).to_list(500)
    return items


@api.post("/payments")
async def create_payment(payload: PaymentCreate, current=Depends(get_current_user)):
    p = payload.model_dump()
    p.update({"id": new_id(), "workspace_id": current["workspace_id"], "created_at": now_iso()})
    await db.payments.insert_one(p)
    booking = await db.bookings.find_one({"id": payload.booking_id, "workspace_id": current["workspace_id"]})
    if booking:
        new_paid = (booking.get("paid_amount", 0) or 0) + payload.amount
        await db.bookings.update_one({"id": payload.booking_id}, {"$set": {"paid_amount": new_paid}})
    p.pop("_id", None)
    return p


@api.get("/payments")
async def list_payments(booking_id: Optional[str] = None, current=Depends(get_current_user)):
    q = {"workspace_id": current["workspace_id"]}
    if booking_id:
        q["booking_id"] = booking_id
    items = await db.payments.find(q, {"_id": 0}).sort("created_at", -1).to_list(500)
    return items


# ============ TEAM ============
@api.get("/team")
async def list_team(current=Depends(get_current_user)):
    users = await db.users.find({"workspace_id": current["workspace_id"]}, {"_id": 0, "password": 0}).to_list(200)
    return users


@api.post("/team")
async def add_team_member(body: Dict[str, Any], current=Depends(get_current_user)):
    if current["role"] not in ["owner", "manager"]:
        raise HTTPException(status_code=403, detail="Not authorized")
    email = body.get("email", "").lower()
    if await db.users.find_one({"email": email}):
        raise HTTPException(status_code=400, detail="Email already used")
    u = {
        "id": new_id(),
        "workspace_id": current["workspace_id"],
        "email": email,
        "full_name": body.get("full_name", ""),
        "phone": body.get("phone"),
        "password": hash_password(body.get("password", "Welcome@123")),
        "role": body.get("role", "executive"),
        "active": True,
        "created_at": now_iso(),
    }
    await db.users.insert_one(u)
    u.pop("_id", None)
    u.pop("password", None)
    return u


# ============ DASHBOARD / REPORTS ============
@api.get("/dashboard/stats")
async def dashboard_stats(current=Depends(get_current_user)):
    ws = current["workspace_id"]
    total_leads = await db.leads.count_documents({"workspace_id": ws})
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    leads_today = await db.leads.count_documents({"workspace_id": ws, "created_at": {"$gte": today}})
    booked = await db.leads.count_documents({"workspace_id": ws, "stage": "Booked"})
    won = await db.leads.count_documents({"workspace_id": ws, "stage": "Won"})
    lost = await db.leads.count_documents({"workspace_id": ws, "stage": "Lost"})
    hot = await db.leads.count_documents({"workspace_id": ws, "stage": "Hot"})
    conv = round(((booked + won) / total_leads) * 100, 1) if total_leads else 0
    # source breakdown
    sources_cursor = db.leads.aggregate([
        {"$match": {"workspace_id": ws}},
        {"$group": {"_id": "$source", "count": {"$sum": 1}}},
    ])
    sources = [{"source": s["_id"] or "Unknown", "count": s["count"]} async for s in sources_cursor]
    # stage breakdown
    stages_cursor = db.leads.aggregate([
        {"$match": {"workspace_id": ws}},
        {"$group": {"_id": "$stage", "count": {"$sum": 1}}},
    ])
    stages = [{"stage": s["_id"] or "New", "count": s["count"]} async for s in stages_cursor]
    # revenue
    revenue_cursor = db.payments.aggregate([
        {"$match": {"workspace_id": ws}},
        {"$group": {"_id": None, "total": {"$sum": "$amount"}}},
    ])
    revenue_list = [r async for r in revenue_cursor]
    revenue = revenue_list[0]["total"] if revenue_list else 0
    # followups (role-scoped: sales users see only own)
    fu_q: Dict[str, Any] = {"workspace_id": ws}
    if _is_sales_user(current):
        fu_q["user_id"] = current["id"]
    now = datetime.now(timezone.utc)
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0).isoformat()
    today_end = now.replace(hour=23, minute=59, second=59, microsecond=999999).isoformat()
    followups_pending = await db.followups.count_documents({**fu_q, "status": "Pending"})
    followups_today = await db.followups.count_documents({
        **fu_q, "status": "Pending", "due_at": {"$gte": today_start, "$lte": today_end},
    })
    followups_overdue = await db.followups.count_documents({
        **fu_q, "status": "Pending", "due_at": {"$lt": today_start},
    })
    followups_upcoming = await db.followups.count_documents({
        **fu_q, "status": "Pending", "due_at": {"$gt": today_end},
    })
    return {
        "total_leads": total_leads,
        "leads_today": leads_today,
        "booked": booked,
        "won": won,
        "lost": lost,
        "hot": hot,
        "conversion_pct": conv,
        "revenue": revenue,
        "followups_pending": followups_pending,
        "followups_today": followups_today,
        "followups_overdue": followups_overdue,
        "followups_upcoming": followups_upcoming,
        "sources": sources,
        "stages": stages,
    }


# ============ AI (Claude Sonnet 4.5) ============
async def _ai_chat(system: str, user: str) -> str:
    from emergentintegrations.llm.chat import LlmChat, UserMessage
    chat = LlmChat(
        api_key=os.environ["EMERGENT_LLM_KEY"],
        session_id=f"leadempire-{new_id()[:8]}",
        system_message=system,
    ).with_model("anthropic", "claude-sonnet-4-5-20250929")
    return await chat.send_message(UserMessage(text=user))


@api.post("/ai/lead-score")
async def ai_lead_score(req: AIRequest, current=Depends(get_current_user)):
    lead = await db.leads.find_one({"id": req.lead_id, "workspace_id": current["workspace_id"]}, {"_id": 0})
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
    calls = await db.calls.find({"lead_id": req.lead_id, "workspace_id": current["workspace_id"]}, {"_id": 0}).to_list(50)
    summary_parts = [
        f"Name: {lead.get('name')}",
        f"Mobile: {lead.get('mobile')}",
        f"Budget: {lead.get('budget')}",
        f"City: {lead.get('city')}",
        f"Property type: {lead.get('property_type')}",
        f"Source: {lead.get('source')}",
        f"Stage: {lead.get('stage')}",
        f"Notes: {lead.get('notes') or 'None'}",
        f"Call attempts: {len(calls)}",
        f"Latest disposition: {calls[0]['disposition'] if calls else 'No calls yet'}",
    ]
    user_msg = (
        "Score the following real-estate lead from 0 to 100 (likelihood to convert). "
        "Reply STRICTLY in JSON like {\"score\": 78, \"label\": \"Hot\", \"reason\": \"...\"}. "
        "Use labels: Cold (0-39), Warm (40-69), Hot (70-100).\n\n" + "\n".join(summary_parts)
    )
    try:
        text = await _ai_chat(
            "You are an expert real estate sales analyst. Output only valid JSON.",
            user_msg,
        )
        import json, re
        match = re.search(r"\{.*\}", text, re.S)
        data = json.loads(match.group(0)) if match else {"score": 50, "label": "Warm", "reason": text[:200]}
        await db.leads.update_one(
            {"id": req.lead_id, "workspace_id": current["workspace_id"]},
            {"$set": {"score": data.get("score"), "ai_label": data.get("label"), "ai_reason": data.get("reason"), "updated_at": now_iso()}},
        )
        return data
    except Exception as e:
        logger.exception("AI score failed")
        raise HTTPException(status_code=500, detail=f"AI error: {str(e)[:200]}")


@api.post("/ai/next-action")
async def ai_next_action(req: AIRequest, current=Depends(get_current_user)):
    lead = await db.leads.find_one({"id": req.lead_id, "workspace_id": current["workspace_id"]}, {"_id": 0})
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
    calls = await db.calls.find({"lead_id": req.lead_id, "workspace_id": current["workspace_id"]}, {"_id": 0}).to_list(20)
    user_msg = (
        f"Lead: {lead.get('name')} | Stage: {lead.get('stage')} | Budget: {lead.get('budget')} | "
        f"Notes: {lead.get('notes') or 'None'} | Call attempts: {len(calls)} | "
        f"Last disposition: {calls[0]['disposition'] if calls else 'None'}.\n"
        "Suggest the SINGLE best next action and a concise WhatsApp/SMS template (under 320 chars). "
        "Reply JSON: {\"action\": \"...\", \"timing\": \"...\", \"message\": \"...\"}"
    )
    try:
        text = await _ai_chat(
            "You are a senior real estate sales coach. Output only valid JSON.", user_msg
        )
        import json, re
        m = re.search(r"\{.*\}", text, re.S)
        if m:
            try:
                return json.loads(m.group(0))
            except Exception:
                pass
        return {"action": text[:200], "timing": "Today", "message": ""}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"AI error: {str(e)[:200]}")


@api.post("/ai/summary")
async def ai_summary(req: AIRequest, current=Depends(get_current_user)):
    lead = await db.leads.find_one({"id": req.lead_id, "workspace_id": current["workspace_id"]}, {"_id": 0})
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
    calls = await db.calls.find({"lead_id": req.lead_id, "workspace_id": current["workspace_id"]}, {"_id": 0}).to_list(20)
    visits = await db.site_visits.find({"lead_id": req.lead_id, "workspace_id": current["workspace_id"]}, {"_id": 0}).to_list(20)
    user_msg = (
        f"Lead JSON: {lead}\nCalls: {calls}\nVisits: {visits}\n"
        "Write a 4-6 line crisp executive summary for the sales manager. Plain text only."
    )
    try:
        text = await _ai_chat(
            "You are a real estate CRM assistant. Concise, factual, no fluff.", user_msg
        )
        return {"summary": text.strip()}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"AI error: {str(e)[:200]}")


# ============ SEED DEMO DATA ============
@api.post("/demo/seed")
async def seed_demo(current=Depends(get_current_user)):
    ws = current["workspace_id"]
    # only seed if empty
    if await db.leads.count_documents({"workspace_id": ws}) > 0:
        return {"seeded": False, "reason": "Workspace already has data"}
    sample_projects = [
        {"name": "Skyline Residences", "builder": "Empire Builders", "location": "Whitefield, Bangalore"},
        {"name": "Green Acres Plots", "builder": "Empire Builders", "location": "Sarjapur Road"},
        {"name": "Marina Heights", "builder": "Coastal Group", "location": "OMR, Chennai"},
    ]
    proj_ids = []
    for p in sample_projects:
        pid = new_id()
        await db.projects.insert_one({**p, "id": pid, "workspace_id": ws, "created_at": now_iso()})
        proj_ids.append(pid)
    sample_leads = [
        {"name": "Rohit Sharma", "mobile": "9876543210", "city": "Bangalore", "budget": 8500000, "property_type": "3BHK", "source": "Facebook Ads", "stage": "Hot", "priority": "High"},
        {"name": "Priya Mehta", "mobile": "9123456780", "city": "Chennai", "budget": 6200000, "property_type": "2BHK", "source": "Website", "stage": "Interested", "priority": "High"},
        {"name": "Amit Verma", "mobile": "9988776655", "city": "Bangalore", "budget": 12000000, "property_type": "Villa", "source": "Google Ads", "stage": "Site Visit Planned", "priority": "High"},
        {"name": "Neha Gupta", "mobile": "9876123450", "city": "Hyderabad", "budget": 4500000, "property_type": "Plot", "source": "Instagram", "stage": "Connected", "priority": "Medium"},
        {"name": "Rahul Iyer", "mobile": "9012345678", "city": "Chennai", "budget": 7800000, "property_type": "3BHK", "source": "Reference", "stage": "New", "priority": "Medium"},
        {"name": "Sneha Patel", "mobile": "9876009988", "city": "Bangalore", "budget": 5500000, "property_type": "2BHK", "source": "Walk-in", "stage": "Booked", "priority": "High"},
        {"name": "Karthik Rao", "mobile": "9090909090", "city": "Bangalore", "budget": 9500000, "property_type": "Villa", "source": "Facebook Ads", "stage": "Negotiation", "priority": "High"},
        {"name": "Anjali Singh", "mobile": "9876504321", "city": "Pune", "budget": 3500000, "property_type": "1BHK", "source": "Website", "stage": "Cold", "priority": "Low"},
    ]
    for ld in sample_leads:
        ld.update({
            "id": new_id(), "workspace_id": ws, "created_by": current["id"],
            "created_at": now_iso(), "updated_at": now_iso(),
            "interested_project": proj_ids[0], "assigned_to": current["id"],
            "score": None,
        })
        await db.leads.insert_one(ld)
    return {"seeded": True, "leads": len(sample_leads), "projects": len(sample_projects)}


# ============ ROOT ============
@api.get("/")
async def root():
    return {"app": "LeadEmpire CRM", "version": "1.0.0"}


# ============ LEAD CAPTURE (Webhook + Public Form + CSV) ============
WEBHOOK_SOURCES = {"Facebook", "Google", "Website", "WordPress", "99acres", "MagicBricks", "Housing", "Manual", "Other"}


async def _ensure_workspace_keys(ws: Dict[str, Any]) -> Dict[str, Any]:
    updates: Dict[str, Any] = {}
    if not ws.get("api_key"):
        updates["api_key"] = "lek_" + uuid.uuid4().hex
    if not ws.get("form_token"):
        updates["form_token"] = uuid.uuid4().hex[:16]
    if not ws.get("default_assignee_id"):
        updates["default_assignee_id"] = ws.get("owner_id")
    if updates:
        await db.workspaces.update_one({"id": ws["id"]}, {"$set": updates})
        ws.update(updates)
    return ws


async def _capture_lead(workspace_id: str, payload: Dict[str, Any], default_assignee: str) -> Dict[str, Any]:
    name = (payload.get("name") or "").strip()
    mobile = (payload.get("mobile") or "").strip()
    if not name or not mobile:
        raise HTTPException(status_code=400, detail="name and mobile are required")
    source = payload.get("source") or "Other"
    if source not in WEBHOOK_SOURCES:
        source = "Other"
    today_due = datetime.now(timezone.utc).replace(hour=18, minute=0, second=0, microsecond=0).isoformat()
    msg_note = payload.get("message") or payload.get("notes") or ""
    extra_score = payload.get("lead_score")
    project_interest = payload.get("project_interest") or payload.get("interested_project")
    existing = await db.leads.find_one({"workspace_id": workspace_id, "mobile": mobile})
    if existing:
        upd: Dict[str, Any] = {"updated_at": now_iso()}
        for f, src in (("email", payload.get("email")), ("city", payload.get("city")),
                       ("budget", payload.get("budget")), ("interested_project", project_interest)):
            if src and not existing.get(f):
                upd[f] = float(src) if f == "budget" else src
        if msg_note:
            old = existing.get("notes") or ""
            stamp = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M")
            upd["notes"] = (old + ("\n" if old else "") + f"[{stamp} {source}] {msg_note}").strip()
        if extra_score is not None and not existing.get("score"):
            upd["score"] = extra_score
        await db.leads.update_one({"id": existing["id"]}, {"$set": upd})
        pending = await db.followups.count_documents({"workspace_id": workspace_id, "lead_id": existing["id"], "status": "Pending"})
        if pending == 0:
            await db.followups.insert_one({
                "id": new_id(), "workspace_id": workspace_id,
                "user_id": existing.get("assigned_to") or default_assignee,
                "lead_id": existing["id"], "due_at": today_due,
                "note": f"Re-captured via {source}: {msg_note[:120]}" if msg_note else f"Re-captured via {source}",
                "status": "Pending", "created_at": now_iso(),
            })
            await db.leads.update_one({"id": existing["id"]}, {"$set": {"followup_date": today_due}})
        return {"status": "updated", "lead_id": existing["id"], "duplicate": True}
    lead_id = new_id()
    lead = {
        "id": lead_id, "workspace_id": workspace_id, "name": name, "mobile": mobile,
        "email": payload.get("email") or None, "city": payload.get("city") or None,
        "budget": float(payload["budget"]) if payload.get("budget") not in (None, "") else None,
        "interested_project": project_interest or None,
        "source": source, "stage": "New", "priority": "Medium",
        "notes": msg_note or None, "assigned_to": default_assignee,
        "followup_date": today_due, "score": extra_score,
        "created_by": default_assignee, "created_at": now_iso(), "updated_at": now_iso(),
    }
    await db.leads.insert_one(lead)
    await db.followups.insert_one({
        "id": new_id(), "workspace_id": workspace_id, "user_id": default_assignee,
        "lead_id": lead_id, "due_at": today_due,
        "note": f"New lead from {source}: {msg_note[:120]}" if msg_note else f"New lead from {source}",
        "status": "Pending", "created_at": now_iso(),
    })
    return {"status": "created", "lead_id": lead_id, "duplicate": False}


@api.post("/webhooks/leads")
async def webhook_capture(payload: Dict[str, Any], x_api_key: Optional[str] = Header(None)):
    if not x_api_key:
        raise HTTPException(status_code=401, detail="x-api-key header required")
    ws = await db.workspaces.find_one({"api_key": x_api_key}, {"_id": 0})
    if not ws:
        raise HTTPException(status_code=401, detail="Invalid API key")
    return await _capture_lead(ws["id"], payload, ws.get("default_assignee_id") or ws.get("owner_id"))


@api.post("/public/forms/{form_token}/leads")
async def public_form_capture(form_token: str, payload: Dict[str, Any]):
    ws = await db.workspaces.find_one({"form_token": form_token}, {"_id": 0})
    if not ws:
        raise HTTPException(status_code=404, detail="Form not found")
    return await _capture_lead(ws["id"], payload, ws.get("default_assignee_id") or ws.get("owner_id"))


@api.get("/public/forms/{form_token}")
async def public_form_meta(form_token: str):
    ws = await db.workspaces.find_one({"form_token": form_token}, {"_id": 0, "api_key": 0})
    if not ws:
        raise HTTPException(status_code=404, detail="Form not found")
    return {"workspace_name": ws["name"], "form_token": form_token}


@api.get("/settings/workspace")
async def get_workspace_settings(current=Depends(get_current_user)):
    ws = await db.workspaces.find_one({"id": current["workspace_id"]}, {"_id": 0})
    ws = await _ensure_workspace_keys(ws)
    return ws


class WorkspaceSettingsUpdate(BaseModel):
    default_assignee_id: Optional[str] = None
    regenerate_api_key: Optional[bool] = False


@api.patch("/settings/workspace")
async def update_workspace_settings(payload: WorkspaceSettingsUpdate, current=Depends(get_current_user)):
    if current["role"] not in ("owner", "manager"):
        raise HTTPException(status_code=403, detail="Not authorized")
    upd: Dict[str, Any] = {}
    if payload.default_assignee_id:
        upd["default_assignee_id"] = payload.default_assignee_id
    if payload.regenerate_api_key:
        upd["api_key"] = "lek_" + uuid.uuid4().hex
    if upd:
        await db.workspaces.update_one({"id": current["workspace_id"]}, {"$set": upd})
    ws = await db.workspaces.find_one({"id": current["workspace_id"]}, {"_id": 0})
    return ws


@api.post("/leads/import")
async def csv_import_leads(body: Dict[str, Any], current=Depends(get_current_user)):
    import csv, io
    csv_text = body.get("csv_text") or ""
    if not csv_text.strip():
        raise HTTPException(status_code=400, detail="csv_text is empty")
    ws = await db.workspaces.find_one({"id": current["workspace_id"]}, {"_id": 0})
    default_assignee = (ws or {}).get("default_assignee_id") or current["id"]
    reader = csv.DictReader(io.StringIO(csv_text))
    headers = [h.strip().lower() for h in (reader.fieldnames or [])]
    if "name" not in headers or "mobile" not in headers:
        raise HTTPException(status_code=400, detail="CSV must include 'name' and 'mobile' columns")
    created = updated = errors = 0
    error_rows: List[str] = []
    for i, row in enumerate(reader, start=2):
        normalized = {(k or "").strip().lower(): (v or "").strip() for k, v in row.items()}
        try:
            res = await _capture_lead(current["workspace_id"], normalized, default_assignee)
            if res["status"] == "created":
                created += 1
            else:
                updated += 1
        except HTTPException as e:
            errors += 1
            error_rows.append(f"Row {i}: {e.detail}")
        except Exception as e:  # noqa
            errors += 1
            error_rows.append(f"Row {i}: {str(e)[:120]}")
    return {"created": created, "updated": updated, "errors": errors, "error_rows": error_rows[:20]}


app.include_router(api)
app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
