import { useState, useCallback, useEffect } from 'react';
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

  // Fetch OAuth settings
  const { data: settings, isLoading } = useQuery<OAuthSettingsResponse>({
    queryKey: ['oauth-settings'],
    queryFn: async () => {
      const response = await apiClient.get('/settings/oauth');
      return response.data;
    }
  });

  // Sync server settings to local state when data loads
  useEffect(() => {
    if (settings?.data) {
      setLocalSettings(settings.data);
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
      const response = await apiClient.put('/settings/oauth', data);
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
      const response = await apiClient.post('/settings/oauth/test', data);
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
    if (config.enabled && (!config.clientId || !config.clientSecret)) {
      addNotice({
        type: 'error',
        message: `${OAUTH_PROVIDERS[provider].displayName} 설정을 저장하려면 Client ID와 Client Secret을 모두 입력해주세요.`
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
                    value={config.clientSecret || ''}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => 
                      handleInputChange(provider, 'clientSecret', e.target.value)
                    }
                    placeholder="OAuth 애플리케이션의 Client Secret"
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

                {/* Test Connection - only show when saved and enabled */}
                {config.enabled && config.clientId && config.clientSecret && !hasUnsavedChanges[provider] && (
                  <Button
                    variant="secondary"
                    onClick={() => testConnection(provider)}
                    disabled={testMutation.isPending || updateMutation.isPending}
                  >
                    <TestTube className="h-4 w-4 mr-2" />
                    연결 테스트
                  </Button>
                )}
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