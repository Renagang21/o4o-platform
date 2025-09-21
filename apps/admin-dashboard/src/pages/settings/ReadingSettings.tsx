import { useState, useEffect } from 'react';
import { Save, Home, FileText, User, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/api/client';
import { ContentApi } from '@/api/contentApi';
import toast from 'react-hot-toast';
import { 
  DEFAULT_READING_SETTINGS
} from '@/constants/defaultSettings';

interface ReadingSettingsData {
  homepageType: 'latest_posts' | 'static_page';
  homepageId?: string;
  postsPerPage: number;
  showSummary: 'full' | 'excerpt';
  excerptLength: number;
}

// interface Page {
//   id: string;
//   title: string;
//   slug: string;
//   status: string;
// }

export default function ReadingSettings() {
  const queryClient = useQueryClient();
  const [settings, setSettings] = useState<ReadingSettingsData>(DEFAULT_READING_SETTINGS);
  const [pages, setPages] = useState<any[]>([]);
  const [authStatus, setAuthStatus] = useState<{
    hasToken: boolean;
    userRole?: string;
    isAdmin: boolean;
  }>({ hasToken: false, isAdmin: false });

  // 인증 상태 체크
  useEffect(() => {
    const checkAuthStatus = () => {
      const accessToken = localStorage.getItem('accessToken');
      const token = localStorage.getItem('token');
      const adminStorage = localStorage.getItem('admin-auth-storage');
      
      let userRole = '';
      let isAdmin = false;
      
      // JWT 토큰에서 역할 추출
      const actualToken = accessToken || token;
      if (actualToken) {
        try {
          const payload = JSON.parse(atob(actualToken.split('.')[1]));
          userRole = payload.role || '';
          isAdmin = userRole === 'admin' || userRole === 'super_admin';
        } catch (e) {
          // 토큰 파싱 실패
        }
      }
      
      setAuthStatus({
        hasToken: !!(accessToken || token || adminStorage),
        userRole,
        isAdmin
      });
    };
    
    checkAuthStatus();
  }, []);

  // Fetch available pages (using Posts API with type=page)
  const { data: pagesData, isLoading: pagesLoading } = useQuery({
    queryKey: ['pages', 'published'],
    queryFn: async () => {
      try {
        const response = await apiClient.get('/api/posts', {
          params: {
            type: 'page',
            status: 'publish',
            page: 1,
            pageSize: 100
          }
        });
        return response.data?.data || response.data || [];
      } catch (error) {
        throw error;
      }
    }
  });

  // Fetch current settings
  const { isLoading: settingsLoading } = useQuery({
    queryKey: ['settings', 'reading'],
    queryFn: async () => {
      try {
        const response = await apiClient.get('/api/v1/settings/reading');
        const data = response.data.data;
        if (data) {
          // Preserve homepageId even if it comes as undefined from API
          // Don't override with default settings when data exists
          setSettings({
            homepageType: data.homepageType || 'latest_posts',
            homepageId: data.homepageId, // Keep undefined or actual value
            postsPerPage: data.postsPerPage || 10,
            showSummary: data.showSummary || 'excerpt',
            excerptLength: data.excerptLength || 200
          });
        }
        return data;
      } catch (apiError) {
        throw apiError;
      }
    }
  });

  // Update pages when data is loaded
  useEffect(() => {
    if (pagesData) {
      setPages(pagesData);
    }
  }, [pagesData]);

  // Save settings mutation
  const saveMutation = useMutation({
    mutationFn: async (data: ReadingSettingsData) => {
      try {
        // Ensure homepageId is included in the request
        const payload = {
          ...data,
          homepageId: data.homepageType === 'static_page' ? data.homepageId : undefined
        };
        const response = await apiClient.put('/api/v1/settings/reading', payload);
        return response;
      } catch (apiError: any) {
        // 구체적인 에러 상황별 메시지 처리
        if (apiError.response?.status === 401) {
          throw new Error('로그인이 필요합니다. 다시 로그인해주세요.');
        } else if (apiError.response?.status === 403) {
          throw new Error('관리자 권한이 필요합니다. 관리자 계정으로 로그인해주세요.');
        } else if (apiError.response?.status === 400) {
          const errorData = apiError.response?.data;
          if (errorData?.code === 'MISSING_PAGE_ID') {
            throw new Error('홈페이지로 사용할 페이지를 선택해주세요.');
          } else if (errorData?.code === 'PAGE_NOT_FOUND') {
            throw new Error('선택한 페이지를 찾을 수 없습니다. 다른 페이지를 선택해주세요.');
          } else if (errorData?.code === 'PAGE_NOT_PUBLISHED') {
            throw new Error('선택한 페이지가 게시되지 않았습니다. 게시된 페이지를 선택해주세요.');
          } else {
            throw new Error(errorData?.error || '잘못된 요청입니다.');
          }
        } else if (apiError.response?.status >= 500) {
          throw new Error('서버 오류가 발생했습니다. 잠시 후 다시 시도해주세요.');
        } else if (apiError.code === 'ECONNABORTED') {
          throw new Error('요청 시간이 초과되었습니다. 네트워크 연결을 확인해주세요.');
        } else {
          throw new Error('설정 저장에 실패했습니다. 네트워크 연결을 확인하고 다시 시도해주세요.');
        }
      }
    },
    onSuccess: async () => {
      // 즉시 서버에서 최신 데이터를 다시 가져와 동기화
      await queryClient.invalidateQueries({ queryKey: ['settings', 'reading'] });
      await queryClient.refetchQueries({ queryKey: ['settings', 'reading'] });
      toast.success('읽기 설정이 저장되었습니다');
    },
    onError: (error: unknown) => {
      const message = error instanceof Error ? error.message : '설정 저장에 실패했습니다';
      toast.error(message);
    }
  });

  const handleSave = () => {
    // Validate settings
    if (settings.homepageType === 'static_page' && !settings.homepageId) {
      toast.error('홈페이지로 사용할 페이지를 선택해주세요');
      return;
    }
    saveMutation.mutate(settings);
  };

  const handleChange = (field: keyof ReadingSettingsData, value: any) => {
    setSettings((prev: any) => ({ ...prev, [field]: value }));
  };

  const isLoading = settingsLoading || pagesLoading;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Authentication Status Alert */}
      {!authStatus.hasToken && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center">
            <AlertCircle className="h-5 w-5 text-red-600 mr-2" />
            <div>
              <h4 className="text-red-800 font-medium">로그인이 필요합니다</h4>
              <p className="text-red-700 text-sm mt-1">
                설정을 저장하려면 관리자 계정으로 로그인해주세요.
              </p>
            </div>
          </div>
        </div>
      )}
      
      {authStatus.hasToken && !authStatus.isAdmin && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-center">
            <AlertCircle className="h-5 w-5 text-yellow-600 mr-2" />
            <div>
              <h4 className="text-yellow-800 font-medium">권한이 부족합니다</h4>
              <p className="text-yellow-700 text-sm mt-1">
                현재 역할: {authStatus.userRole || '알 수 없음'} | 필요 권한: admin 또는 super_admin
              </p>
            </div>
          </div>
        </div>
      )}
      
      {authStatus.hasToken && authStatus.isAdmin && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-center">
            <User className="h-5 w-5 text-green-600 mr-2" />
            <div>
              <h4 className="text-green-800 font-medium">관리자로 로그인됨</h4>
              <p className="text-green-700 text-sm mt-1">
                역할: {authStatus.userRole} | 설정 저장 권한이 있습니다.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Homepage Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Home className="w-5 h-5" />
            홈페이지 설정
          </CardTitle>
          <CardDescription>
            사이트 홈페이지에 표시할 내용을 설정합니다
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <RadioGroup
            value={settings.homepageType}
            onValueChange={(value: string) => handleChange('homepageType', value as 'latest_posts' | 'static_page')}
          >
            <div className="flex items-start space-x-3 mb-4">
              <RadioGroupItem value="latest_posts" id="latest_posts" className="mt-1" />
              <div className="space-y-1">
                <Label htmlFor="latest_posts" className="font-normal cursor-pointer">
                  최신 글 표시
                </Label>
                <p className="text-sm text-gray-500">
                  홈페이지에 최신 블로그 글 목록을 표시합니다
                </p>
              </div>
            </div>
            
            <div className="flex items-start space-x-3">
              <RadioGroupItem value="static_page" id="static_page" className="mt-1" />
              <div className="space-y-1 flex-1">
                <Label htmlFor="static_page" className="font-normal cursor-pointer">
                  정적인 페이지 선택
                </Label>
                <p className="text-sm text-gray-500 mb-3">
                  특정 페이지를 홈페이지로 사용합니다
                </p>
                
                {settings.homepageType !== 'latest_posts' && (
                  <div className="space-y-2 ml-6">
                    <Label htmlFor="homepage-select">홈페이지</Label>
                    <Select
                      value={settings.homepageId}
                      onValueChange={(value: string) => handleChange('homepageId', value)}
                    >
                      <SelectTrigger id="homepage-select" className="w-full">
                        <SelectValue 
                          placeholder="페이지를 선택하세요"
                          getDisplayValue={(pageId) => {
                            const page = pages.find(p => p.id === pageId);
                            return page?.title || pageId;
                          }}
                        />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">— 선택 —</SelectItem>
                        {pages.map((page: any) => (
                          <SelectItem key={page.id} value={page.id}>
                            {page.title?.rendered || page.title || page.name || `페이지 ${page.id.substring(0, 8)}`}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {pages.length === 0 && (
                      <p className="text-sm text-amber-600">
                        사용 가능한 페이지가 없습니다. 먼저 페이지를 생성해주세요.
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>
          </RadioGroup>
        </CardContent>
      </Card>

      {/* Blog Display Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            블로그 표시 설정
          </CardTitle>
          <CardDescription>
            블로그 글 목록 표시 방식을 설정합니다
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="posts-per-page">페이지당 글 수</Label>
            <Select
              value={settings.postsPerPage.toString() as any}
              onValueChange={(value: string) => handleChange('postsPerPage', parseInt(value))}
            >
              <SelectTrigger id="posts-per-page">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="5">5개</SelectItem>
                <SelectItem value="10">10개</SelectItem>
                <SelectItem value="15">15개</SelectItem>
                <SelectItem value="20">20개</SelectItem>
                <SelectItem value="30">30개</SelectItem>
                <SelectItem value="50">50개</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-3">
            <Label>피드에서 각 글 표시</Label>
            <RadioGroup
              value={settings.showSummary}
              onValueChange={(value: string) => handleChange('showSummary', value as 'full' | 'excerpt')}
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="full" id="show-full" />
                <Label htmlFor="show-full" className="font-normal cursor-pointer">
                  전체 내용
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="excerpt" id="show-excerpt" />
                <Label htmlFor="show-excerpt" className="font-normal cursor-pointer">
                  요약문
                </Label>
              </div>
            </RadioGroup>
          </div>

          {settings.showSummary === 'excerpt' && (
            <div className="space-y-2">
              <Label htmlFor="excerpt-length">요약문 길이 (글자 수)</Label>
              <Select
                value={settings.excerptLength.toString() as any}
                onValueChange={(value: string) => handleChange('excerptLength', parseInt(value))}
              >
                <SelectTrigger id="excerpt-length">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="100">100자</SelectItem>
                  <SelectItem value="150">150자</SelectItem>
                  <SelectItem value="200">200자</SelectItem>
                  <SelectItem value="250">250자</SelectItem>
                  <SelectItem value="300">300자</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end">
        <div className="flex flex-col items-end space-y-2">
          {!authStatus.hasToken && (
            <p className="text-sm text-red-600">
              저장하려면 로그인이 필요합니다
            </p>
          )}
          {authStatus.hasToken && !authStatus.isAdmin && (
            <p className="text-sm text-yellow-600">
              저장하려면 관리자 권한이 필요합니다
            </p>
          )}
          <Button 
            onClick={handleSave}
            disabled={saveMutation.isPending || !authStatus.hasToken || !authStatus.isAdmin}
            className={`${
              !authStatus.hasToken || !authStatus.isAdmin 
                ? 'opacity-50 cursor-not-allowed' 
                : ''
            }`}
          >
            <Save className="w-4 h-4 mr-2" />
            {saveMutation.isPending ? '저장 중...' : '설정 저장'}
          </Button>
        </div>
      </div>
    </div>
  );
}