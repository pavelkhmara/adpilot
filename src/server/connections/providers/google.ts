import type { OAuthConfig, ProviderAdapter } from './base';

export const GoogleProvider: ProviderAdapter = {
  name: 'google_ads',
  buildAuthUrl(cfg: OAuthConfig, { state }) {
    const url = new URL(cfg.authUrl);
    url.searchParams.set('client_id', cfg.clientId);
    url.searchParams.set('redirect_uri', cfg.redirectUri);
    url.searchParams.set('response_type', 'code');
    url.searchParams.set('access_type', 'offline');
    url.searchParams.set('include_granted_scopes', 'true');
    url.searchParams.set('scope', cfg.scopes.join(' '));
    url.searchParams.set('state', state);
    return url.toString();
  },
  async exchangeCode(_cfg: OAuthConfig, code: string) {
    // TODO: call token endpoint with clientSecret (use fetch) and return tokens
    // For now, act like dev until secrets wired:
    return { accessToken: `dev_google_access_${code}`, refreshToken: `dev_google_refresh_${code}`, expiresIn: 3500 };
  },
  async refreshToken(_cfg, rt) {
    // TODO: real HTTP call to token endpoint with grant_type=refresh_token
    return { accessToken: `dev_google_access_ref_${Date.now()}`, refreshToken: rt, expiresIn: 3500 };
  },
};