import { VERSION } from '../version.js';
import {
  KeitoApiError,
  KeitoAuthError,
  KeitoConnectionError,
  KeitoConflictError,
  KeitoForbiddenError,
  KeitoNotFoundError,
  KeitoRateLimitError,
  KeitoTimeoutError,
  KeitoError,
} from './errors.js';

export interface KeitoClientOptions {
  apiKey?: string;
  accountId?: string;
  baseUrl?: string;
  maxRetries?: number;
  timeout?: number;
}

export interface RequestOptions {
  /** Reuse this key only for an identical retry on an endpoint that supports idempotency. */
  idempotencyKey?: string;
}

interface HttpRequestOptions extends RequestOptions {
  body?: unknown;
  query?: Record<string, unknown>;
  formData?: FormData;
  responseType?: 'json' | 'blob';
  retry?: boolean;
}

const DEFAULT_BASE_URL = 'https://app.keito.ai';
const DEFAULT_MAX_RETRIES = 3;
const DEFAULT_TIMEOUT = 30_000;
const RETRYABLE_STATUS_CODES = new Set([408, 429, 500, 502, 503, 504]);

function environment(name: string): string | undefined {
  const runtime = globalThis as typeof globalThis & { process?: { env?: Record<string, string | undefined> } };
  return runtime.process?.env?.[name];
}

function credential(value: string | undefined, option: string, variable: string): string {
  const resolved = value ?? environment(variable);
  if (typeof resolved !== 'string' || !resolved.trim()) {
    throw new KeitoError(`Provide ${option} or set ${variable}.`);
  }
  return resolved;
}

function normalizeBaseUrl(value: string): string {
  try {
    const url = new URL(value);
    const pathname = url.pathname.replace(/\/+$/, '');
    if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password || url.search || url.hash || !['', '/api/v2'].includes(pathname)) {
      throw new Error('Invalid base URL');
    }
    return url.origin;
  } catch {
    throw new KeitoError('baseUrl must be an HTTP(S) origin, optionally ending in /api/v2, without credentials, query or fragment.');
  }
}

export class HttpClient {
  readonly baseUrl: string;
  private readonly apiKey: string;
  private readonly accountId: string;
  private readonly maxRetries: number;
  private readonly timeout: number;

  constructor(options: KeitoClientOptions = {}) {
    this.apiKey = credential(options.apiKey, 'apiKey', 'KEITO_API_KEY');
    this.accountId = credential(options.accountId, 'accountId', 'KEITO_ACCOUNT_ID');
    this.baseUrl = normalizeBaseUrl(options.baseUrl ?? DEFAULT_BASE_URL);
    this.maxRetries = options.maxRetries ?? DEFAULT_MAX_RETRIES;
    this.timeout = options.timeout ?? DEFAULT_TIMEOUT;
  }

  async request<T>(
    method: string,
    path: string,
    options?: HttpRequestOptions,
  ): Promise<T> {
    const url = this.buildUrl(path, options?.query);
    const key = options?.idempotencyKey;
    if (key !== undefined && !/^[A-Za-z0-9._-]{8,255}$/.test(key)) {
      throw new KeitoError('idempotencyKey must contain 8–255 letters, numbers, dots, underscores or hyphens.');
    }
    const canRetry = options?.retry !== false && !options?.formData && (['GET', 'HEAD', 'OPTIONS'].includes(method.toUpperCase()) || key !== undefined);
    const maxRetries = canRetry ? this.maxRetries : 0;
    const body = options?.formData ?? (options?.body === undefined ? undefined : JSON.stringify(options.body));
    const headers: Record<string, string> = {
      'Authorization': `Bearer ${this.apiKey}`,
      'Keito-Account-Id': this.accountId,
      'User-Agent': `keito-node-sdk/${VERSION}`,
      ...(options?.formData ? {} : { 'Content-Type': 'application/json' }),
      'Accept': options?.responseType === 'blob' ? '*/*' : 'application/json',
      ...(key === undefined ? {} : { 'Idempotency-Key': key }),
    };

    let lastError: Error | undefined;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      if (attempt > 0) {
        await this.sleep(this.backoff(attempt, lastError));
      }

      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), this.timeout);

      try {
        const response = await fetch(url, {
          method,
          headers,
          body,
          signal: controller.signal,
          redirect: 'error',
        });

        if (response.ok) {
          if (response.status === 204) return undefined as T;
          if (options?.responseType === 'blob') return (await response.blob()) as T;
          return (await response.json()) as T;
        }

        const error = await this.parseError(response);

        if (RETRYABLE_STATUS_CODES.has(response.status) && attempt < maxRetries) {
          lastError = error;
          continue;
        }

        throw error;
      } catch (err) {
        if (err instanceof KeitoApiError) throw err;

        if (err instanceof DOMException && err.name === 'AbortError') {
          if (attempt < maxRetries) {
            lastError = new KeitoTimeoutError();
            continue;
          }
          throw new KeitoTimeoutError();
        }

        if (attempt < maxRetries) {
          lastError = err instanceof Error ? err : new Error(String(err));
          continue;
        }

        throw new KeitoConnectionError(
          err instanceof Error ? err : undefined,
        );
      } finally {
        clearTimeout(timer);
      }
    }

    throw lastError ?? new KeitoConnectionError();
  }

  private buildUrl(path: string, query?: Record<string, unknown>): string {
    if (!path.startsWith('/') || path.startsWith('//') || path.includes('\\')) {
      throw new KeitoError('Resource path must be a relative absolute-path reference on the configured origin.');
    }
    const url = new URL(path, this.baseUrl);
    if (url.origin !== this.baseUrl) {
      throw new KeitoError('Resource path must stay on the configured origin.');
    }
    if (query) {
      for (const [key, value] of Object.entries(query)) {
        if (value !== undefined && value !== null) {
          url.searchParams.set(key, String(value));
        }
      }
    }
    return url.toString();
  }

  private async parseError(response: Response): Promise<KeitoApiError> {
    let error = 'unknown_error';
    let error_description = '';
    let body: Record<string, unknown> | null = null;

    try {
      const parsed = await response.json();
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        body = parsed as Record<string, unknown>;
      }
      if (typeof body?.error === 'string') {
        error = body.error;
      }
      if (typeof body?.error_description === 'string') {
        error_description = body.error_description;
      }
    } catch {
      // response body not JSON
    }

    const headers = response.headers;
    const status = response.status;

    switch (status) {
      case 401:
        return new KeitoAuthError(error, error_description, headers, body);
      case 403:
        return new KeitoForbiddenError(error, error_description, headers, body);
      case 404:
        return new KeitoNotFoundError(error, error_description, headers, body);
      case 409:
        return new KeitoConflictError(error, error_description, headers, body);
      case 429:
        return new KeitoRateLimitError(error, error_description, headers, body);
      default:
        return new KeitoApiError(status, error, error_description, headers, body);
    }
  }

  private backoff(attempt: number, lastError?: Error): number {
    if (lastError instanceof KeitoRateLimitError && lastError.retryAfter) {
      return lastError.retryAfter * 1000;
    }
    const base = Math.min(2 ** (attempt - 1) * 500, 8000);
    const jitter = Math.random() * base * 0.5;
    return base + jitter;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
