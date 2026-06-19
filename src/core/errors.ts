export class KeitoError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'KeitoError';
  }
}

export class KeitoApiError extends KeitoError {
  readonly status: number;
  readonly error: string;
  readonly error_description: string;
  readonly headers: Headers;
  readonly body: Record<string, unknown> | null;

  constructor(
    status: number,
    error: string,
    error_description: string,
    headers: Headers,
    body: Record<string, unknown> | null = null,
  ) {
    super(`${status} ${error}: ${error_description}`);
    this.name = 'KeitoApiError';
    this.status = status;
    this.error = error;
    this.error_description = error_description;
    this.headers = headers;
    this.body = body;
  }
}

export class KeitoAuthError extends KeitoApiError {
  constructor(
    error: string,
    error_description: string,
    headers: Headers,
    body: Record<string, unknown> | null = null,
  ) {
    super(401, error, error_description, headers, body);
    this.name = 'KeitoAuthError';
  }
}

export class KeitoForbiddenError extends KeitoApiError {
  constructor(
    error: string,
    error_description: string,
    headers: Headers,
    body: Record<string, unknown> | null = null,
  ) {
    super(403, error, error_description, headers, body);
    this.name = 'KeitoForbiddenError';
  }
}

export class KeitoNotFoundError extends KeitoApiError {
  constructor(
    error: string,
    error_description: string,
    headers: Headers,
    body: Record<string, unknown> | null = null,
  ) {
    super(404, error, error_description, headers, body);
    this.name = 'KeitoNotFoundError';
  }
}

export class KeitoConflictError extends KeitoApiError {
  constructor(
    error: string,
    error_description: string,
    headers: Headers,
    body: Record<string, unknown> | null = null,
  ) {
    super(409, error, error_description, headers, body);
    this.name = 'KeitoConflictError';
  }
}

export class KeitoRateLimitError extends KeitoApiError {
  readonly retryAfter: number | null;

  constructor(
    error: string,
    error_description: string,
    headers: Headers,
    body: Record<string, unknown> | null = null,
  ) {
    super(429, error, error_description, headers, body);
    this.name = 'KeitoRateLimitError';
    const ra = headers.get('retry-after');
    this.retryAfter = ra ? parseInt(ra, 10) : null;
  }
}

export class KeitoTimeoutError extends KeitoError {
  constructor() {
    super('Request timed out');
    this.name = 'KeitoTimeoutError';
  }
}

export class KeitoConnectionError extends KeitoError {
  constructor(cause?: Error) {
    super(`Connection error: ${cause?.message ?? 'unknown'}`);
    this.name = 'KeitoConnectionError';
    if (cause) this.cause = cause;
  }
}
