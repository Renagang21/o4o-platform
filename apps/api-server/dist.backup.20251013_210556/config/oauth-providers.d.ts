import { OAuthProvider } from '../types/settings';
export interface OAuthProviderConfig {
    authUrl: string;
    tokenUrl: string;
    userInfoUrl: string;
}
export declare const OAUTH_PROVIDER_CONFIGS: Record<OAuthProvider, OAuthProviderConfig>;
export declare function getOAuthProviderConfig(provider: OAuthProvider): OAuthProviderConfig | null;
//# sourceMappingURL=oauth-providers.d.ts.map