import { useState, useEffect, FC } from 'react';
import { Eye, Plus, Play, Monitor, Smartphone, Tablet } from 'lucide-react';
import AdminLayout from '../../components/admin/AdminLayout';
import DOMPurify from 'dompurify';
import { TemplatesList } from '../../components/admin/templates/TemplatesList';
import { TemplateCreateForm } from '../../components/admin/templates/TemplateCreateForm';
import type {
  Template,
  TemplateField,
  TemplateFormData,
  AvailableCPT,
  PreviewMode,
  EditorMode
} from '../../types/templates';

const TemplatesManager: FC = () => {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'list' | 'create' | 'edit' | 'preview'>('list');
  const [editingTemplate, setEditingTemplate] = useState<Template | null>(null);
  const [previewMode, setPreviewMode] = useState<PreviewMode>('desktop');
  const [activeEditor, setActiveEditor] = useState<EditorMode>('html');

  // 새 Template 생성 폼 상태
  const [newTemplate, setNewTemplate] = useState<TemplateFormData>({
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

  // 사용 가능한 CPT (Mock - would come from API)
  const [availableCPTs] = useState<AvailableCPT[]>([
    { slug: 'product', name: '상품' },
    { slug: 'event', name: '이벤트' },
    { slug: 'service', name: '서비스' },
    { slug: 'team', name: '팀원' },
    { slug: 'portfolio', name: '포트폴리오' }
  ]);

  // 사용 가능한 필드/숏코드 (Mock - would come from API)
  const [availableFields] = useState<TemplateField[]>([
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
    } catch (error: unknown) {
      console.error('Failed to load templates:', error);
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
      
      await loadTemplates();
      resetForm();
      setActiveTab('list');
      alert('✅ Template이 성공적으로 생성되었습니다!');
    } catch (error: unknown) {
      console.error('Failed to create template:', error);
      alert('❌ Template 생성 중 오류가 발생했습니다.');
    }
  };

  const deleteTemplate = async (id: string) => {
    if (!confirm('정말로 이 Template을 삭제하시겠습니까?')) return;

    try {
      // API 호출 (Mock)

      setTemplates(prev => prev.filter(template => template.id !== id));
      alert('✅ Template이 삭제되었습니다.');
    } catch (error: unknown) {
      console.error('Failed to delete template:', error);
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
      setNewTemplate(prev => ({ ...prev, htmlContent: newContent }));
      
      // 커서 위치 조정
      setTimeout(() => {
        textarea.focus();
        textarea.setSelectionRange(start + shortcode.length, start + shortcode.length);
      }, 0);
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
          <TemplatesList
            templates={templates}
            availableCPTs={availableCPTs}
            onCreateClick={() => setActiveTab('create')}
            onPreview={previewTemplate}
            onCopyShortcode={copyShortcode}
            onEdit={(template) => {/* TODO: 편집 기능 */}}
            onDelete={deleteTemplate}
          />
        )}

        {activeTab === 'create' && (
          <TemplateCreateForm
            formData={newTemplate}
            availableCPTs={availableCPTs}
            availableFields={availableFields}
            activeEditor={activeEditor}
            onFormChange={setNewTemplate}
            onActiveEditorChange={setActiveEditor}
            onInsertField={insertField}
            onSubmit={createTemplate}
            onCancel={() => {
              resetForm();
              setActiveTab('list');
            }}
          />
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
                  ].map(item => (
                    <button
                      key={item.mode}
                      onClick={() => setPreviewMode(item.mode as 'desktop' | 'tablet' | 'mobile')}
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