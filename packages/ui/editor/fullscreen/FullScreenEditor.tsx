import React, { useState } from 'react';
import { TopToolbar } from './TopToolbar';
import { EditorCanvas } from './EditorCanvas';
import { BlockInserter } from './LeftSidebar/BlockInserter';
import { SettingsPanel } from './RightSidebar/SettingsPanel';

interface FullScreenEditorProps {
  pageId?: string;
  initialContent?: string;
  onSave?: (content: string) => void;
  onPreview?: () => void;
}

export function FullScreenEditor({
  pageId,
  initialContent,
  onSave,
  onPreview
}: FullScreenEditorProps) {
  // 사이드바 토글 상태
  const [leftSidebarOpen, setLeftSidebarOpen] = useState(true);
  const [rightSidebarOpen, setRightSidebarOpen] = useState(true);
  
  // 에디터 상태
  const [content, setContent] = useState(initialContent || '');
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // 저장 핸들러
  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onSave?.(content);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="h-screen bg-white flex flex-col">
      {/* 상단 툴바 */}
      <TopToolbar
        onSave={handleSave}
        onPreview={onPreview}
        isSaving={isSaving}
        leftSidebarOpen={leftSidebarOpen}
        rightSidebarOpen={rightSidebarOpen}
        onToggleLeftSidebar={() => setLeftSidebarOpen(!leftSidebarOpen)}
        onToggleRightSidebar={() => setRightSidebarOpen(!rightSidebarOpen)}
      />

      {/* 메인 콘텐츠 영역 */}
      <div className="flex-1 flex overflow-hidden">
        {/* 왼쪽 사이드바 - 블록 삽입기 */}
        {leftSidebarOpen && (
          <div className="w-80 border-r border-gray-200 bg-white overflow-y-auto">
            <BlockInserter />
          </div>
        )}

        {/* 중앙 에디터 영역 */}
        <div className="flex-1 overflow-y-auto bg-gray-50">
          <EditorCanvas
            content={content}
            onChange={setContent}
            selectedBlockId={selectedBlockId}
            onSelectBlock={setSelectedBlockId}
          />
        </div>

        {/* 오른쪽 사이드바 - 설정 패널 */}
        {rightSidebarOpen && (
          <div className="w-80 border-l border-gray-200 bg-white overflow-y-auto">
            <SettingsPanel 
              selectedBlockId={selectedBlockId}
              pageId={pageId}
            />
          </div>
        )}
      </div>
    </div>
  );
}