import { FC } from 'react';
import { Loader2 } from 'lucide-react';
import { Button } from '@o4o/ui';

interface SocialLoginButtonsProps {
  disabled?: boolean;
}

interface ProviderConfig {
  name: string;
  icon: JSX.Element;
  bgColor: string;
  hoverColor: string;
  textColor: string;
  provider: 'google' | 'kakao' | 'naver';
}

export const SocialLoginButtons: FC<SocialLoginButtonsProps> = ({ disabled = false }) => {
  const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000/api';

  const providers: ProviderConfig[] = [
    {
      name: 'Google로 로그인',
      provider: 'google',
      bgColor: 'bg-white',
      hoverColor: 'hover:bg-gray-50',
      textColor: 'text-gray-700',
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
    // 백엔드 OAuth 엔드포인트로 리다이렉트
    const redirectUrl = `${API_BASE_URL}/v1/auth/${provider}`;
    window.location.href = redirectUrl;
  };

  return (
    <div className="space-y-3">
      {providers.map((provider) => (
        <button
          key={provider.provider}
          type="button"
          onClick={() => handleSocialLogin(provider.provider)}
          disabled={disabled}
          className={`
            w-full flex items-center justify-center px-4 py-3 
            border rounded-lg shadow-sm text-sm font-medium 
            transition-colors duration-200
            ${provider.bgColor} ${provider.hoverColor} ${provider.textColor}
            ${provider.provider === 'google' ? 'border-gray-300' : 'border-transparent'}
            ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
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

export default SocialLoginButtons;