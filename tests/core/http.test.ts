import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { HttpClient } from '../../src/core/http.js';
import {
  KeitoAuthError,
  KeitoForbiddenError,
  KeitoNotFoundError,
  KeitoConflictError,
  KeitoRateLimitError,
  KeitoTimeoutError,
  KeitoConnectionError,
  KeitoApiError,
} from '../../src/core/errors.js';

function makeClient(overrides?: Record<string, unknown>) {
  return new HttpClient({
    apiKey: 'kto_test',
    accountId: 'acc_test',
    baseUrl: 'https://api.test.io',
    maxRetries: 0,
    ...overrides,
  });
}

function mockFetch(response: Partial<Response>) {
  return vi.spyOn(globalThis, 'fetch').mockResolvedValue({
    ok: true,
    status: 200,
    headers: new Headers(),
    json: async () => ({}),
    ...response,
  } as Response);
}

describe('HttpClient', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('sends correct headers', async () => {
    const spy = mockFetch({ ok: true, status: 200, json: async () => ({ id: '1' }) });
    const client = makeClient();

    await client.request('GET', '/api/v2/users/me');

    const [url, init] = spy.mock.calls[0];
    expect(url).toBe('https://api.test.io/api/v2/users/me');
    expect((init as RequestInit).headers).toMatchObject({
      Authorization: 'Bearer kto_test',
      'Keito-Account-Id': 'acc_test',
    });
  });

  it('appends query params', async () => {
    const spy = mockFetch({ ok: true, status: 200, json: async () => ({}) });
    const client = makeClient();

    await client.request('GET', '/api/v2/time_entries', {
      query: { project_id: 'proj_1', page: 2 },
    });

    const url = spy.mock.calls[0][0] as string;
    expect(url).toContain('project_id=proj_1');
    expect(url).toContain('page=2');
  });

  it('sends JSON body for POST', async () => {
    const spy = mockFetch({ ok: true, status: 200, json: async () => ({ id: '1' }) });
    const client = makeClient();
    const body = { project_id: 'proj_1', task_id: 'task_1', spent_date: '2026-03-05' };

    await client.request('POST', '/api/v2/time_entries', { body });

    const init = spy.mock.calls[0][1] as RequestInit;
    expect(init.method).toBe('POST');
    expect(init.body).toBe(JSON.stringify(body));
  });

  it('returns undefined for 204 responses', async () => {
    mockFetch({ ok: true, status: 204 });
    const client = makeClient();

    const result = await client.request('DELETE', '/api/v2/time_entries/123');
    expect(result).toBeUndefined();
  });

  it('throws KeitoAuthError on 401', async () => {
    mockFetch({
      ok: false,
      status: 401,
      headers: new Headers(),
      json: async () => ({ error: 'unauthorized', error_description: 'invalid token' }),
    });
    const client = makeClient();

    await expect(client.request('GET', '/api/v2/users/me')).rejects.toThrow(KeitoAuthError);
  });

  it('throws KeitoForbiddenError on 403', async () => {
    mockFetch({
      ok: false,
      status: 403,
      headers: new Headers(),
      json: async () => ({ error: 'forbidden', error_description: 'admin required' }),
    });
    const client = makeClient();

    await expect(client.request('GET', '/test')).rejects.toThrow(KeitoForbiddenError);
  });

  it('throws KeitoNotFoundError on 404', async () => {
    mockFetch({
      ok: false,
      status: 404,
      headers: new Headers(),
      json: async () => ({ error: 'not_found', error_description: 'not found' }),
    });
    const client = makeClient();

    await expect(client.request('GET', '/test')).rejects.toThrow(KeitoNotFoundError);
  });

  it('throws KeitoConflictError on 409', async () => {
    mockFetch({
      ok: false,
      status: 409,
      headers: new Headers(),
      json: async () => ({ error: 'conflict', error_description: 'entry approved' }),
    });
    const client = makeClient();

    await expect(client.request('DELETE', '/test')).rejects.toThrow(KeitoConflictError);
  });

  it('throws KeitoRateLimitError on 429 with retryAfter', async () => {
    mockFetch({
      ok: false,
      status: 429,
      headers: new Headers({ 'retry-after': '30' }),
      json: async () => ({ error: 'rate_limit', error_description: 'slow down' }),
    });
    const client = makeClient();

    try {
      await client.request('GET', '/test');
    } catch (e) {
      expect(e).toBeInstanceOf(KeitoRateLimitError);
      expect((e as KeitoRateLimitError).retryAfter).toBe(30);
    }
  });

  it('throws KeitoApiError on other status codes', async () => {
    mockFetch({
      ok: false,
      status: 500,
      headers: new Headers(),
      json: async () => ({ error: 'server_error', error_description: 'boom' }),
    });
    const client = makeClient();

    await expect(client.request('GET', '/test')).rejects.toThrow(KeitoApiError);
  });

  it('retries on retryable status codes', async () => {
    const spy = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce({
        ok: false,
        status: 502,
        headers: new Headers(),
        json: async () => ({ error: 'bad_gateway', error_description: '' }),
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers(),
        json: async () => ({ id: '1' }),
      } as Response);

    const client = makeClient({ maxRetries: 1 });
    const result = await client.request<{ id: string }>('GET', '/test');

    expect(result.id).toBe('1');
    expect(spy).toHaveBeenCalledTimes(2);
  });

  it('retries on network errors', async () => {
    const spy = vi
      .spyOn(globalThis, 'fetch')
      .mockRejectedValueOnce(new TypeError('fetch failed'))
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers(),
        json: async () => ({ ok: true }),
      } as Response);

    const client = makeClient({ maxRetries: 1 });
    const result = await client.request<{ ok: boolean }>('GET', '/test');

    expect(result.ok).toBe(true);
    expect(spy).toHaveBeenCalledTimes(2);
  });

  it('throws KeitoConnectionError after exhausting retries on network error', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new TypeError('fetch failed'));
    const client = makeClient({ maxRetries: 1 });

    await expect(client.request('GET', '/test')).rejects.toThrow(KeitoConnectionError);
  });

  it('throws KeitoTimeoutError on abort', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (_url, init) => {
      // Simulate timeout by triggering the abort
      const signal = (init as RequestInit).signal!;
      return new Promise<Response>((_, reject) => {
        signal.addEventListener('abort', () => {
          reject(new DOMException('The operation was aborted.', 'AbortError'));
        });
      });
    });
    const client = makeClient({ timeout: 10, maxRetries: 0 });

    await expect(client.request('GET', '/test')).rejects.toThrow(KeitoTimeoutError);
  });

  it('skips undefined/null query params', async () => {
    const spy = mockFetch({ ok: true, status: 200, json: async () => ({}) });
    const client = makeClient();

    await client.request('GET', '/test', {
      query: { a: 'yes', b: undefined, c: null },
    });

    const url = spy.mock.calls[0][0] as string;
    expect(url).toContain('a=yes');
    expect(url).not.toContain('b=');
    expect(url).not.toContain('c=');
  });
});
