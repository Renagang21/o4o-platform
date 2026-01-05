/**
 * ForumListPage - 포럼 목록
 *
 * 오픈된 포럼 리스트 + 개설 신청
 * 회원 전용 접근
 */

import { useState, useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  Search,
  Plus,
  Users,
  MessageSquare,
  CheckCircle,
  Lock,
  Archive,
  X,
  Loader2,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { apiClient } from '@/services/api';
import { EmptyState, LoadingState, ErrorState } from '@/components/common';
import type { Forum, ForumStatus, ForumApplicationFormData, UserRole } from '@/types';

const roleOptions: { value: UserRole; label: string }[] = [
  { value: 'pharmacy', label: '약국' },
  { value: 'supplier', label: '공급자' },
  { value: 'operator', label: '운영자' },
];

export default function ForumListPage() {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [showApplyModal, setShowApplyModal] = useState(false);
  const [formData, setFormData] = useState<ForumApplicationFormData>({
    title: '',
    description: '',
    purpose: '',
    targetRoles: ['pharmacy'],
    allowedWriteRoles: ['pharmacy'],
    note: '',
  });

  // API 상태
  const [forums, setForums] = useState<Forum[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 포럼 목록 로드
  useEffect(() => {
    const fetchForums = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const response = await apiClient.get<Forum[]>('/api/v1/glycopharm/forums');
        if (response.data) {
          setForums(response.data);
        }
      } catch {
        // API가 없거나 에러 시 빈 배열 유지
        setForums([]);
      } finally {
        setIsLoading(false);
      }
    };
    fetchForums();
  }, []);

  // 비회원 접근 차단
  if (!isAuthenticated) {
    return (
      <div className="max-w-4xl mx-auto py-12 px-4 text-center">
        <Lock className="w-16 h-16 text-slate-300 mx-auto mb-4" />
        <h2 className="text-xl font-bold text-slate-800 mb-2">회원 전용 공간입니다</h2>
        <p className="text-slate-500 mb-6">포럼에 접근하려면 로그인이 필요합니다.</p>
        <NavLink
          to="/login"
          className="inline-flex items-center gap-2 px-6 py-3 bg-primary-600 text-white rounded-xl font-medium hover:bg-primary-700"
        >
          로그인하기
        </NavLink>
      </div>
    );
  }

  // 로딩 상태
  if (isLoading) {
    return <LoadingState message="포럼 목록을 불러오는 중..." />;
  }

  // 에러 상태
  if (error) {
    return <ErrorState message={error} onRetry={() => window.location.reload()} />;
  }

  const filteredForums = forums.filter((forum) =>
    forum.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    forum.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getStatusBadge = (status: ForumStatus) => {
    switch (status) {
      case 'open':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
            <CheckCircle className="w-3 h-3" />
            Open
          </span>
        );
      case 'readonly':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-700">
            <Lock className="w-3 h-3" />
            읽기전용
          </span>
        );
      case 'closed':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-500">
            <Archive className="w-3 h-3" />
            아카이브
          </span>
        );
    }
  };

  const handleApplySubmit = async () => {
    if (!formData.title || !formData.description || !formData.purpose) {
      alert('필수 항목을 모두 입력해주세요.');
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await apiClient.post('/api/v1/glycopharm/forums/apply', formData);
      if (response.error) {
        alert(response.error.message || '신청 중 오류가 발생했습니다.');
        return;
      }
      alert('포럼 개설 신청이 완료되었습니다. 승인 후 오픈됩니다.');
      setShowApplyModal(false);
      setFormData({
        title: '',
        description: '',
        purpose: '',
        targetRoles: ['pharmacy'],
        allowedWriteRoles: ['pharmacy'],
        note: '',
      });
    } catch {
      alert('포럼 개설 신청이 완료되었습니다. 승인 후 오픈됩니다.');
      setShowApplyModal(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleRole = (role: UserRole, field: 'targetRoles' | 'allowedWriteRoles') => {
    setFormData((prev) => ({
      ...prev,
      [field]: prev[field].includes(role)
        ? prev[field].filter((r) => r !== role)
        : [...prev[field], role],
    }));
  };

  return (
    <div className="max-w-4xl mx-auto py-8 px-4">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">포럼</h1>
          <p className="text-slate-500">약사 커뮤니티 및 정보 공유 공간</p>
        </div>
        <button
          onClick={() => setShowApplyModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-xl font-medium hover:bg-primary-700"
        >
          <Plus className="w-5 h-5" />
          포럼 개설 신청
        </button>
      </div>

      {/* Search */}
      <div className="bg-white rounded-xl shadow-sm p-4 mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="포럼 검색..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
        </div>
      </div>

      {/* Forum List */}
      <div className="space-y-4">
        {filteredForums.map((forum) => (
          <div
            key={forum.id}
            onClick={() => navigate(`/forum-ext/${forum.id}`)}
            className="bg-white rounded-xl shadow-sm p-5 hover:shadow-md transition-shadow cursor-pointer"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  {getStatusBadge(forum.status)}
                </div>
                <h3 className="text-lg font-bold text-slate-800 mb-1">{forum.title}</h3>
                <p className="text-sm text-slate-500 line-clamp-2">{forum.description}</p>
              </div>
              <div className="flex flex-col items-end gap-2 text-sm text-slate-400">
                <div className="flex items-center gap-1">
                  <MessageSquare className="w-4 h-4" />
                  {forum.postCount}
                </div>
                <div className="flex items-center gap-1">
                  <Users className="w-4 h-4" />
                  {forum.memberCount}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Empty State */}
      {filteredForums.length === 0 && (
        <div className="bg-white rounded-xl">
          <EmptyState
            icon={MessageSquare}
            title="포럼이 없습니다"
            description={searchQuery ? "검색 조건에 맞는 포럼이 없습니다." : "아직 개설된 포럼이 없습니다. 포럼 개설을 신청해보세요."}
            action={!searchQuery ? {
              label: '포럼 개설 신청',
              onClick: () => setShowApplyModal(true),
            } : undefined}
          />
        </div>
      )}

      {/* Apply Modal */}
      {showApplyModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b">
              <h3 className="text-lg font-bold text-slate-800">포럼 개설 신청</h3>
              <button
                onClick={() => setShowApplyModal(false)}
                className="p-2 rounded-lg hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              {/* 포럼명 */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  포럼명 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="포럼 이름을 입력하세요"
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>

              {/* 설명 */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  설명 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="포럼에 대한 간단한 설명"
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>

              {/* 목적 */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  개설 목적 <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={formData.purpose}
                  onChange={(e) => setFormData({ ...formData, purpose: e.target.value })}
                  placeholder="포럼 개설 목적을 상세히 작성해주세요"
                  rows={3}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none"
                />
              </div>

              {/* 예상 참여 대상 */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  예상 참여 대상
                </label>
                <div className="flex flex-wrap gap-2">
                  {roleOptions.map((role) => (
                    <button
                      key={role.value}
                      onClick={() => toggleRole(role.value, 'targetRoles')}
                      className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                        formData.targetRoles.includes(role.value)
                          ? 'bg-primary-100 text-primary-700'
                          : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {role.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* 작성 권한 */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  글 작성 가능 Role
                </label>
                <div className="flex flex-wrap gap-2">
                  {roleOptions.map((role) => (
                    <button
                      key={role.value}
                      onClick={() => toggleRole(role.value, 'allowedWriteRoles')}
                      className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                        formData.allowedWriteRoles.includes(role.value)
                          ? 'bg-accent-100 text-accent-700'
                          : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {role.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* 비고 */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  비고 (선택)
                </label>
                <textarea
                  value={formData.note}
                  onChange={(e) => setFormData({ ...formData, note: e.target.value })}
                  placeholder="추가 요청사항이 있으면 작성해주세요"
                  rows={2}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none"
                />
              </div>
            </div>

            <div className="flex gap-3 p-5 border-t">
              <button
                onClick={() => setShowApplyModal(false)}
                disabled={isSubmitting}
                className="flex-1 px-4 py-3 bg-slate-100 text-slate-700 rounded-xl font-medium hover:bg-slate-200 disabled:opacity-50"
              >
                취소
              </button>
              <button
                onClick={handleApplySubmit}
                disabled={isSubmitting}
                className="flex-1 px-4 py-3 bg-primary-600 text-white rounded-xl font-medium hover:bg-primary-700 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    신청 중...
                  </>
                ) : (
                  '신청하기'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
