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

  it('gets, updates and deletes an expense using encoded item identifiers', async () => {
    const spy = mockFetch({ id: 'expense', success: true });
    const resource = makeResource();
    await expect(resource.get('expense/id')).resolves.toMatchObject({ id: 'expense' });
    await resource.update('expense/id', { notes: 'Synthetic note' }, { idempotencyKey: 'expense-update-001' });
    await resource.delete('expense/id', { idempotencyKey: 'expense-delete-001' });
    expect(spy.mock.calls.map(c => c[0])).toEqual(Array(3).fill('https://api.test.io/api/v2/expenses/expense%2Fid'));
    expect(spy.mock.calls.map(c => c[1]?.method)).toEqual(['GET', 'PATCH', 'DELETE']);
    expect(spy.mock.calls[1][1]?.headers).toMatchObject({ 'Idempotency-Key': 'expense-update-001' });
  });

  it('uploads the receipt as multipart file without forcing Content-Type', async () => {
    const spy = mockFetch({ receipt_url: '/api/v2/expenses/expense/receipt', receipt_file_name: 'receipt.pdf' }, 201);
    await makeResource().uploadReceipt('expense', new Blob(['%PDF'], { type: 'application/pdf' }), 'receipt.pdf');
    const init = spy.mock.calls[0][1]!;
    expect(init.body).toBeInstanceOf(FormData);
    const file = (init.body as FormData).get('file') as File;
    expect(file.name).toBe('receipt.pdf');
    expect(file.type).toBe('application/pdf');
    expect(await file.text()).toBe('%PDF');
    expect(init.headers).not.toHaveProperty('Content-Type');
    expect(spy.mock.calls[0][0]).toBe('https://api.test.io/api/v2/expenses/expense/receipt');
  });

  it('returns binary receipt bytes and removes a receipt separately from the expense', async () => {
    const spy = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(new Response('%PDF', { headers: { 'Content-Type': 'application/pdf', 'Cache-Control': 'private, no-store' } })).mockResolvedValueOnce(new Response('{"success":true}'));
    const resource = makeResource();
    const receipt = await resource.downloadReceipt('expense');
    expect(receipt.type).toBe('application/pdf');
    expect(await receipt.text()).toBe('%PDF');
    await expect(resource.deleteReceipt('expense')).resolves.toBeUndefined();
    expect(spy.mock.calls[1][1]?.method).toBe('DELETE');
    expect(spy.mock.calls[1][0]).toBe('https://api.test.io/api/v2/expenses/expense/receipt');
  });

  it('does not replay receipt uploads after an uncertain network failure', async () => {
    const spy = vi.spyOn(globalThis, 'fetch').mockRejectedValue(new TypeError('network failed'));
    const resource = new Expenses(new HttpClient({ apiKey: 'kto_test', accountId: 'account', maxRetries: 3 }));
    await expect(resource.uploadReceipt('expense', new Blob(['%PDF']), 'receipt.pdf')).rejects.toThrow('Connection error');
    expect(spy).toHaveBeenCalledTimes(1);
  });
});
