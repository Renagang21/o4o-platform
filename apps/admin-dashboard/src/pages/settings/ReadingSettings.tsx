import { useState, useEffect } from 'react';
import { Save, Home, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/api/client';
import { ContentApi } from '@/api/contentApi';
import toast from 'react-hot-toast';

interface ReadingSettingsData {
  homepageType: 'latest_posts' | 'static_page';
  homepageId?: string;
  postsPerPage: number;
  showSummary: 'full' | 'excerpt';
  excerptLength: number;
}

interface Page {
  id: string;
  title: string;
  slug: string;
  status: string;
}

export default function ReadingSettings() {
  const queryClient = useQueryClient();
  const [settings, setSettings] = useState({
    homepageType: 'latest_posts',
    homepageId: undefined,
    postsPerPage: 10,
    showSummary: 'excerpt',
    excerptLength: 200
  });
  const [pages, setPages] = useState<any[]>([]);

  // Fetch available pages
  const { data: pagesData, isLoading: pagesLoading } = useQuery({
    queryKey: ['pages', 'published'],
    queryFn: async () => {
      const response = await ContentApi.getPages(1, 100, { status: 'published' });
      return response.data || [];
    }
  });

  // Fetch current settings
  const { isLoading: settingsLoading } = useQuery({
    queryKey: ['settings', 'reading'],
    queryFn: async () => {
      const response = await apiClient.get('/api/settings/reading');
      const data = response.data.data;
      if (data) {
        setSettings(data);
      }
      return data;
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
      return apiClient.put('/api/settings/reading', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings', 'reading'] });
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
                
                {settings.homepageType === 'static_page' && (
                  <div className="space-y-2 ml-6">
                    <Label htmlFor="homepage-select">홈페이지</Label>
                    <Select
                      value={settings.homepageId}
                      onValueChange={(value: string) => handleChange('homepageId', value)}
                    >
                      <SelectTrigger id="homepage-select" className="w-full">
                        <SelectValue placeholder="페이지를 선택하세요" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">— 선택 —</SelectItem>
                        {pages.map((page: any) => (
                          <SelectItem key={page.id} value={page.id}>
                            {page.title}
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
              value={settings.postsPerPage.toString()}
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
                value={settings.excerptLength.toString()}
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