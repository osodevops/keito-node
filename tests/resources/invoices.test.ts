import { describe, it, expect, vi, afterEach } from 'vitest';
import { HttpClient } from '../../src/core/http.js';
import { Invoices } from '../../src/resources/invoices.js';

function makeResource() {
  const http = new HttpClient({
    apiKey: 'kto_test',
    accountId: 'acc_test',
    baseUrl: 'https://api.test.io',
    maxRetries: 0,
  });
  return new Invoices(http);
}

function mockFetch(body: unknown, status = 200) {
  return vi.spyOn(globalThis, 'fetch').mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    headers: new Headers(),
    json: async () => body,
  } as Response);
}

describe('Invoices', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('list sends GET with query params', async () => {
    const spy = mockFetch({
      page: 1,
      per_page: 100,
      total_pages: 1,
      total_entries: 1,
      invoices: [{ id: 'inv_1', state: 'draft' }],
    });
    const resource = makeResource();

    const result = await resource.list({ client_id: 'cl_1', state: 'draft' });

    const url = spy.mock.calls[0][0] as string;
    expect(url).toContain('/api/v2/invoices');
    expect(url).toContain('client_id=cl_1');
    expect(url).toContain('state=draft');
    expect(result.data[0].id).toBe('inv_1');
  });

  it('get sends GET to /:id', async () => {
    const spy = mockFetch({ id: 'inv_1', amount: 500 });
    const resource = makeResource();

    const invoice = await resource.get('inv_1');

    const url = spy.mock.calls[0][0] as string;
    expect(url).toContain('/api/v2/invoices/inv_1');
    expect(invoice.amount).toBe(500);
  });

  it('create sends POST', async () => {
    const spy = mockFetch({ id: 'inv_2' });
    const resource = makeResource();

    await resource.create({
      client_id: 'cl_1',
      payment_term: 'net_30',
    });

    const init = spy.mock.calls[0][1] as RequestInit;
    expect(init.method).toBe('POST');
    expect(JSON.parse(init.body as string).client_id).toBe('cl_1');
  });

  it('update sends PATCH', async () => {
    const spy = mockFetch({ id: 'inv_1', subject: 'Updated' });
    const resource = makeResource();

    await resource.update('inv_1', { subject: 'Updated' });

    const url = spy.mock.calls[0][0] as string;
    const init = spy.mock.calls[0][1] as RequestInit;
    expect(url).toContain('/api/v2/invoices/inv_1');
    expect(init.method).toBe('PATCH');
  });

  it('delete sends DELETE', async () => {
    const spy = mockFetch({ id: 'inv_1', deleted: true });
    const resource = makeResource();

    const result = await resource.delete('inv_1');

    const init = spy.mock.calls[0][1] as RequestInit;
    expect(init.method).toBe('DELETE');
    expect(result.deleted).toBe(true);
  });

  describe('messages', () => {
    it('list sends GET to /:id/messages', async () => {
      const spy = mockFetch({
        page: 1,
        per_page: 100,
        total_pages: 1,
        total_entries: 1,
        invoice_messages: [{ id: 'msg_1' }],
      });
      const resource = makeResource();

      const result = await resource.messages.list('inv_1');

      const url = spy.mock.calls[0][0] as string;
      expect(url).toContain('/api/v2/invoices/inv_1/messages');
      expect(result.data[0].id).toBe('msg_1');
    });

    it('send sends POST to /:id/messages', async () => {
      const spy = mockFetch({ id: 'msg_2' });
      const resource = makeResource();

      await resource.messages.send('inv_1', {
        recipients: [{ name: 'Test', email: 'test@example.com' }],
        attach_pdf: true,
        send_me_a_copy: false,
        include_attachments: false,
        event_type: 'send',
      });

      const url = spy.mock.calls[0][0] as string;
      const init = spy.mock.calls[0][1] as RequestInit;
      expect(url).toContain('/api/v2/invoices/inv_1/messages');
      expect(init.method).toBe('POST');
    });
  });
});
