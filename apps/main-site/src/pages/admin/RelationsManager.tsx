import { useState, useEffect, FC } from 'react';
import { 
  Plus, 
  Edit3, 
  Trash2, 
  Save,
  X,
  ArrowRight,
  ArrowLeftRight,
  Users,
  Package,
  Building,
  Calendar,
  Link,
  Database,
  Settings
} from 'lucide-react';
import AdminLayout from '../../components/admin/AdminLayout';

interface RelationEndpoint {
  postType: string;
  label: string;
  fieldName: string;
  maxItems?: number; // 연결 가능한 최대 항목 수 (무제한일 경우 undefined)
  required: boolean;
}

interface Relation {
  id: string;
  name: string;
  label: string;
  description?: string;
  type: 'one-to-one' | 'one-to-many' | 'many-to-many';
  from: RelationEndpoint;
  to: RelationEndpoint;
  bidirectional: boolean; // 양방향 관계 여부
  settings: {
    sortable: boolean; // 정렬 가능 여부
    duplicates: boolean; // 중복 연결 허용
    deleteAction: 'cascade' | 'restrict' | 'set_null'; // 삭제 시 동작
  };
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

const RelationsManager: FC = () => {
  const [relations, setRelations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'list' | 'create' | 'edit'>('list');
  const [editingRelation, setEditingRelation] = useState<Relation | null>(null);

  // 새 관계 생성 폼 상태
  const [newRelation, setNewRelation] = useState({
    name: '',
    label: '',
    description: '',
    type: 'one-to-many' as 'one-to-one' | 'one-to-many' | 'many-to-many',
    from: {
      postType: '',
      label: '',
      fieldName: '',
      maxItems: undefined as number | undefined,
      required: false
    },
    to: {
      postType: '',
      label: '',
      fieldName: '',
      maxItems: undefined as number | undefined,
      required: false
    },
    bidirectional: true,
    settings: {
      sortable: false,
      duplicates: false,
      deleteAction: 'set_null' as 'cascade' | 'restrict' | 'set_null'
    }
  });

  // 사용 가능한 CPT 목록 (Mock)
  const [availableCPTs] = useState([
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
    } catch (error: any) {
    // Error logging - use proper error handler
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
    } catch (error: any) {
    // Error logging - use proper error handler
      alert('❌ 관계 생성 중 오류가 발생했습니다.');
    }
  };

  const deleteRelation = async (id: string) => {
    if (!confirm('정말로 이 관계를 삭제하시겠습니까? 기존 연결된 데이터는 유지되지만 관계 필드는 제거됩니다.')) return;

    try {
      // API 호출 (Mock)
      
      setRelations((prev: any) => prev.filter((rel: any) => rel.id !== id));
      alert('✅ 관계가 삭제되었습니다.');
    } catch (error: any) {
    // Error logging - use proper error handler
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
    const cpt = availableCPTs.find((c: any) => c.slug === slug);
    return cpt?.icon || '📄';
  };

  const getCPTName = (slug: string) => {
    const cpt = availableCPTs.find((c: any) => c.slug === slug);
    return cpt?.name || slug;
  };

  // 관계 타입에 따른 maxItems 자동 설정
  const updateRelationType = (type: 'one-to-one' | 'one-to-many' | 'many-to-many') => {
    const updates: any = { type };
    
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
    
    setNewRelation((prev: any) => ({ ...prev, ...updates }));
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
            <Link className="w-4 h-4 inline mr-2" />
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
          <div className="space-y-6">
            {/* Action Bar */}
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-lg font-medium text-gray-900">등록된 관계</h3>
                <p className="text-sm text-gray-500">총 {relations.length}개의 관계가 정의되어 있습니다.</p>
              </div>
              <button
                onClick={() => setActiveTab('create')}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Plus className="w-4 h-4" />
                새 관계 생성
              </button>
            </div>

            {relations.length === 0 ? (
              <div className="text-center py-12">
                <Link className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  아직 생성된 관계가 없습니다
                </h3>
                <p className="text-gray-600 mb-4">
                  첫 번째 Post Type 관계를 생성해보세요
                </p>
                <button
                  onClick={() => setActiveTab('create')}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  <Plus className="w-4 h-4" />
                  새 관계 생성
                </button>
              </div>
            ) : (
              <div className="space-y-6">
                {relations.map((relation: any) => (
                  <div key={relation.id} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                    {/* Header */}
                    <div className="flex items-start justify-between mb-6">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="font-semibold text-gray-900 text-lg">{relation.label}</h3>
                          <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                            relation.type === 'one-to-one' ? 'bg-green-100 text-green-800' :
                            relation.type === 'one-to-many' ? 'bg-blue-100 text-blue-800' :
                            'bg-purple-100 text-purple-800'
                          }`}>
                            {getRelationTypeLabel(relation.type)}
                          </span>
                          {relation.bidirectional && (
                            <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs">
                              양방향
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-gray-500 mb-1">/{relation.name}</p>
                        {relation.description && (
                          <p className="text-gray-600 text-sm">{relation.description}</p>
                        )}
                      </div>
                      
                      <div className="flex gap-2">
                        <button
                          onClick={() => {/* TODO: 편집 기능 */}}
                          className="p-2 text-gray-400 hover:text-blue-600 transition-colors"
                          title="편집"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => deleteRelation(relation.id)}
                          className="p-2 text-gray-400 hover:text-red-600 transition-colors"
                          title="삭제"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* Relation Visualization */}
                    <div className="bg-gray-50 rounded-lg p-6 mb-4">
                      <div className="flex items-center justify-between">
                        {/* From */}
                        <div className="flex-1 text-center">
                          <div className="inline-flex items-center gap-3 p-4 bg-white rounded-lg border border-gray-200">
                            <span className="text-2xl">{getCPTIcon(relation.from.postType)}</span>
                            <div className="text-left">
                              <div className="font-medium text-gray-900">{getCPTName(relation.from.postType)}</div>
                              <div className="text-sm text-gray-500">{relation.from.label}</div>
                              <div className="text-xs text-gray-400">필드: {relation.from.fieldName}</div>
                            </div>
                          </div>
                        </div>

                        {/* Arrow */}
                        <div className="flex-shrink-0 mx-6">
                          <div className="flex items-center gap-2 text-gray-400">
                            {getRelationTypeIcon(relation.type)}
                            <span className="text-xs font-medium">
                              {relation.type === 'one-to-one' ? '1:1' :
                               relation.type === 'one-to-many' ? '1:N' : 'N:N'}
                            </span>
                          </div>
                        </div>

                        {/* To */}
                        <div className="flex-1 text-center">
                          <div className="inline-flex items-center gap-3 p-4 bg-white rounded-lg border border-gray-200">
                            <span className="text-2xl">{getCPTIcon(relation.to.postType)}</span>
                            <div className="text-left">
                              <div className="font-medium text-gray-900">{getCPTName(relation.to.postType)}</div>
                              <div className="text-sm text-gray-500">{relation.to.label}</div>
                              <div className="text-xs text-gray-400">필드: {relation.to.fieldName}</div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Settings */}
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-6">
                        <div className="flex items-center gap-2">
                          <span className="text-gray-500">정렬 가능:</span>
                          <span className={relation.settings.sortable ? 'text-green-600' : 'text-gray-400'}>
                            {relation.settings.sortable ? '예' : '아니오'}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-gray-500">중복 허용:</span>
                          <span className={relation.settings.duplicates ? 'text-green-600' : 'text-gray-400'}>
                            {relation.settings.duplicates ? '예' : '아니오'}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-gray-500">삭제 동작:</span>
                          <span className="font-medium">
                            {relation.settings.deleteAction === 'cascade' ? '연쇄 삭제' :
                             relation.settings.deleteAction === 'restrict' ? '삭제 제한' : 'NULL 설정'}
                          </span>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <span className="text-gray-500">상태:</span>
                        <span className={`px-2 py-1 rounded-full text-xs ${
                          relation.active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                        }`}>
                          {relation.active ? '활성' : '비활성'}
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
              <h3 className="text-lg font-semibold text-gray-900">새 관계 생성</h3>
              <p className="text-gray-600 mt-1">Post Type 간의 관계를 정의하세요</p>
            </div>
            
            <div className="space-y-6">
              {/* 기본 정보 */}
              <div className="bg-gray-50 rounded-lg p-6">
                <h4 className="text-md font-medium text-gray-900 mb-4">기본 정보</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      관계명 *
                    </label>
                    <input
                      type="text"
                      value={newRelation.name}
                      onChange={(e: any) => setNewRelation((prev: any) => ({ ...prev, name: e.target.value }))}
                      placeholder="예: product_brand, event_team"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                    <p className="text-xs text-gray-500 mt-1">내부적으로 사용되는 이름 (영문, 숫자, _ 만 사용)</p>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      표시 라벨 *
                    </label>
                    <input
                      type="text"
                      value={newRelation.label}
                      onChange={(e: any) => setNewRelation((prev: any) => ({ ...prev, label: e.target.value }))}
                      placeholder="예: 상품-브랜드 관계"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      설명
                    </label>
                    <textarea
                      value={newRelation.description}
                      onChange={(e: any) => setNewRelation((prev: any) => ({ ...prev, description: e.target.value }))}
                      placeholder="이 관계의 목적과 사용법을 설명해주세요"
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>
              </div>

              {/* 관계 타입 */}
              <div className="bg-white border border-gray-200 rounded-lg p-6">
                <h4 className="text-md font-medium text-gray-900 mb-4">관계 타입</h4>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                  {[
                    { 
                      value: 'one-to-one', 
                      label: '일대일 (1:1)', 
                      desc: '한 항목이 다른 한 항목과만 연결',
                      example: '포트폴리오 ↔ 후기' 
                    },
                    { 
                      value: 'one-to-many', 
                      label: '일대다 (1:N)', 
                      desc: '한 항목이 여러 항목과 연결',
                      example: '브랜드 → 상품들' 
                    },
                    { 
                      value: 'many-to-many', 
                      label: '다대다 (N:N)', 
                      desc: '여러 항목이 서로 여러 항목과 연결',
                      example: '이벤트 ↔ 팀원들' 
                    }
                  ].map((type: any) => (
                    <label key={type.value} className="relative">
                      <input
                        type="radio"
                        name="relationType"
                        value={type.value}
                        checked={newRelation.type === type.value}
                        onChange={(e: any) => updateRelationType(e.target.value as any)}
                        className="sr-only"
                      />
                      <div className={`p-4 border-2 rounded-lg cursor-pointer transition-colors ${
                        newRelation.type === type.value 
                          ? 'border-blue-500 bg-blue-50' 
                          : 'border-gray-300 hover:border-gray-400'
                      }`}>
                        <div className="font-medium text-gray-900 mb-1">{type.label}</div>
                        <div className="text-sm text-gray-500 mb-2">{type.desc}</div>
                        <div className="text-xs text-gray-400">{type.example}</div>
                      </div>
                    </label>
                  ))}
                </div>

                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={newRelation.bidirectional}
                    onChange={(e: any) => setNewRelation((prev: any) => ({ ...prev, bidirectional: e.target.checked }))}
                    className="mr-2"
                  />
                  <span className="text-sm text-gray-700">양방향 관계 (두 Post Type 모두에 관계 필드 생성)</span>
                </label>
              </div>

              {/* 관계 설정 */}
              <div className="bg-white border border-gray-200 rounded-lg p-6">
                <h4 className="text-md font-medium text-gray-900 mb-4">관계 설정</h4>
                
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  {/* From */}
                  <div className="space-y-4">
                    <h5 className="font-medium text-gray-900 flex items-center gap-2">
                      <Package className="w-4 h-4" />
                      From (출발점)
                    </h5>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Post Type *
                      </label>
                      <select
                        value={newRelation.from.postType}
                        onChange={(e: any) => setNewRelation((prev: any) => ({
                          ...prev,
                          from: { ...prev.from, postType: e.target.value }
                        }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      >
                        <option value="">Post Type 선택</option>
                        {availableCPTs.map((cpt: any) => (
                          <option key={cpt.slug} value={cpt.slug}>
                            {cpt.icon} {cpt.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        필드 라벨 *
                      </label>
                      <input
                        type="text"
                        value={newRelation.from.label}
                        onChange={(e: any) => setNewRelation((prev: any) => ({
                          ...prev,
                          from: { ...prev.from, label: e.target.value }
                        }))}
                        placeholder="예: 상품들, 팀원들"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        필드명 *
                      </label>
                      <input
                        type="text"
                        value={newRelation.from.fieldName}
                        onChange={(e: any) => setNewRelation((prev: any) => ({
                          ...prev,
                          from: { ...prev.from, fieldName: e.target.value }
                        }))}
                        placeholder="예: products, team_members"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                    
                    {newRelation.type !== 'many-to-many' && newRelation.type !== 'one-to-many' && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          최대 연결 수
                        </label>
                        <input
                          type="number"
                          value={newRelation.from.maxItems || ''}
                          onChange={(e: any) => setNewRelation((prev: any) => ({
                            ...prev,
                            from: { 
                              ...prev.from, 
                              maxItems: e.target.value ? parseInt(e.target.value) : undefined 
                            }
                          }))}
                          placeholder="무제한일 경우 비워두세요"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>
                    )}
                    
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={newRelation.from.required}
                        onChange={(e: any) => setNewRelation((prev: any) => ({
                          ...prev,
                          from: { ...prev.from, required: e.target.checked }
                        }))}
                        className="mr-2"
                      />
                      <span className="text-sm text-gray-700">필수 필드</span>
                    </label>
                  </div>

                  {/* To */}
                  <div className="space-y-4">
                    <h5 className="font-medium text-gray-900 flex items-center gap-2">
                      <Database className="w-4 h-4" />
                      To (도착점)
                    </h5>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Post Type *
                      </label>
                      <select
                        value={newRelation.to.postType}
                        onChange={(e: any) => setNewRelation((prev: any) => ({
                          ...prev,
                          to: { ...prev.to, postType: e.target.value }
                        }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      >
                        <option value="">Post Type 선택</option>
                        {availableCPTs.map((cpt: any) => (
                          <option key={cpt.slug} value={cpt.slug}>
                            {cpt.icon} {cpt.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        필드 라벨 *
                      </label>
                      <input
                        type="text"
                        value={newRelation.to.label}
                        onChange={(e: any) => setNewRelation((prev: any) => ({
                          ...prev,
                          to: { ...prev.to, label: e.target.value }
                        }))}
                        placeholder="예: 브랜드, 이벤트들"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        필드명 *
                      </label>
                      <input
                        type="text"
                        value={newRelation.to.fieldName}
                        onChange={(e: any) => setNewRelation((prev: any) => ({
                          ...prev,
                          to: { ...prev.to, fieldName: e.target.value }
                        }))}
                        placeholder="예: brand, events"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                    
                    {newRelation.type !== 'many-to-many' && newRelation.type !== 'one-to-many' && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          최대 연결 수
                        </label>
                        <input
                          type="number"
                          value={newRelation.to.maxItems || ''}
                          onChange={(e: any) => setNewRelation((prev: any) => ({
                            ...prev,
                            to: { 
                              ...prev.to, 
                              maxItems: e.target.value ? parseInt(e.target.value) : undefined 
                            }
                          }))}
                          placeholder="무제한일 경우 비워두세요"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>
                    )}
                    
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={newRelation.to.required}
                        onChange={(e: any) => setNewRelation((prev: any) => ({
                          ...prev,
                          to: { ...prev.to, required: e.target.checked }
                        }))}
                        className="mr-2"
                      />
                      <span className="text-sm text-gray-700">필수 필드</span>
                    </label>
                  </div>
                </div>
              </div>

              {/* 고급 설정 */}
              <div className="bg-white border border-gray-200 rounded-lg p-6">
                <h4 className="text-md font-medium text-gray-900 mb-4">고급 설정</h4>
                
                <div className="space-y-4">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={newRelation.settings.sortable}
                      onChange={(e: any) => setNewRelation((prev: any) => ({
                        ...prev,
                        settings: { ...prev.settings, sortable: e.target.checked }
                      }))}
                      className="mr-2"
                    />
                    <span className="text-sm text-gray-700">정렬 가능 (드래그 앤 드롭으로 순서 변경)</span>
                  </label>
                  
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={newRelation.settings.duplicates}
                      onChange={(e: any) => setNewRelation((prev: any) => ({
                        ...prev,
                        settings: { ...prev.settings, duplicates: e.target.checked }
                      }))}
                      className="mr-2"
                    />
                    <span className="text-sm text-gray-700">중복 연결 허용</span>
                  </label>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      연결된 항목 삭제 시 동작
                    </label>
                    <select
                      value={newRelation.settings.deleteAction}
                      onChange={(e: any) => setNewRelation((prev: any) => ({
                        ...prev,
                        settings: { 
                          ...prev.settings, 
                          deleteAction: e.target.value as 'cascade' | 'restrict' | 'set_null' 
                        }
                      }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="set_null">NULL로 설정 (관계만 제거)</option>
                      <option value="restrict">삭제 제한 (연결된 항목이 있으면 삭제 불가)</option>
                      <option value="cascade">연쇄 삭제 (연결된 항목도 함께 삭제)</option>
                    </select>
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
                  onClick={createRelation}
                  disabled={!newRelation.name || !newRelation.label || !newRelation.from.postType || !newRelation.to.postType}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <Save className="w-4 h-4" />
                  관계 생성
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
};

export default RelationsManager;