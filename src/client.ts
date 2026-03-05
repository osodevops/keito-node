import { HttpClient, type KeitoClientOptions } from './core/http.js';
import { TimeEntries } from './resources/time-entries.js';
import { Expenses } from './resources/expenses.js';
import { Projects } from './resources/projects.js';
import { Clients } from './resources/clients.js';
import { Contacts } from './resources/contacts.js';
import { Tasks } from './resources/tasks.js';
import { Users } from './resources/users.js';
import { Invoices } from './resources/invoices.js';
import { Reports } from './resources/reports.js';
import { Outcomes } from './resources/outcomes.js';

export class Keito {
  readonly timeEntries: TimeEntries;
  readonly expenses: Expenses;
  readonly projects: Projects;
  readonly clients: Clients;
  readonly contacts: Contacts;
  readonly tasks: Tasks;
  readonly users: Users;
  readonly invoices: Invoices;
  readonly reports: Reports;
  readonly outcomes: Outcomes;

  constructor(options: KeitoClientOptions) {
    const http = new HttpClient(options);
    this.timeEntries = new TimeEntries(http);
    this.expenses = new Expenses(http);
    this.projects = new Projects(http);
    this.clients = new Clients(http);
    this.contacts = new Contacts(http);
    this.tasks = new Tasks(http);
    this.users = new Users(http);
    this.invoices = new Invoices(http);
    this.reports = new Reports(http);
    this.outcomes = new Outcomes(http);
  }
}
