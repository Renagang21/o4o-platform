import { useState, useEffect, FC } from 'react';
import { 
  Plus, 
  Edit3, 
  Trash2, 
  Save,
  X,
  Eye,
  Code,
  Settings,
  Filter,
  SortAsc,
  List,
  Grid,
  Calendar,
  Hash,
  Type,
  CheckSquare,
  Play,
  Copy
} from 'lucide-react';
import AdminLayout from '../../components/admin/AdminLayout';

interface QueryFilter {
  id: string;
  field: string;
  operator: 'equals' | 'not_equals' | 'contains' | 'not_contains' | 'greater_than' | 'less_than' | 'in' | 'not_in' | 'between' | 'exists' | 'not_exists';
  value: string | string[];
  relation?: 'AND' | 'OR';
}

interface QuerySort {
  field: string;
  direction: 'ASC' | 'DESC';
}

interface ViewQuery {
  postType: string;
  filters: QueryFilter[];
  sorting: QuerySort[];
  pagination: {
    enabled: boolean;
    itemsPerPage: number;
    showAll?: boolean;
  };
  limit?: number;
}

interface ViewTemplate {
  type: 'list' | 'grid' | 'table' | 'custom';
  fields: string[]; // 표시할 필드들
  customHTML?: string;
  itemTemplate?: string; // 개별 아이템 템플릿
  wrapperClass?: string;
  itemClass?: string;
}

interface View {
  id: string;
  name: string;
  title: string;
  description?: string;
  query: ViewQuery;
  template: ViewTemplate;
  settings: {
    cache: boolean;
    cacheTime: number; // minutes
    ajaxPagination: boolean;
    showFilters: boolean;
    showSearch: boolean;
    showSort: boolean;
  };
  shortcode: string; // [view name="view-name"]
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

const ViewsManager: FC = () => {
  const [views, setViews] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'list' | 'create' | 'edit' | 'preview'>('list');
  const [editingView, setEditingView] = useState<View | null>(null);
  const [previewData, setPreviewData] = useState<any[]>([]);

  // 새 View 생성 폼 상태
  const [newView, setNewView] = useState({
    name: '',
    title: '',
    description: '',
    query: {
      postType: '',
      filters: [] as QueryFilter[],
      sorting: [] as QuerySort[],
      pagination: {
        enabled: true,
        itemsPerPage: 10,
        showAll: false
      },
      limit: undefined as number | undefined
    },
    template: {
      type: 'list' as 'list' | 'grid' | 'table' | 'custom',
      fields: [] as string[],
      customHTML: '',
      itemTemplate: '',
      wrapperClass: '',
      itemClass: ''
    },
    settings: {
      cache: true,
      cacheTime: 60,
      ajaxPagination: false,
      showFilters: false,
      showSearch: false,
      showSort: false
    }
  });

  // 사용 가능한 CPT와 필드 (Mock)
  const [availableCPTs] = useState([
    { 
      slug: 'product', 
      name: '상품',
      fields: [
        { name: 'title', label: '제목', type: 'text' },
        { name: 'content', label: '내용', type: 'textarea' },
        { name: 'price', label: '가격', type: 'number' },
        { name: 'brand', label: '브랜드', type: 'select' },
        { name: 'featured_image', label: '대표 이미지', type: 'image' },
        { name: 'gallery', label: '갤러리', type: 'gallery' },
        { name: 'created_at', label: '생성일', type: 'date' }
      ]
    },
    { 
      slug: 'event', 
      name: '이벤트',
      fields: [
        { name: 'title', label: '제목', type: 'text' },
        { name: 'content', label: '내용', type: 'textarea' },
        { name: 'event_date', label: '이벤트 날짜', type: 'datetime' },
        { name: 'location', label: '장소', type: 'location' },
        { name: 'team_members', label: '담당자', type: 'relation' },
        { name: 'created_at', label: '생성일', type: 'date' }
      ]
    },
    { 
      slug: 'service', 
      name: '서비스',
      fields: [
        { name: 'title', label: '제목', type: 'text' },
        { name: 'content', label: '내용', type: 'textarea' },
        { name: 'price_range', label: '가격대', type: 'select' },
        { name: 'duration', label: '소요시간', type: 'number' },
        { name: 'created_at', label: '생성일', type: 'date' }
      ]
    }
  ]);

  const operators = [
    { value: 'equals', label: '같음 (=)' },
    { value: 'not_equals', label: '다름 (≠)' },
    { value: 'contains', label: '포함' },
    { value: 'not_contains', label: '포함하지 않음' },
    { value: 'greater_than', label: '보다 큼 (>)' },
    { value: 'less_than', label: '보다 작음 (<)' },
    { value: 'in', label: '목록에 포함' },
    { value: 'not_in', label: '목록에 포함되지 않음' },
    { value: 'between', label: '사이' },
    { value: 'exists', label: '존재함' },
    { value: 'not_exists', label: '존재하지 않음' }
  ];

  useEffect(() => {
    loadViews();
  }, []);

  const loadViews = async () => {
    try {
      // Mock data for demonstration
      const mockViews: View[] = [
        {
          id: 'view_1',
          name: 'featured_products',
          title: '추천 상품 목록',
          description: '가격이 10만원 이상인 추천 상품들을 표시합니다',
          query: {
            postType: 'product',
            filters: [
              {
                id: 'filter_1',
                field: 'price',
                operator: 'greater_than',
                value: '100000',
                relation: 'AND'
              }
            ],
            sorting: [
              { field: 'price', direction: 'DESC' }
            ],
            pagination: {
              enabled: true,
              itemsPerPage: 8
            }
          },
          template: {
            type: 'grid',
            fields: ['title', 'price', 'featured_image', 'brand'],
            wrapperClass: 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6',
            itemClass: 'bg-white rounded-lg shadow-sm border border-gray-200 p-4'
          },
          settings: {
            cache: true,
            cacheTime: 30,
            ajaxPagination: true,
            showFilters: true,
            showSearch: true,
            showSort: false
          },
          shortcode: '[view name="featured_products"]',
          active: true,
          createdAt: '2025-01-01',
          updatedAt: '2025-01-15'
        },
        {
          id: 'view_2',
          name: 'upcoming_events',
          title: '다가오는 이벤트',
          description: '현재 날짜 이후의 이벤트들을 날짜순으로 표시합니다',
          query: {
            postType: 'event',
            filters: [
              {
                id: 'filter_2',
                field: 'event_date',
                operator: 'greater_than',
                value: 'today',
                relation: 'AND'
              }
            ],
            sorting: [
              { field: 'event_date', direction: 'ASC' }
            ],
            pagination: {
              enabled: true,
              itemsPerPage: 5
            }
          },
          template: {
            type: 'list',
            fields: ['title', 'event_date', 'location'],
            wrapperClass: 'space-y-4',
            itemClass: 'bg-gray-50 rounded-lg p-4 border-l-4 border-blue-500'
          },
          settings: {
            cache: true,
            cacheTime: 15,
            ajaxPagination: false,
            showFilters: false,
            showSearch: false,
            showSort: false
          },
          shortcode: '[view name="upcoming_events"]',
          active: true,
          createdAt: '2025-01-02',
          updatedAt: '2025-01-12'
        }
      ];

      setViews(mockViews);
    } catch (error: any) {
    // Error logging - use proper error handler
    } finally {
      setLoading(false);
    }
  };

  const createView = async () => {
    try {
      const viewData = {
        ...newView,
        id: `view_${Date.now()}`,
        shortcode: `[view name="${newView.name}"]`,
        active: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      // API 호출 (Mock)
      
      await loadViews();
      resetForm();
      setActiveTab('list');
      alert('✅ View가 성공적으로 생성되었습니다!');
    } catch (error: any) {
    // Error logging - use proper error handler
      alert('❌ View 생성 중 오류가 발생했습니다.');
    }
  };

  const deleteView = async (id: string) => {
    if (!confirm('정말로 이 View를 삭제하시겠습니까?')) return;

    try {
      // API 호출 (Mock)
      
      setViews((prev: any) => prev.filter((view: any) => view.id !== id));
      alert('✅ View가 삭제되었습니다.');
    } catch (error: any) {
    // Error logging - use proper error handler
      alert('❌ 삭제 중 오류가 발생했습니다.');
    }
  };

  const resetForm = () => {
    setNewView({
      name: '',
      title: '',
      description: '',
      query: {
        postType: '',
        filters: [],
        sorting: [],
        pagination: {
          enabled: true,
          itemsPerPage: 10,
          showAll: false
        },
        limit: undefined
      },
      template: {
        type: 'list',
        fields: [],
        customHTML: '',
        itemTemplate: '',
        wrapperClass: '',
        itemClass: ''
      },
      settings: {
        cache: true,
        cacheTime: 60,
        ajaxPagination: false,
        showFilters: false,
        showSearch: false,
        showSort: false
      }
    });
  };

  const addFilter = () => {
    const newFilter: QueryFilter = {
      id: `filter_${Date.now()}`,
      field: '',
      operator: 'equals',
      value: '',
      relation: 'AND'
    };

    setNewView((prev: any) => ({
      ...prev,
      query: {
        ...prev.query,
        filters: [...prev.query.filters, newFilter]
      }
    }));
  };

  const updateFilter = (filterId: string, updates: Partial<QueryFilter>) => {
    setNewView((prev: any) => ({
      ...prev,
      query: {
        ...prev.query,
        filters: prev.query.filters.map((filter: any) =>
          filter.id === filterId ? { ...filter, ...updates } : filter
        )
      }
    }));
  };

  const removeFilter = (filterId: string) => {
    setNewView((prev: any) => ({
      ...prev,
      query: {
        ...prev.query,
        filters: prev.query.filters.filter((filter: any) => filter.id !== filterId)
      }
    }));
  };

  const addSort = () => {
    const newSort: QuerySort = {
      field: '',
      direction: 'ASC'
    };

    setNewView((prev: any) => ({
      ...prev,
      query: {
        ...prev.query,
        sorting: [...prev.query.sorting, newSort]
      }
    }));
  };

  const updateSort = (index: number, updates: Partial<QuerySort>) => {
    setNewView((prev: any) => ({
      ...prev,
      query: {
        ...prev.query,
        sorting: prev.query.sorting.map((sort, i) =>
          i === index ? { ...sort, ...updates } : sort
        )
      }
    }));
  };

  const removeSort = (index: number) => {
    setNewView((prev: any) => ({
      ...prev,
      query: {
        ...prev.query,
        sorting: prev.query.sorting.filter((_, i) => i !== index)
      }
    }));
  };

  const getSelectedCPT = () => {
    return availableCPTs.find((cpt: any) => cpt.slug === newView.query.postType);
  };

  const previewView = async (view: View) => {
    // Fetch actual preview data from API
    try {
      const response = await api.get(`/views/${view.id}/preview`);
      setPreviewData(response.data || []);
    } catch (error) {
      console.error('Failed to fetch preview data:', error);
      setPreviewData([]);
    }
    
    setEditingView(view);
    setActiveTab('preview');
  };

  const copyShortcode = (shortcode: string) => {
    navigator.clipboard.writeText(shortcode);
    alert('✅ 숏코드가 클립보드에 복사되었습니다!');
  };

  if (loading) {
    return (
      <AdminLayout title="Views 관리" subtitle="동적 쿼리를 생성하고 관리하세요">
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
            <p className="text-gray-600">View 목록을 로드하는 중...</p>
          </div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout 
      title="Views 관리" 
      subtitle="동적 쿼리를 생성하고 관리하세요"
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
            <Eye className="w-4 h-4 inline mr-2" />
            View 목록
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
            새 View 생성
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
                <h3 className="text-lg font-medium text-gray-900">등록된 View</h3>
                <p className="text-sm text-gray-500">총 {views.length}개의 View가 생성되어 있습니다.</p>
              </div>
              <button
                onClick={() => setActiveTab('create')}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Plus className="w-4 h-4" />
                새 View 생성
              </button>
            </div>

            {views.length === 0 ? (
              <div className="text-center py-12">
                <Eye className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  아직 생성된 View가 없습니다
                </h3>
                <p className="text-gray-600 mb-4">
                  첫 번째 동적 쿼리 View를 생성해보세요
                </p>
                <button
                  onClick={() => setActiveTab('create')}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  <Plus className="w-4 h-4" />
                  새 View 생성
                </button>
              </div>
            ) : (
              <div className="space-y-6">
                {views.map((view: any) => (
                  <div key={view.id} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                    {/* Header */}
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="font-semibold text-gray-900 text-lg">{view.title}</h3>
                          <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                            view.template.type === 'list' ? 'bg-blue-100 text-blue-800' :
                            view.template.type === 'grid' ? 'bg-green-100 text-green-800' :
                            view.template.type === 'table' ? 'bg-purple-100 text-purple-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {view.template.type === 'list' ? '목록' :
                             view.template.type === 'grid' ? '그리드' :
                             view.template.type === 'table' ? '테이블' : '커스텀'}
                          </span>
                        </div>
                        <p className="text-sm text-gray-500 mb-1">/{view.name}</p>
                        {view.description && (
                          <p className="text-gray-600 text-sm">{view.description}</p>
                        )}
                      </div>
                      
                      <div className="flex gap-2">
                        <button
                          onClick={() => previewView(view)}
                          className="p-2 text-gray-400 hover:text-green-600 transition-colors"
                          title="미리보기"
                        >
                          <Play className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => copyShortcode(view.shortcode)}
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
                          onClick={() => deleteView(view.id)}
                          className="p-2 text-gray-400 hover:text-red-600 transition-colors"
                          title="삭제"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* Query Info */}
                    <div className="bg-gray-50 rounded-lg p-4 mb-4">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                          <span className="text-sm text-gray-500">Post Type:</span>
                          <div className="font-medium">{availableCPTs.find((cpt: any) => cpt.slug === view.query.postType)?.name || view.query.postType}</div>
                        </div>
                        <div>
                          <span className="text-sm text-gray-500">필터:</span>
                          <div className="font-medium">{view.query.filters.length}개</div>
                        </div>
                        <div>
                          <span className="text-sm text-gray-500">페이지당 항목:</span>
                          <div className="font-medium">
                            {view.query.pagination.enabled ? 
                              view.query.pagination.itemsPerPage : '무제한'}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Shortcode */}
                    <div className="bg-gray-100 rounded-lg p-3 mb-4">
                      <div className="flex items-center justify-between">
                        <code className="text-sm text-gray-800">{view.shortcode}</code>
                        <button
                          onClick={() => copyShortcode(view.shortcode)}
                          className="flex items-center gap-1 px-2 py-1 text-xs bg-gray-200 hover:bg-gray-300 rounded transition-colors"
                        >
                          <Copy className="w-3 h-3" />
                          복사
                        </button>
                      </div>
                    </div>

                    {/* Template Fields */}
                    <div className="flex items-center gap-4 text-sm">
                      <div className="flex items-center gap-2">
                        <span className="text-gray-500">표시 필드:</span>
                        <div className="flex gap-1">
                          {view.template.fields.slice(0, 3).map((field: any) => (
                            <span key={field} className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs">
                              {field}
                            </span>
                          ))}
                          {view.template.fields.length > 3 && (
                            <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded text-xs">
                              +{view.template.fields.length - 3}개
                            </span>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <span className="text-gray-500">캐시:</span>
                        <span className={view.settings.cache ? 'text-green-600' : 'text-gray-400'}>
                          {view.settings.cache ? `${view.settings.cacheTime}분` : '사용 안함'}
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
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">새 View 생성</h3>
              <p className="text-gray-600 mt-1">동적 쿼리와 템플릿을 정의하세요</p>
            </div>
            
            <div className="space-y-6">
              {/* 기본 정보 */}
              <div className="bg-gray-50 rounded-lg p-6">
                <h4 className="text-md font-medium text-gray-900 mb-4">기본 정보</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      View 이름 *
                    </label>
                    <input
                      type="text"
                      value={newView.name}
                      onChange={(e: any) => setNewView((prev: any) => ({ ...prev, name: e.target.value }))}
                      placeholder="예: featured_products, recent_posts"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                    <p className="text-xs text-gray-500 mt-1">숏코드에 사용됩니다 (영문, 숫자, _ 만 사용)</p>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      표시 제목 *
                    </label>
                    <input
                      type="text"
                      value={newView.title}
                      onChange={(e: any) => setNewView((prev: any) => ({ ...prev, title: e.target.value }))}
                      placeholder="예: 추천 상품 목록"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      설명
                    </label>
                    <textarea
                      value={newView.description}
                      onChange={(e: any) => setNewView((prev: any) => ({ ...prev, description: e.target.value }))}
                      placeholder="이 View의 용도를 설명해주세요"
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>
              </div>

              {/* 쿼리 설정 */}
              <div className="bg-white border border-gray-200 rounded-lg p-6">
                <h4 className="text-md font-medium text-gray-900 mb-4">쿼리 설정</h4>
                
                {/* Post Type 선택 */}
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Post Type *
                  </label>
                  <select
                    value={newView.query.postType}
                    onChange={(e: any) => setNewView((prev: any) => ({
                      ...prev,
                      query: { ...prev.query, postType: e.target.value }
                    }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">Post Type 선택</option>
                    {availableCPTs.map((cpt: any) => (
                      <option key={cpt.slug} value={cpt.slug}>{cpt.name}</option>
                    ))}
                  </select>
                </div>

                {/* 필터 */}
                <div className="mb-6">
                  <div className="flex items-center justify-between mb-4">
                    <h5 className="font-medium text-gray-900">필터 조건</h5>
                    <button
                      onClick={addFilter}
                      disabled={!newView.query.postType}
                      className="flex items-center gap-2 px-3 py-2 text-sm bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      <Plus className="w-4 h-4" />
                      필터 추가
                    </button>
                  </div>

                  {newView.query.filters.length === 0 ? (
                    <div className="text-center py-4 border border-dashed border-gray-200 rounded">
                      <p className="text-gray-500 text-sm">필터를 추가해서 쿼리 조건을 설정하세요</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {newView.query.filters.map((filter, index) => (
                        <div key={filter.id} className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg bg-gray-50">
                          {index > 0 && (
                            <select
                              value={filter.relation}
                              onChange={(e: any) => updateFilter(filter.id, { relation: e.target.value as 'AND' | 'OR' })}
                              className="px-2 py-1 text-sm border border-gray-200 rounded"
                            >
                              <option value="AND">AND</option>
                              <option value="OR">OR</option>
                            </select>
                          )}
                          
                          <select
                            value={filter.field}
                            onChange={(e: any) => updateFilter(filter.id, { field: e.target.value })}
                            className="flex-1 px-2 py-1 text-sm border border-gray-200 rounded"
                          >
                            <option value="">필드 선택</option>
                            {getSelectedCPT()?.fields.map((field: any) => (
                              <option key={field.name} value={field.name}>{field.label}</option>
                            ))}
                          </select>
                          
                          <select
                            value={filter.operator}
                            onChange={(e: any) => updateFilter(filter.id, { operator: e.target.value as any })}
                            className="px-2 py-1 text-sm border border-gray-200 rounded"
                          >
                            {operators.map((op: any) => (
                              <option key={op.value} value={op.value}>{op.label}</option>
                            ))}
                          </select>
                          
                          <input
                            type="text"
                            value={Array.isArray(filter.value) ? filter.value.join(',') : filter.value}
                            onChange={(e: any) => updateFilter(filter.id, { value: e.target.value })}
                            placeholder="값"
                            className="flex-1 px-2 py-1 text-sm border border-gray-200 rounded"
                          />
                          
                          <button
                            onClick={() => removeFilter(filter.id)}
                            className="p-1 text-red-500 hover:text-red-700 transition-colors"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* 정렬 */}
                <div className="mb-6">
                  <div className="flex items-center justify-between mb-4">
                    <h5 className="font-medium text-gray-900">정렬</h5>
                    <button
                      onClick={addSort}
                      disabled={!newView.query.postType}
                      className="flex items-center gap-2 px-3 py-2 text-sm bg-green-100 text-green-700 rounded-lg hover:bg-green-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      <Plus className="w-4 h-4" />
                      정렬 추가
                    </button>
                  </div>

                  {newView.query.sorting.length === 0 ? (
                    <div className="text-center py-4 border border-dashed border-gray-200 rounded">
                      <p className="text-gray-500 text-sm">정렬 조건을 추가하세요</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {newView.query.sorting.map((sort, index) => (
                        <div key={index} className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg bg-gray-50">
                          <select
                            value={sort.field}
                            onChange={(e: any) => updateSort(index, { field: e.target.value })}
                            className="flex-1 px-2 py-1 text-sm border border-gray-200 rounded"
                          >
                            <option value="">필드 선택</option>
                            {getSelectedCPT()?.fields.map((field: any) => (
                              <option key={field.name} value={field.name}>{field.label}</option>
                            ))}
                          </select>
                          
                          <select
                            value={sort.direction}
                            onChange={(e: any) => updateSort(index, { direction: e.target.value as 'ASC' | 'DESC' })}
                            className="px-2 py-1 text-sm border border-gray-200 rounded"
                          >
                            <option value="ASC">오름차순</option>
                            <option value="DESC">내림차순</option>
                          </select>
                          
                          <button
                            onClick={() => removeSort(index)}
                            className="p-1 text-red-500 hover:text-red-700 transition-colors"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* 페이지네이션 */}
                <div>
                  <h5 className="font-medium text-gray-900 mb-4">페이지네이션</h5>
                  <div className="space-y-4">
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={newView.query.pagination.enabled}
                        onChange={(e: any) => setNewView((prev: any) => ({
                          ...prev,
                          query: {
                            ...prev.query,
                            pagination: { ...prev.query.pagination, enabled: e.target.checked }
                          }
                        }))}
                        className="mr-2"
                      />
                      <span className="text-sm text-gray-700">페이지네이션 사용</span>
                    </label>
                    
                    {newView.query.pagination.enabled && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            페이지당 항목 수
                          </label>
                          <input
                            type="number"
                            value={newView.query.pagination.itemsPerPage}
                            onChange={(e: any) => setNewView((prev: any) => ({
                              ...prev,
                              query: {
                                ...prev.query,
                                pagination: { 
                                  ...prev.query.pagination, 
                                  itemsPerPage: parseInt(e.target.value) || 10 
                                }
                              }
                            }))}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* 템플릿 설정 */}
              <div className="bg-white border border-gray-200 rounded-lg p-6">
                <h4 className="text-md font-medium text-gray-900 mb-4">템플릿 설정</h4>
                
                {/* 템플릿 타입 */}
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    템플릿 타입
                  </label>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    {[
                      { value: 'list', label: '목록', icon: List },
                      { value: 'grid', label: '그리드', icon: Grid },
                      { value: 'table', label: '테이블', icon: Hash },
                      { value: 'custom', label: '커스텀', icon: Code }
                    ].map((type: any) => (
                      <label key={type.value} className="relative">
                        <input
                          type="radio"
                          name="templateType"
                          value={type.value}
                          checked={newView.template.type === type.value}
                          onChange={(e: any) => setNewView((prev: any) => ({
                            ...prev,
                            template: { ...prev.template, type: e.target.value as any }
                          }))}
                          className="sr-only"
                        />
                        <div className={`p-4 border-2 rounded-lg cursor-pointer transition-colors text-center ${
                          newView.template.type === type.value 
                            ? 'border-blue-500 bg-blue-50' 
                            : 'border-gray-300 hover:border-gray-400'
                        }`}>
                          <type.icon className="w-6 h-6 mx-auto mb-2 text-gray-600" />
                          <div className="font-medium text-gray-900">{type.label}</div>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>

                {/* 표시 필드 */}
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    표시할 필드
                  </label>
                  {getSelectedCPT() ? (
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                      {getSelectedCPT()!.fields.map((field: any) => (
                        <label key={field.name} className="flex items-center">
                          <input
                            type="checkbox"
                            checked={newView.template.fields.includes(field.name)}
                            onChange={(e: any) => {
                              if (e.target.checked) {
                                setNewView((prev: any) => ({
                                  ...prev,
                                  template: {
                                    ...prev.template,
                                    fields: [...prev.template.fields, field.name]
                                  }
                                }));
                              } else {
                                setNewView((prev: any) => ({
                                  ...prev,
                                  template: {
                                    ...prev.template,
                                    fields: prev.template.fields.filter((f: any) => f !== field.name)
                                  }
                                }));
                              }
                            }}
                            className="mr-2"
                          />
                          <span className="text-sm text-gray-700">{field.label}</span>
                        </label>
                      ))}
                    </div>
                  ) : (
                    <p className="text-gray-500 text-sm">먼저 Post Type을 선택해주세요</p>
                  )}
                </div>

                {/* CSS 클래스 */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      래퍼 CSS 클래스
                    </label>
                    <input
                      type="text"
                      value={newView.template.wrapperClass}
                      onChange={(e: any) => setNewView((prev: any) => ({
                        ...prev,
                        template: { ...prev.template, wrapperClass: e.target.value }
                      }))}
                      placeholder="예: grid grid-cols-3 gap-4"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      아이템 CSS 클래스
                    </label>
                    <input
                      type="text"
                      value={newView.template.itemClass}
                      onChange={(e: any) => setNewView((prev: any) => ({
                        ...prev,
                        template: { ...prev.template, itemClass: e.target.value }
                      }))}
                      placeholder="예: bg-white rounded-lg shadow p-4"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>
              </div>

              {/* 액션 버튼 */}
              <div className="flex justify-end gap-3 pt-6 border-t border-gray-200">
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
                  onClick={createView}
                  disabled={!newView.name || !newView.title || !newView.query.postType}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <Save className="w-4 h-4" />
                  View 생성
                </button>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'preview' && editingView && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">View 미리보기</h3>
                <p className="text-gray-600 mt-1">{editingView.title}</p>
              </div>
              <button
                onClick={() => setActiveTab('list')}
                className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                목록으로 돌아가기
              </button>
            </div>

            {/* Preview Content */}
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <h4 className="text-md font-medium text-gray-900 mb-4">
                렌더링 결과 (샘플 데이터)
              </h4>
              
              <div className="bg-gray-50 rounded-lg p-6">
                <div className={editingView.template.wrapperClass || 'space-y-4'}>
                  {previewData.map((item, index) => (
                    <div key={index} className={editingView.template.itemClass || 'bg-white p-4 rounded border'}>
                      {editingView.template.fields.map((field: any) => (
                        <div key={field} className="mb-2">
                          <span className="font-medium text-sm text-gray-700">{field}:</span>
                          <span className="ml-2 text-sm text-gray-900">
                            {item[field] || `샘플 ${field}`}
                          </span>
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-6 p-4 bg-blue-50 rounded-lg">
                <h5 className="font-medium text-blue-900 mb-2">숏코드</h5>
                <code className="text-blue-800 bg-blue-100 px-2 py-1 rounded">
                  {editingView.shortcode}
                </code>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
};

export default ViewsManager;