import type { components } from './openapi.js';

// Common
export type Error = components['schemas']['Error'];
export type PaginationLinks = components['schemas']['PaginationLinks'];
export type PaginationEnvelope = components['schemas']['PaginationEnvelope'];
export type IdName = components['schemas']['IdName'];
export type Metadata = components['schemas']['Metadata'];

// Time Entries
export type TimeEntry = components['schemas']['TimeEntry'];
export type TimeEntryCreate = components['schemas']['TimeEntryCreate'];
export type TimeEntryUpdate = components['schemas']['TimeEntryUpdate'];

// Expenses
export type Expense = components['schemas']['Expense'];
export type ExpenseCreate = components['schemas']['ExpenseCreate'];

// Projects
export type Project = components['schemas']['Project'];

// Clients
export type Client = components['schemas']['Client'];
export type ClientCreate = components['schemas']['ClientCreate'];

// Contacts
export type Contact = components['schemas']['Contact'];
export type ContactCreate = components['schemas']['ContactCreate'];

// Tasks
export type Task = components['schemas']['Task'];

// Users
export type User = components['schemas']['User'];

// Invoices
export type Invoice = components['schemas']['Invoice'];
export type InvoiceCreate = components['schemas']['InvoiceCreate'];
export type InvoiceUpdate = components['schemas']['InvoiceUpdate'];
export type LineItem = components['schemas']['LineItem'];

// Invoice Messages
export type InvoiceMessage = components['schemas']['InvoiceMessage'];
export type InvoiceMessageCreate = components['schemas']['InvoiceMessageCreate'];

// Reports
export type TeamTimeResult = components['schemas']['TeamTimeResult'];
