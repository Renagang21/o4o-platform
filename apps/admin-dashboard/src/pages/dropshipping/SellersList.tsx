import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Store, Package, TrendingUp, DollarSign, UserPlus, Mail, Phone, Calendar, ShoppingBag } from 'lucide-react';
import { UserApi } from '../../api/userApi';
import { User } from '../../types/user';
import { toast } from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import { formatDate } from '@/lib/utils';

interface SellerStats {
  total: number;
  active: number;
  pending: number;
  totalSales: number;
}

const SellersList: React.FC = () => {
  const navigate = useNavigate();
  const [sellers, setSellers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [stats, setStats] = useState<SellerStats>({
    total: 0,
    active: 0,
    pending: 0,
    totalSales: 0
  });
  const [selectedSellers, setSelectedSellers] = useState<Set<string>>(new Set());
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'pending'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchSellers();
  }, [page, filterStatus, searchQuery]);

  const fetchSellers = async () => {
    setLoading(true);
    try {
      const filters: any = { role: 'seller' };
      if (filterStatus !== 'all') {
        filters.status = filterStatus;
      }
      if (searchQuery) {
        filters.q = searchQuery;
      }

      const response = await UserApi.getUsers(page, 20, filters);
      
      // Ensure response.data is an array
      const sellerData = Array.isArray(response?.data) ? response.data : 
                          Array.isArray(response) ? response : [];
      
      setSellers(sellerData);
      setTotalPages(response?.totalPages || 1);
      
      // Calculate stats
      setStats({
        total: response?.total || sellerData.length,
        active: sellerData.filter(s => s.status === 'active').length,
        pending: sellerData.filter(s => s.status === 'pending').length,
        totalSales: 0 // This would come from a separate API
      });
    } catch (error) {
      console.error('Failed to fetch sellers:', error);
      toast.error('판매자 목록을 불러오는데 실패했습니다');
      // Set empty data on error
      setSellers([]);
      setStats({
        total: 0,
        active: 0,
        pending: 0,
        totalSales: 0
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (userId: string) => {
    if (!confirm('정말 이 판매자를 삭제하시겠습니까?')) return;

    try {
      await UserApi.deleteUser(userId);
      toast.success('판매자가 삭제되었습니다');
      fetchSellers();
    } catch (error) {
      console.error('Failed to delete seller:', error);
      toast.error('판매자 삭제에 실패했습니다');
    }
  };

  const handleBulkDelete = async () => {
    if (selectedSellers.size === 0) {
      toast.error('삭제할 판매자를 선택해주세요');
      return;
    }

    if (!confirm(`선택한 ${selectedSellers.size}명의 판매자를 삭제하시겠습니까?`)) return;

    try {
      await Promise.all(Array.from(selectedSellers).map(id => UserApi.deleteUser(id)));
      toast.success('선택한 판매자가 삭제되었습니다');
      setSelectedSellers(new Set());
      fetchSellers();
    } catch (error) {
      console.error('Failed to bulk delete:', error);
      toast.error('일괄 삭제에 실패했습니다');
    }
  };

  const handleApprove = async (userId: string) => {
    try {
      await UserApi.approveUser(userId, '판매자 승인');
      toast.success('판매자가 승인되었습니다');
      fetchSellers();
    } catch (error) {
      console.error('Failed to approve seller:', error);
      toast.error('판매자 승인에 실패했습니다');
    }
  };

  const toggleSelection = (userId: string) => {
    const newSelection = new Set(selectedSellers);
    if (newSelection.has(userId)) {
      newSelection.delete(userId);
    } else {
      newSelection.add(userId);
    }
    setSelectedSellers(newSelection);
  };

  const toggleSelectAll = () => {
    if (selectedSellers.size === sellers.length) {
      setSelectedSellers(new Set());
    } else {
      setSelectedSellers(new Set(sellers.map(s => s.id)));
    }
  };

  const getSellerBadge = (user: User) => {
    // This would be based on actual seller performance data
    const levels = ['beginner', 'intermediate', 'expert', 'master'];
    const level = levels[Math.floor(Math.random() * levels.length)];
    
    const levelColors = {
      beginner: 'bg-green-100 text-green-800',
      intermediate: 'bg-blue-100 text-blue-800',
      expert: 'bg-purple-100 text-purple-800',
      master: 'bg-red-100 text-red-800'
    };

    const levelLabels = {
      beginner: '초급',
      intermediate: '중급',
      expert: '전문가',
      master: '마스터'
    };

    return (
      <span className={`px-2 py-1 text-xs font-medium rounded-full ${levelColors[level as keyof typeof levelColors]}`}>
        {levelLabels[level as keyof typeof levelLabels]}
      </span>
    );
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold mb-2">판매자 관리</h1>
            <p className="text-gray-600">드롭쉬핑 판매자 목록 및 관리</p>
          </div>
          <button
            onClick={() => navigate('/users/new?role=seller')}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <UserPlus className="w-4 h-4" />
            새 판매자 추가
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">전체 판매자</p>
              <p className="text-2xl font-bold">{stats.total}</p>
            </div>
            <ShoppingBag className="w-8 h-8 text-blue-600 opacity-50" />
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">활성 판매자</p>
              <p className="text-2xl font-bold text-green-600">{stats.active}</p>
            </div>
            <TrendingUp className="w-8 h-8 text-green-600 opacity-50" />
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">승인 대기</p>
              <p className="text-2xl font-bold text-yellow-600">{stats.pending}</p>
            </div>
            <Store className="w-8 h-8 text-yellow-600 opacity-50" />
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">이번 달 매출</p>
              <p className="text-2xl font-bold">₩{stats.totalSales.toLocaleString()}</p>
            </div>
            <DollarSign className="w-8 h-8 text-purple-600 opacity-50" />
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <div className="flex flex-wrap gap-4 items-center">
          <input
            type="text"
            placeholder="판매자 검색..."
            className="flex-1 min-w-[200px] px-4 py-2 border rounded-lg"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <select
            className="px-4 py-2 border rounded-lg"
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value as any)}
          >
            <option value="all">전체 상태</option>
            <option value="active">활성</option>
            <option value="pending">승인 대기</option>
          </select>
          {selectedSellers.size > 0 && (
            <button
              onClick={handleBulkDelete}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
            >
              선택 삭제 ({selectedSellers.size})
            </button>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left">
                <input
                  type="checkbox"
                  checked={selectedSellers.size === sellers.length && sellers.length > 0}
                  onChange={toggleSelectAll}
                  className="rounded"
                />
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                판매자 정보
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                등급
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                상태
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                연락처
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                가입일
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                작업
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {loading ? (
              <tr>
                <td colSpan={7} className="text-center py-8">
                  <div className="flex justify-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                  </div>
                </td>
              </tr>
            ) : sellers.length === 0 ? (
              <tr>
                <td colSpan={7} className="text-center py-8 text-gray-500">
                  판매자가 없습니다
                </td>
              </tr>
            ) : (
              sellers.map((seller) => (
                <tr key={seller.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <input
                      type="checkbox"
                      checked={selectedSellers.has(seller.id)}
                      onChange={() => toggleSelection(seller.id)}
                      className="rounded"
                    />
                  </td>
                  <td className="px-6 py-4">
                    <div>
                      <div className="text-sm font-medium text-gray-900">{seller.name}</div>
                      <div className="text-sm text-gray-500">{seller.email}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    {getSellerBadge(seller)}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                      seller.status === 'active' 
                        ? 'bg-green-100 text-green-800' 
                        : seller.status === 'pending'
                        ? 'bg-yellow-100 text-yellow-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {seller.status === 'active' ? '활성' : seller.status === 'pending' ? '승인 대기' : seller.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    <div className="flex items-center gap-4">
                      {seller.phone && (
                        <span className="flex items-center gap-1">
                          <Phone className="w-3 h-3" />
                          {seller.phone}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    <div className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {formatDate(seller.createdAt)}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm">
                    <div className="flex gap-2">
                      {seller.status === 'pending' ? (
                        <button
                          onClick={() => handleApprove(seller.id)}
                          className="text-green-600 hover:text-green-900"
                        >
                          승인
                        </button>
                      ) : (
                        <button
                          onClick={() => navigate(`/users/${seller.id}`)}
                          className="text-blue-600 hover:text-blue-900"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                      )}
                      <button
                        onClick={() => handleDelete(seller.id)}
                        className="text-red-600 hover:text-red-900"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="mt-4 flex justify-center gap-2">
          <button
            onClick={() => setPage(Math.max(1, page - 1))}
            disabled={page === 1}
            className="px-4 py-2 border rounded-lg disabled:opacity-50"
          >
            이전
          </button>
          <span className="px-4 py-2">
            {page} / {totalPages}
          </span>
          <button
            onClick={() => setPage(Math.min(totalPages, page + 1))}
            disabled={page === totalPages}
            className="px-4 py-2 border rounded-lg disabled:opacity-50"
          >
            다음
          </button>
        </div>
      )}
    </div>
  );
};

export default SellersList;