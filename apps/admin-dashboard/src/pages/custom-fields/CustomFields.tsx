import { FC, useState } from 'react';
import { Plus, Settings, Trash2, Edit, Copy, Search } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { authClient } from '@o4o/auth-client';

interface CustomFieldGroup {
  id: string;
  name: string;
  key: string;
  description?: string;
  fields: CustomField[];
  locations: string[];
  rules?: Record<string, any>;
  position: number;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

interface CustomField {
  id: string;
  name: string;
  key: string;
  type: 'text' | 'textarea' | 'number' | 'select' | 'radio' | 'checkbox' | 'date' | 'image' | 'file' | 'relationship' | 'repeater';
  label: string;
  placeholder?: string;
  defaultValue?: any;
  required: boolean;
  instructions?: string;
  choices?: { value: string; label: string }[];
  conditional?: any;
  wrapper?: {
    width?: string;
    class?: string;
    id?: string;
  };
}

const CustomFields: FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingGroup, setEditingGroup] = useState<CustomFieldGroup | null>(null);
  
  const queryClient = useQueryClient();

  // 필드 그룹 목록 조회
  const { data: fieldGroups, isLoading } = useQuery({
    queryKey: ['custom-field-groups'],
    queryFn: async () => {
      const response = await authClient.api.get('/admin/custom-field-groups');
      // Ensure we always return an array
      return Array.isArray(response.data) ? response.data :
             (response.data?.groups || response.data?.data || []);
    }
  });

  // 필드 그룹 생성
  const createGroupMutation = useMutation({
    mutationFn: async (data: Partial<CustomFieldGroup>) => {
      const response = await authClient.api.post('/admin/custom-field-groups', data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['custom-field-groups'] });
      toast.success('필드 그룹이 생성되었습니다');
      setShowCreateModal(false);
    },
    onError: () => {
      toast.error('필드 그룹 생성에 실패했습니다');
    }
  });

  // 필드 그룹 삭제
  const deleteGroupMutation = useMutation({
    mutationFn: async (id: string) => {
      await authClient.api.delete(`/admin/custom-field-groups/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['custom-field-groups'] });
      toast.success('필드 그룹이 삭제되었습니다');
    },
    onError: () => {
      toast.error('필드 그룹 삭제에 실패했습니다');
    }
  });

  // 필터링된 필드 그룹
  const filteredGroups = Array.isArray(fieldGroups) 
    ? fieldGroups.filter((group: CustomFieldGroup) => {
        if (!group || typeof group !== 'object') return false;
        const searchLower = searchTerm.toLowerCase();
        const nameMatch = group.name && typeof group.name === 'string' ? 
          group.name.toLowerCase().includes(searchLower) : false;
        const keyMatch = group.key && typeof group.key === 'string' ? 
          group.key.toLowerCase().includes(searchLower) : false;
        return nameMatch || keyMatch;
      })
    : [];


  return (
    <div className="p-6">
      {/* 헤더 */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">사용자 정의 필드</h1>
            <p className="text-gray-600 mt-1">콘텐츠에 추가 필드를 정의하고 관리합니다</p>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center space-x-2"
          >
            <Plus className="w-4 h-4" />
            <span>필드 그룹 추가</span>
          </button>
        </div>

        {/* 검색 */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="필드 그룹 검색..."
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* 필드 그룹 목록 */}
      {isLoading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      ) : filteredGroups.length === 0 ? (
        <div className="text-center py-12">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Settings className="w-8 h-8 text-gray-400" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">필드 그룹이 없습니다</h3>
          <p className="text-gray-500 mb-4">첫 번째 필드 그룹을 만들어보세요</p>
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            필드 그룹 추가
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow">
          <table className="min-w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  필드 그룹
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  키
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  필드 수
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  위치
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  상태
                </th>
                <th className="relative px-6 py-3">
                  <span className="sr-only">액션</span>
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredGroups.map((group: CustomFieldGroup) => (
                <tr key={group.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm font-medium text-gray-900">{group.name}</div>
                      {group.description && (
                        <div className="text-sm text-gray-500">{group.description}</div>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <code className="text-sm bg-gray-100 px-2 py-1 rounded">{group.key}</code>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {group.fields?.length || 0} 필드
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex flex-wrap gap-1">
                      {group.locations.map((location, index) => (
                        <span
                          key={index}
                          className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800"
                        >
                          {location}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      group.active 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {group.active ? '활성' : '비활성'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex items-center justify-end space-x-2">
                      <button
                        onClick={() => setEditingGroup(group)}
                        className="text-gray-400 hover:text-gray-600"
                        title="편집"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => {
                          // TODO: 복제 기능 구현
                          toast.success('복제 기능은 준비 중입니다');
                        }}
                        className="text-gray-400 hover:text-gray-600"
                        title="복제"
                      >
                        <Copy className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => {
                          if (confirm('이 필드 그룹을 삭제하시겠습니까?')) {
                            deleteGroupMutation.mutate(group.id);
                          }
                        }}
                        className="text-gray-400 hover:text-red-600"
                        title="삭제"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* 생성/수정 모달 */}
      {(showCreateModal || editingGroup) && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold mb-4">
              {editingGroup ? '필드 그룹 수정' : '새 필드 그룹'}
            </h2>
            
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const formData = new FormData(e.currentTarget);
                const data = {
                  name: formData.get('name') as string,
                  key: formData.get('key') as string,
                  description: formData.get('description') as string,
                  locations: ['post', 'page'], // 임시
                  fields: [],
                  active: true
                };
                
                if (editingGroup) {
                  // TODO: 수정 API 호출
                  toast.success('수정 기능은 준비 중입니다');
                } else {
                  createGroupMutation.mutate(data);
                }
              }}
            >
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    그룹 이름 <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="name"
                    defaultValue={editingGroup?.name}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="예: 제품 정보"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    그룹 키 <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="key"
                    defaultValue={editingGroup?.key}
                    required
                    pattern="[a-z0-9_]+"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="예: product_info"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    소문자, 숫자, 언더스코어만 사용 가능
                  </p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    설명
                  </label>
                  <textarea
                    name="description"
                    defaultValue={editingGroup?.description}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="이 필드 그룹에 대한 설명을 입력하세요"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    표시 위치
                  </label>
                  <div className="space-y-2">
                    <label className="flex items-center">
                      <input type="checkbox" name="location_post" defaultChecked className="mr-2" />
                      <span>게시물</span>
                    </label>
                    <label className="flex items-center">
                      <input type="checkbox" name="location_page" defaultChecked className="mr-2" />
                      <span>페이지</span>
                    </label>
                    <label className="flex items-center">
                      <input type="checkbox" name="location_user" className="mr-2" />
                      <span>사용자</span>
                    </label>
                    <label className="flex items-center">
                      <input type="checkbox" name="location_product" className="mr-2" />
                      <span>제품</span>
                    </label>
                  </div>
                </div>
              </div>
              
              <div className="flex justify-end space-x-3 mt-6">
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateModal(false);
                    setEditingGroup(null);
                  }}
                  className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
                >
                  취소
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  {editingGroup ? '수정' : '생성'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default CustomFields;