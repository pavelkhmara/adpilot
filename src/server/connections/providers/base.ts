export type OAuthConfig = {
  clientId: string;
  clientSecret: string;
  authUrl: string;      // provider authorize endpoint
  tokenUrl: string;     // provider token endpoint
  scopes: string[];
  redirectUri: string;  // our callback URL
};

export type AuthUrlParams = { provider: string, state: string };

export interface ProviderAdapter {
  readonly name: 'meta_ads' | 'google_ads' | 'tt' | 'linkedin' | 'other';
  buildAuthUrl(cfg: OAuthConfig, params: AuthUrlParams): string;
  exchangeCode(cfg: OAuthConfig, code: string): Promise<{
    accessToken: string;
    refreshToken?: string;
    expiresIn?: number; // seconds
    scope?: string;
    raw?: unknown;
  }>;
  refreshToken?(cfg: OAuthConfig, refreshToken: string): Promise<{
    accessToken: string; refreshToken?: string; expiresIn?: number; raw?: unknown;
  }>;
}

// Helper: compute absolute redirect URL given NEXT_PUBLIC_APP_URL
export function buildRedirect(path: string): string {
  const base = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  return new URL(path, base).toString();
}
