import { useState, useCallback, useEffect } from 'react';
import { Save, Copy, Check, AlertCircle, ExternalLink, Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { authClient } from '@o4o/auth-client';
import { useAdminNotices } from '@/hooks/useAdminNotices';
import { 
  OAuthProvider, 
  OAuthConfig, 
  OAuthSettingsResponse,
  OAuthUpdateRequest,
  OAuthUpdateResponse
} from '@/types/oauth';
import { OAUTH_PROVIDERS } from '@/constants/oauth';

const OAuthSettings = () => {
  const { addNotice } = useAdminNotices();
  const queryClient = useQueryClient();
  const [showSecrets, setShowSecrets] = useState<Record<OAuthProvider, boolean>>({
    google: false,
    kakao: false,
    naver: false
  });
  const [copiedUrls, setCopiedUrls] = useState<Record<OAuthProvider, boolean>>({
    google: false,
    kakao: false,
    naver: false
  });
  
  // Local state for form data - prevents immediate saving
  const [localSettings, setLocalSettings] = useState<Record<OAuthProvider, OAuthConfig>>({
    google: { provider: 'google', enabled: false, clientId: '', clientSecret: '', callbackUrl: '', scope: [] },
    kakao: { provider: 'kakao', enabled: false, clientId: '', clientSecret: '', callbackUrl: '', scope: [] },
    naver: { provider: 'naver', enabled: false, clientId: '', clientSecret: '', callbackUrl: '', scope: [] }
  });
  
  // Track which providers have unsaved changes
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState<Record<OAuthProvider, boolean>>({
    google: false,
    kakao: false,
    naver: false
  });

  // Fetch OAuth settings (use admin endpoint to get secrets)
  const { data: settings, isLoading } = useQuery<OAuthSettingsResponse>({
    queryKey: ['oauth-settings'],
    queryFn: async () => {
      try {
        const response = await authClient.api.get('/settings/oauth/admin');
        return response.data;
      } catch (error: any) {
        // API not implemented yet - return empty settings
        if (error.response?.status === 404) {
          console.warn('[OAuthSettings] OAuth settings API not yet implemented');
          return { success: true, data: { google: {}, kakao: {}, naver: {} } };
        }
        throw error;
      }
    },
    retry: false, // Don't retry on 404
  });

  // Sync server settings to local state when data loads
  useEffect(() => {
    if (settings?.data) {
      // Ensure each provider has a callback URL (generate if missing)
      const settingsWithCallbacks: Record<OAuthProvider, OAuthConfig> = {
        google: {
          ...settings.data.google,
          callbackUrl: settings.data.google.callbackUrl || generateCallbackUrl('google')
        },
        kakao: {
          ...settings.data.kakao,
          callbackUrl: settings.data.kakao.callbackUrl || generateCallbackUrl('kakao')
        },
        naver: {
          ...settings.data.naver,
          callbackUrl: settings.data.naver.callbackUrl || generateCallbackUrl('naver')
        }
      };

      setLocalSettings(settingsWithCallbacks);
      // Reset unsaved changes when fresh data loads
      setHasUnsavedChanges({
        google: false,
        kakao: false,
        naver: false
      });
    }
  }, [settings]);

  // Update OAuth settings mutation
  const updateMutation = useMutation<OAuthUpdateResponse, Error, OAuthUpdateRequest>({
    mutationFn: async (data: OAuthUpdateRequest) => {
      const response = await authClient.api.put('/settings/oauth', data);
      return response.data;
    },
    onSuccess: (responseData, variables) => {
      // Refetch to get latest data from server
      queryClient.invalidateQueries({ queryKey: ['oauth-settings'] });

      addNotice({
        type: 'success',
        message: `${OAUTH_PROVIDERS[variables.provider].displayName} 설정이 저장되었습니다.`
      });
    },
    onError: (error: Error) => {
      addNotice({
        type: 'error',
        message: `설정 저장 실패: ${error.message}`
      });
    }
  });

  // WO-O4O-ADMIN-DASHBOARD-LEGACY-ROUTE-API-AND-NAVIGATION-CLOSURE-V1: 연결 테스트(`/settings/oauth/test`, backend 없음) 주석 코드 제거.

  // Handle local input changes (no immediate save)
  const handleInputChange = useCallback((provider: OAuthProvider, field: keyof OAuthConfig, value: string | boolean | string[]) => {
    setLocalSettings(prev => ({
      ...prev,
      [provider]: {
        ...prev[provider],
        [field]: value
      }
    }));
    
    // Mark as having unsaved changes
    setHasUnsavedChanges(prev => ({
      ...prev,
      [provider]: true
    }));
  }, []);

  // Save specific provider settings to server
  const handleSaveProvider = useCallback(async (provider: OAuthProvider) => {
    const config = localSettings[provider];

    // Validate required fields
    // Note: Kakao only requires REST API key (clientId), Client Secret is optional
    if (config.enabled && !config.clientId) {
      addNotice({
        type: 'error',
        message: `${OAUTH_PROVIDERS[provider].displayName} 설정을 저장하려면 ${provider === 'kakao' ? 'REST API 키' : 'Client ID'}를 입력해주세요.`
      });
      return;
    }

    // For non-Kakao providers, Client Secret is required
    if (config.enabled && provider !== 'kakao' && !config.clientSecret) {
      addNotice({
        type: 'error',
        message: `${OAUTH_PROVIDERS[provider].displayName} 설정을 저장하려면 Client Secret을 입력해주세요.`
      });
      return;
    }

    updateMutation.mutate(
      {
        provider,
        config
      },
      {
        onSuccess: () => {
          // Mark as saved
          setHasUnsavedChanges(prev => ({
            ...prev,
            [provider]: false
          }));
        }
      }
    );
  }, [localSettings, updateMutation, addNotice]);

  // Toggle secret visibility
  const toggleSecretVisibility = useCallback((provider: OAuthProvider) => {
    setShowSecrets(prev => ({
      ...prev,
      [provider]: !prev[provider]
    }));
  }, []);

  // Copy callback URL
  const copyCallbackUrl = useCallback(async (provider: OAuthProvider, url: string) => {
    try {
      await navigator.clipboard.writeText(url);
      setCopiedUrls(prev => ({ ...prev, [provider]: true }));
      setTimeout(() => {
        setCopiedUrls(prev => ({ ...prev, [provider]: false }));
      }, 2000);
      addNotice({
        type: 'success',
        message: 'Callback URL이 클립보드에 복사되었습니다.'
      });
    } catch (error) {
      addNotice({
        type: 'error',
        message: '클립보드 복사 실패'
      });
    }
  }, [addNotice]);

  // Generate callback URL
  const generateCallbackUrl = useCallback((provider: OAuthProvider): string => {
    // Use production frontend URL for callback
    const frontendUrl = 'https://neture.co.kr';
    return `${frontendUrl}/api/v1/social/${provider}/callback`;
  }, []);

  // Mask sensitive data
  const maskSecret = useCallback((secret: string): string => {
    if (!secret || secret.length < 8) return secret;
    return secret.substring(0, 4) + '****' + secret.substring(secret.length - 4);
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Use local settings for UI display
  const oauthData = localSettings;

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium">OAuth 소셜 로그인 설정</h3>
        <p className="text-sm text-muted-foreground mt-1">
          소셜 로그인 제공자의 OAuth 인증 정보를 설정합니다.
        </p>
      </div>

      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          <p className="mb-2">
            각 OAuth 제공자의 개발자 콘솔에서 애플리케이션을 생성하고,
            아래의 Callback URL을 리다이렉트 URI로 등록해야 합니다.
          </p>
          <p className="text-xs text-muted-foreground mt-2">
            <strong>참고:</strong> 환경변수를 통한 설정도 가능합니다.
            API 서버의 <code className="bg-gray-100 px-1 rounded">.env</code> 파일에
            <code className="bg-gray-100 px-1 rounded">KAKAO_CLIENT_ID</code>,
            <code className="bg-gray-100 px-1 rounded">KAKAO_CLIENT_SECRET</code> 등을 설정하면
            데이터베이스 설정 없이도 사용 가능합니다.
            자세한 내용은 <code className="bg-gray-100 px-1 rounded">docs/OAUTH_SETUP.md</code>를 참조하세요.
          </p>
        </AlertDescription>
      </Alert>

      {(Object.keys(OAUTH_PROVIDERS) as OAuthProvider[]).map((provider) => {
        const providerInfo = OAUTH_PROVIDERS[provider];
        const config = oauthData[provider];
        const callbackUrl = config.callbackUrl || generateCallbackUrl(provider);

        return (
          <Card key={provider}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <span className="text-2xl">{providerInfo.icon}</span>
                  <div>
                    <CardTitle>{providerInfo.displayName}</CardTitle>
                    <CardDescription>
                      {providerInfo.displayName} OAuth 2.0 인증 설정
                    </CardDescription>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <Badge variant={config.enabled ? 'default' : 'secondary'}>
                    {config.enabled ? '활성화' : '비활성화'}
                  </Badge>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => window.open(providerInfo.setupUrl, '_blank')}
                  >
                    <ExternalLink className="h-4 w-4 mr-1" />
                    개발자 콘솔
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <form className="space-y-4" onSubmit={(e) => e.preventDefault()}>
                {/* Enable/Disable Switch */}
                <div className="flex items-center justify-between">
                <Label htmlFor={`${provider}-enabled`}>활성화</Label>
                <div className="flex items-center space-x-2">
                  {updateMutation.isPending && (
                    <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                  )}
                  <Switch
                    id={`${provider}-enabled`}
                    checked={config.enabled}
                    disabled={updateMutation.isPending}
                    onCheckedChange={(checked: boolean) => 
                      handleInputChange(provider, 'enabled', checked)
                    }
                  />
                </div>
              </div>

              <Separator />

              {/* Client ID / REST API Key */}
              <div className="space-y-2">
                <Label htmlFor={`${provider}-client-id`}>
                  {provider === 'kakao' ? 'REST API 키' : 'Client ID'}
                </Label>
                <Input
                  id={`${provider}-client-id`}
                  type="text"
                  value={config.clientId}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    handleInputChange(provider, 'clientId', e.target.value)
                  }
                  placeholder={provider === 'kakao' ? 'Kakao REST API 키' : 'OAuth 애플리케이션의 Client ID'}
                  disabled={!config.enabled || updateMutation.isPending}
                />
              </div>

              {/* Client Secret */}
              <div className="space-y-2">
                <Label htmlFor={`${provider}-client-secret`}>
                  {provider === 'kakao' ? 'Client Secret (선택사항)' : 'Client Secret'}
                </Label>
                <div className="flex space-x-2">
                  <Input
                    id={`${provider}-client-secret`}
                    type={showSecrets[provider] ? 'text' : 'password'}
                    value={config.clientSecret || ''}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      handleInputChange(provider, 'clientSecret', e.target.value)
                    }
                    placeholder={provider === 'kakao' ? 'Client Secret (보안 강화 시 사용)' : 'OAuth 애플리케이션의 Client Secret'}
                    disabled={!config.enabled || updateMutation.isPending}
                    autoComplete="new-password"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => toggleSecretVisibility(provider)}
                    disabled={updateMutation.isPending}
                  >
                    {showSecrets[provider] ?
                      <EyeOff className="h-4 w-4" /> :
                      <Eye className="h-4 w-4" />
                    }
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  {provider === 'kakao'
                    ? 'Kakao는 REST API 키만으로 인증 가능 (Client Secret은 선택사항)'
                    : '안전하게 암호화되어 저장됩니다'}
                </p>
              </div>

              {/* Callback URL */}
              <div className="space-y-2">
                <Label htmlFor={`${provider}-callback-url`}>Callback URL (Redirect URI)</Label>
                <div className="flex space-x-2">
                  <Input
                    id={`${provider}-callback-url`}
                    type="text"
                    value={callbackUrl}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      handleInputChange(provider, 'callbackUrl', e.target.value)
                    }
                    placeholder={generateCallbackUrl(provider)}
                    disabled={!config.enabled || updateMutation.isPending}
                    className="font-mono text-xs"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => copyCallbackUrl(provider, callbackUrl)}
                  >
                    {copiedUrls[provider] ?
                      <Check className="h-4 w-4 text-green-600" /> :
                      <Copy className="h-4 w-4" />
                    }
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  ⚠️ 이 URL을 <strong>{providerInfo.displayName} 개발자 콘솔</strong>의
                  <strong> Redirect URI</strong>로 정확히 등록하세요.
                  {provider === 'kakao' && ' (플랫폼 → Web → Redirect URI 설정)'}
                  {provider === 'naver' && ' (애플리케이션 → API 설정 → Callback URL)'}
                  {provider === 'google' && ' (Credentials → OAuth 2.0 Client IDs → Authorized redirect URIs)'}
                </p>
              </div>

              {/* Action Buttons */}
              <div className="pt-4 flex gap-2">
                {/* Save Button */}
                <Button
                  variant={hasUnsavedChanges[provider] ? "default" : "outline"}
                  onClick={() => handleSaveProvider(provider)}
                  disabled={updateMutation.isPending}
                  className={hasUnsavedChanges[provider] ? "bg-blue-600 hover:bg-blue-700" : ""}
                >
                  <Save className="h-4 w-4 mr-2" />
                  {hasUnsavedChanges[provider] ? '저장' : '저장됨'}
                </Button>
              </div>
              </form>
            </CardContent>
          </Card>
        );
      })}

      {/* Info about individual saving */}
      <div className="text-sm text-gray-600 bg-blue-50 border border-blue-200 rounded-lg p-4">
        <p className="font-medium text-blue-800 mb-1">💡 개별 저장 방식</p>
        <p className="text-blue-700">
          각 소셜 로그인 제공자의 설정을 완료한 후, 해당 카드의 <strong>"저장"</strong> 버튼을 눌러주세요. 
          모든 정보를 입력한 후에만 저장이 가능하며, 저장되지 않은 변경사항은 파란색 "저장" 버튼으로 표시됩니다.
        </p>
      </div>
    </div>
  );
};

export default OAuthSettings;