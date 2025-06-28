import React from 'react';
import { 
  Save, 
  Eye, 
  PanelLeft, 
  PanelRight,
  MoreHorizontal,
  Undo,
  Redo
} from 'lucide-react';

interface TopToolbarProps {
  onSave: () => void;
  onPreview?: () => void;
  isSaving: boolean;
  leftSidebarOpen: boolean;
  rightSidebarOpen: boolean;
  onToggleLeftSidebar: () => void;
  onToggleRightSidebar: () => void;
}

export function TopToolbar({
  onSave,
  onPreview,
  isSaving,
  leftSidebarOpen,
  rightSidebarOpen,
  onToggleLeftSidebar,
  onToggleRightSidebar
}: TopToolbarProps) {
  return (
    <div className="h-14 bg-white border-b border-gray-200 flex items-center justify-between px-4">
      {/* 왼쪽 그룹 - 로고 & 기본 액션 */}
      <div className="flex items-center gap-4">
        {/* 로고/제목 */}
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-blue-600 rounded flex items-center justify-center">
            <span className="text-white font-bold text-sm">O4O</span>
          </div>
          <span className="font-medium text-gray-900">페이지 편집기</span>
        </div>

        {/* 구분선 */}
        <div className="w-px h-6 bg-gray-300" />

        {/* 실행취소/다시실행 */}
        <div className="flex items-center gap-1">
          <button className="p-1.5 rounded hover:bg-gray-100 transition-colors">
            <Undo className="h-4 w-4 text-gray-600" />
          </button>
          <button className="p-1.5 rounded hover:bg-gray-100 transition-colors">
            <Redo className="h-4 w-4 text-gray-600" />
          </button>
        </div>
      </div>

      {/* 중앙 그룹 - 사이드바 토글 */}
      <div className="flex items-center gap-2">
        <button
          onClick={onToggleLeftSidebar}
          className={`p-1.5 rounded hover:bg-gray-100 transition-colors ${
            leftSidebarOpen ? 'bg-gray-100 text-blue-600' : 'text-gray-600'
          }`}
        >
          <PanelLeft className="h-4 w-4" />
        </button>
        
        <button
          onClick={onToggleRightSidebar}
          className={`p-1.5 rounded hover:bg-gray-100 transition-colors ${
            rightSidebarOpen ? 'bg-gray-100 text-blue-600' : 'text-gray-600'
          }`}
        >
          <PanelRight className="h-4 w-4" />
        </button>
      </div>

      {/* 오른쪽 그룹 - 저장 & 발행 */}
      <div className="flex items-center gap-3">
        {/* 미리보기 */}
        <button 
          onClick={onPreview}
          className="inline-flex items-center px-3 py-1.5 text-sm font-medium border border-gray-300 rounded-md text-gray-700 bg-white hover:bg-gray-50 transition-colors"
        >
          <Eye className="h-4 w-4 mr-2" />
          미리보기
        </button>

        {/* 저장 */}
        <button 
          onClick={onSave}
          disabled={isSaving}
          className="inline-flex items-center px-3 py-1.5 text-sm font-medium border border-gray-300 rounded-md text-gray-700 bg-white hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Save className="h-4 w-4 mr-2" />
          {isSaving ? '저장 중...' : '저장'}
        </button>

        {/* 발행 */}
        <button className="inline-flex items-center px-3 py-1.5 text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 transition-colors">
          발행
        </button>

        {/* 더보기 메뉴 */}
        <button className="p-1.5 rounded hover:bg-gray-100 transition-colors">
          <MoreHorizontal className="h-4 w-4 text-gray-600" />
        </button>
      </div>
    </div>
  );
}