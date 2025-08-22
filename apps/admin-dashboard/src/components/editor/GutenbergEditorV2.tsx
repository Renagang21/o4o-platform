import { FC, useState, useEffect, useCallback } from 'react';
import { 
  Plus, 
  Settings,
  Save,
  Undo,
  Redo,
  Eye,
  MoreVertical
} from 'lucide-react';
import { EditorCanvas } from './components/EditorCanvas';
import { EditorSidebar } from './components/EditorSidebar';
import { BlockInserter } from './components/BlockInserter';
import { PreviewModal } from './components/PreviewModal';
import { useTheme } from './hooks/useTheme';
import { useBlocks } from './hooks/useBlocks';
import { useEditorHistory } from './hooks/useEditorHistory';
import type { Block } from './types';

interface GutenbergEditorV2Props {
  postId?: string;
  onSave?: (blocks: Block[]) => void;
  initialBlocks?: Block[];
}

const GutenbergEditorV2: FC<GutenbergEditorV2Props> = ({
  onSave,
  initialBlocks = []
}) => {
  const [blocks, setBlocks] = useState<Block[]>(initialBlocks);
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isInserterOpen, setIsInserterOpen] = useState(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  
  // 테마 로드
  const { theme, loadTheme } = useTheme();
  
  // 블록 관리
  const {
    addBlock,
    updateBlock,
    deleteBlock,
    moveBlock,
    duplicateBlock
  } = useBlocks(blocks, setBlocks);
  
  // 실행 취소/다시 실행
  const {
    canUndo,
    canRedo,
    undo,
    redo,
    saveState
  } = useEditorHistory(blocks);

  // 테마 초기 로드
  useEffect(() => {
    loadTheme();
  }, []);

  // 저장 핸들러
  const handleSave = useCallback(() => {
    if (onSave) {
      onSave(blocks);
    }
    saveState(blocks);
  }, [blocks, onSave, saveState]);

  // 키보드 단축키
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl/Cmd + S: 저장
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        handleSave();
      }
      // Ctrl/Cmd + Z: 실행 취소
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        if (canUndo) undo();
      }
      // Ctrl/Cmd + Shift + Z: 다시 실행
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'z') {
        e.preventDefault();
        if (canRedo) redo();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleSave, canUndo, canRedo, undo, redo]);

  return (
    <div className="gutenberg-editor-v2 h-screen flex flex-col bg-white">
      {/* 상단 툴바 - 48px 고정 */}
      <header className="h-12 border-b border-gray-200 flex items-center justify-between px-4 bg-white">
        <div className="flex items-center gap-2">
          {/* 블록 추가 버튼 */}
          <button
            onClick={() => setIsInserterOpen(!isInserterOpen)}
            className="p-2 hover:bg-gray-100 rounded transition-colors"
            title="블록 추가"
          >
            <Plus className="w-5 h-5" />
          </button>
          
          {/* 실행 취소/다시 실행 */}
          <button
            onClick={undo}
            disabled={!canUndo}
            className="p-2 hover:bg-gray-100 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            title="실행 취소"
          >
            <Undo className="w-5 h-5" />
          </button>
          <button
            onClick={redo}
            disabled={!canRedo}
            className="p-2 hover:bg-gray-100 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            title="다시 실행"
          >
            <Redo className="w-5 h-5" />
          </button>
        </div>

        {/* 중앙: 문서 제목 */}
        <div className="flex-1 text-center">
          <span className="text-sm text-gray-600">문서 편집 중</span>
        </div>

        {/* 우측 도구 */}
        <div className="flex items-center gap-2">
          {/* 미리보기 */}
          <button
            onClick={() => setIsPreviewOpen(true)}
            className="p-2 hover:bg-gray-100 rounded transition-colors"
            title="미리보기"
          >
            <Eye className="w-5 h-5" />
          </button>
          
          {/* 저장 */}
          <button
            onClick={handleSave}
            className="px-4 py-1.5 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 transition-colors flex items-center gap-2"
          >
            <Save className="w-4 h-4" />
            저장
          </button>
          
          {/* 설정 토글 */}
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className={`p-2 hover:bg-gray-100 rounded transition-colors ${sidebarOpen ? 'bg-gray-100' : ''}`}
            title="설정 패널"
          >
            <Settings className="w-5 h-5" />
          </button>
          
          {/* 더보기 옵션 */}
          <button
            className="p-2 hover:bg-gray-100 rounded transition-colors"
            title="옵션"
          >
            <MoreVertical className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* 메인 콘텐츠 영역 */}
      <div className="flex-1 flex overflow-hidden">
        {/* 블록 인서터 */}
        {isInserterOpen && (
          <BlockInserter
            theme={theme}
            onInsert={(blockType) => {
              addBlock(blockType);
              setIsInserterOpen(false);
            }}
            onClose={() => setIsInserterOpen(false)}
          />
        )}

        {/* 편집 캔버스 */}
        <div className="flex-1 overflow-auto">
          <EditorCanvas
            blocks={blocks}
            selectedBlockId={selectedBlockId}
            onSelectBlock={setSelectedBlockId}
            onUpdateBlock={updateBlock}
            onDeleteBlock={deleteBlock}
            onMoveBlock={moveBlock}
            onDuplicateBlock={duplicateBlock}
            onAddBlock={addBlock}
            setBlocks={setBlocks}
            theme={theme}
          />
        </div>

        {/* 설정 사이드바 */}
        {sidebarOpen && (
          <EditorSidebar
            selectedBlock={blocks.find(b => b.id === selectedBlockId)}
            onUpdateBlock={updateBlock}
            theme={theme}
          />
        )}
      </div>

      {/* 미리보기 모달 */}
      <PreviewModal
        isOpen={isPreviewOpen}
        onClose={() => setIsPreviewOpen(false)}
        blocks={blocks}
        theme={theme}
      />
    </div>
  );
};

export default GutenbergEditorV2;