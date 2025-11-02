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
import { ViewsList } from '../../components/admin/views/ViewsList';
import { ViewCreateForm } from '../../components/admin/views/ViewCreateForm';
import { ViewPreview } from '../../components/admin/views/ViewPreview';
import type { View, QueryFilter, QuerySort, ViewQuery, ViewTemplate, AvailableCPT, ViewFormData } from '../../types/views';

const ViewsManager: FC = () => {
  const [views, setViews] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'list' | 'create' | 'edit' | 'preview'>('list');
  const [editingView, setEditingView] = useState<View | null>(null);
  const [previewData, setPreviewData] = useState<any[]>([]);

  // 새 View 생성 폼 상태
  const [newView, setNewView] = useState<ViewFormData>({
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
  const [availableCPTs] = useState<AvailableCPT[]>([
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
          <ViewsList
            views={views}
            availableCPTs={availableCPTs}
            onCreateClick={() => setActiveTab('create')}
            onPreview={previewView}
            onCopyShortcode={copyShortcode}
            onEdit={(view) => {/* TODO: 편집 기능 */}}
            onDelete={deleteView}
          />
        )}

        {activeTab === 'create' && (
          <ViewCreateForm
            formData={newView}
            availableCPTs={availableCPTs}
            operators={operators}
            onFormChange={setNewView}
            onAddFilter={addFilter}
            onUpdateFilter={updateFilter}
            onRemoveFilter={removeFilter}
            onAddSort={addSort}
            onUpdateSort={updateSort}
            onRemoveSort={removeSort}
            onSubmit={createView}
            onCancel={() => {
              resetForm();
              setActiveTab('list');
            }}
          />
        )}


        {activeTab === 'preview' && editingView && (
          <ViewPreview
            view={editingView}
            previewData={previewData}
            onBack={() => setActiveTab('list')}
          />
        )}
      </div>
    </AdminLayout>
  );
};

export default ViewsManager;