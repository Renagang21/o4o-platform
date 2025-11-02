import { useState, useEffect, FC } from 'react';
import { 
  Plus, 
  Edit3, 
  Trash2, 
  Settings,
  Save,
  X,
  Type,
  Hash,
  Calendar,
  Image,
  Mail,
  Link,
  CheckSquare,
  List,
  FileText,
  Repeat,
  MapPin,
  Eye,
  EyeOff,
  Move,
  Copy
} from 'lucide-react';
import AdminLayout from '../../components/admin/AdminLayout';

interface FieldOption {
  label: string;
  value: string;
}

interface ConditionalLogic {
  field: string;
  operator: 'equals' | 'not_equals' | 'contains' | 'greater_than' | 'less_than';
  value: string;
}

interface CustomField {
  id: string;
  name: string;
  label: string;
  type: 'text' | 'textarea' | 'number' | 'date' | 'datetime' | 'select' | 'radio' | 'checkbox' | 'image' | 'gallery' | 'url' | 'email' | 'password' | 'wysiwyg' | 'repeater' | 'relation' | 'location';
  required: boolean;
  description?: string;
  placeholder?: string;
  defaultValue?: string;
  options?: FieldOption[];
  validation?: {
    minLength?: number;
    maxLength?: number;
    min?: number;
    max?: number;
    pattern?: string;
  };
  conditionalLogic?: ConditionalLogic[];
  order: number;
  groupId: string;
  active: boolean;
}

interface FieldGroup {
  id: string;
  title: string;
  description?: string;
  location: {
    postType: string[];
    rules?: Array<{
      param: string;
      operator: string;
      value: string;
    }>;
  };
  placement: 'normal' | 'high' | 'side';
  hideOnScreen?: string[];
  fields: CustomField[];
  order: number;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

const CustomFieldsManager: FC = () => {
  const [fieldGroups, setFieldGroups] = useState<FieldGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'list' | 'create' | 'edit'>('list');
  const [editingGroup, setEditingGroup] = useState<FieldGroup | null>(null);

  // 새 필드 그룹 생성 폼 상태
  const [newGroup, setNewGroup] = useState({
    title: '',
    description: '',
    location: {
      postType: [] as string[],
      rules: []
    },
    placement: 'normal' as 'normal' | 'high' | 'side',
    hideOnScreen: [] as string[],
    fields: [] as CustomField[]
  });

  // 사용 가능한 CPT 목록 (Mock)
  const [availableCPTs] = useState([
    { slug: 'post', name: '글' },
    { slug: 'page', name: '페이지' },
    { slug: 'product', name: '상품' },
    { slug: 'event', name: '이벤트' },
    { slug: 'service', name: '서비스' }
  ]);

  useEffect(() => {
    loadFieldGroups();
  }, []);

  const loadFieldGroups = async () => {
    try {
      // Mock data for demonstration
      const mockFieldGroups: FieldGroup[] = [
        {
          id: 'group_1',
          title: '상품 정보',
          description: '상품에 대한 상세 정보 필드들',
          location: {
            postType: ['product'],
            rules: []
          },
          placement: 'normal',
          hideOnScreen: [],
          fields: [
            {
              id: 'field_1',
              name: 'price',
              label: '가격',
              type: 'number',
              required: true,
              description: '상품의 판매 가격을 입력하세요',
              placeholder: '예: 50000',
              validation: { min: 0 },
              order: 0,
              groupId: 'group_1',
              active: true
            },
            {
              id: 'field_2',
              name: 'brand',
              label: '브랜드',
              type: 'select',
              required: false,
              description: '상품 브랜드를 선택하세요',
              options: [
                { label: '삼성', value: 'samsung' },
                { label: 'LG', value: 'lg' },
                { label: '애플', value: 'apple' }
              ],
              order: 1,
              groupId: 'group_1',
              active: true
            },
            {
              id: 'field_3',
              name: 'gallery',
              label: '상품 갤러리',
              type: 'gallery',
              required: false,
              description: '상품 이미지를 여러 장 업로드하세요',
              order: 2,
              groupId: 'group_1',
              active: true
            }
          ],
          order: 0,
          active: true,
          createdAt: '2025-01-01',
          updatedAt: '2025-01-15'
        },
        {
          id: 'group_2',
          title: '이벤트 상세',
          description: '이벤트 관련 추가 정보',
          location: {
            postType: ['event'],
            rules: []
          },
          placement: 'normal',
          hideOnScreen: [],
          fields: [
            {
              id: 'field_4',
              name: 'event_date',
              label: '이벤트 날짜',
              type: 'datetime',
              required: true,
              description: '이벤트가 진행되는 날짜와 시간',
              order: 0,
              groupId: 'group_2',
              active: true
            },
            {
              id: 'field_5',
              name: 'location',
              label: '이벤트 장소',
              type: 'location',
              required: true,
              description: '이벤트가 열리는 위치',
              order: 1,
              groupId: 'group_2',
              active: true
            }
          ],
          order: 1,
          active: true,
          createdAt: '2025-01-02',
          updatedAt: '2025-01-12'
        }
      ];

      setFieldGroups(mockFieldGroups);
    } catch (error: unknown) {
      // Error logging - use proper error handler
      console.error('Failed to load field groups:', error);
    } finally {
      setLoading(false);
    }
  };

  const createFieldGroup = async () => {
    try {
      const groupData = {
        ...newGroup,
        id: `group_${Date.now()}`,
        order: fieldGroups.length,
        active: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      // API 호출 (Mock)
      
      await loadFieldGroups();
      resetForm();
      setActiveTab('list');
      alert('✅ 필드 그룹이 성공적으로 생성되었습니다!');
    } catch (error: unknown) {
      // Error logging - use proper error handler
      console.error('Failed to create field group:', error);
      alert('❌ 필드 그룹 생성 중 오류가 발생했습니다.');
    }
  };

  const deleteFieldGroup = async (id: string) => {
    if (!confirm('정말로 이 필드 그룹을 삭제하시겠습니까? 모든 필드 데이터가 함께 삭제됩니다.')) return;

    try {
      // API 호출 (Mock)

      setFieldGroups(prev => prev.filter(group => group.id !== id));
      alert('✅ 필드 그룹이 삭제되었습니다.');
    } catch (error: unknown) {
      // Error logging - use proper error handler
      console.error('Failed to delete field group:', error);
      alert('❌ 삭제 중 오류가 발생했습니다.');
    }
  };

  const resetForm = () => {
    setNewGroup({
      title: '',
      description: '',
      location: {
        postType: [],
        rules: []
      },
      placement: 'normal',
      hideOnScreen: [],
      fields: []
    });
  };

  const addField = () => {
    const newField: CustomField = {
      id: `field_${Date.now()}`,
      name: '',
      label: '',
      type: 'text',
      required: false,
      description: '',
      placeholder: '',
      order: newGroup.fields.length,
      groupId: 'new',
      active: true
    };

    setNewGroup(prev => ({
      ...prev,
      fields: [...prev.fields, newField]
    }));
  };

  const updateField = (fieldId: string, updates: Partial<CustomField>) => {
    setNewGroup(prev => ({
      ...prev,
      fields: prev.fields.map(field =>
        field.id === fieldId ? { ...field, ...updates } : field
      )
    }));
  };

  const removeField = (fieldId: string) => {
    setNewGroup(prev => ({
      ...prev,
      fields: prev.fields.filter(field => field.id !== fieldId)
    }));
  };

  const getFieldIcon = (type: string) => {
    switch (type) {
      case 'text': return <Type className="w-4 h-4" />;
      case 'textarea': return <FileText className="w-4 h-4" />;
      case 'number': return <Hash className="w-4 h-4" />;
      case 'date': case 'datetime': return <Calendar className="w-4 h-4" />;
      case 'image': case 'gallery': return <Image className="w-4 h-4" />;
      case 'email': return <Mail className="w-4 h-4" />;
      case 'url': return <Link className="w-4 h-4" />;
      case 'checkbox': return <CheckSquare className="w-4 h-4" />;
      case 'select': case 'radio': return <List className="w-4 h-4" />;
      case 'repeater': return <Repeat className="w-4 h-4" />;
      case 'location': return <MapPin className="w-4 h-4" />;
      case 'wysiwyg': return <Edit3 className="w-4 h-4" />;
      default: return <Type className="w-4 h-4" />;
    }
  };

  const fieldTypes = [
    { value: 'text', label: '텍스트', group: '기본' },
    { value: 'textarea', label: '긴 텍스트', group: '기본' },
    { value: 'number', label: '숫자', group: '기본' },
    { value: 'email', label: '이메일', group: '기본' },
    { value: 'url', label: 'URL', group: '기본' },
    { value: 'password', label: '비밀번호', group: '기본' },
    { value: 'date', label: '날짜', group: '날짜/시간' },
    { value: 'datetime', label: '날짜시간', group: '날짜/시간' },
    { value: 'select', label: '선택 (드롭다운)', group: '선택' },
    { value: 'radio', label: '라디오 버튼', group: '선택' },
    { value: 'checkbox', label: '체크박스', group: '선택' },
    { value: 'image', label: '이미지', group: '미디어' },
    { value: 'gallery', label: '이미지 갤러리', group: '미디어' },
    { value: 'wysiwyg', label: '리치 에디터', group: '고급' },
    { value: 'repeater', label: '반복 필드', group: '고급' },
    { value: 'relation', label: '관계', group: '고급' },
    { value: 'location', label: '위치', group: '고급' }
  ];

  const groupedFieldTypes = fieldTypes.reduce((acc, field) => {
    if (!acc[field.group]) {
      acc[field.group] = [];
    }
    acc[field.group].push(field);
    return acc;
  }, {} as Record<string, typeof fieldTypes>);

  if (loading) {
    return (
      <AdminLayout title="Custom Fields 관리" subtitle="사용자 정의 필드를 생성하고 관리하세요">
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
            <p className="text-gray-600">필드 그룹을 로드하는 중...</p>
          </div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout 
      title="Custom Fields 관리" 
      subtitle="사용자 정의 필드를 생성하고 관리하세요"
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
            <FileText className="w-4 h-4 inline mr-2" />
            필드 그룹 목록
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
            새 필드 그룹 생성
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
                <h3 className="text-lg font-medium text-gray-900">등록된 필드 그룹</h3>
                <p className="text-sm text-gray-500">총 {fieldGroups.length}개의 필드 그룹이 등록되어 있습니다.</p>
              </div>
              <button
                onClick={() => setActiveTab('create')}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Plus className="w-4 h-4" />
                새 필드 그룹 생성
              </button>
            </div>

            {fieldGroups.length === 0 ? (
              <div className="text-center py-12">
                <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  아직 생성된 필드 그룹이 없습니다
                </h3>
                <p className="text-gray-600 mb-4">
                  첫 번째 필드 그룹을 생성해보세요
                </p>
                <button
                  onClick={() => setActiveTab('create')}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  <Plus className="w-4 h-4" />
                  새 필드 그룹 생성
                </button>
              </div>
            ) : (
              <div className="space-y-6">
                {fieldGroups.map(group => (
                  <div key={group.id} className="bg-white rounded-lg shadow-sm border border-gray-200">
                    {/* Header */}
                    <div className="p-6 border-b border-gray-100">
                      <div className="flex items-start justify-between mb-4">
                        <div>
                          <h3 className="font-semibold text-gray-900 text-lg">{group.title}</h3>
                          {group.description && (
                            <p className="text-gray-600 text-sm mt-1">{group.description}</p>
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
                            onClick={() => deleteFieldGroup(group.id)}
                            className="p-2 text-gray-400 hover:text-red-600 transition-colors"
                            title="삭제"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-6 text-sm">
                        <div className="flex items-center gap-2">
                          <span className="text-gray-500">연결된 CPT:</span>
                          <div className="flex gap-2">
                            {group.location.postType.map(cptSlug => {
                              const cpt = availableCPTs.find(c => c.slug === cptSlug);
                              return (
                                <span key={cptSlug} className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs">
                                  {cpt?.name || cptSlug}
                                </span>
                              );
                            })}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-gray-500">필드 수:</span>
                          <span className="font-medium">{group.fields.length}개</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-gray-500">배치:</span>
                          <span className="font-medium">
                            {group.placement === 'normal' ? '일반' : 
                             group.placement === 'high' ? '높음' : '사이드바'}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Fields List */}
                    <div className="p-6">
                      <h4 className="text-sm font-medium text-gray-900 mb-4">필드 목록</h4>
                      {group.fields.length === 0 ? (
                        <div className="text-center py-4 border border-dashed border-gray-200 rounded">
                          <p className="text-gray-500 text-sm">아직 생성된 필드가 없습니다</p>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {group.fields.map(field => (
                            <div key={field.id} className="flex items-center gap-4 p-4 border border-gray-100 rounded-lg bg-gray-50">
                              <div className="flex items-center gap-2 text-gray-500">
                                {getFieldIcon(field.type)}
                              </div>
                              
                              <div className="flex-1">
                                <div className="flex items-center gap-2">
                                  <span className="font-medium text-gray-900">{field.label}</span>
                                  {field.required && (
                                    <span className="text-red-500 text-xs">*</span>
                                  )}
                                  <span className="text-xs text-gray-500">({field.name})</span>
                                </div>
                                <div className="flex items-center gap-4 text-xs text-gray-500 mt-1">
                                  <span>타입: {fieldTypes.find(t => t.value === field.type)?.label}</span>
                                  {field.description && (
                                    <span className="truncate max-w-xs">{field.description}</span>
                                  )}
                                </div>
                              </div>
                              
                              <div className="flex items-center gap-2">
                                <button
                                  className="p-1 text-gray-400 hover:text-blue-600"
                                  title="필드 편집"
                                >
                                  <Edit3 className="w-3 h-3" />
                                </button>
                                <button
                                  className="p-1 text-gray-400 hover:text-green-600"
                                  title="필드 복사"
                                >
                                  <Copy className="w-3 h-3" />
                                </button>
                                <button
                                  className="p-1 text-gray-400 hover:text-gray-600"
                                  title="필드 이동"
                                >
                                  <Move className="w-3 h-3" />
                                </button>
                                <button
                                  className="p-1 text-gray-400 hover:text-red-600"
                                  title="필드 삭제"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
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
              <h3 className="text-lg font-semibold text-gray-900">새 필드 그룹 생성</h3>
              <p className="text-gray-600 mt-1">필드 그룹의 기본 정보와 필드들을 설정하세요</p>
            </div>
            
            <div className="space-y-6">
              {/* 기본 정보 */}
              <div className="bg-gray-50 rounded-lg p-6">
                <h4 className="text-md font-medium text-gray-900 mb-4">기본 정보</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      그룹 제목 *
                    </label>
                    <input
                      type="text"
                      value={newGroup.title}
                      onChange={e => setNewGroup(prev => ({ ...prev, title: e.target.value }))}
                      placeholder="예: 상품 정보, 이벤트 상세"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      설명
                    </label>
                    <textarea
                      value={newGroup.description}
                      onChange={e => setNewGroup(prev => ({ ...prev, description: e.target.value }))}
                      placeholder="이 필드 그룹의 용도를 설명해주세요"
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>
              </div>

              {/* 위치 설정 */}
              <div className="bg-white border border-gray-200 rounded-lg p-6">
                <h4 className="text-md font-medium text-gray-900 mb-4">위치 설정</h4>
                
                <div className="space-y-6">
                  {/* CPT 선택 */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-3">
                      표시할 Post Type *
                    </label>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                      {availableCPTs.map(cpt => (
                        <label key={cpt.slug} className="flex items-center">
                          <input
                            type="checkbox"
                            checked={newGroup.location.postType.includes(cpt.slug)}
                            onChange={e => {
                              if (e.target.checked) {
                                setNewGroup(prev => ({
                                  ...prev,
                                  location: {
                                    ...prev.location,
                                    postType: [...prev.location.postType, cpt.slug]
                                  }
                                }));
                              } else {
                                setNewGroup(prev => ({
                                  ...prev,
                                  location: {
                                    ...prev.location,
                                    postType: prev.location.postType.filter(slug => slug !== cpt.slug)
                                  }
                                }));
                              }
                            }}
                            className="mr-2"
                          />
                          <span className="text-sm text-gray-700">{cpt.name}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* 배치 설정 */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-3">
                      배치 위치
                    </label>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {[
                        { value: 'normal', label: '일반', desc: '콘텐츠 아래에 표시' },
                        { value: 'high', label: '높음', desc: '제목 아래에 표시' },
                        { value: 'side', label: '사이드바', desc: '우측 사이드바에 표시' }
                      ].map(option => (
                        <label key={option.value} className="relative">
                          <input
                            type="radio"
                            name="placement"
                            value={option.value}
                            checked={newGroup.placement === option.value}
                            onChange={e => setNewGroup(prev => ({
                              ...prev,
                              placement: e.target.value as 'normal' | 'high' | 'side'
                            }))}
                            className="sr-only"
                          />
                          <div className={`p-4 border-2 rounded-lg cursor-pointer transition-colors ${
                            newGroup.placement === option.value 
                              ? 'border-blue-500 bg-blue-50' 
                              : 'border-gray-300 hover:border-gray-400'
                          }`}>
                            <div className="font-medium text-gray-900">{option.label}</div>
                            <div className="text-sm text-gray-500">{option.desc}</div>
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* 필드 정의 */}
              <div className="bg-white border border-gray-200 rounded-lg p-6">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="text-md font-medium text-gray-900">필드 정의</h4>
                  <button
                    onClick={addField}
                    className="flex items-center gap-2 px-3 py-2 text-sm bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                    필드 추가
                  </button>
                </div>

                {newGroup.fields.length === 0 ? (
                  <div className="text-center py-8 border-2 border-dashed border-gray-300 rounded-lg">
                    <FileText className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                    <p className="text-gray-500 text-sm">필드를 추가해서 그룹을 구성하세요</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {newGroup.fields.map((field, index) => (
                      <div key={field.id} className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">
                              필드 라벨 *
                            </label>
                            <input
                              type="text"
                              value={field.label}
                              onChange={e => updateField(field.id, { label: e.target.value })}
                              placeholder="필드 라벨"
                              className="w-full px-2 py-1 text-sm border border-gray-200 rounded"
                            />
                          </div>
                          
                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">
                              필드명 *
                            </label>
                            <input
                              type="text"
                              value={field.name}
                              onChange={e => updateField(field.id, { name: e.target.value })}
                              placeholder="field_name"
                              className="w-full px-2 py-1 text-sm border border-gray-200 rounded"
                            />
                          </div>
                          
                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">
                              필드 타입 *
                            </label>
                            <select
                              value={field.type}
                              onChange={e => updateField(field.id, { type: e.target.value as CustomField['type'] })}
                              className="w-full px-2 py-1 text-sm border border-gray-200 rounded"
                            >
                              {Object.entries(groupedFieldTypes).map(([groupName, types]) => (
                                <optgroup key={groupName} label={groupName}>
                                  {types.map(type => (
                                    <option key={type.value} value={type.value}>
                                      {type.label}
                                    </option>
                                  ))}
                                </optgroup>
                              ))}
                            </select>
                          </div>
                          
                          <div className="flex items-center gap-2">
                            <label className="flex items-center text-xs">
                              <input
                                type="checkbox"
                                checked={field.required}
                                onChange={e => updateField(field.id, { required: e.target.checked })}
                                className="mr-1"
                              />
                              필수
                            </label>
                            <button
                              onClick={() => removeField(field.id)}
                              className="p-1 text-red-500 hover:text-red-700 transition-colors ml-auto"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                        
                        <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">
                              설명
                            </label>
                            <input
                              type="text"
                              value={field.description || ''}
                              onChange={e => updateField(field.id, { description: e.target.value })}
                              placeholder="필드 설명"
                              className="w-full px-2 py-1 text-sm border border-gray-200 rounded"
                            />
                          </div>
                          
                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">
                              플레이스홀더
                            </label>
                            <input
                              type="text"
                              value={field.placeholder || ''}
                              onChange={e => updateField(field.id, { placeholder: e.target.value })}
                              placeholder="예시 텍스트"
                              className="w-full px-2 py-1 text-sm border border-gray-200 rounded"
                            />
                          </div>
                        </div>
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
                  onClick={createFieldGroup}
                  disabled={!newGroup.title || newGroup.location.postType.length === 0}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <Save className="w-4 h-4" />
                  필드 그룹 생성
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
};

export default CustomFieldsManager;