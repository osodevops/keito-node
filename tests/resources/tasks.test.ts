import { describe, it, expect, vi, afterEach } from 'vitest';
import { HttpClient } from '../../src/core/http.js';
import { Tasks } from '../../src/resources/tasks.js';

function makeResource() {
  const http = new HttpClient({
    apiKey: 'kto_test',
    accountId: 'acc_test',
    baseUrl: 'https://api.test.io',
    maxRetries: 0,
  });
  return new Tasks(http);
}

function mockFetch(body: unknown) {
  return vi.spyOn(globalThis, 'fetch').mockResolvedValue({
    ok: true,
    status: 200,
    headers: new Headers(),
    json: async () => body,
  } as Response);
}

describe('Tasks', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('list sends GET with query params', async () => {
    const spy = mockFetch({
      page: 1,
      per_page: 100,
      total_pages: 1,
      total_entries: 2,
      tasks: [
        { id: 'task_1', name: 'Development' },
        { id: 'task_2', name: 'Code Review' },
      ],
    });
    const resource = makeResource();

    const result = await resource.list({ is_active: true });

    const url = spy.mock.calls[0][0] as string;
    expect(url).toContain('is_active=true');
    expect(result.data).toHaveLength(2);
    expect(result.data[0].name).toBe('Development');
  });

  it('list with no params sends bare GET', async () => {
    const spy = mockFetch({
      page: 1,
      per_page: 100,
      total_pages: 1,
      total_entries: 0,
      tasks: [],
    });
    const resource = makeResource();

    await resource.list();

    const url = spy.mock.calls[0][0] as string;
    expect(url).toBe('https://api.test.io/api/v2/tasks');
  });
});
