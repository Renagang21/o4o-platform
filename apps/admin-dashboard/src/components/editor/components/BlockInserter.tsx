import { FC, useState } from 'react';
import { 
  X, 
  Search,
  Type,
  Heading1,
  Image,
  List,
  Square,
  Quote,
  Code,
  Columns,
  Grid,
  Video,
  Music
} from 'lucide-react';
import type { ThemeConfig } from '../types';

interface BlockInserterProps {
  theme: ThemeConfig | null;
  onInsert: (blockType: string) => void;
  onClose: () => void;
}

// 블록 타입 정의
const blockTypes = [
  { 
    id: 'paragraph', 
    title: '단락', 
    icon: Type, 
    category: 'text',
    description: '텍스트 단락을 추가합니다'
  },
  { 
    id: 'heading', 
    title: '제목', 
    icon: Heading1, 
    category: 'text',
    description: '제목을 추가합니다'
  },
  { 
    id: 'list', 
    title: '목록', 
    icon: List, 
    category: 'text',
    description: '순서 있는/없는 목록을 만듭니다'
  },
  { 
    id: 'quote', 
    title: '인용', 
    icon: Quote, 
    category: 'text',
    description: '인용문을 추가합니다'
  },
  { 
    id: 'code', 
    title: '코드', 
    icon: Code, 
    category: 'text',
    description: '코드 블록을 추가합니다'
  },
  { 
    id: 'image', 
    title: '이미지', 
    icon: Image, 
    category: 'media',
    description: '이미지를 업로드하거나 선택합니다'
  },
  { 
    id: 'video', 
    title: '비디오', 
    icon: Video, 
    category: 'media',
    description: '비디오를 삽입합니다'
  },
  { 
    id: 'audio', 
    title: '오디오', 
    icon: Music, 
    category: 'media',
    description: '오디오 파일을 추가합니다'
  },
  { 
    id: 'button', 
    title: '버튼', 
    icon: Square, 
    category: 'design',
    description: '버튼을 추가합니다'
  },
  { 
    id: 'columns', 
    title: '컬럼', 
    icon: Columns, 
    category: 'design',
    description: '여러 컬럼 레이아웃을 만듭니다'
  },
  { 
    id: 'spacer', 
    title: '여백', 
    icon: Grid, 
    category: 'design',
    description: '블록 사이에 여백을 추가합니다'
  }
];

const categories = [
  { id: 'text', title: '텍스트', color: 'blue' },
  { id: 'media', title: '미디어', color: 'green' },
  { id: 'design', title: '디자인', color: 'purple' }
];

export const BlockInserter: FC<BlockInserterProps> = ({
  theme,
  onInsert,
  onClose
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  // 테마에서 허용된 블록만 필터링
  const allowedBlocks = theme?.blocks?.allowedBlocks || blockTypes.map(b => b.id);
  const availableBlocks = blockTypes.filter(block => allowedBlocks.includes(block.id));

  // 검색 및 카테고리 필터링
  const filteredBlocks = availableBlocks.filter(block => {
    const matchesSearch = block.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          block.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = !selectedCategory || block.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  // 카테고리별 그룹화
  const groupedBlocks = categories.map(category => ({
    ...category,
    blocks: filteredBlocks.filter(block => block.category === category.id)
  })).filter(category => category.blocks.length > 0);

  return (
    <div className="block-inserter w-80 bg-white border-r border-gray-200 flex flex-col h-full">
      {/* 헤더 */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-medium">블록 추가</h3>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* 검색 */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="블록 검색..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            autoFocus
          />
        </div>

        {/* 카테고리 필터 */}
        <div className="flex gap-2 mt-3">
          <button
            onClick={() => setSelectedCategory(null)}
            className={`px-3 py-1 text-xs rounded-full transition-colors ${
              !selectedCategory 
                ? 'bg-blue-100 text-blue-700' 
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            전체
          </button>
          {categories.map(category => (
            <button
              key={category.id}
              onClick={() => setSelectedCategory(category.id)}
              className={`px-3 py-1 text-xs rounded-full transition-colors ${
                selectedCategory === category.id
                  ? `bg-${category.color}-100 text-${category.color}-700`
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {category.title}
            </button>
          ))}
        </div>
      </div>

      {/* 블록 목록 */}
      <div className="flex-1 overflow-y-auto p-4">
        {filteredBlocks.length === 0 ? (
          <p className="text-center text-gray-500 text-sm py-8">
            검색 결과가 없습니다
          </p>
        ) : (
          <div className="space-y-4">
            {groupedBlocks.map(category => (
              <div key={category.id}>
                <h4 className="text-xs font-medium text-gray-500 uppercase mb-2">
                  {category.title}
                </h4>
                <div className="grid grid-cols-2 gap-2">
                  {category.blocks.map(block => {
                    const Icon = block.icon;
                    return (
                      <button
                        key={block.id}
                        onClick={() => onInsert(block.id)}
                        className="p-3 border border-gray-200 rounded-lg hover:border-blue-400 hover:bg-blue-50 transition-all group text-left"
                      >
                        <Icon className="w-5 h-5 text-gray-600 group-hover:text-blue-600 mb-2" />
                        <div className="text-sm font-medium text-gray-900 group-hover:text-blue-900">
                          {block.title}
                        </div>
                        <div className="text-xs text-gray-500 mt-1 line-clamp-2">
                          {block.description}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 최근 사용 블록 (선택사항) */}
      <div className="p-4 border-t border-gray-200">
        <h4 className="text-xs font-medium text-gray-500 uppercase mb-2">최근 사용</h4>
        <div className="flex gap-2">
          {['paragraph', 'heading', 'image'].map(blockId => {
            const block = blockTypes.find(b => b.id === blockId);
            if (!block) return null;
            const Icon = block.icon;
            return (
              <button
                key={blockId}
                onClick={() => onInsert(blockId)}
                className="p-2 border border-gray-200 rounded hover:border-blue-400 hover:bg-blue-50 transition-all"
                title={block.title}
              >
                <Icon className="w-4 h-4 text-gray-600" />
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};