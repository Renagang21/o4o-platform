import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { JSONContent } from '@tiptap/react';
import {
  Layout,
  FileText,
  Image as ImageIcon,
  Video,
  Package,
  Plus,
  Save,
  Trash2,
  Eye,
  Copy,
  Search,
  Filter,
  Grid,
  List,
  Star,
  StarOff,
  Edit,
  Download,
  Upload,
  Calendar,
  User,
  Tag,
  X
} from 'lucide-react';

interface Template {
  id: string;
  name: string;
  description: string;
  category: 'page' | 'post' | 'product' | 'email' | 'landing' | 'blog';
  content: JSONContent;
  thumbnail?: string;
  isDefault: boolean;
  isFavorite: boolean;
  tags: string[];
  createdAt: string;
  createdBy: string;
  usageCount: number;
  lastUsed?: string;
}

interface TemplateManagerProps {
  isVisible: boolean;
  onClose: () => void;
  onSelectTemplate?: (template: Template) => void;
  currentContent?: JSONContent;
  onSaveAsTemplate?: (template: Partial<Template>) => void;
}

// 목업 템플릿 데이터
const mockTemplates: Template[] = [
  {
    id: '1',
    name: '기본 페이지 레이아웃',
    description: '제목, 부제목, 본문, 이미지가 포함된 기본적인 페이지 구조입니다.',
    category: 'page',
    content: {
      type: 'doc',
      content: [
        {
          type: 'heading',
          attrs: { level: 1 },
          content: [{ type: 'text', text: '페이지 제목' }]
        },
        {
          type: 'paragraph',
          content: [{ type: 'text', text: '페이지에 대한 간단한 설명을 작성하세요.' }]
        },
        {
          type: 'image',
          attrs: { src: 'https://via.placeholder.com/800x400', alt: '대표 이미지' }
        },
        {
          type: 'heading',
          attrs: { level: 2 },
          content: [{ type: 'text', text: '주요 내용' }]
        },
        {
          type: 'paragraph',
          content: [{ type: 'text', text: '여기에 주요 내용을 작성하세요.' }]
        }
      ]
    },
    thumbnail: 'https://via.placeholder.com/300x200',
    isDefault: true,
    isFavorite: false,
    tags: ['기본', '페이지', '레이아웃'],
    createdAt: '2025-01-01',
    createdBy: '시스템',
    usageCount: 45,
    lastUsed: '2025-01-15'
  },
  {
    id: '2',
    name: '블로그 포스트 템플릿',
    description: '블로그 글 작성에 최적화된 구조로 서론, 본론, 결론으로 구성되어 있습니다.',
    category: 'post',
    content: {
      type: 'doc',
      content: [
        {
          type: 'heading',
          attrs: { level: 1 },
          content: [{ type: 'text', text: '블로그 제목' }]
        },
        {
          type: 'paragraph',
          content: [{ type: 'text', text: '📝 이 글에서는 [주제]에 대해 알아보겠습니다.' }]
        },
        {
          type: 'heading',
          attrs: { level: 2 },
          content: [{ type: 'text', text: '🎯 핵심 요약' }]
        },
        {
          type: 'bulletList',
          content: [
            { type: 'listItem', content: [{ type: 'paragraph', content: [{ type: 'text', text: '핵심 포인트 1' }] }] },
            { type: 'listItem', content: [{ type: 'paragraph', content: [{ type: 'text', text: '핵심 포인트 2' }] }] },
            { type: 'listItem', content: [{ type: 'paragraph', content: [{ type: 'text', text: '핵심 포인트 3' }] }] }
          ]
        },
        {
          type: 'heading',
          attrs: { level: 2 },
          content: [{ type: 'text', text: '자세한 설명' }]
        },
        {
          type: 'paragraph',
          content: [{ type: 'text', text: '여기에 자세한 내용을 작성하세요.' }]
        },
        {
          type: 'heading',
          attrs: { level: 2 },
          content: [{ type: 'text', text: '결론' }]
        },
        {
          type: 'paragraph',
          content: [{ type: 'text', text: '마무리 내용을 작성하세요.' }]
        }
      ]
    },
    thumbnail: 'https://via.placeholder.com/300x200',
    isDefault: false,
    isFavorite: true,
    tags: ['블로그', '포스트', '글쓰기'],
    createdAt: '2025-01-02',
    createdBy: '마케팅팀',
    usageCount: 28,
    lastUsed: '2025-01-14'
  },
  {
    id: '3',
    name: '제품 소개 페이지',
    description: '제품의 특징, 장점, 사양 등을 체계적으로 소개하는 템플릿입니다.',
    category: 'product',
    content: {
      type: 'doc',
      content: [
        {
          type: 'heading',
          attrs: { level: 1 },
          content: [{ type: 'text', text: '제품명' }]
        },
        {
          type: 'paragraph',
          content: [{ type: 'text', text: '💡 혁신적인 [제품명]으로 새로운 경험을 만나보세요.' }]
        },
        {
          type: 'productBlock',
          attrs: {
            name: '샘플 제품',
            description: '제품에 대한 간단한 설명',
            imageUrl: 'https://via.placeholder.com/200x200',
            price: 99000
          }
        },
        {
          type: 'heading',
          attrs: { level: 2 },
          content: [{ type: 'text', text: '✨ 주요 특징' }]
        },
        {
          type: 'bulletList',
          content: [
            { type: 'listItem', content: [{ type: 'paragraph', content: [{ type: 'text', text: '특징 1' }] }] },
            { type: 'listItem', content: [{ type: 'paragraph', content: [{ type: 'text', text: '특징 2' }] }] },
            { type: 'listItem', content: [{ type: 'paragraph', content: [{ type: 'text', text: '특징 3' }] }] }
          ]
        },
        {
          type: 'heading',
          attrs: { level: 2 },
          content: [{ type: 'text', text: '📋 제품 사양' }]
        },
        {
          type: 'paragraph',
          content: [{ type: 'text', text: '제품의 상세 사양을 작성하세요.' }]
        }
      ]
    },
    thumbnail: 'https://via.placeholder.com/300x200',
    isDefault: false,
    isFavorite: false,
    tags: ['제품', '소개', 'e-commerce'],
    createdAt: '2025-01-03',
    createdBy: '상품팀',
    usageCount: 15,
    lastUsed: '2025-01-10'
  },
  {
    id: '4',
    name: '랜딩 페이지',
    description: '전환율 최적화를 위한 랜딩 페이지 구조입니다.',
    category: 'landing',
    content: {
      type: 'doc',
      content: [
        {
          type: 'heading',
          attrs: { level: 1 },
          content: [{ type: 'text', text: '🚀 강력한 헤드라인' }]
        },
        {
          type: 'paragraph',
          content: [{ type: 'text', text: '고객의 문제를 해결하는 명확한 가치 제안을 작성하세요.' }]
        },
        {
          type: 'heading',
          attrs: { level: 2 },
          content: [{ type: 'text', text: '🎯 핵심 혜택' }]
        },
        {
          type: 'bulletList',
          content: [
            { type: 'listItem', content: [{ type: 'paragraph', content: [{ type: 'text', text: '✅ 혜택 1' }] }] },
            { type: 'listItem', content: [{ type: 'paragraph', content: [{ type: 'text', text: '✅ 혜택 2' }] }] },
            { type: 'listItem', content: [{ type: 'paragraph', content: [{ type: 'text', text: '✅ 혜택 3' }] }] }
          ]
        },
        {
          type: 'heading',
          attrs: { level: 2 },
          content: [{ type: 'text', text: '💬 고객 후기' }]
        },
        {
          type: 'blockquote',
          content: [
            {
              type: 'paragraph',
              content: [{ type: 'text', text: '"정말 만족스러운 제품입니다!" - 고객명' }]
            }
          ]
        },
        {
          type: 'heading',
          attrs: { level: 2 },
          content: [{ type: 'text', text: '📞 지금 시작하세요!' }]
        },
        {
          type: 'paragraph',
          content: [{ type: 'text', text: '👇 아래 버튼을 클릭하여 지금 바로 시작하세요!' }]
        }
      ]
    },
    thumbnail: 'https://via.placeholder.com/300x200',
    isDefault: false,
    isFavorite: true,
    tags: ['랜딩', '마케팅', '전환율'],
    createdAt: '2025-01-04',
    createdBy: '마케팅팀',
    usageCount: 22,
    lastUsed: '2025-01-13'
  }
];

const TemplateManager: React.FC<TemplateManagerProps> = ({
  isVisible,
  onClose,
  onSelectTemplate,
  currentContent,
  onSaveAsTemplate
}) => {
  const [templates, setTemplates] = useState<Template[]>(mockTemplates);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [newTemplate, setNewTemplate] = useState<Partial<Template>>({
    name: '',
    description: '',
    category: 'page',
    tags: []
  });
  const [tagInput, setTagInput] = useState('');

  // 필터링된 템플릿
  const filteredTemplates = templates.filter(template => {
    const matchesSearch = template.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         template.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         template.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesCategory = filterCategory === 'all' || template.category === filterCategory;
    
    return matchesSearch && matchesCategory;
  });

  // 템플릿 선택
  const handleSelectTemplate = (template: Template) => {
    // 사용 횟수 증가
    setTemplates(prev => prev.map(t => 
      t.id === template.id 
        ? { ...t, usageCount: t.usageCount + 1, lastUsed: new Date().toISOString().split('T')[0] }
        : t
    ));
    
    onSelectTemplate?.(template);
    onClose();
  };

  // 즐겨찾기 토글
  const toggleFavorite = (templateId: string) => {
    setTemplates(prev => prev.map(t => 
      t.id === templateId ? { ...t, isFavorite: !t.isFavorite } : t
    ));
  };

  // 템플릿 삭제
  const handleDeleteTemplate = (templateId: string) => {
    if (confirm('정말 이 템플릿을 삭제하시겠습니까?')) {
      setTemplates(prev => prev.filter(t => t.id !== templateId));
    }
  };

  // 새 템플릿으로 저장
  const handleSaveAsNewTemplate = () => {
    if (!currentContent) return;
    
    setNewTemplate({
      name: '',
      description: '',
      category: 'page',
      tags: []
    });
    setShowSaveModal(true);
  };

  // 템플릿 저장 완료
  const handleSaveTemplate = () => {
    if (!newTemplate.name || !currentContent) return;

    const template: Template = {
      id: Date.now().toString(),
      name: newTemplate.name,
      description: newTemplate.description || '',
      category: newTemplate.category || 'page',
      content: currentContent,
      isDefault: false,
      isFavorite: false,
      tags: newTemplate.tags || [],
      createdAt: new Date().toISOString().split('T')[0],
      createdBy: '현재 사용자',
      usageCount: 0
    };

    setTemplates(prev => [...prev, template]);
    onSaveAsTemplate?.(template);
    setShowSaveModal(false);
    setNewTemplate({ name: '', description: '', category: 'page', tags: [] });
  };

  // 태그 추가
  const addTag = () => {
    if (tagInput.trim() && !newTemplate.tags?.includes(tagInput.trim())) {
      setNewTemplate(prev => ({
        ...prev,
        tags: [...(prev.tags || []), tagInput.trim()]
      }));
      setTagInput('');
    }
  };

  // 태그 제거
  const removeTag = (tagToRemove: string) => {
    setNewTemplate(prev => ({
      ...prev,
      tags: (prev.tags || []).filter(tag => tag !== tagToRemove)
    }));
  };

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg max-w-6xl w-full max-h-90vh m-4 overflow-hidden">
        {/* 헤더 */}
        <div className="border-b p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">템플릿 라이브러리</h2>
              <p className="text-gray-600">미리 만들어진 템플릿을 사용하여 빠르게 컨텐츠를 작성하세요.</p>
            </div>
            <div className="flex items-center gap-2">
              {currentContent && (
                <button
                  onClick={handleSaveAsNewTemplate}
                  className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                >
                  <Save className="w-4 h-4" />
                  템플릿으로 저장
                </button>
              )}
              <button
                onClick={onClose}
                className="p-2 text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>

        {/* 검색 및 필터 */}
        <div className="border-b p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="템플릿 검색..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            
            <div className="flex gap-2">
              <select
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="all">모든 카테고리</option>
                <option value="page">페이지</option>
                <option value="post">포스트</option>
                <option value="product">제품</option>
                <option value="landing">랜딩페이지</option>
                <option value="email">이메일</option>
                <option value="blog">블로그</option>
              </select>
              
              <div className="flex border border-gray-300 rounded-lg overflow-hidden">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`p-2 ${viewMode === 'grid' ? 'bg-blue-500 text-white' : 'bg-white text-gray-700 hover:bg-gray-50'}`}
                >
                  <Grid className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`p-2 ${viewMode === 'list' ? 'bg-blue-500 text-white' : 'bg-white text-gray-700 hover:bg-gray-50'}`}
                >
                  <List className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* 템플릿 목록 */}
        <div className="p-4 overflow-y-auto max-h-96">
          {viewMode === 'grid' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredTemplates.map((template) => (
                <motion.div
                  key={template.id}
                  className="bg-white border border-gray-200 rounded-lg overflow-hidden hover:shadow-lg transition-shadow cursor-pointer"
                  whileHover={{ scale: 1.02 }}
                  onClick={() => handleSelectTemplate(template)}
                >
                  {/* 썸네일 */}
                  <div className="h-32 bg-gray-100 flex items-center justify-center">
                    {template.thumbnail ? (
                      <img
                        src={template.thumbnail}
                        alt={template.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <Layout className="w-12 h-12 text-gray-400" />
                    )}
                  </div>

                  {/* 정보 */}
                  <div className="p-4">
                    <div className="flex items-start justify-between mb-2">
                      <h3 className="font-semibold text-gray-900 truncate">{template.name}</h3>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleFavorite(template.id);
                          }}
                          className="text-gray-400 hover:text-yellow-500"
                        >
                          {template.isFavorite ? (
                            <Star className="w-4 h-4 fill-current text-yellow-500" />
                          ) : (
                            <StarOff className="w-4 h-4" />
                          )}
                        </button>
                        {!template.isDefault && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteTemplate(template.id);
                            }}
                            className="text-gray-400 hover:text-red-500"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                    
                    <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                      {template.description}
                    </p>
                    
                    <div className="flex items-center justify-between text-xs text-gray-500">
                      <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full">
                        {template.category}
                      </span>
                      <span>{template.usageCount}회 사용</span>
                    </div>

                    {template.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {template.tags.slice(0, 3).map((tag, index) => (
                          <span
                            key={index}
                            className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded"
                          >
                            #{tag}
                          </span>
                        ))}
                        {template.tags.length > 3 && (
                          <span className="text-xs text-gray-400">+{template.tags.length - 3}</span>
                        )}
                      </div>
                    )}
                  </div>
                </motion.div>
              ))}
            </div>
          ) : (
            <div className="space-y-2">
              {filteredTemplates.map((template) => (
                <div
                  key={template.id}
                  className="flex items-center gap-4 p-4 bg-white border border-gray-200 rounded-lg hover:shadow-md transition-shadow cursor-pointer"
                  onClick={() => handleSelectTemplate(template)}
                >
                  <div className="w-16 h-16 bg-gray-100 rounded flex items-center justify-center flex-shrink-0">
                    {template.thumbnail ? (
                      <img
                        src={template.thumbnail}
                        alt={template.name}
                        className="w-full h-full object-cover rounded"
                      />
                    ) : (
                      <Layout className="w-6 h-6 text-gray-400" />
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold text-gray-900 truncate">{template.name}</h3>
                      <span className="px-2 py-0.5 bg-blue-100 text-blue-800 text-xs rounded-full">
                        {template.category}
                      </span>
                      {template.isFavorite && (
                        <Star className="w-4 h-4 fill-current text-yellow-500" />
                      )}
                    </div>
                    <p className="text-sm text-gray-600 truncate">{template.description}</p>
                    <div className="flex items-center gap-4 text-xs text-gray-500 mt-1">
                      <span>{template.usageCount}회 사용</span>
                      <span>by {template.createdBy}</span>
                      {template.lastUsed && <span>최근 사용: {template.lastUsed}</span>}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleFavorite(template.id);
                      }}
                      className="p-1 text-gray-400 hover:text-yellow-500"
                    >
                      {template.isFavorite ? (
                        <Star className="w-4 h-4 fill-current text-yellow-500" />
                      ) : (
                        <StarOff className="w-4 h-4" />
                      )}
                    </button>
                    {!template.isDefault && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteTemplate(template.id);
                        }}
                        className="p-1 text-gray-400 hover:text-red-500"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {filteredTemplates.length === 0 && (
            <div className="text-center py-12">
              <Layout className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">템플릿이 없습니다</h3>
              <p className="text-gray-500">
                {searchTerm || filterCategory !== 'all' 
                  ? '검색 조건에 맞는 템플릿이 없습니다.' 
                  : '첫 번째 템플릿을 만들어보세요.'
                }
              </p>
            </div>
          )}
        </div>

        {/* 푸터 */}
        <div className="border-t p-4 bg-gray-50">
          <div className="flex items-center justify-between text-sm text-gray-600">
            <span>{filteredTemplates.length}개의 템플릿</span>
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600"
            >
              닫기
            </button>
          </div>
        </div>
      </div>

      {/* 템플릿 저장 모달 */}
      {showSaveModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-60">
          <div className="bg-white rounded-lg p-6 w-96 max-w-90vw">
            <h3 className="text-lg font-semibold mb-4">새 템플릿으로 저장</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  템플릿 이름
                </label>
                <input
                  type="text"
                  value={newTemplate.name}
                  onChange={(e) => setNewTemplate(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="템플릿 이름을 입력하세요"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  설명
                </label>
                <textarea
                  value={newTemplate.description}
                  onChange={(e) => setNewTemplate(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="템플릿에 대한 설명을 입력하세요"
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  카테고리
                </label>
                <select
                  value={newTemplate.category}
                  onChange={(e) => setNewTemplate(prev => ({ ...prev, category: e.target.value as any }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="page">페이지</option>
                  <option value="post">포스트</option>
                  <option value="product">제품</option>
                  <option value="landing">랜딩페이지</option>
                  <option value="email">이메일</option>
                  <option value="blog">블로그</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  태그
                </label>
                <div className="flex gap-2 mb-2">
                  <input
                    type="text"
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && addTag()}
                    placeholder="태그를 입력하고 Enter를 누르세요"
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                  <button
                    onClick={addTag}
                    className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    추가
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {(newTemplate.tags || []).map((tag, index) => (
                    <span
                      key={index}
                      className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-800 text-sm rounded-full"
                    >
                      #{tag}
                      <button
                        onClick={() => removeTag(tag)}
                        className="text-blue-600 hover:text-blue-800"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex gap-2 mt-6">
              <button
                onClick={handleSaveTemplate}
                disabled={!newTemplate.name}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                저장
              </button>
              <button
                onClick={() => setShowSaveModal(false)}
                className="flex-1 px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600"
              >
                취소
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TemplateManager;