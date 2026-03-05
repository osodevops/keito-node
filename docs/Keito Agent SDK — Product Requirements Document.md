# Keito Agent SDK — Product Requirements Document

## Executive Summary

This PRD defines the Keito Agent SDK: a typed, developer-friendly client library that enables AI agents to autonomously log billable time, track expenses, and create invoices against Keito's existing REST API. The SDK extends Keito from a human-centric time tracking platform into the first purpose-built **billable time tracker for AI agents** — capturing not just what agents cost (observability), but what agents earn (billable revenue).

The concept draws direct inspiration from AgentMail's approach of taking human infrastructure (email) and making it agent-native via a clean SDK and API-first design. Just as AgentMail gives agents their own email inboxes, Keito's Agent SDK gives agents their own timesheets — letting them track, bill, and invoice for the work they do on behalf of clients.[^1][^2]

The SDK will ship in TypeScript and Python, following AgentMail's developer experience patterns: resource-based client architecture, typed models, async-first design, built-in retries, and clean error hierarchies.

***

## Problem Statement

### The Billing Gap in the Agent Economy

The AI agent market is valued at $7.38 billion in 2025 and projected to reach $47.1 billion by 2030 at a 44.8% CAGR. As enterprises deploy agents to perform client-facing work — writing code, conducting research, handling support — a critical gap has emerged: **existing tooling tracks what agents cost, but not what they earn**.[^3]

Agent observability platforms (Langfuse, Braintrust, Helicone) track tokens consumed, latency, and compute costs. Agent billing platforms (Paid.ai, Nevermined, Orb) handle consumption-based pricing for AI products. But **neither category addresses the professional services use case**: a consultancy, agency, or firm deploying agents to do billable work for clients, where that work must be time-tracked, attributed to projects, and invoiced — exactly like human billable hours.[^4][^5][^6][^7][^8]

Traditional payment systems fail when agents perform variable work with unpredictable costs. Cost attribution across shared agents, cross-department workflows, and variable pricing is "the hardest unsolved operations problem in agentic AI". Tracking and billing cannot remain separate systems.[^9][^10]

### Why Keito Is Uniquely Positioned

Keito already has foundational primitives for agent support baked into its API:[^11]

- **`source` enum** with `agent` value on TimeEntry and Expense schemas
- **`user_type` enum** with `agent` value on User schema
- **`metadata`** field (arbitrary JSON, max 4KB) for storing agent-specific context
- **Harvest-compatible REST API** with full CRUD for time entries, expenses, projects, clients, tasks, invoices, and reports

The platform's flat pricing model (unlimited users, one price) is also structurally aligned — agents don't inflate per-seat costs. This is the exact problem AgentMail identified with legacy email: per-seat pricing doesn't work for agents.[^12][^1]

***

## Target Users

| Persona | Description | Primary Use Case |
|---------|-------------|------------------|
| **Agent Developer** | Engineers building AI agents that perform client work | Integrate time tracking into agent workflows via SDK |
| **Agency / Consultancy Owner** | Runs a firm where agents augment or replace human billable work | Track, report, and invoice agent-generated billable hours |
| **Platform Builder** | Building agent orchestration platforms (OpenClaw, custom) | Embed Keito as the billing layer for multi-agent systems |
| **Finance / Operations** | Responsible for invoicing and revenue recognition | Generate invoices that include both human and agent work |

***

## Product Vision & Principles

### Vision

Make Keito the default way professional services firms track and bill for AI agent work — just as it tracks human work today. Agents should be first-class billing entities, not an afterthought.

### Design Principles (Borrowed from AgentMail)

AgentMail's SDK design offers several patterns worth adopting:[^13][^14]

1. **Resource-based client architecture** — `client.timeEntries.create()`, not `client.createTimeEntry()`. Group methods by resource for discoverability, following the Stripe SDK pattern.[^15]
2. **Typed everything** — Full TypeScript types and Python dataclasses/Pydantic models. No raw dicts.
3. **Async-first, sync available** — Provide both `KeitorClient` and `AsyncKeitoClient` for flexibility.[^13]
4. **Built-in retries with exponential backoff** — Agents run unattended; transient failures must be handled automatically.[^13]
5. **Raw response access** — `.with_raw_response` for advanced use cases (headers, status codes).[^13]
6. **API key simplicity** — Single `kto_` API key, no complex OAuth flows. Mirrors AgentMail's `am_` key pattern.[^2]
7. **Open source SDKs** — MIT license, community contributions welcome.[^16]
8. **Framework-agnostic** — The SDK is a pure API client. Agent framework integrations (OpenClaw skill, MCP server, etc.) are separate concerns covered in dedicated PRDs.

***

## SDK Architecture

### Client Structure (TypeScript)

```typescript
import { Keito } from '@keito-ai/sdk';

const client = new Keito({
  apiKey: 'kto_...',
  accountId: 'acc_...',
  // Optional
  baseUrl: 'https://app.keito.io',
  maxRetries: 3,
  timeout: 30_000,
});

// Resource-based access
const entry = await client.timeEntries.create({
  projectId: 'proj_123',
  taskId: 'task_456',
  spentDate: '2026-03-05',
  hours: 1.5,
  notes: 'Automated code review for PR #842',
  source: 'agent',
  billable: true,
  metadata: {
    agentId: 'code-reviewer-v2',
    runId: 'run_abc123',
    model: 'claude-4-sonnet',
    tokensUsed: 45200,
    confidence: 0.94,
  },
});
```

### Client Structure (Python)

```python
from keito import Keito, AsyncKeito

client = Keito(api_key="kto_...", account_id="acc_...")

# Sync usage
entry = client.time_entries.create(
    project_id="proj_123",
    task_id="task_456",
    spent_date="2026-03-05",
    hours=1.5,
    notes="Automated code review for PR #842",
    source="agent",
    billable=True,
    metadata={
        "agent_id": "code-reviewer-v2",
        "run_id": "run_abc123",
        "model": "claude-4-sonnet",
        "tokens_used": 45200,
    },
)

# Async usage
async_client = AsyncKeito(api_key="kto_...", account_id="acc_...")
entry = await async_client.time_entries.create(...)
```

### SDK Resources

| Resource | Methods | Notes |
|----------|---------|-------|
| `client.timeEntries` | `create`, `get`, `update`, `delete`, `list` | Core — agents log billable time here |
| `client.expenses` | `create`, `get`, `list` | Track agent compute costs as client expenses |
| `client.projects` | `get`, `list` | Read-only for agents; look up project context |
| `client.tasks` | `get`, `list` | Read-only; resolve task IDs for time entries |
| `client.clients` | `get`, `list` | Read-only; resolve client context |
| `client.invoices` | `create`, `get`, `list`, `update` | Generate invoices including agent time |
| `client.invoices.messages` | `create`, `list` | Send invoices to clients |
| `client.users` | `me` | Identify the agent's own user record |
| `client.reports` | `teamTime` | Pull reports mixing human + agent hours |

***

## Core Features

### F1: Agent Identity & Registration

Agents operate as first-class users in Keito with `user_type: "agent"`. Each agent gets its own user record with:[^11]

- A unique user ID (used as `user_id` on time entries)
- Configurable `default_hourly_rate` (the agent's billable rate)
- Configurable `cost_rate` (the agent's compute cost rate)
- `weekly_capacity` for forecasting and utilization reporting

This mirrors how AgentMail gives each agent its own inbox identity — the agent is a first-class participant, not a shadow of a human user.[^2]

### F2: Billable Time Logging

The primary SDK action. Agents create time entries with `source: "agent"` automatically set:[^11]

- **Project + Task attribution** — every entry ties to a project and task, enabling per-client billing
- **Billable flag** — controls whether the time appears on invoices
- **Structured metadata** — stores agent-specific context (model used, run ID, token count, confidence score) in the 4KB metadata field[^11]
- **Timer support** — agents can start/stop timers for real-time tracking via `is_running` and `timer_started_at`
- **Idempotency** — metadata `run_id` enables deduplication to prevent double-logging

### F3: Agent Expense Tracking

Agents can log compute costs as project expenses:

- Map token usage, API call costs, or GPU time to expense categories
- Attribute costs to specific clients and projects
- Support `billable` flag for pass-through billing to clients

### F4: Source-Based Filtering & Reporting

The existing `source` filter on the API (`?source=agent,cli`) enables:[^11]

- **Agent-only dashboards** — filter time entries to see only agent-generated work
- **Blended reports** — team time reports that show human and agent hours side-by-side
- **Cost vs. revenue analysis** — compare agent compute costs (expenses) against billed revenue (time entries × billable rate)

### F5: Invoice Generation with Agent Line Items

Invoices can include line items from agent time entries, enabling:[^11]

- Mixed invoices (human + agent work on one invoice)
- Agent-only invoices for fully automated service delivery
- Transparent billing with agent metadata available for audit trails

### F6: Webhook Integration (Future Phase)

Real-time notifications when agent time entries are created, approved, or billed — enabling feedback loops for agent orchestration systems.

***



***

## Technical Specifications

### SDK Requirements

| Requirement | TypeScript | Python |
|------------|-----------|--------|
| **Package** | `@keito-ai/sdk` (npm) | `keito` (PyPI) |
| **Min Runtime** | Node.js 18+ | Python 3.9+ |
| **HTTP Client** | Built on `fetch` / configurable | Built on `httpx` / configurable |
| **Async** | Native async/await | `AsyncKeito` class with `httpx.AsyncClient`[^13] |
| **Types** | Full TypeScript types | Pydantic v2 models |
| **Auth** | Bearer token + Account ID header[^11] | Bearer token + Account ID header[^11] |
| **Retries** | Exponential backoff, 3 retries default | Exponential backoff, 3 retries default |
| **Error Handling** | Typed error hierarchy (`KeitoApiError`, `KeitoAuthError`, `KeitoNotFoundError`) | Same hierarchy as Python exceptions |
| **Pagination** | Auto-pagination iterator | Auto-pagination iterator |
| **License** | MIT | MIT |



### API Compatibility

The SDK targets the existing Keito API v2 endpoints. No backend changes are required for the initial release — the API already supports all necessary fields (`source: "agent"`, `user_type: "agent"`, `metadata`). Future phases may introduce agent-specific endpoints.[^11]

***

## Metadata Schema Convention

To enable consistent reporting and analytics across agents, the SDK should define a recommended metadata schema:

```json
{
  "agent": {
    "id": "code-reviewer-v2",
    "framework": "openclaw",
    "version": "1.4.0"
  },
  "run": {
    "id": "run_abc123",
    "parent_run_id": "run_parent456",
    "trigger": "webhook"
  },
  "model": {
    "provider": "anthropic",
    "name": "claude-4-sonnet",
    "tokens_in": 12500,
    "tokens_out": 32700,
    "cost_usd": 0.18
  },
  "quality": {
    "confidence": 0.94,
    "human_reviewed": false
  }
}
```

This enables filtering and reporting on agent performance, cost attribution per model, and audit trails — addressing the enterprise cost attribution challenge.[^17][^10]

***

## Phased Rollout

### Phase 1: SDK Core (Weeks 1–4)

- TypeScript and Python SDK packages
- Full CRUD for time entries and expenses
- Read access to projects, tasks, clients, users
- Auto-pagination, retries, typed errors
- Comprehensive documentation and quickstart guides
- Published to npm and PyPI

### Phase 2: Documentation & Developer Experience (Weeks 5–7)

- Comprehensive API reference (auto-generated from types)
- Quickstart guides for common agent frameworks
- Example repository: agents that log their own billable time
- Blog post: "Introducing the Keito Agent SDK"
- Published changelog and migration guide

### Phase 3: Invoicing & Reporting (Weeks 8–10)

- Invoice creation and management in SDK
- Agent-specific report endpoints
- Blended human + agent utilization dashboards
- Xero/QuickBooks sync for agent-generated invoices

### Phase 4: Advanced Agent Features (Weeks 11+)

- Webhook/websocket support for real-time event streams
- Agent budgets and spend caps (auto-stop when budget exhausted)
- Multi-agent attribution (when Agent A hands off to Agent B)[^18]
- Outcome-based billing support (bill per deliverable, not per hour)
- Rate card management (different rates for different agent types)

***

## Market Viability Assessment

### Why This Is a Good Idea

**The timing is right.** The AI agent market is growing at 44.8% CAGR, and enterprises are deploying agents for client-facing work at scale. Professional services firms — consultancies, agencies, law firms, accounting firms — are the natural adopters. They already think in billable hours; they just need to extend that model to agents.[^3]

**No one owns this category.** Agent observability tools (Langfuse, Braintrust, AgentOps) track cost and quality but don't connect to client billing. Agent billing platforms (Paid.ai, Orb, Nevermined) handle consumption pricing for AI products but don't address the professional services model. Keito sits at the intersection: it already knows how to track billable hours, invoice clients, and integrate with accounting systems (Xero, QuickBooks).[^5][^19][^7][^4][^12]

**The "billable hour for agents" narrative is powerful.** While some predict agents will kill the billable hour, the reality is more nuanced. Firms still need to bill clients for value delivered, and tracking agent work in hours provides a familiar, auditable framework. Over time, this can evolve toward value-based billing — but the infrastructure for tracking, attributing, and invoicing agent work is needed regardless of the billing model.[^20]

**Keito's flat pricing is a structural advantage.** Per-seat platforms penalize companies for adding agents. Keito's unlimited-users model means adding 10 or 100 agents doesn't change the bill — the exact structural advantage AgentMail identified for email inboxes.[^1][^12]

### Risks and Mitigations

| Risk | Mitigation |
|------|-----------|
| Professional services firms slow to adopt agents | Start with tech-forward agencies and consultancies already using agents; build case studies |
| "Billable hours" model becomes irrelevant | SDK metadata and reporting support value-based/outcome-based billing as an evolution path |
| Larger incumbents (Harvest, Toggl) add agent features | First-mover advantage + deeper agent-native features + OpenClaw ecosystem integration |
| Agent developers prefer raw API over SDK | SDK is thin wrapper; API remains fully accessible. SDK adds convenience, not lock-in |
| MCP/OpenClaw ecosystem fragmentation | Multi-framework support (MCP is the universal layer)[^21]; don't bet on one framework |

***

## Competitive Landscape

| Platform | What It Does | Agent Billing? | Time Tracking? | Invoicing? |
|----------|-------------|----------------|----------------|------------|
| **Keito (with Agent SDK)** | Billable time tracking + invoicing for humans and agents | ✅ Billable hours | ✅ Core feature | ✅ Built-in |
| **Harvest / Toggl** | Human time tracking | ❌ | ✅ | ✅ / ❌ |
| **Paid.ai** | Agent cost tracking + consumption billing[^18] | Consumption only | ❌ | ❌ |
| **AgentPaid** | Agent billing + observability[^4] | Consumption only | ❌ | ❌ |
| **Orb** | Usage-based billing infrastructure[^8] | Consumption only | ❌ | ❌ |
| **Langfuse / Braintrust** | Agent observability + cost tracking[^6][^5] | ❌ Cost only | ❌ | ❌ |
| **Nevermined** | Micro-task metering for agents[^3] | Consumption only | ❌ | ❌ |

Keito's unique positioning: the only platform that connects agent work → billable time → client invoices in a single flow.

***

## Success Metrics

| Metric | Target (6 months) |
|--------|-------------------|
| SDK downloads (npm + PyPI combined) | 5,000+ |
| Active API keys using `source: "agent"` | 200+ |
| Agent time entries per month | 50,000+ |

| Invoices containing agent line items | 1,000+ |
| Revenue from agent-heavy accounts | 20% of new MRR |

***

## Conclusion

The Keito Agent SDK transforms Keito from a human time tracking tool into the billing backbone for the agent economy. By adopting AgentMail's developer-first SDK patterns, shipping an OpenClaw skill and MCP server for immediate ecosystem integration, and leveraging Keito's existing agent-ready API primitives, this project addresses a gap no existing platform covers: tracking what agents earn, not just what they cost. The professional services industry's $700B+ market is just beginning to deploy agents for client work — Keito can own the billing layer for that transition.

---

## References

1. [Launch HN: AgentMail (YC S25) – An API that gives agents their ...](https://news.ycombinator.com/item?id=46812608) - Hey HN, we're Haakam, Michael, and Adi. We're building AgentMail (https://agentmail.to), the email i...

2. [Quickstart - AgentMail | Documentation](https://docs.agentmail.to/quickstart) - Follow this guide to make your first AgentMail API request and create a new email inbox.

3. [49 Micro-Task Metering in AI Agents Statistics - Nevermined](https://nevermined.ai/blog/micro-task-metering-ai-agents-statistics)

4. [AgentPaid: Simplify AI Agent Billing and Observability with Precision](https://www.agentpaid.ai) - Discover AgentPaid, the ultimate platform for AI agent billing and observability. Streamline workflo...

5. [5 best AI agent observability tools for agent reliability in 2026 - Articles](https://www.braintrust.dev/articles/best-ai-agent-observability-tools-2026) - Compare the top AI agent observability platforms: Braintrust, Vellum, Fiddler, Helicone, and Galileo...

6. [Top 5 AI Agent Observability Platforms 2026 Guide | Articles | o-mega](https://o-mega.ai/articles/top-5-ai-agent-observability-platforms-the-ultimate-2026-guide) - Discover the best AI agent observability platforms for 2026. Track agent decisions, debug workflows,...

7. [How to Do AI Agent Billing in 2026: Patterns, Playbooks, and ...](https://nevermined.ai/blog/ai-agent-billing-patterns)

8. [Pricing AI agents: Plans, costs, and monetization models - Orb](https://www.withorb.com/blog/pricing-ai-agents) - Solve your usage-based billing needs with a flexible tool that fits your customers, teams, and stack...

9. [Why tracking and billing can't be separate systems anymore - Paid.ai](https://paid.ai/blog/ai-monetization/why-tracking-and-billing-cant-be-separate-systems-anymore) - The monetization platform built for AI-native companies. Optimize pricing, packaging, and cost track...

10. [Cost Attribution for Agent Work: Every Dollar Gets a Name | AgentPMT](https://www.agentpmt.com/articles/cost-attribution-for-agent-work-every-dollar-gets-a-name) - How to attribute every dollar of agent spend to a specific workflow, run, and tool call -- and why a...

11. [openapi-v2.yaml](https://ppl-ai-file-upload.s3.amazonaws.com/web/direct-files/attachments/28238193/6ca3a356-c6d2-45ee-8ae0-b8e1521c3081/openapi-v2.yaml?AWSAccessKeyId=ASIA2F3EMEYER56YSQBR&Signature=3BbhtkfBJSGfcuAzn2l%2BFOgmZ9U%3D&x-amz-security-token=IQoJb3JpZ2luX2VjEAwaCXVzLWVhc3QtMSJHMEUCIDaixnrlOtSltw%2F3JesEwzuKJEVC8fNxeHTR3u6bsOX0AiEA70SU89a414dVudRRjh9zJsaTE5Q7W2%2FVNHIpaQtZqmkq%2FAQI1f%2F%2F%2F%2F%2F%2F%2F%2F%2F%2FARABGgw2OTk3NTMzMDk3MDUiDH5PxNdhgx3niup6%2FCrQBDMR7Ghw%2FYCfPqH7l1jdLVLaHXNn8NddrS6eHPMdzx1xpD9QsupjexfNCd0Ak7lOjFywHtLAA0WPEXKuimTGIrULsm1bHHz6dxIauCGZRDRnfAKO590BMATGELCTGBdQs5SyFzdlPj98uXWs8uS9%2Fxhwbmo3dVd1g%2FQBvPQ0lkR%2BMkzAht0QqLJ91fTEUVbQ6VzkYS2FJBoZBxK%2FU5%2BKjDPk0k8DHjbvoMTi7gkp%2Bq5GOvnzopjYMuQLm6KLQORsNcTbBGGaYKUgXaoQbh%2BHj8r%2Bqh5XeLPIgYYLEj1LK65ac3EVdH3F0JtZv5AmKy48T2an%2Bot23t%2FNN%2BNPwMMuWuAGHvduxzcAw9iW%2B6gDKo9c%2FM%2FRhk1qD72WSb830A0pCYQ5f7j%2Fww1T1eLFIs0ioV5ZTAUeBAVm0RCVsjKVbtXwzJ8sEMYKke%2FANK6dUFtENw%2F0QuORqLyfxMd4TtQSVl9AOVwfgXr9rAkZCNG%2FbbeldCfp2VlOO%2FBecH6fPZUuqxntBglxlDxFhdXpGtLa2jl%2FzAt1l0ZIP1OZuLmTZCyFff8WCu7PUi5mGrpuQiDIx4DHDgzJBqegiRIqHpiwe%2FMC1D7KaBZldpAhQvgdvAu0qtnKoViBayTUjDoabbt1%2FdjfmOOJlmGr8jF1ayMvgy1W0QKhCWOzPtN0NE96Fj3X0CmEYOt5R7NlkKeyNBjWklXe5WtbalGXzSrtxpeAU8X7Xekry3bbGrI8PQtH%2Bm0%2FeA2QQRzIcir6c2sm9AIV1VT%2BM8OHFeT8rBw5wAIs%2BXEw%2BrGnzQY6mAFtilQMeOdvJD499Ypxh47pTbMXR7E3PTJvZqQkwBhYtQZHqXvKH8k954IPNjslLyDtztX1wCw5OlFj3sV9243ux3xd5TlfmVJYyJQVGoVGwQBBXq0ShktiM7ImZiysUJBGqF8rWgKqt5a7b3pCAjeXJiId%2BfvhyYpwzAF6ZpqFZpHQOYvU8GvfwZrU9TP3iRaQYB4YrBZrkg%3D%3D&Expires=1772742961) - openapi: 3.0.3
info:
title: Keito API v2
description: |
Harvest-compatible REST API for time trackin...

12. [Keito - Time Tracking & Invoicing for Professional Services](https://keito.ai) - The time tracking platform that doesn't punish your growth. Unlimited users, one flat price. Track t...

13. [agentmail](https://pypi.org/project/agentmail/) - None

14. [agentmail by agentmail-to/agentmail-skills - Skills.sh](https://skills.sh/agentmail-to/agentmail-skills/agentmail) - Discover and install skills for AI agents.

15. [designing-sdks skill by ancoleman/ai-design-components - playbooks](https://playbooks.com/skills/ancoleman/ai-design-components/designing-sdks) - This skill helps you design production-ready SDKs with robust error handling, retries, and paginatio...

16. [AgentMail Toolkit - GitHub](https://github.com/agentmail-to/agentmail-toolkit) - The AgentMail Toolkit integrates popular agent frameworks and protocols including OpenAI Agents SDK,...

17. [Solving the Cost Attribution Problem in Agent-AI Systems](https://www.linkedin.com/posts/prakash-kumar-00798221b_agentai-costattribution-finops-activity-7395508598207852544-VPtn) - 💰 Cost attribution in Agent-AI systems is where shared infrastructure meets organizational politics....

18. [AI Billing Showdown: 6 Billing Platforms for AI Agents](https://paid.ai/blog/billing/ai-billing-showdown-6-billing-platforms) - Agent-Native Tracking. Traditional platforms track "users" or "API calls." AI platforms need to trac...

19. [Top 5 Leading Agent Observability Tools in 2025 - Maxim AI](https://www.getmaxim.ai/articles/top-5-leading-agent-observability-tools-in-2025/) - TL;DR As AI agents become the backbone of enterprise automation, agent observability has evolved fro...

20. [Why AI Agents Will Kill the 'Billable Hour' - AiThority](https://aithority.com/guest-authors/why-ai-agents-will-kill-the-billable-hour/) - AI agents autonomously automating much of the "work between the work", firms can finally align their...

21. [Mcp: The Glue Layer That's...](https://codewheel.ai/blog/ai-agent-orchestration-openclaw-mcp-landscape/) - OpenClaw's rise, the ClawHavoc supply-chain attack, MCP as the standard glue layer, and what it take...
