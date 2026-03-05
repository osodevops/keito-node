import { describe, it, expect, vi, afterEach } from 'vitest';
import { HttpClient } from '../../src/core/http.js';
import { Clients } from '../../src/resources/clients.js';

function makeResource() {
  const http = new HttpClient({
    apiKey: 'kto_test',
    accountId: 'acc_test',
    baseUrl: 'https://api.test.io',
    maxRetries: 0,
  });
  return new Clients(http);
}

function mockFetch(body: unknown) {
  return vi.spyOn(globalThis, 'fetch').mockResolvedValue({
    ok: true,
    status: 200,
    headers: new Headers(),
    json: async () => body,
  } as Response);
}

describe('Clients', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('list sends GET with query params', async () => {
    const spy = mockFetch({
      page: 1,
      per_page: 100,
      total_pages: 1,
      total_entries: 1,
      clients: [{ id: 'cl_1', name: 'Acme Corp' }],
    });
    const resource = makeResource();

    const result = await resource.list({ is_active: true });

    const url = spy.mock.calls[0][0] as string;
    expect(url).toContain('is_active=true');
    expect(result.data[0].name).toBe('Acme Corp');
  });

  it('get sends GET to /:id', async () => {
    const spy = mockFetch({ id: 'cl_1', name: 'Acme Corp', currency: 'GBP' });
    const resource = makeResource();

    const client = await resource.get('cl_1');

    const url = spy.mock.calls[0][0] as string;
    expect(url).toContain('/api/v2/clients/cl_1');
    expect(client.name).toBe('Acme Corp');
    expect(client.currency).toBe('GBP');
  });

  it('create sends POST with body', async () => {
    const spy = mockFetch({ id: 'cl_2', name: 'New Client' });
    const resource = makeResource();

    const client = await resource.create({ name: 'New Client', currency: 'USD' });

    const init = spy.mock.calls[0][1] as RequestInit;
    expect(init.method).toBe('POST');
    const body = JSON.parse(init.body as string);
    expect(body.name).toBe('New Client');
    expect(body.currency).toBe('USD');
    expect(client.id).toBe('cl_2');
  });

  it('update sends PATCH to /:id', async () => {
    const spy = mockFetch({ id: 'cl_1', name: 'Updated Name' });
    const resource = makeResource();

    const client = await resource.update('cl_1', { name: 'Updated Name' });

    const url = spy.mock.calls[0][0] as string;
    const init = spy.mock.calls[0][1] as RequestInit;
    expect(url).toContain('/api/v2/clients/cl_1');
    expect(init.method).toBe('PATCH');
    expect(client.name).toBe('Updated Name');
  });
});
