import { FC } from 'react';

interface SocialLoginButtonsProps {
  onSocialLogin?: (provider: 'google' | 'kakao' | 'naver') => void;
  disabled?: boolean;
  showLabels?: boolean;
  size?: 'small' | 'medium' | 'large';
}

export const SocialLoginButtons: FC<SocialLoginButtonsProps> = ({
  onSocialLogin,
  disabled = false,
  showLabels = true,
  size = 'medium'
}) => {
  const baseUrl = '/api/v1';

  const handleSocialLogin = (provider: 'google' | 'kakao' | 'naver') => {
    if (onSocialLogin) {
      onSocialLogin(provider);
    }
    // Redirect to OAuth endpoint
    window.location.href = `${baseUrl}/auth/${provider}`;
  };

  const sizeClasses = {
    small: 'px-3 py-1.5 text-sm',
    medium: 'px-4 py-2',
    large: 'px-6 py-3 text-lg'
  };

  const iconSizes = {
    small: 'w-4 h-4',
    medium: 'w-5 h-5',
    large: 'w-6 h-6'
  };

  return (
    <div className="space-y-3">
      {/* Google Login Button */}
      <button
        onClick={() => handleSocialLogin('google')}
        disabled={disabled}
        className={`w-full flex items-center justify-center gap-3 ${sizeClasses[size as keyof typeof sizeClasses]} bg-white border border-gray-300 rounded-lg shadow-sm hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors`}
      >
        <svg className={iconSizes[size as keyof typeof iconSizes]} viewBox="0 0 24 24">
          <path
            fill="#4285F4"
            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
          />
          <path
            fill="#34A853"
            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
          />
          <path
            fill="#FBBC05"
            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
          />
          <path
            fill="#EA4335"
            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
          />
        </svg>
        {showLabels && <span className="text-gray-700">Google로 로그인</span>}
      </button>

      {/* Kakao Login Button */}
      <button
        onClick={() => handleSocialLogin('kakao')}
        disabled={disabled}
        className={`w-full flex items-center justify-center gap-3 ${sizeClasses[size]} bg-[#FEE500] rounded-lg shadow-sm hover:bg-[#FDD835] disabled:opacity-50 disabled:cursor-not-allowed transition-colors`}
      >
        <svg className={iconSizes[size as keyof typeof iconSizes]} viewBox="0 0 24 24">
          <path
            fill="#000000"
            d="M12 3c-5.52 0-10 3.432-10 7.66 0 2.742 1.882 5.146 4.71 6.507l-.968 3.534c-.062.227.102.463.34.494.067.008.134 0 .197-.023l4.299-2.853c.472.05.945.075 1.422.075 5.52 0 10-3.432 10-7.66S17.52 3 12 3z"
          />
        </svg>
        {showLabels && <span className="text-black/85">카카오로 로그인</span>}
      </button>

      {/* Naver Login Button */}
      <button
        onClick={() => handleSocialLogin('naver')}
        disabled={disabled}
        className={`w-full flex items-center justify-center gap-3 ${sizeClasses[size]} bg-[#03C75A] rounded-lg shadow-sm hover:bg-[#02B350] disabled:opacity-50 disabled:cursor-not-allowed transition-colors`}
      >
        <svg className={iconSizes[size as keyof typeof iconSizes]} viewBox="0 0 24 24">
          <path
            fill="#FFFFFF"
            d="M16.273 12.845L7.376 0H0v24h7.726V11.156L16.624 24H24V0h-7.727v12.845z"
          />
        </svg>
        {showLabels && <span className="text-white">네이버로 로그인</span>}
      </button>
    </div>
  );
};