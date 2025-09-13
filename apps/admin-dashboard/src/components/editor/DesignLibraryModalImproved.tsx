/**
 * DesignLibraryModal Component - Improved Version
 * Modern and professional template gallery with enhanced UI/UX
 */

import React, { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { 
  X, 
  Eye, 
  ChevronLeft, 
  Sparkles, 
  Layout, 
  FileText, 
  Briefcase, 
  PenTool,
  Grid3x3,
  Star,
  TrendingUp,
  Clock,
  Check,
  Search
} from 'lucide-react';
import { Block } from '@/types/post.types';

interface TemplateCategory {
  id: string;
  name: string;
  icon: React.ReactNode;
  description: string;
  color: string;
  templates: Template[];
}

interface Template {
  id: string;
  name: string;
  category: string;
  thumbnail: string;
  description: string;
  blocks: Block[];
  tags: string[];
  isPremium?: boolean;
  isNew?: boolean;
  popularity?: number;
  estimatedTime?: string;
}

interface DesignLibraryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApplyTemplate: (blocks: Block[]) => void;
}

const templateCategories: TemplateCategory[] = [
  {
    id: 'basic',
    name: '기본 템플릿',
    icon: <Layout className="w-4 h-4" />,
    description: '간단하고 깔끔한 기본 레이아웃',
    color: 'from-blue-500 to-blue-600',
    templates: [
      {
        id: 'simple-article',
        name: '간단한 글',
        category: 'basic',
        thumbnail: '/templates/simple-article.png',
        description: '기본적인 텍스트 위주의 글 템플릿',
        tags: ['텍스트', '간단함', '기본'],
        estimatedTime: '5분',
        popularity: 4.5,
        blocks: [
          {
            id: 'block-1',
            type: 'core/paragraph',
            content: { text: '여기에 글의 도입부를 작성하세요. 독자의 관심을 끌 수 있는 내용으로 시작하는 것이 좋습니다.' },
            attributes: { align: 'left' },
          },
          {
            id: 'block-2',
            type: 'core/heading',
            content: { text: '주요 내용', level: 2 },
            attributes: { level: 2 },
          },
          {
            id: 'block-3',
            type: 'core/paragraph',
            content: { text: '본문의 핵심 내용을 여기에 작성하세요. 구체적인 정보와 예시를 포함하면 더욱 효과적입니다.' },
            attributes: { align: 'left' },
          },
        ],
      },
      {
        id: 'newsletter',
        name: '뉴스레터',
        category: 'basic',
        thumbnail: '/templates/newsletter.png',
        description: '이메일 뉴스레터를 위한 깔끔한 템플릿',
        tags: ['이메일', '뉴스레터', '구독'],
        isNew: true,
        estimatedTime: '10분',
        popularity: 4.8,
        blocks: [
          {
            id: 'block-1',
            type: 'core/heading',
            content: { text: '이번 주 주요 소식', level: 1 },
            attributes: { level: 1, align: 'center' },
          },
          {
            id: 'block-2',
            type: 'core/paragraph',
            content: { text: '구독자 여러분, 안녕하세요! 이번 주 가장 중요한 소식을 모아서 전해드립니다.' },
            attributes: { align: 'center' },
          },
        ],
      },
    ],
  },
  {
    id: 'landing',
    name: '랜딩 페이지',
    icon: <TrendingUp className="w-4 h-4" />,
    description: '전환율 높은 랜딩 페이지 템플릿',
    color: 'from-purple-500 to-pink-500',
    templates: [
      {
        id: 'hero-landing',
        name: '히어로 섹션',
        category: 'landing',
        thumbnail: '/templates/hero-landing.png',
        description: '강력한 첫인상을 위한 히어로 섹션 템플릿',
        tags: ['히어로', '랜딩', '마케팅'],
        isPremium: true,
        estimatedTime: '15분',
        popularity: 4.9,
        blocks: [
          {
            id: 'block-1',
            type: 'core/heading',
            content: { text: '당신의 비즈니스를 성공으로 이끌어드립니다', level: 1 },
            attributes: { level: 1, align: 'center' },
          },
          {
            id: 'block-2',
            type: 'core/paragraph',
            content: { text: '전문적인 솔루션으로 더 나은 결과를 만들어보세요. 지금 바로 시작하세요!' },
            attributes: { align: 'center' },
          },
          {
            id: 'block-3',
            type: 'core/button',
            content: { text: '무료로 시작하기' },
            attributes: { align: 'center' },
          },
        ],
      },
    ],
  },
  {
    id: 'service',
    name: '서비스 소개',
    icon: <Briefcase className="w-4 h-4" />,
    description: '서비스와 제품을 효과적으로 소개',
    color: 'from-green-500 to-teal-500',
    templates: [
      {
        id: 'service-overview',
        name: '서비스 개요',
        category: 'service',
        thumbnail: '/templates/service-overview.png',
        description: '서비스나 제품을 소개하는 구조화된 템플릿',
        tags: ['서비스', '제품', '소개'],
        estimatedTime: '20분',
        popularity: 4.7,
        blocks: [
          {
            id: 'block-1',
            type: 'core/heading',
            content: { text: '우리의 서비스', level: 1 },
            attributes: { level: 1, align: 'center' },
          },
          {
            id: 'block-2',
            type: 'core/paragraph',
            content: { text: '고객의 니즈에 맞춘 전문적인 서비스를 제공합니다.' },
            attributes: { align: 'center' },
          },
        ],
      },
    ],
  },
  {
    id: 'portfolio',
    name: '포트폴리오',
    icon: <Grid3x3 className="w-4 h-4" />,
    description: '작품과 프로젝트를 돋보이게 전시',
    color: 'from-orange-500 to-red-500',
    templates: [
      {
        id: 'project-showcase',
        name: '프로젝트 쇼케이스',
        category: 'portfolio',
        thumbnail: '/templates/project-showcase.png',
        description: '작업물이나 프로젝트를 효과적으로 보여주는 템플릿',
        tags: ['포트폴리오', '프로젝트', '쇼케이스'],
        isNew: true,
        estimatedTime: '25분',
        popularity: 4.6,
        blocks: [
          {
            id: 'block-1',
            type: 'core/heading',
            content: { text: '프로젝트 소개', level: 1 },
            attributes: { level: 1, align: 'center' },
          },
        ],
      },
    ],
  },
  {
    id: 'blog',
    name: '블로그',
    icon: <PenTool className="w-4 h-4" />,
    description: '매력적인 블로그 포스트 레이아웃',
    color: 'from-indigo-500 to-blue-500',
    templates: [
      {
        id: 'blog-post',
        name: '블로그 포스트',
        category: 'blog',
        thumbnail: '/templates/blog-post.png',
        description: '읽기 좋은 블로그 글을 위한 구조화된 템플릿',
        tags: ['블로그', '글쓰기', '구조'],
        estimatedTime: '30분',
        popularity: 4.8,
        blocks: [
          {
            id: 'block-1',
            type: 'core/paragraph',
            content: { text: '오늘은 여러분과 함께 흥미로운 주제에 대해 이야기해보려고 합니다.' },
            attributes: { align: 'left' },
          },
        ],
      },
    ],
  },
];

export const DesignLibraryModal: React.FC<DesignLibraryModalProps> = ({
  isOpen,
  onClose,
  onApplyTemplate,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('basic');
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const [previewMode, setPreviewMode] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showOnlyNew, setShowOnlyNew] = useState(false);
  const [showOnlyPremium, setShowOnlyPremium] = useState(false);

  const currentCategory = templateCategories.find(cat => cat.id === selectedCategory);
  
  // Filter templates based on search and filters
  const filteredTemplates = useMemo(() => {
    let templates = currentCategory?.templates || [];
    
    if (searchQuery) {
      templates = templates.filter(t => 
        t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()))
      );
    }
    
    if (showOnlyNew) {
      templates = templates.filter(t => t.isNew);
    }
    
    if (showOnlyPremium) {
      templates = templates.filter(t => t.isPremium);
    }
    
    return templates;
  }, [currentCategory, searchQuery, showOnlyNew, showOnlyPremium]);

  const handleApplyTemplate = (template: Template) => {
    const blocksWithNewIds = template.blocks.map(block => ({
      ...block,
      id: `block-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    }));
    
    onApplyTemplate(blocksWithNewIds);
    onClose();
  };

  const handlePreview = (template: Template) => {
    setSelectedTemplate(template);
    setPreviewMode(true);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-7xl h-[90vh] p-0 overflow-hidden">
        <div className="flex h-full bg-white">
          {/* Enhanced Sidebar */}
          <div className="w-72 bg-gradient-to-b from-gray-50 to-white border-r flex flex-col">
            <DialogHeader className="p-6 border-b bg-white">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl">
                  <Sparkles className="w-5 h-5 text-white" />
                </div>
                <div>
                  <DialogTitle className="text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                    디자인 라이브러리
                  </DialogTitle>
                  <p className="text-xs text-gray-500 mt-0.5">프로페셔널 템플릿 컬렉션</p>
                </div>
              </div>
            </DialogHeader>
            
            <div className="flex-1 overflow-y-auto">
              {/* Search Bar */}
              <div className="p-4 border-b bg-white/50">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="템플릿 검색..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>

              {/* Quick Filters */}
              <div className="p-4 space-y-2 border-b">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={showOnlyNew}
                    onChange={(e) => setShowOnlyNew(e.target.checked)}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-600">새로운 템플릿만</span>
                  <Badge className="bg-green-100 text-green-700 text-xs">NEW</Badge>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={showOnlyPremium}
                    onChange={(e) => setShowOnlyPremium(e.target.checked)}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-600">프리미엄</span>
                  <Badge className="bg-gradient-to-r from-yellow-400 to-orange-400 text-white text-xs">
                    PRO
                  </Badge>
                </label>
              </div>

              {/* Categories */}
              <div className="p-4">
                <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
                  카테고리
                </h3>
                <nav className="space-y-1">
                  {templateCategories.map((category) => (
                    <button
                      key={category.id}
                      onClick={() => {
                        setSelectedCategory(category.id);
                        setPreviewMode(false);
                        setSearchQuery('');
                      }}
                      className={cn(
                        'w-full text-left px-4 py-3 rounded-xl transition-all duration-200 group',
                        selectedCategory === category.id
                          ? 'bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 shadow-sm'
                          : 'hover:bg-gray-50'
                      )}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className={cn(
                            'p-2 rounded-lg bg-gradient-to-br',
                            selectedCategory === category.id 
                              ? category.color
                              : 'from-gray-200 to-gray-300 group-hover:' + category.color,
                            'transition-all duration-200'
                          )}>
                            <div className={cn(
                              selectedCategory === category.id ? 'text-white' : 'text-gray-600 group-hover:text-white'
                            )}>
                              {category.icon}
                            </div>
                          </div>
                          <div>
                            <div className={cn(
                              'font-medium text-sm',
                              selectedCategory === category.id 
                                ? 'text-gray-900' 
                                : 'text-gray-700'
                            )}>
                              {category.name}
                            </div>
                            <div className="text-xs text-gray-500 mt-0.5">
                              {category.templates.length}개 템플릿
                            </div>
                          </div>
                        </div>
                      </div>
                    </button>
                  ))}
                </nav>
              </div>
            </div>

            {/* Sidebar Footer */}
            <div className="p-4 border-t bg-gradient-to-r from-blue-50 to-purple-50">
              <div className="text-xs text-gray-600">
                <div className="flex items-center gap-2 mb-1">
                  <Star className="w-3 h-3 text-yellow-500" />
                  <span className="font-medium">팁:</span>
                </div>
                <p>템플릿을 선택한 후 자유롭게 수정할 수 있습니다.</p>
              </div>
            </div>
          </div>

          {/* Main Content Area */}
          <div className="flex-1 flex flex-col bg-gray-50">
            {!previewMode ? (
              <>
                {/* Enhanced Header */}
                <div className="bg-white border-b shadow-sm">
                  <div className="px-8 py-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="flex items-center gap-3 mb-2">
                          <div className={cn(
                            'p-2 rounded-lg bg-gradient-to-br',
                            currentCategory?.color
                          )}>
                            <div className="text-white">
                              {currentCategory?.icon}
                            </div>
                          </div>
                          <h2 className="text-2xl font-bold text-gray-900">
                            {currentCategory?.name}
                          </h2>
                        </div>
                        <p className="text-gray-600">
                          {currentCategory?.description}
                        </p>
                      </div>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        onClick={onClose}
                        className="hover:bg-gray-100 rounded-full"
                      >
                        <X className="h-5 w-5" />
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Enhanced Templates Grid */}
                <div className="flex-1 overflow-y-auto px-8 py-6">
                  {filteredTemplates.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-center">
                      <div className="p-4 bg-gray-100 rounded-full mb-4">
                        <Search className="w-8 h-8 text-gray-400" />
                      </div>
                      <h3 className="text-lg font-medium text-gray-900 mb-2">
                        템플릿을 찾을 수 없습니다
                      </h3>
                      <p className="text-gray-500 max-w-sm">
                        다른 검색어를 시도하거나 필터를 변경해보세요.
                      </p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {filteredTemplates.map((template) => (
                        <div
                          key={template.id}
                          className="group bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1"
                        >
                          {/* Enhanced Thumbnail */}
                          <div className="aspect-[4/3] bg-gradient-to-br from-gray-100 to-gray-50 relative overflow-hidden">
                            {/* Template Preview Placeholder */}
                            <div className="absolute inset-0 p-6">
                              <div className="h-full w-full bg-white rounded-lg shadow-inner p-4 flex flex-col items-center justify-center">
                                <FileText className="w-12 h-12 text-gray-300 mb-3" />
                                <div className="w-full space-y-2">
                                  <div className="h-2 bg-gray-200 rounded w-3/4 mx-auto"></div>
                                  <div className="h-2 bg-gray-200 rounded w-full"></div>
                                  <div className="h-2 bg-gray-200 rounded w-5/6 mx-auto"></div>
                                </div>
                              </div>
                            </div>

                            {/* Badges */}
                            <div className="absolute top-4 left-4 flex gap-2">
                              {template.isNew && (
                                <Badge className="bg-green-500 text-white border-0 shadow-lg">
                                  NEW
                                </Badge>
                              )}
                              {template.isPremium && (
                                <Badge className="bg-gradient-to-r from-yellow-400 to-orange-400 text-white border-0 shadow-lg">
                                  PRO
                                </Badge>
                              )}
                            </div>
                            
                            {/* Enhanced Hover Actions */}
                            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-all duration-300 flex items-end justify-center pb-6">
                              <div className="flex gap-3">
                                <Button
                                  size="sm"
                                  variant="secondary"
                                  onClick={() => handlePreview(template)}
                                  className="bg-white/95 backdrop-blur text-gray-900 hover:bg-white shadow-lg"
                                >
                                  <Eye className="h-4 w-4 mr-2" />
                                  미리보기
                                </Button>
                                <Button
                                  size="sm"
                                  onClick={() => handleApplyTemplate(template)}
                                  className="bg-gradient-to-r from-blue-600 to-purple-600 text-white hover:from-blue-700 hover:to-purple-700 shadow-lg"
                                >
                                  <Check className="h-4 w-4 mr-2" />
                                  적용하기
                                </Button>
                              </div>
                            </div>
                          </div>

                          {/* Enhanced Info Section */}
                          <div className="p-5">
                            <div className="flex items-start justify-between mb-3">
                              <div>
                                <h3 className="font-semibold text-gray-900 text-lg mb-1">
                                  {template.name}
                                </h3>
                                <p className="text-sm text-gray-600 line-clamp-2">
                                  {template.description}
                                </p>
                              </div>
                            </div>

                            {/* Metadata */}
                            <div className="flex items-center gap-4 text-xs text-gray-500 mb-3">
                              {template.estimatedTime && (
                                <div className="flex items-center gap-1">
                                  <Clock className="w-3 h-3" />
                                  <span>{template.estimatedTime}</span>
                                </div>
                              )}
                              {template.popularity && (
                                <div className="flex items-center gap-1">
                                  <Star className="w-3 h-3 text-yellow-500 fill-current" />
                                  <span>{template.popularity}</span>
                                </div>
                              )}
                            </div>

                            {/* Tags */}
                            <div className="flex flex-wrap gap-2">
                              {template.tags.map((tag) => (
                                <Badge 
                                  key={tag} 
                                  variant="secondary" 
                                  className="text-xs bg-gray-100 text-gray-600 hover:bg-gray-200"
                                >
                                  {tag}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </>
            ) : (
              selectedTemplate && (
                <>
                  {/* Enhanced Preview Header */}
                  <div className="bg-white border-b shadow-sm">
                    <div className="px-8 py-5">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setPreviewMode(false)}
                            className="hover:bg-gray-100 rounded-full"
                          >
                            <ChevronLeft className="h-5 w-5" />
                          </Button>
                          <div>
                            <div className="flex items-center gap-3 mb-1">
                              <h2 className="text-xl font-bold text-gray-900">
                                {selectedTemplate.name}
                              </h2>
                              {selectedTemplate.isNew && (
                                <Badge className="bg-green-500 text-white">NEW</Badge>
                              )}
                              {selectedTemplate.isPremium && (
                                <Badge className="bg-gradient-to-r from-yellow-400 to-orange-400 text-white">
                                  PRO
                                </Badge>
                              )}
                            </div>
                            <p className="text-sm text-gray-600">
                              {selectedTemplate.description}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <Button
                            variant="outline"
                            onClick={() => setPreviewMode(false)}
                          >
                            다른 템플릿 보기
                          </Button>
                          <Button
                            onClick={() => handleApplyTemplate(selectedTemplate)}
                            className="bg-gradient-to-r from-blue-600 to-purple-600 text-white hover:from-blue-700 hover:to-purple-700"
                          >
                            <Check className="h-4 w-4 mr-2" />
                            이 템플릿 적용하기
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            onClick={onClose}
                            className="hover:bg-gray-100 rounded-full"
                          >
                            <X className="h-5 w-5" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Enhanced Preview Content */}
                  <div className="flex-1 overflow-y-auto bg-gradient-to-b from-gray-50 to-white p-8">
                    <div className="max-w-4xl mx-auto">
                      <div className="bg-white rounded-2xl shadow-lg p-12">
                        <div className="prose prose-lg max-w-none">
                          <div className="space-y-6">
                            {selectedTemplate.blocks.map((block, index) => (
                              <div key={`preview-${index}`} className="block-preview">
                                {block.type === 'core/heading' && (
                                  <div
                                    className={cn(
                                      'font-bold text-gray-900',
                                      block.content?.level === 1 && 'text-4xl mb-6',
                                      block.content?.level === 2 && 'text-3xl mb-4 mt-8',
                                      block.content?.level === 3 && 'text-2xl mb-3 mt-6',
                                      block.attributes?.align === 'center' && 'text-center',
                                      block.attributes?.align === 'right' && 'text-right'
                                    )}
                                  >
                                    {block.content?.text}
                                  </div>
                                )}
                                {block.type === 'core/paragraph' && (
                                  <p
                                    className={cn(
                                      'text-gray-700 leading-relaxed text-lg',
                                      block.attributes?.align === 'center' && 'text-center',
                                      block.attributes?.align === 'right' && 'text-right'
                                    )}
                                  >
                                    {block.content?.text}
                                  </p>
                                )}
                                {block.type === 'core/list' && (
                                  <div className="ml-4">
                                    {block.content?.style === 'ordered' ? (
                                      <ol className="list-decimal space-y-2 text-gray-700">
                                        {(block.content?.items as string[])?.map((item, i) => (
                                          <li key={i} className="pl-2">{item}</li>
                                        ))}
                                      </ol>
                                    ) : (
                                      <ul className="list-disc space-y-2 text-gray-700">
                                        {(block.content?.items as string[])?.map((item, i) => (
                                          <li key={i} className="pl-2">{item}</li>
                                        ))}
                                      </ul>
                                    )}
                                  </div>
                                )}
                                {block.type === 'core/button' && (
                                  <div className={cn(
                                    'flex my-6',
                                    block.attributes?.align === 'center' && 'justify-center',
                                    block.attributes?.align === 'right' && 'justify-end'
                                  )}>
                                    <button className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-8 py-3 rounded-xl font-medium hover:from-blue-700 hover:to-purple-700 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5">
                                      {block.content?.text}
                                    </button>
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </>
              )
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default DesignLibraryModal;