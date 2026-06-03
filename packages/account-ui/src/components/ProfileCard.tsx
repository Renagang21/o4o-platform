import type { ReactNode } from 'react';
import { Edit3, Check, X, Loader2 } from 'lucide-react';
import { RoleBadge } from './RoleBadge.js';

interface ProfileCardProps {
  initial: string;
  name: string;
  email: string;
  roleLabel: string;
  statusLabel?: string;
  statusColor?: string;
  isEditing: boolean;
  saving: boolean;
  onEdit: () => void;
  onSave: () => void;
  onCancel: () => void;
  children: ReactNode;
}

export function ProfileCard({
  initial,
  name,
  email,
  roleLabel,
  statusLabel,
  statusColor,
  isEditing,
  saving,
  onEdit,
  onSave,
  onCancel,
  children,
}: ProfileCardProps) {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-4">
      {/* 중립 헤더 — KPA 톤 정렬: 대형 컬러 배너 제거, 좌측 회색 아바타 + 정보 + 우측 수정 버튼.
          서비스 브랜드 컬러는 역할 badge 의 작은 accent(RoleBadge soft) 로만 유지. */}
      <div className="flex items-center gap-5">
        <div className="w-20 h-20 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0">
          <span className="text-3xl font-bold text-gray-400">{initial}</span>
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="text-xl font-bold text-gray-900 truncate">{name}</h2>
          <p className="text-sm text-gray-500 truncate mt-0.5">{email}</p>
          <div className="flex items-center gap-2 mt-2">
            <RoleBadge label={roleLabel} tone="primary" variant="soft" size="md" />
            {statusLabel && (
              <span
                className="inline-block px-2 py-0.5 rounded-full text-xs font-medium"
                style={statusColor ? { backgroundColor: `${statusColor}20`, color: statusColor } : undefined}
              >
                {statusLabel}
              </span>
            )}
          </div>
        </div>
        {!isEditing && (
          <button
            onClick={onEdit}
            aria-label="프로필 수정"
            className="flex-shrink-0 p-2 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 transition-colors"
          >
            <Edit3 className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Profile Info — 헤더와 divider 로 구분 */}
      <div className="mt-5 pt-5 border-t border-gray-100">
        <h3 className="text-sm font-semibold text-gray-900 mb-4">기본 정보</h3>
        <div className="space-y-4">
          {children}
        </div>
        {isEditing && (
          <div className="flex gap-2 mt-6">
            <button
              onClick={onCancel}
              disabled={saving}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 border border-gray-200 text-gray-600 font-medium rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              <X className="w-4 h-4" />
              취소
            </button>
            <button
              onClick={onSave}
              disabled={saving}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-primary-600 text-white font-medium rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
              {saving ? '저장 중...' : '저장'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
