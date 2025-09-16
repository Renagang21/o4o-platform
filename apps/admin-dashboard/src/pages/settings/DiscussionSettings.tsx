import { useState } from 'react';
import { Save, MessageSquare, Shield, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/api/client';
import { useAdminNotices } from '@/hooks/useAdminNotices';
import { 
  DEFAULT_DISCUSSION_SETTINGS, 
  STORAGE_KEYS,
  saveSettingsToStorage,
  loadSettingsFromStorage
} from '@/constants/defaultSettings';

interface DiscussionSettingsData {
  enableComments: boolean;
  requireNameEmail: boolean;
  requireRegistration: boolean;
  closeCommentsAfterDays: number;
  enableThreadedComments: boolean;
  threadDepth: number;
  commentsPerPage: number;
  defaultCommentOrder: string;
  requireModeration: boolean;
  moderationKeywords: string[];
  blacklistKeywords: string[];
  enableGravatar: boolean;
  defaultAvatar: string;
  maxLinks: number;
  holdForModeration: boolean;
}

export default function DiscussionSettings() {
  const queryClient = useQueryClient();
  const { success, error } = useAdminNotices();
  const [settings, setSettings] = useState<DiscussionSettingsData>(() => 
    loadSettingsFromStorage(STORAGE_KEYS.DISCUSSION_SETTINGS, DEFAULT_DISCUSSION_SETTINGS)
  );

  const [moderationText, setModerationText] = useState('');
  const [blacklistText, setBlacklistText] = useState('');

  // Fetch settings
  const { isLoading } = useQuery({
    queryKey: ['settings', 'discussion'],
    queryFn: async () => {
      try {
        const response = await apiClient.get('/api/v1/settings/discussion');
        const data = response.data.data;
        if (data) {
          setSettings(data);
          setModerationText(data.moderationKeywords?.join('\n') || '');
          setBlacklistText(data.blacklistKeywords?.join('\n') || '');
          saveSettingsToStorage(STORAGE_KEYS.DISCUSSION_SETTINGS, data);
        }
        return data;
      } catch (apiError) {
        console.warn('Discussion Settings API 실패, localStorage 사용:', apiError);
        const fallbackData = loadSettingsFromStorage(STORAGE_KEYS.DISCUSSION_SETTINGS, DEFAULT_DISCUSSION_SETTINGS);
        setSettings(fallbackData);
        setModerationText(fallbackData.moderationKeywords?.join('\n') || '');
        setBlacklistText(fallbackData.blacklistKeywords?.join('\n') || '');
        return fallbackData;
      }
    }
  });

  // Save settings mutation
  const saveMutation = useMutation({
    mutationFn: async (data: DiscussionSettingsData) => {
      const payload = {
        ...data,
        moderationKeywords: moderationText.split('\n').filter(Boolean),
        blacklistKeywords: blacklistText.split('\n').filter(Boolean)
      };
      try {
        const response = await apiClient.put('/api/v1/settings/discussion', payload);
        saveSettingsToStorage(STORAGE_KEYS.DISCUSSION_SETTINGS, payload);
        return response;
      } catch (apiError) {
        // API 실패 시 localStorage에만 저장
        console.warn('Discussion Settings API 저장 실패, localStorage에만 저장:', apiError);
        saveSettingsToStorage(STORAGE_KEYS.DISCUSSION_SETTINGS, payload);
        throw new Error('서버 저장 실패, 로컬에만 저장되었습니다');
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings', 'discussion'] });
      success('토론 설정이 저장되었습니다.');
    },
    onError: (err: unknown) => {
      const message = err instanceof Error ? err.message : '설정 저장에 실패했습니다';
      error(message);
    }
  });

  const handleSave = () => {
    saveMutation.mutate(settings);
  };

  const handleChange = (field: keyof DiscussionSettingsData, value: any) => {
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
      {/* 기본 댓글 설정 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="w-5 h-5" />
            기본 댓글 설정
          </CardTitle>
          <CardDescription>
            댓글 시스템의 기본 동작을 설정합니다
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>댓글 기능 활성화</Label>
              <p className="text-sm text-gray-500">
                전체 사이트에서 댓글 기능을 사용합니다
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
                <Label htmlFor="closeAfterDays">댓글 자동 마감 (일)</Label>
                <Input
                  id="closeAfterDays"
                  type="number"
                  min="0"
                  value={settings.closeCommentsAfterDays}
                  onChange={(e: any) => handleChange('closeCommentsAfterDays', parseInt(e.target.value))}
                />
                <p className="text-sm text-gray-500">
                  글 작성 후 지정된 일수가 지나면 댓글을 자동으로 마감합니다 (0 = 자동 마감 안함)
                </p>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="commentsPerPage">페이지당 댓글 수</Label>
                  <Input
                    id="commentsPerPage"
                    type="number"
                    min="10"
                    max="200"
                    value={settings.commentsPerPage}
                    onChange={(e: any) => handleChange('commentsPerPage', parseInt(e.target.value))}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="commentOrder">기본 댓글 정렬</Label>
                  <Select
                    value={settings.defaultCommentOrder}
                    onValueChange={(value: string) => handleChange('defaultCommentOrder', value)}
                  >
                    <SelectTrigger id="commentOrder">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="oldest">오래된 순</SelectItem>
                      <SelectItem value="newest">최신 순</SelectItem>
                      <SelectItem value="popular">인기 순</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>대댓글 허용</Label>
                  <p className="text-sm text-gray-500">
                    댓글에 대한 답글(스레드) 기능을 활성화합니다
                  </p>
                </div>
                <Switch
                  checked={settings.enableThreadedComments}
                  onCheckedChange={(checked: boolean) => handleChange('enableThreadedComments', checked)}
                />
              </div>

              {settings.enableThreadedComments && (
                <div className="space-y-2">
                  <Label htmlFor="threadDepth">대댓글 깊이</Label>
                  <Select
                    value={settings.threadDepth.toString()}
                    onValueChange={(value: string) => handleChange('threadDepth', parseInt(value))}
                  >
                    <SelectTrigger id="threadDepth">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="2">2단계</SelectItem>
                      <SelectItem value="3">3단계</SelectItem>
                      <SelectItem value="4">4단계</SelectItem>
                      <SelectItem value="5">5단계</SelectItem>
                      <SelectItem value="10">10단계</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-sm text-gray-500">
                    대댓글을 몇 단계까지 허용할지 설정합니다
                  </p>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* 댓글 작성자 설정 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="w-5 h-5" />
            댓글 작성자 설정
          </CardTitle>
          <CardDescription>
            댓글 작성 권한과 작성자 정보를 설정합니다
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>이름과 이메일 필수</Label>
              <p className="text-sm text-gray-500">
                댓글 작성 시 이름과 이메일 입력을 필수로 합니다
              </p>
            </div>
            <Switch
              checked={settings.requireNameEmail}
              onCheckedChange={(checked: boolean) => handleChange('requireNameEmail', checked)}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>회원만 댓글 작성</Label>
              <p className="text-sm text-gray-500">
                로그인한 회원만 댓글을 작성할 수 있습니다
              </p>
            </div>
            <Switch
              checked={settings.requireRegistration}
              onCheckedChange={(checked: boolean) => handleChange('requireRegistration', checked)}
            />
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Gravatar 사용</Label>
              <p className="text-sm text-gray-500">
                댓글 작성자의 Gravatar 아바타를 표시합니다
              </p>
            </div>
            <Switch
              checked={settings.enableGravatar}
              onCheckedChange={(checked: boolean) => handleChange('enableGravatar', checked)}
            />
          </div>

          {settings.enableGravatar && (
            <div className="space-y-2">
              <Label htmlFor="defaultAvatar">기본 아바타</Label>
              <Select
                value={settings.defaultAvatar}
                onValueChange={(value: string) => handleChange('defaultAvatar', value)}
              >
                <SelectTrigger id="defaultAvatar">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="mystery">미스터리맨</SelectItem>
                  <SelectItem value="blank">빈 이미지</SelectItem>
                  <SelectItem value="gravatar">Gravatar 로고</SelectItem>
                  <SelectItem value="identicon">Identicon</SelectItem>
                  <SelectItem value="wavatar">Wavatar</SelectItem>
                  <SelectItem value="monsterid">MonsterID</SelectItem>
                  <SelectItem value="retro">레트로</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-sm text-gray-500">
                Gravatar가 없는 사용자에게 표시할 기본 아바타
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 댓글 관리 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5" />
            댓글 관리 및 스팸 방지
          </CardTitle>
          <CardDescription>
            댓글 승인과 스팸 방지 설정을 구성합니다
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>댓글 사전 승인 필요</Label>
              <p className="text-sm text-gray-500">
                모든 댓글이 관리자 승인 후 표시됩니다
              </p>
            </div>
            <Switch
              checked={settings.requireModeration}
              onCheckedChange={(checked: boolean) => handleChange('requireModeration', checked)}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>이전 승인자 자동 승인</Label>
              <p className="text-sm text-gray-500">
                이전에 승인된 작성자의 댓글은 자동 승인됩니다
              </p>
            </div>
            <Switch
              checked={settings.holdForModeration}
              onCheckedChange={(checked: boolean) => handleChange('holdForModeration', checked)}
            />
          </div>

          <Separator />

          <div className="space-y-2">
            <Label htmlFor="maxLinks">댓글당 최대 링크 수</Label>
            <Input
              id="maxLinks"
              type="number"
              min="0"
              max="10"
              value={settings.maxLinks}
              onChange={(e: any) => handleChange('maxLinks', parseInt(e.target.value))}
            />
            <p className="text-sm text-gray-500">
              이 개수 이상의 링크가 포함된 댓글은 승인 대기로 처리됩니다
            </p>
          </div>

          <Separator />

          <div className="space-y-2">
            <Label htmlFor="moderationKeywords">검토 대상 키워드</Label>
            <Textarea
              id="moderationKeywords"
              value={moderationText}
              onChange={(e) => setModerationText(e.target.value)}
              placeholder="한 줄에 하나씩 입력"
              rows={4}
            />
            <p className="text-sm text-gray-500">
              이 키워드가 포함된 댓글은 승인 대기 상태가 됩니다
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="blacklistKeywords">차단 키워드</Label>
            <Textarea
              id="blacklistKeywords"
              value={blacklistText}
              onChange={(e) => setBlacklistText(e.target.value)}
              placeholder="한 줄에 하나씩 입력"
              rows={4}
            />
            <p className="text-sm text-gray-500">
              이 키워드가 포함된 댓글은 자동으로 스팸 처리됩니다
            </p>
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