// 📚 블록 라이브러리 (왼쪽 패널)

import React, { useState } from 'react';
import { 
  Type, 
  Heading, 
  Image as ImageIcon, 
  Table as TableIcon,
  List,
  ListOrdered,
  Quote,
  Minus,
  Container,
  Square,
  Grid3X3,
  Youtube,
  Code,
  Search,
  Columns,
  MousePointer,
  Space,
  Copy,
  Share,
  QrCode,
  Repeat,
  Layers,
  Database,
  FileText
} from 'lucide-react';

interface BlockLibraryProps {
  onInsertBlock: (blockType: string) => void;
}

interface BlockType {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  category: string;
}

export const BlockLibrary: React.FC<BlockLibraryProps> = ({ onInsertBlock }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');

  const blockTypes: BlockType[] = [
    // 텍스트 블록
    {
      id: 'paragraph',
      title: '단락',
      description: '일반 텍스트를 입력하세요',
      icon: <Type className="w-5 h-5" />,
      category: 'text'
    },
    {
      id: 'heading',
      title: '제목',
      description: '섹션 제목을 만드세요',
      icon: <Heading className="w-5 h-5" />,
      category: 'text'
    },
    {
      id: 'quote',
      title: '인용문',
      description: '인용문 블록을 추가하세요',
      icon: <Quote className="w-5 h-5" />,
      category: 'text'
    },
    {
      id: 'bullet-list',
      title: '목록',
      description: '불릿 포인트 목록',
      icon: <List className="w-5 h-5" />,
      category: 'text'
    },
    {
      id: 'ordered-list',
      title: '번호 목록',
      description: '번호가 있는 목록',
      icon: <ListOrdered className="w-5 h-5" />,
      category: 'text'
    },

    // 미디어 블록
    {
      id: 'image',
      title: '이미지',
      description: '이미지를 업로드하거나 삽입',
      icon: <ImageIcon className="w-5 h-5" />,
      category: 'media'
    },

    // 디자인 블록
    {
      id: 'divider',
      title: '구분선',
      description: '섹션을 나누는 선',
      icon: <Minus className="w-5 h-5" />,
      category: 'design'
    },
    {
      id: 'container',
      title: '컨테이너',
      description: '다른 블록을 그룹화',
      icon: <Container className="w-5 h-5" />,
      category: 'design'
    },
    {
      id: 'columns',
      title: '컬럼',
      description: '2개 이상의 컬럼 레이아웃',
      icon: <Columns className="w-5 h-5" />,
      category: 'design'
    },

    // 위젯 블록
    {
      id: 'table',
      title: '테이블',
      description: '표 형태의 데이터',
      icon: <TableIcon className="w-5 h-5" />,
      category: 'widgets'
    },
    {
      id: 'code',
      title: '코드',
      description: '코드 블록',
      icon: <Code className="w-5 h-5" />,
      category: 'widgets'
    },
    {
      id: 'button',
      title: '버튼',
      description: '클릭 가능한 버튼',
      icon: <MousePointer className="w-5 h-5" />,
      category: 'widgets'
    },
    {
      id: 'video',
      title: '동영상',
      description: 'YouTube 등 동영상',
      icon: <Youtube className="w-5 h-5" />,
      category: 'media'
    },
    {
      id: 'spacer',
      title: '스페이스',
      description: '빈 공간 추가',
      icon: <Space className="w-5 h-5" />,
      category: 'design'
    },
    {
      id: 'duplicate',
      title: '복사',
      description: '현재 블록 복사',
      icon: <Copy className="w-5 h-5" />,
      category: 'widgets'
    },

    // 고급 블록 (나중에 구현)
    {
      id: 'slide',
      title: '슬라이드',
      description: '이미지 슬라이드쇼',
      icon: <Layers className="w-5 h-5" />,
      category: 'media'
    },
    {
      id: 'share',
      title: '공유',
      description: 'SNS 공유 버튼',
      icon: <Share className="w-5 h-5" />,
      category: 'widgets'
    },
    {
      id: 'qrcode',
      title: 'QR코드',
      description: 'QR 코드 생성',
      icon: <QrCode className="w-5 h-5" />,
      category: 'widgets'
    },
    {
      id: 'query-loop',
      title: '쿼리반복',
      description: '동적 콘텐츠 반복',
      icon: <Repeat className="w-5 h-5" />,
      category: 'widgets'
    },

    // CPT 관련 블록들
    {
      id: 'cpt-list',
      title: 'CPT 목록',
      description: 'Custom Post 목록 표시',
      icon: <Database className="w-5 h-5" />,
      category: 'widgets'
    },
    {
      id: 'cpt-single',
      title: 'CPT 단일',
      description: '특정 Custom Post 표시',
      icon: <FileText className="w-5 h-5" />,
      category: 'widgets'
    }
  ];

  const categories = [
    { id: 'all', title: '전체', count: blockTypes.length },
    { id: 'text', title: '텍스트', count: blockTypes.filter(b => b.category === 'text').length },
    { id: 'media', title: '미디어', count: blockTypes.filter(b => b.category === 'media').length },
    { id: 'design', title: '디자인', count: blockTypes.filter(b => b.category === 'design').length },
    { id: 'widgets', title: '위젯', count: blockTypes.filter(b => b.category === 'widgets').length }
  ];

  const filteredBlocks = blockTypes.filter(block => {
    const matchesSearch = block.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         block.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || block.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="h-full flex flex-col">
      {/* 헤더 */}
      <div className="p-4 border-b">
        <h2 className="text-lg font-semibold text-gray-900 mb-3">📚 블록 라이브러리</h2>
        
        {/* 검색 */}
        <div className="relative mb-3">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <input
            type="text"
            placeholder="블록 검색..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* 카테고리 탭 */}
        <div className="flex flex-wrap gap-1">
          {categories.map(category => (
            <button
              key={category.id}
              onClick={() => setSelectedCategory(category.id)}
              className={`px-3 py-1.5 text-xs rounded-md transition-colors ${
                selectedCategory === category.id
                  ? 'bg-blue-100 text-blue-600 font-medium'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {category.title} ({category.count})
            </button>
          ))}
        </div>
      </div>

      {/* 블록 목록 */}
      <div className="flex-1 overflow-y-auto p-4">
        {filteredBlocks.length > 0 ? (
          <div className="grid grid-cols-2 gap-2">
            {filteredBlocks.map(block => (
              <button
                key={block.id}
                onClick={() => onInsertBlock(block.id)}
                className="p-3 text-left border border-gray-200 rounded-lg hover:bg-blue-50 hover:border-blue-200 transition-colors group"
              >
                <div className="flex flex-col items-center text-center gap-2">
                  <div className="p-2 bg-gray-100 rounded-md group-hover:bg-blue-100 transition-colors">
                    {block.icon}
                  </div>
                  <div>
                    <h3 className="font-medium text-gray-900 text-xs">
                      {block.title}
                    </h3>
                    <p className="text-xs text-gray-400 mt-0.5 leading-tight">
                      {block.description.length > 15 ? block.description.substring(0, 15) + '...' : block.description}
                    </p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center mx-auto mb-3">
              <Search className="w-6 h-6 text-gray-400" />
            </div>
            <p className="text-gray-500 text-sm">
              검색 결과가 없습니다
            </p>
          </div>
        )}
      </div>

      {/* 푸터 */}
      <div className="p-4 border-t bg-gray-50">
        <p className="text-xs text-gray-500 text-center">
          💡 <strong>팁:</strong> "/" 입력으로도 블록을 추가할 수 있어요
        </p>
      </div>
    </div>
  );
};

export default BlockLibrary;
