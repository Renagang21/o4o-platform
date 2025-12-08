/**
 * YaksaModerationPanel - Moderation Controls Component
 *
 * Operator/Admin-only panel for post moderation actions.
 */

'use client';

import { useState } from 'react';
import { yaksaStyles } from './theme';
import type { YaksaPost, YaksaRole } from '@/lib/yaksa/forum-data';
import { hasRoleAccess } from '@/lib/yaksa/forum-data';

interface YaksaModerationPanelProps {
  post: YaksaPost;
  userRole: YaksaRole;
  onApprove?: () => void;
  onReject?: (reason: string) => void;
  onPin?: () => void;
  onUnpin?: () => void;
  onLock?: () => void;
  onUnlock?: () => void;
  onDelete?: () => void;
  onReport?: () => void;
}

export function YaksaModerationPanel({
  post,
  userRole,
  onApprove,
  onReject,
  onPin,
  onUnpin,
  onLock,
  onUnlock,
  onDelete,
  onReport,
}: YaksaModerationPanelProps) {
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const canModerate = hasRoleAccess(userRole, 'operator');
  const canDelete = hasRoleAccess(userRole, 'administrator');

  if (!canModerate) {
    // Show report button only for non-moderators
    return (
      <div className="yaksa-moderation-panel">
        <button
          onClick={onReport}
          className="flex items-center gap-1 px-3 py-1.5 rounded text-sm transition-colors hover:opacity-80"
          style={{
            backgroundColor: 'var(--yaksa-surface-tertiary)',
            color: 'var(--yaksa-text-secondary)',
          }}
        >
          🚨 신고하기
        </button>
      </div>
    );
  }

  const handleReject = () => {
    if (rejectReason.trim() && onReject) {
      onReject(rejectReason);
      setShowRejectModal(false);
      setRejectReason('');
    }
  };

  const handleDelete = () => {
    if (onDelete) {
      onDelete();
      setShowDeleteConfirm(false);
    }
  };

  return (
    <div
      className="yaksa-moderation-panel p-4 rounded-lg border"
      style={{
        backgroundColor: 'var(--yaksa-surface-secondary)',
        borderColor: 'var(--yaksa-border)',
      }}
    >
      <h4
        className="text-sm font-semibold mb-3 flex items-center gap-2"
        style={yaksaStyles.textPrimary}
      >
        🛡️ 관리 패널
        <span className="px-1.5 py-0.5 rounded text-xs" style={yaksaStyles.badgeOperator}>
          {userRole === 'administrator' ? '관리자' : '운영자'}
        </span>
      </h4>

      {/* Status Info */}
      <div
        className="mb-3 p-2 rounded text-sm"
        style={{
          backgroundColor: 'var(--yaksa-surface)',
          borderLeft: `3px solid ${getStatusColor(post.status)}`,
        }}
      >
        <span style={yaksaStyles.textMuted}>현재 상태: </span>
        <span className="font-medium" style={{ color: getStatusColor(post.status) }}>
          {getStatusLabel(post.status)}
        </span>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-wrap gap-2">
        {/* Approval Actions */}
        {post.status === 'pending' && (
          <>
            <button
              onClick={onApprove}
              className="flex items-center gap-1 px-3 py-1.5 rounded text-sm font-medium transition-colors hover:opacity-90"
              style={{
                backgroundColor: 'var(--yaksa-success)',
                color: '#ffffff',
              }}
            >
              ✓ 승인
            </button>
            <button
              onClick={() => setShowRejectModal(true)}
              className="flex items-center gap-1 px-3 py-1.5 rounded text-sm font-medium transition-colors hover:opacity-90"
              style={{
                backgroundColor: 'var(--yaksa-critical)',
                color: '#ffffff',
              }}
            >
              ✕ 반려
            </button>
          </>
        )}

        {/* Pin/Unpin */}
        {post.isPinned ? (
          <button
            onClick={onUnpin}
            className="flex items-center gap-1 px-3 py-1.5 rounded text-sm transition-colors hover:opacity-80"
            style={yaksaStyles.buttonSecondary}
          >
            📌 고정 해제
          </button>
        ) : (
          <button
            onClick={onPin}
            className="flex items-center gap-1 px-3 py-1.5 rounded text-sm transition-colors hover:opacity-80"
            style={yaksaStyles.buttonSecondary}
          >
            📌 고정
          </button>
        )}

        {/* Lock/Unlock */}
        {post.isLocked ? (
          <button
            onClick={onUnlock}
            className="flex items-center gap-1 px-3 py-1.5 rounded text-sm transition-colors hover:opacity-80"
            style={yaksaStyles.buttonSecondary}
          >
            🔓 잠금 해제
          </button>
        ) : (
          <button
            onClick={onLock}
            className="flex items-center gap-1 px-3 py-1.5 rounded text-sm transition-colors hover:opacity-80"
            style={yaksaStyles.buttonSecondary}
          >
            🔒 잠금
          </button>
        )}

        {/* Delete (Admin only) */}
        {canDelete && (
          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="flex items-center gap-1 px-3 py-1.5 rounded text-sm transition-colors hover:opacity-80"
            style={{
              backgroundColor: 'rgba(239, 68, 68, 0.1)',
              color: 'var(--yaksa-critical)',
            }}
          >
            🗑️ 삭제
          </button>
        )}
      </div>

      {/* Reject Modal */}
      {showRejectModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div
            className="w-full max-w-md p-6 rounded-lg shadow-xl"
            style={{ backgroundColor: 'var(--yaksa-surface)' }}
          >
            <h3 className="text-lg font-semibold mb-4" style={yaksaStyles.textPrimary}>
              게시글 반려
            </h3>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="반려 사유를 입력하세요..."
              className="w-full p-3 rounded border resize-none"
              style={{
                borderColor: 'var(--yaksa-border)',
                minHeight: '100px',
              }}
            />
            <div className="flex justify-end gap-2 mt-4">
              <button
                onClick={() => setShowRejectModal(false)}
                className="px-4 py-2 rounded text-sm"
                style={yaksaStyles.buttonSecondary}
              >
                취소
              </button>
              <button
                onClick={handleReject}
                disabled={!rejectReason.trim()}
                className="px-4 py-2 rounded text-sm font-medium disabled:opacity-50"
                style={{
                  backgroundColor: 'var(--yaksa-critical)',
                  color: '#ffffff',
                }}
              >
                반려하기
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div
            className="w-full max-w-sm p-6 rounded-lg shadow-xl"
            style={{ backgroundColor: 'var(--yaksa-surface)' }}
          >
            <h3 className="text-lg font-semibold mb-2" style={yaksaStyles.textPrimary}>
              게시글 삭제
            </h3>
            <p className="mb-4" style={yaksaStyles.textSecondary}>
              이 게시글을 정말 삭제하시겠습니까?
              <br />
              <strong className="text-red-600">이 작업은 되돌릴 수 없습니다.</strong>
            </p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="px-4 py-2 rounded text-sm"
                style={yaksaStyles.buttonSecondary}
              >
                취소
              </button>
              <button
                onClick={handleDelete}
                className="px-4 py-2 rounded text-sm font-medium"
                style={{
                  backgroundColor: 'var(--yaksa-critical)',
                  color: '#ffffff',
                }}
              >
                삭제하기
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function getStatusColor(status: string): string {
  switch (status) {
    case 'pending':
      return 'var(--yaksa-warning)';
    case 'approved':
      return 'var(--yaksa-success)';
    case 'rejected':
      return 'var(--yaksa-critical)';
    default:
      return 'var(--yaksa-text-muted)';
  }
}

function getStatusLabel(status: string): string {
  switch (status) {
    case 'draft':
      return '임시저장';
    case 'pending':
      return '승인 대기';
    case 'approved':
      return '승인됨';
    case 'rejected':
      return '반려됨';
    default:
      return status;
  }
}

export default YaksaModerationPanel;
