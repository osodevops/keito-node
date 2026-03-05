import { describe, it, expect, vi, afterEach } from 'vitest';
import { HttpClient } from '../../src/core/http.js';
import { Users } from '../../src/resources/users.js';

function makeResource() {
  const http = new HttpClient({
    apiKey: 'kto_test',
    accountId: 'acc_test',
    baseUrl: 'https://api.test.io',
    maxRetries: 0,
  });
  return new Users(http);
}

function mockFetch(body: unknown) {
  return vi.spyOn(globalThis, 'fetch').mockResolvedValue({
    ok: true,
    status: 200,
    headers: new Headers(),
    json: async () => body,
  } as Response);
}

describe('Users', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('me sends GET to /api/v2/users/me', async () => {
    const spy = mockFetch({
      id: 'user_1',
      email: 'agent@company.com',
      user_type: 'agent',
      first_name: 'Code',
      last_name: 'Reviewer',
    });
    const resource = makeResource();

    const user = await resource.me();

    const url = spy.mock.calls[0][0] as string;
    const init = spy.mock.calls[0][1] as RequestInit;
    expect(url).toContain('/api/v2/users/me');
    expect(init.method).toBe('GET');
    expect(user.email).toBe('agent@company.com');
    expect(user.user_type).toBe('agent');
  });
});
