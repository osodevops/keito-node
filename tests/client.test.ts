import { describe, it, expect, vi, afterEach } from 'vitest';
import { Keito } from '../src/client.js';
import { TimeEntries } from '../src/resources/time-entries.js';
import { Expenses } from '../src/resources/expenses.js';
import { Projects } from '../src/resources/projects.js';
import { Clients } from '../src/resources/clients.js';
import { Contacts } from '../src/resources/contacts.js';
import { Tasks } from '../src/resources/tasks.js';
import { Users } from '../src/resources/users.js';
import { Invoices, InvoiceMessages } from '../src/resources/invoices.js';
import { Reports } from '../src/resources/reports.js';
import { Outcomes } from '../src/resources/outcomes.js';

describe('Keito client', () => {
  afterEach(() => { vi.restoreAllMocks(); vi.unstubAllEnvs(); });

  it('reads environment credentials with the documented no-argument constructor', async () => {
    vi.stubEnv('KEITO_API_KEY', 'synthetic-env-key');
    vi.stubEnv('KEITO_ACCOUNT_ID', 'synthetic-env-account');
    const fetch = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('{}'));
    await new Keito().users.me();
    expect(fetch.mock.calls[0][0]).toBe('https://app.keito.ai/api/v2/users/me');
    expect(fetch.mock.calls[0][1]?.headers).toMatchObject({ Authorization: 'Bearer synthetic-env-key', 'Keito-Account-Id': 'synthetic-env-account' });
  });

  it('requires both credentials without exposing their values', () => {
    vi.stubEnv('KEITO_API_KEY', '');
    vi.stubEnv('KEITO_ACCOUNT_ID', '');
    expect(() => new Keito()).toThrow('apiKey');
    expect(() => new Keito({ apiKey: 'do-not-expose' })).toThrow('accountId');
    expect(() => new Keito({ apiKey: 'do-not-expose' })).not.toThrow('do-not-expose');
  });

  it('keeps explicit and environment-based identities isolated between clients', async () => {
    vi.stubEnv('KEITO_API_KEY', 'synthetic-env-key');
    vi.stubEnv('KEITO_ACCOUNT_ID', 'synthetic-env-account');
    const fetch = vi.spyOn(globalThis, 'fetch').mockImplementation(async () => new Response('{}'));
    await Promise.all([
      new Keito().users.me(),
      new Keito({ apiKey: 'synthetic-explicit-key', accountId: 'synthetic-explicit-account' }).users.me(),
    ]);
    expect(fetch.mock.calls.map(call => call[1]?.headers)).toEqual([
      expect.objectContaining({ Authorization: 'Bearer synthetic-env-key', 'Keito-Account-Id': 'synthetic-env-account' }),
      expect.objectContaining({ Authorization: 'Bearer synthetic-explicit-key', 'Keito-Account-Id': 'synthetic-explicit-account' }),
    ]);
  });
  it('exposes all resource instances', () => {
    const client = new Keito({ apiKey: 'kto_test', accountId: 'acc_test' });

    expect(client.timeEntries).toBeInstanceOf(TimeEntries);
    expect(client.expenses).toBeInstanceOf(Expenses);
    expect(client.projects).toBeInstanceOf(Projects);
    expect(client.clients).toBeInstanceOf(Clients);
    expect(client.contacts).toBeInstanceOf(Contacts);
    expect(client.tasks).toBeInstanceOf(Tasks);
    expect(client.users).toBeInstanceOf(Users);
    expect(client.invoices).toBeInstanceOf(Invoices);
    expect(client.invoices.messages).toBeInstanceOf(InvoiceMessages);
    expect(client.reports).toBeInstanceOf(Reports);
    expect(client.outcomes).toBeInstanceOf(Outcomes);
  });

  it('uses default baseUrl when not provided', () => {
    const client = new Keito({ apiKey: 'kto_test', accountId: 'acc_test' });

    // All resources should be initialized — verifies constructor doesn't throw
    expect(client.timeEntries).toBeDefined();
    expect(client.outcomes).toBeDefined();
  });
});
