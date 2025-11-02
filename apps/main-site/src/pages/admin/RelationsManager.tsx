import { useState, useEffect, FC } from 'react';
import { Plus, Eye } from 'lucide-react';
import AdminLayout from '../../components/admin/AdminLayout';
import { RelationsList } from '../../components/admin/relations/RelationsList';
import { RelationCreateForm } from '../../components/admin/relations/RelationCreateForm';
import type { Relation, RelationFormData, AvailableCPT } from '../../types/relations';

const RelationsManager: FC = () => {
  const [relations, setRelations] = useState<Relation[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'list' | 'create' | 'edit'>('list');
  const [editingRelation, setEditingRelation] = useState<Relation | null>(null);

  // 새 관계 생성 폼 상태
  const [newRelation, setNewRelation] = useState<RelationFormData>({
    name: '',
    label: '',
    description: '',
    type: 'one-to-many',
    from: {
      postType: '',
      label: '',
      fieldName: '',
      maxItems: undefined,
      required: false
    },
    to: {
      postType: '',
      label: '',
      fieldName: '',
      maxItems: undefined,
      required: false
    },
    bidirectional: true,
    settings: {
      sortable: false,
      duplicates: false,
      deleteAction: 'set_null'
    }
  });

  // 사용 가능한 CPT 목록 (Mock - would come from API)
  const [availableCPTs] = useState<AvailableCPT[]>([
    { slug: 'post', name: '글', icon: '📝' },
    { slug: 'page', name: '페이지', icon: '📄' },
    { slug: 'product', name: '상품', icon: '📦' },
    { slug: 'brand', name: '브랜드', icon: '🏢' },
    { slug: 'category', name: '카테고리', icon: '📂' },
    { slug: 'event', name: '이벤트', icon: '📅' },
    { slug: 'service', name: '서비스', icon: '🛠️' },
    { slug: 'team', name: '팀원', icon: '👥' },
    { slug: 'portfolio', name: '포트폴리오', icon: '💼' },
    { slug: 'testimonial', name: '후기', icon: '💬' }
  ]);

  useEffect(() => {
    loadRelations();
  }, []);

  const loadRelations = async () => {
    try {
      // Mock data for demonstration
      const mockRelations: Relation[] = [
        {
          id: 'rel_1',
          name: 'product_brand',
          label: '상품-브랜드 관계',
          description: '각 상품은 하나의 브랜드에 속하고, 브랜드는 여러 상품을 가질 수 있습니다',
          type: 'one-to-many',
          from: {
            postType: 'brand',
            label: '브랜드',
            fieldName: 'products',
            required: false
          },
          to: {
            postType: 'product',
            label: '상품',
            fieldName: 'brand',
            maxItems: 1,
            required: true
          },
          bidirectional: true,
          settings: {
            sortable: true,
            duplicates: false,
            deleteAction: 'set_null'
          },
          active: true,
          createdAt: '2025-01-01',
          updatedAt: '2025-01-15'
        },
        {
          id: 'rel_2',
          name: 'event_team',
          label: '이벤트-팀원 관계',
          description: '이벤트는 여러 팀원이 담당하고, 팀원은 여러 이벤트를 담당할 수 있습니다',
          type: 'many-to-many',
          from: {
            postType: 'event',
            label: '이벤트',
            fieldName: 'team_members',
            required: false
          },
          to: {
            postType: 'team',
            label: '팀원',
            fieldName: 'events',
            required: false
          },
          bidirectional: true,
          settings: {
            sortable: true,
            duplicates: false,
            deleteAction: 'restrict'
          },
          active: true,
          createdAt: '2025-01-02',
          updatedAt: '2025-01-12'
        },
        {
          id: 'rel_3',
          name: 'portfolio_testimonial',
          label: '포트폴리오-후기 관계',
          description: '각 포트폴리오는 하나의 고객 후기를 가집니다',
          type: 'one-to-one',
          from: {
            postType: 'portfolio',
            label: '포트폴리오',
            fieldName: 'testimonial',
            maxItems: 1,
            required: false
          },
          to: {
            postType: 'testimonial',
            label: '후기',
            fieldName: 'portfolio',
            maxItems: 1,
            required: true
          },
          bidirectional: true,
          settings: {
            sortable: false,
            duplicates: false,
            deleteAction: 'cascade'
          },
          active: true,
          createdAt: '2025-01-03',
          updatedAt: '2025-01-10'
        }
      ];

      setRelations(mockRelations);
    } catch (error: unknown) {
      // Error logging - use proper error handler
      console.error('Failed to load relations:', error);
    } finally {
      setLoading(false);
    }
  };

  const createRelation = async () => {
    try {
      const relationData = {
        ...newRelation,
        id: `rel_${Date.now()}`,
        active: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      // API 호출 (Mock)
      
      await loadRelations();
      resetForm();
      setActiveTab('list');
      alert('✅ 관계가 성공적으로 생성되었습니다!');
    } catch (error: unknown) {
      // Error logging - use proper error handler
      console.error('Failed to create relation:', error);
      alert('❌ 관계 생성 중 오류가 발생했습니다.');
    }
  };

  const deleteRelation = async (id: string) => {
    if (!confirm('정말로 이 관계를 삭제하시겠습니까? 기존 연결된 데이터는 유지되지만 관계 필드는 제거됩니다.')) return;

    try {
      // API 호출 (Mock)

      setRelations(prev => prev.filter(rel => rel.id !== id));
      alert('✅ 관계가 삭제되었습니다.');
    } catch (error: unknown) {
      // Error logging - use proper error handler
      console.error('Failed to delete relation:', error);
      alert('❌ 삭제 중 오류가 발생했습니다.');
    }
  };

  const resetForm = () => {
    setNewRelation({
      name: '',
      label: '',
      description: '',
      type: 'one-to-many',
      from: {
        postType: '',
        label: '',
        fieldName: '',
        maxItems: undefined,
        required: false
      },
      to: {
        postType: '',
        label: '',
        fieldName: '',
        maxItems: undefined,
        required: false
      },
      bidirectional: true,
      settings: {
        sortable: false,
        duplicates: false,
        deleteAction: 'set_null'
      }
    });
  };

  const getRelationTypeIcon = (type: string) => {
    switch (type) {
      case 'one-to-one': return <ArrowRight className="w-5 h-5" />;
      case 'one-to-many': return <ArrowRight className="w-5 h-5" />;
      case 'many-to-many': return <ArrowLeftRight className="w-5 h-5" />;
      default: return <Link className="w-5 h-5" />;
    }
  };

  const getRelationTypeLabel = (type: string) => {
    switch (type) {
      case 'one-to-one': return '1:1 (일대일)';
      case 'one-to-many': return '1:N (일대다)';
      case 'many-to-many': return 'N:N (다대다)';
      default: return type;
    }
  };

  const getCPTIcon = (slug: string) => {
    const cpt = availableCPTs.find(c => c.slug === slug);
    return cpt?.icon || '📄';
  };

  const getCPTName = (slug: string) => {
    const cpt = availableCPTs.find(c => c.slug === slug);
    return cpt?.name || slug;
  };

  // 관계 타입에 따른 maxItems 자동 설정
  const updateRelationType = (type: 'one-to-one' | 'one-to-many' | 'many-to-many') => {
    const updates: Partial<RelationFormData> = { type };

    if (type === 'one-to-one') {
      updates.from = { ...newRelation.from, maxItems: 1 };
      updates.to = { ...newRelation.to, maxItems: 1 };
    } else if (type === 'one-to-many') {
      updates.from = { ...newRelation.from, maxItems: undefined };
      updates.to = { ...newRelation.to, maxItems: 1 };
    } else if (type === 'many-to-many') {
      updates.from = { ...newRelation.from, maxItems: undefined };
      updates.to = { ...newRelation.to, maxItems: undefined };
    }

    setNewRelation(prev => ({ ...prev, ...updates }));
  };

  if (loading) {
    return (
      <AdminLayout title="Relations 관리" subtitle="Post Type 간의 관계를 정의하고 관리하세요">
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
            <p className="text-gray-600">관계 목록을 로드하는 중...</p>
          </div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout 
      title="Relations 관리" 
      subtitle="Post Type 간의 관계를 정의하고 관리하세요"
      fullWidth={activeTab === 'create'}
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
            관계 목록
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
            새 관계 생성
          </button>
        </nav>
      </div>

      {/* Content */}
      <div className="p-6">
        {activeTab === 'list' && (
          <RelationsList
            relations={relations}
            availableCPTs={availableCPTs}
            onCreateClick={() => setActiveTab('create')}
            onEdit={(relation) => {/* TODO: 편집 기능 */}}
            onDelete={deleteRelation}
          />
        )}

        {activeTab === 'create' && (
          <RelationCreateForm
            formData={newRelation}
            availableCPTs={availableCPTs}
            onFormChange={setNewRelation}
            onUpdateRelationType={updateRelationType}
            onSubmit={createRelation}
            onCancel={() => {
              resetForm();
              setActiveTab('list');
            }}
          />
        )}
      </div>
    </AdminLayout>
  );
};

export default RelationsManager;
