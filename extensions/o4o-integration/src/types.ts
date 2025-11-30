/**
 * Common Types for O4O Integration Extension
 */

export interface Block {
  id: string;
  type: string;
  attributes: Record<string, any>;
  innerBlocks?: Block[];
  order?: number;
  clientId?: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface AuthResponse {
  success: boolean;
  data: {
    user: any;
    accessToken: string;
    refreshToken: string;
  };
}
