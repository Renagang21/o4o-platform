/**
 * Membership-Yaksa: Affiliation Management Page
 *
 * Phase 2: 소속 조직 관리 UI
 * - 조직 이동(전입/전출) 관리
 * - 겸직 관리
 * - 소속 변경 이력 조회
 */

import React, { useState, useEffect } from 'react';
import {
  Building,
  Search,
  ArrowRightLeft,
  Plus,
  History,
  Edit2,
  Trash2,
  X,
  Check,
  AlertCircle,
} from 'lucide-react';
import AdminBreadcrumb from '@/components/common/AdminBreadcrumb';
import { authClient } from '@o4o/auth-client';
import toast from 'react-hot-toast';
import { Pagination } from '@/components/common/Pagination';
import { useDebounce } from '@/hooks/useDebounce';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';

interface Affiliation {
  id: string;
  memberId: string;
  organizationId: string;
  organizationName?: string;
  position: string;
  isPrimary: boolean;
  isActive: boolean;
  startDate: string;
  endDate?: string;
  metadata?: Record<string, any>;
  createdAt: string;
  updatedAt: string;
  member?: {
    id: string;
    name: string;
    licenseNumber: string;
  };
}

interface AffiliationChangeLog {
  id: string;
  memberId: string;
  memberName?: string;
  changeType: 'transfer' | 'position_change' | 'concurrent_add' | 'concurrent_remove';
  fromOrganizationId?: string;
  fromOrganizationName?: string;
  toOrganizationId?: string;
  toOrganizationName?: string;
  fromPosition?: string;
  toPosition?: string;
  reason?: string;
  changedBy?: string;
  changedByName?: string;
  createdAt: string;
}

interface Member {
  id: string;
  name: string;
  licenseNumber: string;
  organizationId: string;
}

const CHANGE_TYPE_LABELS: Record<string, string> = {
  transfer: '조직 이동',
  position_change: '직위 변경',
  concurrent_add: '겸직 추가',
  concurrent_remove: '겸직 해제',
};

const CHANGE_TYPE_COLORS: Record<string, string> = {
  transfer: 'bg-blue-100 text-blue-800',
  position_change: 'bg-purple-100 text-purple-800',
  concurrent_add: 'bg-green-100 text-green-800',
  concurrent_remove: 'bg-red-100 text-red-800',
};

const formatDate = (dateString: string) => {
  const date = new Date(dateString);
  return date.toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
};

const formatDateTime = (dateString: string) => {
  const date = new Date(dateString);
  return date.toLocaleString('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const AffiliationManagement = () => {
  const [activeTab, setActiveTab] = useState<'affiliations' | 'history'>('affiliations');
  const [affiliations, setAffiliations] = useState<Affiliation[]>([]);
  const [changeLogs, setChangeLogs] = useState<AffiliationChangeLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [itemsPerPage] = useState(20);

  // Modal states
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [showPositionModal, setShowPositionModal] = useState(false);
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const [selectedAffiliation, setSelectedAffiliation] = useState<Affiliation | null>(null);

  // Form states
  const [transferData, setTransferData] = useState({
    toOrganizationId: '',
    reason: '',
  });
  const [positionData, setPositionData] = useState({
    position: '',
  });

  const debouncedSearchQuery = useDebounce(searchQuery, 300);
  useKeyboardShortcuts();

  useEffect(() => {
    if (activeTab === 'affiliations') {
      fetchAffiliations();
    } else {
      fetchChangeLogs();
    }
  }, [activeTab, filterType, currentPage, debouncedSearchQuery]);

  const fetchAffiliations = async () => {
    try {
      setLoading(true);
      const params: any = {
        page: currentPage,
        limit: itemsPerPage,
      };

      if (filterType === 'primary') params.isPrimary = true;
      if (filterType === 'secondary') params.isPrimary = false;
      if (debouncedSearchQuery) params.search = debouncedSearchQuery;

      const response = await authClient.api.get('/membership/affiliations', { params });

      if (response.data.success) {
        setAffiliations(response.data.data || []);
        setTotalItems(response.data.total || response.data.data?.length || 0);
      } else {
        toast.error('소속 정보를 불러올 수 없습니다.');
      }
    } catch (error: any) {
      console.error('Failed to load affiliations:', error);
      toast.error('소속 정보를 불러올 수 없습니다.');
    } finally {
      setLoading(false);
    }
  };

  const fetchChangeLogs = async () => {
    try {
      setLoading(true);
      const params: any = {
        page: currentPage,
        limit: itemsPerPage,
      };

      if (filterType !== 'all') params.changeType = filterType;
      if (debouncedSearchQuery) params.search = debouncedSearchQuery;

      const response = await authClient.api.get('/membership/affiliations/history', { params });

      if (response.data.success) {
        setChangeLogs(response.data.data || []);
        setTotalItems(response.data.total || response.data.data?.length || 0);
      } else {
        toast.error('변경 이력을 불러올 수 없습니다.');
      }
    } catch (error: any) {
      console.error('Failed to load change logs:', error);
      toast.error('변경 이력을 불러올 수 없습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handleTransfer = async () => {
    if (!selectedMember || !transferData.toOrganizationId) {
      toast.error('이동할 조직을 선택해주세요.');
      return;
    }

    try {
      const response = await authClient.api.post(`/membership/affiliations/${selectedMember.id}/transfer`, {
        toOrganizationId: transferData.toOrganizationId,
        reason: transferData.reason,
      });

      if (response.data.success) {
        toast.success('조직 이동이 완료되었습니다.');
        setShowTransferModal(false);
        setSelectedMember(null);
        setTransferData({ toOrganizationId: '', reason: '' });
        fetchAffiliations();
      } else {
        toast.error(response.data.message || '조직 이동에 실패했습니다.');
      }
    } catch (error: any) {
      console.error('Transfer failed:', error);
      toast.error('조직 이동에 실패했습니다.');
    }
  };

  const handlePositionChange = async () => {
    if (!selectedAffiliation || !positionData.position) {
      toast.error('직위를 입력해주세요.');
      return;
    }

    try {
      const response = await authClient.api.patch(`/membership/affiliations/${selectedAffiliation.id}/position`, {
        position: positionData.position,
      });

      if (response.data.success) {
        toast.success('직위가 변경되었습니다.');
        setShowPositionModal(false);
        setSelectedAffiliation(null);
        setPositionData({ position: '' });
        fetchAffiliations();
      } else {
        toast.error(response.data.message || '직위 변경에 실패했습니다.');
      }
    } catch (error: any) {
      console.error('Position change failed:', error);
      toast.error('직위 변경에 실패했습니다.');
    }
  };

  const handleSetPrimary = async (affiliationId: string) => {
    if (!confirm('이 소속을 주 소속으로 변경하시겠습니까?')) return;

    try {
      const response = await authClient.api.patch(`/membership/affiliations/${affiliationId}`, {
        isPrimary: true,
      });

      if (response.data.success) {
        toast.success('주 소속이 변경되었습니다.');
        fetchAffiliations();
      } else {
        toast.error('변경에 실패했습니다.');
      }
    } catch (error: any) {
      console.error('Set primary failed:', error);
      toast.error('변경에 실패했습니다.');
    }
  };

  const handleRemoveAffiliation = async (affiliationId: string) => {
    if (!confirm('이 소속을 삭제하시겠습니까?')) return;

    try {
      const response = await authClient.api.delete(`/membership/affiliations/${affiliationId}`);

      if (response.data.success) {
        toast.success('소속이 삭제되었습니다.');
        fetchAffiliations();
      } else {
        toast.error('삭제에 실패했습니다.');
      }
    } catch (error: any) {
      console.error('Remove affiliation failed:', error);
      toast.error('삭제에 실패했습니다.');
    }
  };

  const totalPages = Math.ceil(totalItems / itemsPerPage);

  return (
    <div className="min-h-screen bg-gray-50">
      <AdminBreadcrumb
        items={[
          { label: '홈', href: '/admin' },
          { label: '회원 관리', href: '/admin/membership/members' },
          { label: '소속 관리' },
        ]}
      />

      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="bg-white rounded-lg shadow">
          {/* Header */}
          <div className="p-6 border-b border-gray-200">
            <div className="flex justify-between items-center">
              <div>
                <h1 className="text-2xl font-semibold text-gray-900 flex items-center gap-2">
                  <Building className="w-6 h-6" />
                  소속 관리
                </h1>
                <p className="mt-1 text-sm text-gray-600">
                  회원의 조직 소속 및 겸직을 관리합니다.
                </p>
              </div>
            </div>
          </div>

          {/* Tab Navigation */}
          <div className="border-b border-gray-200">
            <nav className="flex space-x-8 px-6" aria-label="Tabs">
              <button
                onClick={() => { setActiveTab('affiliations'); setCurrentPage(1); }}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'affiliations'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <Building className="w-4 h-4 inline-block mr-2" />
                소속 목록
              </button>
              <button
                onClick={() => { setActiveTab('history'); setCurrentPage(1); }}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'history'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <History className="w-4 h-4 inline-block mr-2" />
                변경 이력
              </button>
            </nav>
          </div>

          {/* Filters */}
          <div className="p-6 border-b border-gray-200">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Search */}
              <div className="relative md:col-span-2">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  placeholder="회원명, 면허번호, 조직명 검색..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              {/* Type Filter */}
              <div>
                <select
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  {activeTab === 'affiliations' ? (
                    <>
                      <option value="all">모든 소속</option>
                      <option value="primary">주 소속</option>
                      <option value="secondary">겸직</option>
                    </>
                  ) : (
                    <>
                      <option value="all">모든 유형</option>
                      <option value="transfer">조직 이동</option>
                      <option value="position_change">직위 변경</option>
                      <option value="concurrent_add">겸직 추가</option>
                      <option value="concurrent_remove">겸직 해제</option>
                    </>
                  )}
                </select>
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="overflow-x-auto">
            {loading ? (
              <div className="p-12 text-center">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                <p className="mt-4 text-gray-600">로딩 중...</p>
              </div>
            ) : activeTab === 'affiliations' ? (
              /* Affiliations Tab */
              affiliations.length === 0 ? (
                <div className="p-12 text-center text-gray-500">
                  소속 정보가 없습니다.
                </div>
              ) : (
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        회원
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        조직
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        직위
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        소속 유형
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        기간
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        액션
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {affiliations.map((aff) => (
                      <tr key={aff.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">
                            {aff.member?.name || '-'}
                          </div>
                          <div className="text-xs text-gray-500">
                            {aff.member?.licenseNumber || '-'}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {aff.organizationName || aff.organizationId}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {aff.position || '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {aff.isPrimary ? (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                              주 소속
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                              겸직
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                          {formatDate(aff.startDate)}
                          {aff.endDate && ` ~ ${formatDate(aff.endDate)}`}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => {
                                setSelectedMember(aff.member || null);
                                setShowTransferModal(true);
                              }}
                              className="text-blue-600 hover:text-blue-900"
                              title="조직 이동"
                            >
                              <ArrowRightLeft className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => {
                                setSelectedAffiliation(aff);
                                setPositionData({ position: aff.position });
                                setShowPositionModal(true);
                              }}
                              className="text-purple-600 hover:text-purple-900"
                              title="직위 변경"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            {!aff.isPrimary && (
                              <>
                                <button
                                  onClick={() => handleSetPrimary(aff.id)}
                                  className="text-green-600 hover:text-green-900"
                                  title="주 소속으로 설정"
                                >
                                  <Check className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => handleRemoveAffiliation(aff.id)}
                                  className="text-red-600 hover:text-red-900"
                                  title="삭제"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )
            ) : (
              /* History Tab */
              changeLogs.length === 0 ? (
                <div className="p-12 text-center text-gray-500">
                  변경 이력이 없습니다.
                </div>
              ) : (
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        일시
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        회원
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        유형
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        변경 내용
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        사유
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        처리자
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {changeLogs.map((log) => (
                      <tr key={log.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                          {formatDateTime(log.createdAt)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {log.memberName || '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${CHANGE_TYPE_COLORS[log.changeType] || 'bg-gray-100 text-gray-800'}`}>
                            {CHANGE_TYPE_LABELS[log.changeType] || log.changeType}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-900">
                          {log.changeType === 'transfer' && (
                            <span>
                              {log.fromOrganizationName || log.fromOrganizationId || '(없음)'}
                              {' → '}
                              {log.toOrganizationName || log.toOrganizationId || '(없음)'}
                            </span>
                          )}
                          {log.changeType === 'position_change' && (
                            <span>
                              {log.fromPosition || '(없음)'}
                              {' → '}
                              {log.toPosition || '(없음)'}
                            </span>
                          )}
                          {log.changeType === 'concurrent_add' && (
                            <span>
                              겸직 추가: {log.toOrganizationName || log.toOrganizationId}
                              {log.toPosition && ` (${log.toPosition})`}
                            </span>
                          )}
                          {log.changeType === 'concurrent_remove' && (
                            <span>
                              겸직 해제: {log.fromOrganizationName || log.fromOrganizationId}
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600 max-w-xs truncate">
                          {log.reason || '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                          {log.changedByName || log.changedBy || '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )
            )}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="px-6 py-4 border-t border-gray-200">
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={setCurrentPage}
              />
            </div>
          )}
        </div>
      </div>

      {/* Transfer Modal */}
      {showTransferModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
            <div className="p-6 border-b border-gray-200 flex justify-between items-center">
              <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
                <ArrowRightLeft className="w-5 h-5" />
                조직 이동
              </h2>
              <button
                onClick={() => {
                  setShowTransferModal(false);
                  setSelectedMember(null);
                  setTransferData({ toOrganizationId: '', reason: '' });
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              {selectedMember && (
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="text-sm text-gray-600">대상 회원</p>
                  <p className="font-medium text-gray-900">{selectedMember.name}</p>
                  <p className="text-sm text-gray-500">{selectedMember.licenseNumber}</p>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  이동할 조직 *
                </label>
                <input
                  type="text"
                  value={transferData.toOrganizationId}
                  onChange={(e) => setTransferData({ ...transferData, toOrganizationId: e.target.value })}
                  placeholder="조직 ID 또는 이름 입력"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  이동 사유
                </label>
                <textarea
                  value={transferData.reason}
                  onChange={(e) => setTransferData({ ...transferData, reason: e.target.value })}
                  placeholder="이동 사유를 입력하세요"
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            <div className="p-4 border-t border-gray-200 flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowTransferModal(false);
                  setSelectedMember(null);
                  setTransferData({ toOrganizationId: '', reason: '' });
                }}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
              >
                취소
              </button>
              <button
                onClick={handleTransfer}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                이동
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Position Change Modal */}
      {showPositionModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
            <div className="p-6 border-b border-gray-200 flex justify-between items-center">
              <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
                <Edit2 className="w-5 h-5" />
                직위 변경
              </h2>
              <button
                onClick={() => {
                  setShowPositionModal(false);
                  setSelectedAffiliation(null);
                  setPositionData({ position: '' });
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              {selectedAffiliation?.member && (
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="text-sm text-gray-600">대상 회원</p>
                  <p className="font-medium text-gray-900">{selectedAffiliation.member.name}</p>
                  <p className="text-sm text-gray-500">
                    {selectedAffiliation.organizationName || selectedAffiliation.organizationId}
                  </p>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  새 직위 *
                </label>
                <input
                  type="text"
                  value={positionData.position}
                  onChange={(e) => setPositionData({ position: e.target.value })}
                  placeholder="직위 입력 (예: 이사, 총무)"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            <div className="p-4 border-t border-gray-200 flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowPositionModal(false);
                  setSelectedAffiliation(null);
                  setPositionData({ position: '' });
                }}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
              >
                취소
              </button>
              <button
                onClick={handlePositionChange}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                변경
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AffiliationManagement;
