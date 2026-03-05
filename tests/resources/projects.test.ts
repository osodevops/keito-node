import { describe, it, expect, vi, afterEach } from 'vitest';
import { HttpClient } from '../../src/core/http.js';
import { Projects } from '../../src/resources/projects.js';

function makeResource() {
  const http = new HttpClient({
    apiKey: 'kto_test',
    accountId: 'acc_test',
    baseUrl: 'https://api.test.io',
    maxRetries: 0,
  });
  return new Projects(http);
}

function mockFetch(body: unknown) {
  return vi.spyOn(globalThis, 'fetch').mockResolvedValue({
    ok: true,
    status: 200,
    headers: new Headers(),
    json: async () => body,
  } as Response);
}

describe('Projects', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('list sends GET with query params', async () => {
    const spy = mockFetch({
      page: 1,
      per_page: 100,
      total_pages: 1,
      total_entries: 2,
      projects: [
        { id: 'proj_1', name: 'Alpha' },
        { id: 'proj_2', name: 'Beta' },
      ],
    });
    const resource = makeResource();

    const result = await resource.list({ is_active: true, client_id: 'cl_1' });

    const url = spy.mock.calls[0][0] as string;
    expect(url).toContain('is_active=true');
    expect(url).toContain('client_id=cl_1');
    expect(result.data).toHaveLength(2);
  });

  it('list defaults to no params', async () => {
    const spy = mockFetch({
      page: 1,
      per_page: 100,
      total_pages: 1,
      total_entries: 0,
      projects: [],
    });
    const resource = makeResource();

    await resource.list();

    const url = spy.mock.calls[0][0] as string;
    expect(url).toBe('https://api.test.io/api/v2/projects');
  });
});
