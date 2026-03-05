import { describe, it, expect, vi, afterEach } from 'vitest';
import { HttpClient } from '../../src/core/http.js';
import { Reports } from '../../src/resources/reports.js';

function makeResource() {
  const http = new HttpClient({
    apiKey: 'kto_test',
    accountId: 'acc_test',
    baseUrl: 'https://api.test.io',
    maxRetries: 0,
  });
  return new Reports(http);
}

function mockFetch(body: unknown) {
  return vi.spyOn(globalThis, 'fetch').mockResolvedValue({
    ok: true,
    status: 200,
    headers: new Headers(),
    json: async () => body,
  } as Response);
}

describe('Reports', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('teamTime sends GET with required date params', async () => {
    const spy = mockFetch({
      page: 1,
      per_page: 100,
      total_pages: 1,
      total_entries: 2,
      results: [
        { user_id: 'u_1', user_name: 'Alice', total_hours: 40, billable_hours: 35 },
        { user_id: 'u_2', user_name: 'Agent', total_hours: 120, billable_hours: 120 },
      ],
    });
    const resource = makeResource();

    const result = await resource.teamTime({ from: '20260301', to: '20260331' });

    const url = spy.mock.calls[0][0] as string;
    expect(url).toContain('/api/v2/reports/time/team');
    expect(url).toContain('from=20260301');
    expect(url).toContain('to=20260331');
    expect(result.data).toHaveLength(2);
    expect(result.data[1].total_hours).toBe(120);
  });

  describe('agentSummary', () => {
    it('returns blended time + outcome summary', async () => {
      mockFetch({
        page: 1,
        per_page: 100,
        total_pages: 1,
        total_entries: 4,
        time_entries: [
          { id: 'te_1', hours: 2, billable: true, billable_rate: 150, metadata: null },
          { id: 'te_2', hours: 3, billable: true, billable_rate: 150, metadata: null },
          { id: 'te_3', hours: 1, billable: false, metadata: null },
          {
            id: 'te_4',
            hours: 0,
            billable: true,
            metadata: {
              outcome_type: 'ticket_resolved',
              outcome_unit_price: 0.99,
              outcome_quantity: 5,
              outcome_success: true,
            },
          },
        ],
      });
      const resource = makeResource();

      const summary = await resource.agentSummary({
        user_id: 'agent_1',
        from: '2026-03-01',
        to: '2026-03-31',
      });

      expect(summary.time.total_hours).toBe(6);
      expect(summary.time.billable_hours).toBe(5);
      expect(summary.time.revenue).toBe(750); // 5h * 150
      expect(summary.outcomes.total).toBe(1);
      expect(summary.outcomes.successful).toBe(1);
      expect(summary.outcomes.revenue).toBe(4.95); // 0.99 * 5
      expect(summary.combined.total_revenue).toBe(754.95);
    });

    it('handles no entries', async () => {
      mockFetch({
        page: 1,
        per_page: 100,
        total_pages: 0,
        total_entries: 0,
        time_entries: [],
      });
      const resource = makeResource();

      const summary = await resource.agentSummary({
        user_id: 'agent_1',
        from: '2026-03-01',
        to: '2026-03-31',
      });

      expect(summary.time.total_hours).toBe(0);
      expect(summary.outcomes.total).toBe(0);
      expect(summary.combined.total_revenue).toBe(0);
    });

    it('handles failed outcomes', async () => {
      mockFetch({
        page: 1,
        per_page: 100,
        total_pages: 1,
        total_entries: 2,
        time_entries: [
          {
            id: 'te_1',
            hours: 0,
            metadata: {
              outcome_type: 'ticket_resolved',
              outcome_unit_price: 0.99,
              outcome_quantity: 1,
              outcome_success: true,
            },
          },
          {
            id: 'te_2',
            hours: 0,
            metadata: {
              outcome_type: 'ticket_resolved',
              outcome_unit_price: 0.99,
              outcome_quantity: 1,
              outcome_success: false,
            },
          },
        ],
      });
      const resource = makeResource();

      const summary = await resource.agentSummary({
        user_id: 'agent_1',
        from: '2026-03-01',
        to: '2026-03-31',
      });

      expect(summary.outcomes.total).toBe(2);
      expect(summary.outcomes.successful).toBe(1);
    });
  });
});
