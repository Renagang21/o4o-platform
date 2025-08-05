// OAuth Provider Types
export type OAuthProvider = 'google' | 'kakao' | 'naver';

// OAuth Configuration Interface
export interface OAuthConfig {
  provider: OAuthProvider;
  enabled: boolean;
  clientId: string;
  clientSecret: string;
  callbackUrl: string;
  scope: string[];
  additionalParams?: Record<string, string>;
}

// OAuth Settings Data Interface
export interface OAuthSettingsData {
  google: OAuthConfig;
  kakao: OAuthConfig;
  naver: OAuthConfig;
}

// OAuth Test Result Interface
export interface OAuthTestResult {
  provider: OAuthProvider;
  success: boolean;
  message: string;
  timestamp: Date;
}

// OAuth Provider Info Interface
export interface OAuthProviderInfo {
  name: string;
  displayName: string;
  icon: string;
  color: string;
  setupUrl: string;
  defaultScopes: string[];
}

// OAuth Form Field Interface
export interface OAuthFormField {
  name: keyof OAuthConfig;
  label: string;
  type: 'text' | 'password' | 'checkbox' | 'select';
  placeholder?: string;
  required?: boolean;
  sensitive?: boolean;
  readonly?: boolean;
  helpText?: string;
}

// OAuth API Response Types
export interface OAuthSettingsResponse {
  success: boolean;
  data: OAuthSettingsData;
  message?: string;
}

export interface OAuthUpdateRequest {
  provider: OAuthProvider;
  config: Partial<OAuthConfig>;
}

export interface OAuthUpdateResponse {
  success: boolean;
  message: string;
  data?: OAuthConfig;
}

export interface OAuthTestRequest {
  provider: OAuthProvider;
}

export interface OAuthTestResponse {
  success: boolean;
  message: string;
  details?: {
    authUrl?: string;
    tokenUrl?: string;
    userInfoUrl?: string;
  };
}