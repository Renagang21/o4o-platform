import { api } from './base';
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

export interface AppearanceSettings {
  theme: 'light' | 'dark' | 'system';
  primaryColor: string;
  secondaryColor: string;
  fontFamily: string;
  logoUrl?: string;
  faviconUrl?: string;
  customCss?: string;
}

export interface EmailSettings {
  provider: 'smtp' | 'sendgrid' | 'ses' | 'mailgun';
  smtpHost?: string;
  smtpPort?: number;
  smtpUser?: string;
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

export interface IntegrationSettings {
  apps: {
    forum: {
      enabled: boolean;
      apiKey?: string;
      webhookUrl?: string;
      autoSync: boolean;
      syncInterval?: number;
    };
    signage: {
      enabled: boolean;
      apiKey?: string;
      defaultPlaylist?: string;
      autoApprove: boolean;
    };
    crowdfunding: {
      enabled: boolean;
      apiKey?: string;
      paymentGateway: string;
      feePercentage: number;
      minCampaignAmount: number;
    };
  };
  payment: {
    stripe?: {
      enabled: boolean;
      publicKey?: string;
      secretKey?: string;
      webhookSecret?: string;
    };
    paypal?: {
      enabled: boolean;
      clientId?: string;
      clientSecret?: string;
      sandbox: boolean;
    };
  };
  analytics: {
    googleAnalytics?: {
      enabled: boolean;
      trackingId?: string;
    };
    mixpanel?: {
      enabled: boolean;
      projectToken?: string;
    };
  };
  storage: {
    provider: 'local' | 's3' | 'gcs' | 'azure';
    s3?: {
      bucket: string;
      region: string;
      accessKeyId?: string;
      secretAccessKey?: string;
    };
  };
}

export interface SecuritySettings {
  passwordPolicy: {
    minLength: number;
    requireUppercase: boolean;
    requireLowercase: boolean;
    requireNumbers: boolean;
    requireSpecialChars: boolean;
    expiryDays?: number;
  };
  twoFactorAuth: {
    enabled: boolean;
    required: boolean;
    methods: ('totp' | 'sms' | 'email')[];
  };
  sessionTimeout: number;
  ipWhitelist?: string[];
  ipBlacklist?: string[];
  maxLoginAttempts: number;
  lockoutDuration: number;
  cors: {
    enabled: boolean;
    origins: string[];
  };
}

export interface AllSettings {
  general: GeneralSettings;
  appearance: AppearanceSettings;
  email: EmailSettings;
  integrations: IntegrationSettings;
  security: SecuritySettings;
}

class SettingsService {
  // General Settings
  async getGeneralSettings(): Promise<GeneralSettings> {
    const response = await api.get<GeneralSettings>((apiEndpoints.settings as any).general);
    return response.data;
  }

  async updateGeneralSettings(settings: Partial<GeneralSettings>): Promise<GeneralSettings> {
    const response = await api.put<GeneralSettings>((apiEndpoints.settings as any).general, settings);
    return response.data;
  }

  // Appearance Settings
  async getAppearanceSettings(): Promise<AppearanceSettings> {
    const response = await api.get<AppearanceSettings>((apiEndpoints.settings as any).appearance);
    return response.data;
  }

  async updateAppearanceSettings(settings: Partial<AppearanceSettings>): Promise<AppearanceSettings> {
    const response = await api.put<AppearanceSettings>((apiEndpoints.settings as any).appearance, settings);
    return response.data;
  }

  async uploadLogo(file: File): Promise<{ url: string }> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('type', 'logo');

    const response = await api.post<{ url: string }>(`${(apiEndpoints.settings as any).appearance}/upload`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  }

  // Email Settings
  async getEmailSettings(): Promise<EmailSettings> {
    const response = await api.get<EmailSettings>((apiEndpoints.settings as any).email);
    return response.data;
  }

  async updateEmailSettings(settings: Partial<EmailSettings>): Promise<EmailSettings> {
    const response = await api.put<EmailSettings>((apiEndpoints.settings as any).email, settings);
    return response.data;
  }

  async testEmailSettings(testEmail: string): Promise<{ success: boolean; message: string }> {
    const response = await api.post<{ success: boolean; message: string }>(
      `${(apiEndpoints.settings as any).email}/test`,
      { testEmail }
    );
    return response.data;
  }

  // Integration Settings
  async getIntegrationSettings(): Promise<IntegrationSettings> {
    const response = await api.get<IntegrationSettings>((apiEndpoints.settings as any).integrations);
    return response.data;
  }

  async updateIntegrationSettings(settings: Partial<IntegrationSettings>): Promise<IntegrationSettings> {
    const response = await api.put<IntegrationSettings>((apiEndpoints.settings as any).integrations, settings);
    return response.data;
  }

  async testIntegration(integration: string): Promise<{ success: boolean; message: string }> {
    const response = await api.post<{ success: boolean; message: string }>(
      `${(apiEndpoints.settings as any).integrations}/test/${integration}`
    );
    return response.data;
  }

  // Security Settings
  async getSecuritySettings(): Promise<SecuritySettings> {
    const response = await api.get<SecuritySettings>('/v1/settings/security');
    return response.data;
  }

  async updateSecuritySettings(settings: Partial<SecuritySettings>): Promise<SecuritySettings> {
    const response = await api.put<SecuritySettings>('/v1/settings/security', settings);
    return response.data;
  }

  // All Settings (bulk operations)
  async getAllSettings(): Promise<AllSettings> {
    const [general, appearance, email, integrations, security] = await Promise.all([
      this.getGeneralSettings(),
      this.getAppearanceSettings(),
      this.getEmailSettings(),
      this.getIntegrationSettings(),
      this.getSecuritySettings(),
    ]);

    return {
      general,
      appearance,
      email,
      integrations,
      security,
    };
  }

  async exportSettings(): Promise<Blob> {
    const response = await api.get('/v1/settings/export', {
      responseType: 'blob',
    });
    return response.data;
  }

  async importSettings(file: File): Promise<{ success: boolean; message: string }> {
    const formData = new FormData();
    formData.append('file', file);

    const response = await api.post<{ success: boolean; message: string }>(
      '/v1/settings/import',
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      }
    );
    return response.data;
  }

  // Reset settings
  async resetSettings(section?: 'general' | 'appearance' | 'email' | 'integrations' | 'security'): Promise<void> {
    const endpoint = section ? `/v1/settings/${section}/reset` : '/v1/settings/reset';
    await api.post(endpoint);
  }

  // Cache management
  async clearCache(type?: 'all' | 'settings' | 'content' | 'users'): Promise<void> {
    await api.post('/v1/settings/cache/clear', { type: type || 'all' });
  }
}

export const settingsService = new SettingsService();