# LeadEmpire CRM — PRD

## Original Problem Statement
Build a multi-tenant SaaS Real Estate CRM + Telecalling + Sales Automation platform like TeleCRM/LeadSquared/Zoho. Brand: **LeadEmpire CRM**. Sellable to real estate businesses, brokers, builders, plot sellers, call centers and sales teams via monthly subscription. White-label ready.

## v1 (delivered Feb 2026)
### Core CRM
- JWT auth (email + password), workspace-on-signup
- Leads CRUD + duplicate detection (mobile)
- 14-stage pipeline with drag-drop Kanban (`@dnd-kit`)
- Followups + lead detail page

### Telecalling
- Click-to-call (`tel:` href)
- Call log with disposition + duration + auto-stage update

### Inventory
- Projects + Units (block, unit, size, facing, price, status: Available/Hold/Sold)

### Site Visits + Bookings (basic)
- Schedule visit, change status, auto-flow lead stage
- Bookings with token + payments ledger

### AI (Claude Sonnet 4.5 via Emergent LLM key)
- `POST /api/ai/lead-score` — 0-100 with label & reason
- `POST /api/ai/next-action` — best action + WhatsApp template
- `POST /api/ai/summary` — executive summary

### UI/UX
- Premium SaaS design (Outfit + Manrope, flat 1px borders, accent indigo)
- Dark/Light theme + Hindi/English i18n
- Responsive (mobile drawer sidebar)
- Landing page with pricing tiers
- 4 plans (Basic / Standard / Pro / Enterprise) — Stripe UI MOCKED in v1

### Multi-tenancy
- All data scoped via `workspace_id` (verified by tests)

## Test Results
- Backend pytest: **16/16 PASS** — auth, leads, calls, followups, inventory, site-visits, bookings, payments, dashboard stats, AI endpoints, demo seed, multi-tenant isolation.
- Frontend: 5/5 page renders pass.

## Test Credentials
`/app/memory/test_credentials.md` → demo@example.com / Demo@1234

## Phase 2 Backlog (P0 → P2)
- **P0** Live Stripe checkout (subscriptions); Razorpay switch for India
- **P0** WhatsApp Business API + bulk SMS/email campaigns
- **P0** Automation rules engine (no-code IF/THEN)
- **P1** Lead capture webhooks (Facebook/Instagram/Google Ads), CSV import UI
- **P1** Mobile attendance / GPS punch-in / call recording upload
- **P1** Document module (KYC / Aadhaar / PAN / agreements)
- **P1** Voice-to-note (whisper) + AI chatbot inbox
- **P2** White-label per-domain branding panel + custom CSS variables
- **P2** GST invoice PDF generation + ledger export
- **P2** Marketing module (landing-page builder, pixel attribution)
- **P2** Heatmaps, team incentive calculator
