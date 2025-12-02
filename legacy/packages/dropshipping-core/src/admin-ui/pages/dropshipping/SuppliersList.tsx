import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Store, Package, TrendingUp, DollarSign, UserPlus, Mail, Phone, Calendar, Building } from 'lucide-react';
import { UserApi } from '@/api/userApi';
import { User } from '../../types/user';
import { toast } from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import { formatDate } from '@/lib/utils';

interface SupplierStats {
  total: number;
  active: number;
  pending: number;
  totalProducts: number;
}

const SuppliersList: React.FC = () => {
  const navigate = useNavigate();
  const [suppliers, setSuppliers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [stats, setStats] = useState<SupplierStats>({
    total: 0,
    active: 0,
    pending: 0,
    totalProducts: 0
  });
  const [selectedSuppliers, setSelectedSuppliers] = useState<Set<string>>(new Set());
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'pending'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchSuppliers();
  }, [page, filterStatus, searchQuery]);

  const fetchSuppliers = async () => {
    setLoading(true);
    try {
      const filters: any = { role: 'supplier' };
      if (filterStatus !== 'all') {
        filters.status = filterStatus;
      }
      if (searchQuery) {
        filters.q = searchQuery;
      }

      const response = await UserApi.getUsers(page, 20, filters);
      
      // Handle PaginatedResponse structure and ensure data is an array
      const responseAny = response as any;
      const supplierData = Array.isArray(response?.data) ? response.data :
                          Array.isArray(responseAny?.users) ? responseAny.users :
                          Array.isArray(response) ? response : [];
      
      setSuppliers(supplierData);
      setTotalPages(Math.ceil((response?.total || 0) / 20));
      
      // Calculate stats with safe array operations
      setStats({
        total: response?.total || 0,
        active: Array.isArray(supplierData) ? supplierData.filter((s: User) => s.status === 'active').length : 0,
        pending: Array.isArray(supplierData) ? supplierData.filter((s: User) => s.status === 'pending').length : 0,
        totalProducts: 0 // This would come from a separate API
      });
    } catch (error) {
      
      toast.error('공급자 목록을 불러오는데 실패했습니다');
      // Set empty data on error
      setSuppliers([]);
      setStats({
        total: 0,
        active: 0,
        pending: 0,
        totalProducts: 0
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (userId: string) => {
    if (!confirm('정말 이 공급자를 삭제하시겠습니까?')) return;

    try {
      await UserApi.deleteUser(userId);
      toast.success('공급자가 삭제되었습니다');
      fetchSuppliers();
    } catch (error) {
      
      toast.error('공급자 삭제에 실패했습니다');
    }
  };

  const handleBulkDelete = async () => {
    if (selectedSuppliers.size === 0) {
      toast.error('삭제할 공급자를 선택해주세요');
      return;
    }

    if (!confirm(`선택한 ${selectedSuppliers.size}명의 공급자를 삭제하시겠습니까?`)) return;

    try {
      await Promise.all(Array.from(selectedSuppliers).map(id => UserApi.deleteUser(id)));
      toast.success('선택한 공급자가 삭제되었습니다');
      setSelectedSuppliers(new Set());
      fetchSuppliers();
    } catch (error) {
      
      toast.error('일괄 삭제에 실패했습니다');
    }
  };

  const handleApprove = async (userId: string) => {
    try {
      await UserApi.approveUser(userId, '공급자 승인');
      toast.success('공급자가 승인되었습니다');
      fetchSuppliers();
    } catch (error) {
      
      toast.error('공급자 승인에 실패했습니다');
    }
  };

  const toggleSelection = (userId: string) => {
    const newSelection = new Set(selectedSuppliers);
    if (newSelection.has(userId)) {
      newSelection.delete(userId);
    } else {
      newSelection.add(userId);
    }
    setSelectedSuppliers(newSelection);
  };

  const toggleSelectAll = () => {
    if (selectedSuppliers.size === suppliers.length) {
      setSelectedSuppliers(new Set());
    } else {
      setSelectedSuppliers(new Set(suppliers.map(s => s.id)));
    }
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold mb-2">공급자 관리</h1>
            <p className="text-gray-600">드롭쉬핑 상품 공급자 목록 및 관리</p>
          </div>
          <button
            onClick={() => navigate('/users/new?role=supplier')}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <UserPlus className="w-4 h-4" />
            새 공급자 추가
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">전체 공급자</p>
              <p className="text-2xl font-bold">{stats.total}</p>
            </div>
            <Store className="w-8 h-8 text-blue-600 opacity-50" />
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">활성 공급자</p>
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
            <Building className="w-8 h-8 text-yellow-600 opacity-50" />
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">등록 상품</p>
              <p className="text-2xl font-bold">{stats.totalProducts}</p>
            </div>
            <Package className="w-8 h-8 text-purple-600 opacity-50" />
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <div className="flex flex-wrap gap-4 items-center">
          <input
            type="text"
            placeholder="공급자 검색..."
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
          {selectedSuppliers.size > 0 && (
            <button
              onClick={handleBulkDelete}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
            >
              선택 삭제 ({selectedSuppliers.size})
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
                  checked={selectedSuppliers.size === suppliers.length && suppliers.length > 0}
                  onChange={toggleSelectAll}
                  className="rounded"
                />
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                공급자 정보
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                사업자 정보
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
            ) : suppliers.length === 0 ? (
              <tr>
                <td colSpan={7} className="text-center py-8 text-gray-500">
                  공급자가 없습니다
                </td>
              </tr>
            ) : (
              suppliers.map((supplier) => (
                <tr key={supplier.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <input
                      type="checkbox"
                      checked={selectedSuppliers.has(supplier.id)}
                      onChange={() => toggleSelection(supplier.id)}
                      className="rounded"
                    />
                  </td>
                  <td className="px-6 py-4">
                    <div>
                      <div className="text-sm font-medium text-gray-900">{supplier.name}</div>
                      <div className="text-sm text-gray-500">{supplier.email}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm">
                      {supplier.businessInfo?.businessName ? (
                        <>
                          <div className="font-medium">{supplier.businessInfo.businessName}</div>
                          <div className="text-gray-500">{supplier.businessInfo.businessNumber}</div>
                        </>
                      ) : (
                        <span className="text-gray-400">미등록</span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                      supplier.status === 'active' 
                        ? 'bg-green-100 text-green-800' 
                        : supplier.status === 'pending'
                        ? 'bg-yellow-100 text-yellow-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {supplier.status === 'active' ? '활성' : supplier.status === 'pending' ? '승인 대기' : supplier.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    <div className="flex flex-col gap-1">
                      {supplier.phone && (
                        <span className="flex items-center gap-1">
                          <Phone className="w-3 h-3" />
                          {supplier.phone}
                        </span>
                      )}
                      {supplier.businessInfo?.businessPhone && (
                        <span className="flex items-center gap-1">
                          <Building className="w-3 h-3" />
                          {supplier.businessInfo.businessPhone}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    <div className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {formatDate(supplier.createdAt)}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm">
                    <div className="flex gap-2">
                      {supplier.status === 'pending' ? (
                        <button
                          onClick={() => handleApprove(supplier.id)}
                          className="text-green-600 hover:text-green-900"
                        >
                          승인
                        </button>
                      ) : (
                        <button
                          onClick={() => navigate(`/users/${supplier.id}`)}
                          className="text-blue-600 hover:text-blue-900"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                      )}
                      <button
                        onClick={() => handleDelete(supplier.id)}
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

export default SuppliersList;