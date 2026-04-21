/**
 * Dropshipping Suppliers List Page
 *
 * WO-O4O-TABLE-DATATABLE-DEPRECATION-V1B — BaseTable 직접 사용으로 마이그레이션
 */

import React, { useState, useEffect } from 'react';
import { Edit2, Trash2, Store, Package, TrendingUp, UserPlus, Phone, Calendar, Building, CheckCircle } from 'lucide-react';
import { UserApi } from '../../api/userApi';
import { User } from '../../types/user';
import { toast } from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import { formatDate } from '@/lib/utils';
import PageHeader from '../../components/common/PageHeader';
import { BaseTable, RowActionMenu } from '@o4o/ui';
import type { O4OColumn } from '@o4o/ui';

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
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const limit = 20;
  const [stats, setStats] = useState<SupplierStats>({ total: 0, active: 0, pending: 0, totalProducts: 0 });
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set());
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'pending'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => { fetchSuppliers(); }, [page, filterStatus, searchQuery]);

  const fetchSuppliers = async () => {
    setLoading(true);
    try {
      const filters: any = { role: 'supplier' };
      if (filterStatus !== 'all') filters.status = filterStatus;
      if (searchQuery) filters.q = searchQuery;

      const response = await UserApi.getUsers(page, limit, filters);
      const responseAny = response as any;
      const supplierData = Array.isArray(response?.data) ? response.data :
        Array.isArray(responseAny?.users) ? responseAny.users :
        Array.isArray(response) ? response : [];

      setSuppliers(supplierData);
      setTotalCount(response?.total || 0);
      setTotalPages(Math.ceil((response?.total || 0) / limit));
      setStats({
        total: response?.total || 0,
        active: Array.isArray(supplierData) ? supplierData.filter((s: User) => s.status === 'active').length : 0,
        pending: Array.isArray(supplierData) ? supplierData.filter((s: User) => s.status === 'pending').length : 0,
        totalProducts: 0,
      });
    } catch (error) {
      toast.error('공급자 목록을 불러오는데 실패했습니다');
      setSuppliers([]);
      setStats({ total: 0, active: 0, pending: 0, totalProducts: 0 });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (userId: string) => {
    try {
      await UserApi.deleteUser(userId);
      toast.success('공급자가 삭제되었습니다');
      fetchSuppliers();
    } catch (error) {
      toast.error('공급자 삭제에 실패했습니다');
    }
  };

  const handleBulkDelete = async () => {
    if (selectedKeys.size === 0) { toast.error('삭제할 공급자를 선택해주세요'); return; }
    if (!confirm(`선택한 ${selectedKeys.size}명의 공급자를 삭제하시겠습니까?`)) return;
    try {
      await Promise.all(Array.from(selectedKeys).map((id) => UserApi.deleteUser(id)));
      toast.success('선택한 공급자가 삭제되었습니다');
      setSelectedKeys(new Set());
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

  const getStatusBadge = (status: string) => (
    <span className={`px-2 py-1 text-xs font-medium rounded-full ${
      status === 'active' ? 'bg-green-100 text-green-800' :
      status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
      'bg-gray-100 text-gray-800'
    }`}>
      {status === 'active' ? '활성' : status === 'pending' ? '승인 대기' : status}
    </span>
  );

  const columns: O4OColumn<User>[] = [
    {
      key: 'info',
      header: '공급자 정보',
      render: (_, row) => (
        <div>
          <div className="text-sm font-medium text-gray-900">{row.name}</div>
          <div className="text-sm text-gray-500">{row.email}</div>
        </div>
      ),
    },
    {
      key: 'business',
      header: '사업자 정보',
      render: (_, row) => (
        <div className="text-sm">
          {(row as any).businessInfo?.businessName ? (
            <>
              <div className="font-medium">{(row as any).businessInfo.businessName}</div>
              <div className="text-gray-500">{(row as any).businessInfo.businessNumber}</div>
            </>
          ) : <span className="text-gray-400">미등록</span>}
        </div>
      ),
    },
    {
      key: 'status',
      header: '상태',
      align: 'center',
      render: (_, row) => getStatusBadge(row.status || ''),
    },
    {
      key: 'contact',
      header: '연락처',
      render: (_, row) => (
        <div className="flex flex-col gap-1 text-sm text-gray-500">
          {(row as any).phone && <span className="flex items-center gap-1"><Phone className="w-3 h-3" />{(row as any).phone}</span>}
          {(row as any).businessInfo?.businessPhone && <span className="flex items-center gap-1"><Building className="w-3 h-3" />{(row as any).businessInfo.businessPhone}</span>}
          {!(row as any).phone && !(row as any).businessInfo?.businessPhone && <span className="text-gray-400">-</span>}
        </div>
      ),
    },
    {
      key: 'createdAt',
      header: '가입일',
      sortable: true,
      sortAccessor: (row) => (row as any).createdAt || '',
      render: (_, row) => (
        <div className="flex items-center gap-1 text-sm text-gray-500">
          <Calendar className="w-3 h-3" />
          {formatDate((row as any).createdAt)}
        </div>
      ),
    },
    {
      key: '_actions',
      header: '',
      width: 56,
      system: true,
      align: 'center',
      render: (_, row) => (
        <RowActionMenu
          actions={[
            row.status === 'pending'
              ? { key: 'approve', label: '승인', icon: <CheckCircle size={14} />, variant: 'primary' as const, confirm: '이 공급자를 승인하시겠습니까?', onClick: () => handleApprove(row.id) }
              : { key: 'edit', label: '수정', icon: <Edit2 size={14} />, onClick: () => navigate(`/users/${row.id}`) },
            { key: 'delete', label: '삭제', icon: <Trash2 size={14} />, variant: 'danger', confirm: '이 공급자를 삭제하시겠습니까?', onClick: () => handleDelete(row.id) },
          ]}
        />
      ),
    },
  ];

  return (
    <div className="p-6">
      <PageHeader
        title="공급자 관리"
        subtitle="드롭쉬핑 상품 공급자 목록 및 관리"
        actions={[
          { id: 'add-supplier', label: '새 공급자 추가', icon: <UserPlus className="w-4 h-4" />, onClick: () => navigate('/users/new?role=supplier'), variant: 'primary' as const },
        ]}
      />

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center justify-between">
            <div><p className="text-sm text-gray-600">전체 공급자</p><p className="text-2xl font-bold">{stats.total}</p></div>
            <Store className="w-8 h-8 text-blue-600 opacity-50" />
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center justify-between">
            <div><p className="text-sm text-gray-600">활성 공급자</p><p className="text-2xl font-bold text-green-600">{stats.active}</p></div>
            <TrendingUp className="w-8 h-8 text-green-600 opacity-50" />
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center justify-between">
            <div><p className="text-sm text-gray-600">승인 대기</p><p className="text-2xl font-bold text-yellow-600">{stats.pending}</p></div>
            <Building className="w-8 h-8 text-yellow-600 opacity-50" />
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center justify-between">
            <div><p className="text-sm text-gray-600">등록 상품</p><p className="text-2xl font-bold">{stats.totalProducts}</p></div>
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
          {selectedKeys.size > 0 && (
            <button onClick={handleBulkDelete} className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700">
              선택 삭제 ({selectedKeys.size})
            </button>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        {loading ? (
          <div className="animate-pulse p-4 space-y-2">
            {[...Array(5)].map((_, i) => <div key={i} className="h-12 bg-gray-100 rounded" />)}
          </div>
        ) : (
          <BaseTable<User>
            columns={columns}
            data={suppliers}
            rowKey={(row) => row.id}
            emptyMessage="공급자가 없습니다"
            tableId="dropshipping-suppliers"
            columnVisibility
            persistState
            selectable
            selectedKeys={selectedKeys}
            onSelectionChange={setSelectedKeys}
          />
        )}

        {/* Pagination */}
        {totalCount > 0 && (
          <div className="flex items-center justify-between px-4 py-3 bg-white border-t border-gray-200">
            <div className="text-sm text-gray-700">
              전체 <span className="font-medium">{totalCount}</span>개 중{' '}
              <span className="font-medium">{(page - 1) * limit + 1}</span>–
              <span className="font-medium">{Math.min(page * limit, totalCount)}</span>
            </div>
            <div className="flex gap-2">
              <button onClick={() => setPage((p) => p - 1)} disabled={page <= 1} className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed">이전</button>
              <span className="px-3 py-1 text-sm">{page} / {totalPages}</span>
              <button onClick={() => setPage((p) => p + 1)} disabled={page >= totalPages} className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed">다음</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SuppliersList;
