import { OAuthProviderInfo, OAuthFormField } from '@/types/oauth';

// OAuth Provider Information
export const OAUTH_PROVIDERS: Record<string, OAuthProviderInfo> = {
  google: {
    name: 'google',
    displayName: 'Google',
    icon: '🔍',
    color: '#4285F4',
    setupUrl: 'https://console.cloud.google.com/apis/credentials',
    defaultScopes: ['openid', 'profile', 'email']
  },
  kakao: {
    name: 'kakao',
    displayName: 'Kakao',
    icon: '💬',
    color: '#FEE500',
    setupUrl: 'https://developers.kakao.com/console/app',
    defaultScopes: ['profile_nickname', 'account_email']
  },
  naver: {
    name: 'naver',
    displayName: 'Naver',
    icon: '🟢',
    color: '#03C75A',
    setupUrl: 'https://developers.naver.com/apps/#/register',
    defaultScopes: ['name', 'email']
  }
};

// OAuth Form Fields Configuration
export const OAUTH_FORM_FIELDS: OAuthFormField[] = [
  {
    name: 'enabled',
    label: '활성화',
    type: 'checkbox',
    helpText: '이 OAuth 제공자를 활성화합니다'
  },
  {
    name: 'clientId',
    label: 'Client ID',
    type: 'text',
    placeholder: 'OAuth 애플리케이션의 Client ID를 입력하세요',
    required: true,
    helpText: 'OAuth 제공자에서 발급받은 Client ID'
  },
  {
    name: 'clientSecret',
    label: 'Client Secret',
    type: 'password',
    placeholder: 'OAuth 애플리케이션의 Client Secret을 입력하세요',
    required: true,
    sensitive: true,
    helpText: 'OAuth 제공자에서 발급받은 Client Secret (안전하게 암호화되어 저장됩니다)'
  },
  {
    name: 'callbackUrl',
    label: 'Callback URL',
    type: 'text',
    readonly: true,
    helpText: '이 URL을 OAuth 제공자의 리다이렉트 URI로 등록하세요'
  }
];

// OAuth Scope Options
export const OAUTH_SCOPE_OPTIONS: Record<string, { value: string; label: string }[]> = {
  google: [
    { value: 'openid', label: 'OpenID (필수)' },
    { value: 'profile', label: '프로필 정보' },
    { value: 'email', label: '이메일 주소' },
    { value: 'https://www.googleapis.com/auth/userinfo.profile', label: '상세 프로필' }
  ],
  kakao: [
    { value: 'profile_nickname', label: '닉네임' },
    { value: 'profile_image', label: '프로필 이미지' },
    { value: 'account_email', label: '이메일' },
    { value: 'gender', label: '성별' },
    { value: 'age_range', label: '연령대' },
    { value: 'birthday', label: '생일' }
  ],
  naver: [
    { value: 'name', label: '이름' },
    { value: 'email', label: '이메일' },
    { value: 'nickname', label: '별명' },
    { value: 'profile_image', label: '프로필 이미지' },
    { value: 'age', label: '연령대' },
    { value: 'gender', label: '성별' },
    { value: 'birthday', label: '생일' }
  ]
};