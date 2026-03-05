import { describe, it, expect, vi, afterEach } from 'vitest';
import { HttpClient } from '../../src/core/http.js';
import { TimeEntries } from '../../src/resources/time-entries.js';

function makeResource() {
  const http = new HttpClient({
    apiKey: 'kto_test',
    accountId: 'acc_test',
    baseUrl: 'https://api.test.io',
    maxRetries: 0,
  });
  return new TimeEntries(http);
}

function mockFetch(body: unknown, status = 200) {
  return vi.spyOn(globalThis, 'fetch').mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    headers: new Headers(),
    json: async () => body,
  } as Response);
}

describe('TimeEntries', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('list sends GET with query params', async () => {
    const spy = mockFetch({
      page: 1,
      per_page: 100,
      total_pages: 1,
      total_entries: 1,
      time_entries: [{ id: 'te_1', hours: 2 }],
    });
    const resource = makeResource();

    const result = await resource.list({ project_id: 'proj_1', source: 'agent' });

    const url = spy.mock.calls[0][0] as string;
    expect(url).toContain('/api/v2/time_entries');
    expect(url).toContain('project_id=proj_1');
    expect(url).toContain('source=agent');
    expect(result.data).toHaveLength(1);
    expect(result.data[0].id).toBe('te_1');
  });

  it('create sends POST with body', async () => {
    const spy = mockFetch({ id: 'te_2', hours: 1.5 });
    const resource = makeResource();

    const entry = await resource.create({
      project_id: 'proj_1',
      task_id: 'task_1',
      spent_date: '2026-03-05',
      hours: 1.5,
      source: 'agent',
    });

    const init = spy.mock.calls[0][1] as RequestInit;
    expect(init.method).toBe('POST');
    expect(JSON.parse(init.body as string)).toMatchObject({
      project_id: 'proj_1',
      hours: 1.5,
    });
    expect(entry.id).toBe('te_2');
  });

  it('update sends PATCH with body', async () => {
    const spy = mockFetch({ id: 'te_1', hours: 3 });
    const resource = makeResource();

    const entry = await resource.update('te_1', { hours: 3 });

    const url = spy.mock.calls[0][0] as string;
    const init = spy.mock.calls[0][1] as RequestInit;
    expect(url).toContain('/api/v2/time_entries/te_1');
    expect(init.method).toBe('PATCH');
    expect(entry.hours).toBe(3);
  });

  it('delete sends DELETE', async () => {
    const spy = mockFetch(undefined, 204);
    const resource = makeResource();

    await resource.delete('te_1');

    const url = spy.mock.calls[0][0] as string;
    const init = spy.mock.calls[0][1] as RequestInit;
    expect(url).toContain('/api/v2/time_entries/te_1');
    expect(init.method).toBe('DELETE');
  });
});
