/**
 * UserDetailPage — 회원 상세
 * WO-O4O-MEMBERSHIP-CONSOLE-V1
 *
 * 사용자 기본정보 + role_assignments + service_memberships 표시
 * API: GET /api/v1/operator/members/:userId
 */

import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import {
  ArrowLeft,
  Loader2,
  AlertCircle,
  CheckCircle,
  XCircle,
  Shield,
  Globe,
  KeyRound,
  Trash2,
  UserCheck,
  UserX,
  X,
  Plus,
  MinusCircle,
  Pencil,
  Building2,
} from 'lucide-react';
import { api } from '../../lib/apiClient';
import { toast } from '@o4o/error-handling';
import EditUserModal from './EditUserModal';
import type { BusinessInfoData } from './EditUserModal';

// ─── Types ───────────────────────────────────────────────────

interface RoleData {
  id: string;
  role: string;
  isActive: boolean;
  validFrom?: string;
  validUntil?: string;
  assignedBy?: string;
  scopeType?: string;
  scopeId?: string;
  createdAt: string;
}

interface MembershipData {
  id: string;
  serviceKey: string;
  status: string;
  role: string;
  approvedBy?: string;
  approvedAt?: string;
  rejectionReason?: string;
  createdAt: string;
  updatedAt?: string;
}

interface UserDetail {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  name?: string;
  nickname?: string;
  company?: string;
  phone?: string;
  status: string;
  isActive: boolean;
  businessInfo?: BusinessInfoData;
  createdAt: string;
  updatedAt?: string;
}

// ─── API Helper ──────────────────────────────────────────────

async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const url = path.replace(/^\/api\/v1/, '') || '/';
  const method = (options?.method || 'GET').toUpperCase();
  let body: any;
  if (options?.body && typeof options.body === 'string') {
    try { body = JSON.parse(options.body); } catch { body = options.body; }
  }
  const response = await api.request({ method, url, data: body });
  return response.data;
}

// ─── Status Config ───────────────────────────────────────────

const STATUS_MAP: Record<string, { label: string; color: string; bg: string }> = {
  active: { label: '활성', color: 'text-green-700', bg: 'bg-green-50' },
  approved: { label: '승인', color: 'text-green-700', bg: 'bg-green-50' },
  pending: { label: '대기', color: 'text-amber-700', bg: 'bg-amber-50' },
  rejected: { label: '거부', color: 'text-red-700', bg: 'bg-red-50' },
  suspended: { label: '정지', color: 'text-red-700', bg: 'bg-red-50' },
  inactive: { label: '비활성', color: 'text-slate-500', bg: 'bg-slate-100' },
};

const SERVICE_LABELS: Record<string, string> = {
  glycopharm: 'GlycoPharm',
  glucoseview: 'GlucoseView',
  'k-cosmetics': 'K-Cosmetics',
  neture: 'Neture',
  'kpa-society': 'KPA Society',
  platform: 'Platform',
};

function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_MAP[status] || { label: status, color: 'text-slate-500', bg: 'bg-slate-100' };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${cfg.bg} ${cfg.color}`}>
      {cfg.label}
    </span>
  );
}

// WO-O4O-NAME-NORMALIZATION-V1: lastName+firstName > name > email prefix > '사용자'
function getUserName(u: UserDetail): string {
  if (u.lastName || u.firstName) {
    const full = `${u.lastName || ''}${u.firstName || ''}`.trim();
    if (full) return full;
  }
  if (u.name && u.name !== u.email) return u.name;
  return u.email?.split('@')[0] || '사용자';
}

// ─── Password Modal ──────────────────────────────────────────

function PasswordModal({ userId, userName, onClose, onSuccess }: {
  userId: string; userName: string; onClose: () => void; onSuccess: () => void;
}) {
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) { setError('비밀번호는 최소 6자 이상이어야 합니다.'); return; }
    setLoading(true);
    setError('');
    try {
      await apiFetch(`/api/v1/operator/members/${userId}`, {
        method: 'PUT',
        body: JSON.stringify({ password }),
      });
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-sm">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-slate-800">비밀번호 변경</h3>
          <button onClick={onClose} className="p-1 hover:bg-slate-100 rounded"><X className="w-5 h-5" /></button>
        </div>
        <p className="text-sm text-slate-500 mb-4">{userName}</p>
        {error && (
          <div className="flex items-center gap-2 rounded-lg bg-red-50 p-3 text-sm text-red-700 mb-3">
            <AlertCircle className="w-4 h-4 shrink-0" />{error}
          </div>
        )}
        <form onSubmit={handleSubmit}>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="새 비밀번호 (6자 이상)"
            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm mb-4 focus:outline-none focus:ring-2 focus:ring-primary-500"
            required
            minLength={6}
          />
          <div className="flex gap-2">
            <button type="button" onClick={onClose} className="flex-1 py-2 text-sm border border-slate-300 rounded-lg hover:bg-slate-50">취소</button>
            <button type="submit" disabled={loading} className="flex-1 py-2 text-sm bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50">
              {loading ? '처리 중...' : '변경'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Role Modal ─────────────────────────────────────────────

// TODO: Backend API로 할당 가능 역할 목록 대체 예정
const ASSIGNABLE_ROLES = [
  { value: 'glycopharm:admin', label: 'GlycoPharm Admin' },
  { value: 'glycopharm:operator', label: 'GlycoPharm Operator' },
  { value: 'glycopharm:member', label: 'GlycoPharm Member' },
];

function RoleModal({ userId, existingRoles, isAdmin, onClose, onSuccess }: {
  userId: string; existingRoles: string[]; isAdmin: boolean; onClose: () => void; onSuccess: () => void;
}) {
  const [selectedRole, setSelectedRole] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const filteredRoles = isAdmin
    ? ASSIGNABLE_ROLES
    : ASSIGNABLE_ROLES.filter(r => !r.value.endsWith(':admin'));
  const availableRoles = filteredRoles.filter(r => !existingRoles.includes(r.value));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRole) { setError('역할을 선택하세요.'); return; }
    setLoading(true);
    setError('');
    try {
      await apiFetch(`/api/v1/operator/members/${userId}/roles`, {
        method: 'POST',
        body: JSON.stringify({ role: selectedRole }),
      });
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-sm">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-slate-800">역할 추가</h3>
          <button onClick={onClose} className="p-1 hover:bg-slate-100 rounded"><X className="w-5 h-5" /></button>
        </div>
        {error && (
          <div className="flex items-center gap-2 rounded-lg bg-red-50 p-3 text-sm text-red-700 mb-3">
            <AlertCircle className="w-4 h-4 shrink-0" />{error}
          </div>
        )}
        {availableRoles.length === 0 ? (
          <p className="text-sm text-slate-500 mb-4">할당 가능한 역할이 없습니다.</p>
        ) : (
          <form onSubmit={handleSubmit}>
            <select
              value={selectedRole}
              onChange={(e) => setSelectedRole(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm mb-4 focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="">역할 선택...</option>
              {availableRoles.map(r => (
                <option key={r.value} value={r.value}>{r.label}</option>
              ))}
            </select>
            <div className="flex gap-2">
              <button type="button" onClick={onClose} className="flex-1 py-2 text-sm border border-slate-300 rounded-lg hover:bg-slate-50">취소</button>
              <button type="submit" disabled={loading || !selectedRole} className="flex-1 py-2 text-sm bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50">
                {loading ? '처리 중...' : '추가'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

// ─── Main Component ──────────────────────────────────────────

export default function UserDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user: currentUser } = useAuth();
  const isCurrentUserAdmin = currentUser?.roles?.includes('admin') ?? false;

  const [user, setUser] = useState<UserDetail | null>(null);
  const [roles, setRoles] = useState<RoleData[]>([]);
  const [memberships, setMemberships] = useState<MembershipData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);

  const fetchDetail = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError('');
    try {
      const data = await apiFetch<any>(`/api/v1/operator/members/${id}`);
      setUser(data.user);
      setRoles(data.roles || []);
      setMemberships(data.memberships || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { fetchDetail(); }, [fetchDetail]);

  const handleStatusChange = async (status: string) => {
    if (!id) return;
    const label = status === 'approved' ? '승인' : status === 'rejected' ? '거부' : status === 'suspended' ? '정지' : status;
    if (!confirm(`이 사용자를 ${label} 처리하시겠습니까?`)) return;
    setActionLoading('status');
    try {
      // WO-O4O-OPERATOR-MEMBERSHIP-APPROVAL-COMPLETE-V1:
      // Operator → membership API (admin API 접근 불가)
      if (status === 'approved' || status === 'rejected') {
        const pendingMembership = memberships.find(
          (m: any) => m.status === 'pending' || m.status === 'rejected'
        );
        if (pendingMembership) {
          const endpoint = status === 'approved' ? 'approve' : 'reject';
          await apiFetch(`/api/v1/operator/members/${pendingMembership.id}/${endpoint}`, {
            method: 'PATCH',
            ...(status === 'rejected' ? { body: JSON.stringify({ reason: '운영자 거부' }) } : {}),
          });
          fetchDetail();
          return;
        }
      }
      // Fallback: admin API (admin/super_admin only)
      await apiFetch(`/api/v1/operator/members/${id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      });
      fetchDetail();
    } catch (err: any) {
      toast.error(err.message || '오류가 발생했습니다.');
    } finally {
      setActionLoading(null);
    }
  };

  const handleDelete = async () => {
    if (!user || !id) return;
    if (!confirm(`${getUserName(user)} (${user.email}) 사용자를 삭제하시겠습니까?\n이 작업은 되돌릴 수 없습니다.`)) return;
    setActionLoading('delete');
    try {
      await apiFetch(`/api/v1/operator/members/${id}`, { method: 'DELETE' });
      navigate('/operator/users');
    } catch (err: any) {
      toast.error(err.message || '오류가 발생했습니다.');
    } finally {
      setActionLoading(null);
    }
  };

  const handleMembershipApprove = async (membershipId: string) => {
    if (!confirm('이 서비스 멤버십을 승인하시겠습니까?')) return;
    setActionLoading(membershipId);
    try {
      await apiFetch(`/api/v1/operator/members/${membershipId}/approve`, { method: 'PATCH' });
      fetchDetail();
    } catch (err: any) {
      toast.error(err.message || '오류가 발생했습니다.');
    } finally {
      setActionLoading(null);
    }
  };

  const handleMembershipReject = async (membershipId: string) => {
    const reason = prompt('거부 사유를 입력하세요 (선택사항):');
    setActionLoading(membershipId);
    try {
      await apiFetch(`/api/v1/operator/members/${membershipId}/reject`, {
        method: 'PATCH',
        body: JSON.stringify({ reason }),
      });
      fetchDetail();
    } catch (err: any) {
      toast.error(err.message || '오류가 발생했습니다.');
    } finally {
      setActionLoading(null);
    }
  };

  const handleRemoveRole = async (role: string) => {
    if (!id) return;
    if (!confirm(`역할 "${role}"을(를) 제거하시겠습니까?`)) return;
    setActionLoading(`role-${role}`);
    try {
      await apiFetch(`/api/v1/operator/members/${id}/roles/${encodeURIComponent(role)}`, {
        method: 'DELETE',
      });
      fetchDetail();
    } catch (err: any) {
      toast.error(err.message || '오류가 발생했습니다.');
    } finally {
      setActionLoading(null);
    }
  };

  if (loading) {
    return (
      <div className="p-6 text-center py-20">
        <Loader2 className="w-8 h-8 text-primary-600 animate-spin mx-auto mb-3" />
        <p className="text-slate-500 text-sm">불러오는 중...</p>
      </div>
    );
  }

  if (error || !user) {
    return (
      <div className="p-6">
        <button onClick={() => navigate('/operator/users')} className="flex items-center gap-1 text-sm text-slate-600 hover:text-slate-800 mb-4">
          <ArrowLeft className="w-4 h-4" />뒤로가기
        </button>
        <div className="flex items-center gap-2 rounded-lg bg-red-50 p-4 text-sm text-red-700">
          <AlertCircle className="w-4 h-4 shrink-0" />{error || '사용자를 찾을 수 없습니다.'}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-5xl">
      {/* Back Button */}
      <button onClick={() => navigate('/operator/users')} className="flex items-center gap-1 text-sm text-slate-600 hover:text-slate-800 mb-4">
        <ArrowLeft className="w-4 h-4" />회원 목록
      </button>

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 bg-slate-200 rounded-full flex items-center justify-center text-xl font-bold text-slate-600">
            {getUserName(user).charAt(0)}
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-800">{getUserName(user)}</h1>
            <p className="text-sm text-slate-500">{user.email}</p>
          </div>
        </div>
        <StatusBadge status={user.status} />
      </div>

      {/* 기본 정보 */}
      <section className="bg-white rounded-xl shadow-sm mb-6">
        <div className="px-5 py-4 border-b border-slate-100">
          <h2 className="text-base font-semibold text-slate-800">기본 정보</h2>
        </div>
        <div className="p-5">
          <table className="w-full text-sm">
            <tbody>
              <tr className="border-b border-slate-50">
                <td className="py-2.5 pr-4 text-slate-500 w-32">이름</td>
                <td className="py-2.5 text-slate-800">{getUserName(user)}</td>
              </tr>
              {user.nickname && (
                <tr className="border-b border-slate-50">
                  <td className="py-2.5 pr-4 text-slate-500">닉네임</td>
                  <td className="py-2.5 text-slate-800">{user.nickname}</td>
                </tr>
              )}
              <tr className="border-b border-slate-50">
                <td className="py-2.5 pr-4 text-slate-500">이메일</td>
                <td className="py-2.5 text-slate-800">{user.email}</td>
              </tr>
              {user.phone && (
                <tr className="border-b border-slate-50">
                  <td className="py-2.5 pr-4 text-slate-500">전화번호</td>
                  <td className="py-2.5 text-slate-800">{user.phone}</td>
                </tr>
              )}
              <tr className="border-b border-slate-50">
                <td className="py-2.5 pr-4 text-slate-500">상태</td>
                <td className="py-2.5"><StatusBadge status={user.status} /></td>
              </tr>
              <tr className="border-b border-slate-50">
                <td className="py-2.5 pr-4 text-slate-500">가입일</td>
                <td className="py-2.5 text-slate-800">{new Date(user.createdAt).toLocaleString('ko-KR')}</td>
              </tr>
              {user.updatedAt && (
                <tr>
                  <td className="py-2.5 pr-4 text-slate-500">수정일</td>
                  <td className="py-2.5 text-slate-800">{new Date(user.updatedAt).toLocaleString('ko-KR')}</td>
                </tr>
              )}
            </tbody>
          </table>

          {/* Actions */}
          <div className="flex items-center gap-2 mt-4 pt-4 border-t border-slate-100">
            {user.status === 'pending' && (
              <>
                <button
                  onClick={() => handleStatusChange('approved')}
                  disabled={actionLoading === 'status'}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
                >
                  <UserCheck className="w-4 h-4" />승인
                </button>
                <button
                  onClick={() => handleStatusChange('rejected')}
                  disabled={actionLoading === 'status'}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
                >
                  <UserX className="w-4 h-4" />거부
                </button>
              </>
            )}
            {(user.status === 'active' || user.status === 'approved') && (
              <button
                onClick={() => handleStatusChange('suspended')}
                disabled={actionLoading === 'status'}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm border border-amber-300 text-amber-700 rounded-lg hover:bg-amber-50 disabled:opacity-50"
              >
                <XCircle className="w-4 h-4" />정지
              </button>
            )}
            {(user.status === 'suspended' || user.status === 'rejected') && (
              <button
                onClick={() => handleStatusChange('approved')}
                disabled={actionLoading === 'status'}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
              >
                <CheckCircle className="w-4 h-4" />활성화
              </button>
            )}
            <button
              onClick={() => setShowEditModal(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50"
            >
              <Pencil className="w-4 h-4" />정보 수정
            </button>
            <button
              onClick={() => setShowPasswordModal(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50"
            >
              <KeyRound className="w-4 h-4" />비밀번호 변경
            </button>
            <button
              onClick={handleDelete}
              disabled={actionLoading === 'delete'}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm border border-red-200 text-red-600 rounded-lg hover:bg-red-50 disabled:opacity-50 ml-auto"
            >
              <Trash2 className="w-4 h-4" />삭제
            </button>
          </div>
        </div>
      </section>

      {/* 사업자 정보 (businessInfo) */}
      {user.businessInfo && (user.businessInfo.businessName || user.company) && (
        <section className="bg-white rounded-xl shadow-sm mb-6">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2">
            <Building2 className="w-4 h-4 text-slate-500" />
            <h2 className="text-base font-semibold text-slate-800">약국 정보</h2>
          </div>
          <div className="p-5">
            <table className="w-full text-sm">
              <tbody>
                {(user.businessInfo.businessName || user.company) && (
                  <tr className="border-b border-slate-50">
                    <td className="py-2.5 pr-4 text-slate-500 w-32">약국명</td>
                    <td className="py-2.5 text-slate-800">{user.businessInfo.businessName || user.company}</td>
                  </tr>
                )}
                {user.businessInfo.businessNumber && (
                  <tr className="border-b border-slate-50">
                    <td className="py-2.5 pr-4 text-slate-500">사업자등록번호</td>
                    <td className="py-2.5 text-slate-800">{user.businessInfo.businessNumber}</td>
                  </tr>
                )}
                {user.businessInfo.email && (
                  <tr className="border-b border-slate-50">
                    <td className="py-2.5 pr-4 text-slate-500">세금계산서 이메일</td>
                    <td className="py-2.5 text-slate-800">{user.businessInfo.email}</td>
                  </tr>
                )}
                {user.businessInfo.businessType && (
                  <tr className="border-b border-slate-50">
                    <td className="py-2.5 pr-4 text-slate-500">업태</td>
                    <td className="py-2.5 text-slate-800">{user.businessInfo.businessType}</td>
                  </tr>
                )}
                {user.businessInfo.businessCategory && (
                  <tr className="border-b border-slate-50">
                    <td className="py-2.5 pr-4 text-slate-500">업종</td>
                    <td className="py-2.5 text-slate-800">{user.businessInfo.businessCategory}</td>
                  </tr>
                )}
                {user.businessInfo.address && (
                  <tr className="border-b border-slate-50">
                    <td className="py-2.5 pr-4 text-slate-500">주소</td>
                    <td className="py-2.5 text-slate-800">
                      {user.businessInfo.address}
                      {user.businessInfo.address2 && ` ${user.businessInfo.address2}`}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* 역할 (role_assignments) */}
      <section className="bg-white rounded-xl shadow-sm mb-6">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2">
          <Shield className="w-4 h-4 text-slate-500" />
          <h2 className="text-base font-semibold text-slate-800">역할 (Role Assignments)</h2>
          <span className="text-xs text-slate-400 ml-auto mr-2">{roles.length}개</span>
          <button
            onClick={() => setShowRoleModal(true)}
            className="flex items-center gap-1 px-2.5 py-1 text-xs bg-primary-600 text-white rounded-lg hover:bg-primary-700"
          >
            <Plus className="w-3.5 h-3.5" />역할 추가
          </button>
        </div>
        {roles.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-100">
                <tr>
                  <th className="text-left px-5 py-2.5 text-xs font-medium text-slate-500 uppercase">역할</th>
                  <th className="text-left px-5 py-2.5 text-xs font-medium text-slate-500 uppercase">활성</th>
                  <th className="text-left px-5 py-2.5 text-xs font-medium text-slate-500 uppercase">범위</th>
                  <th className="text-left px-5 py-2.5 text-xs font-medium text-slate-500 uppercase">부여일</th>
                  <th className="text-right px-5 py-2.5 text-xs font-medium text-slate-500 uppercase">관리</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {roles.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50">
                    <td className="px-5 py-2.5 font-medium text-slate-800">{r.role}</td>
                    <td className="px-5 py-2.5">
                      {r.isActive ? (
                        <span className="inline-flex items-center gap-1 text-green-600"><CheckCircle className="w-3.5 h-3.5" />활성</span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-slate-400"><XCircle className="w-3.5 h-3.5" />비활성</span>
                      )}
                    </td>
                    <td className="px-5 py-2.5 text-slate-600">
                      {r.scopeType ? `${r.scopeType}${r.scopeId ? `:${r.scopeId.slice(0, 8)}` : ''}` : '-'}
                    </td>
                    <td className="px-5 py-2.5 text-slate-600">{new Date(r.createdAt).toLocaleDateString('ko-KR')}</td>
                    <td className="px-5 py-2.5">
                      <div className="flex items-center justify-end">
                        {r.isActive && (isCurrentUserAdmin || !r.role.endsWith(':admin')) && (
                          actionLoading === `role-${r.role}` ? (
                            <Loader2 className="w-4 h-4 animate-spin text-slate-400" />
                          ) : (
                            <button
                              onClick={() => handleRemoveRole(r.role)}
                              title="역할 제거"
                              className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg"
                            >
                              <MinusCircle className="w-4 h-4" />
                            </button>
                          )
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-8 text-center text-sm text-slate-400">할당된 역할이 없습니다.</div>
        )}
      </section>

      {/* 서비스 멤버십 (service_memberships) */}
      <section className="bg-white rounded-xl shadow-sm mb-6">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2">
          <Globe className="w-4 h-4 text-slate-500" />
          <h2 className="text-base font-semibold text-slate-800">서비스 멤버십</h2>
          <span className="text-xs text-slate-400 ml-auto">{memberships.length}개</span>
        </div>
        {memberships.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-100">
                <tr>
                  <th className="text-left px-5 py-2.5 text-xs font-medium text-slate-500 uppercase">서비스</th>
                  <th className="text-left px-5 py-2.5 text-xs font-medium text-slate-500 uppercase">상태</th>
                  <th className="text-left px-5 py-2.5 text-xs font-medium text-slate-500 uppercase">역할</th>
                  <th className="text-left px-5 py-2.5 text-xs font-medium text-slate-500 uppercase">가입일</th>
                  <th className="text-right px-5 py-2.5 text-xs font-medium text-slate-500 uppercase">관리</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {memberships.map((m) => (
                  <tr key={m.id} className="hover:bg-slate-50">
                    <td className="px-5 py-2.5 font-medium text-slate-800">{SERVICE_LABELS[m.serviceKey] || m.serviceKey}</td>
                    <td className="px-5 py-2.5"><StatusBadge status={m.status} /></td>
                    <td className="px-5 py-2.5 text-slate-600">{m.role}</td>
                    <td className="px-5 py-2.5 text-slate-600">{new Date(m.createdAt).toLocaleDateString('ko-KR')}</td>
                    <td className="px-5 py-2.5">
                      <div className="flex items-center justify-end gap-1">
                        {actionLoading === m.id ? (
                          <Loader2 className="w-4 h-4 animate-spin text-slate-400" />
                        ) : (
                          <>
                            {(m.status === 'pending' || m.status === 'rejected') && (
                              <button
                                onClick={() => handleMembershipApprove(m.id)}
                                title="멤버십 승인"
                                className="p-1.5 text-green-600 hover:bg-green-50 rounded-lg"
                              >
                                <UserCheck className="w-4 h-4" />
                              </button>
                            )}
                            {(m.status === 'pending' || m.status === 'active') && (
                              <button
                                onClick={() => handleMembershipReject(m.id)}
                                title="멤버십 거부"
                                className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg"
                              >
                                <UserX className="w-4 h-4" />
                              </button>
                            )}
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-8 text-center text-sm text-slate-400">가입된 서비스가 없습니다.</div>
        )}
      </section>

      {/* Password Modal */}
      {showPasswordModal && (
        <PasswordModal
          userId={user.id}
          userName={`${getUserName(user)} (${user.email})`}
          onClose={() => setShowPasswordModal(false)}
          onSuccess={fetchDetail}
        />
      )}

      {/* Role Modal */}
      {showRoleModal && (
        <RoleModal
          userId={user.id}
          existingRoles={roles.filter(r => r.isActive).map(r => r.role)}
          isAdmin={isCurrentUserAdmin}
          onClose={() => setShowRoleModal(false)}
          onSuccess={fetchDetail}
        />
      )}

      {/* Edit User Modal */}
      {showEditModal && (
        <EditUserModal
          userId={user.id}
          onClose={() => setShowEditModal(false)}
          onSuccess={fetchDetail}
        />
      )}
    </div>
  );
}
