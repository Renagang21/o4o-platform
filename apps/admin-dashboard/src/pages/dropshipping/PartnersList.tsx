import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Users, Award, TrendingUp, DollarSign, UserPlus, Mail, Phone, Calendar, Settings, RefreshCw } from 'lucide-react';
import { UserApi } from '../../api/userApi';
import { User, UserRole } from '../../types/user';
import { toast } from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import { formatDate } from '@/lib/utils';
import PageHeader from '../../components/common/PageHeader';
import { DataTable, Column } from '../../components/common/DataTable';

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
  const [stats, setStats] = useState<PartnerStats>({
    total: 0,
    active: 0,
    pending: 0,
    totalCommission: 0
  });
  const [selectedPartners, setSelectedPartners] = useState<Set<string>>(new Set());
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'pending'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchPartners();
  }, [page, filterStatus, searchQuery]);

  const fetchPartners = async () => {
    setLoading(true);
    try {
      const filters: any = { role: 'partner' };
      if (filterStatus !== 'all') {
        filters.status = filterStatus;
      }
      if (searchQuery) {
        filters.q = searchQuery;
      }

      const response = await UserApi.getUsers(page, 20, filters);
      
      // Handle PaginatedResponse structure and ensure data is an array
      const partnerData = Array.isArray(response?.data) ? response.data : [];
      
      setPartners(partnerData);
      setTotalPages(Math.ceil((response?.total || 0) / 20));
      
      // Calculate stats with safe array operations
      setStats({
        total: response?.total || 0,
        active: Array.isArray(partnerData) ? partnerData.filter((p: User) => p.status === 'active').length : 0,
        pending: Array.isArray(partnerData) ? partnerData.filter((p: User) => p.status === 'pending').length : 0,
        totalCommission: 0 // This would come from a separate API
      });
    } catch (error) {
      
      toast.error('파트너 목록을 불러오는데 실패했습니다');
      // Set empty data on error
      setPartners([]);
      setStats({
        total: 0,
        active: 0,
        pending: 0,
        totalCommission: 0
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (userId: string) => {
    if (!confirm('정말 이 파트너를 삭제하시겠습니까?')) return;

    try {
      await UserApi.deleteUser(userId);
      toast.success('파트너가 삭제되었습니다');
      fetchPartners();
    } catch (error) {
      
      toast.error('파트너 삭제에 실패했습니다');
    }
  };

  const handleBulkDelete = async () => {
    if (selectedPartners.size === 0) {
      toast.error('삭제할 파트너를 선택해주세요');
      return;
    }

    if (!confirm(`선택한 ${selectedPartners.size}명의 파트너를 삭제하시겠습니까?`)) return;

    try {
      await Promise.all(Array.from(selectedPartners).map(id => UserApi.deleteUser(id)));
      toast.success('선택한 파트너가 삭제되었습니다');
      setSelectedPartners(new Set());
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

  const toggleSelection = (userId: string) => {
    const newSelection = new Set(selectedPartners);
    if (newSelection.has(userId)) {
      newSelection.delete(userId);
    } else {
      newSelection.add(userId);
    }
    setSelectedPartners(newSelection);
  };

  const toggleSelectAll = () => {
    if (selectedPartners.size === partners.length) {
      setSelectedPartners(new Set());
    } else {
      setSelectedPartners(new Set(partners.map(p => p.id)));
    }
  };

  const getGradeBadge = (user: User) => {
    // This would be based on actual partner data
    const grades = ['bronze', 'silver', 'gold', 'platinum'];
    const grade = grades[Math.floor(Math.random() * grades.length)];

    const gradeColors = {
      bronze: 'bg-orange-100 text-orange-800',
      silver: 'bg-gray-100 text-gray-800',
      gold: 'bg-yellow-100 text-yellow-800',
      platinum: 'bg-purple-100 text-purple-800'
    };

    return (
      <span className={`px-2 py-1 text-xs font-medium rounded-full ${gradeColors[grade as keyof typeof gradeColors]}`}>
        {grade.toUpperCase()}
      </span>
    );
  };

  const headerActions = [
    { id: 'screen-options', label: 'Screen Options', icon: <Settings className="w-4 h-4" />, onClick: () => {}, variant: 'secondary' as const },
    { id: 'refresh', label: '새로고침', icon: <RefreshCw className="w-4 h-4" />, onClick: fetchPartners, variant: 'secondary' as const },
    { id: 'add-partner', label: '새 파트너 추가', icon: <UserPlus className="w-4 h-4" />, onClick: () => navigate('/users/new?role=partner'), variant: 'primary' as const },
  ];

  const columns: Column<User>[] = [
    {
      key: 'info',
      title: '파트너 정보',
      render: (_: unknown, record: User) => (
        <div>
          <div className="text-sm font-medium text-gray-900">{record.name}</div>
          <div className="text-sm text-gray-500">{record.email}</div>
        </div>
      ),
    },
    {
      key: 'grade',
      title: '등급',
      align: 'center' as const,
      render: (_: unknown, record: User) => getGradeBadge(record),
    },
    {
      key: 'status',
      title: '상태',
      dataIndex: 'status',
      align: 'center' as const,
      render: (value: string) => (
        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
          value === 'active'
            ? 'bg-green-100 text-green-800'
            : value === 'pending'
            ? 'bg-yellow-100 text-yellow-800'
            : 'bg-gray-100 text-gray-800'
        }`}>
          {value === 'active' ? '활성' : value === 'pending' ? '승인 대기' : value}
        </span>
      ),
    },
    {
      key: 'phone',
      title: '연락처',
      dataIndex: 'phone',
      render: (value: string) => value ? (
        <span className="flex items-center gap-1 text-sm text-gray-500">
          <Phone className="w-3 h-3" />
          {value}
        </span>
      ) : <span className="text-gray-400">-</span>,
    },
    {
      key: 'createdAt',
      title: '가입일',
      dataIndex: 'createdAt',
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
      align: 'center' as const,
      render: (_: unknown, record: User) => (
        <div className="flex gap-2 justify-center">
          {record.status === 'pending' ? (
            <button
              onClick={() => handleApprove(record.id)}
              className="text-green-600 hover:text-green-900"
            >
              승인
            </button>
          ) : (
            <button
              onClick={() => navigate(`/users/${record.id}`)}
              className="text-blue-600 hover:text-blue-900"
            >
              <Edit2 className="w-4 h-4" />
            </button>
          )}
          <button
            onClick={() => handleDelete(record.id)}
            className="text-red-600 hover:text-red-900"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="p-6">
      <PageHeader
        title="파트너 관리"
        subtitle="드롭쉬핑 파트너 목록 및 관리"
        actions={headerActions}
      />

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">전체 파트너</p>
              <p className="text-2xl font-bold">{stats.total}</p>
            </div>
            <Users className="w-8 h-8 text-blue-600 opacity-50" />
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">활성 파트너</p>
              <p className="text-2xl font-bold text-green-600">{stats.active}</p>
            </div>
            <Award className="w-8 h-8 text-green-600 opacity-50" />
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">승인 대기</p>
              <p className="text-2xl font-bold text-yellow-600">{stats.pending}</p>
            </div>
            <TrendingUp className="w-8 h-8 text-yellow-600 opacity-50" />
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">이번 달 수수료</p>
              <p className="text-2xl font-bold">₩{stats.totalCommission.toLocaleString()}</p>
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
          {selectedPartners.size > 0 && (
            <button
              onClick={handleBulkDelete}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
            >
              선택 삭제 ({selectedPartners.size})
            </button>
          )}
        </div>
      </div>

      {/* DataTable */}
      <DataTable<User>
        columns={columns}
        data={partners}
        loading={loading}
        emptyMessage="파트너가 없습니다"
        pagination={{
          current: page,
          total: stats.total,
          pageSize: 20,
          onChange: setPage,
        }}
      />
    </div>
  );
};

export default PartnersList;