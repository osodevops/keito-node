export const OutcomeTypes = {
  TICKET_RESOLVED: 'ticket_resolved',
  LEAD_QUALIFIED: 'lead_qualified',
  MEETING_BOOKED: 'meeting_booked',
  DOCUMENT_GENERATED: 'document_generated',
  CODE_REVIEW_COMPLETED: 'code_review_completed',
  DATA_PROCESSED: 'data_processed',
  EMAIL_SENT: 'email_sent',
  INVOICE_CREATED: 'invoice_created',
  WORKFLOW_COMPLETED: 'workflow_completed',
  CUSTOM: 'custom',
} as const;

export type OutcomeType = (typeof OutcomeTypes)[keyof typeof OutcomeTypes];
