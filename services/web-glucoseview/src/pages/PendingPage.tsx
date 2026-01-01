import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export default function PendingPage() {
  const { user, logout, isRejected } = useAuth();

  if (isRejected) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-white rounded-2xl border border-slate-200 p-8 text-center">
          <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-6">
            <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>

          <h1 className="text-xl font-semibold text-slate-900 mb-2">
            가입이 거절되었습니다
          </h1>

          <p className="text-slate-500 mb-4">
            회원가입 신청이 거절되었습니다.
          </p>

          {user?.rejectionReason && (
            <div className="p-4 bg-red-50 rounded-lg mb-6">
              <p className="text-sm font-medium text-red-800 mb-1">거절 사유</p>
              <p className="text-sm text-red-700">{user.rejectionReason}</p>
            </div>
          )}

          <p className="text-sm text-slate-400 mb-6">
            문의가 필요하시면 관리자에게 연락해 주세요.
          </p>

          <div className="flex gap-3">
            <button
              onClick={logout}
              className="flex-1 px-4 py-2.5 text-sm font-medium text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors"
            >
              로그아웃
            </button>
            <Link
              to="/"
              className="flex-1 px-4 py-2.5 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors text-center"
            >
              홈으로
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
      <div className="max-w-md w-full bg-white rounded-2xl border border-slate-200 p-8 text-center">
        <div className="w-16 h-16 rounded-full bg-amber-100 flex items-center justify-center mx-auto mb-6">
          <svg className="w-8 h-8 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>

        <h1 className="text-xl font-semibold text-slate-900 mb-2">
          승인 대기 중
        </h1>

        <p className="text-slate-500 mb-6">
          회원가입 신청이 완료되었습니다.<br />
          관리자 승인 후 서비스를 이용하실 수 있습니다.
        </p>

        <div className="p-4 bg-slate-50 rounded-lg mb-6 text-left">
          <p className="text-sm font-medium text-slate-700 mb-2">신청 정보</p>
          <div className="space-y-1 text-sm text-slate-500">
            <p><span className="text-slate-400">이름:</span> {user?.name}</p>
            <p><span className="text-slate-400">이메일:</span> {user?.email}</p>
            {user?.pharmacyName && (
              <p><span className="text-slate-400">약국명:</span> {user.pharmacyName}</p>
            )}
          </div>
        </div>

        <p className="text-xs text-slate-400 mb-6">
          승인이 완료되면 로그인하여 이용하실 수 있습니다.
        </p>

        <div className="flex gap-3">
          <button
            onClick={logout}
            className="flex-1 px-4 py-2.5 text-sm font-medium text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors"
          >
            로그아웃
          </button>
          <Link
            to="/"
            className="flex-1 px-4 py-2.5 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors text-center"
          >
            홈으로
          </Link>
        </div>
      </div>
    </div>
  );
}
