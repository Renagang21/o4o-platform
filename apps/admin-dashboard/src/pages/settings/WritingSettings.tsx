import { useState } from 'react';
import { Save, FileText, MessageSquare, Hash } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/api/client';
import { useAdminNotices } from '@/hooks/useAdminNotices';
import { 
  DEFAULT_WRITING_SETTINGS, 
  STORAGE_KEYS,
  saveSettingsToStorage,
  loadSettingsFromStorage
} from '@/constants/defaultSettings';

interface WritingSettingsData {
  defaultPostCategory: string;
  defaultPostFormat: string;
  enableMarkdown: boolean;
  enableRichEditor: boolean;
  autoSaveDraft: boolean;
  autoSaveInterval: number;
  revisionsToKeep: number;
  enableComments: boolean;
  requireCommentApproval: boolean;
  enablePingbacks: boolean;
  defaultCommentStatus: string;
  emailNewPost: boolean;
  allowEmojis: boolean;
}

export default function WritingSettings() {
  const queryClient = useQueryClient();
  const { success, error } = useAdminNotices();
  const [settings, setSettings] = useState<WritingSettingsData>(() => 
    loadSettingsFromStorage(STORAGE_KEYS.WRITING_SETTINGS, DEFAULT_WRITING_SETTINGS)
  );

  // Fetch settings
  const { isLoading } = useQuery({
    queryKey: ['settings', 'writing'],
    queryFn: async () => {
      try {
        const response = await apiClient.get('/v1/settings/writing');
        const data = response.data.data;
        if (data) {
          setSettings(data);
          saveSettingsToStorage(STORAGE_KEYS.WRITING_SETTINGS, data);
        }
        return data;
      } catch (apiError) {
        console.warn('Writing Settings API 실패, localStorage 사용:', apiError);
        const fallbackData = loadSettingsFromStorage(STORAGE_KEYS.WRITING_SETTINGS, DEFAULT_WRITING_SETTINGS);
        setSettings(fallbackData);
        return fallbackData;
      }
    }
  });

  // Save settings mutation
  const saveMutation = useMutation({
    mutationFn: async (data: WritingSettingsData) => {
      try {
        const response = await apiClient.put('/v1/settings/writing', data);
        saveSettingsToStorage(STORAGE_KEYS.WRITING_SETTINGS, data);
        return response;
      } catch (apiError) {
        // API 실패 시 localStorage에만 저장
        console.warn('Writing Settings API 저장 실패, localStorage에만 저장:', apiError);
        saveSettingsToStorage(STORAGE_KEYS.WRITING_SETTINGS, data);
        throw new Error('서버 저장 실패, 로컬에만 저장되었습니다');
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings', 'writing'] });
      success('쓰기 설정이 저장되었습니다.');
    },
    onError: (err) => {
      const message = err instanceof Error ? err.message : '설정 저장에 실패했습니다';
      error(message);
    }
  });

  const handleSave = () => {
    saveMutation.mutate(settings);
  };

  const handleChange = (field: keyof WritingSettingsData, value: string | number | boolean) => {
    setSettings((prev) => ({ ...prev, [field]: value }));
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
      {/* 기본 글 설정 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            기본 글 설정
          </CardTitle>
          <CardDescription>
            새 글 작성 시 적용되는 기본 설정을 구성합니다
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="defaultCategory">기본 카테고리</Label>
              <Select
                value={settings.defaultPostCategory}
                onValueChange={(value: string) => handleChange('defaultPostCategory', value)}
              >
                <SelectTrigger id="defaultCategory">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="uncategorized">미분류</SelectItem>
                  <SelectItem value="news">뉴스</SelectItem>
                  <SelectItem value="blog">블로그</SelectItem>
                  <SelectItem value="tutorial">튜토리얼</SelectItem>
                  <SelectItem value="announcement">공지사항</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="defaultFormat">기본 글 형식</Label>
              <Select
                value={settings.defaultPostFormat}
                onValueChange={(value: string) => handleChange('defaultPostFormat', value)}
              >
                <SelectTrigger id="defaultFormat">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="standard">표준</SelectItem>
                  <SelectItem value="aside">인용</SelectItem>
                  <SelectItem value="image">이미지</SelectItem>
                  <SelectItem value="video">비디오</SelectItem>
                  <SelectItem value="quote">인용문</SelectItem>
                  <SelectItem value="link">링크</SelectItem>
                  <SelectItem value="gallery">갤러리</SelectItem>
                  <SelectItem value="audio">오디오</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <Separator />

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Markdown 편집기 사용</Label>
                <p className="text-sm text-gray-500">
                  Markdown 문법을 사용하여 글을 작성할 수 있습니다
                </p>
              </div>
              <Switch
                checked={settings.enableMarkdown}
                onCheckedChange={(checked: boolean) => handleChange('enableMarkdown', checked)}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>리치 텍스트 편집기 사용</Label>
                <p className="text-sm text-gray-500">
                  비주얼 에디터를 사용하여 글을 작성할 수 있습니다
                </p>
              </div>
              <Switch
                checked={settings.enableRichEditor}
                onCheckedChange={(checked: boolean) => handleChange('enableRichEditor', checked)}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>이모지 사용 허용</Label>
                <p className="text-sm text-gray-500">
                  글과 댓글에서 이모지를 사용할 수 있습니다 😊
                </p>
              </div>
              <Switch
                checked={settings.allowEmojis}
                onCheckedChange={(checked: boolean) => handleChange('allowEmojis', checked)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 자동 저장 설정 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Save className="w-5 h-5" />
            자동 저장 및 리비전
          </CardTitle>
          <CardDescription>
            자동 저장과 리비전 관리 설정을 구성합니다
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>임시 글 자동 저장</Label>
              <p className="text-sm text-gray-500">
                작성 중인 글을 주기적으로 자동 저장합니다
              </p>
            </div>
            <Switch
              checked={settings.autoSaveDraft}
              onCheckedChange={(checked: boolean) => handleChange('autoSaveDraft', checked)}
            />
          </div>

          {settings.autoSaveDraft && (
            <>
              <Separator />
              <div className="space-y-2">
                <Label htmlFor="autoSaveInterval">자동 저장 간격 (초)</Label>
                <Input
                  id="autoSaveInterval"
                  type="number"
                  min="30"
                  max="600"
                  value={settings.autoSaveInterval}
                  onChange={(e) => handleChange('autoSaveInterval', parseInt(e.target.value))}
                />
                <p className="text-sm text-gray-500">
                  30초에서 600초(10분) 사이의 값을 입력하세요
                </p>
              </div>
            </>
          )}

          <Separator />

          <div className="space-y-2">
            <Label htmlFor="revisionsToKeep">보관할 리비전 수</Label>
            <Input
              id="revisionsToKeep"
              type="number"
              min="0"
              max="100"
              value={settings.revisionsToKeep}
              onChange={(e) => handleChange('revisionsToKeep', parseInt(e.target.value))}
            />
            <p className="text-sm text-gray-500">
              각 글의 이전 버전을 몇 개까지 보관할지 설정합니다 (0 = 무제한)
            </p>
          </div>
        </CardContent>
      </Card>

      {/* 댓글 설정 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="w-5 h-5" />
            댓글 설정
          </CardTitle>
          <CardDescription>
            댓글 기능 관련 설정을 구성합니다
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>댓글 기능 사용</Label>
              <p className="text-sm text-gray-500">
                글에 댓글을 달 수 있도록 허용합니다
              </p>
            </div>
            <Switch
              checked={settings.enableComments}
              onCheckedChange={(checked: boolean) => handleChange('enableComments', checked)}
            />
          </div>

          {settings.enableComments && (
            <>
              <Separator />
              <div className="space-y-2">
                <Label htmlFor="defaultCommentStatus">기본 댓글 상태</Label>
                <Select
                  value={settings.defaultCommentStatus}
                  onValueChange={(value: string) => handleChange('defaultCommentStatus', value)}
                >
                  <SelectTrigger id="defaultCommentStatus">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="open">열림</SelectItem>
                    <SelectItem value="closed">닫힘</SelectItem>
                    <SelectItem value="registered_only">회원만</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>댓글 승인 필요</Label>
                  <p className="text-sm text-gray-500">
                    댓글이 표시되기 전에 관리자 승인이 필요합니다
                  </p>
                </div>
                <Switch
                  checked={settings.requireCommentApproval}
                  onCheckedChange={(checked: boolean) => handleChange('requireCommentApproval', checked)}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>핑백/트랙백 허용</Label>
                  <p className="text-sm text-gray-500">
                    다른 사이트로부터의 핑백과 트랙백을 허용합니다
                  </p>
                </div>
                <Switch
                  checked={settings.enablePingbacks}
                  onCheckedChange={(checked: boolean) => handleChange('enablePingbacks', checked)}
                />
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* 알림 설정 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Hash className="w-5 h-5" />
            알림 설정
          </CardTitle>
          <CardDescription>
            이메일 알림 설정을 구성합니다
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>새 글 작성 시 이메일 알림</Label>
              <p className="text-sm text-gray-500">
                새 글이 게시되면 관리자에게 이메일을 보냅니다
              </p>
            </div>
            <Switch
              checked={settings.emailNewPost}
              onCheckedChange={(checked: boolean) => handleChange('emailNewPost', checked)}
            />
          </div>
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