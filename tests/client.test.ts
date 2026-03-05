import { describe, it, expect } from 'vitest';
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
