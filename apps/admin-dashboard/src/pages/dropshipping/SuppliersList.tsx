/**
 * Dropshipping Suppliers List Page
 *
 * Refactored: PageHeader + DataTable pattern applied
 */

import React, { useState, useEffect } from 'react';
import { Edit2, Trash2, Store, Package, TrendingUp, UserPlus, Phone, Calendar, Building, Settings, CheckCircle } from 'lucide-react';
import { UserApi } from '../../api/userApi';
import { User } from '../../types/user';
import { toast } from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import { formatDate } from '@/lib/utils';
import PageHeader from '../../components/common/PageHeader';
import { DataTable, Column } from '../../components/common/DataTable';

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
  const [totalCount, setTotalCount] = useState(0);
  const [stats, setStats] = useState<SupplierStats>({
    total: 0,
    active: 0,
    pending: 0,
    totalProducts: 0
  });
  const [selectedSuppliers, setSelectedSuppliers] = useState<string[]>([]);
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
      setTotalCount(response?.total || 0);

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
    if (selectedSuppliers.length === 0) {
      toast.error('삭제할 공급자를 선택해주세요');
      return;
    }

    if (!confirm(`선택한 ${selectedSuppliers.length}명의 공급자를 삭제하시겠습니까?`)) return;

    try {
      await Promise.all(selectedSuppliers.map(id => UserApi.deleteUser(id)));
      toast.success('선택한 공급자가 삭제되었습니다');
      setSelectedSuppliers([]);
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

  const getStatusBadge = (status: string) => {
    const statusColors: Record<string, string> = {
      active: 'bg-green-100 text-green-800',
      pending: 'bg-yellow-100 text-yellow-800',
    };

    const statusLabels: Record<string, string> = {
      active: '활성',
      pending: '승인 대기',
    };

    return (
      <span className={`px-2 py-1 text-xs font-medium rounded-full ${statusColors[status] || 'bg-gray-100 text-gray-800'}`}>
        {statusLabels[status] || status}
      </span>
    );
  };

  // DataTable column definitions
  const columns: Column<User>[] = [
    {
      key: 'info',
      title: '공급자 정보',
      render: (_: unknown, record: User) => (
        <div>
          <div className="text-sm font-medium text-gray-900">{record.name}</div>
          <div className="text-sm text-gray-500">{record.email}</div>
        </div>
      ),
    },
    {
      key: 'business',
      title: '사업자 정보',
      render: (_: unknown, record: User) => (
        <div className="text-sm">
          {record.businessInfo?.businessName ? (
            <>
              <div className="font-medium">{record.businessInfo.businessName}</div>
              <div className="text-gray-500">{record.businessInfo.businessNumber}</div>
            </>
          ) : (
            <span className="text-gray-400">미등록</span>
          )}
        </div>
      ),
    },
    {
      key: 'status',
      title: '상태',
      dataIndex: 'status',
      align: 'center',
      render: (value: string) => getStatusBadge(value),
    },
    {
      key: 'contact',
      title: '연락처',
      render: (_: unknown, record: User) => (
        <div className="flex flex-col gap-1 text-sm text-gray-500">
          {record.phone && (
            <span className="flex items-center gap-1">
              <Phone className="w-3 h-3" />
              {record.phone}
            </span>
          )}
          {record.businessInfo?.businessPhone && (
            <span className="flex items-center gap-1">
              <Building className="w-3 h-3" />
              {record.businessInfo.businessPhone}
            </span>
          )}
          {!record.phone && !record.businessInfo?.businessPhone && (
            <span className="text-gray-400">-</span>
          )}
        </div>
      ),
    },
    {
      key: 'createdAt',
      title: '가입일',
      dataIndex: 'createdAt',
      sortable: true,
      render: (value: string) => (
        <div className="flex items-center gap-1 text-sm text-gray-500">
          <Calendar className="w-3 h-3" />
          {formatDate(value)}
        </div>
      ),
    },
    {
      key: 'actions',
      title: '작업',
      align: 'center',
      render: (_: unknown, record: User) => (
        <div className="flex gap-2 justify-center">
          {record.status === 'pending' ? (
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleApprove(record.id);
              }}
              className="text-green-600 hover:text-green-900 p-1"
              title="승인"
            >
              <CheckCircle className="w-4 h-4" />
            </button>
          ) : (
            <button
              onClick={(e) => {
                e.stopPropagation();
                navigate(`/users/${record.id}`);
              }}
              className="text-blue-600 hover:text-blue-900 p-1"
              title="수정"
            >
              <Edit2 className="w-4 h-4" />
            </button>
          )}
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleDelete(record.id);
            }}
            className="text-red-600 hover:text-red-900 p-1"
            title="삭제"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      ),
    },
  ];

  // PageHeader actions
  const headerActions = [
    {
      id: 'screen-options',
      label: 'Screen Options',
      icon: <Settings className="w-4 h-4" />,
      onClick: () => {
        console.log('Screen options clicked');
      },
      variant: 'secondary' as const,
    },
    {
      id: 'add-supplier',
      label: '새 공급자 추가',
      icon: <UserPlus className="w-4 h-4" />,
      onClick: () => navigate('/users/new?role=supplier'),
      variant: 'primary' as const,
    },
  ];

  return (
    <div className="p-6">
      {/* PageHeader */}
      <PageHeader
        title="공급자 관리"
        subtitle="드롭쉬핑 상품 공급자 목록 및 관리"
        actions={headerActions}
      />

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
          {selectedSuppliers.length > 0 && (
            <button
              onClick={handleBulkDelete}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
            >
              선택 삭제 ({selectedSuppliers.length})
            </button>
          )}
        </div>
      </div>

      {/* Suppliers DataTable */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <DataTable<User>
          columns={columns}
          dataSource={suppliers}
          rowKey="id"
          loading={loading}
          emptyText="공급자가 없습니다"
          rowSelection={{
            selectedRowKeys: selectedSuppliers,
            onChange: setSelectedSuppliers,
          }}
          pagination={{
            current: page,
            pageSize: 20,
            total: totalCount,
            onChange: (newPage) => setPage(newPage),
          }}
        />
      </div>
    </div>
  );
};

export default SuppliersList;
