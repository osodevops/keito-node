import { describe, it, expect } from 'vitest';
import * as sdk from '../src/index.js';

describe('Public API exports', () => {
  it('exports the Keito client class', () => {
    expect(sdk.Keito).toBeDefined();
    expect(typeof sdk.Keito).toBe('function');
  });

  it('exports error classes', () => {
    expect(sdk.KeitoError).toBeDefined();
    expect(sdk.KeitoApiError).toBeDefined();
    expect(sdk.KeitoAuthError).toBeDefined();
    expect(sdk.KeitoForbiddenError).toBeDefined();
    expect(sdk.KeitoNotFoundError).toBeDefined();
    expect(sdk.KeitoConflictError).toBeDefined();
    expect(sdk.KeitoRateLimitError).toBeDefined();
    expect(sdk.KeitoTimeoutError).toBeDefined();
    expect(sdk.KeitoConnectionError).toBeDefined();
  });

  it('exports PaginatedResponse', () => {
    expect(sdk.PaginatedResponse).toBeDefined();
    expect(typeof sdk.PaginatedResponse).toBe('function');
  });

  it('exports OutcomeTypes constants', () => {
    expect(sdk.OutcomeTypes).toBeDefined();
    expect(sdk.OutcomeTypes.TICKET_RESOLVED).toBe('ticket_resolved');
    expect(sdk.OutcomeTypes.LEAD_QUALIFIED).toBe('lead_qualified');
    expect(sdk.OutcomeTypes.MEETING_BOOKED).toBe('meeting_booked');
    expect(sdk.OutcomeTypes.DOCUMENT_GENERATED).toBe('document_generated');
    expect(sdk.OutcomeTypes.CODE_REVIEW_COMPLETED).toBe('code_review_completed');
    expect(sdk.OutcomeTypes.DATA_PROCESSED).toBe('data_processed');
    expect(sdk.OutcomeTypes.EMAIL_SENT).toBe('email_sent');
    expect(sdk.OutcomeTypes.INVOICE_CREATED).toBe('invoice_created');
    expect(sdk.OutcomeTypes.WORKFLOW_COMPLETED).toBe('workflow_completed');
    expect(sdk.OutcomeTypes.CUSTOM).toBe('custom');
  });

  it('exports VERSION', () => {
    expect(sdk.VERSION).toBeDefined();
    expect(typeof sdk.VERSION).toBe('string');
    expect(sdk.VERSION).toMatch(/^\d+\.\d+\.\d+/);
  });
});
