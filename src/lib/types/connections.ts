export type Provider = 'meta_ads' | 'google_ads' | 'tt' | 'linkedin' | 'other';
export type PROVIDER_DB = 'META_ADS' | 'GOOGLE_ADS' | 'TT' | 'LINKEDIN' | 'OTHER';

export type ConnectionStatus =
  | 'connected'
  | 'needs_reauth'
  | 'syncing'
  | 'error'
  | 'not_connected'
  | 'disconnected';


  export type ConnectionHealth = { expiresSoon: boolean; rateLimited: boolean };
  
// Что вернём на дашборд (сжатый срез)
export type ConnectionSummaryItem = {
  provider: Provider;
  status: ConnectionStatus;   // агрегированный статус по провайдеру
  accountsCount: number;      // сколько подключено аккаунтов у провайдера
  lastSyncAt: string | null;  // максимальная дата синка по провайдеру (ISO)
  errorHint?: string;         // короткая подсказка (например, кол-во ошибок)
  health?: ConnectionHealth;
};

export type ConnectionSummaryResponse = {
  items: ConnectionSummaryItem[];
};

