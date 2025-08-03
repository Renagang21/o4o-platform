import { FC } from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { clsx } from 'clsx';
import { Type, Link, Palette, Circle } from 'lucide-react';

interface ButtonBlockSettingsProps {
  settings: {
    text?: string;
    url?: string;
    target?: '_self' | '_blank';
    style?: 'fill' | 'outline';
    backgroundColor?: string;
    textColor?: string;
    borderRadius?: number;
  };
  onChange: (settings: any) => void;
}

const ButtonBlockSettings: FC<ButtonBlockSettingsProps> = ({ settings, onChange }) => {
  const colorPresets = [
    { bg: '#007cba', text: '#ffffff', label: '파란색' },
    { bg: '#28a745', text: '#ffffff', label: '초록색' },
    { bg: '#dc3545', text: '#ffffff', label: '빨간색' },
    { bg: '#ffc107', text: '#000000', label: '노란색' },
    { bg: '#6c757d', text: '#ffffff', label: '회색' },
    { bg: '#000000', text: '#ffffff', label: '검정색' }
  ];

  return (
    <div className="space-y-4 p-4 bg-gray-50 rounded-lg">
      {/* 버튼 텍스트 */}
      <div>
        <Label htmlFor="text" className="text-sm font-medium mb-1 block">
          <Type className="w-3 h-3 inline mr-1" />
          버튼 텍스트
        </Label>
        <Input
          id="text"
          value={settings.text || ''}
          onChange={(e: any) => onChange({ ...settings, text: e.target.value })}
          placeholder="버튼 텍스트"
        />
      </div>

      {/* 링크 URL */}
      <div>
        <Label htmlFor="url" className="text-sm font-medium mb-1 block">
          <Link className="w-3 h-3 inline mr-1" />
          링크 URL
        </Label>
        <Input
          id="url"
          type="url"
          value={settings.url || ''}
          onChange={(e: any) => onChange({ ...settings, url: e.target.value })}
          placeholder="https://example.com"
        />
        <div className="mt-2">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={settings.target === '_blank'}
              onChange={(e: any) => onChange({ 
                ...settings, 
                target: e.target.checked ? '_blank' : '_self' 
              })}
              className="rounded"
            />
            <span className="text-sm">새 탭에서 열기</span>
          </label>
        </div>
      </div>

      {/* 버튼 스타일 */}
      <div>
        <Label className="text-sm font-medium mb-2 block">버튼 스타일</Label>
        <div className="flex gap-2">
          <button
            onClick={() => onChange({ ...settings, style: 'fill' })}
            className={clsx(
              'flex-1 p-2 rounded transition-colors text-sm',
              settings.style === 'fill'
                ? 'bg-blue-600 text-white'
                : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-300'
            )}
          >
            채우기
          </button>
          <button
            onClick={() => onChange({ ...settings, style: 'outline' })}
            className={clsx(
              'flex-1 p-2 rounded transition-colors text-sm',
              settings.style === 'outline'
                ? 'bg-blue-600 text-white'
                : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-300'
            )}
          >
            윤곽선
          </button>
        </div>
      </div>

      {/* 색상 설정 */}
      <div>
        <Label className="text-sm font-medium mb-2 block">
          <Palette className="w-3 h-3 inline mr-1" />
          색상
        </Label>
        <div className="grid grid-cols-3 gap-2 mb-2">
          {colorPresets.map(preset => (
            <button
              key={preset.bg}
              onClick={() => onChange({ 
                ...settings, 
                backgroundColor: preset.bg,
                textColor: preset.text
              })}
              className={clsx(
                'p-2 rounded border-2 transition-colors',
                settings.backgroundColor === preset.bg
                  ? 'border-blue-600'
                  : 'border-gray-300 hover:border-gray-400'
              )}
            >
              <div 
                className="w-full h-6 rounded flex items-center justify-center text-xs font-medium"
                style={{ 
                  backgroundColor: preset.bg,
                  color: preset.text
                }}
              >
                {preset.label}
              </div>
            </button>
          ))}
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <Label htmlFor="bgColor" className="text-xs text-gray-600">배경색</Label>
            <Input
              id="bgColor"
              type="color"
              value={settings.backgroundColor || '#007cba'}
              onChange={(e: any) => onChange({ ...settings, backgroundColor: e.target.value })}
              className="mt-1 h-8"
            />
          </div>
          <div>
            <Label htmlFor="textColor" className="text-xs text-gray-600">텍스트색</Label>
            <Input
              id="textColor"
              type="color"
              value={settings.textColor || '#ffffff'}
              onChange={(e: any) => onChange({ ...settings, textColor: e.target.value })}
              className="mt-1 h-8"
            />
          </div>
        </div>
      </div>

      {/* 모서리 둥글기 */}
      <div>
        <Label htmlFor="borderRadius" className="text-sm font-medium mb-1 block">
          <Circle className="w-3 h-3 inline mr-1" />
          모서리 둥글기
        </Label>
        <div className="flex items-center gap-2">
          <input
            type="range"
            min="0"
            max="50"
            value={settings.borderRadius || 4}
            onChange={(e: any) => onChange({ ...settings, borderRadius: parseInt(e.target.value) })}
            className="flex-1"
          />
          <span className="text-sm w-12 text-right">{settings.borderRadius || 4}px</span>
        </div>
      </div>

      {/* 미리보기 */}
      <div>
        <Label className="text-sm font-medium mb-2 block">미리보기</Label>
        <div className="p-4 bg-white rounded border flex justify-center">
          <button
            className={clsx(
              'px-4 py-2 rounded transition-colors',
              settings.style === 'fill' && 'text-white',
              settings.style === 'outline' && 'border-2'
            )}
            style={{
              backgroundColor: settings.style === 'fill' ? settings.backgroundColor : 'transparent',
              color: settings.style === 'fill' ? settings.textColor : settings.backgroundColor,
              borderColor: settings.style === 'outline' ? settings.backgroundColor : 'transparent',
              borderRadius: `${settings.borderRadius}px`
            }}
          >
            {settings.text || '버튼'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ButtonBlockSettings;