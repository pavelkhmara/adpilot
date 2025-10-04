import type { OAuthConfig, ProviderAdapter } from './base';

export const MockProvider: ProviderAdapter = {
  name: 'other',
  buildAuthUrl(cfg: OAuthConfig, { provider, state }) {
    // In dev we just bounce back to our callback with a fake "code"
    const url = new URL(cfg.redirectUri);
    url.searchParams.set('provider', provider);
    url.searchParams.set('state', state);
    url.searchParams.set('code', 'mock_code');
    return url.toString();
  },
  async exchangeCode(_cfg: OAuthConfig, code: string) {
    // Accept any code in dev
    return {
      accessToken: `mock_access_${code}`,
      refreshToken: `mock_refresh_${code}`,
      expiresIn: 3600,
      raw: { dev: true },
    };
  },
  async refreshToken(_cfg, rt) { 
    return { 
      accessToken: `mock_access_ref_${Date.now()}`, 
      refreshToken: rt, 
      expiresIn: 3600, 
      raw: { devRefresh: true } 
    }; 
  },
};