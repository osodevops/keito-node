import { describe, it, expect, vi, afterEach } from 'vitest';
import { HttpClient } from '../../src/core/http.js';
import { Outcomes } from '../../src/resources/outcomes.js';

function makeResource() {
  const http = new HttpClient({
    apiKey: 'kto_test',
    accountId: 'acc_test',
    baseUrl: 'https://api.test.io',
    maxRetries: 0,
  });
  return new Outcomes(http);
}

function mockFetch(body: unknown) {
  return vi.spyOn(globalThis, 'fetch').mockResolvedValue({
    ok: true,
    status: 200,
    headers: new Headers(),
    json: async () => body,
  } as Response);
}

describe('Outcomes', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('log creates a time entry with hours=0 and outcome metadata', async () => {
    const spy = mockFetch({ id: 'te_outcome', hours: 0 });
    const resource = makeResource();

    await resource.log({
      project_id: 'proj_1',
      task_id: 'task_1',
      spent_date: '2026-03-05',
      outcome: {
        type: 'ticket_resolved',
        description: 'Resolved issue #123',
        unit_price: 0.99,
        quantity: 1,
        success: true,
        evidence: { ticket_id: 'TKT-123' },
      },
      metadata: { agent_id: 'support-v2' },
    });

    const init = spy.mock.calls[0][1] as RequestInit;
    const body = JSON.parse(init.body as string);

    expect(body.hours).toBe(0);
    expect(body.billable).toBe(true);
    expect(body.source).toBe('agent');
    expect(body.notes).toBe('Resolved issue #123');
    expect(body.metadata.outcome_type).toBe('ticket_resolved');
    expect(body.metadata.outcome_unit_price).toBe(0.99);
    expect(body.metadata.outcome_quantity).toBe(1);
    expect(body.metadata.outcome_success).toBe(true);
    expect(body.metadata.outcome_evidence).toEqual({ ticket_id: 'TKT-123' });
    expect(body.metadata.agent_id).toBe('support-v2');
  });

  it('log defaults source to agent', async () => {
    const spy = mockFetch({ id: 'te_1', hours: 0 });
    const resource = makeResource();

    await resource.log({
      project_id: 'proj_1',
      task_id: 'task_1',
      spent_date: '2026-03-05',
      outcome: {
        type: 'custom',
        description: 'test',
        unit_price: 1,
        quantity: 1,
        success: true,
      },
    });

    const body = JSON.parse((spy.mock.calls[0][1] as RequestInit).body as string);
    expect(body.source).toBe('agent');
  });

  it('log omits evidence from metadata when not provided', async () => {
    const spy = mockFetch({ id: 'te_1' });
    const resource = makeResource();

    await resource.log({
      project_id: 'proj_1',
      task_id: 'task_1',
      spent_date: '2026-03-05',
      outcome: {
        type: 'email_sent',
        description: 'Sent email',
        unit_price: 0.5,
        quantity: 1,
        success: true,
      },
    });

    const body = JSON.parse((spy.mock.calls[0][1] as RequestInit).body as string);
    expect(body.metadata.outcome_evidence).toBeUndefined();
  });
});
