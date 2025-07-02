import React, { useState } from 'react';
import { SearchFilter } from '../../../admin';
import { 
  Type, 
  Image, 
  Video, 
  List, 
  Quote, 
  Code,
  Table,
  Columns,
  Plus,
  Heading1,
  Heading2,
  Heading3,
  AlignLeft,
  Bold,
  Download,
  Globe,
  FileText
} from 'lucide-react';
import { 
  ImportModal, 
  ImportBlock, 
  ImportManager
} from '../../import';
import type { ImportType, ImportStep, ConversionResult } from '../../import';

interface BlockType {
  id: string;
  name: string;
  icon: React.ComponentType<any>;
  category: string;
  description: string;
}

const blockTypes: BlockType[] = [
  // 텍스트 블록
  { id: 'paragraph', name: '단락', icon: Type, category: 'text', description: '텍스트를 작성하세요.' },
  { id: 'heading1', name: '제목 1', icon: Heading1, category: 'text', description: '큰 제목을 추가하세요.' },
  { id: 'heading2', name: '제목 2', icon: Heading2, category: 'text', description: '중간 제목을 추가하세요.' },
  { id: 'heading3', name: '제목 3', icon: Heading3, category: 'text', description: '작은 제목을 추가하세요.' },
  { id: 'list', name: '목록', icon: List, category: 'text', description: '항목 목록을 만드세요.' },
  { id: 'quote', name: '인용', icon: Quote, category: 'text', description: '인용문을 추가하세요.' },
  
  // 미디어 블록
  { id: 'image', name: '이미지', icon: Image, category: 'media', description: '이미지를 업로드하세요.' },
  { id: 'video', name: '비디오', icon: Video, category: 'media', description: '비디오를 임베드하세요.' },
  
  // 레이아웃 블록
  { id: 'columns', name: '컬럼', icon: Columns, category: 'layout', description: '다단 레이아웃을 만드세요.' },
  { id: 'table', name: '표', icon: Table, category: 'layout', description: '데이터 표를 추가하세요.' },
  
  // 개발 블록
  { id: 'code', name: '코드', icon: Code, category: 'dev', description: '코드 블록을 추가하세요.' },
];

const categories = {
  text: '텍스트',
  media: '미디어', 
  layout: '레이아웃',
  dev: '개발'
};

export function BlockInserter() {
  const [activeTab, setActiveTab] = useState<'blocks' | 'import'>('blocks');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  
  // Import functionality state
  const [showImportModal, setShowImportModal] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importSteps, setImportSteps] = useState<ImportStep[]>([]);
  const [importProgress, setImportProgress] = useState(0);
  const [importManager] = useState(() => new ImportManager({
    onStepUpdate: (step) => {
      setImportSteps(prev => prev.map(s => s.id === step.id ? step : s));
    },
    onProgressUpdate: (progress) => {
      setImportProgress(progress);
    },
    onComplete: (result) => {
      setIsImporting(false);
      // TODO: 에디터에 결과 삽입
      console.log('Import completed:', result);
    },
    onError: (error) => {
      setIsImporting(false);
      console.error('Import failed:', error);
    }
  }));

  const filteredBlocks = blockTypes.filter(block => {
    const matchesSearch = block.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || block.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const handleInsertBlock = (blockType: string) => {
    console.log(`블록 삽입: ${blockType}`);
    // TODO: Tiptap 에디터에 블록 삽입 로직 구현
  };

  const handleImportStart = (type: ImportType) => {
    setShowImportModal(true);
  };

  const handleImportConfirm = async (type: ImportType, content: string) => {
    setShowImportModal(false);
    setIsImporting(true);
    setImportSteps(importManager.getCurrentSteps());
    
    try {
      await importManager.importContent(type, content);
    } catch (error) {
      // Error는 이미 importManager에서 처리됨
    }
  };

  const handleImportCancel = () => {
    if (isImporting) {
      importManager.cancel();
      setIsImporting(false);
    }
    setImportSteps([]);
    setImportProgress(0);
  };

  return (
    <div className="p-4">
      {/* 헤더 */}
      <div className="mb-4">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">블록 추가</h2>
        
        {/* 탭 네비게이션 */}
        <div className="flex border-b border-gray-200 mb-4">
          <button
            onClick={() => setActiveTab('blocks')}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'blocks'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <Plus className="h-4 w-4 inline mr-2" />
            블록
          </button>
          <button
            onClick={() => setActiveTab('import')}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'import'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <Download className="h-4 w-4 inline mr-2" />
            가져오기
          </button>
        </div>
        
        {/* 검색 - 블록 탭에서만 표시 */}
        {activeTab === 'blocks' && (
          <SearchFilter
            value={searchTerm}
            onChange={setSearchTerm}
            placeholder="블록 검색..."
            className="mb-3"
          />
        )}
      </div>

      {/* 블록 탭 콘텐츠 */}
      {activeTab === 'blocks' && (
        <>
          {/* 카테고리 필터 */}
          <div className="mb-4">
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setSelectedCategory('all')}
                className={`px-3 py-1.5 text-xs font-medium rounded-full transition-colors ${
                  selectedCategory === 'all'
                    ? 'bg-blue-100 text-blue-800 border border-blue-200'
                    : 'bg-gray-100 text-gray-700 border border-gray-200 hover:bg-gray-200'
                }`}
              >
                전체
              </button>
              {Object.entries(categories).map(([key, label]) => (
                <button
                  key={key}
                  onClick={() => setSelectedCategory(key)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-full transition-colors ${
                    selectedCategory === key
                      ? 'bg-blue-100 text-blue-800 border border-blue-200'
                      : 'bg-gray-100 text-gray-700 border border-gray-200 hover:bg-gray-200'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* 블록 목록 */}
          <div className="space-y-2">
            {filteredBlocks.map((block) => (
              <button
                key={block.id}
                onClick={() => handleInsertBlock(block.id)}
                className="w-full p-3 text-left border border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 transition-colors group"
              >
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 w-8 h-8 bg-gray-100 rounded flex items-center justify-center group-hover:bg-blue-100 transition-colors">
                    <block.icon className="h-4 w-4 text-gray-600 group-hover:text-blue-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-gray-900 text-sm">{block.name}</div>
                    <div className="text-xs text-gray-500 mt-0.5">{block.description}</div>
                  </div>
                </div>
              </button>
            ))}
          </div>

          {filteredBlocks.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              <Plus className="h-8 w-8 mx-auto mb-2 text-gray-300" />
              <p className="text-sm">검색 결과가 없습니다.</p>
            </div>
          )}

          {/* 자주 사용하는 블록 섹션 */}
          <div className="mt-6 pt-4 border-t border-gray-200">
            <h3 className="text-sm font-medium text-gray-700 mb-3">자주 사용</h3>
            <div className="grid grid-cols-2 gap-2">
              {blockTypes.slice(0, 4).map((block) => (
                <button
                  key={`frequent-${block.id}`}
                  onClick={() => handleInsertBlock(block.id)}
                  className="p-2 border border-gray-200 rounded-md hover:border-blue-300 hover:bg-blue-50 transition-colors text-center"
                >
                  <block.icon className="h-4 w-4 mx-auto mb-1 text-gray-600" />
                  <div className="text-xs text-gray-700">{block.name}</div>
                </button>
              ))}
            </div>
          </div>
        </>
      )}

      {/* 가져오기 탭 콘텐츠 */}
      {activeTab === 'import' && (
        <div className="space-y-4">
          {/* 가져오기 진행 중일 때 */}
          {isImporting && importSteps.length > 0 && (
            <ImportBlock
              title="콘텐츠 가져오기"
              description="선택한 콘텐츠를 Tiptap 블록으로 변환하고 있습니다."
              steps={importSteps}
              progress={importProgress}
              onCancel={handleImportCancel}
            />
          )}

          {/* 가져오기 옵션들 (진행 중이 아닐 때만 표시) */}
          {!isImporting && (
            <>
              {/* WordPress 페이지 가져오기 */}
              <div 
                onClick={() => handleImportStart('wordpress')}
                className="border border-gray-200 rounded-lg p-4 hover:border-blue-300 hover:bg-blue-50 transition-colors cursor-pointer"
              >
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 w-8 h-8 bg-blue-100 rounded flex items-center justify-center">
                    <Globe className="h-4 w-4 text-blue-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-gray-900 text-sm">WordPress 페이지</div>
                    <div className="text-xs text-gray-500 mt-0.5">URL에서 WordPress 페이지를 가져와 블록으로 변환합니다.</div>
                  </div>
                </div>
              </div>

              {/* HTML 소스 가져오기 */}
              <div 
                onClick={() => handleImportStart('html')}
                className="border border-gray-200 rounded-lg p-4 hover:border-blue-300 hover:bg-blue-50 transition-colors cursor-pointer"
              >
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 w-8 h-8 bg-green-100 rounded flex items-center justify-center">
                    <Code className="h-4 w-4 text-green-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-gray-900 text-sm">HTML 소스</div>
                    <div className="text-xs text-gray-500 mt-0.5">HTML 코드를 붙여넣어 블록으로 변환합니다.</div>
                  </div>
                </div>
              </div>

              {/* 마크다운 가져오기 */}
              <div 
                onClick={() => handleImportStart('markdown')}
                className="border border-gray-200 rounded-lg p-4 hover:border-blue-300 hover:bg-blue-50 transition-colors cursor-pointer"
              >
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 w-8 h-8 bg-purple-100 rounded flex items-center justify-center">
                    <FileText className="h-4 w-4 text-purple-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-gray-900 text-sm">마크다운</div>
                    <div className="text-xs text-gray-500 mt-0.5">마크다운 텍스트를 블록으로 변환합니다.</div>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* 도움말 섹션 */}
          <div className="mt-6 pt-4 border-t border-gray-200">
            <h3 className="text-sm font-medium text-gray-700 mb-3">가져오기 도움말</h3>
            <div className="space-y-2 text-xs text-gray-500">
              <p>• WordPress 페이지: 공개된 페이지 URL만 지원됩니다.</p>
              <p>• HTML 소스: 표준 HTML 태그가 블록으로 변환됩니다.</p>
              <p>• 마크다운: GitHub 스타일 마크다운을 지원합니다.</p>
            </div>
          </div>
        </div>
      )}

      {/* Import Modal */}
      <ImportModal
        isOpen={showImportModal}
        onClose={() => setShowImportModal(false)}
        onImport={handleImportConfirm}
      />
    </div>
  );
}