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

    const result = await resource.list({ project_id: 'proj_1', source: 'desktop' });

    const url = spy.mock.calls[0][0] as string;
    expect(url).toContain('/api/v2/time_entries');
    expect(url).toContain('project_id=proj_1');
    expect(url).toContain('source=desktop');
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
      replace_running: true,
    });

    const init = spy.mock.calls[0][1] as RequestInit;
    expect(init.method).toBe('POST');
    expect(JSON.parse(init.body as string)).toMatchObject({
      project_id: 'proj_1',
      hours: 1.5,
      replace_running: true,
    });
    expect(entry.id).toBe('te_2');
  });

  it('startTimer sends a running create without a duration by default', async () => {
    const spy = mockFetch({ id: 'te_timer', is_running: true });
    const resource = makeResource();

    const entry = await resource.startTimer({
      project_id: 'proj_1',
      task_id: 'task_1',
      spent_date: '2026-03-05',
      source: 'agent',
      replace_running: true,
      metadata: { agent_id: 'agent_1' },
    });

    const init = spy.mock.calls[0][1] as RequestInit;
    const body = JSON.parse(init.body as string);
    expect(init.method).toBe('POST');
    expect(body).toMatchObject({
      project_id: 'proj_1',
      is_running: true,
      source: 'agent',
      replace_running: true,
    });
    expect(body).not.toHaveProperty('hours');
    expect(entry.id).toBe('te_timer');
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

  it('stopTimer sends PATCH to the stop endpoint', async () => {
    const spy = mockFetch({ id: 'te_1', is_running: false, hours: 1.25 });
    const resource = makeResource();

    const entry = await resource.stopTimer('te_1', { notes: 'Completed review' });

    const url = spy.mock.calls[0][0] as string;
    const init = spy.mock.calls[0][1] as RequestInit;
    expect(url).toContain('/api/v2/time_entries/te_1/stop');
    expect(init.method).toBe('PATCH');
    expect(JSON.parse(init.body as string)).toEqual({ notes: 'Completed review' });
    expect(entry.is_running).toBe(false);
  });

  it('restartTimer sends PATCH to the restart endpoint', async () => {
    const spy = mockFetch({ id: 'te_1', is_running: true });
    const resource = makeResource();

    const entry = await resource.restartTimer('te_1', { replace_running: true });

    const url = spy.mock.calls[0][0] as string;
    const init = spy.mock.calls[0][1] as RequestInit;
    expect(url).toContain('/api/v2/time_entries/te_1/restart');
    expect(init.method).toBe('PATCH');
    expect(JSON.parse(init.body as string)).toEqual({ replace_running: true });
    expect(entry.is_running).toBe(true);
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
