import axios from 'axios';
import type { LoginCredentials, AuthResponse } from './types';

export class AuthClient {
  private baseURL: string;

  constructor(baseURL: string) {
    this.baseURL = baseURL;
  }

  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    const response = await axios.post(`${this.baseURL}/auth/login`, credentials);
    return response.data;
  }

  async logout(): Promise<void> {
    await axios.post(`${this.baseURL}/auth/logout`);
  }
}