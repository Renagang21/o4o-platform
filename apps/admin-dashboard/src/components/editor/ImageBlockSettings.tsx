import { FC } from 'react';
import { 
  AlignLeft, 
  AlignCenter, 
  AlignRight, 
  Maximize, 
  RectangleHorizontal,
  Link2,
  Type
} from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { clsx } from 'clsx';

interface ImageBlockSettingsProps {
  settings: {
    alignment?: 'left' | 'center' | 'right' | 'wide' | 'full';
    size?: 'thumbnail' | 'medium' | 'large' | 'full';
    width?: number;
    height?: number;
    alt?: string;
    caption?: string;
    link?: string;
    linkTarget?: '_self' | '_blank';
  };
  onChange: (settings: any) => void;
}

const ImageBlockSettings: FC<ImageBlockSettingsProps> = ({ settings, onChange }) => {
  const alignmentOptions = [
    { value: 'left', icon: AlignLeft, label: '왼쪽' },
    { value: 'center', icon: AlignCenter, label: '가운데' },
    { value: 'right', icon: AlignRight, label: '오른쪽' },
    { value: 'wide', icon: RectangleHorizontal, label: '넓게' },
    { value: 'full', icon: Maximize, label: '전체 너비' }
  ];

  const sizeOptions = [
    { value: 'thumbnail', label: '썸네일 (150x150)' },
    { value: 'medium', label: '중간 (300x300)' },
    { value: 'large', label: '크게 (1024x1024)' },
    { value: 'full', label: '원본 크기' }
  ];

  return (
    <div className="space-y-4 p-4 bg-gray-50 rounded-lg">
      {/* 정렬 */}
      <div>
        <Label className="text-sm font-medium mb-2 block">정렬</Label>
        <div className="flex gap-1">
          {alignmentOptions.map((option: any) => {
            const Icon = option.icon;
            return (
              <button
                key={option.value}
                onClick={() => onChange({ ...settings as any, alignment: option.value })}
                className={clsx(
                  'p-2 rounded transition-colors',
                  settings.alignment === option.value
                    ? 'bg-blue-600 text-white'
                    : 'bg-white text-gray-600 hover:bg-gray-100'
                )}
                title={option.label}
              >
                <Icon className="w-4 h-4" />
              </button>
            );
          })}
        </div>
      </div>

      {/* 크기 */}
      <div>
        <Label className="text-sm font-medium mb-2 block">이미지 크기</Label>
        <select
          value={settings.size || 'large'}
          onChange={(e: any) => onChange({ ...settings as any, size: e.target.value })}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          {sizeOptions.map((option: any) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      {/* 커스텀 크기 */}
      {settings.size === 'full' && (
        <div className="grid grid-cols-2 gap-2">
          <div>
            <Label htmlFor="width" className="text-sm">너비</Label>
            <Input
              id="width"
              type="number"
              value={settings.width || ''}
              onChange={(e: any) => onChange({ ...settings as any, width: parseInt(e.target.value) || undefined })}
              placeholder="px"
            />
          </div>
          <div>
            <Label htmlFor="height" className="text-sm">높이</Label>
            <Input
              id="height"
              type="number"
              value={settings.height || ''}
              onChange={(e: any) => onChange({ ...settings as any, height: parseInt(e.target.value) || undefined })}
              placeholder="px"
            />
          </div>
        </div>
      )}

      {/* 대체 텍스트 */}
      <div>
        <Label htmlFor="alt" className="text-sm font-medium mb-1 block">
          <Type className="w-3 h-3 inline mr-1" />
          대체 텍스트
        </Label>
        <Input
          id="alt"
          value={settings.alt || ''}
          onChange={(e: any) => onChange({ ...settings as any, alt: e.target.value })}
          placeholder="이미지 설명"
        />
        <p className="text-xs text-gray-500 mt-1">접근성을 위해 이미지를 설명하세요</p>
      </div>

      {/* 캡션 */}
      <div>
        <Label htmlFor="caption" className="text-sm font-medium mb-1 block">캡션</Label>
        <Textarea
          id="caption"
          value={settings.caption || ''}
          onChange={(e: any) => onChange({ ...settings as any, caption: e.target.value })}
          placeholder="이미지 캡션 (선택사항)"
          rows={2}
        />
      </div>

      {/* 링크 */}
      <div>
        <Label htmlFor="link" className="text-sm font-medium mb-1 block">
          <Link2 className="w-3 h-3 inline mr-1" />
          링크 URL
        </Label>
        <Input
          id="link"
          type="url"
          value={settings.link || ''}
          onChange={(e: any) => onChange({ ...settings as any, link: e.target.value })}
          placeholder="https://example.com"
        />
        {settings.link && (
          <div className="mt-2">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={settings.linkTarget === '_blank'}
                onChange={(e: any) => onChange({ 
                  ...settings as any, 
                  linkTarget: e.target.checked ? '_blank' : '_self' 
                })}
                className="rounded"
              />
              <span className="text-sm">새 탭에서 열기</span>
            </label>
          </div>
        )}
      </div>
    </div>
  );
};

export default ImageBlockSettings;