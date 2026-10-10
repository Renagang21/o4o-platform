import { unifiedApi } from './unified-client';
import { apiEndpoints } from '@/config/apps.config';

export interface GeneralSettings {
  siteName: string;
  siteDescription: string;
  siteUrl: string;
  adminEmail: string;
  timezone: string;
  dateFormat: string;
  timeFormat: string;
  language: string;
  maintenanceMode: boolean;
  maintenanceMessage?: string;
}

export interface EmailSettings {
  provider: 'smtp' | 'sendgrid' | 'ses' | 'mailgun';
  smtpHost?: string;
  smtpPort?: number;
  smtpUser?: string;
  smtpPass?: string;
  smtpSecure?: boolean;
  apiKey?: string;
  fromEmail: string;
  fromName: string;
  replyToEmail?: string;
  templates: {
    [key: string]: {
      subject: string;
      body: string;
      variables: string[];
    };
  };
}

interface SettingsResponse<T> {
  success: boolean;
  data: T;
}

function unwrapSettings<T>(response: SettingsResponse<T>): T {
  if (!response?.success || !response.data || typeof response.data !== 'object' || Array.isArray(response.data)) {
    throw new Error('설정 응답을 확인할 수 없습니다. 다시 시도해주세요.');
  }
  return response.data;
}

class SettingsService {
  // WO-O4O-ADMIN-DASHBOARD-LEGACY-ROUTE-API-AND-NAVIGATION-CLOSURE-V1:
  //   backend 는 `/api/v1/settings/:type` (type = general | email | …) 뿐이다.
  //   `unifiedApi.raw` 의 base 가 `/api` 이므로 endpoint 는 `/v1/settings/...` 로 붙인다
  //   (production smoke 에서 `/api/settings/email` 404 확인 후 교정).
  //   appearance/integrations/security 묶음 · upload/test/export/import/reset 계열은
  //   backend 없음 · 소비처 0 이라 제거했다.

  // General Settings
  async getGeneralSettings(): Promise<GeneralSettings> {
    const response = await unifiedApi.raw.get<SettingsResponse<GeneralSettings>>(apiEndpoints.settings.general);
    return unwrapSettings(response.data);
  }

  async updateGeneralSettings(settings: Partial<GeneralSettings>): Promise<GeneralSettings> {
    const response = await unifiedApi.raw.put<SettingsResponse<GeneralSettings>>(apiEndpoints.settings.general, settings);
    return unwrapSettings(response.data);
  }

  // Email Settings
  async getEmailSettings(): Promise<EmailSettings> {
    const response = await unifiedApi.raw.get<SettingsResponse<EmailSettings>>(apiEndpoints.settings.email);
    return unwrapSettings(response.data);
  }

  async updateEmailSettings(settings: Partial<EmailSettings>): Promise<EmailSettings> {
    const response = await unifiedApi.raw.put<SettingsResponse<EmailSettings>>(apiEndpoints.settings.email, settings);
    return unwrapSettings(response.data);
  }
}

export const settingsService = new SettingsService();
