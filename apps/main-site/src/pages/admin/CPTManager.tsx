// 🛠️ Custom Post Type 관리자 페이지

import { useState, FC, ChangeEvent } from 'react';
import {
  Plus,
  Edit3,
  Trash2,
  Database,
  Settings,
  Eye,
  Save,
  X,
  Type,
  List,
  Calendar,
  Image as ImageIcon,
  Hash,
  Mail,
  Link,
  CheckSquare
} from 'lucide-react';
import { useManagerCRUD } from '../../hooks/admin/useManagerCRUD';
import AdminLayout from '../../components/admin/AdminLayout';

interface FieldSchema {
  id: string;
  name: string;
  label: string;
  type: 'text' | 'textarea' | 'number' | 'date' | 'select' | 'checkbox' | 'image' | 'url' | 'email';
  required: boolean;
  description?: string;
  placeholder?: string;
  options?: string[];
}

interface FieldGroup {
  id: string;
  name: string;
  description?: string;
  fields: FieldSchema[];
  order: number;
}

interface CustomPostType {
  slug: string;
  name: string;
  singularName: string;
  description?: string;
  icon: string;
  fieldGroups: FieldGroup[];
  settings: {
    public: boolean;
    hasArchive: boolean;
    supports: string[];
  };
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

interface NewCPTForm {
  slug: string;
  name: string;
  singularName: string;
  description: string;
  icon: string;
  fieldGroups: FieldGroup[];
  settings: {
    public: boolean;
    hasArchive: boolean;
    supports: string[];
  };
}

const CPTManager: FC = () => {
  // Use the generic CRUD hook
  const {
    data: cpts,
    isLoading: loading,
    create,
    remove,
    isCreating,
    isDeleting
  } = useManagerCRUD<CustomPostType>('/cpt/types', {
    onCreateSuccess: () => {
      resetForm();
      setActiveTab('list');
      alert('✅ CPT가 성공적으로 생성되었습니다!');
    },
    onDeleteSuccess: () => {
      alert('✅ CPT가 삭제되었습니다.');
    },
    onError: (error: unknown) => {
      const message = (error as { response?: { data?: { message?: string } } })?.response?.data?.message || '오류가 발생했습니다.';
      alert(`❌ 실패: ${message}`);
    }
  });

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingCPT, setEditingCPT] = useState<CustomPostType | null>(null);
  const [activeTab, setActiveTab] = useState<'list' | 'create' | 'edit'>('list');

  // 새 CPT 생성 폼 상태
  const [newCPT, setNewCPT] = useState<NewCPTForm>({
    slug: '',
    name: '',
    singularName: '',
    description: '',
    icon: '📄',
    fieldGroups: [] as FieldGroup[],
    settings: {
      public: true,
      hasArchive: true,
      supports: ['title']
    }
  });

  const createCPT = () => {
    create(newCPT);
  };

  const deleteCPT = (slug: string) => {
    if (!confirm('정말로 이 CPT를 삭제하시겠습니까?')) return;
    remove(slug);
  };

  const resetForm = () => {
    setNewCPT({
      slug: '',
      name: '',
      singularName: '',
      description: '',
      icon: '📄',
      fieldGroups: [],
      settings: {
        public: true,
        hasArchive: true,
        supports: ['title']
      }
    });
  };

  const addFieldGroup = () => {
    const newGroup: FieldGroup = {
      id: `group_${Date.now()}`,
      name: `필드 그룹 ${newCPT.fieldGroups.length + 1}`,
      description: '',
      fields: [],
      order: newCPT.fieldGroups.length
    };

    setNewCPT(prev => ({
      ...prev,
      fieldGroups: [...prev.fieldGroups, newGroup]
    }));
  };

  const addField = (groupId: string) => {
    const newField: FieldSchema = {
      id: `field_${Date.now()}`,
      name: '',
      label: '',
      type: 'text',
      required: false,
      description: '',
      placeholder: ''
    };

    setNewCPT(prev => ({
      ...prev,
      fieldGroups: prev.fieldGroups.map(group =>
        group.id === groupId
          ? { ...group, fields: [...group.fields, newField] }
          : group
      )
    }));
  };

  const updateField = (groupId: string, fieldId: string, updates: Partial<FieldSchema>) => {
    setNewCPT(prev => ({
      ...prev,
      fieldGroups: prev.fieldGroups.map(group =>
        group.id === groupId
          ? {
              ...group,
              fields: group.fields.map(field =>
                field.id === fieldId ? { ...field, ...updates } : field
              )
            }
          : group
      )
    }));
  };

  const removeField = (groupId: string, fieldId: string) => {
    setNewCPT(prev => ({
      ...prev,
      fieldGroups: prev.fieldGroups.map(group =>
        group.id === groupId
          ? { ...group, fields: group.fields.filter(field => field.id !== fieldId) }
          : group
      )
    }));
  };

  const getFieldIcon = (type: string) => {
    switch (type) {
      case 'text': return <Type className="w-4 h-4" />;
      case 'textarea': return <List className="w-4 h-4" />;
      case 'number': return <Hash className="w-4 h-4" />;
      case 'date': return <Calendar className="w-4 h-4" />;
      case 'image': return <ImageIcon className="w-4 h-4" />;
      case 'email': return <Mail className="w-4 h-4" />;
      case 'url': return <Link className="w-4 h-4" />;
      case 'checkbox': return <CheckSquare className="w-4 h-4" />;
      default: return <Type className="w-4 h-4" />;
    }
  };

  if (loading) {
    return (
      <AdminLayout title="Custom Post Type 관리" subtitle="사용자 정의 콘텐츠 타입을 생성하고 관리하세요">
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
            <p className="text-gray-600">CPT 목록을 로드하는 중...</p>
          </div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout 
      title="Custom Post Type 관리" 
      subtitle="사용자 정의 콘텐츠 타입을 생성하고 관리하세요"
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
            <Database className="w-4 h-4 inline mr-2" />
            CPT 목록
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
            새 CPT 생성
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
                <h3 className="text-lg font-medium text-gray-900">등록된 CPT 목록</h3>
                <p className="text-sm text-gray-500">총 {cpts?.length || 0}개의 Custom Post Type이 등록되어 있습니다.</p>
              </div>
              <button
                onClick={() => setActiveTab('create')}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Plus className="w-4 h-4" />
                새 CPT 생성
              </button>
            </div>

            {!cpts || cpts.length === 0 ? (
              <div className="text-center py-12">
                <Database className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  아직 생성된 CPT가 없습니다
                </h3>
                <p className="text-gray-600 mb-4">
                  첫 번째 Custom Post Type을 생성해보세요
                </p>
                <button
                  onClick={() => setActiveTab('create')}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  <Plus className="w-4 h-4" />
                  새 CPT 생성
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {cpts.map((cpt) => (
                  <div key={cpt.slug} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">{cpt.icon}</span>
                        <div>
                          <h3 className="font-semibold text-gray-900">{cpt.name}</h3>
                          <p className="text-sm text-gray-500">/{cpt.slug}</p>
                        </div>
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
                          onClick={() => deleteCPT(cpt.slug)}
                          className="p-2 text-gray-400 hover:text-red-600 transition-colors"
                          title="삭제"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                    
                    {cpt.description && (
                      <p className="text-gray-600 text-sm mb-4">{cpt.description}</p>
                    )}
                    
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-500">필드 그룹:</span>
                        <span className="font-medium">{cpt.fieldGroups.length}개</span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-500">총 필드:</span>
                        <span className="font-medium">
                          {cpt.fieldGroups.reduce((acc, group) => acc + group.fields.length, 0)}개
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-500">공개:</span>
                        <span className={`px-2 py-1 rounded-full text-xs ${
                          cpt.settings.public 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {cpt.settings.public ? '공개' : '비공개'}
                        </span>
                      </div>
                    </div>
                    
                    <div className="mt-4 pt-4 border-t border-gray-100 flex gap-2">
                      <button
                        onClick={() => {/* TODO: 포스트 관리 페이지로 이동 */}}
                        className="flex-1 px-3 py-2 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors"
                      >
                        <Eye className="w-4 h-4 inline mr-1" />
                        포스트 관리
                      </button>
                      <button
                        onClick={() => {/* TODO: 설정 페이지로 이동 */}}
                        className="px-3 py-2 text-sm bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition-colors"
                      >
                        <Settings className="w-4 h-4" />
                      </button>
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
              <h3 className="text-lg font-semibold text-gray-900">새 Custom Post Type 생성</h3>
              <p className="text-gray-600 mt-1">CPT의 기본 정보와 필드 구조를 정의하세요</p>
            </div>
            
            <div className="space-y-6">
              {/* 기본 정보 */}
              <div className="bg-gray-50 rounded-lg p-6">
                <h4 className="text-md font-medium text-gray-900 mb-4">기본 정보</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      CPT 슬러그 *
                    </label>
                    <input
                      type="text"
                      value={newCPT.slug}
                      onChange={(e) => setNewCPT(prev => ({ ...prev, slug: e.target.value }))}
                      placeholder="예: product, event, service"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                    <p className="text-xs text-gray-500 mt-1">URL과 API에서 사용됩니다 (영문, 숫자, - 만 가능)</p>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      복수형 이름 *
                    </label>
                    <input
                      type="text"
                      value={newCPT.name}
                      onChange={(e) => setNewCPT(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="예: 상품들, 이벤트들"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      단수형 이름 *
                    </label>
                    <input
                      type="text"
                      value={newCPT.singularName}
                      onChange={(e) => setNewCPT(prev => ({ ...prev, singularName: e.target.value }))}
                      placeholder="예: 상품, 이벤트"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      아이콘
                    </label>
                    <input
                      type="text"
                      value={newCPT.icon}
                      onChange={(e) => setNewCPT(prev => ({ ...prev, icon: e.target.value }))}
                      placeholder="📦"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      설명
                    </label>
                    <textarea
                      value={newCPT.description}
                      onChange={(e) => setNewCPT(prev => ({ ...prev, description: e.target.value }))}
                      placeholder="이 CPT의 용도를 설명해주세요"
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>
              </div>

              {/* 필드 그룹 */}
              <div className="bg-white border border-gray-200 rounded-lg p-6">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="text-md font-medium text-gray-900">필드 그룹</h4>
                  <button
                    onClick={addFieldGroup}
                    className="flex items-center gap-2 px-3 py-2 text-sm bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                    필드 그룹 추가
                  </button>
                </div>

                {newCPT.fieldGroups.length === 0 ? (
                  <div className="text-center py-8 border-2 border-dashed border-gray-300 rounded-lg">
                    <Database className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                    <p className="text-gray-500 text-sm">필드 그룹을 추가해서 CPT 구조를 정의하세요</p>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {newCPT.fieldGroups.map((group, groupIndex) => (
                      <div key={group.id} className="border border-gray-200 rounded-lg p-4">
                        <div className="flex items-center justify-between mb-4">
                          <input
                            type="text"
                            value={group.name}
                            onChange={(e) => {
                              setNewCPT(prev => ({
                                ...prev,
                                fieldGroups: prev.fieldGroups.map((g) =>
                                  g.id === group.id ? { ...g, name: e.target.value } : g
                                )
                              }));
                            }}
                            className="text-lg font-medium bg-transparent border-none focus:outline-none focus:ring-0 p-0"
                          />
                          <button
                            onClick={() => addField(group.id)}
                            className="flex items-center gap-1 px-2 py-1 text-xs bg-green-100 text-green-700 rounded hover:bg-green-200 transition-colors"
                          >
                            <Plus className="w-3 h-3" />
                            필드 추가
                          </button>
                        </div>

                        {group.fields.length === 0 ? (
                          <div className="text-center py-4 border border-dashed border-gray-200 rounded">
                            <p className="text-gray-500 text-sm">필드를 추가해주세요</p>
                          </div>
                        ) : (
                          <div className="space-y-3">
                            {group.fields.map((field) => (
                              <div key={field.id} className="flex items-center gap-3 p-3 border border-gray-100 rounded bg-gray-50">
                                <div className="flex items-center gap-2 text-gray-500">
                                  {getFieldIcon(field.type)}
                                </div>
                                
                                <div className="flex-1 grid grid-cols-4 gap-3">
                                  <input
                                    type="text"
                                    value={field.label}
                                    onChange={(e) => updateField(group.id, field.id, { label: e.target.value })}
                                    placeholder="필드 라벨"
                                    className="px-2 py-1 text-sm border border-gray-200 rounded"
                                  />
                                  <input
                                    type="text"
                                    value={field.name}
                                    onChange={(e) => updateField(group.id, field.id, { name: e.target.value })}
                                    placeholder="필드명"
                                    className="px-2 py-1 text-sm border border-gray-200 rounded"
                                  />
                                  <select
                                    value={field.type}
                                    onChange={(e) => updateField(group.id, field.id, { type: e.target.value as FieldSchema["type"] })}
                                    className="px-2 py-1 text-sm border border-gray-200 rounded"
                                  >
                                    <option value="text">텍스트</option>
                                    <option value="textarea">긴 텍스트</option>
                                    <option value="number">숫자</option>
                                    <option value="date">날짜</option>
                                    <option value="select">선택</option>
                                    <option value="checkbox">체크박스</option>
                                    <option value="image">이미지</option>
                                    <option value="url">URL</option>
                                    <option value="email">이메일</option>
                                  </select>
                                  <div className="flex items-center gap-2">
                                    <label className="flex items-center text-sm">
                                      <input
                                        type="checkbox"
                                        checked={field.required}
                                        onChange={(e) => updateField(group.id, field.id, { required: e.target.checked })}
                                        className="mr-1"
                                      />
                                      필수
                                    </label>
                                  </div>
                                </div>
                                
                                <button
                                  onClick={() => removeField(group.id, field.id)}
                                  className="p-1 text-red-500 hover:text-red-700 transition-colors"
                                >
                                  <X className="w-4 h-4" />
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
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
                  onClick={createCPT}
                  disabled={!newCPT.slug || !newCPT.name || !newCPT.singularName}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <Save className="w-4 h-4" />
                  CPT 생성
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
};

export default CPTManager;