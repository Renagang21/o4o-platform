import React from 'react';
import { useBlockEditorStore } from '@/stores/block-editor-store';
import { Button } from '@/components/ui/button';
import { Save, Undo, Redo, Eye, Settings } from 'lucide-react';

interface EditorToolbarProps {
  onSave?: () => void;
  onPreview?: () => void;
  className?: string;
}

export const EditorToolbar: React.FC<EditorToolbarProps> = ({
  onSave,
  onPreview,
  className = ''
}) => {
  const { undo, redo, canUndo, canRedo, blocks } = useBlockEditorStore();

  return (
    <div className={`flex items-center justify-between bg-white border border-gray-200 rounded-lg p-3 ${className}`}>
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={undo}
          disabled={!canUndo()}
        >
          <Undo className="w-4 h-4 mr-2" />
          되돌리기
        </Button>
        
        <Button
          variant="outline"
          size="sm"
          onClick={redo}
          disabled={!canRedo()}
        >
          <Redo className="w-4 h-4 mr-2" />
          다시 실행
        </Button>
      </div>

      <div className="flex items-center gap-2">
        <span className="text-sm text-gray-600">
          블록 {blocks.length}개
        </span>
        
        {onPreview && (
          <Button variant="outline" size="sm" onClick={onPreview}>
            <Eye className="w-4 h-4 mr-2" />
            미리보기
          </Button>
        )}
        
        {onSave && (
          <Button size="sm" onClick={onSave}>
            <Save className="w-4 h-4 mr-2" />
            저장
          </Button>
        )}
      </div>
    </div>
  );
};