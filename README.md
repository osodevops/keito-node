# Keito Node.js SDK

[![npm version](https://img.shields.io/npm/v/@keito-ai/sdk.svg?style=flat-square)](https://www.npmjs.com/package/@keito-ai/sdk)
[![CI](https://img.shields.io/github/actions/workflow/status/osodevops/keito-node/ci.yml?style=flat-square&label=tests)](https://github.com/osodevops/keito-node/actions)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue?style=flat-square)](https://www.typescriptlang.org/)
[![License: MIT](https://img.shields.io/npm/l/@keito-ai/sdk?style=flat-square)](https://opensource.org/licenses/MIT)
[![Node](https://img.shields.io/node/v/@keito-ai/sdk?style=flat-square)](https://nodejs.org/)

The official Node.js SDK for the [Keito API](https://keito.ai) — track billable time, expenses, and invoices for humans and AI agents.

Keito is the first purpose-built **billable work tracker for AI agents**, capturing not just what agents cost, but what they earn. The SDK supports time-based, outcome-based, and hybrid billing models.

## Installation

```bash
npm install @keito-ai/sdk
```

> **Requirements:** Node.js 18+ (uses native `fetch`). Zero runtime dependencies.

## Quickstart

```typescript
import { Keito } from '@keito-ai/sdk';

const client = new Keito({
  apiKey: process.env.KEITO_API_KEY!,
  accountId: process.env.KEITO_ACCOUNT_ID!,
});

// Log billable time for an AI agent
const entry = await client.timeEntries.create({
  project_id: 'proj_123',
  task_id: 'task_456',
  spent_date: '2026-03-05',
  hours: 1.5,
  notes: 'Automated code review for PR #842',
  source: 'api',
  billable: true,
  metadata: {
    agent_id: 'code-reviewer-v2',
    run_id: 'run_abc123',
    model: 'claude-4-sonnet',
    tokens_used: 45200,
  },
});

console.log(entry.id);
```

## Authentication

The SDK uses API key authentication. Pass your key and Company ID when creating the client, or set `KEITO_API_KEY` and `KEITO_ACCOUNT_ID` and call `new Keito()`:

```typescript
const client = new Keito({
  apiKey: 'kto_...',       // Your Keito API key
  accountId: 'acc_...',    // Your Keito account ID
});
```

We recommend using environment variables to keep your keys secure. Never commit API keys to source control.

## Configuration

| Option | Default | Description |
|--------|---------|-------------|
| `apiKey` | `KEITO_API_KEY` environment variable | Your Keito API key (`kto_...`) |
| `accountId` | `KEITO_ACCOUNT_ID` environment variable | Your Keito Company ID |
| `baseUrl` | `https://app.keito.ai` | API origin; a trailing `/api/v2` is also accepted |
| `maxRetries` | `3` | Max retries for reads and explicitly idempotent mutations |
| `timeout` | `30000` | Request timeout in milliseconds |

```typescript
const client = new Keito({
  apiKey: 'kto_...',
  accountId: 'acc_...',
  baseUrl: 'https://app.keito.ai',
  maxRetries: 3,
  timeout: 30_000,
});
```

Explicit credentials take precedence over environment values. Missing credentials fail locally before a request. A key follows its bound identity's current permissions; use **All permitted operations** for writes. Personal read-only sync keys cannot create expenses or time entries. Keep keys in trusted server-side or local application code.

`baseUrl` accepts an HTTP(S) origin, with an optional `/api/v2` suffix. Other path prefixes, URL credentials, queries and fragments are refused. Requests do not follow redirects, so configure the final API origin directly.

## Resources

The SDK follows a resource-based architecture. Each API resource is accessed as a property on the client:

| Resource | Methods | Description |
|----------|---------|-------------|
| `client.timeEntries` | `list` `create` `startTimer` `stopTimer` `restartTimer` `update` `delete` | Log and manage billable time |
| `client.expenses` | `list` `get` `create` `update` `delete` `uploadReceipt` `downloadReceipt` `deleteReceipt` | Track expenses and their receipt files |
| `client.projects` | `list` | Browse projects |
| `client.clients` | `list` `get` `create` `update` | Manage client records |
| `client.contacts` | `list` `create` | Manage client contacts |
| `client.tasks` | `list` | Browse tasks |
| `client.users` | `me` | Get current user |
| `client.invoices` | `list` `get` `create` `update` `delete` | Create and manage invoices |
| `client.invoices.messages` | `list` `send` | Send invoices to clients |
| `client.reports` | `teamTime` `agentSummary` | Reporting and analytics |
| `client.outcomes` | `log` | Log outcome-based billable events |

## Usage Examples

### Time Entries

```typescript
// List time entries with filters
const entries = await client.timeEntries.list({
  project_id: 'proj_123',
  source: 'api',
  from: '2026-03-01',
  to: '2026-03-31',
});

console.log(entries.data); // TimeEntry[]

// Create a time entry
const entry = await client.timeEntries.create({
  project_id: 'proj_123',
  task_id: 'task_456',
  spent_date: '2026-03-05',
  hours: 2.0,
  source: 'api',
  billable: true,
});

// Start a running timer. Omit started_time to start at the server's current time.
const timer = await client.timeEntries.startTimer({
  project_id: 'proj_123',
  task_id: 'task_456',
  spent_date: new Date().toISOString().split('T')[0],
  source: 'api',
  replace_running: true,
});

// Stop a running timer. The API calculates elapsed duration server-side.
await client.timeEntries.stopTimer(timer.id, {
  notes: 'Finished implementation',
});

// Update a time entry
await client.timeEntries.update('te_abc', {
  hours: 2.5,
  notes: 'Updated estimate',
});

// Delete a time entry
await client.timeEntries.delete('te_abc');
```

### Expenses

```typescript
const expense = await client.expenses.create({
  project_id: 'proj_123',
  expense_category_id: 'cat_compute',
  spent_date: '2026-03-05',
  total_cost: 4.20,
  notes: 'GPU compute for batch inference',
  source: 'api',
  billable: true,
  metadata: {
    provider: 'aws',
    instance_type: 'p4d.24xlarge',
    duration_minutes: 45,
  },
});

const saved = await client.expenses.get('expense_id');
await client.expenses.update('expense_id', { notes: 'Receipt checked' }, {
  idempotencyKey: 'expense-update-001',
});

// Use a real Blob, for example from a local PDF file's bytes.
await client.expenses.uploadReceipt('expense_id', new Blob([pdfBytes], {
  type: 'application/pdf',
}), 'receipt.pdf');
const receipt = await client.expenses.downloadReceipt('expense_id');
const bytes = await receipt.arrayBuffer();
await client.expenses.deleteReceipt('expense_id');
await client.expenses.delete('expense_id');
```

Every expense needs a visible project and an active expense category. Amount-based categories require `total_cost`; per-unit categories require `units` and use the category's configured price. The server checks editable state, approval, billing and timesheet locks.

Receipt upload sends multipart field `file`, with a maximum of 9 MiB. Supported types are PDF, JPEG, PNG, GIF, WebP, HEIC, HEIF and TIFF. Keep the created expense ID when an upload fails so retrying the file does not create another expense. Receipt upload and removal are never automatically retried and do not accept an idempotency option. Uploading a receipt does not by itself select it for client invoice delivery; use `attach_receipt_to_invoice` when appropriate.

### Invoices

```typescript
// Create an invoice
const invoice = await client.invoices.create({
  client_id: 'cl_abc',
  payment_term: 'net_30',
  subject: 'March 2026 — Agent Services',
  line_items: [
    {
      kind: 'Service',
      description: 'AI code review — 42 PRs',
      quantity: 42,
      unit_price: 15.00,
      taxed: false,
      taxed2: false,
    },
  ],
});

// Send the invoice
await client.invoices.messages.send(invoice.id!, {
  recipients: [{ name: 'Jane Smith', email: 'jane@acme.com' }],
  subject: 'Invoice from Keito',
  body: 'Please find your invoice attached.',
  attach_pdf: true,
  send_me_a_copy: false,
  include_attachments: false,
  event_type: 'send',
});
```

### Current User

```typescript
const me = await client.users.me();
console.log(me.email, me.user_type); // "agent@company.com" "agent"
```

## Pagination

List methods return a `PaginatedResponse<T>` with built-in auto-pagination. You can iterate through all items across pages without managing page tokens:

```typescript
// Auto-paginate through all time entries
for await (const entry of await client.timeEntries.list({ source: 'agent' })) {
  console.log(entry.id, entry.hours);
}
```

You can also work with individual pages:

```typescript
const page = await client.timeEntries.list({ per_page: 50 });

console.log(page.data);          // TimeEntry[] — current page
console.log(page.total_entries);  // total across all pages
console.log(page.total_pages);

if (page.hasNextPage()) {
  const next = await page.nextPage();
}
```

## Error Handling

The SDK throws typed errors for different failure modes. All errors extend `KeitoError`:

```typescript
import { Keito, KeitoApiError, KeitoRateLimitError } from '@keito-ai/sdk';

try {
  await client.timeEntries.create({ ... });
} catch (err) {
  if (err instanceof KeitoRateLimitError) {
    console.log(`Rate limited. Retry after ${err.retryAfter}s`);
  } else if (err instanceof KeitoApiError) {
    console.log(err.status);            // 400, 401, 403, 404, 409, etc.
    console.log(err.error);             // "bad_request"
    console.log(err.error_description); // "project_id is required"
  }
}
```

| Error Class | Status | When |
|-------------|--------|------|
| `KeitoAuthError` | 401 | Invalid or missing API key |
| `KeitoForbiddenError` | 403 | Insufficient permissions |
| `KeitoNotFoundError` | 404 | Resource doesn't exist |
| `KeitoConflictError` | 409 | Conflict (e.g. deleting approved entry) |
| `KeitoRateLimitError` | 429 | Too many requests |
| `KeitoTimeoutError` | — | Request timed out |
| `KeitoConnectionError` | — | Network failure |

### Retries

Reads automatically retry transient failures (status 408, 429, 500, 502, 503, 504) and network errors with exponential backoff and jitter. On 429 responses, the SDK respects the `Retry-After` header. Mutations are not replayed automatically unless the method accepts request options and you supply an `idempotencyKey` supported by that endpoint. Multipart uploads are never replayed automatically.

Expense and time-entry JSON mutations accept a final request-options argument:

```typescript
await client.expenses.create({
  project_id: 'project_id',
  expense_category_id: 'category_id',
  spent_date: '2026-10-30',
  total_cost: 24.50,
}, { idempotencyKey: 'receipt-import-001' });
```

Use a unique key for each intended operation. Retry with the identical body and key after an uncertain result; never create a fresh key merely to bypass an unresolved response. Invalid keys fail locally. Permission changes and reused keys with different requests can produce `409`; retain the error's `body` when deciding how to recover.

Retries are configurable:

```typescript
const client = new Keito({
  apiKey: 'kto_...',
  accountId: 'acc_...',
  maxRetries: 5,    // default: 3
  timeout: 60_000,  // default: 30s
});
```

## Outcome-Based Billing

Not all agent work is measured in hours. The SDK supports **outcome-based billing** for agents that deliver discrete results — resolved tickets, qualified leads, generated documents.

### Logging Outcomes

The `outcomes.log()` method records a `TimeEntry` with `hours: 0` and outcome data in metadata. It does not charge a customer or move money. For general integrations, pass `source: 'api'`. The historical default remains `agent`, whose metadata must satisfy the server's separate agent-lifecycle contract:

```typescript
import { Keito, OutcomeTypes } from '@keito-ai/sdk';

const client = new Keito({ apiKey: 'kto_...', accountId: 'acc_...' });

await client.outcomes.log({
  project_id: 'proj_123',
  task_id: 'task_456',
  spent_date: '2026-03-05',
  source: 'api',
  outcome: {
    type: OutcomeTypes.TICKET_RESOLVED,
    description: 'Resolved billing inquiry #4821 via email',
    unit_price: 0.99,
    quantity: 1,
    success: true,
    evidence: {
      ticket_id: 'TKT-4821',
      resolution_time_seconds: 45,
      customer_confirmed: true,
    },
  },
  metadata: {
    agent_id: 'support-agent-v3',
    run_id: 'run_xyz789',
  },
});
```

### Outcome Types

The SDK ships with pre-defined outcome type constants:

```typescript
import { OutcomeTypes } from '@keito-ai/sdk';

OutcomeTypes.TICKET_RESOLVED        // 'ticket_resolved'
OutcomeTypes.LEAD_QUALIFIED          // 'lead_qualified'
OutcomeTypes.MEETING_BOOKED          // 'meeting_booked'
OutcomeTypes.DOCUMENT_GENERATED      // 'document_generated'
OutcomeTypes.CODE_REVIEW_COMPLETED   // 'code_review_completed'
OutcomeTypes.DATA_PROCESSED          // 'data_processed'
OutcomeTypes.EMAIL_SENT              // 'email_sent'
OutcomeTypes.INVOICE_CREATED         // 'invoice_created'
OutcomeTypes.WORKFLOW_COMPLETED      // 'workflow_completed'
OutcomeTypes.CUSTOM                  // 'custom'
```

You can also pass any string as a custom outcome type.

### Blended Reporting

Get a combined time + outcome summary for an agent. Revenue values here are local estimates calculated from visible rates and recorded metadata. They do not establish issued invoices, customer payments or settled revenue:

```typescript
const summary = await client.reports.agentSummary({
  user_id: 'agent_user_123',
  from: '2026-03-01',
  to: '2026-03-31',
});

console.log(summary.time);      // { total_hours, billable_hours, revenue }
console.log(summary.outcomes);   // { total, successful, revenue }
console.log(summary.combined);   // { total_revenue }
```

## Metadata

Time entries and expenses support a `metadata` field (arbitrary JSON, max 4KB) for storing agent-specific context. We recommend a consistent schema:

```typescript
await client.timeEntries.create({
  project_id: 'proj_123',
  task_id: 'task_456',
  spent_date: '2026-03-05',
  hours: 1.5,
  source: 'api',
  metadata: {
    // Agent identity
    agent_id: 'code-reviewer-v2',
    framework: 'openclaw',

    // Run context
    run_id: 'run_abc123',
    parent_run_id: 'run_parent456',
    trigger: 'webhook',

    // Model usage
    model_provider: 'anthropic',
    model_name: 'claude-4-sonnet',
    tokens_in: 12500,
    tokens_out: 32700,
    cost_usd: 0.18,

    // Quality
    confidence: 0.94,
    human_reviewed: false,
  },
});
```

Metadata uses **merge semantics** on update — new keys are merged into existing metadata. Set metadata to `null` to clear it.

## TypeScript

The SDK is written in TypeScript and exports types for all API models:

```typescript
import type {
  TimeEntry,
  TimeEntryCreate,
  Expense,
  Invoice,
  Project,
  Client,
  User,
  Metadata,
} from '@keito-ai/sdk';
```

All method parameters and return types are fully typed. Your editor will provide autocomplete and type checking out of the box.

## Spec Sync

SDK types are auto-generated from the [Keito OpenAPI v2 spec](openapi/openapi-v2.yaml) using [`openapi-typescript`](https://github.com/openapi-ts/openapi-typescript). When the spec changes:

```bash
npm run generate   # regenerate src/generated/openapi.d.ts
npm run typecheck  # verify all resource classes still compile
```

The CI pipeline includes a workflow that auto-opens a PR when the upstream spec changes.

## Contributing

Contributions are welcome. To get started:

```bash
git clone https://github.com/osodevops/keito-node.git
cd keito-node
npm install
npm run generate
npm test
```

### Development Scripts

| Script | Description |
|--------|-------------|
| `npm run generate` | Regenerate types from OpenAPI spec |
| `npm run typecheck` | Run TypeScript type checking |
| `npm test` | Run tests with Vitest |
| `npm run build` | Build ESM + CJS output |
| `npm run test:package` | Build, pack and clean-install the package; verify ESM, CommonJS, declarations and mocked API examples |

## License

MIT
