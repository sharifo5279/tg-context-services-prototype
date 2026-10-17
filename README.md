# Trading Grid Context Services Prototype

A working prototype of Trading Grid exposed as governed MCP tools for customer agents (SAP Joule, Microsoft Copilot Studio, Google Gemini Enterprise, Claude). It runs on seeded retail data and is not connected to production Trading Grid.

## Contents

- **95 MCP tools** from the incubation brief across Community Management, TG Insights, Cartographer, Community Projects and Provisioning, and Data Explorer over Trading Grid Data Platform. CMS response fields follow the v2 to v5 Swagger exports. Other products use modeled contracts, and each tool is labeled with its contract basis.
- **Evidence envelope** on every response: source references, observed time, freshness, completeness, missing evidence and the access decision.
- **Entitlements:** organization, BUID, solution and operation checks on every call. The SAP Joule service identity does not hold payload access.
- **Approval-gated changes:** every change goes through prepare, approve, recheck, submit and track. Each approval is bound to one plan's exact parameters, can be used once and expires after 30 minutes.
- **7 agents** based on Trading Grid Aviator agents and Innovation Guide scenarios, plus **40 retail use cases**.
- **Console:** agent definition and run views with a live tool trace, a tool catalog with per-tool testing, approvals, MCP credentials and an audit log.
- **Remote MCP endpoint:** `POST /mcp` with `Authorization: Bearer <token>`, or `POST /mcp/k/<token>` for clients that cannot send custom headers.

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
