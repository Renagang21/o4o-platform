/**
 * DesignLibraryModal Component
 * Template gallery modal for selecting design templates
 */

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { X, Eye, ChevronLeft } from 'lucide-react';
import { Block } from '@/types/post.types';

interface TemplateCategory {
  id: string;
  name: string;
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
    templates: [
      {
        id: 'simple-article',
        name: '간단한 글',
        category: 'basic',
        thumbnail: '/templates/simple-article.png',
        description: '기본적인 텍스트 위주의 글 템플릿',
        tags: ['텍스트', '간단함'],
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
    ],
  },
  {
    id: 'landing',
    name: '랜딩 페이지',
    templates: [
      {
        id: 'hero-landing',
        name: '히어로 섹션',
        category: 'landing',
        thumbnail: '/templates/hero-landing.png',
        description: '강력한 첫인상을 위한 히어로 섹션 템플릿',
        tags: ['히어로', '랜딩', '마케팅'],
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
            content: { text: '지금 시작하기', url: '#' },
            attributes: { align: 'center', style: 'primary' },
          },
        ],
      },
    ],
  },
  {
    id: 'about',
    name: '소개 페이지',
    templates: [
      {
        id: 'company-intro',
        name: '회사 소개',
        category: 'about',
        thumbnail: '/templates/company-intro.png',
        description: '회사나 조직을 소개하는 전문적인 템플릿',
        tags: ['회사', '소개', '전문성'],
        blocks: [
          {
            id: 'block-1',
            type: 'core/heading',
            content: { text: '우리의 이야기', level: 1 },
            attributes: { level: 1, align: 'center' },
          },
          {
            id: 'block-2',
            type: 'core/paragraph',
            content: { text: '2010년부터 시작된 우리의 여정을 소개합니다. 고객의 성공이 우리의 성공이라는 믿음으로 최선을 다하고 있습니다.' },
            attributes: { align: 'left' },
          },
          {
            id: 'block-3',
            type: 'core/heading',
            content: { text: '우리의 가치', level: 2 },
            attributes: { level: 2 },
          },
          {
            id: 'block-4',
            type: 'core/list',
            content: { 
              items: ['고객 중심의 서비스', '지속적인 혁신', '투명한 소통', '품질에 대한 약속'],
              style: 'unordered'
            },
            attributes: {},
          },
        ],
      },
    ],
  },
  {
    id: 'contact',
    name: '연락처 페이지',
    templates: [
      {
        id: 'contact-info',
        name: '연락처 정보',
        category: 'contact',
        thumbnail: '/templates/contact-info.png',
        description: '연락처와 위치 정보를 포함한 템플릿',
        tags: ['연락처', '정보', '위치'],
        blocks: [
          {
            id: 'block-1',
            type: 'core/heading',
            content: { text: '연락처', level: 1 },
            attributes: { level: 1, align: 'center' },
          },
          {
            id: 'block-2',
            type: 'core/paragraph',
            content: { text: '궁금한 점이 있으시면 언제든지 연락주세요. 빠른 시간 내에 답변드리겠습니다.' },
            attributes: { align: 'center' },
          },
          {
            id: 'block-3',
            type: 'core/heading',
            content: { text: '연락 방법', level: 2 },
            attributes: { level: 2 },
          },
          {
            id: 'block-4',
            type: 'core/paragraph',
            content: { text: '📞 전화: 02-1234-5678\n📧 이메일: contact@example.com\n📍 주소: 서울시 강남구 테헤란로 123' },
            attributes: { align: 'left' },
          },
        ],
      },
    ],
  },
  {
    id: 'service',
    name: '서비스 페이지',
    templates: [
      {
        id: 'service-overview',
        name: '서비스 소개',
        category: 'service',
        thumbnail: '/templates/service-overview.png',
        description: '서비스나 제품을 소개하는 구조화된 템플릿',
        tags: ['서비스', '제품', '소개'],
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
          {
            id: 'block-3',
            type: 'core/columns',
            content: {
              columns: [
                {
                  blocks: [
                    {
                      id: 'col1-1',
                      type: 'core/heading',
                      content: { text: '컨설팅', level: 3 },
                      attributes: { level: 3, align: 'center' },
                    },
                    {
                      id: 'col1-2',
                      type: 'core/paragraph',
                      content: { text: '전문가의 상담을 통해 최적의 솔루션을 제안합니다.' },
                      attributes: { align: 'center' },
                    },
                  ],
                },
                {
                  blocks: [
                    {
                      id: 'col2-1',
                      type: 'core/heading',
                      content: { text: '개발', level: 3 },
                      attributes: { level: 3, align: 'center' },
                    },
                    {
                      id: 'col2-2',
                      type: 'core/paragraph',
                      content: { text: '최신 기술을 활용한 효율적인 개발 서비스를 제공합니다.' },
                      attributes: { align: 'center' },
                    },
                  ],
                },
              ],
            },
            attributes: {},
          },
        ],
      },
    ],
  },
  {
    id: 'portfolio',
    name: '포트폴리오',
    templates: [
      {
        id: 'project-showcase',
        name: '프로젝트 쇼케이스',
        category: 'portfolio',
        thumbnail: '/templates/project-showcase.png',
        description: '작업물이나 프로젝트를 효과적으로 보여주는 템플릿',
        tags: ['포트폴리오', '프로젝트', '쇼케이스'],
        blocks: [
          {
            id: 'block-1',
            type: 'core/heading',
            content: { text: '프로젝트 소개', level: 1 },
            attributes: { level: 1, align: 'center' },
          },
          {
            id: 'block-2',
            type: 'core/paragraph',
            content: { text: '이 프로젝트는 사용자 경험을 개선하고 효율성을 높이는 것을 목표로 했습니다.' },
            attributes: { align: 'left' },
          },
          {
            id: 'block-3',
            type: 'core/heading',
            content: { text: '주요 기능', level: 2 },
            attributes: { level: 2 },
          },
          {
            id: 'block-4',
            type: 'core/list',
            content: { 
              items: ['직관적인 사용자 인터페이스', '반응형 디자인', '빠른 성능', '접근성 최적화'],
              style: 'unordered'
            },
            attributes: {},
          },
          {
            id: 'block-5',
            type: 'core/heading',
            content: { text: '결과', level: 2 },
            attributes: { level: 2 },
          },
          {
            id: 'block-6',
            type: 'core/paragraph',
            content: { text: '프로젝트 완료 후 사용자 만족도가 35% 향상되었고, 성능이 50% 개선되었습니다.' },
            attributes: { align: 'left' },
          },
        ],
      },
    ],
  },
  {
    id: 'blog',
    name: '블로그 레이아웃',
    templates: [
      {
        id: 'blog-post',
        name: '블로그 포스트',
        category: 'blog',
        thumbnail: '/templates/blog-post.png',
        description: '읽기 좋은 블로그 글을 위한 구조화된 템플릿',
        tags: ['블로그', '글쓰기', '구조'],
        blocks: [
          {
            id: 'block-1',
            type: 'core/paragraph',
            content: { text: '오늘은 여러분과 함께 흥미로운 주제에 대해 이야기해보려고 합니다. 이 글을 통해 새로운 인사이트를 얻으시기 바랍니다.' },
            attributes: { align: 'left' },
          },
          {
            id: 'block-2',
            type: 'core/heading',
            content: { text: '배경', level: 2 },
            attributes: { level: 2 },
          },
          {
            id: 'block-3',
            type: 'core/paragraph',
            content: { text: '이 문제에 대한 배경을 먼저 살펴보겠습니다. 최근 동향과 현재 상황을 분석해보겠습니다.' },
            attributes: { align: 'left' },
          },
          {
            id: 'block-4',
            type: 'core/heading',
            content: { text: '핵심 내용', level: 2 },
            attributes: { level: 2 },
          },
          {
            id: 'block-5',
            type: 'core/paragraph',
            content: { text: '여기서 가장 중요한 포인트들을 다뤄보겠습니다. 구체적인 사례와 데이터를 통해 설명드리겠습니다.' },
            attributes: { align: 'left' },
          },
          {
            id: 'block-6',
            type: 'core/heading',
            content: { text: '결론', level: 2 },
            attributes: { level: 2 },
          },
          {
            id: 'block-7',
            type: 'core/paragraph',
            content: { text: '정리하자면, 우리가 논의한 내용들은 앞으로의 발전 방향을 제시해줍니다. 여러분의 의견도 듣고 싶습니다.' },
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

  const currentCategory = templateCategories.find(cat => cat.id === selectedCategory);
  const currentTemplates = currentCategory?.templates || [];

  const handleApplyTemplate = (template: Template) => {
    // Generate unique IDs for each block to avoid conflicts
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
      <DialogContent className="max-w-6xl h-[80vh] p-0">
        <div className="flex h-full">
          {/* Sidebar - Categories */}
          <div className="w-64 bg-gray-50 border-r flex flex-col">
            <DialogHeader className="p-4 border-b bg-white">
              <DialogTitle className="text-lg font-semibold">디자인 라이브러리</DialogTitle>
            </DialogHeader>
            
            <div className="flex-1 overflow-y-auto p-4">
              <nav className="space-y-1">
                {templateCategories.map((category) => (
                  <button
                    key={category.id}
                    onClick={() => {
                      setSelectedCategory(category.id);
                      setPreviewMode(false);
                    }}
                    className={cn(
                      'w-full text-left px-3 py-2 rounded-lg text-sm transition-colors',
                      selectedCategory === category.id
                        ? 'bg-blue-100 text-blue-700 font-medium'
                        : 'text-gray-600 hover:bg-gray-100'
                    )}
                  >
                    {category.name}
                    <span className="ml-2 text-xs text-gray-400">
                      ({category.templates.length})
                    </span>
                  </button>
                ))}
              </nav>
            </div>
          </div>

          {/* Main Content */}
          <div className="flex-1 flex flex-col">
            {!previewMode ? (
              <>
                {/* Header */}
                <div className="p-4 border-b bg-white">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="font-semibold text-lg">
                        {currentCategory?.name}
                      </h2>
                      <p className="text-sm text-gray-500 mt-1">
                        템플릿을 선택하여 빠르게 시작하세요
                      </p>
                    </div>
                    <Button variant="ghost" size="icon" onClick={onClose}>
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                {/* Templates Grid */}
                <div className="flex-1 overflow-y-auto p-6">
                  <div className="grid grid-cols-2 lg:grid-cols-3 gap-6">
                    {currentTemplates.map((template) => (
                      <div
                        key={template.id}
                        className="group border rounded-lg overflow-hidden hover:shadow-md transition-all cursor-pointer"
                      >
                        {/* Thumbnail */}
                        <div className="aspect-[4/3] bg-gray-100 relative overflow-hidden">
                          <div className="absolute inset-0 flex items-center justify-center text-gray-400">
                            <div className="text-center">
                              <div className="text-4xl mb-2">📄</div>
                              <div className="text-sm">{template.name}</div>
                            </div>
                          </div>
                          
                          {/* Hover Actions */}
                          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                            <Button
                              size="sm"
                              variant="secondary"
                              onClick={() => handlePreview(template)}
                              className="bg-white/90 text-black hover:bg-white"
                            >
                              <Eye className="h-4 w-4 mr-1" />
                              미리보기
                            </Button>
                            <Button
                              size="sm"
                              onClick={() => handleApplyTemplate(template)}
                              className="bg-blue-600 text-white hover:bg-blue-700"
                            >
                              적용하기
                            </Button>
                          </div>
                        </div>

                        {/* Info */}
                        <div className="p-4">
                          <h3 className="font-medium text-gray-900 mb-1">
                            {template.name}
                          </h3>
                          <p className="text-sm text-gray-500 mb-3">
                            {template.description}
                          </p>
                          <div className="flex flex-wrap gap-1">
                            {template.tags.map((tag) => (
                              <Badge key={tag} variant="secondary" className="text-xs">
                                {tag}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            ) : (
              selectedTemplate && (
                <>
                  {/* Preview Header */}
                  <div className="p-4 border-b bg-white">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setPreviewMode(false)}
                        >
                          <ChevronLeft className="h-4 w-4" />
                        </Button>
                        <div>
                          <h2 className="font-semibold text-lg">
                            {selectedTemplate.name}
                          </h2>
                          <p className="text-sm text-gray-500">
                            {selectedTemplate.description}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          onClick={() => handleApplyTemplate(selectedTemplate)}
                          className="bg-blue-600 text-white hover:bg-blue-700"
                        >
                          이 템플릿 적용하기
                        </Button>
                        <Button variant="ghost" size="icon" onClick={onClose}>
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>

                  {/* Preview Content */}
                  <div className="flex-1 overflow-y-auto p-6 bg-gray-50">
                    <div className="max-w-4xl mx-auto bg-white rounded-lg shadow-sm p-8">
                      <div className="space-y-6">
                        {selectedTemplate.blocks.map((block, index) => (
                          <div key={`preview-${index}`} className="block-preview">
                            {block.type === 'core/heading' && (
                              <div
                                className={cn(
                                  'font-bold',
                                  block.content?.level === 1 && 'text-3xl',
                                  block.content?.level === 2 && 'text-2xl',
                                  block.content?.level === 3 && 'text-xl',
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
                                  'text-gray-700 leading-relaxed whitespace-pre-line',
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
                                  <ol className="list-decimal space-y-1">
                                    {(block.content?.items as string[])?.map((item, i) => (
                                      <li key={i} className="text-gray-700">{item}</li>
                                    ))}
                                  </ol>
                                ) : (
                                  <ul className="list-disc space-y-1">
                                    {(block.content?.items as string[])?.map((item, i) => (
                                      <li key={i} className="text-gray-700">{item}</li>
                                    ))}
                                  </ul>
                                )}
                              </div>
                            )}
                            {block.type === 'core/button' && (
                              <div className={cn(
                                'flex',
                                block.attributes?.align === 'center' && 'justify-center',
                                block.attributes?.align === 'right' && 'justify-end'
                              )}>
                                <button className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors">
                                  {block.content?.text}
                                </button>
                              </div>
                            )}
                          </div>
                        ))}
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