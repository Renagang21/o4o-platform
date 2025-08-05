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

// OAuth Update Request Interface
export interface OAuthUpdateRequest {
  provider: OAuthProvider;
  config: Partial<OAuthConfig>;
}

// OAuth Test Request Interface
export interface OAuthTestRequest {
  provider: OAuthProvider;
}