import { FC, useState, useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import { Button } from '@o4o/ui';
import { apiClient } from '@/services/api';

interface SocialLoginButtonsV2Props {
  disabled?: boolean;
}

interface ProviderConfig {
  name: string;
  icon: JSX.Element;
  bgColor: string;
  hoverColor: string;
  textColor: string;
  borderColor?: string;
  provider: 'google' | 'kakao' | 'naver';
}

interface OAuthProvidersResponse {
  providers: {
    google: { enabled: boolean };
    kakao: { enabled: boolean };
    naver: { enabled: boolean };
  };
}

export const SocialLoginButtonsV2: FC<SocialLoginButtonsV2Props> = ({ disabled = false }) => {
  const [enabledProviders, setEnabledProviders] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000/api';

  useEffect(() => {
    fetchEnabledProviders();
  }, []);

  const fetchEnabledProviders = async () => {
    try {
      const response = await apiClient.get<OAuthProvidersResponse>('/settings/oauth/providers');
      const providers = response.data.providers;
      
      const enabled = new Set<string>();
      Object.entries(providers).forEach(([provider, config]) => {
        if (config.enabled) {
          enabled.add(provider);
        }
      });
      
      setEnabledProviders(enabled);
    } catch (error) {
    // Error logging - use proper error handler
      // Default to showing all providers if fetch fails
      setEnabledProviders(new Set(['google', 'kakao', 'naver']));
    } finally {
      setLoading(false);
    }
  };

  const providers: ProviderConfig[] = [
    {
      name: 'Google로 로그인',
      provider: 'google',
      bgColor: 'bg-white',
      hoverColor: 'hover:bg-gray-50',
      textColor: 'text-gray-700',
      borderColor: 'border-gray-300',
      icon: (
        <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
          <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
          <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
          <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
          <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
        </svg>
      )
    },
    {
      name: '네이버로 로그인',
      provider: 'naver',
      bgColor: 'bg-[#03C75A]',
      hoverColor: 'hover:bg-[#02B350]',
      textColor: 'text-white',
      icon: (
        <span className="w-5 h-5 mr-2 font-bold text-white flex items-center justify-center">N</span>
      )
    },
    {
      name: '카카오로 로그인',
      provider: 'kakao',
      bgColor: 'bg-[#FEE500]',
      hoverColor: 'hover:bg-[#FDD835]',
      textColor: 'text-gray-900',
      icon: (
        <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 3c5.8 0 10.5 3.7 10.5 8.3 0 2.9-1.9 5.5-4.8 7.1l1.3 4.8c.1.4-.3.7-.6.4l-5.7-3.8c-.6.1-1.1.1-1.7.1-5.8 0-10.5-3.7-10.5-8.3S6.2 3 12 3z"/>
        </svg>
      )
    }
  ];

  const handleSocialLogin = (provider: 'google' | 'kakao' | 'naver') => {
    // Redirect to backend OAuth endpoint
    const redirectUrl = `${API_BASE_URL}/v1/auth/${provider}`;
    window.location.href = redirectUrl;
  };

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
      </div>
    );
  }

  // Filter providers based on enabled status
  const activeProviders = providers.filter(p => enabledProviders.has(p.provider));

  if (activeProviders.length === 0) {
    return null;
  }

  return (
    <div className="space-y-3">
      {activeProviders.map((provider) => (
        <button
          key={provider.provider}
          type="button"
          onClick={() => handleSocialLogin(provider.provider)}
          disabled={disabled}
          className={`
            w-full flex items-center justify-center px-4 py-3 
            border rounded-lg shadow-sm text-sm font-medium 
            transition-all duration-200 transform
            ${provider.bgColor} ${provider.hoverColor} ${provider.textColor}
            ${provider.borderColor ? `border ${provider.borderColor}` : 'border-transparent'}
            ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:shadow-md hover:-translate-y-0.5'}
            focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary
          `}
        >
          {disabled ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <>
              {provider.icon}
              {provider.name}
            </>
          )}
        </button>
      ))}
    </div>
  );
};

export default SocialLoginButtonsV2;