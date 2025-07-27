import { useState, FC } from 'react';
import { UserCheck, UserX, UserMinus, Trash2, Mail, Download } from 'lucide-react'
import { UserBulkAction } from '@/types/user'

interface BulkActionsProps {
  selectedCount: number
  onBulkAction: (action: UserBulkAction) => void
  onClearSelection: () => void
  availableActions?: ('approve' | 'reject' | 'suspend' | 'reactivate' | 'delete' | 'email')[]
}

const BulkActions: React.FC<BulkActionsProps> = ({
  selectedCount,
  onBulkAction,
  onClearSelection,
  availableActions = ['approve', 'reject', 'suspend', 'reactivate', 'delete']
}) => {
  const [showReasonModal, setShowReasonModal] = useState<string | null>(null)
  const [reason, setReason] = useState('')

  if (selectedCount === 0) return null

  const handleAction = (action: string) => {
    if (action === 'reject' || action === 'suspend') {
      setShowReasonModal(action)
    } else {
      // TODO: Get selected user IDs from parent component
      onBulkAction({
        action: action as UserBulkAction['action'],
        userIds: [], // This should be passed from parent
        reason: undefined
      })
    }
  }

  const handleReasonSubmit = () => {
    if (showReasonModal && reason.trim()) {
      onBulkAction({
        action: showReasonModal as UserBulkAction['action'],
        userIds: [], // This should be passed from parent
        reason: reason.trim()
      })
      setShowReasonModal(null)
      setReason('')
    }
  }

  return (
    <>
      <div className="wp-card border-l-4 border-l-blue-500">
        <div className="wp-card-body">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <span className="text-sm font-medium text-gray-700">
                {selectedCount}명 선택됨
              </span>
              
              <div className="flex items-center gap-2">
                {availableActions.includes('approve') && (
                  <button
                    onClick={() => handleAction('approve')}
                    className="wp-button-secondary text-green-600 hover:text-green-700"
                    title="선택된 사용자 승인"
                  >
                    <UserCheck className="w-4 h-4 mr-1" />
                    승인
                  </button>
                )}

                {availableActions.includes('reject') && (
                  <button
                    onClick={() => handleAction('reject')}
                    className="wp-button-secondary text-red-600 hover:text-red-700"
                    title="선택된 사용자 거부"
                  >
                    <UserX className="w-4 h-4 mr-1" />
                    거부
                  </button>
                )}

                {availableActions.includes('suspend') && (
                  <button
                    onClick={() => handleAction('suspend')}
                    className="wp-button-secondary text-orange-600 hover:text-orange-700"
                    title="선택된 사용자 정지"
                  >
                    <UserMinus className="w-4 h-4 mr-1" />
                    정지
                  </button>
                )}

                {availableActions.includes('reactivate') && (
                  <button
                    onClick={() => handleAction('reactivate')}
                    className="wp-button-secondary text-blue-600 hover:text-blue-700"
                    title="선택된 사용자 재활성화"
                  >
                    <UserCheck className="w-4 h-4 mr-1" />
                    재활성화
                  </button>
                )}

                {availableActions.includes('email') && (
                  <button
                    onClick={() => handleAction('email')}
                    className="wp-button-secondary text-blue-600 hover:text-blue-700"
                    title="선택된 사용자에게 이메일 발송"
                  >
                    <Mail className="w-4 h-4 mr-1" />
                    이메일
                  </button>
                )}

                <div className="border-l border-gray-300 h-6 mx-2" />

                <button
                  onClick={() => handleAction('export')}
                  className="wp-button-secondary"
                  title="선택된 사용자 내보내기"
                >
                  <Download className="w-4 h-4 mr-1" />
                  내보내기
                </button>

                {availableActions.includes('delete') && (
                  <button
                    onClick={() => handleAction('delete')}
                    className="wp-button-danger"
                    title="선택된 사용자 삭제"
                  >
                    <Trash2 className="w-4 h-4 mr-1" />
                    삭제
                  </button>
                )}
              </div>
            </div>

            <button
              onClick={onClearSelection}
              className="text-sm text-gray-500 hover:text-gray-700"
            >
              선택 해제
            </button>
          </div>
        </div>
      </div>

      {/* 사유 입력 모달 */}
      {showReasonModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4">
              {showReasonModal === 'reject' ? '거부 사유' : '정지 사유'}
            </h3>
            
            <textarea
              value={reason}
              onChange={(e: any) => setReason(e.target.value)}
              placeholder="사유를 입력해주세요..."
              className="wp-textarea w-full h-24 mb-4"
              required
            />
            
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => {
                  setShowReasonModal(null)
                  setReason('')
                }}
                className="wp-button-secondary"
              >
                취소
              </button>
              <button
                onClick={handleReasonSubmit}
                disabled={!reason.trim()}
                className="wp-button-primary"
              >
                확인
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

export default BulkActions