import { useState, useCallback } from 'react';
import { Save, Copy, Check, AlertCircle, ExternalLink, TestTube, Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/api/client';
import { useAdminNotices } from '@/hooks/useAdminNotices';
import { 
  OAuthProvider, 
  OAuthConfig, 
  OAuthSettingsResponse,
  OAuthUpdateRequest,
  OAuthUpdateResponse,
  OAuthTestRequest,
  OAuthTestResponse
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

  // Fetch OAuth settings
  const { data: settings, isLoading } = useQuery<OAuthSettingsResponse>({
    queryKey: ['oauth-settings'],
    queryFn: async () => {
      const response = await apiClient.get('/api/v1/settings/oauth');
      return response.data;
    }
  });

  // Update OAuth settings mutation
  const updateMutation = useMutation<OAuthUpdateResponse, Error, OAuthUpdateRequest>({
    mutationFn: async (data: OAuthUpdateRequest) => {
      const response = await apiClient.put('/api/v1/settings/oauth', data);
      return response.data;
    },
    onMutate: async (newData) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['oauth-settings'] });
      
      // Snapshot the previous value
      const previousSettings = queryClient.getQueryData(['oauth-settings']);
      
      // Optimistically update to the new value
      queryClient.setQueryData(['oauth-settings'], (old: any) => {
        if (!old?.data) return old;
        
        return {
          ...old,
          data: {
            ...old.data,
            [newData.provider]: {
              ...old.data[newData.provider],
              ...newData.config
            }
          }
        };
      });
      
      // Return a context object with the snapshotted value
      return { previousSettings };
    },
    onSuccess: (_data, variables) => {
      addNotice({
        type: 'success',
        message: `${OAUTH_PROVIDERS[variables.provider].displayName} 설정이 저장되었습니다.`
      });
    },
    onError: (error: Error, _variables, context: { previousSettings?: any } | undefined) => {
      // If the mutation fails, use the context returned from onMutate to roll back
      if (context?.previousSettings) {
        queryClient.setQueryData(['oauth-settings'], context.previousSettings);
      }
      addNotice({
        type: 'error',
        message: `설정 저장 실패: ${error.message}`
      });
    },
    onSettled: () => {
      // Always refetch after error or success to ensure we have the latest data
      queryClient.invalidateQueries({ queryKey: ['oauth-settings'] });
    }
  });

  // Test OAuth connection mutation
  const testMutation = useMutation<OAuthTestResponse, Error, OAuthTestRequest>({
    mutationFn: async (data: OAuthTestRequest) => {
      const response = await apiClient.post('/api/v1/settings/oauth/test', data);
      return response.data;
    },
    onSuccess: (data, _variables) => {
      addNotice({
        type: data.success ? 'success' : 'error',
        message: data.message
      });
    },
    onError: (error: Error) => {
      addNotice({
        type: 'error',
        message: `연결 테스트 실패: ${error.message}`
      });
    }
  });

  // Handle input change
  const handleInputChange = useCallback((provider: OAuthProvider, field: keyof OAuthConfig, value: string | boolean | string[]) => {
    if (!settings?.data) {
      addNotice({
        type: 'error',
        message: '설정 데이터를 불러오는 중입니다. 잠시 후 다시 시도해주세요.'
      });
      return;
    }

    const currentConfig = settings.data[provider];
    const updatedConfig: Partial<OAuthConfig> = {
      ...currentConfig,
      [field]: value
    };

    updateMutation.mutate({
      provider,
      config: updatedConfig
    });
  }, [settings, updateMutation, addNotice]);

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

  // Test connection
  const testConnection = useCallback((provider: OAuthProvider) => {
    testMutation.mutate({ provider });
  }, [testMutation]);

  // Generate callback URL
  const generateCallbackUrl = useCallback((provider: OAuthProvider): string => {
    const baseUrl = window.location.origin;
    return `${baseUrl}/api/auth/callback/${provider}`;
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

  const oauthData = settings?.data || {
    google: { provider: 'google', enabled: false, clientId: '', clientSecret: '', callbackUrl: '', scope: [] },
    kakao: { provider: 'kakao', enabled: false, clientId: '', clientSecret: '', callbackUrl: '', scope: [] },
    naver: { provider: 'naver', enabled: false, clientId: '', clientSecret: '', callbackUrl: '', scope: [] }
  };

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
          각 OAuth 제공자의 개발자 콘솔에서 애플리케이션을 생성하고, 
          아래의 Callback URL을 리다이렉트 URI로 등록해야 합니다.
        </AlertDescription>
      </Alert>

      {(Object.keys(OAUTH_PROVIDERS) as OAuthProvider[]).map((provider) => {
        const providerInfo = OAUTH_PROVIDERS[provider];
        const config = oauthData[provider];
        const callbackUrl = generateCallbackUrl(provider);

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
            <CardContent className="space-y-4">
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

              {/* Client ID */}
              <div className="space-y-2">
                <Label htmlFor={`${provider}-client-id`}>Client ID</Label>
                <Input
                  id={`${provider}-client-id`}
                  type="text"
                  value={config.clientId}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => 
                    handleInputChange(provider, 'clientId', e.target.value)
                  }
                  placeholder="OAuth 애플리케이션의 Client ID"
                  disabled={!config.enabled || updateMutation.isPending}
                />
              </div>

              {/* Client Secret */}
              <div className="space-y-2">
                <Label htmlFor={`${provider}-client-secret`}>Client Secret</Label>
                <div className="flex space-x-2">
                  <Input
                    id={`${provider}-client-secret`}
                    type={showSecrets[provider] ? 'text' : 'password'}
                    value={showSecrets[provider] ? config.clientSecret : maskSecret(config.clientSecret)}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => 
                      handleInputChange(provider, 'clientSecret', e.target.value)
                    }
                    placeholder="OAuth 애플리케이션의 Client Secret"
                    disabled={!config.enabled || updateMutation.isPending}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => toggleSecretVisibility(provider)}
                    disabled={!config.enabled || updateMutation.isPending}
                  >
                    {showSecrets[provider] ? 
                      <EyeOff className="h-4 w-4" /> : 
                      <Eye className="h-4 w-4" />
                    }
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  안전하게 암호화되어 저장됩니다
                </p>
              </div>

              {/* Callback URL */}
              <div className="space-y-2">
                <Label htmlFor={`${provider}-callback-url`}>Callback URL</Label>
                <div className="flex space-x-2">
                  <Input
                    id={`${provider}-callback-url`}
                    type="text"
                    value={callbackUrl}
                    readOnly
                    className="bg-muted"
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
                  이 URL을 OAuth 제공자의 리다이렉트 URI로 등록하세요
                </p>
              </div>

              {/* Test Connection */}
              {config.enabled && config.clientId && config.clientSecret && (
                <div className="pt-4">
                  <Button
                    variant="secondary"
                    onClick={() => testConnection(provider)}
                    disabled={testMutation.isPending || updateMutation.isPending}
                  >
                    <TestTube className="h-4 w-4 mr-2" />
                    연결 테스트
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}

      {/* Save All Button */}
      <div className="flex justify-end">
        <Button
          onClick={() => {
            addNotice({
              type: 'success',
              message: '모든 OAuth 설정이 저장되었습니다.'
            });
          }}
          disabled={updateMutation.isPending}
        >
          <Save className="h-4 w-4 mr-2" />
          모든 설정 저장
        </Button>
      </div>
    </div>
  );
};

export default OAuthSettings;