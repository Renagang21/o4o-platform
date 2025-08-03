import { FC, FormEvent, MouseEvent, useEffect, useRef, useState } from 'react';
import useToast from '../hooks/useToast';

interface PasswordChangeModalProps {
  open: boolean;
  onClose: () => void;
}

const PasswordChangeModal: FC<PasswordChangeModalProps> = ({ open, onClose }) => {
  const { showToast } = useToast();
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [open, onClose]);

  useEffect(() => {
    if (!open) {
      setCurrent(''); setNext(''); setConfirm(''); setError('');
    }
  }, [open]);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!current || !next || !confirm) {
      setError('모든 항목을 입력하세요.');
      return;
    }
    if (next.length < 8) {
      setError('비밀번호는 최소 8자 이상이어야 합니다.');
      return;
    }
    if (next !== confirm) {
      setError('새 비밀번호가 일치하지 않습니다.');
      return;
    }
    setError('');
    // TODO: 실제 API 연동
    showToast({ type: 'success', message: '비밀번호가 변경되었습니다.' });
    onClose();
  };

  const handleOverlayClick = (e: MouseEvent) => {
    if (e.target === modalRef.current) onClose();
  };

  if (!open) return null;

  return (
    <div
      ref={modalRef}
      onClick={handleOverlayClick}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      aria-modal="true"
      role="dialog"
    >
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg w-full max-w-sm p-6 relative">
        <h2 className="text-lg font-bold mb-4 text-gray-900 dark:text-white">비밀번호 변경</h2>
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <input
            type="password"
            placeholder="현재 비밀번호"
            className="px-3 py-2 rounded border focus:outline-none focus:ring focus:border-blue-400 dark:bg-gray-700 dark:text-white"
            value={current}
            onChange={(e: any) => { setCurrent(e.target.value); setError(''); }}
            autoFocus
          />
          <input
            type="password"
            placeholder="새 비밀번호 (8자 이상)"
            className="px-3 py-2 rounded border focus:outline-none focus:ring focus:border-blue-400 dark:bg-gray-700 dark:text-white"
            value={next}
            onChange={(e: any) => { setNext(e.target.value); setError(''); }}
          />
          <input
            type="password"
            placeholder="새 비밀번호 확인"
            className="px-3 py-2 rounded border focus:outline-none focus:ring focus:border-blue-400 dark:bg-gray-700 dark:text-white"
            value={confirm}
            onChange={(e: any) => { setConfirm(e.target.value); setError(''); }}
          />
          {error && <div className="text-red-500 text-sm mt-1">{error}</div>}
          <div className="flex gap-2 mt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2 rounded bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-100 hover:bg-gray-300 dark:hover:bg-gray-600"
            >
              취소
            </button>
            <button
              type="submit"
              className="flex-1 py-2 rounded bg-blue-600 text-white hover:bg-blue-700"
            >
              변경
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default PasswordChangeModal; 