import { useState } from 'react';
import { Loader2, CheckCircle, AlertCircle } from 'lucide-react';

interface PasswordChangeModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (currentPassword: string, newPassword: string, newPasswordConfirm: string) => Promise<void>;
  submitting?: boolean;
}

interface FeedbackState {
  type: 'success' | 'error';
  message: string;
}

export function PasswordChangeModal({ open, onClose, onSubmit, submitting = false }: PasswordChangeModalProps) {
  const [data, setData] = useState({ currentPassword: '', newPassword: '', newPasswordConfirm: '' });
  const [feedback, setFeedback] = useState<FeedbackState | null>(null);

  if (!open) return null;

  const handleSubmit = async () => {
    if (data.newPassword !== data.newPasswordConfirm) {
      setFeedback({ type: 'error', message: '새 비밀번호가 일치하지 않습니다.' });
      return;
    }
    if (data.newPassword.length < 8) {
      setFeedback({ type: 'error', message: '새 비밀번호는 8자 이상이어야 합니다.' });
      return;
    }

    setFeedback(null);
    try {
      await onSubmit(data.currentPassword, data.newPassword, data.newPasswordConfirm);
      setFeedback({ type: 'success', message: '비밀번호가 변경되었습니다.' });
      setTimeout(() => {
        handleClose();
      }, 1500);
    } catch (err: any) {
      const message = err.response?.data?.message || err.response?.data?.error || '비밀번호 변경에 실패했습니다.';
      setFeedback({ type: 'error', message });
    }
  };

  const handleClose = () => {
    setData({ currentPassword: '', newPassword: '', newPasswordConfirm: '' });
    setFeedback(null);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="absolute inset-0 bg-black/40"
        onClick={() => !submitting && handleClose()}
      />
      <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-md mx-4 p-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">비밀번호 변경</h3>

        {feedback && (
          <div
            className={`mb-4 flex items-center gap-2 p-3 rounded-lg text-sm ${
              feedback.type === 'success'
                ? 'bg-green-50 text-green-700'
                : 'bg-red-50 text-red-700'
            }`}
          >
            {feedback.type === 'success' ? (
              <CheckCircle className="w-4 h-4 flex-shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
            )}
            {feedback.message}
          </div>
        )}

        <div className="space-y-4">
          <div>
            <label className="block text-sm text-gray-600 mb-1">현재 비밀번호</label>
            <input
              type="password"
              value={data.currentPassword}
              onChange={(e) => setData(prev => ({ ...prev, currentPassword: e.target.value }))}
              className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              placeholder="현재 비밀번호 입력"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-600 mb-1">새 비밀번호</label>
            <input
              type="password"
              value={data.newPassword}
              onChange={(e) => setData(prev => ({ ...prev, newPassword: e.target.value }))}
              className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              placeholder="8자 이상 입력"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-600 mb-1">새 비밀번호 확인</label>
            <input
              type="password"
              value={data.newPasswordConfirm}
              onChange={(e) => setData(prev => ({ ...prev, newPasswordConfirm: e.target.value }))}
              className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              placeholder="새 비밀번호 재입력"
            />
          </div>
        </div>

        <div className="flex gap-3 mt-6">
          <button
            onClick={handleClose}
            disabled={submitting}
            className="flex-1 px-4 py-2.5 text-sm font-medium text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            취소
          </button>
          <button
            onClick={handleSubmit}
            disabled={submitting || !data.currentPassword || !data.newPassword || !data.newPasswordConfirm}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50"
          >
            {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
            변경하기
          </button>
        </div>
      </div>
    </div>
  );
}
