import { useState, useCallback, useEffect } from 'react';
import { Save, Plus, X, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { authClient } from '@o4o/auth-client';
import { useAdminNotices } from '@/hooks/useAdminNotices';

interface RoleRedirectMap {
  [role: string]: string;
}

interface AuthSettingsResponse {
  success: boolean;
  data: {
    roleRedirects: RoleRedirectMap;
  };
}

// Default role redirects
const DEFAULT_ROLES = [
  { role: 'user', label: '사용자', defaultPath: '/' },
  { role: 'member', label: '멤버', defaultPath: '/' },
  { role: 'contributor', label: '기여자', defaultPath: '/' },
  { role: 'seller', label: '판매자', defaultPath: '/seller/dashboard' },
  { role: 'vendor', label: '벤더', defaultPath: '/vendor/console' },
  { role: 'partner', label: '파트너', defaultPath: '/partner/portal' },
  { role: 'operator', label: '서비스운영자', defaultPath: '/admin' },
  { role: 'admin', label: '관리자', defaultPath: '/admin' },
];

const AuthSettings = () => {
  const { addNotice } = useAdminNotices();
  const queryClient = useQueryClient();

  const [roleRedirects, setRoleRedirects] = useState<RoleRedirectMap>({});
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Fetch auth settings
  const { data: settings, isLoading } = useQuery<AuthSettingsResponse>({
    queryKey: ['auth-settings'],
    queryFn: async () => {
      const response = await authClient.api.get('/settings/auth');
      return response.data;
    },
  });

  // Sync server settings to local state
  useEffect(() => {
    if (settings?.data?.roleRedirects) {
      setRoleRedirects(settings.data.roleRedirects);
      setHasUnsavedChanges(false);
    } else {
      // Initialize with defaults
      const defaults: RoleRedirectMap = {};
      DEFAULT_ROLES.forEach((item) => {
        defaults[item.role] = item.defaultPath;
      });
      setRoleRedirects(defaults);
    }
  }, [settings]);

  // Update settings mutation
  const updateMutation = useMutation({
    mutationFn: async (data: { roleRedirects: RoleRedirectMap }) => {
      const response = await authClient.api.put('/settings/auth', data);
      return response.data;
    },
    onSuccess: () => {
      addNotice({
        type: 'success',
        message: '인증 설정이 저장되었습니다.',
      });
      setHasUnsavedChanges(false);
      queryClient.invalidateQueries({ queryKey: ['auth-settings'] });
    },
    onError: (error: Error) => {
      addNotice({
        type: 'error',
        message: `설정 저장 실패: ${error.message}`,
      });
    },
  });

  const handleRedirectChange = useCallback((role: string, path: string) => {
    setRoleRedirects((prev) => ({
      ...prev,
      [role]: path,
    }));
    setHasUnsavedChanges(true);
  }, []);

  const handleResetToDefault = useCallback((role: string) => {
    const defaultRole = DEFAULT_ROLES.find((r) => r.role === role);
    if (defaultRole) {
      handleRedirectChange(role, defaultRole.defaultPath);
    }
  }, [handleRedirectChange]);

  const handleSave = useCallback(() => {
    updateMutation.mutate({ roleRedirects });
  }, [roleRedirects, updateMutation]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium">인증 설정</h3>
        <p className="text-sm text-muted-foreground mt-1">
          사용자 역할별 로그인 후 리다이렉트 경로를 설정합니다.
        </p>
      </div>

      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          사용자가 로그인하면 역할에 따라 지정된 페이지로 자동 이동합니다.
          경로는 "/" 로 시작해야 합니다.
        </AlertDescription>
      </Alert>

      <Card>
        <CardHeader>
          <CardTitle>역할별 리다이렉트 경로</CardTitle>
          <CardDescription>
            각 사용자 역할에 대한 기본 리다이렉트 경로를 설정합니다.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {DEFAULT_ROLES.map((item) => (
              <div key={item.role} className="flex items-center gap-4">
                <div className="w-32">
                  <Label className="text-sm font-medium">{item.label}</Label>
                  <p className="text-xs text-gray-500">{item.role}</p>
                </div>

                <div className="flex-1">
                  <Input
                    type="text"
                    value={roleRedirects[item.role] || item.defaultPath}
                    onChange={(e) => handleRedirectChange(item.role, e.target.value)}
                    placeholder={item.defaultPath}
                    className="font-mono text-sm"
                  />
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleResetToDefault(item.role)}
                  disabled={roleRedirects[item.role] === item.defaultPath}
                >
                  기본값
                </Button>
              </div>
            ))}
          </div>

          <div className="mt-6 pt-6 border-t">
            <Button
              onClick={handleSave}
              disabled={!hasUnsavedChanges || updateMutation.isPending}
              className={hasUnsavedChanges ? 'bg-blue-600 hover:bg-blue-700' : ''}
            >
              <Save className="h-4 w-4 mr-2" />
              {hasUnsavedChanges ? '변경사항 저장' : '저장됨'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Info */}
      <div className="text-sm text-gray-600 bg-blue-50 border border-blue-200 rounded-lg p-4">
        <p className="font-medium text-blue-800 mb-1">💡 사용 예시</p>
        <ul className="text-blue-700 list-disc list-inside space-y-1">
          <li>일반 사용자는 홈페이지(/)로 이동</li>
          <li>판매자는 판매자 대시보드(/seller/dashboard)로 이동</li>
          <li>관리자는 관리 페이지(/admin)로 이동</li>
        </ul>
      </div>
    </div>
  );
};

export default AuthSettings;
