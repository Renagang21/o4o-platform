/**
 * Operator Users Page
 *
 * 운영자 사용자 관리 페이지
 * - 사용자 목록 조회 (페이지네이션)
 * - 역할별 필터링
 * - 사용자 상세 조회/수정
 */

import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Users,
  Search,
  Filter,
  ChevronRight,
  Shield,
  User,
  Building2,
  Mail,
  Phone,
  Calendar,
  MoreVertical,
  Edit,
  Ban,
  CheckCircle,
  XCircle,
  Clock,
} from 'lucide-react';

// 사용자 역할 타입
type UserRole = 'admin' | 'operator' | 'pharmacist' | 'user';
type UserStatus = 'active' | 'inactive' | 'pending';

interface UserData {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role: UserRole;
  status: UserStatus;
  pharmacyName?: string;
  createdAt: string;
  lastLoginAt?: string;
}

const ROLE_CONFIG: Record<UserRole, { label: string; icon: typeof Shield; bgColor: string; textColor: string }> = {
  admin: { label: '관리자', icon: Shield, bgColor: 'bg-red-100', textColor: 'text-red-700' },
  operator: { label: '운영자', icon: Shield, bgColor: 'bg-purple-100', textColor: 'text-purple-700' },
  pharmacist: { label: '약사', icon: Building2, bgColor: 'bg-blue-100', textColor: 'text-blue-700' },
  user: { label: '일반 사용자', icon: User, bgColor: 'bg-slate-100', textColor: 'text-slate-700' },
};

const STATUS_CONFIG: Record<UserStatus, { label: string; icon: typeof CheckCircle; bgColor: string; textColor: string }> = {
  active: { label: '활성', icon: CheckCircle, bgColor: 'bg-green-100', textColor: 'text-green-700' },
  inactive: { label: '비활성', icon: XCircle, bgColor: 'bg-slate-100', textColor: 'text-slate-500' },
  pending: { label: '승인 대기', icon: Clock, bgColor: 'bg-amber-100', textColor: 'text-amber-700' },
};

// 샘플 데이터
const SAMPLE_USERS: UserData[] = [
  {
    id: '1',
    name: '김약사',
    email: 'pharmacist1@test.kr',
    phone: '010-1234-5678',
    role: 'pharmacist',
    status: 'active',
    pharmacyName: '건강약국',
    createdAt: '2024-01-15T09:00:00Z',
    lastLoginAt: '2025-01-16T10:30:00Z',
  },
  {
    id: '2',
    name: '이운영',
    email: 'operator@neture.co.kr',
    phone: '010-2345-6789',
    role: 'operator',
    status: 'active',
    createdAt: '2024-02-01T09:00:00Z',
    lastLoginAt: '2025-01-16T09:00:00Z',
  },
  {
    id: '3',
    name: '박약사',
    email: 'pharmacist2@test.kr',
    phone: '010-3456-7890',
    role: 'pharmacist',
    status: 'pending',
    pharmacyName: '행복약국',
    createdAt: '2025-01-10T09:00:00Z',
  },
  {
    id: '4',
    name: '최관리',
    email: 'admin@neture.co.kr',
    phone: '010-4567-8901',
    role: 'admin',
    status: 'active',
    createdAt: '2023-12-01T09:00:00Z',
    lastLoginAt: '2025-01-16T08:00:00Z',
  },
  {
    id: '5',
    name: '정약사',
    email: 'pharmacist3@test.kr',
    phone: '010-5678-9012',
    role: 'pharmacist',
    status: 'inactive',
    pharmacyName: '사랑약국',
    createdAt: '2024-06-15T09:00:00Z',
    lastLoginAt: '2024-12-01T10:00:00Z',
  },
];

export default function UsersPage() {
  const [users] = useState<UserData[]>(SAMPLE_USERS);
  const [loading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<UserRole | ''>('');
  const [statusFilter, setStatusFilter] = useState<UserStatus | ''>('');
  const [page, setPage] = useState(1);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [showActionMenu, setShowActionMenu] = useState<string | null>(null);

  const itemsPerPage = 20;

  // 필터링된 사용자 목록
  const filteredUsers = users.filter((user) => {
    const matchesSearch =
      !searchQuery ||
      user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.pharmacyName?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesRole = !roleFilter || user.role === roleFilter;
    const matchesStatus = !statusFilter || user.status === statusFilter;
    return matchesSearch && matchesRole && matchesStatus;
  });

  const totalPages = Math.ceil(filteredUsers.length / itemsPerPage);
  const paginatedUsers = filteredUsers.slice((page - 1) * itemsPerPage, page * itemsPerPage);

  const clearFilters = () => {
    setSearchQuery('');
    setRoleFilter('');
    setStatusFilter('');
    setPage(1);
  };

  const hasFilters = searchQuery || roleFilter || statusFilter;

  // 통계
  const stats = {
    total: users.length,
    active: users.filter((u) => u.status === 'active').length,
    pending: users.filter((u) => u.status === 'pending').length,
    pharmacists: users.filter((u) => u.role === 'pharmacist').length,
  };

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-800 mb-2">사용자 관리</h1>
        <p className="text-slate-500">시스템 사용자를 조회하고 관리합니다.</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-xl shadow-sm p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-slate-100 rounded-lg flex items-center justify-center">
              <Users className="w-5 h-5 text-slate-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-800">{stats.total}</p>
              <p className="text-xs text-slate-500">전체 사용자</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
              <CheckCircle className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-800">{stats.active}</p>
              <p className="text-xs text-slate-500">활성 사용자</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center">
              <Clock className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-800">{stats.pending}</p>
              <p className="text-xs text-slate-500">승인 대기</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <Building2 className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-800">{stats.pharmacists}</p>
              <p className="text-xs text-slate-500">등록 약사</p>
            </div>
          </div>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="bg-white rounded-xl shadow-sm p-4 mb-6">
        <div className="flex items-center gap-2 mb-4">
          <Filter className="w-5 h-5 text-slate-400" />
          <span className="text-sm font-medium text-slate-700">검색 및 필터</span>
          {hasFilters && (
            <button
              onClick={clearFilters}
              className="ml-auto text-sm text-primary-600 hover:text-primary-700"
            >
              필터 초기화
            </button>
          )}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Search */}
          <div className="md:col-span-2">
            <label className="block text-xs text-slate-500 mb-1">검색</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setPage(1);
                }}
                placeholder="이름, 이메일, 약국명으로 검색"
                className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
          </div>
          {/* Role Filter */}
          <div>
            <label className="block text-xs text-slate-500 mb-1">역할</label>
            <select
              value={roleFilter}
              onChange={(e) => {
                setRoleFilter(e.target.value as UserRole | '');
                setPage(1);
              }}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="">전체</option>
              <option value="admin">관리자</option>
              <option value="operator">운영자</option>
              <option value="pharmacist">약사</option>
              <option value="user">일반 사용자</option>
            </select>
          </div>
          {/* Status Filter */}
          <div>
            <label className="block text-xs text-slate-500 mb-1">상태</label>
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value as UserStatus | '');
                setPage(1);
              }}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="">전체</option>
              <option value="active">활성</option>
              <option value="inactive">비활성</option>
              <option value="pending">승인 대기</option>
            </select>
          </div>
        </div>
      </div>

      {/* Results Count */}
      <div className="flex items-center gap-4 mb-4">
        <span className="text-sm text-slate-500">
          총 <span className="font-medium text-slate-700">{filteredUsers.length}</span>명
        </span>
      </div>

      {/* Loading */}
      {loading && (
        <div className="text-center py-16">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-600 mx-auto mb-4"></div>
          <p className="text-slate-500">불러오는 중...</p>
        </div>
      )}

      {/* Users Table */}
      {!loading && paginatedUsers.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase">
                  사용자
                </th>
                <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase">
                  연락처
                </th>
                <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase">
                  역할
                </th>
                <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase">
                  상태
                </th>
                <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase">
                  가입일
                </th>
                <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase">
                  마지막 로그인
                </th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {paginatedUsers.map((user) => {
                const roleConfig = ROLE_CONFIG[user.role];
                const statusConfig = STATUS_CONFIG[user.status];
                const RoleIcon = roleConfig.icon;
                const StatusIcon = statusConfig.icon;

                return (
                  <tr
                    key={user.id}
                    className={`hover:bg-slate-50 ${selectedUserId === user.id ? 'bg-primary-50' : ''}`}
                    onClick={() => setSelectedUserId(user.id)}
                  >
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-slate-200 rounded-full flex items-center justify-center">
                          <span className="text-sm font-medium text-slate-600">
                            {user.name.charAt(0)}
                          </span>
                        </div>
                        <div>
                          <p className="font-medium text-slate-800">{user.name}</p>
                          {user.pharmacyName && (
                            <p className="text-xs text-slate-500">{user.pharmacyName}</p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-1 text-sm text-slate-600">
                          <Mail className="w-3 h-3 text-slate-400" />
                          {user.email}
                        </div>
                        {user.phone && (
                          <div className="flex items-center gap-1 text-xs text-slate-500">
                            <Phone className="w-3 h-3 text-slate-400" />
                            {user.phone}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${roleConfig.bgColor} ${roleConfig.textColor}`}
                      >
                        <RoleIcon className="w-3 h-3" />
                        {roleConfig.label}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${statusConfig.bgColor} ${statusConfig.textColor}`}
                      >
                        <StatusIcon className="w-3 h-3" />
                        {statusConfig.label}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-1 text-sm text-slate-600">
                        <Calendar className="w-3 h-3 text-slate-400" />
                        {new Date(user.createdAt).toLocaleDateString('ko-KR')}
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      {user.lastLoginAt ? (
                        <span className="text-sm text-slate-600">
                          {new Date(user.lastLoginAt).toLocaleDateString('ko-KR')}
                        </span>
                      ) : (
                        <span className="text-sm text-slate-400">-</span>
                      )}
                    </td>
                    <td className="px-4 py-4">
                      <div className="relative">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setShowActionMenu(showActionMenu === user.id ? null : user.id);
                          }}
                          className="p-1 hover:bg-slate-100 rounded"
                        >
                          <MoreVertical className="w-4 h-4 text-slate-400" />
                        </button>
                        {showActionMenu === user.id && (
                          <div className="absolute right-0 top-full mt-1 bg-white border border-slate-200 rounded-lg shadow-lg py-1 z-10 min-w-[140px]">
                            <Link
                              to={`/operator/users/${user.id}`}
                              className="flex items-center gap-2 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <ChevronRight className="w-4 h-4" />
                              상세 보기
                            </Link>
                            <button
                              className="flex items-center gap-2 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 w-full"
                              onClick={(e) => {
                                e.stopPropagation();
                                alert('수정 기능은 준비 중입니다.');
                              }}
                            >
                              <Edit className="w-4 h-4" />
                              정보 수정
                            </button>
                            {user.status === 'active' ? (
                              <button
                                className="flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 w-full"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  alert('비활성화 기능은 준비 중입니다.');
                                }}
                              >
                                <Ban className="w-4 h-4" />
                                비활성화
                              </button>
                            ) : (
                              <button
                                className="flex items-center gap-2 px-3 py-2 text-sm text-green-600 hover:bg-green-50 w-full"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  alert('활성화 기능은 준비 중입니다.');
                                }}
                              >
                                <CheckCircle className="w-4 h-4" />
                                활성화
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 py-4 border-t border-slate-100">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-3 py-1 text-sm text-slate-600 hover:bg-slate-100 rounded disabled:opacity-50 disabled:cursor-not-allowed"
              >
                이전
              </button>
              <span className="text-sm text-slate-600">
                {page} / {totalPages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="px-3 py-1 text-sm text-slate-600 hover:bg-slate-100 rounded disabled:opacity-50 disabled:cursor-not-allowed"
              >
                다음
              </button>
            </div>
          )}
        </div>
      )}

      {/* Empty State */}
      {!loading && paginatedUsers.length === 0 && (
        <div className="bg-white rounded-xl shadow-sm p-12 text-center">
          <Users className="w-12 h-12 text-slate-300 mx-auto mb-4" />
          <p className="text-slate-500">
            {hasFilters ? '조건에 맞는 사용자가 없습니다.' : '등록된 사용자가 없습니다.'}
          </p>
        </div>
      )}

      {/* Click outside to close action menu */}
      {showActionMenu && (
        <div
          className="fixed inset-0 z-0"
          onClick={() => setShowActionMenu(null)}
        />
      )}
    </div>
  );
}
