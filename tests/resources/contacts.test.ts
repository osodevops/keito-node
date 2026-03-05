import { describe, it, expect, vi, afterEach } from 'vitest';
import { HttpClient } from '../../src/core/http.js';
import { Contacts } from '../../src/resources/contacts.js';

function makeResource() {
  const http = new HttpClient({
    apiKey: 'kto_test',
    accountId: 'acc_test',
    baseUrl: 'https://api.test.io',
    maxRetries: 0,
  });
  return new Contacts(http);
}

function mockFetch(body: unknown) {
  return vi.spyOn(globalThis, 'fetch').mockResolvedValue({
    ok: true,
    status: 200,
    headers: new Headers(),
    json: async () => body,
  } as Response);
}

describe('Contacts', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('list sends GET with query params', async () => {
    const spy = mockFetch({
      page: 1,
      per_page: 100,
      total_pages: 1,
      total_entries: 1,
      contacts: [{ id: 'con_1', first_name: 'Jane' }],
    });
    const resource = makeResource();

    const result = await resource.list({ client_id: 'cl_1' });

    const url = spy.mock.calls[0][0] as string;
    expect(url).toContain('client_id=cl_1');
    expect(result.data[0].first_name).toBe('Jane');
  });

  it('create sends POST with body', async () => {
    const spy = mockFetch({ id: 'con_2', first_name: 'John', last_name: 'Doe' });
    const resource = makeResource();

    const contact = await resource.create({
      client_id: 'cl_1',
      first_name: 'John',
      last_name: 'Doe',
      email: 'john@example.com',
    });

    const init = spy.mock.calls[0][1] as RequestInit;
    expect(init.method).toBe('POST');
    const body = JSON.parse(init.body as string);
    expect(body.client_id).toBe('cl_1');
    expect(body.first_name).toBe('John');
    expect(body.email).toBe('john@example.com');
    expect(contact.id).toBe('con_2');
  });
});
