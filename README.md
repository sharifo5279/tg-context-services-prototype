# Trading Grid Context Services Prototype

A working prototype of Trading Grid exposed as governed MCP tools for customer agents (SAP Joule, Microsoft Copilot Studio, Google Gemini Enterprise, Claude). It runs on seeded retail data and is not connected to production Trading Grid.

## Demo surfaces

| Surface | Path | Role |
|---|---|---|
| Demo journey | `/` | Scene-by-scene script for recording |
| Trading Grid Online | `/tgo/insights`, `/tgo/access` | TG Insights transactions, TG Aviator chat, agent access administration (suspend and restore) |
| Aviator Studio | `/studio` | Agents built on Trading Grid Context Services; simulate with live tool trace and approvals |
| Trading Grid Context Services | `/cs` | Service layer: tools, clients and endpoint, access and audit, approvals |
| External ecosystem client | `/ext` | Simulated Copilot Studio, Gemini Enterprise, SAP Joule and Claude clients routed through the Aviator AKS gateway |

## Contents

- **128 MCP tools**: 95 from the incubation brief across Community Management, TG Insights, Cartographer, Community Projects and Provisioning, and Data Explorer over Trading Grid Data Platform. CMS response fields follow the v2 to v5 Swagger exports. Other products use modeled contracts, and each tool is labeled with its contract basis. 33 application tools cover Command Center Integration Monitor (11), TG Insights application features (11) and Command Center Performance Monitor (11, incubation), modeled on the Innovation Guide.
- **Every Aviator Studio agent is published to every external client by default** and appears as an MCP tool. Unpublish in Studio Deployments or a block in Trading Grid Online Agent access removes it.
- **Evidence envelope** on every response: source references, observed time, freshness, completeness, missing evidence and the access decision.
- **Entitlements:** organization, BUID, solution and operation checks on every call. The SAP Joule service identity does not hold payload access.
- **Approval-gated changes:** every change goes through prepare, approve, recheck, submit and track. Each approval is bound to one plan's exact parameters, can be used once and expires after 30 minutes.
- **8 agents** (TG Aviator plus seven Aviator Studio agents) based on Trading Grid Aviator agents and Innovation Guide scenarios, plus **40 retail use cases**.
- **Console:** agent definition and run views with a live tool trace, a tool catalog with per-tool testing, approvals, MCP credentials and an audit log.
- **Remote MCP endpoint:** `POST /mcp` with `Authorization: Bearer <token>`, or `POST /mcp/k/<token>` for clients that cannot send custom headers.

## Command Center client

A second tenant serves the Aviator panel in OpenText Command Center: Northfield Stores (retailer) and Nuvori Beauty (CPG supplier), isolated from the Harborview world.

- Endpoint: `POST /cc/mcp` (Streamable HTTP, stateless), Trading Grid Agent plus 12 read-only tools over the tenant data. `GET /cc/health` reports readiness.
- Browser calls only from `CC_ALLOWED_ORIGINS` (default `https://process-genome.onrender.com` and localhost:8765), one client token per perspective derived from `CC_CLIENT_SECRET`.
- Gateway limit: `CC_AGENT_CALLS_PER_MINUTE` (20) and `CC_AGENT_CALLS_PER_DAY` (400) per tenant.
- Tenant data: `src/cc/tenant.json`, exported from the Command Center prototype with `node tools/command-center/export-tenant.cjs` in process-genome.

## Run locally

```
npm install
npm run build
ANTHROPIC_API_KEY=... npm start   # http://localhost:3000
npm test                          # tool-level checks for all 40 use cases
```

## Environment variables

| Variable | Purpose | Default |
|---|---|---|
| `ANTHROPIC_API_KEY` | Agent runtime. Required for agent runs. | none |
| `ANTHROPIC_MODEL` | Model for agent runs | `claude-haiku-5-5` |
| `DEMO_PASSWORD` | Console password | `OpenText1000!` |
| `MCP_SECRET` | Seed for per-platform MCP tokens | `DEMO_PASSWORD` |
| `PUBLIC_URL` | Base URL used in links | request host |

Data resets when the service restarts.

## Test scenarios

282 executable scenarios cover all 132 tools: happy path, filters, pagination, not found, ambiguous input, access denied, tenant isolation, partial evidence, validation and approval flows. Run them in the console (Context Services, Test scenarios) or with `npm test`. Run all resets demo data before each scenario and restores it afterwards. Scenarios with an agent prompt can also be run through any published agent.

## World model

About 30 trading partners exchange roughly 1,000 business documents per weekday. Six months of history are generated per day from a fixed seed, and the next 30 days are generated ahead and released as time passes. Traffic follows business hours, weekdays, month-end invoice peaks and the holiday season; partners onboard and go quiet over time. Endpoint outages, acknowledgment outages, pickup stalls, map regressions, cross-reference gaps and document errors occur at random rates. Demo changes (approvals, cross-reference edits, reprocessing, publishing, audit) persist in Postgres when `DATABASE_URL` is set.
