import { useState, useEffect, FC } from 'react';
import { 
  Plus, 
  Edit3, 
  Trash2, 
  Save,
  X,
  Code,
  Eye,
  Copy,
  Settings,
  FileCode,
  Layout,
  Layers,
  Zap,
  Play,
  Monitor,
  Smartphone,
  Tablet
} from 'lucide-react';
import AdminLayout from '../../components/admin/AdminLayout';
import DOMPurify from 'dompurify';

interface TemplateField {
  name: string;
  label: string;
  shortcode: string;
  example: string;
}

interface Template {
  id: string;
  name: string;
  title: string;
  description?: string;
  type: 'single' | 'archive' | 'custom';
  postType?: string; // single/archive 타입일 때 적용되는 CPT
  htmlContent: string;
  cssContent: string;
  jsContent?: string;
  conditions?: {
    field: string;
    operator: string;
    value: string;
  }[];
  settings: {
    responsive: boolean;
    cache: boolean;
    cacheTime: number;
  };
  shortcode: string; // [template name="template-name"]
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

const TemplatesManager: FC = () => {
  const [templates, setTemplates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'list' | 'create' | 'edit' | 'preview'>('list');
  const [editingTemplate, setEditingTemplate] = useState<Template | null>(null);
  const [previewMode, setPreviewMode] = useState<'desktop' | 'tablet' | 'mobile'>('desktop');
  const [activeEditor, setActiveEditor] = useState<'html' | 'css' | 'js'>('html');

  // 새 Template 생성 폼 상태
  const [newTemplate, setNewTemplate] = useState({
    name: '',
    title: '',
    description: '',
    type: 'custom' as 'single' | 'archive' | 'custom',
    postType: '',
    htmlContent: '',
    cssContent: '',
    jsContent: '',
    conditions: [],
    settings: {
      responsive: true,
      cache: true,
      cacheTime: 60
    }
  });

  // 사용 가능한 CPT (Mock)
  const [availableCPTs] = useState([
    { slug: 'product', name: '상품' },
    { slug: 'event', name: '이벤트' },
    { slug: 'service', name: '서비스' },
    { slug: 'team', name: '팀원' },
    { slug: 'portfolio', name: '포트폴리오' }
  ]);

  // 사용 가능한 필드/숏코드 (Mock)
  const [availableFields] = useState([
    { name: 'title', label: '제목', shortcode: '[field name="title"]', example: '상품 제목' },
    { name: 'content', label: '내용', shortcode: '[field name="content"]', example: '상품 설명' },
    { name: 'featured_image', label: '대표 이미지', shortcode: '[field name="featured_image"]', example: '<img src="..." />' },
    { name: 'price', label: '가격', shortcode: '[field name="price"]', example: '150,000원' },
    { name: 'created_at', label: '생성일', shortcode: '[field name="created_at"]', example: '2025-01-01' },
    { name: 'author', label: '작성자', shortcode: '[field name="author"]', example: '관리자' },
    { name: 'taxonomy', label: '분류', shortcode: '[taxonomy name="category"]', example: '전자제품' },
    { name: 'related', label: '관련 포스트', shortcode: '[related limit="3"]', example: '관련 상품 목록' }
  ]);

  useEffect(() => {
    loadTemplates();
  }, []);

  const loadTemplates = async () => {
    try {
      // Mock data for demonstration
      const mockTemplates: Template[] = [
        {
          id: 'template_1',
          name: 'product_single',
          title: '상품 상세 페이지',
          description: '상품의 상세 정보를 표시하는 템플릿',
          type: 'single',
          postType: 'product',
          htmlContent: `<div class="product-detail">
  <div class="product-header">
    <h1 class="product-title">[field name="title"]</h1>
    <div class="product-price">[field name="price"]원</div>
  </div>
  
  <div class="product-image">
    [field name="featured_image"]
  </div>
  
  <div class="product-content">
    [field name="content"]
  </div>
  
  <div class="product-meta">
    <div class="brand">브랜드: [field name="brand"]</div>
    <div class="category">카테고리: [taxonomy name="category"]</div>
  </div>
  
  <div class="related-products">
    <h3>관련 상품</h3>
    [related limit="4"]
  </div>
</div>`,
          cssContent: `.product-detail {
  max-width: 1200px;
  margin: 0 auto;
  padding: 2rem;
}

.product-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2rem;
  border-bottom: 1px solid #e5e7eb;
  padding-bottom: 1rem;
}

.product-title {
  font-size: 2rem;
  font-weight: bold;
  color: #1f2937;
}

.product-price {
  font-size: 1.5rem;
  font-weight: bold;
  color: #dc2626;
}

.product-image {
  margin-bottom: 2rem;
  text-align: center;
}

.product-content {
  line-height: 1.6;
  margin-bottom: 2rem;
}

.product-meta {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
  margin-bottom: 2rem;
  padding: 1rem;
  background-color: #f9fafb;
  border-radius: 0.5rem;
}

.related-products h3 {
  margin-bottom: 1rem;
  font-size: 1.25rem;
  font-weight: bold;
}`,
          settings: {
            responsive: true,
            cache: true,
            cacheTime: 60
          },
          shortcode: '[template name="product_single"]',
          active: true,
          createdAt: '2025-01-01',
          updatedAt: '2025-01-15'
        },
        {
          id: 'template_2',
          name: 'event_card',
          title: '이벤트 카드',
          description: '이벤트를 카드 형태로 표시하는 템플릿',
          type: 'custom',
          htmlContent: `<div class="event-card">
  <div class="event-image">
    [field name="featured_image"]
  </div>
  
  <div class="event-content">
    <h3 class="event-title">[field name="title"]</h3>
    <div class="event-date">[field name="event_date"]</div>
    <div class="event-location">[field name="location"]</div>
    <p class="event-excerpt">[field name="excerpt"]</p>
    
    <a href="[field name="permalink"]" class="event-link">
      자세히 보기
    </a>
  </div>
</div>`,
          cssContent: `.event-card {
  background: white;
  border-radius: 0.75rem;
  overflow: hidden;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  transition: transform 0.2s, box-shadow 0.2s;
}

.event-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.event-image {
  width: 100%;
  height: 200px;
  overflow: hidden;
}

.event-image img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.event-content {
  padding: 1.5rem;
}

.event-title {
  font-size: 1.25rem;
  font-weight: bold;
  margin-bottom: 0.5rem;
  color: #1f2937;
}

.event-date {
  color: #dc2626;
  font-weight: 600;
  margin-bottom: 0.25rem;
}

.event-location {
  color: #6b7280;
  margin-bottom: 1rem;
}

.event-excerpt {
  color: #4b5563;
  line-height: 1.6;
  margin-bottom: 1rem;
}

.event-link {
  display: inline-block;
  background-color: #3b82f6;
  color: white;
  padding: 0.5rem 1rem;
  border-radius: 0.375rem;
  text-decoration: none;
  font-weight: 500;
  transition: background-color 0.2s;
}

.event-link:hover {
  background-color: #2563eb;
}`,
          settings: {
            responsive: true,
            cache: false,
            cacheTime: 0
          },
          shortcode: '[template name="event_card"]',
          active: true,
          createdAt: '2025-01-02',
          updatedAt: '2025-01-12'
        }
      ];

      setTemplates(mockTemplates);
    } catch (error: any) {
      console.error('Template 로드 실패:', error);
    } finally {
      setLoading(false);
    }
  };

  const createTemplate = async () => {
    try {
      const templateData = {
        ...newTemplate,
        id: `template_${Date.now()}`,
        shortcode: `[template name="${newTemplate.name}"]`,
        active: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      // API 호출 (Mock)
      // console.log('Creating template:', templateData);
      
      await loadTemplates();
      resetForm();
      setActiveTab('list');
      alert('✅ Template이 성공적으로 생성되었습니다!');
    } catch (error: any) {
      console.error('Template 생성 실패:', error);
      alert('❌ Template 생성 중 오류가 발생했습니다.');
    }
  };

  const deleteTemplate = async (id: string) => {
    if (!confirm('정말로 이 Template을 삭제하시겠습니까?')) return;

    try {
      // API 호출 (Mock)
      // console.log('Deleting template:', id);
      
      setTemplates((prev: any) => prev.filter((template: any) => template.id !== id));
      alert('✅ Template이 삭제되었습니다.');
    } catch (error: any) {
      console.error('Template 삭제 실패:', error);
      alert('❌ 삭제 중 오류가 발생했습니다.');
    }
  };

  const resetForm = () => {
    setNewTemplate({
      name: '',
      title: '',
      description: '',
      type: 'custom',
      postType: '',
      htmlContent: '',
      cssContent: '',
      jsContent: '',
      conditions: [],
      settings: {
        responsive: true,
        cache: true,
        cacheTime: 60
      }
    });
  };

  const previewTemplate = (template: Template) => {
    setEditingTemplate(template);
    setActiveTab('preview');
  };

  const copyShortcode = (shortcode: string) => {
    navigator.clipboard.writeText(shortcode);
    alert('✅ 숏코드가 클립보드에 복사되었습니다!');
  };

  const insertField = (shortcode: string) => {
    const textarea = document.getElementById('html-editor') as HTMLTextAreaElement;
    if (textarea) {
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const text = textarea.value;
      const before = text.substring(0, start);
      const after = text.substring(end, text.length);
      
      const newContent = before + shortcode + after;
      setNewTemplate((prev: any) => ({ ...prev, htmlContent: newContent }));
      
      // 커서 위치 조정
      setTimeout(() => {
        textarea.focus();
        textarea.setSelectionRange(start + shortcode.length, start + shortcode.length);
      }, 0);
    }
  };

  const getTemplateTypeLabel = (type: string) => {
    switch (type) {
      case 'single': return '단일 페이지';
      case 'archive': return '목록 페이지';
      case 'custom': return '커스텀';
      default: return type;
    }
  };

  const getTemplateTypeIcon = (type: string) => {
    switch (type) {
      case 'single': return <FileCode className="w-5 h-5" />;
      case 'archive': return <Layout className="w-5 h-5" />;
      case 'custom': return <Layers className="w-5 h-5" />;
      default: return <FileCode className="w-5 h-5" />;
    }
  };

  const getPreviewModeIcon = (mode: string) => {
    switch (mode) {
      case 'desktop': return <Monitor className="w-4 h-4" />;
      case 'tablet': return <Tablet className="w-4 h-4" />;
      case 'mobile': return <Smartphone className="w-4 h-4" />;
      default: return <Monitor className="w-4 h-4" />;
    }
  };

  if (loading) {
    return (
      <AdminLayout title="Templates 관리" subtitle="콘텐츠 템플릿을 생성하고 관리하세요">
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
            <p className="text-gray-600">Template 목록을 로드하는 중...</p>
          </div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout 
      title="Templates 관리" 
      subtitle="콘텐츠 템플릿을 생성하고 관리하세요"
      fullWidth={activeTab === 'create' || activeTab === 'preview'}
    >
      {/* Navigation Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex space-x-8 px-6">
          <button
            onClick={() => setActiveTab('list')}
            className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeTab === 'list'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <FileCode className="w-4 h-4 inline mr-2" />
            Template 목록
          </button>
          <button
            onClick={() => setActiveTab('create')}
            className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeTab === 'create'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <Plus className="w-4 h-4 inline mr-2" />
            새 Template 생성
          </button>
          {activeTab === 'preview' && (
            <button
              onClick={() => setActiveTab('preview')}
              className="py-4 px-1 border-b-2 border-blue-500 text-blue-600 font-medium text-sm"
            >
              <Play className="w-4 h-4 inline mr-2" />
              미리보기
            </button>
          )}
        </nav>
      </div>

      {/* Content */}
      <div className="p-6">
        {activeTab === 'list' && (
          <div className="space-y-6">
            {/* Action Bar */}
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-lg font-medium text-gray-900">등록된 Template</h3>
                <p className="text-sm text-gray-500">총 {templates.length}개의 템플릿이 생성되어 있습니다.</p>
              </div>
              <button
                onClick={() => setActiveTab('create')}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Plus className="w-4 h-4" />
                새 Template 생성
              </button>
            </div>

            {templates.length === 0 ? (
              <div className="text-center py-12">
                <FileCode className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  아직 생성된 Template이 없습니다
                </h3>
                <p className="text-gray-600 mb-4">
                  첫 번째 콘텐츠 템플릿을 생성해보세요
                </p>
                <button
                  onClick={() => setActiveTab('create')}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  <Plus className="w-4 h-4" />
                  새 Template 생성
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {templates.map((template: any) => (
                  <div key={template.id} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                    {/* Header */}
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          {getTemplateTypeIcon(template.type)}
                          <h3 className="font-semibold text-gray-900">{template.title}</h3>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            template.type === 'single' ? 'bg-blue-100 text-blue-800' :
                            template.type === 'archive' ? 'bg-green-100 text-green-800' :
                            'bg-purple-100 text-purple-800'
                          }`}>
                            {getTemplateTypeLabel(template.type)}
                          </span>
                        </div>
                        <p className="text-sm text-gray-500 mb-1">/{template.name}</p>
                        {template.description && (
                          <p className="text-gray-600 text-sm">{template.description}</p>
                        )}
                      </div>
                      
                      <div className="flex gap-2">
                        <button
                          onClick={() => previewTemplate(template)}
                          className="p-2 text-gray-400 hover:text-green-600 transition-colors"
                          title="미리보기"
                        >
                          <Play className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => copyShortcode(template.shortcode)}
                          className="p-2 text-gray-400 hover:text-purple-600 transition-colors"
                          title="숏코드 복사"
                        >
                          <Copy className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => {/* TODO: 편집 기능 */}}
                          className="p-2 text-gray-400 hover:text-blue-600 transition-colors"
                          title="편집"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => deleteTemplate(template.id)}
                          className="p-2 text-gray-400 hover:text-red-600 transition-colors"
                          title="삭제"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* Type Info */}
                    {template.postType && (
                      <div className="mb-4">
                        <span className="text-sm text-gray-500">적용 대상:</span>
                        <span className="ml-2 px-2 py-1 bg-gray-100 text-gray-800 rounded text-sm">
                          {availableCPTs.find((cpt: any) => cpt.slug === template.postType)?.name || template.postType}
                        </span>
                      </div>
                    )}

                    {/* Shortcode */}
                    <div className="bg-gray-100 rounded-lg p-3 mb-4">
                      <div className="flex items-center justify-between">
                        <code className="text-sm text-gray-800">{template.shortcode}</code>
                        <button
                          onClick={() => copyShortcode(template.shortcode)}
                          className="flex items-center gap-1 px-2 py-1 text-xs bg-gray-200 hover:bg-gray-300 rounded transition-colors"
                        >
                          <Copy className="w-3 h-3" />
                          복사
                        </button>
                      </div>
                    </div>

                    {/* Settings */}
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2">
                          <span className="text-gray-500">반응형:</span>
                          <span className={template.settings.responsive ? 'text-green-600' : 'text-gray-400'}>
                            {template.settings.responsive ? '예' : '아니오'}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-gray-500">캐시:</span>
                          <span className={template.settings.cache ? 'text-green-600' : 'text-gray-400'}>
                            {template.settings.cache ? `${template.settings.cacheTime}분` : '사용 안함'}
                          </span>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <span className="text-gray-500">상태:</span>
                        <span className={`px-2 py-1 rounded-full text-xs ${
                          template.active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                        }`}>
                          {template.active ? '활성' : '비활성'}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'create' && (
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 h-full">
            {/* 왼쪽: 폼 */}
            <div className="lg:col-span-1 space-y-6">
              {/* 기본 정보 */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="text-sm font-medium text-gray-900 mb-4">기본 정보</h4>
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Template 이름 *
                    </label>
                    <input
                      type="text"
                      value={newTemplate.name}
                      onChange={(e: any) => setNewTemplate((prev: any) => ({ ...prev, name: e.target.value }))}
                      placeholder="예: product_card"
                      className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      표시 제목 *
                    </label>
                    <input
                      type="text"
                      value={newTemplate.title}
                      onChange={(e: any) => setNewTemplate((prev: any) => ({ ...prev, title: e.target.value }))}
                      placeholder="예: 상품 카드"
                      className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      설명
                    </label>
                    <textarea
                      value={newTemplate.description}
                      onChange={(e: any) => setNewTemplate((prev: any) => ({ ...prev, description: e.target.value }))}
                      placeholder="템플릿 설명"
                      rows={3}
                      className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>
              </div>

              {/* 타입 설정 */}
              <div className="bg-white border border-gray-200 rounded-lg p-4">
                <h4 className="text-sm font-medium text-gray-900 mb-4">타입 설정</h4>
                
                <div className="space-y-3">
                  {[
                    { value: 'single', label: '단일 페이지', desc: '개별 포스트 표시' },
                    { value: 'archive', label: '목록 페이지', desc: '포스트 목록 표시' },
                    { value: 'custom', label: '커스텀', desc: '자유 형식' }
                  ].map((type: any) => (
                    <label key={type.value} className="flex items-start">
                      <input
                        type="radio"
                        name="templateType"
                        value={type.value}
                        checked={newTemplate.type === type.value}
                        onChange={(e: any) => setNewTemplate((prev: any) => ({ ...prev, type: e.target.value as any }))}
                        className="mt-1 mr-2"
                      />
                      <div>
                        <div className="text-sm font-medium text-gray-900">{type.label}</div>
                        <div className="text-xs text-gray-500">{type.desc}</div>
                      </div>
                    </label>
                  ))}
                </div>

                {(newTemplate.type === 'single' || newTemplate.type === 'archive') && (
                  <div className="mt-4">
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      적용할 Post Type
                    </label>
                    <select
                      value={newTemplate.postType}
                      onChange={(e: any) => setNewTemplate((prev: any) => ({ ...prev, postType: e.target.value }))}
                      className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="">Post Type 선택</option>
                      {availableCPTs.map((cpt: any) => (
                        <option key={cpt.slug} value={cpt.slug}>{cpt.name}</option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              {/* 사용 가능한 필드 */}
              <div className="bg-white border border-gray-200 rounded-lg p-4">
                <h4 className="text-sm font-medium text-gray-900 mb-4">사용 가능한 필드</h4>
                <div className="space-y-2">
                  {availableFields.map((field: any) => (
                    <div key={field.name} className="group">
                      <button
                        onClick={() => insertField(field.shortcode)}
                        className="w-full text-left p-2 rounded hover:bg-blue-50 transition-colors"
                      >
                        <div className="text-xs font-medium text-gray-900">{field.label}</div>
                        <div className="text-xs text-gray-500 font-mono">{field.shortcode}</div>
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* 오른쪽: 에디터 */}
            <div className="lg:col-span-3">
              <div className="bg-white border border-gray-200 rounded-lg h-full flex flex-col">
                {/* 에디터 탭 */}
                <div className="border-b border-gray-200">
                  <nav className="flex space-x-4 px-4">
                    {[
                      { id: 'html', label: 'HTML', icon: Code },
                      { id: 'css', label: 'CSS', icon: Settings },
                      { id: 'js', label: 'JavaScript', icon: Zap }
                    ].map((tab: any) => (
                      <button
                        key={tab.id}
                        onClick={() => setActiveEditor(tab.id as any)}
                        className={`py-3 px-1 border-b-2 font-medium text-sm transition-colors flex items-center gap-2 ${
                          activeEditor === tab.id
                            ? 'border-blue-500 text-blue-600'
                            : 'border-transparent text-gray-500 hover:text-gray-700'
                        }`}
                      >
                        <tab.icon className="w-4 h-4" />
                        {tab.label}
                      </button>
                    ))}
                  </nav>
                </div>

                {/* 에디터 영역 */}
                <div className="flex-1 p-4">
                  {activeEditor === 'html' && (
                    <textarea
                      id="html-editor"
                      value={newTemplate.htmlContent}
                      onChange={(e: any) => setNewTemplate((prev: any) => ({ ...prev, htmlContent: e.target.value }))}
                      placeholder="HTML 코드를 입력하세요..."
                      className="w-full h-full resize-none border border-gray-300 rounded p-3 font-mono text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  )}
                  
                  {activeEditor === 'css' && (
                    <textarea
                      value={newTemplate.cssContent}
                      onChange={(e: any) => setNewTemplate((prev: any) => ({ ...prev, cssContent: e.target.value }))}
                      placeholder="CSS 스타일을 입력하세요..."
                      className="w-full h-full resize-none border border-gray-300 rounded p-3 font-mono text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  )}
                  
                  {activeEditor === 'js' && (
                    <textarea
                      value={newTemplate.jsContent}
                      onChange={(e: any) => setNewTemplate((prev: any) => ({ ...prev, jsContent: e.target.value }))}
                      placeholder="JavaScript 코드를 입력하세요..."
                      className="w-full h-full resize-none border border-gray-300 rounded p-3 font-mono text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  )}
                </div>

                {/* 액션 버튼 */}
                <div className="border-t border-gray-200 p-4 flex justify-end gap-3">
                  <button
                    onClick={() => {
                      resetForm();
                      setActiveTab('list');
                    }}
                    className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    취소
                  </button>
                  <button
                    onClick={createTemplate}
                    disabled={!newTemplate.name || !newTemplate.title}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <Save className="w-4 h-4" />
                    Template 생성
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'preview' && editingTemplate && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Template 미리보기</h3>
                <p className="text-gray-600 mt-1">{editingTemplate.title}</p>
              </div>
              
              <div className="flex items-center gap-4">
                {/* 프리뷰 모드 선택 */}
                <div className="flex items-center gap-2 bg-gray-100 rounded-lg p-1">
                  {[
                    { mode: 'desktop', label: '데스크톱' },
                    { mode: 'tablet', label: '태블릿' },
                    { mode: 'mobile', label: '모바일' }
                  ].map((item: any) => (
                    <button
                      key={item.mode}
                      onClick={() => setPreviewMode(item.mode as any)}
                      className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors ${
                        previewMode === item.mode
                          ? 'bg-white text-gray-900 shadow-sm'
                          : 'text-gray-600 hover:text-gray-900'
                      }`}
                    >
                      {getPreviewModeIcon(item.mode)}
                      {item.label}
                    </button>
                  ))}
                </div>
                
                <button
                  onClick={() => setActiveTab('list')}
                  className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  목록으로 돌아가기
                </button>
              </div>
            </div>

            {/* Preview Frame */}
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <div className={`mx-auto transition-all duration-300 ${
                previewMode === 'desktop' ? 'max-w-full' :
                previewMode === 'tablet' ? 'max-w-2xl' : 'max-w-sm'
              }`}>
                <div className="border border-gray-300 rounded-lg overflow-hidden">
                  {/* Preview Content */}
                  <div 
                    className="p-4"
                    dangerouslySetInnerHTML={{
                      __html: DOMPurify.sanitize(`
                        <style>${editingTemplate.cssContent}</style>
                        ${editingTemplate.htmlContent
                          .replace(/\[field name="title"\]/g, '샘플 제목')
                          .replace(/\[field name="content"\]/g, '이것은 샘플 콘텐츠입니다. 실제 데이터가 여기에 표시됩니다.')
                          .replace(/\[field name="price"\]/g, '150,000')
                          .replace(/\[field name="featured_image"\]/g, '<img src="data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZjNmNGY2Ii8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtZmFtaWx5PSJBcmlhbCwgc2Fucy1zZXJpZiIgZm9udC1zaXplPSIxNiIgZmlsbD0iIzZiNzI4MCIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPuyCmO2UjCDsnbTrr7jsp4A8L3RleHQ+PC9zdmc+" alt="샘플 이미지" style="max-width: 100%; height: auto;" />')
                          .replace(/\[field name="brand"\]/g, '샘플 브랜드')
                          .replace(/\[taxonomy name="category"\]/g, '샘플 카테고리')
                          .replace(/\[field name="event_date"\]/g, '2025-02-15 14:00')
                          .replace(/\[field name="location"\]/g, '서울시 강남구')
                          .replace(/\[field name="excerpt"\]/g, '이것은 짧은 요약 텍스트입니다.')
                          .replace(/\[field name="permalink"\]/g, '#')
                          .replace(/\[related limit="\d+"\]/g, '<div class="related-items">관련 항목들이 여기에 표시됩니다.</div>')
                        }`)
                    }}
                  />
                </div>
              </div>
              
              <div className="mt-6 p-4 bg-blue-50 rounded-lg">
                <h5 className="font-medium text-blue-900 mb-2">숏코드</h5>
                <code className="text-blue-800 bg-blue-100 px-2 py-1 rounded">
                  {editingTemplate.shortcode}
                </code>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
};

export default TemplatesManager;