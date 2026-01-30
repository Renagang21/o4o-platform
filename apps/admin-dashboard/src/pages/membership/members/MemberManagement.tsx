/**
 * Membership-Yaksa: Member Management Page
 *
 * Admin page for managing members, their categories, and verification status
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  CheckCircle,
  XCircle,
  Search,
  UserPlus,
  Edit,
  Eye,
} from 'lucide-react';
import AdminBreadcrumb from '@/components/common/AdminBreadcrumb';
import { authClient } from '@o4o/auth-client';
import toast from 'react-hot-toast';
import { Pagination } from '@/components/common/Pagination';
import { useDebounce } from '@/hooks/useDebounce';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
import ExportButton from '@/components/membership/ExportButton';
import BulkActionToolbar from '@/components/membership/BulkActionToolbar';

// Phase 1 Type definitions
type PharmacistType = 'working' | 'owner' | 'hospital' | 'public' | 'industry' | 'retired' | 'other';
type WorkplaceType = 'pharmacy' | 'hospital' | 'public' | 'company' | 'education' | 'research' | 'other';
type OfficialRole = 'president' | 'vice_president' | 'general_manager' | 'auditor' | 'director' | 'branch_head' | 'district_head' | 'none';
type Gender = 'male' | 'female' | 'other';

const PHARMACIST_TYPE_LABELS: Record<PharmacistType, string> = {
  working: '근무약사',
  owner: '개설약사',
  hospital: '병원약사',
  public: '공직약사',
  industry: '산업약사',
  retired: '은퇴약사',
  other: '기타',
};

const OFFICIAL_ROLE_LABELS: Record<OfficialRole, string> = {
  president: '회장',
  vice_president: '부회장',
  general_manager: '총무',
  auditor: '감사',
  director: '이사',
  branch_head: '지부장',
  district_head: '분회장',
  none: '일반',
};

interface Member {
  id: string;
  userId: string;
  organizationId: string;
  licenseNumber: string;
  name: string;
  birthdate: string;
  isVerified: boolean;
  categoryId: string | null;
  phone: string | null;
  email: string | null;
  pharmacyName: string | null;
  pharmacyAddress: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  category?: {
    id: string;
    name: string;
  };
  // Phase 1 fields
  gender?: Gender;
  pharmacistType?: PharmacistType;
  workplaceName?: string;
  workplaceType?: WorkplaceType;
  officialRole?: OfficialRole;
  registrationNumber?: string;
}

interface MemberCategory {
  id: string;
  name: string;
  description: string | null;
  requiresAnnualFee: boolean;
  annualFeeAmount: number | null;
}

type FilterVerified = 'all' | 'verified' | 'unverified';
type FilterActive = 'all' | 'active' | 'inactive';

const MemberManagement = () => {
  const [members, setMembers] = useState<Member[]>([]);
  const [categories, setCategories] = useState<MemberCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterVerified, setFilterVerified] = useState<FilterVerified>('all');
  const [filterActive, setFilterActive] = useState<FilterActive>('active');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  // Phase 1: 신규 필터
  const [filterPharmacistType, setFilterPharmacistType] = useState<string>('all');
  const [filterOfficialRole, setFilterOfficialRole] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(20);
  const [totalMembers, setTotalMembers] = useState(0);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const debouncedSearchQuery = useDebounce(searchQuery, 300);
  useKeyboardShortcuts();

  // Fetch categories
  useEffect(() => {
    fetchCategories();
  }, []);

  // Fetch members
  useEffect(() => {
    fetchMembers();
  }, [filterVerified, filterActive, filterCategory, filterPharmacistType, filterOfficialRole, currentPage, debouncedSearchQuery]);

  const fetchCategories = async () => {
    try {
      const response = await authClient.api.get('/membership/categories');
      if (response.data.success) {
        setCategories(response.data.data || []);
      }
    } catch (error: any) {
      console.error('Failed to load categories:', error);
      toast.error('카테고리를 불러올 수 없습니다.');
    }
  };

  const fetchMembers = async () => {
    try {
      setLoading(true);
      const params: any = {
        page: currentPage,
        limit: itemsPerPage,
      };

      if (filterVerified === 'verified') params.isVerified = true;
      if (filterVerified === 'unverified') params.isVerified = false;
      if (filterActive === 'active') params.isActive = true;
      if (filterActive === 'inactive') params.isActive = false;
      if (filterCategory !== 'all') params.categoryId = filterCategory;
      if (debouncedSearchQuery) params.search = debouncedSearchQuery;
      // Phase 1: 신규 필터
      if (filterPharmacistType !== 'all') params.pharmacistType = filterPharmacistType;
      if (filterOfficialRole !== 'all') params.officialRole = filterOfficialRole;

      const response = await authClient.api.get('/membership/members', { params });

      if (response.data.success) {
        setMembers(response.data.data || []);
        setTotalMembers(response.data.total || response.data.data?.length || 0);
      } else {
        toast.error('회원 목록을 불러올 수 없습니다.');
      }
    } catch (error: any) {
      console.error('Failed to load members:', error);

      const errorCode = error.response?.data?.code;
      if (errorCode === 'FORBIDDEN') {
        toast.error('권한이 필요합니다.');
      } else if (errorCode === 'TOO_MANY_REQUESTS') {
        toast.error('요청 빈도가 높습니다. 잠시 후 다시 시도해주세요.');
      } else {
        toast.error('회원 목록을 불러올 수 없습니다.');
      }
    } finally {
      setLoading(false);
    }
  };

  const navigate = useNavigate();

  const handleViewMember = (id: string) => {
    navigate(`/admin/membership/members/${id}`);
  };

  const handleToggleActive = async (id: string, currentStatus: boolean) => {
    const action = currentStatus ? '비활성화' : '활성화';
    if (!confirm(`이 회원을 ${action}하시겠습니까?`)) return;

    try {
      await authClient.api.patch(`/api/membership/members/${id}`, {
        isActive: !currentStatus,
      });
      toast.success(`${action}되었습니다.`);
      fetchMembers();
    } catch (error) {
      toast.error(`${action}에 실패했습니다.`);
    }
  };

  // Bulk selection handlers
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(members.map((m) => m.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleSelectOne = (id: string, checked: boolean) => {
    if (checked) {
      setSelectedIds([...selectedIds, id]);
    } else {
      setSelectedIds(selectedIds.filter((sid) => sid !== id));
    }
  };

  const handleClearSelection = () => {
    setSelectedIds([]);
  };

  const handleBulkSuccess = () => {
    fetchMembers();
    setSelectedIds([]);
  };

  const totalPages = Math.ceil(totalMembers / itemsPerPage);
  const isAllSelected = members.length > 0 && selectedIds.length === members.length;

  return (
    <div className="min-h-screen bg-gray-50">
      <AdminBreadcrumb
        items={[
          { label: '홈', href: '/admin' },
          { label: '회원 관리' }
        ]}
      />

      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="bg-white rounded-lg shadow">
          {/* Header */}
          <div className="p-6 border-b border-gray-200">
            <div className="flex justify-between items-center">
              <div>
                <h1 className="text-2xl font-semibold text-gray-900">회원 관리</h1>
                <p className="mt-1 text-sm text-gray-600">
                  약사 회원 정보를 관리하고 회원 상태를 확인할 수 있습니다.
                </p>
              </div>
              <div className="flex gap-3">
                <ExportButton
                  type="members"
                  filters={{
                    search: debouncedSearchQuery,
                    categoryId: filterCategory !== 'all' ? filterCategory : undefined,
                    isVerified: filterVerified !== 'all' ? filterVerified === 'verified' : undefined,
                    isActive: filterActive !== 'all' ? filterActive === 'active' : undefined,
                  }}
                />
                <button
                  onClick={() => toast.success('회원 추가 기능 - 구현 예정')}
                  className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <UserPlus className="w-5 h-5 mr-2" />
                  회원 추가
                </button>
              </div>
            </div>
          </div>

          {/* Filters */}
          <div className="p-6 border-b border-gray-200">
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
              {/* Search */}
              <div className="relative md:col-span-2">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  placeholder="이름, 면허번호 검색..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              {/* Category Filter */}
              <div>
                <select
                  value={filterCategory}
                  onChange={(e) => setFilterCategory(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="all">모든 분류</option>
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Phase 1: Pharmacist Type Filter */}
              <div>
                <select
                  value={filterPharmacistType}
                  onChange={(e) => setFilterPharmacistType(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="all">모든 약사유형</option>
                  {Object.entries(PHARMACIST_TYPE_LABELS).map(([key, label]) => (
                    <option key={key} value={key}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Phase 1: Official Role Filter */}
              <div>
                <select
                  value={filterOfficialRole}
                  onChange={(e) => setFilterOfficialRole(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="all">모든 직책</option>
                  {Object.entries(OFFICIAL_ROLE_LABELS).map(([key, label]) => (
                    <option key={key} value={key}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Verification Filter */}
              <div>
                <select
                  value={filterVerified}
                  onChange={(e) => setFilterVerified(e.target.value as FilterVerified)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="all">모든 검증 상태</option>
                  <option value="verified">검증됨</option>
                  <option value="unverified">미검증</option>
                </select>
              </div>
            </div>
            {/* Second row of filters */}
            <div className="grid grid-cols-1 md:grid-cols-6 gap-4 mt-4">
              {/* Active Filter */}
              <div>
                <select
                  value={filterActive}
                  onChange={(e) => setFilterActive(e.target.value as FilterActive)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="all">모든 활성 상태</option>
                  <option value="active">활성</option>
                  <option value="inactive">비활성</option>
                </select>
              </div>
            </div>
          </div>

          {/* Bulk Action Toolbar */}
          {selectedIds.length > 0 && (
            <BulkActionToolbar
              selectedIds={selectedIds}
              categories={categories}
              onSuccess={handleBulkSuccess}
              onClearSelection={handleClearSelection}
            />
          )}

          {/* Table */}
          <div className="overflow-x-auto">
            {loading ? (
              <div className="p-12 text-center">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                <p className="mt-4 text-gray-600">로딩 중...</p>
              </div>
            ) : members.length === 0 ? (
              <div className="p-12 text-center text-gray-500">
                회원이 없습니다.
              </div>
            ) : (
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left">
                      <input
                        type="checkbox"
                        checked={isAllSelected}
                        onChange={(e) => handleSelectAll(e.target.checked)}
                        className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
                      />
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      이름
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      면허번호
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      분류
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      근무지
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      약사유형
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      직책
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      검증 상태
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      활성 상태
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      액션
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {members.map((member) => (
                    <tr key={member.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <input
                          type="checkbox"
                          checked={selectedIds.includes(member.id)}
                          onChange={(e) => handleSelectOne(member.id, e.target.checked)}
                          className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
                        />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{member.name}</div>
                        <div className="text-sm text-gray-500">{member.email || '-'}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {member.licenseNumber}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {member.category?.name || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {member.workplaceName || member.pharmacyName || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {member.pharmacistType ? PHARMACIST_TYPE_LABELS[member.pharmacistType] : '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {member.officialRole && member.officialRole !== 'none'
                          ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-800">
                              {OFFICIAL_ROLE_LABELS[member.officialRole]}
                            </span>
                          )
                          : '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {member.isVerified ? (
                          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            <CheckCircle className="w-4 h-4 mr-1" />
                            검증됨
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                            <XCircle className="w-4 h-4 mr-1" />
                            미검증
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {member.isActive ? (
                          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                            활성
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                            비활성
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleViewMember(member.id)}
                            className="text-blue-600 hover:text-blue-900"
                            title="상세 보기"
                          >
                            <Eye className="w-5 h-5" />
                          </button>
                          <button
                            onClick={() => handleToggleActive(member.id, member.isActive)}
                            className={`${member.isActive ? 'text-red-600 hover:text-red-900' : 'text-green-600 hover:text-green-900'}`}
                            title={member.isActive ? '비활성화' : '활성화'}
                          >
                            <Edit className="w-5 h-5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="px-6 py-4 border-t border-gray-200">
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                totalItems={totalMembers}
                itemsPerPage={itemsPerPage}
                onPageChange={setCurrentPage}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MemberManagement;
