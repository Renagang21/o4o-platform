/**
 * Dropshipping Partners List Page
 *
 * WO-O4O-TABLE-DATATABLE-DEPRECATION-V1B — BaseTable 직접 사용으로 마이그레이션
 */

import React, { useState, useEffect } from 'react';
import { Edit2, Trash2, Users, Award, TrendingUp, DollarSign, UserPlus, Phone, Calendar, RefreshCw, CheckCircle } from 'lucide-react';
import { UserApi } from '../../api/userApi';
import { User } from '../../types/user';
import { toast } from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import { formatDate } from '@/lib/utils';
import PageHeader from '../../components/common/PageHeader';
import { BaseTable, RowActionMenu } from '@o4o/ui';
import type { O4OColumn } from '@o4o/ui';

interface PartnerStats {
  total: number;
  active: number;
  pending: number;
  totalCommission: number;
}

const PartnersList: React.FC = () => {
  const navigate = useNavigate();
  const [partners, setPartners] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const limit = 20;
  const [stats, setStats] = useState<PartnerStats>({ total: 0, active: 0, pending: 0, totalCommission: 0 });
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set());
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'pending'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => { fetchPartners(); }, [page, filterStatus, searchQuery]);

  const fetchPartners = async () => {
    setLoading(true);
    try {
      const filters: any = { role: 'partner' };
      if (filterStatus !== 'all') filters.status = filterStatus;
      if (searchQuery) filters.q = searchQuery;

      const response = await UserApi.getUsers(page, limit, filters);
      const partnerData = Array.isArray(response?.data) ? response.data : [];

      setPartners(partnerData);
      setTotalPages(Math.ceil((response?.total || 0) / limit));
      setStats({
        total: response?.total || 0,
        active: Array.isArray(partnerData) ? partnerData.filter((p: User) => p.status === 'active').length : 0,
        pending: Array.isArray(partnerData) ? partnerData.filter((p: User) => p.status === 'pending').length : 0,
        totalCommission: 0,
      });
    } catch (error) {
      toast.error('파트너 목록을 불러오는데 실패했습니다');
      setPartners([]);
      setStats({ total: 0, active: 0, pending: 0, totalCommission: 0 });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (userId: string) => {
    try {
      await UserApi.deleteUser(userId);
      toast.success('파트너가 삭제되었습니다');
      fetchPartners();
    } catch (error) {
      toast.error('파트너 삭제에 실패했습니다');
    }
  };

  const handleBulkDelete = async () => {
    if (selectedKeys.size === 0) { toast.error('삭제할 파트너를 선택해주세요'); return; }
    if (!confirm(`선택한 ${selectedKeys.size}명의 파트너를 삭제하시겠습니까?`)) return;
    try {
      await Promise.all(Array.from(selectedKeys).map((id) => UserApi.deleteUser(id)));
      toast.success('선택한 파트너가 삭제되었습니다');
      setSelectedKeys(new Set());
      fetchPartners();
    } catch (error) {
      toast.error('일괄 삭제에 실패했습니다');
    }
  };

  const handleApprove = async (userId: string) => {
    try {
      await UserApi.approveUser(userId, '파트너 승인');
      toast.success('파트너가 승인되었습니다');
      fetchPartners();
    } catch (error) {
      toast.error('파트너 승인에 실패했습니다');
    }
  };

  const getGradeBadge = () => {
    const grades = ['bronze', 'silver', 'gold', 'platinum'];
    const grade = grades[Math.floor(Math.random() * grades.length)];
    const gradeColors: Record<string, string> = {
      bronze: 'bg-orange-100 text-orange-800',
      silver: 'bg-gray-100 text-gray-800',
      gold: 'bg-yellow-100 text-yellow-800',
      platinum: 'bg-purple-100 text-purple-800',
    };
    return <span className={`px-2 py-1 text-xs font-medium rounded-full ${gradeColors[grade]}`}>{grade.toUpperCase()}</span>;
  };

  const columns: O4OColumn<User>[] = [
    {
      key: 'info',
      header: '파트너 정보',
      render: (_, row) => (
        <div>
          <div className="text-sm font-medium text-gray-900">{row.name}</div>
          <div className="text-sm text-gray-500">{row.email}</div>
        </div>
      ),
    },
    {
      key: 'grade',
      header: '등급',
      align: 'center',
      render: () => getGradeBadge(),
    },
    {
      key: 'status',
      header: '상태',
      align: 'center',
      render: (_, row) => (
        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
          row.status === 'active' ? 'bg-green-100 text-green-800' :
          row.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
          'bg-gray-100 text-gray-800'
        }`}>
          {row.status === 'active' ? '활성' : row.status === 'pending' ? '승인 대기' : row.status}
        </span>
      ),
    },
    {
      key: 'phone',
      header: '연락처',
      render: (_, row) => (row as any).phone ? (
        <span className="flex items-center gap-1 text-sm text-gray-500">
          <Phone className="w-3 h-3" />{(row as any).phone}
        </span>
      ) : <span className="text-gray-400">-</span>,
    },
    {
      key: 'createdAt',
      header: '가입일',
      render: (_, row) => (
        <div className="flex items-center gap-1 text-sm text-gray-500">
          <Calendar className="w-3 h-3" />{formatDate((row as any).createdAt)}
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
              ? { key: 'approve', label: '승인', icon: <CheckCircle size={14} />, variant: 'primary' as const, confirm: '이 파트너를 승인하시겠습니까?', onClick: () => handleApprove(row.id) }
              : { key: 'edit', label: '수정', icon: <Edit2 size={14} />, onClick: () => navigate(`/users/${row.id}`) },
            { key: 'delete', label: '삭제', icon: <Trash2 size={14} />, variant: 'danger', confirm: '이 파트너를 삭제하시겠습니까?', onClick: () => handleDelete(row.id) },
          ]}
        />
      ),
    },
  ];

  return (
    <div className="p-6">
      <PageHeader
        title="파트너 관리"
        subtitle="드롭쉬핑 파트너 목록 및 관리"
        actions={[
          { id: 'refresh', label: '새로고침', icon: <RefreshCw className="w-4 h-4" />, onClick: fetchPartners, variant: 'secondary' as const },
          { id: 'add-partner', label: '새 파트너 추가', icon: <UserPlus className="w-4 h-4" />, onClick: () => navigate('/users/new?role=partner'), variant: 'primary' as const },
        ]}
      />

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center justify-between">
            <div><p className="text-sm text-gray-600">전체 파트너</p><p className="text-2xl font-bold">{stats.total}</p></div>
            <Users className="w-8 h-8 text-blue-600 opacity-50" />
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center justify-between">
            <div><p className="text-sm text-gray-600">활성 파트너</p><p className="text-2xl font-bold text-green-600">{stats.active}</p></div>
            <Award className="w-8 h-8 text-green-600 opacity-50" />
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center justify-between">
            <div><p className="text-sm text-gray-600">승인 대기</p><p className="text-2xl font-bold text-yellow-600">{stats.pending}</p></div>
            <TrendingUp className="w-8 h-8 text-yellow-600 opacity-50" />
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center justify-between">
            <div><p className="text-sm text-gray-600">이번 달 수수료</p><p className="text-2xl font-bold">₩{stats.totalCommission.toLocaleString()}</p></div>
            <DollarSign className="w-8 h-8 text-purple-600 opacity-50" />
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <div className="flex flex-wrap gap-4 items-center">
          <input
            type="text"
            placeholder="파트너 검색..."
            className="flex-1 min-w-[200px] px-4 py-2 border rounded-lg"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <select
            className="px-4 py-2 border rounded-lg"
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value as 'all' | 'active' | 'pending')}
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
            data={partners}
            rowKey={(row) => row.id}
            emptyMessage="파트너가 없습니다"
            tableId="dropshipping-partners"
            columnVisibility
            persistState
            selectable
            selectedKeys={selectedKeys}
            onSelectionChange={setSelectedKeys}
          />
        )}

        {/* Pagination */}
        {stats.total > 0 && (
          <div className="flex items-center justify-between px-4 py-3 bg-white border-t border-gray-200">
            <div className="text-sm text-gray-700">
              전체 <span className="font-medium">{stats.total}</span>개 중{' '}
              <span className="font-medium">{(page - 1) * limit + 1}</span>–
              <span className="font-medium">{Math.min(page * limit, stats.total)}</span>
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

export default PartnersList;
