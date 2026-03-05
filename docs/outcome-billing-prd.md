# Outcome-Based Agent Billing — PRD Addendum

**Parent PRD:** Keito Agent SDK  
**Version:** 1.0  
**Date:** 5 March 2026  
**Status:** Draft  

> Drop this section into the main SDK PRD after the existing Core Features (F1–F6).

---

## Expanded Scope: From "Agent Time" to "Agent Work"

The Keito Agent SDK is not limited to tracking billable hours. It supports any billable unit of work an agent produces — time, outcomes, or a hybrid of both. This applies to **any company using agents to perform revenue-generating or cost-saving work**, not just professional services firms.

### Why This Matters

The market is splitting into three agent pricing models:

| Model | Unit | Example | Keito Mapping |
|-------|------|---------|---------------|
| **Time-based** | Hours worked | "2.5h code review for Client X" | `TimeEntry` with `hours`, `billable_rate` |
| **Outcome-based** | Result delivered | "1 support ticket resolved" | `TimeEntry` with `hours=0` + outcome metadata, or direct `InvoiceLine` |
| **Hybrid** | Base hours + outcome bonus | "4h research + 3 qualified leads" | `TimeEntry` (hours) + outcome entries |

77% of business leaders report customers pushing for outcome-based pricing, yet only 32% of businesses currently define "usage" in outcome terms. Sierra's AI agent charges per resolved conversation — if the bot can't close the issue, there's no charge. Intercom's Fin agent bills $0.99 per ticket resolved. The pattern is clear: agents are increasingly priced on results, not effort.

Traditional agent billing platforms (Paid.ai, Orb, Nevermined) handle consumption-based pricing for AI products — tokens, API calls, compute. But they don't connect outcomes to **client billing and invoicing**. Keito bridges that gap.

---

## F7: Outcome Logging

### Overview

A new SDK convenience layer that lets agents log discrete **outcomes** — billable events that aren't measured in hours. Under the hood, outcomes map to existing Keito primitives (time entries with `hours=0` or direct invoice line items), keeping the API surface unchanged while the SDK provides a purpose-built developer experience.

### SDK Interface (TypeScript)

```typescript
// Log a billable outcome
const outcome = await client.outcomes.log({
  projectId: 'proj_123',
  taskId: 'task_456',
  spentDate: '2026-03-05',
  source: 'agent',
  outcome: {
    type: 'ticket_resolved',
    description: 'Resolved billing inquiry #4821 via email',
    unitPrice: 0.99,           // billable amount per outcome
    quantity: 1,
    success: true,
    evidence: {
      ticketId: 'TKT-4821',
      resolutionTime: 45,      // seconds
      customerConfirmed: true,
      reopenWindow: 72,        // hours — no reopen = confirmed resolved
    },
  },
  metadata: {
    agentId: 'support-agent-v3',
    runId: 'run_xyz789',
    model: 'claude-4-sonnet',
    tokensUsed: 8200,
  },
});
```

### SDK Interface (Python)

```python
outcome = client.outcomes.log(
    project_id="proj_123",
    task_id="task_456",
    spent_date="2026-03-05",
    source="agent",
    outcome={
        "type": "ticket_resolved",
        "description": "Resolved billing inquiry #4821 via email",
        "unit_price": 0.99,
        "quantity": 1,
        "success": True,
        "evidence": {
            "ticket_id": "TKT-4821",
            "resolution_time": 45,
            "customer_confirmed": True,
        },
    },
    metadata={
        "agent_id": "support-agent-v3",
        "run_id": "run_xyz789",
    },
)
```

### How It Maps to Existing API

The `outcomes.log()` method is a convenience layer. Under the hood:

```
client.outcomes.log({...})
          │
          ├── Creates a TimeEntry with:
          │     hours: 0
          │     billable: true
          │     source: "agent"
          │     notes: outcome.description
          │     metadata: {
          │       outcome_type: "ticket_resolved",
          │       outcome_unit_price: 0.99,
          │       outcome_quantity: 1,
          │       outcome_success: true,
          │       outcome_evidence: {...},
          │       agent_id: "...",
          │       run_id: "...",
          │     }
          │
          └── (Optional) On invoice generation, SDK can
              auto-convert outcome entries into InvoiceLine items:
                kind: "Service"
                description: "Ticket resolved: #4821"
                quantity: 1
                unit_price: 0.99
```

**No backend changes required.** The existing `TimeEntry` schema with `metadata` (4KB arbitrary JSON) and `hours: 0` supports this pattern today. The SDK just makes it ergonomic.

---

## F8: Outcome Types Registry

### Overview

A set of pre-defined outcome types that standardise how agents report common billable events. Developers can use built-in types or define custom ones.

### Built-in Outcome Types

| Type | Description | Typical Unit Price |
|------|-------------|-------------------|
| `ticket_resolved` | Support ticket resolved without escalation | $0.50 – $2.00 |
| `lead_qualified` | Sales lead qualified and routed | $5.00 – $50.00 |
| `meeting_booked` | Meeting scheduled with prospect | $10.00 – $100.00 |
| `document_generated` | Report, contract, or document produced | $1.00 – $25.00 |
| `code_review_completed` | Pull request reviewed with feedback | $5.00 – $50.00 |
| `data_processed` | Dataset cleaned, transformed, or analysed | $0.10 – $5.00 |
| `email_sent` | Personalised email drafted and sent | $0.25 – $2.00 |
| `invoice_created` | Invoice generated and sent to client | $1.00 – $10.00 |
| `workflow_completed` | Multi-step automation finished successfully | Variable |
| `custom` | User-defined outcome type | User-defined |

### Usage

```typescript
import { OutcomeTypes } from '@keito-ai/sdk';

await client.outcomes.log({
  projectId: 'proj_123',
  taskId: 'task_456',
  spentDate: '2026-03-05',
  outcome: {
    type: OutcomeTypes.LEAD_QUALIFIED,
    description: 'Qualified inbound lead from demo request',
    unitPrice: 25.00,
    quantity: 1,
    success: true,
    evidence: {
      leadId: 'lead_abc',
      score: 85,
      source: 'demo_request',
    },
  },
});
```

---

## F9: Blended Time + Outcome Reporting

### Overview

Agents often do work that has both a time component (hours spent) and an outcome component (result produced). The SDK and reporting layer should support querying both in a unified view.

### Report Dimensions

| Dimension | Time-Based | Outcome-Based |
|-----------|-----------|---------------|
| **Per Agent** | Total hours, billable hours, utilisation | Outcomes delivered, success rate, revenue |
| **Per Client** | Hours billed, cost rate vs. bill rate | Outcomes billed, avg unit price, total value |
| **Per Project** | Budget consumed (hours or £) | Outcomes quota vs. delivered |
| **Per Period** | Weekly/monthly hours trend | Outcome volume trend, revenue trend |

### SDK Helpers

```typescript
// Get blended summary for an agent
const summary = await client.reports.agentSummary({
  userId: 'agent_user_123',
  from: '2026-03-01',
  to: '2026-03-31',
});

// Returns:
// {
//   time: { totalHours: 42.5, billableHours: 38.0, revenue: 5700.00 },
//   outcomes: { total: 312, successful: 298, revenue: 295.02 },
//   combined: { totalRevenue: 5995.02 }
// }
```

---

## Updated Target Users

The following replaces the Target Users table in the main PRD:

| Persona | Description | Billing Model |
|---------|-------------|---------------|
| **Consultancy / Agency** | Deploys agents for client-facing project work | Time-based (hours × rate) |
| **SaaS Company** | Offers AI-powered features billed per outcome | Outcome-based (per resolution, per lead) |
| **Internal Ops Team** | Uses agents for finance, HR, RevOps automation | Time-based (internal cost tracking) |
| **AI Platform Builder** | Builds multi-agent products, needs billing layer | Hybrid (time + outcomes) |
| **Managed Service Provider** | Resells agent workflows to clients | Outcome-based or hybrid |

---

## Updated Problem Statement Language

Replace references to "professional services firms" with:

> "Any company using AI agents to perform work that generates revenue, saves costs, or delivers measurable outcomes for clients or internal stakeholders."

Replace "billable time for AI agents" with:

> "Billable work — measured as time, outcomes, or both — for AI agents."

---

## Updated Executive Summary Language

Suggested replacement for the first paragraph:

> This PRD defines the Keito Agent SDK: a typed, developer-friendly client library that enables AI agents to autonomously log billable work — both time and outcomes — against Keito's existing REST API. The SDK extends Keito from a human-centric time tracking platform into the first purpose-built **billable work tracker for AI agents**, capturing not just what agents cost (observability), but what agents earn (billable revenue) across time-based, outcome-based, and hybrid billing models.

---

## Open Questions (Outcome-Specific)

1. **Outcome verification** — Should outcomes require human confirmation before becoming billable? (e.g., "ticket not reopened within 72 hours" auto-confirms)
2. **Outcome disputes** — What happens when a client disputes an outcome? Should the SDK support `outcome.dispute()` or `outcome.void()`?
3. **Outcome caps** — Should there be per-client or per-project outcome volume caps to prevent bill shock?
4. **Revenue recognition** — How should outcome revenue be recognised? On delivery, on confirmation, or on invoice payment?
5. **Outcome-to-invoice automation** — Should the SDK support auto-generating invoice line items from a period's outcomes (e.g., "312 tickets × $0.99 = $308.88")?

---

*This addendum is designed to be merged into the main Keito Agent SDK PRD.*
