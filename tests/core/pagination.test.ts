import { describe, it, expect, vi, afterEach } from 'vitest';
import { HttpClient } from '../../src/core/http.js';
import { paginate } from '../../src/core/pagination.js';

function makeClient() {
  return new HttpClient({
    apiKey: 'kto_test',
    accountId: 'acc_test',
    baseUrl: 'https://api.test.io',
    maxRetries: 0,
  });
}

describe('Pagination', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns first page data', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      status: 200,
      headers: new Headers(),
      json: async () => ({
        page: 1,
        per_page: 2,
        total_pages: 1,
        total_entries: 2,
        time_entries: [{ id: '1' }, { id: '2' }],
      }),
    } as Response);

    const client = makeClient();
    const result = await paginate(client, '/api/v2/time_entries', 'time_entries');

    expect(result.data).toHaveLength(2);
    expect(result.page).toBe(1);
    expect(result.total_entries).toBe(2);
    expect(result.hasNextPage()).toBe(false);
  });

  it('supports nextPage()', async () => {
    const spy = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers(),
        json: async () => ({
          page: 1,
          per_page: 1,
          total_pages: 2,
          total_entries: 2,
          items: [{ id: '1' }],
        }),
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers(),
        json: async () => ({
          page: 2,
          per_page: 1,
          total_pages: 2,
          total_entries: 2,
          items: [{ id: '2' }],
        }),
      } as Response);

    const client = makeClient();
    const page1 = await paginate(client, '/api/v2/test', 'items');
    expect(page1.hasNextPage()).toBe(true);

    const page2 = await page1.nextPage();
    expect(page2.data).toEqual([{ id: '2' }]);
    expect(page2.hasNextPage()).toBe(false);
    expect(spy).toHaveBeenCalledTimes(2);
  });

  it('supports async iteration across pages', async () => {
    vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers(),
        json: async () => ({
          page: 1,
          per_page: 2,
          total_pages: 2,
          total_entries: 3,
          items: [{ id: '1' }, { id: '2' }],
        }),
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers(),
        json: async () => ({
          page: 2,
          per_page: 2,
          total_pages: 2,
          total_entries: 3,
          items: [{ id: '3' }],
        }),
      } as Response);

    const client = makeClient();
    const page = await paginate<{ id: string }>(client, '/api/v2/test', 'items');

    const ids: string[] = [];
    for await (const item of page) {
      ids.push(item.id);
    }

    expect(ids).toEqual(['1', '2', '3']);
  });

  it('handles empty results', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      status: 200,
      headers: new Headers(),
      json: async () => ({
        page: 1,
        per_page: 100,
        total_pages: 0,
        total_entries: 0,
        items: [],
      }),
    } as Response);

    const client = makeClient();
    const result = await paginate(client, '/api/v2/test', 'items');

    expect(result.data).toEqual([]);
    expect(result.hasNextPage()).toBe(false);
  });
});
