import { useState } from 'react';
import { Save, Globe, Clock, Shield, Database } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { authClient } from '@o4o/auth-client';
import { useAdminNotices } from '@/hooks/useAdminNotices';

interface GeneralSettingsData {
  siteName: string;
  siteDescription: string;
  siteUrl: string;
  adminEmail: string;
  favicon?: string;
  timezone: string;
  dateFormat: string;
  timeFormat: string;
  language: string;
  maintenanceMode: boolean;
  maintenanceMessage: string;
  allowRegistration: boolean;
  defaultUserRole: string;
  requireEmailVerification: boolean;
  enableApiAccess: boolean;
  apiRateLimit: number;
}

const timezones = [
  { value: 'Asia/Seoul', label: 'Seoul (UTC+9)' },
  { value: 'Asia/Tokyo', label: 'Tokyo (UTC+9)' },
  { value: 'America/New_York', label: 'New York (UTC-5)' },
  { value: 'America/Los_Angeles', label: 'Los Angeles (UTC-8)' },
  { value: 'Europe/London', label: 'London (UTC+0)' },
  { value: 'Europe/Paris', label: 'Paris (UTC+1)' },
];

const dateFormats = [
  { value: 'YYYY-MM-DD', label: '2024-12-25' },
  { value: 'DD/MM/YYYY', label: '25/12/2024' },
  { value: 'MM/DD/YYYY', label: '12/25/2024' },
  { value: 'YYYY년 MM월 DD일', label: '2024년 12월 25일' },
];

const timeFormats = [
  { value: 'HH:mm', label: '14:30 (24시간)' },
  { value: 'hh:mm A', label: '02:30 PM (12시간)' },
];

export default function GeneralSettings() {
  const queryClient = useQueryClient();
  const { success, error } = useAdminNotices();
  const [settings, setSettings] = useState({
    siteName: '',
    siteDescription: '',
    siteUrl: '',
    adminEmail: '',
    favicon: '',
    timezone: 'Asia/Seoul',
    dateFormat: 'YYYY-MM-DD',
    timeFormat: 'HH:mm',
    language: 'ko',
    maintenanceMode: false,
    maintenanceMessage: '',
    allowRegistration: true,
    defaultUserRole: 'customer',
    requireEmailVerification: true,
    enableApiAccess: false,
    apiRateLimit: 100
  });

  // Fetch settings
  const { isLoading } = useQuery({
    queryKey: ['settings', 'general'],
    queryFn: async () => {
      const response = await authClient.api.get('/settings/general');
      const data = response.data.data;
      if (data) {
        setSettings(data);
      }
      return data;
    }
  });

  // Save settings mutation
  const saveMutation = useMutation({
    mutationFn: async (data: GeneralSettingsData) => {
      return authClient.api.put('/settings/general', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings', 'general'] });
      success('설정이 저장되었습니다.');
    },
    onError: (err: unknown) => {
      const message = err instanceof Error ? err.message : '설정 저장에 실패했습니다';
      error(message);
    }
  });

  const handleSave = () => {
    saveMutation.mutate(settings);
  };

  const handleChange = (field: keyof GeneralSettingsData, value: any) => {
    setSettings((prev: any) => ({ ...prev, [field]: value }));
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Site Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="w-5 h-5" />
            사이트 정보
          </CardTitle>
          <CardDescription>
            웹사이트의 기본 정보를 설정합니다
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="siteName">사이트 이름</Label>
              <Input
                id="siteName"
                name="siteName"
                value={settings.siteName}
                onChange={(e: any) => handleChange('siteName', e.target.value)}
                placeholder="O4O Platform"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="siteUrl">사이트 URL</Label>
              <Input
                id="siteUrl"
                name="siteUrl"
                value={settings.siteUrl}
                onChange={(e: any) => handleChange('siteUrl', e.target.value)}
                placeholder="https://admin.neture.co.kr"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="siteDescription">사이트 설명</Label>
            <Textarea
              id="siteDescription"
              name="siteDescription"
              value={settings.siteDescription}
              onChange={(e: any) => handleChange('siteDescription', e.target.value)}
              placeholder="사이트에 대한 간단한 설명을 입력하세요"
              rows={3}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="adminEmail">관리자 이메일</Label>
            <Input
              id="adminEmail"
              name="adminEmail"
              type="email"
              value={settings.adminEmail}
              onChange={(e: any) => handleChange('adminEmail', e.target.value)}
              placeholder="admin@example.com"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="favicon">파비콘 URL</Label>
            <Input
              id="favicon"
              name="favicon"
              type="url"
              value={settings.favicon}
              onChange={(e: any) => handleChange('favicon', e.target.value)}
              placeholder="https://example.com/favicon.ico"
            />
            <p className="text-xs text-gray-500">
              사이트 파비콘 이미지 URL을 입력하세요 (.ico, .png, .svg 지원)
            </p>
            {settings.favicon && (
              <div className="mt-2 p-3 bg-gray-50 border border-gray-200 rounded-md">
                <p className="text-xs font-medium text-gray-700 mb-2">미리보기:</p>
                <div className="flex items-center gap-2">
                  <img
                    src={settings.favicon}
                    alt="Favicon preview"
                    className="w-8 h-8"
                    onError={(e: any) => {
                      e.target.style.display = 'none';
                      e.target.nextSibling.style.display = 'block';
                    }}
                  />
                  <span
                    className="text-xs text-red-500 hidden"
                    style={{ display: 'none' }}
                  >
                    이미지를 불러올 수 없습니다
                  </span>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Localization */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5" />
            지역화 설정
          </CardTitle>
          <CardDescription>
            시간대 및 날짜/시간 형식을 설정합니다
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="timezone">시간대</Label>
              <Select
                value={settings.timezone}
                onValueChange={(value: string) => handleChange('timezone', value)}
              >
                <SelectTrigger id="timezone">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {timezones.map((tz: any) => (
                    <SelectItem key={tz.value} value={tz.value}>
                      {tz.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="language">언어</Label>
              <Select
                value={settings.language}
                onValueChange={(value: string) => handleChange('language', value)}
              >
                <SelectTrigger id="language">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ko">한국어</SelectItem>
                  <SelectItem value="en">English</SelectItem>
                  <SelectItem value="ja">日本語</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="dateFormat">날짜 형식</Label>
              <Select
                value={settings.dateFormat}
                onValueChange={(value: string) => handleChange('dateFormat', value)}
              >
                <SelectTrigger id="dateFormat">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {dateFormats.map((format: any) => (
                    <SelectItem key={format.value} value={format.value}>
                      {format.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="timeFormat">시간 형식</Label>
              <Select
                value={settings.timeFormat}
                onValueChange={(value: string) => handleChange('timeFormat', value)}
              >
                <SelectTrigger id="timeFormat">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {timeFormats.map((format: any) => (
                    <SelectItem key={format.value} value={format.value}>
                      {format.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Security & Access */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5" />
            보안 & 접근 설정
          </CardTitle>
          <CardDescription>
            사용자 등록 및 API 접근을 관리합니다
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>회원가입 허용</Label>
                <p className="text-sm text-gray-500">
                  새로운 사용자의 회원가입을 허용합니다
                </p>
              </div>
              <Switch
                checked={settings.allowRegistration}
                onCheckedChange={(checked: boolean) => handleChange('allowRegistration', checked)}
              />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>이메일 인증 필수</Label>
                <p className="text-sm text-gray-500">
                  회원가입 시 이메일 인증을 요구합니다
                </p>
              </div>
              <Switch
                checked={settings.requireEmailVerification}
                onCheckedChange={(checked: boolean) => handleChange('requireEmailVerification', checked)}
              />
            </div>
            <Separator />
            <div className="space-y-2">
              <Label htmlFor="defaultRole">기본 사용자 역할</Label>
              <Select
                value={settings.defaultUserRole}
                onValueChange={(value: string) => handleChange('defaultUserRole', value)}
              >
                <SelectTrigger id="defaultRole">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="customer">일반 회원</SelectItem>
                  <SelectItem value="business">사업자 회원</SelectItem>
                  <SelectItem value="affiliate">제휴 회원</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Maintenance Mode */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="w-5 h-5" />
            유지보수 모드
          </CardTitle>
          <CardDescription>
            사이트를 일시적으로 유지보수 모드로 전환합니다
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>유지보수 모드 활성화</Label>
              <p className="text-sm text-gray-500">
                관리자를 제외한 모든 사용자의 접근을 차단합니다
              </p>
            </div>
            <Switch
              checked={settings.maintenanceMode}
              onCheckedChange={(checked: boolean) => handleChange('maintenanceMode', checked)}
            />
          </div>
          {settings.maintenanceMode && (
            <>
              <Separator />
              <div className="space-y-2">
                <Label htmlFor="maintenanceMessage">유지보수 메시지</Label>
                <Textarea
                  id="maintenanceMessage"
                  name="maintenanceMessage"
                  value={settings.maintenanceMessage}
                  onChange={(e: any) => handleChange('maintenanceMessage', e.target.value)}
                  placeholder="잠시 시스템 점검 중입니다. 곧 정상 서비스하겠습니다."
                  rows={3}
                />
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button 
          onClick={handleSave}
          disabled={saveMutation.isPending}
        >
          <Save className="w-4 h-4 mr-2" />
          {saveMutation.isPending ? '저장 중...' : '설정 저장'}
        </Button>
      </div>
    </div>
  );
}