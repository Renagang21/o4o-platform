/**
 * Required Course Policy Management Page - Design Core v1.0 Variant
 *
 * Phase 4-B: Design Core Inner Page Variant Application
 *
 * This is a Design Core v1.0 variant of the Required Policy page.
 * Uses AG components from packages/ui Design Core.
 */

import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@o4o/auth-context';

// Design Core v1.0 Components
import {
  AGPageHeader,
  AGSection,
  AGCard,
  AGButton,
  AGTag,
  AGModal,
  AGConfirmModal,
  AGInput,
} from '@o4o/ui';

// Icons
import {
  Plus,
  Edit,
  Trash2,
  MoreHorizontal,
  AlertTriangle,
  FileText,
  BookOpen,
  Calendar,
  Award,
} from 'lucide-react';

// API and Types
import { policiesApi, RequiredCoursePolicy } from '@/lib/api/lmsYaksa';
import { CoursePicker } from '@/components/lms-yaksa';

interface RequiredPolicyDesignCoreV1Props {
  organizationId?: string;
}

export default function RequiredPolicyDesignCoreV1({ organizationId: propOrgId }: RequiredPolicyDesignCoreV1Props) {
  const { user } = useAuth();
  const [policies, setPolicies] = useState<RequiredCoursePolicy[]>([]);
  const [selectedPolicy, setSelectedPolicy] = useState<RequiredCoursePolicy | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);

  const organizationId = propOrgId || user?.organizationId || 'default-org';

  // Fetch policies
  const fetchPolicies = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await policiesApi.getAll(organizationId);
      if (response.success && response.data) {
        setPolicies(response.data);
      } else {
        setError(response.error || '정책 목록을 불러오는데 실패했습니다.');
      }
    } catch (err) {
      setError('정책 목록을 불러오는데 실패했습니다.');
      console.error('Fetch policies error:', err);
    } finally {
      setIsLoading(false);
    }
  }, [organizationId]);

  useEffect(() => {
    fetchPolicies();
  }, [fetchPolicies]);

  // Toggle policy activation
  const handleToggleActive = async (policy: RequiredCoursePolicy) => {
    try {
      if (policy.isActive) {
        await policiesApi.deactivate(policy.id);
      } else {
        await policiesApi.activate(policy.id);
      }
      fetchPolicies();
    } catch (err) {
      setError('정책 상태 변경 중 오류가 발생했습니다.');
      console.error('Toggle active error:', err);
    }
  };

  // Delete policy
  const handleDelete = async () => {
    if (!selectedPolicy) return;
    try {
      await policiesApi.delete(selectedPolicy.id);
      fetchPolicies();
      setIsDeleteConfirmOpen(false);
      setSelectedPolicy(null);
    } catch (err) {
      setError('정책 삭제 중 오류가 발생했습니다.');
      console.error('Delete error:', err);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Page Header - Design Core v1.0 */}
      <AGPageHeader
        title="필수 교육 정책 관리"
        description="조직별 필수 교육 강좌 및 평점 요건을 관리합니다."
        icon={<FileText className="w-5 h-5" />}
        actions={
          <AGButton
            variant="primary"
            iconLeft={<Plus className="h-4 w-4" />}
            onClick={() => setIsCreateOpen(true)}
          >
            새 정책
          </AGButton>
        }
      />

      {/* Main Content */}
      <div className="px-4 sm:px-6 lg:px-8 py-6">
        {/* Error Alert */}
        {error && (
          <AGSection spacing="sm">
            <AGCard padding="md" className="border-red-200 bg-red-50">
              <div className="flex items-center gap-3 text-red-700">
                <AlertTriangle className="h-5 w-5" />
                <div>
                  <p className="font-medium">오류</p>
                  <p className="text-sm">{error}</p>
                </div>
              </div>
            </AGCard>
          </AGSection>
        )}

        {/* Policy List Section */}
        <AGSection
          title="정책 목록"
          description={`총 ${policies.length}개의 정책이 등록되어 있습니다.`}
          spacing="md"
        >
          {isLoading ? (
            <PolicyListSkeleton />
          ) : policies.length > 0 ? (
            <div className="grid gap-4">
              {policies.map((policy) => (
                <PolicyCardDesignCore
                  key={policy.id}
                  policy={policy}
                  onToggleActive={() => handleToggleActive(policy)}
                  onEdit={() => {
                    setSelectedPolicy(policy);
                    setIsEditOpen(true);
                  }}
                  onDelete={() => {
                    setSelectedPolicy(policy);
                    setIsDeleteConfirmOpen(true);
                  }}
                />
              ))}
            </div>
          ) : (
            <AGCard padding="lg" className="text-center">
              <FileText className="h-12 w-12 mx-auto text-gray-400 mb-4" />
              <p className="text-gray-500 mb-4">등록된 정책이 없습니다.</p>
              <AGButton
                variant="primary"
                iconLeft={<Plus className="h-4 w-4" />}
                onClick={() => setIsCreateOpen(true)}
              >
                첫 정책 만들기
              </AGButton>
            </AGCard>
          )}
        </AGSection>
      </div>

      {/* Edit Policy Modal */}
      <PolicyFormModalDesignCore
        policy={selectedPolicy}
        isOpen={isEditOpen}
        onClose={() => {
          setIsEditOpen(false);
          setSelectedPolicy(null);
        }}
        onSave={async (data) => {
          if (!selectedPolicy) return;
          try {
            await policiesApi.update(selectedPolicy.id, data);
            fetchPolicies();
            setIsEditOpen(false);
            setSelectedPolicy(null);
          } catch (err) {
            setError('정책 업데이트 중 오류가 발생했습니다.');
          }
        }}
        organizationId={organizationId}
      />

      {/* Create Policy Modal */}
      <PolicyFormModalDesignCore
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onSave={async (data) => {
          try {
            await policiesApi.create({ ...data, organizationId });
            fetchPolicies();
            setIsCreateOpen(false);
          } catch (err) {
            setError('정책 생성 중 오류가 발생했습니다.');
          }
        }}
        organizationId={organizationId}
      />

      {/* Delete Confirm Modal */}
      <AGConfirmModal
        open={isDeleteConfirmOpen}
        onClose={() => setIsDeleteConfirmOpen(false)}
        onConfirm={handleDelete}
        title="정책 삭제"
        message={
          selectedPolicy ? (
            <div className="space-y-2">
              <p>정말로 이 정책을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.</p>
              <div className="p-3 bg-gray-100 rounded-lg mt-3">
                <p className="font-medium">{selectedPolicy.name}</p>
                <p className="text-sm text-gray-600">
                  필수 강좌: {selectedPolicy.requiredCourseIds.length}개 / 필요 평점: {selectedPolicy.requiredCredits}
                </p>
              </div>
            </div>
          ) : (
            '정말로 이 정책을 삭제하시겠습니까?'
          )
        }
        confirmText="삭제"
        cancelText="취소"
        confirmVariant="danger"
      />
    </div>
  );
}

// Policy Card Component - Design Core v1.0
interface PolicyCardDesignCoreProps {
  policy: RequiredCoursePolicy;
  onToggleActive: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

function PolicyCardDesignCore({ policy, onToggleActive, onEdit, onDelete }: PolicyCardDesignCoreProps) {
  const isExpired = policy.validUntil && new Date(policy.validUntil) < new Date();
  const isNotYetValid = policy.validFrom && new Date(policy.validFrom) > new Date();
  const [showMenu, setShowMenu] = useState(false);

  return (
    <AGCard
      padding="md"
      shadow="sm"
      hoverable
      className={!policy.isActive ? 'opacity-60' : ''}
    >
      {/* Card Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="space-y-2">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-lg font-semibold text-gray-900">{policy.name}</h3>
            {policy.isActive ? (
              <AGTag color="green" variant="solid" size="sm">활성</AGTag>
            ) : (
              <AGTag color="gray" variant="subtle" size="sm">비활성</AGTag>
            )}
            {isExpired && (
              <AGTag color="red" variant="subtle" size="sm">만료됨</AGTag>
            )}
            {isNotYetValid && (
              <AGTag color="gray" variant="outline" size="sm">시작 전</AGTag>
            )}
          </div>
          {policy.description && (
            <p className="text-sm text-gray-500">{policy.description}</p>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          {/* Toggle Switch */}
          <button
            onClick={onToggleActive}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              policy.isActive ? 'bg-blue-600' : 'bg-gray-200'
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                policy.isActive ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>

          {/* More Menu */}
          <div className="relative">
            <AGButton
              variant="ghost"
              size="sm"
              onClick={() => setShowMenu(!showMenu)}
            >
              <MoreHorizontal className="h-4 w-4" />
            </AGButton>
            {showMenu && (
              <>
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => setShowMenu(false)}
                />
                <div className="absolute right-0 mt-1 w-32 bg-white border border-gray-200 rounded-md shadow-lg z-20">
                  <button
                    onClick={() => {
                      setShowMenu(false);
                      onEdit();
                    }}
                    className="flex items-center gap-2 w-full px-3 py-2 text-sm text-gray-700 hover:bg-gray-100"
                  >
                    <Edit className="h-4 w-4" />
                    수정
                  </button>
                  <button
                    onClick={() => {
                      setShowMenu(false);
                      onDelete();
                    }}
                    className="flex items-center gap-2 w-full px-3 py-2 text-sm text-red-600 hover:bg-red-50"
                  >
                    <Trash2 className="h-4 w-4" />
                    삭제
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Card Content - Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t border-gray-100">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-blue-50 rounded-lg">
            <BookOpen className="h-4 w-4 text-blue-600" />
          </div>
          <div>
            <p className="text-xs text-gray-500">필수 강좌</p>
            <p className="font-semibold text-gray-900">{policy.requiredCourseIds.length}개</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="p-2 bg-green-50 rounded-lg">
            <Award className="h-4 w-4 text-green-600" />
          </div>
          <div>
            <p className="text-xs text-gray-500">필요 평점</p>
            <p className="font-semibold text-gray-900">{policy.requiredCredits}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="p-2 bg-purple-50 rounded-lg">
            <Calendar className="h-4 w-4 text-purple-600" />
          </div>
          <div>
            <p className="text-xs text-gray-500">유효 기간</p>
            <p className="font-semibold text-gray-900 text-sm">
              {policy.validFrom
                ? new Date(policy.validFrom).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' })
                : '시작일 없음'}{' '}
              ~{' '}
              {policy.validUntil
                ? new Date(policy.validUntil).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' })
                : '종료일 없음'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="p-2 bg-orange-50 rounded-lg">
            <FileText className="h-4 w-4 text-orange-600" />
          </div>
          <div>
            <p className="text-xs text-gray-500">우선순위</p>
            <p className="font-semibold text-gray-900">{policy.priority}</p>
          </div>
        </div>
      </div>

      {/* Target Member Types */}
      {policy.targetMemberTypes && policy.targetMemberTypes.length > 0 && (
        <div className="mt-4 pt-4 border-t border-gray-100">
          <p className="text-xs text-gray-500 mb-2">적용 대상 회원 유형</p>
          <div className="flex flex-wrap gap-2">
            {policy.targetMemberTypes.map((type) => (
              <AGTag key={type} color="gray" variant="outline" size="sm">
                {type}
              </AGTag>
            ))}
          </div>
        </div>
      )}
    </AGCard>
  );
}

// Policy Form Modal - Design Core v1.0
interface PolicyFormModalDesignCoreProps {
  policy?: RequiredCoursePolicy | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: Partial<RequiredCoursePolicy>) => Promise<void>;
  organizationId: string;
}

function PolicyFormModalDesignCore({
  policy,
  isOpen,
  onClose,
  onSave,
  organizationId,
}: PolicyFormModalDesignCoreProps) {
  const [formData, setFormData] = useState<Partial<RequiredCoursePolicy>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [memberTypeInput, setMemberTypeInput] = useState('');

  // Courses - empty until LMS API integration
  const courses: Array<{ id: string; title: string; credits: number; category: string }> = [];

  useEffect(() => {
    if (policy) {
      setFormData({
        name: policy.name,
        description: policy.description,
        requiredCourseIds: policy.requiredCourseIds || [],
        requiredCredits: policy.requiredCredits,
        targetMemberTypes: policy.targetMemberTypes || [],
        validFrom: policy.validFrom,
        validUntil: policy.validUntil,
        priority: policy.priority,
      });
    } else {
      setFormData({
        name: '',
        description: '',
        requiredCourseIds: [],
        requiredCredits: 0,
        targetMemberTypes: [],
        priority: 0,
      });
    }
  }, [policy]);

  const handleSubmit = async () => {
    if (!formData.name) return;
    setIsSaving(true);
    try {
      await onSave(formData);
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddMemberType = () => {
    if (memberTypeInput.trim() && !formData.targetMemberTypes?.includes(memberTypeInput.trim())) {
      setFormData({
        ...formData,
        targetMemberTypes: [...(formData.targetMemberTypes || []), memberTypeInput.trim()],
      });
      setMemberTypeInput('');
    }
  };

  const handleRemoveMemberType = (type: string) => {
    setFormData({
      ...formData,
      targetMemberTypes: formData.targetMemberTypes?.filter((t) => t !== type) || [],
    });
  };

  return (
    <AGModal
      open={isOpen}
      onClose={onClose}
      title={policy ? '정책 수정' : '새 정책 생성'}
      size="lg"
      footer={
        <div className="flex justify-end gap-3">
          <AGButton variant="outline" onClick={onClose}>
            취소
          </AGButton>
          <AGButton
            variant="primary"
            onClick={handleSubmit}
            loading={isSaving}
            disabled={!formData.name}
          >
            {policy ? '수정' : '생성'}
          </AGButton>
        </div>
      }
    >
      <div className="space-y-6">
        {/* Basic Info Section */}
        <AGSection title="기본 정보" spacing="sm">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                정책 이름 *
              </label>
              <AGInput
                value={formData.name || ''}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="정책 이름을 입력하세요"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                설명
              </label>
              <textarea
                value={formData.description || ''}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="정책에 대한 설명을 입력하세요"
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </AGSection>

        {/* Course Settings Section */}
        <AGSection title="강좌 설정" spacing="sm">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                필수 강좌
              </label>
              <CoursePicker
                courses={courses}
                selectedIds={formData.requiredCourseIds || []}
                onSelect={(courseId) =>
                  setFormData({
                    ...formData,
                    requiredCourseIds: [...(formData.requiredCourseIds || []), courseId],
                  })
                }
                onDeselect={(courseId) =>
                  setFormData({
                    ...formData,
                    requiredCourseIds: formData.requiredCourseIds?.filter((id) => id !== courseId) || [],
                  })
                }
                multiple={true}
                placeholder="필수 강좌를 선택하세요..."
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  필요 평점
                </label>
                <AGInput
                  type="number"
                  step="0.5"
                  min="0"
                  value={formData.requiredCredits || 0}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      requiredCredits: parseFloat(e.target.value) || 0,
                    })
                  }
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  우선순위
                </label>
                <AGInput
                  type="number"
                  min="0"
                  value={formData.priority || 0}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      priority: parseInt(e.target.value) || 0,
                    })
                  }
                />
                <p className="text-xs text-gray-500 mt-1">숫자가 높을수록 우선 적용됩니다.</p>
              </div>
            </div>
          </div>
        </AGSection>

        {/* Period Section */}
        <AGSection title="유효 기간" spacing="sm">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                유효 시작일
              </label>
              <AGInput
                type="date"
                value={formData.validFrom?.split('T')[0] || ''}
                onChange={(e) => setFormData({ ...formData, validFrom: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                유효 종료일
              </label>
              <AGInput
                type="date"
                value={formData.validUntil?.split('T')[0] || ''}
                onChange={(e) => setFormData({ ...formData, validUntil: e.target.value })}
              />
            </div>
          </div>
        </AGSection>

        {/* Target Section */}
        <AGSection title="적용 대상" spacing="sm">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              적용 대상 회원 유형
            </label>
            <div className="flex gap-2">
              <AGInput
                value={memberTypeInput}
                onChange={(e) => setMemberTypeInput(e.target.value)}
                placeholder="회원 유형 입력..."
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddMemberType();
                  }
                }}
              />
              <AGButton variant="outline" onClick={handleAddMemberType}>
                추가
              </AGButton>
            </div>
            {formData.targetMemberTypes && formData.targetMemberTypes.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-3">
                {formData.targetMemberTypes.map((type) => (
                  <AGTag
                    key={type}
                    color="blue"
                    variant="subtle"
                    closable
                    onClose={() => handleRemoveMemberType(type)}
                  >
                    {type}
                  </AGTag>
                ))}
              </div>
            )}
            <p className="text-xs text-gray-500 mt-2">
              비워두면 모든 회원에게 적용됩니다.
            </p>
          </div>
        </AGSection>
      </div>
    </AGModal>
  );
}

// Skeleton Component
function PolicyListSkeleton() {
  return (
    <div className="space-y-4">
      {[...Array(3)].map((_, i) => (
        <AGCard key={i} padding="md">
          <div className="animate-pulse">
            <div className="flex items-start justify-between mb-4">
              <div className="space-y-2">
                <div className="h-5 w-48 bg-gray-200 rounded" />
                <div className="h-4 w-64 bg-gray-200 rounded" />
              </div>
            </div>
            <div className="grid grid-cols-4 gap-4 pt-4 border-t border-gray-100">
              {[...Array(4)].map((_, j) => (
                <div key={j} className="h-12 bg-gray-200 rounded" />
              ))}
            </div>
          </div>
        </AGCard>
      ))}
    </div>
  );
}
