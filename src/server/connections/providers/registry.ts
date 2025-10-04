import { buildRedirect, type OAuthConfig, type ProviderAdapter } from './base';
import { GoogleProvider } from './google';
import { MockProvider } from './mock';

export function getProviderAdapter(name: string): ProviderAdapter {
  switch (name) {
    case 'google_ads':
      return GoogleProvider;
    // case 'meta_ads': return MetaProvider;
    // case 'tt': return TikTokProvider;
    // case 'linkedin': return LinkedInProvider;
    default:
      return MockProvider;
  }
}

export function getProviderConfig(name: string): OAuthConfig {
  const redirectUri = buildRedirect('/api/connections/oauth/callback');
  switch (name) {
    case 'google_ads':
      return {
        clientId: process.env.GOOGLE_ADS_CLIENT_ID || 'dev',
        clientSecret: process.env.GOOGLE_ADS_CLIENT_SECRET || 'dev',
        authUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
        tokenUrl: 'https://oauth2.googleapis.com/token',
        scopes: ['https://www.googleapis.com/auth/adwords'],
        redirectUri,
      };
    default:
      return {
        clientId: 'mock',
        clientSecret: 'mock',
        authUrl: 'https://example.com/mock-auth',
        tokenUrl: 'https://example.com/mock-token',
        scopes: ['mock.scope'],
        redirectUri,
      };
  }
}