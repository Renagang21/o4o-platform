/**
 * LevelSelector Component
 * 시각적 헤딩 레벨 선택기 (H1-H6)
 */

import React from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Type, Hash } from 'lucide-react';

interface LevelSelectorProps {
  currentLevel: 1 | 2 | 3 | 4 | 5 | 6;
  onLevelChange: (level: 1 | 2 | 3 | 4 | 5 | 6) => void;
  showPreview?: boolean;
}

const HEADING_LEVELS = [
  { level: 1, size: 'text-4xl', weight: 'font-bold', description: 'Main title', usage: 'Page title' },
  { level: 2, size: 'text-3xl', weight: 'font-bold', description: 'Section heading', usage: 'Major sections' },
  { level: 3, size: 'text-2xl', weight: 'font-semibold', description: 'Subsection', usage: 'Sub-sections' },
  { level: 4, size: 'text-xl', weight: 'font-semibold', description: 'Sub-subsection', usage: 'Minor headings' },
  { level: 5, size: 'text-lg', weight: 'font-medium', description: 'Small heading', usage: 'Details' },
  { level: 6, size: 'text-base', weight: 'font-medium', description: 'Smallest heading', usage: 'Fine details' },
] as const;

export const LevelSelector: React.FC<LevelSelectorProps> = ({
  currentLevel,
  onLevelChange,
  showPreview = true,
}) => {
  return (
    <div className="space-y-4 p-4 border rounded-lg bg-gray-50">
      {/* Header */}
      <div className="flex items-center gap-2">
        <Type className="h-4 w-4" />
        <Label className="text-sm font-medium">Heading Level</Label>
      </div>

      {/* Level Buttons Grid */}
      <div className="grid grid-cols-6 gap-2">
        {HEADING_LEVELS.map((heading) => (
          <Button
            key={heading.level}
            variant={currentLevel === heading.level ? "default" : "outline"}
            size="sm"
            onClick={() => onLevelChange(heading.level as any)}
            className={`
              h-12 flex flex-col items-center justify-center p-2
              ${currentLevel === heading.level ? 'ring-2 ring-blue-500' : ''}
            `}
            title={`${heading.description} - ${heading.usage}`}
          >
            <span className="text-xs font-bold">H{heading.level}</span>
            <div
              className={`
                w-full h-1 rounded mt-1 bg-current
                ${currentLevel === heading.level ? 'opacity-100' : 'opacity-30'}
              `}
            />
          </Button>
        ))}
      </div>

      {/* Quick Access Row */}
      <div className="flex gap-1">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onLevelChange(1)}
          className="flex-1 text-xs"
        >
          Title (H1)
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onLevelChange(2)}
          className="flex-1 text-xs"
        >
          Section (H2)
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onLevelChange(3)}
          className="flex-1 text-xs"
        >
          Sub (H3)
        </Button>
      </div>

      {/* Current Level Info */}
      <div className="p-3 bg-white rounded border">
        <div className="flex items-center gap-2 mb-2">
          <Hash className="h-4 w-4 text-gray-500" />
          <span className="text-sm font-medium">
            Level {currentLevel} - {HEADING_LEVELS[currentLevel - 1].description}
          </span>
        </div>
        <p className="text-xs text-gray-600">
          {HEADING_LEVELS[currentLevel - 1].usage}
        </p>
      </div>

      {/* Preview */}
      {showPreview && (
        <div className="space-y-2">
          <Label className="text-xs font-medium text-gray-700">Preview</Label>
          <div className="p-3 bg-white rounded border">
            <div
              className={`
                ${HEADING_LEVELS[currentLevel - 1].size}
                ${HEADING_LEVELS[currentLevel - 1].weight}
                text-gray-900
              `}
            >
              Heading Level {currentLevel}
            </div>
          </div>
        </div>
      )}

      {/* Keyboard Shortcuts */}
      <div className="text-xs text-gray-500 space-y-1 pt-2 border-t">
        <p><strong>Shortcuts:</strong> Ctrl/Cmd + 1-6 for levels</p>
        <p><strong>Tip:</strong> Use hierarchical structure (H1 → H2 → H3)</p>
      </div>
    </div>
  );
};

export default LevelSelector;