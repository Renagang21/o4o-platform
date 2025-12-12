/**
 * Membership-Yaksa: Member Detail Page
 *
 * Phase 2: 회원 상세 보기 페이지
 * - 회원 정보 조회/수정
 * - 소속 정보 관리
 * - 연회비 관리
 * - 변경 이력 조회
 * - 검증 상태 관리
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Edit2,
  Save,
  X,
  CheckCircle,
  XCircle,
  Building,
  CreditCard,
  History,
  User,
  Briefcase,
  Shield,
  RefreshCw,
} from 'lucide-react';
import AdminBreadcrumb from '@/components/common/AdminBreadcrumb';
import { authClient } from '@o4o/auth-client';
import toast from 'react-hot-toast';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';

// Type definitions
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

const WORKPLACE_TYPE_LABELS: Record<WorkplaceType, string> = {
  pharmacy: '약국',
  hospital: '병원',
  public: '관공서',
  company: '기업',
  education: '교육기관',
  research: '연구기관',
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
  none: '일반회원',
};

const GENDER_LABELS: Record<Gender, string> = {
  male: '남성',
  female: '여성',
  other: '기타',
};

interface Affiliation {
  id: string;
  organizationId: string;
  organizationName?: string;
  position: string;
  isPrimary: boolean;
  isActive: boolean;
  startDate: string;
  endDate?: string;
}

interface MembershipYear {
  id: string;
  year: number;
  amount: number;
  paid: boolean;
  paidAt?: string;
  dueDate?: string;
}

interface AuditLog {
  id: string;
  action: string;
  changedFields: Array<{
    field: string;
    oldValue: any;
    newValue: any;
    label: string;
  }>;
  changedBy: string;
  changedByName?: string;
  createdAt: string;
}

interface Member {
  id: string;
  userId: string;
  organizationId: string;
  licenseNumber: string;
  name: string;
  birthdate: string;
  phone?: string;
  email?: string;
  isVerified: boolean;
  isActive: boolean;
  gender?: Gender;
  licenseIssuedAt?: string;
  licenseRenewalAt?: string;
  pharmacistType?: PharmacistType;
  pharmacyName?: string;
  pharmacyAddress?: string;
  workplaceName?: string;
  workplaceAddress?: string;
  workplaceType?: WorkplaceType;
  yaksaJoinDate?: string;
  officialRole?: OfficialRole;
  registrationNumber?: string;
  categoryId?: string;
  category?: {
    id: string;
    name: string;
  };
  affiliations?: Affiliation[];
  membershipYears?: MembershipYear[];
  createdAt: string;
  updatedAt: string;
}

type ActiveTab = 'info' | 'affiliations' | 'fees' | 'history';

const formatDate = (dateStr: string) => {
  try {
    const date = new Date(dateStr);
    return date.toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  } catch {
    return dateStr;
  }
};

const formatDateTime = (dateStr: string) => {
  try {
    const date = new Date(dateStr);
    return date.toLocaleString('ko-KR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return dateStr;
  }
};

const formatValue = (value: any): string => {
  if (value === null || value === undefined) return '(없음)';
  if (typeof value === 'boolean') return value ? '예' : '아니오';
  return String(value);
};

const MemberDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [member, setMember] = useState<Member | null>(null);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<ActiveTab>('info');
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState<Partial<Member>>({});
  const [saving, setSaving] = useState(false);

  useKeyboardShortcuts();

  const fetchMember = useCallback(async () => {
    if (!id) return;
    try {
      setLoading(true);
      const response = await authClient.api.get(`/membership/members/${id}`);
      if (response.data.success) {
        setMember(response.data.data);
        setEditData(response.data.data);
      } else {
        toast.error('회원 정보를 불러올 수 없습니다.');
      }
    } catch (error) {
      console.error('Failed to load member:', error);
      toast.error('회원 정보를 불러올 수 없습니다.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  const fetchAuditLogs = useCallback(async () => {
    if (!id) return;
    try {
      const response = await authClient.api.get(`/membership/audit-logs/member/${id}`, {
        params: { limit: 20 },
      });
      if (response.data.success) {
        setAuditLogs(response.data.data || []);
      }
    } catch {
      // Silently fail
    }
  }, [id]);

  useEffect(() => {
    fetchMember();
  }, [fetchMember]);

  useEffect(() => {
    if (activeTab === 'history') {
      fetchAuditLogs();
    }
  }, [activeTab, fetchAuditLogs]);

  const handleSave = async () => {
    if (!member) return;
    try {
      setSaving(true);
      const response = await authClient.api.patch(`/membership/members/${member.id}`, editData);
      if (response.data.success) {
        toast.success('저장되었습니다.');
        setIsEditing(false);
        fetchMember();
      } else {
        toast.error('저장에 실패했습니다.');
      }
    } catch (error) {
      console.error('Save failed:', error);
      toast.error('저장에 실패했습니다.');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setIsEditing(false);
    setEditData(member || {});
  };

  const handleToggleVerified = async () => {
    if (!member) return;
    const action = member.isVerified ? '검증 해제' : '검증 승인';
    if (!confirm(`이 회원을 ${action}하시겠습니까?`)) return;

    try {
      const response = await authClient.api.patch(`/membership/members/${member.id}`, {
        isVerified: !member.isVerified,
      });
      if (response.data.success) {
        toast.success(`${action}되었습니다.`);
        fetchMember();
      }
    } catch {
      toast.error(`${action}에 실패했습니다.`);
    }
  };

  const handleToggleActive = async () => {
    if (!member) return;
    const action = member.isActive ? '비활성화' : '활성화';
    if (!confirm(`이 회원을 ${action}하시겠습니까?`)) return;

    try {
      const response = await authClient.api.patch(`/membership/members/${member.id}`, {
        isActive: !member.isActive,
      });
      if (response.data.success) {
        toast.success(`${action}되었습니다.`);
        fetchMember();
      }
    } catch {
      toast.error(`${action}에 실패했습니다.`);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <AdminBreadcrumb
          items={[
            { label: '홈', href: '/admin' },
            { label: '회원 관리', href: '/admin/membership/members' },
            { label: '회원 상세' },
          ]}
        />
        <div className="max-w-5xl mx-auto px-4 py-8">
          <div className="flex items-center justify-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <p className="ml-4 text-gray-600">로딩 중...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!member) {
    return (
      <div className="min-h-screen bg-gray-50">
        <AdminBreadcrumb
          items={[
            { label: '홈', href: '/admin' },
            { label: '회원 관리', href: '/admin/membership/members' },
            { label: '회원 상세' },
          ]}
        />
        <div className="max-w-5xl mx-auto px-4 py-8">
          <div className="text-center text-gray-500 py-12">
            회원 정보를 찾을 수 없습니다.
          </div>
        </div>
      </div>
    );
  }

  const primaryAffiliation = member.affiliations?.find((a) => a.isPrimary);
  const secondaryAffiliations = member.affiliations?.filter((a) => !a.isPrimary) || [];

  return (
    <div className="min-h-screen bg-gray-50">
      <AdminBreadcrumb
        items={[
          { label: '홈', href: '/admin' },
          { label: '회원 관리', href: '/admin/membership/members' },
          { label: member.name },
        ]}
      />

      <div className="max-w-5xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <div className="flex justify-between items-start">
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate('/admin/membership/members')}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div>
                <h1 className="text-2xl font-semibold text-gray-900">{member.name}</h1>
                <p className="text-gray-500">면허번호: {member.licenseNumber}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span
                className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                  member.isVerified
                    ? 'bg-green-100 text-green-800'
                    : 'bg-yellow-100 text-yellow-800'
                }`}
              >
                {member.isVerified ? (
                  <>
                    <CheckCircle className="w-4 h-4 mr-1" />
                    검증됨
                  </>
                ) : (
                  <>
                    <XCircle className="w-4 h-4 mr-1" />
                    미검증
                  </>
                )}
              </span>
              <span
                className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                  member.isActive
                    ? 'bg-blue-100 text-blue-800'
                    : 'bg-gray-100 text-gray-800'
                }`}
              >
                {member.isActive ? '활성' : '비활성'}
              </span>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="flex gap-2 mt-4 pt-4 border-t border-gray-200">
            <button
              onClick={handleToggleVerified}
              className={`px-4 py-2 rounded-lg text-sm ${
                member.isVerified
                  ? 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200'
                  : 'bg-green-100 text-green-700 hover:bg-green-200'
              }`}
            >
              <Shield className="w-4 h-4 inline mr-1" />
              {member.isVerified ? '검증 해제' : '검증 승인'}
            </button>
            <button
              onClick={handleToggleActive}
              className={`px-4 py-2 rounded-lg text-sm ${
                member.isActive
                  ? 'bg-red-100 text-red-700 hover:bg-red-200'
                  : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
              }`}
            >
              {member.isActive ? '비활성화' : '활성화'}
            </button>
            <button
              onClick={fetchMember}
              className="px-4 py-2 rounded-lg text-sm bg-gray-100 text-gray-700 hover:bg-gray-200"
            >
              <RefreshCw className="w-4 h-4 inline mr-1" />
              새로고침
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="bg-white rounded-lg shadow mb-6">
          <div className="border-b border-gray-200">
            <nav className="flex space-x-8 px-6" aria-label="Tabs">
              {[
                { id: 'info', label: '기본 정보', icon: User },
                { id: 'affiliations', label: '소속 정보', icon: Building },
                { id: 'fees', label: '연회비', icon: CreditCard },
                { id: 'history', label: '변경 이력', icon: History },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as ActiveTab)}
                  className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2 ${
                    activeTab === tab.id
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <tab.icon className="w-4 h-4" />
                  {tab.label}
                </button>
              ))}
            </nav>
          </div>

          <div className="p-6">
            {/* Info Tab */}
            {activeTab === 'info' && (
              <div className="space-y-6">
                <div className="flex justify-between items-center">
                  <h2 className="text-lg font-semibold text-gray-900">회원 정보</h2>
                  {isEditing ? (
                    <div className="flex gap-2">
                      <button
                        onClick={handleCancel}
                        className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50"
                      >
                        <X className="w-4 h-4 inline mr-1" />
                        취소
                      </button>
                      <button
                        onClick={handleSave}
                        disabled={saving}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                      >
                        <Save className="w-4 h-4 inline mr-1" />
                        저장
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setIsEditing(true)}
                      className="px-4 py-2 text-blue-600 border border-blue-600 rounded-lg hover:bg-blue-50"
                    >
                      <Edit2 className="w-4 h-4 inline mr-1" />
                      수정
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">이름</label>
                    <input
                      type="text"
                      value={editData.name || ''}
                      onChange={(e) => setEditData({ ...editData, name: e.target.value })}
                      disabled={!isEditing}
                      className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg disabled:bg-gray-50"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">면허번호</label>
                    <input
                      type="text"
                      value={editData.licenseNumber || ''}
                      disabled
                      className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">연락처</label>
                    <input
                      type="text"
                      value={editData.phone || ''}
                      onChange={(e) => setEditData({ ...editData, phone: e.target.value })}
                      disabled={!isEditing}
                      className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg disabled:bg-gray-50"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">이메일</label>
                    <input
                      type="email"
                      value={editData.email || ''}
                      onChange={(e) => setEditData({ ...editData, email: e.target.value })}
                      disabled={!isEditing}
                      className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg disabled:bg-gray-50"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">약사 유형</label>
                    <select
                      value={editData.pharmacistType || ''}
                      onChange={(e) => setEditData({ ...editData, pharmacistType: e.target.value as PharmacistType })}
                      disabled={!isEditing}
                      className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg disabled:bg-gray-50"
                    >
                      <option value="">선택</option>
                      {Object.entries(PHARMACIST_TYPE_LABELS).map(([key, label]) => (
                        <option key={key} value={key}>{label}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">직책</label>
                    <select
                      value={editData.officialRole || ''}
                      onChange={(e) => setEditData({ ...editData, officialRole: e.target.value as OfficialRole })}
                      disabled={!isEditing}
                      className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg disabled:bg-gray-50"
                    >
                      {Object.entries(OFFICIAL_ROLE_LABELS).map(([key, label]) => (
                        <option key={key} value={key}>{label}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">근무지명</label>
                    <input
                      type="text"
                      value={editData.workplaceName || ''}
                      onChange={(e) => setEditData({ ...editData, workplaceName: e.target.value })}
                      disabled={!isEditing}
                      className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg disabled:bg-gray-50"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">근무지 유형</label>
                    <select
                      value={editData.workplaceType || ''}
                      onChange={(e) => setEditData({ ...editData, workplaceType: e.target.value as WorkplaceType })}
                      disabled={!isEditing}
                      className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg disabled:bg-gray-50"
                    >
                      <option value="">선택</option>
                      {Object.entries(WORKPLACE_TYPE_LABELS).map(([key, label]) => (
                        <option key={key} value={key}>{label}</option>
                      ))}
                    </select>
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700">근무지 주소</label>
                    <input
                      type="text"
                      value={editData.workplaceAddress || ''}
                      onChange={(e) => setEditData({ ...editData, workplaceAddress: e.target.value })}
                      disabled={!isEditing}
                      className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg disabled:bg-gray-50"
                    />
                  </div>
                </div>

                <div className="pt-4 border-t border-gray-200 text-sm text-gray-500">
                  <p>등록일: {formatDateTime(member.createdAt)}</p>
                  <p>수정일: {formatDateTime(member.updatedAt)}</p>
                </div>
              </div>
            )}

            {/* Affiliations Tab */}
            {activeTab === 'affiliations' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">주 소속</h3>
                  {primaryAffiliation ? (
                    <div className="bg-blue-50 p-4 rounded-lg">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                          <p className="text-sm text-gray-500">조직</p>
                          <p className="font-medium">{primaryAffiliation.organizationName || primaryAffiliation.organizationId}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-500">직위</p>
                          <p className="font-medium">{primaryAffiliation.position || '-'}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-500">소속일</p>
                          <p className="font-medium">{formatDate(primaryAffiliation.startDate)}</p>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <p className="text-gray-500">등록된 주 소속이 없습니다.</p>
                  )}
                </div>

                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">겸직</h3>
                  {secondaryAffiliations.length > 0 ? (
                    <div className="space-y-3">
                      {secondaryAffiliations.map((aff) => (
                        <div key={aff.id} className="bg-gray-50 p-4 rounded-lg">
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div>
                              <p className="text-sm text-gray-500">조직</p>
                              <p className="font-medium">{aff.organizationName || aff.organizationId}</p>
                            </div>
                            <div>
                              <p className="text-sm text-gray-500">직위</p>
                              <p className="font-medium">{aff.position || '-'}</p>
                            </div>
                            <div>
                              <p className="text-sm text-gray-500">기간</p>
                              <p className="font-medium">
                                {formatDate(aff.startDate)}
                                {aff.endDate && ` ~ ${formatDate(aff.endDate)}`}
                              </p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-gray-500">등록된 겸직이 없습니다.</p>
                  )}
                </div>
              </div>
            )}

            {/* Fees Tab */}
            {activeTab === 'fees' && (
              <div className="space-y-6">
                <h3 className="text-lg font-semibold text-gray-900">연회비 납부 이력</h3>
                {member.membershipYears && member.membershipYears.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">연도</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">금액</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">상태</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">납부일</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {member.membershipYears.sort((a, b) => b.year - a.year).map((year) => (
                          <tr key={year.id}>
                            <td className="px-4 py-3 text-sm text-gray-900">{year.year}년</td>
                            <td className="px-4 py-3 text-sm text-gray-900">{year.amount.toLocaleString()}원</td>
                            <td className="px-4 py-3">
                              <span
                                className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                  year.paid
                                    ? 'bg-green-100 text-green-800'
                                    : 'bg-red-100 text-red-800'
                                }`}
                              >
                                {year.paid ? '납부' : '미납'}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-500">
                              {year.paidAt ? formatDate(year.paidAt) : '-'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="text-gray-500">납부 이력이 없습니다.</p>
                )}
              </div>
            )}

            {/* History Tab */}
            {activeTab === 'history' && (
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900">변경 이력</h3>
                {auditLogs.length > 0 ? (
                  <div className="space-y-3">
                    {auditLogs.map((log) => (
                      <div key={log.id} className="bg-gray-50 p-4 rounded-lg">
                        <div className="flex justify-between items-start mb-2">
                          <div className="flex items-center gap-2">
                            <span
                              className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                log.action === 'create'
                                  ? 'bg-green-100 text-green-800'
                                  : log.action === 'update'
                                  ? 'bg-blue-100 text-blue-800'
                                  : 'bg-gray-100 text-gray-800'
                              }`}
                            >
                              {log.action === 'create' ? '생성' : log.action === 'update' ? '수정' : log.action}
                            </span>
                            <span className="text-sm text-gray-500">
                              by {log.changedByName || log.changedBy || '시스템'}
                            </span>
                          </div>
                          <span className="text-sm text-gray-500">{formatDateTime(log.createdAt)}</span>
                        </div>
                        <div className="space-y-1">
                          {log.changedFields.map((field, idx) => (
                            <p key={idx} className="text-sm text-gray-600">
                              <span className="font-medium">{field.label || field.field}:</span>{' '}
                              {formatValue(field.oldValue)} → {formatValue(field.newValue)}
                            </p>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500">변경 이력이 없습니다.</p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default MemberDetail;
