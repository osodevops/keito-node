import { describe, it, expect, vi, afterEach } from 'vitest';
import { HttpClient } from '../../src/core/http.js';
import { Expenses } from '../../src/resources/expenses.js';

function makeResource() {
  const http = new HttpClient({
    apiKey: 'kto_test',
    accountId: 'acc_test',
    baseUrl: 'https://api.test.io',
    maxRetries: 0,
  });
  return new Expenses(http);
}

function mockFetch(body: unknown, status = 200) {
  return vi.spyOn(globalThis, 'fetch').mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    headers: new Headers(),
    json: async () => body,
  } as Response);
}

describe('Expenses', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('list sends GET with query params', async () => {
    const spy = mockFetch({
      page: 1,
      per_page: 100,
      total_pages: 1,
      total_entries: 1,
      expenses: [{ id: 'exp_1', total_cost: 42 }],
    });
    const resource = makeResource();

    const result = await resource.list({ project_id: 'proj_1', source: 'agent' });

    const url = spy.mock.calls[0][0] as string;
    expect(url).toContain('/api/v2/expenses');
    expect(url).toContain('project_id=proj_1');
    expect(url).toContain('source=agent');
    expect(result.data).toHaveLength(1);
    expect(result.data[0].id).toBe('exp_1');
  });

  it('list with no params sends bare GET', async () => {
    const spy = mockFetch({
      page: 1,
      per_page: 100,
      total_pages: 1,
      total_entries: 0,
      expenses: [],
    });
    const resource = makeResource();

    await resource.list();

    const url = spy.mock.calls[0][0] as string;
    expect(url).toBe('https://api.test.io/api/v2/expenses');
  });

  it('create sends POST with body', async () => {
    const spy = mockFetch({ id: 'exp_2', total_cost: 15.5 });
    const resource = makeResource();

    const expense = await resource.create({
      project_id: 'proj_1',
      expense_category_id: 'cat_compute',
      spent_date: '2026-03-05',
      total_cost: 15.5,
      source: 'agent',
    });

    const init = spy.mock.calls[0][1] as RequestInit;
    expect(init.method).toBe('POST');
    const body = JSON.parse(init.body as string);
    expect(body.project_id).toBe('proj_1');
    expect(body.expense_category_id).toBe('cat_compute');
    expect(body.total_cost).toBe(15.5);
    expect(expense.id).toBe('exp_2');
  });
});
