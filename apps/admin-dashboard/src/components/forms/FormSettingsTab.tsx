import { FC } from 'react';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import type { FormSettings } from '@o4o/types';

interface FormSettingsTabProps {
  settings: FormSettings;
  onChange: (settings: FormSettings) => void;
}

export const FormSettingsTab: FC<FormSettingsTabProps> = ({ settings, onChange }) => {
  const updateSettings = (updates: Partial<FormSettings>) => {
    onChange({ ...settings as any, ...updates });
  };

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <h3 className="text-lg font-medium mb-4">제출 설정</h3>
        <div className="space-y-4">
          <div>
            <Label>제출 버튼 텍스트</Label>
            <Input
              value={settings.submitButtonText}
              onChange={(e: any) => updateSettings({ submitButtonText: e.target.value })}
            />
          </div>
          <div>
            <Label>처리중 텍스트</Label>
            <Input
              value={settings.submitButtonProcessingText}
              onChange={(e: any) => updateSettings({ submitButtonProcessingText: e.target.value })}
            />
          </div>
          <div className="flex items-center justify-between">
            <Label>AJAX 제출</Label>
            <Switch
              checked={settings.ajax}
              onCheckedChange={(checked: boolean) => updateSettings({ ajax: checked })}
            />
          </div>
        </div>
      </Card>

      <Card className="p-6">
        <h3 className="text-lg font-medium mb-4">액세스 제어</h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Label>로그인 필수</Label>
            <Switch
              checked={settings.requireLogin}
              onCheckedChange={(checked: boolean) => updateSettings({ requireLogin: checked })}
            />
          </div>
          <div className="flex items-center justify-between">
            <Label>제출 횟수 제한</Label>
            <Switch
              checked={settings.limitSubmissions}
              onCheckedChange={(checked: boolean) => updateSettings({ limitSubmissions: checked })}
            />
          </div>
          {settings.limitSubmissions && (
            <div>
              <Label>최대 제출 횟수</Label>
              <Input
                type="number"
                value={settings.maxSubmissions || ''}
                onChange={(e: any) => updateSettings({ maxSubmissions: parseInt(e.target.value) || undefined })}
              />
            </div>
          )}
        </div>
      </Card>

      <Card className="p-6">
        <h3 className="text-lg font-medium mb-4">보안</h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Label>Honeypot 보호</Label>
            <Switch
              checked={settings.honeypot}
              onCheckedChange={(checked: boolean) => updateSettings({ honeypot: checked })}
            />
          </div>
          <div className="flex items-center justify-between">
            <Label>CAPTCHA 사용</Label>
            <Switch
              checked={settings.recaptcha || false}
              onCheckedChange={(checked: boolean) => updateSettings({ recaptcha: checked })}
            />
          </div>
        </div>
      </Card>

      <Card className="p-6">
        <h3 className="text-lg font-medium mb-4">저장 및 진행</h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Label>임시 저장 허용</Label>
            <Switch
              checked={settings.allowSave}
              onCheckedChange={(checked: boolean) => updateSettings({ allowSave: checked })}
            />
          </div>
          <div className="flex items-center justify-between">
            <Label>자동 저장</Label>
            <Switch
              checked={settings.autoSave}
              onCheckedChange={(checked: boolean) => updateSettings({ autoSave: checked })}
            />
          </div>
          {settings.autoSave && (
            <div>
              <Label>자동 저장 간격 (초)</Label>
              <Input
                type="number"
                value={settings.autoSaveInterval || 30}
                onChange={(e: any) => updateSettings({ autoSaveInterval: parseInt(e.target.value) || 30 })}
              />
            </div>
          )}
        </div>
      </Card>

      <Card className="p-6">
        <h3 className="text-lg font-medium mb-4">멀티 페이지</h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Label>멀티 페이지 양식</Label>
            <Switch
              checked={settings.multiPage}
              onCheckedChange={(checked: boolean) => updateSettings({ multiPage: checked })}
            />
          </div>
          {settings.multiPage && (
            <>
              <div className="flex items-center justify-between">
                <Label>진행률 표시</Label>
                <Switch
                  checked={settings.progressBar}
                  onCheckedChange={(checked: boolean) => updateSettings({ progressBar: checked })}
                />
              </div>
              <div className="flex items-center justify-between">
                <Label>진행 상태 저장</Label>
                <Switch
                  checked={settings.saveProgress}
                  onCheckedChange={(checked: boolean) => updateSettings({ saveProgress: checked })}
                />
              </div>
            </>
          )}
        </div>
      </Card>
    </div>
  );
};