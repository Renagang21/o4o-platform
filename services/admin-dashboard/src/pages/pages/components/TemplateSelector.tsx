import React, { useState } from 'react'
import { 
  X,
  Search,
  Filter,
  Eye,
  Download,
  Star,
  Crown,
  Layout,
  FileText,
  Globe,
  Smartphone,
  Store,
  Briefcase,
  GraduationCap,
  Heart,
  Camera,
  Music,
  Utensils,
  Car,
  Home,
  Palette
} from 'lucide-react'
import { Template } from '@/types/content'

interface TemplateSelectorProps {
  templates: Template[]
  currentTemplate?: string
  onSelect: (template: Template) => void
  onClose: () => void
}

const TemplateSelector: React.FC<TemplateSelectorProps> = ({
  templates,
  currentTemplate,
  onSelect,
  onClose
}) => {
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [previewTemplate, setPreviewTemplate] = useState<Template | null>(null)

  // Template categories
  const categories = [
    { id: 'all', label: '전체', icon: Layout },
    { id: 'landing', label: '랜딩 페이지', icon: Globe },
    { id: 'business', label: '비즈니스', icon: Briefcase },
    { id: 'portfolio', label: '포트폴리오', icon: Camera },
    { id: 'blog', label: '블로그', icon: FileText },
    { id: 'ecommerce', label: '쇼핑몰', icon: Store },
    { id: 'education', label: '교육', icon: GraduationCap },
    { id: 'health', label: '의료/건강', icon: Heart },
    { id: 'restaurant', label: '음식점', icon: Utensils },
    { id: 'automotive', label: '자동차', icon: Car },
    { id: 'real-estate', label: '부동산', icon: Home },
    { id: 'creative', label: '크리에이티브', icon: Palette }
  ]

  // Built-in system templates
  const systemTemplates: Template[] = [
    {
      id: 'blank',
      name: '빈 페이지',
      type: 'page',
      source: 'system',
      category: 'basic',
      description: '완전히 빈 페이지에서 시작합니다.',
      template_data: { blocks: [] },
      preview_image: '/templates/previews/blank.jpg',
      tags: ['basic', 'clean'],
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    },
    {
      id: 'default',
      name: '기본 페이지',
      type: 'page',
      source: 'system',
      category: 'basic',
      description: '기본 제목과 내용 블록이 포함된 페이지입니다.',
      template_data: {
        blocks: [
          {
            id: 'heading-1',
            type: 'heading',
            data: {
              level: 1,
              content: {
                type: 'doc',
                content: [
                  {
                    type: 'heading',
                    attrs: { level: 1 },
                    content: [{ type: 'text', text: '페이지 제목' }]
                  }
                ]
              }
            }
          },
          {
            id: 'paragraph-1',
            type: 'paragraph',
            data: {
              content: {
                type: 'doc',
                content: [
                  {
                    type: 'paragraph',
                    content: [{ type: 'text', text: '여기에 내용을 입력하세요.' }]
                  }
                ]
              }
            }
          }
        ]
      },
      preview_image: '/templates/previews/default.jpg',
      tags: ['basic', 'simple'],
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    },
    {
      id: 'hero-landing',
      name: '히어로 랜딩',
      type: 'page',
      source: 'system',
      category: 'landing',
      description: '큰 히어로 섹션과 기능 그리드가 있는 랜딩 페이지입니다.',
      template_data: {
        blocks: [
          {
            id: 'hero-1',
            type: 'hero-section',
            data: {
              title: '멋진 서비스를 소개합니다',
              subtitle: '혁신적인 솔루션으로 비즈니스를 성장시키세요',
              backgroundType: 'gradient',
              backgroundColor: '#3b82f6',
              ctaText: '지금 시작하기',
              ctaLink: '#contact',
              alignment: 'center',
              height: 'large'
            }
          },
          {
            id: 'features-1',
            type: 'feature-grid',
            data: {
              columns: 3,
              features: [
                { title: '빠른 속도', description: '초고속 처리로 시간을 절약하세요', icon: 'zap' },
                { title: '안전함', description: '업계 최고 수준의 보안을 제공합니다', icon: 'shield' },
                { title: '사용 편의성', description: '직관적인 인터페이스로 쉽게 사용하세요', icon: 'heart' }
              ]
            }
          },
          {
            id: 'cta-1',
            type: 'hero-section',
            data: {
              title: '지금 바로 시작해보세요',
              subtitle: '무료 체험으로 우리 서비스를 경험해보세요',
              backgroundType: 'color',
              backgroundColor: '#1f2937',
              ctaText: '무료 체험',
              ctaLink: '#signup',
              alignment: 'center',
              height: 'medium'
            }
          }
        ]
      },
      preview_image: '/templates/previews/hero-landing.jpg',
      tags: ['landing', 'hero', 'business'],
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    },
    {
      id: 'about-us',
      name: '회사 소개',
      type: 'page',
      source: 'system',
      category: 'business',
      description: '회사 소개에 적합한 구조의 페이지입니다.',
      template_data: {
        blocks: [
          {
            id: 'heading-1',
            type: 'heading',
            data: {
              level: 1,
              content: {
                type: 'doc',
                content: [
                  {
                    type: 'heading',
                    attrs: { level: 1 },
                    content: [{ type: 'text', text: '회사 소개' }]
                  }
                ]
              }
            }
          },
          {
            id: 'two-column-1',
            type: 'two-column',
            data: {
              leftContent: {
                type: 'doc',
                content: [
                  {
                    type: 'heading',
                    attrs: { level: 2 },
                    content: [{ type: 'text', text: '우리의 미션' }]
                  },
                  {
                    type: 'paragraph',
                    content: [{ type: 'text', text: '회사의 미션과 비전을 설명하는 내용을 입력하세요.' }]
                  }
                ]
              },
              rightContent: {
                type: 'doc',
                content: [
                  {
                    type: 'heading',
                    attrs: { level: 2 },
                    content: [{ type: 'text', text: '우리의 비전' }]
                  },
                  {
                    type: 'paragraph',
                    content: [{ type: 'text', text: '회사가 추구하는 가치와 목표를 설명하는 내용을 입력하세요.' }]
                  }
                ]
              },
              leftWidth: 50,
              gap: 'large'
            }
          },
          {
            id: 'testimonials-1',
            type: 'testimonials',
            data: {
              testimonials: [
                {
                  content: '정말 훌륭한 회사입니다. 전문성과 신뢰성을 모두 갖춘 파트너입니다.',
                  author: '고객 이름',
                  role: 'CEO',
                  company: '파트너 회사'
                }
              ]
            }
          }
        ]
      },
      preview_image: '/templates/previews/about-us.jpg',
      tags: ['business', 'about', 'company'],
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    },
    {
      id: 'contact-page',
      name: '연락처',
      type: 'page',
      source: 'system',
      category: 'business',
      description: '연락처 정보와 문의 양식이 포함된 페이지입니다.',
      template_data: {
        blocks: [
          {
            id: 'heading-1',
            type: 'heading',
            data: {
              level: 1,
              content: {
                type: 'doc',
                content: [
                  {
                    type: 'heading',
                    attrs: { level: 1 },
                    content: [{ type: 'text', text: '연락처' }]
                  }
                ]
              }
            }
          },
          {
            id: 'two-column-1',
            type: 'two-column',
            data: {
              leftContent: {
                type: 'doc',
                content: [
                  {
                    type: 'heading',
                    attrs: { level: 3 },
                    content: [{ type: 'text', text: '연락처 정보' }]
                  },
                  {
                    type: 'paragraph',
                    content: [{ type: 'text', text: '전화: 02-1234-5678' }]
                  },
                  {
                    type: 'paragraph',
                    content: [{ type: 'text', text: '이메일: info@company.com' }]
                  },
                  {
                    type: 'paragraph',
                    content: [{ type: 'text', text: '주소: 서울시 강남구 테헤란로 123' }]
                  }
                ]
              },
              rightContent: {
                type: 'doc',
                content: [
                  {
                    type: 'heading',
                    attrs: { level: 3 },
                    content: [{ type: 'text', text: '운영 시간' }]
                  },
                  {
                    type: 'paragraph',
                    content: [{ type: 'text', text: '평일: 09:00 - 18:00' }]
                  },
                  {
                    type: 'paragraph',
                    content: [{ type: 'text', text: '토요일: 10:00 - 16:00' }]
                  },
                  {
                    type: 'paragraph',
                    content: [{ type: 'text', text: '일요일: 휴무' }]
                  }
                ]
              }
            }
          },
          {
            id: 'contact-form-1',
            type: 'contact-form',
            data: {
              title: '문의하기',
              description: '궁금한 점이 있으시면 언제든 연락주세요.',
              fields: [
                { type: 'text', name: 'name', label: '이름', required: true },
                { type: 'email', name: 'email', label: '이메일', required: true },
                { type: 'tel', name: 'phone', label: '전화번호', required: false },
                { type: 'textarea', name: 'message', label: '메시지', required: true }
              ],
              submitText: '문의 보내기'
            }
          }
        ]
      },
      preview_image: '/templates/previews/contact.jpg',
      tags: ['contact', 'business', 'form'],
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }
  ]

  // Combine system templates with user templates
  const allTemplates = [...systemTemplates, ...templates]

  const filteredTemplates = allTemplates.filter(template => {
    const matchesSearch = template.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         template.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         template.tags?.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()))
    
    const matchesCategory = selectedCategory === 'all' || template.category === selectedCategory
    
    return matchesSearch && matchesCategory && template.is_active
  })

  const getCategoryIcon = (categoryId: string) => {
    const category = categories.find(c => c.id === categoryId)
    return category?.icon || Layout
  }

  const getTemplateIcon = (template: Template) => {
    if (template.source === 'system') {
      return <Crown className="w-4 h-4 text-yellow-500" />
    }
    return <Star className="w-4 h-4 text-blue-500" />
  }

  const handleTemplateSelect = (template: Template) => {
    onSelect(template)
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg max-w-6xl w-full mx-4 max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-900">템플릿 선택</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="템플릿 검색..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="wp-input pl-10"
            />
          </div>
        </div>

        <div className="flex-1 flex overflow-hidden">
          {/* Categories Sidebar */}
          <div className="w-64 bg-gray-50 border-r border-gray-200 p-4 overflow-y-auto">
            <h3 className="text-sm font-medium text-gray-900 mb-3">카테고리</h3>
            <div className="space-y-1">
              {categories.map((category) => {
                const IconComponent = category.icon
                const isSelected = selectedCategory === category.id
                
                return (
                  <button
                    key={category.id}
                    onClick={() => setSelectedCategory(category.id)}
                    className={`w-full flex items-center gap-3 px-3 py-2 text-sm rounded-lg transition-colors ${
                      isSelected
                        ? 'bg-blue-100 text-blue-700'
                        : 'text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    <IconComponent className="w-4 h-4" />
                    {category.label}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Templates Grid */}
          <div className="flex-1 p-6 overflow-y-auto">
            {filteredTemplates.length === 0 ? (
              <div className="text-center py-12">
                <Layout className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">템플릿이 없습니다</h3>
                <p className="text-gray-500">검색 조건을 변경해보세요.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredTemplates.map((template) => (
                  <div
                    key={template.id}
                    className={`group border-2 rounded-lg overflow-hidden transition-all cursor-pointer ${
                      currentTemplate === template.id
                        ? 'border-blue-500 ring-2 ring-blue-200'
                        : 'border-gray-200 hover:border-gray-300 hover:shadow-md'
                    }`}
                    onClick={() => handleTemplateSelect(template)}
                  >
                    {/* Preview Image */}
                    <div className="aspect-video bg-gray-100 relative overflow-hidden">
                      {template.preview_image ? (
                        <img
                          src={template.preview_image}
                          alt={template.name}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Layout className="w-12 h-12 text-gray-300" />
                        </div>
                      )}
                      
                      {/* Template Type Badge */}
                      <div className="absolute top-2 left-2">
                        {getTemplateIcon(template)}
                      </div>

                      {/* Preview Button */}
                      <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-all flex items-center justify-center">
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            setPreviewTemplate(template)
                          }}
                          className="opacity-0 group-hover:opacity-100 bg-white text-gray-700 px-3 py-1 rounded-full text-sm font-medium transition-opacity"
                        >
                          <Eye className="w-4 h-4 inline mr-1" />
                          미리보기
                        </button>
                      </div>
                    </div>

                    {/* Template Info */}
                    <div className="p-4">
                      <div className="flex items-start justify-between mb-2">
                        <h3 className="font-medium text-gray-900 truncate">{template.name}</h3>
                        {currentTemplate === template.id && (
                          <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                            현재
                          </span>
                        )}
                      </div>
                      
                      <p className="text-sm text-gray-500 mb-3 line-clamp-2">
                        {template.description}
                      </p>

                      {/* Tags */}
                      {template.tags && template.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {template.tags.slice(0, 3).map((tag) => (
                            <span
                              key={tag}
                              className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded"
                            >
                              {tag}
                            </span>
                          ))}
                          {template.tags.length > 3 && (
                            <span className="text-xs text-gray-400">
                              +{template.tags.length - 3}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-200 bg-gray-50">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-500">
              {filteredTemplates.length}개의 템플릿이 있습니다
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={onClose}
                className="wp-button-secondary"
              >
                취소
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Preview Modal */}
      {previewTemplate && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-60">
          <div className="bg-white rounded-lg max-w-4xl w-full mx-4 max-h-[90vh] overflow-hidden">
            <div className="p-4 border-b border-gray-200 flex items-center justify-between">
              <h3 className="font-medium">{previewTemplate.name} 미리보기</h3>
              <button
                onClick={() => setPreviewTemplate(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 overflow-y-auto max-h-[70vh]">
              {previewTemplate.preview_image ? (
                <img
                  src={previewTemplate.preview_image}
                  alt={previewTemplate.name}
                  className="w-full rounded border"
                />
              ) : (
                <div className="aspect-video bg-gray-100 rounded flex items-center justify-center">
                  <Layout className="w-16 h-16 text-gray-300" />
                </div>
              )}
            </div>
            <div className="p-4 border-t border-gray-200 flex justify-end gap-2">
              <button
                onClick={() => setPreviewTemplate(null)}
                className="wp-button-secondary"
              >
                닫기
              </button>
              <button
                onClick={() => {
                  handleTemplateSelect(previewTemplate)
                  setPreviewTemplate(null)
                }}
                className="wp-button-primary"
              >
                이 템플릿 사용
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default TemplateSelector