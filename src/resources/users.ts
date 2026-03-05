import type { HttpClient } from '../core/http.js';
import type { User } from '../generated/models.js';

export class Users {
  constructor(private readonly http: HttpClient) {}

  async me(): Promise<User> {
    return this.http.request<User>('GET', '/api/v2/users/me');
  }
}
