import { FC } from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { clsx } from 'clsx';
import { AlignLeft, AlignCenter, AlignRight, Palette, Type, Move } from 'lucide-react';

interface CoverBlockSettingsProps {
  settings: {
    title?: string;
    text?: string;
    overlayColor?: string;
    minHeight?: number;
    contentAlign?: 'left' | 'center' | 'right';
  };
  onChange: (settings: any) => void;
}

const CoverBlockSettings: FC<CoverBlockSettingsProps> = ({ settings, onChange }) => {
  const alignmentOptions = [
    { value: 'left', icon: AlignLeft, label: '왼쪽' },
    { value: 'center', icon: AlignCenter, label: '가운데' },
    { value: 'right', icon: AlignRight, label: '오른쪽' }
  ];

  const overlayPresets = [
    { color: 'rgba(0, 0, 0, 0.5)', label: '블랙 50%' },
    { color: 'rgba(0, 0, 0, 0.7)', label: '블랙 70%' },
    { color: 'rgba(255, 255, 255, 0.5)', label: '화이트 50%' },
    { color: 'rgba(0, 51, 102, 0.7)', label: '네이비 70%' },
    { color: 'rgba(0, 0, 0, 0)', label: '투명' }
  ];

  return (
    <div className="space-y-4 p-4 bg-gray-50 rounded-lg">
      {/* 제목 */}
      <div>
        <Label htmlFor="title" className="text-sm font-medium mb-1 block">
          <Type className="w-3 h-3 inline mr-1" />
          제목
        </Label>
        <Input
          id="title"
          value={settings.title || ''}
          onChange={(e: any) => onChange({ ...settings, title: e.target.value })}
          placeholder="Cover 제목"
        />
      </div>

      {/* 부제목 */}
      <div>
        <Label htmlFor="text" className="text-sm font-medium mb-1 block">부제목</Label>
        <Textarea
          id="text"
          value={settings.text || ''}
          onChange={(e: any) => onChange({ ...settings, text: e.target.value })}
          placeholder="Cover 부제목 텍스트"
          rows={2}
        />
      </div>

      {/* 정렬 */}
      <div>
        <Label className="text-sm font-medium mb-2 block">콘텐츠 정렬</Label>
        <div className="flex gap-1">
          {alignmentOptions.map(option => {
            const Icon = option.icon;
            return (
              <button
                key={option.value}
                onClick={() => onChange({ ...settings, contentAlign: option.value })}
                className={clsx(
                  'p-2 rounded transition-colors',
                  settings.contentAlign === option.value
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

      {/* 최소 높이 */}
      <div>
        <Label htmlFor="minHeight" className="text-sm font-medium mb-1 block">
          <Move className="w-3 h-3 inline mr-1" />
          최소 높이
        </Label>
        <div className="flex items-center gap-2">
          <input
            type="range"
            min="100"
            max="800"
            value={settings.minHeight || 300}
            onChange={(e: any) => onChange({ ...settings, minHeight: parseInt(e.target.value) })}
            className="flex-1"
          />
          <span className="text-sm w-16 text-right">{settings.minHeight || 300}px</span>
        </div>
      </div>

      {/* 오버레이 색상 */}
      <div>
        <Label className="text-sm font-medium mb-2 block">
          <Palette className="w-3 h-3 inline mr-1" />
          오버레이 색상
        </Label>
        <div className="space-y-2">
          <div className="grid grid-cols-2 gap-2">
            {overlayPresets.map(preset => (
              <button
                key={preset.color}
                onClick={() => onChange({ ...settings, overlayColor: preset.color })}
                className={clsx(
                  'p-2 rounded border-2 text-sm transition-colors',
                  settings.overlayColor === preset.color
                    ? 'border-blue-600'
                    : 'border-gray-300 hover:border-gray-400'
                )}
              >
                <div 
                  className="w-full h-8 rounded mb-1"
                  style={{ backgroundColor: preset.color, border: '1px solid #e5e7eb' }}
                />
                <span className="text-xs">{preset.label}</span>
              </button>
            ))}
          </div>
          <div>
            <Label htmlFor="customColor" className="text-xs text-gray-600">커스텀 색상</Label>
            <Input
              id="customColor"
              type="text"
              value={settings.overlayColor || ''}
              onChange={(e: any) => onChange({ ...settings, overlayColor: e.target.value })}
              placeholder="rgba(0, 0, 0, 0.5)"
              className="mt-1"
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default CoverBlockSettings;