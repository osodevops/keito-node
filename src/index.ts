export { Keito } from './client.js';
export { type KeitoClientOptions } from './core/http.js';
export {
  KeitoError,
  KeitoApiError,
  KeitoAuthError,
  KeitoForbiddenError,
  KeitoNotFoundError,
  KeitoConflictError,
  KeitoRateLimitError,
  KeitoTimeoutError,
  KeitoConnectionError,
} from './core/errors.js';
export { PaginatedResponse } from './core/pagination.js';
export { OutcomeTypes, type OutcomeType } from './outcome-types.js';
export { VERSION } from './version.js';

// Resource types
export type { ListTimeEntriesParams } from './resources/time-entries.js';
export type { ListExpensesParams } from './resources/expenses.js';
export type { ListProjectsParams } from './resources/projects.js';
export type { ListClientsParams } from './resources/clients.js';
export type { ListContactsParams } from './resources/contacts.js';
export type { ListTasksParams } from './resources/tasks.js';
export type {
  ListInvoicesParams,
  ListInvoiceMessagesParams,
} from './resources/invoices.js';
export type {
  TeamTimeReportParams,
  AgentSummaryParams,
  AgentSummary,
} from './resources/reports.js';
export type { OutcomeLogParams } from './resources/outcomes.js';

// Generated model types
export type {
  TimeEntry,
  TimeEntryCreate,
  TimeEntryUpdate,
  Expense,
  ExpenseCreate,
  Project,
  Client,
  ClientCreate,
  Contact,
  ContactCreate,
  Task,
  User,
  Invoice,
  InvoiceCreate,
  InvoiceUpdate,
  LineItem,
  InvoiceMessage,
  InvoiceMessageCreate,
  TeamTimeResult,
  Metadata,
  IdName,
} from './generated/models.js';
