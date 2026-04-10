import type { ReactNode } from 'react';
import { Edit3, Check, X, Loader2 } from 'lucide-react';

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
    <div className="bg-white rounded-2xl shadow-sm overflow-hidden mb-4">
      {/* Gradient Header */}
      <div className="bg-gradient-to-r from-primary-500 to-primary-600 px-6 py-8">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0">
            <span className="text-2xl font-bold text-white">{initial}</span>
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-xl font-bold text-white truncate">{name}</h2>
            <p className="text-primary-100 text-sm truncate">{email}</p>
            <div className="flex items-center gap-2 mt-2">
              <span className="inline-block px-3 py-1 bg-white/20 rounded-full text-xs font-medium text-white">
                {roleLabel}
              </span>
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
              className="p-2 bg-white/20 rounded-lg hover:bg-white/30 transition-colors flex-shrink-0"
            >
              <Edit3 className="w-5 h-5 text-white" />
            </button>
          )}
        </div>
      </div>

      {/* Profile Info */}
      <div className="p-6">
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
