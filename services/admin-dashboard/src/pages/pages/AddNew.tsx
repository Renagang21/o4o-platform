import React, { useState, useEffect, useRef } from 'react'
import { 
  Save,
  Eye,
  Settings,
  Layout,
  Image,
  Palette,
  Smartphone,
  Tablet,
  Monitor,
  Globe,
  ArrowLeft,
  X
} from 'lucide-react'
import { Page, Template, MediaFile, PostStatus } from '@/types/content'
import { ContentApi } from '@/api/contentApi'
import { useParams, useNavigate } from 'react-router-dom'
import PageBuilder from './PageBuilder'
import TemplateSelector from './components/TemplateSelector'
import MediaSelector from '../media/components/MediaSelector'
import toast from 'react-hot-toast'

const AddNew: React.FC = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const isEdit = Boolean(id)
  
  const [loading, setLoading] = useState(isEdit)
  const [saving, setSaving] = useState(false)
  const [hasChanges, setHasChanges] = useState(false)
  const [previewMode, setPreviewMode] = useState<'desktop' | 'tablet' | 'mobile'>('desktop')
  const [showTemplateSelector, setShowTemplateSelector] = useState(!isEdit)
  const [showMediaSelector, setShowMediaSelector] = useState(false)
  const [showPageSettings, setShowPageSettings] = useState(false)
  const [autoSaving, setAutoSaving] = useState(false)
  
  // Page data
  const [page, setPage] = useState<Partial<Page>>({
    title: '',
    slug: '',
    content: { blocks: [] },
    excerpt: '',
    status: 'draft' as PostStatus,
    template: 'default',
    parentId: '',
    menuOrder: 0,
    showInMenu: true,
    isHomepage: false,
    passwordProtected: false,
    password: '',
    allowComments: true,
    featuredImageId: '',
    customFields: {},
    seo: {
      title: '',
      description: '',
      keywords: [],
      noindex: false,
      nofollow: false
    }
  })

  // Reference data
  const [templates, setTemplates] = useState<Template[]>([])
  const [parentPages, setParentPages] = useState<Page[]>([])
  const [featuredImage, setFeaturedImage] = useState<MediaFile | null>(null)
  
  // Auto-save
  const autoSaveTimeoutRef = useRef<NodeJS.Timeout>()

  useEffect(() => {
    loadReferenceData()
    if (isEdit && id) {
      loadPage(id)
    }
  }, [id, isEdit])

  useEffect(() => {
    // Auto-save setup
    if (hasChanges && !autoSaving) {
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current)
      }
      
      autoSaveTimeoutRef.current = setTimeout(() => {
        handleAutoSave()
      }, 3000) // Auto-save after 3 seconds of inactivity
    }

    return () => {
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current)
      }
    }
  }, [hasChanges, page])

  const loadReferenceData = async () => {
    try {
      const [templatesResponse, pagesResponse] = await Promise.all([
        ContentApi.getTemplates('page'),
        ContentApi.getPages()
      ])
      
      setTemplates(templatesResponse.data)
      setParentPages(pagesResponse.data.filter(p => p.id !== id)) // Exclude current page
    } catch (error) {
      console.error('Failed to load reference data:', error)
    }
  }

  const loadPage = async (pageId: string) => {
    try {
      setLoading(true)
      const response = await ContentApi.getPage(pageId)
      setPage(response.data)
      
      if (response.data.featuredImageId) {
        try {
          const imageResponse = await ContentApi.getMediaFile(response.data.featuredImageId)
          setFeaturedImage(imageResponse.data)
        } catch (error) {
          console.error('Failed to load featured image:', error)
        }
      }
    } catch (error) {
      console.error('Failed to load page:', error)
      toast.error('페이지를 불러오는데 실패했습니다.')
      navigate('/pages')
    } finally {
      setLoading(false)
    }
  }

  const handleAutoSave = async () => {
    if (!page.title?.trim() || autoSaving) return

    try {
      setAutoSaving(true)
      
      if (isEdit && id) {
        await ContentApi.savePageDraft(id, page)
      } else {
        // For new pages, save as draft
        const tempPage = { ...page, status: 'draft' as PostStatus }
        const response = await ContentApi.createPage(tempPage)
        
        // Update URL to edit mode
        navigate(`/pages/edit/${response.data.id}`, { replace: true })
      }
      
      setHasChanges(false)
      // Don't show toast for auto-save to avoid spam
    } catch (error) {
      console.error('Auto-save failed:', error)
    } finally {
      setAutoSaving(false)
    }
  }

  const handleSave = async (status: PostStatus = 'draft') => {
    if (!page.title?.trim()) {
      toast.error('페이지 제목을 입력해주세요.')
      return
    }

    try {
      setSaving(true)
      
      // Generate slug if not provided
      if (!page.slug?.trim()) {
        const slugResponse = await ContentApi.generateSlug(page.title, 'page')
        page.slug = slugResponse.data.slug
      }

      const pageData = {
        ...page,
        status,
        publishedAt: status === 'published' ? new Date().toISOString() : page.publishedAt
      }

      if (isEdit && id) {
        await ContentApi.updatePage(id, pageData)
        toast.success('페이지가 저장되었습니다.')
      } else {
        const response = await ContentApi.createPage(pageData)
        toast.success('페이지가 생성되었습니다.')
        navigate(`/pages/edit/${response.data.id}`)
      }
      
      setHasChanges(false)
    } catch (error) {
      console.error('Failed to save page:', error)
      toast.error('저장에 실패했습니다.')
    } finally {
      setSaving(false)
    }
  }

  const handlePreview = async () => {
    if (hasChanges) {
      await handleAutoSave()
    }
    
    try {
      const response = await ContentApi.getPagePreview(id || 'new')
      window.open(response.data.url, '_blank')
    } catch (error) {
      console.error('Failed to generate preview:', error)
      toast.error('미리보기 생성에 실패했습니다.')
    }
  }

  const handleTemplateSelect = (template: Template) => {
    setPage(prev => ({
      ...prev,
      template: template.id,
      content: template.content || { blocks: [] }
    }))
    setShowTemplateSelector(false)
    setHasChanges(true)
    toast.success(`${template.name} 템플릿이 적용되었습니다.`)
  }

  const handleBlocksChange = (blocks: any[]) => {
    setPage(prev => ({
      ...prev,
      content: { blocks }
    }))
    setHasChanges(true)
  }

  const handleFeaturedImageSelect = (files: MediaFile[]) => {
    if (files.length > 0) {
      setFeaturedImage(files[0])
      setPage(prev => ({
        ...prev,
        featuredImageId: files[0].id
      }))
      setHasChanges(true)
    }
    setShowMediaSelector(false)
  }

  const updatePageData = (key: string, value: any) => {
    setPage(prev => ({
      ...prev,
      [key]: value
    }))
    setHasChanges(true)
  }

  const updateSEOData = (key: string, value: any) => {
    setPage(prev => ({
      ...prev,
      seo: {
        ...prev.seo,
        [key]: value
      }
    }))
    setHasChanges(true)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="loading-spinner" />
        <span className="ml-2 text-gray-600">페이지를 불러오는 중...</span>
      </div>
    )
  }

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/pages')}
            className="text-gray-500 hover:text-gray-700"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          
          <div className="flex items-center gap-2">
            <Layout className="w-5 h-5 text-gray-500" />
            <span className="font-medium text-gray-900">
              {isEdit ? '페이지 편집' : '새 페이지'}
            </span>
            {hasChanges && (
              <span className="text-xs text-orange-600">• 저장되지 않음</span>
            )}
            {autoSaving && (
              <span className="text-xs text-blue-600">• 자동 저장 중...</span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Preview Mode Toggle */}
          <div className="flex items-center bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setPreviewMode('desktop')}
              className={`p-2 rounded ${previewMode === 'desktop' ? 'bg-white shadow-sm' : 'text-gray-500'}`}
              title="데스크톱"
            >
              <Monitor className="w-4 h-4" />
            </button>
            <button
              onClick={() => setPreviewMode('tablet')}
              className={`p-2 rounded ${previewMode === 'tablet' ? 'bg-white shadow-sm' : 'text-gray-500'}`}
              title="태블릿"
            >
              <Tablet className="w-4 h-4" />
            </button>
            <button
              onClick={() => setPreviewMode('mobile')}
              className={`p-2 rounded ${previewMode === 'mobile' ? 'bg-white shadow-sm' : 'text-gray-500'}`}
              title="모바일"
            >
              <Smartphone className="w-4 h-4" />
            </button>
          </div>

          <button
            onClick={() => setShowTemplateSelector(true)}
            className="wp-button-secondary"
          >
            <Palette className="w-4 h-4 mr-2" />
            템플릿
          </button>

          <button
            onClick={handlePreview}
            className="wp-button-secondary"
          >
            <Eye className="w-4 h-4 mr-2" />
            미리보기
          </button>

          <button
            onClick={() => setShowPageSettings(!showPageSettings)}
            className="wp-button-secondary"
          >
            <Settings className="w-4 h-4 mr-2" />
            설정
          </button>

          <div className="flex items-center gap-1">
            <button
              onClick={() => handleSave('draft')}
              disabled={saving}
              className="wp-button-secondary"
            >
              {saving ? '저장 중...' : '초안 저장'}
            </button>
            
            <button
              onClick={() => handleSave('published')}
              disabled={saving}
              className="wp-button-primary"
            >
              {saving ? (
                <div className="loading-spinner w-4 h-4 mr-2" />
              ) : (
                <Save className="w-4 h-4 mr-2" />
              )}
              {page.status === 'published' ? '업데이트' : '발행'}
            </button>
          </div>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Main Content */}
        <div className="flex-1 flex flex-col">
          {/* Page Title */}
          <div className="bg-white border-b border-gray-200 px-6 py-4">
            <input
              type="text"
              value={page.title || ''}
              onChange={(e) => updatePageData('title', e.target.value)}
              placeholder="페이지 제목을 입력하세요"
              className="w-full text-2xl font-bold text-gray-900 border-none outline-none placeholder-gray-400"
            />
            <div className="mt-2 text-sm text-gray-500">
              URL: /{page.slug || (page.title ? page.title.toLowerCase().replace(/\s+/g, '-') : 'new-page')}
            </div>
          </div>

          {/* Page Builder */}
          <div className="flex-1 overflow-auto">
            <div className={`mx-auto transition-all duration-300 ${
              previewMode === 'desktop' ? 'max-w-7xl' :
              previewMode === 'tablet' ? 'max-w-3xl' :
              'max-w-md'
            }`}>
              <PageBuilder
                blocks={page.content?.blocks || []}
                onChange={handleBlocksChange}
                template={page.template}
              />
            </div>
          </div>
        </div>

        {/* Sidebar */}
        {showPageSettings && (
          <div className="w-80 bg-white border-l border-gray-200 overflow-y-auto">
            <div className="p-6 space-y-6">
              {/* Publish Settings */}
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center gap-2">
                  <Globe className="w-5 h-5" />
                  발행 설정
                </h3>
                
                <div className="space-y-4">
                  <div>
                    <label className="wp-label">상태</label>
                    <select
                      value={page.status}
                      onChange={(e) => updatePageData('status', e.target.value)}
                      className="wp-select"
                    >
                      <option value="draft">초안</option>
                      <option value="published">발행됨</option>
                      <option value="private">비공개</option>
                    </select>
                  </div>

                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="passwordProtected"
                      checked={page.passwordProtected || false}
                      onChange={(e) => updatePageData('passwordProtected', e.target.checked)}
                      className="rounded border-gray-300 text-admin-blue focus:ring-admin-blue"
                    />
                    <label htmlFor="passwordProtected" className="text-sm text-gray-700">
                      암호로 보호
                    </label>
                  </div>

                  {page.passwordProtected && (
                    <div>
                      <label className="wp-label">암호</label>
                      <input
                        type="password"
                        value={page.password || ''}
                        onChange={(e) => updatePageData('password', e.target.value)}
                        className="wp-input"
                        placeholder="암호를 입력하세요"
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* Page Settings */}
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center gap-2">
                  <Layout className="w-5 h-5" />
                  페이지 설정
                </h3>
                
                <div className="space-y-4">
                  <div>
                    <label className="wp-label">템플릿</label>
                    <select
                      value={page.template}
                      onChange={(e) => updatePageData('template', e.target.value)}
                      className="wp-select"
                    >
                      {templates.map(template => (
                        <option key={template.id} value={template.id}>
                          {template.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="wp-label">부모 페이지</label>
                    <select
                      value={page.parentId || ''}
                      onChange={(e) => updatePageData('parentId', e.target.value)}
                      className="wp-select"
                    >
                      <option value="">최상위 페이지</option>
                      {parentPages.map(parentPage => (
                        <option key={parentPage.id} value={parentPage.id}>
                          {parentPage.title}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="wp-label">순서</label>
                    <input
                      type="number"
                      value={page.menuOrder || 0}
                      onChange={(e) => updatePageData('menuOrder', parseInt(e.target.value))}
                      className="wp-input"
                      min="0"
                    />
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="showInMenu"
                        checked={page.showInMenu || false}
                        onChange={(e) => updatePageData('showInMenu', e.target.checked)}
                        className="rounded border-gray-300 text-admin-blue focus:ring-admin-blue"
                      />
                      <label htmlFor="showInMenu" className="text-sm text-gray-700">
                        메뉴에 표시
                      </label>
                    </div>

                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="isHomepage"
                        checked={page.isHomepage || false}
                        onChange={(e) => updatePageData('isHomepage', e.target.checked)}
                        className="rounded border-gray-300 text-admin-blue focus:ring-admin-blue"
                      />
                      <label htmlFor="isHomepage" className="text-sm text-gray-700">
                        홈페이지로 설정
                      </label>
                    </div>

                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="allowComments"
                        checked={page.allowComments || false}
                        onChange={(e) => updatePageData('allowComments', e.target.checked)}
                        className="rounded border-gray-300 text-admin-blue focus:ring-admin-blue"
                      />
                      <label htmlFor="allowComments" className="text-sm text-gray-700">
                        댓글 허용
                      </label>
                    </div>
                  </div>
                </div>
              </div>

              {/* Featured Image */}
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center gap-2">
                  <Image className="w-5 h-5" />
                  대표 이미지
                </h3>
                
                {featuredImage ? (
                  <div className="space-y-3">
                    <div className="relative">
                      <img
                        src={featuredImage.thumbnailUrl || featuredImage.url}
                        alt={featuredImage.altText || featuredImage.name}
                        className="w-full h-32 object-cover rounded border"
                      />
                      <button
                        onClick={() => {
                          setFeaturedImage(null)
                          updatePageData('featuredImageId', '')
                        }}
                        className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                    <div className="text-sm text-gray-600">
                      {featuredImage.name}
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => setShowMediaSelector(true)}
                    className="w-full h-32 border-2 border-dashed border-gray-300 rounded flex items-center justify-center text-gray-500 hover:border-gray-400 hover:text-gray-600"
                  >
                    <div className="text-center">
                      <Image className="w-8 h-8 mx-auto mb-2" />
                      <span className="text-sm">대표 이미지 선택</span>
                    </div>
                  </button>
                )}
              </div>

              {/* SEO Settings */}
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center gap-2">
                  <Globe className="w-5 h-5" />
                  SEO 설정
                </h3>
                
                <div className="space-y-4">
                  <div>
                    <label className="wp-label">SEO 제목</label>
                    <input
                      type="text"
                      value={page.seo?.title || ''}
                      onChange={(e) => updateSEOData('title', e.target.value)}
                      className="wp-input"
                      placeholder="페이지 제목을 자동으로 사용합니다"
                    />
                  </div>

                  <div>
                    <label className="wp-label">메타 설명</label>
                    <textarea
                      value={page.seo?.description || ''}
                      onChange={(e) => updateSEOData('description', e.target.value)}
                      className="wp-input min-h-[80px]"
                      placeholder="페이지에 대한 간단한 설명을 입력하세요"
                    />
                  </div>

                  <div>
                    <label className="wp-label">키워드</label>
                    <input
                      type="text"
                      value={page.seo?.keywords?.join(', ') || ''}
                      onChange={(e) => updateSEOData('keywords', e.target.value.split(',').map(k => k.trim()))}
                      className="wp-input"
                      placeholder="키워드1, 키워드2, 키워드3"
                    />
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="noindex"
                        checked={page.seo?.noindex || false}
                        onChange={(e) => updateSEOData('noindex', e.target.checked)}
                        className="rounded border-gray-300 text-admin-blue focus:ring-admin-blue"
                      />
                      <label htmlFor="noindex" className="text-sm text-gray-700">
                        검색 엔진 색인 제외
                      </label>
                    </div>

                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="nofollow"
                        checked={page.seo?.nofollow || false}
                        onChange={(e) => updateSEOData('nofollow', e.target.checked)}
                        className="rounded border-gray-300 text-admin-blue focus:ring-admin-blue"
                      />
                      <label htmlFor="nofollow" className="text-sm text-gray-700">
                        링크 추적 안 함
                      </label>
                    </div>
                  </div>
                </div>
              </div>

              {/* Page Excerpt */}
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">요약</h3>
                <textarea
                  value={page.excerpt || ''}
                  onChange={(e) => updatePageData('excerpt', e.target.value)}
                  className="wp-input min-h-[100px]"
                  placeholder="페이지에 대한 요약을 입력하세요"
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Template Selector Modal */}
      {showTemplateSelector && (
        <TemplateSelector
          templates={templates}
          currentTemplate={page.template}
          onSelect={handleTemplateSelect}
          onClose={() => setShowTemplateSelector(false)}
        />
      )}

      {/* Media Selector Modal */}
      {showMediaSelector && (
        <MediaSelector
          multiple={false}
          allowedTypes={['image']}
          onSelect={handleFeaturedImageSelect}
          onClose={() => setShowMediaSelector(false)}
        />
      )}
    </div>
  )
}

export default AddNew