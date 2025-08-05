import { FC, useState } from 'react';
import { Link } from 'react-router-dom';
import { 
  Plus, 
  Search, 
  Edit, 
  Trash2, 
  Eye,
  FileText,
  Home,
  User
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { api } from '@/api/base';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';

interface Page {
  id: string;
  title: string;
  slug: string;
  status: 'draft' | 'published' | 'private' | 'archived' | 'scheduled';
  template?: string;
  parentId?: string;
  parent?: Page;
  author: {
    id: string;
    name: string;
    email: string;
  };
  excerpt?: string;
  isHomepage: boolean;
  showInMenu: boolean;
  menuOrder: number;
  views: number;
  publishedAt?: string;
  scheduledAt?: string;
  createdAt: string;
  updatedAt: string;
}

const Pages: FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedPages, setSelectedPages] = useState<string[]>([]);
  const [bulkAction, setBulkAction] = useState('');
  
  const queryClient = useQueryClient();

  // 페이지 목록 조회
  const { data: pagesData, isLoading } = useQuery({
    queryKey: ['pages', statusFilter, searchTerm],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (statusFilter !== 'all') params.append('status', statusFilter);
      if (searchTerm) params.append('search', searchTerm);
      
      const response = await api.get(`/admin/pages?${params}`);
      return response.data;
    }
  });

  // 페이지 삭제
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/admin/pages/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pages'] });
      toast.success('페이지가 삭제되었습니다');
    },
    onError: () => {
      toast.error('페이지 삭제에 실패했습니다');
    }
  });

  // 페이지 복제
  const cloneMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await api.post(`/admin/pages/${id}/clone`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pages'] });
      toast.success('페이지가 복제되었습니다');
    },
    onError: () => {
      toast.error('페이지 복제에 실패했습니다');
    }
  });

  // 일괄 작업
  const bulkActionMutation = useMutation({
    mutationFn: async ({ action, ids }: { action: string; ids: string[] }) => {
      if (action === 'delete') {
        await api.delete('/admin/pages/bulk', { data: { ids } });
      } else if (action === 'publish' || action === 'draft') {
        await api.patch('/admin/pages/bulk', { ids, status: action });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pages'] });
      toast.success('일괄 작업이 완료되었습니다');
      setSelectedPages([]);
      setBulkAction('');
    },
    onError: () => {
      toast.error('일괄 작업에 실패했습니다');
    }
  });

  const pages = pagesData?.pages || [];
  const total = pagesData?.total || 0;

  // 상태별 색상
  const getStatusColor = (status: string) => {
    const colors = {
      published: 'bg-green-100 text-green-800',
      draft: 'bg-gray-100 text-gray-800',
      private: 'bg-purple-100 text-purple-800',
      archived: 'bg-red-100 text-red-800',
      scheduled: 'bg-blue-100 text-blue-800'
    };
    return colors[status as keyof typeof colors] || 'bg-gray-100 text-gray-800';
  };

  // 상태별 라벨
  const getStatusLabel = (status: string) => {
    const labels = {
      published: '게시됨',
      draft: '임시저장',
      private: '비공개',
      archived: '보관됨',
      scheduled: '예약됨'
    };
    return labels[status as keyof typeof labels] || status;
  };

  // 일괄 작업 실행
  const handleBulkAction = () => {
    if (!bulkAction || selectedPages.length === 0) return;
    
    if (bulkAction === 'delete' && !confirm('선택한 페이지를 삭제하시겠습니까?')) {
      return;
    }
    
    bulkActionMutation.mutate({ action: bulkAction, ids: selectedPages });
  };

  // 전체 선택
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedPages(pages.map((page: Page) => page.id));
    } else {
      setSelectedPages([]);
    }
  };

  return (
    <div className="p-6">
      {/* 헤더 */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">페이지 관리</h1>
            <p className="text-gray-600 mt-1">웹사이트의 정적 페이지를 관리합니다</p>
          </div>
          <Link
            to="/pages/new"
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center space-x-2"
          >
            <Plus className="w-4 h-4" />
            <span>새 페이지</span>
          </Link>
        </div>

        {/* 필터 및 검색 */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="페이지 검색..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
          
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">모든 상태</option>
            <option value="published">게시됨</option>
            <option value="draft">임시저장</option>
            <option value="private">비공개</option>
            <option value="scheduled">예약됨</option>
            <option value="archived">보관됨</option>
          </select>
        </div>

        {/* 일괄 작업 */}
        {selectedPages.length > 0 && (
          <div className="mt-4 flex items-center space-x-3">
            <select
              value={bulkAction}
              onChange={(e) => setBulkAction(e.target.value)}
              className="px-3 py-1 border border-gray-300 rounded-md text-sm"
            >
              <option value="">일괄 작업</option>
              <option value="publish">게시</option>
              <option value="draft">임시저장으로 변경</option>
              <option value="delete">삭제</option>
            </select>
            <button
              onClick={handleBulkAction}
              disabled={!bulkAction}
              className="px-3 py-1 bg-gray-600 text-white rounded-md text-sm hover:bg-gray-700 disabled:bg-gray-400"
            >
              적용
            </button>
            <span className="text-sm text-gray-600">
              {selectedPages.length}개 선택됨
            </span>
          </div>
        )}
      </div>

      {/* 페이지 목록 */}
      {isLoading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      ) : pages.length === 0 ? (
        <div className="text-center py-12">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <FileText className="w-8 h-8 text-gray-400" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">페이지가 없습니다</h3>
          <p className="text-gray-500 mb-4">첫 번째 페이지를 만들어보세요</p>
          <Link
            to="/pages/new"
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 inline-flex items-center"
          >
            <Plus className="w-4 h-4 mr-2" />
            새 페이지 만들기
          </Link>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="min-w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="w-12 px-6 py-3">
                  <input
                    type="checkbox"
                    checked={selectedPages.length === pages.length}
                    onChange={(e) => handleSelectAll(e.target.checked)}
                    className="rounded border-gray-300"
                  />
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  제목
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  작성자
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  상태
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  조회수
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  날짜
                </th>
                <th className="relative px-6 py-3">
                  <span className="sr-only">액션</span>
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {pages.map((page: Page) => (
                <tr key={page.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <input
                      type="checkbox"
                      checked={selectedPages.includes(page.id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedPages([...selectedPages, page.id]);
                        } else {
                          setSelectedPages(selectedPages.filter(id => id !== page.id));
                        }
                      }}
                      className="rounded border-gray-300"
                    />
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-start">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-2">
                          <Link
                            to={`/pages/${page.id}/edit`}
                            className="text-sm font-medium text-gray-900 hover:text-blue-600 truncate"
                          >
                            {page.title}
                          </Link>
                          {page.isHomepage && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                              <Home className="w-3 h-3 mr-1" />
                              홈
                            </span>
                          )}
                        </div>
                        {page.parent && (
                          <div className="text-xs text-gray-500 mt-1">
                            상위: {page.parent.title}
                          </div>
                        )}
                        <div className="flex items-center space-x-3 mt-1">
                          <a
                            href={`/${page.slug}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-gray-500 hover:text-blue-600"
                          >
                            보기
                          </a>
                          <Link
                            to={`/pages/${page.id}/edit`}
                            className="text-xs text-gray-500 hover:text-blue-600"
                          >
                            편집
                          </Link>
                          <button
                            onClick={() => cloneMutation.mutate(page.id)}
                            className="text-xs text-gray-500 hover:text-blue-600"
                          >
                            복제
                          </button>
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <User className="w-4 h-4 text-gray-400 mr-2" />
                      <div className="text-sm text-gray-900">{page.author.name}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(page.status)}`}>
                      {getStatusLabel(page.status)}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {page.views.toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      {page.publishedAt 
                        ? format(new Date(page.publishedAt), 'yyyy-MM-dd', { locale: ko })
                        : '-'
                      }
                    </div>
                    <div className="text-xs text-gray-500">
                      {page.status === 'scheduled' && page.scheduledAt
                        ? `예약: ${format(new Date(page.scheduledAt), 'MM/dd HH:mm', { locale: ko })}`
                        : `수정: ${format(new Date(page.updatedAt), 'MM/dd', { locale: ko })}`
                      }
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex items-center justify-end space-x-2">
                      <a
                        href={`/${page.slug}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-gray-400 hover:text-gray-600"
                        title="보기"
                      >
                        <Eye className="w-4 h-4" />
                      </a>
                      <Link
                        to={`/pages/${page.id}/edit`}
                        className="text-gray-400 hover:text-gray-600"
                        title="편집"
                      >
                        <Edit className="w-4 h-4" />
                      </Link>
                      <button
                        onClick={() => {
                          if (confirm('이 페이지를 삭제하시겠습니까?')) {
                            deleteMutation.mutate(page.id);
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

          {/* 페이지네이션 */}
          {total > 20 && (
            <div className="bg-gray-50 px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
              <div className="flex-1 flex justify-between sm:hidden">
                <button className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50">
                  이전
                </button>
                <button className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50">
                  다음
                </button>
              </div>
              <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm text-gray-700">
                    총 <span className="font-medium">{total}</span>개 페이지
                  </p>
                </div>
                <div>
                  <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                    {/* 페이지네이션 버튼들 */}
                  </nav>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default Pages;