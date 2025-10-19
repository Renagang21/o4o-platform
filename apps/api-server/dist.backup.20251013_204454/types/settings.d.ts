export type OAuthProvider = 'google' | 'kakao' | 'naver';
export interface OAuthConfig {
    provider: OAuthProvider;
    enabled: boolean;
    clientId: string;
    clientSecret: string;
    callbackUrl: string;
    scope: string[];
    additionalParams?: Record<string, string>;
}
export interface OAuthSettingsData {
    google: OAuthConfig;
    kakao: OAuthConfig;
    naver: OAuthConfig;
}
export interface OAuthUpdateRequest {
    provider: OAuthProvider;
    config: Partial<OAuthConfig>;
}
export interface OAuthTestRequest {
    provider: OAuthProvider;
}
//# sourceMappingURL=settings.d.ts.map