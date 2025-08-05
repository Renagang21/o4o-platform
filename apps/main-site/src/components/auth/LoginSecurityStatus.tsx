import { FC } from 'react';
import { AlertCircle, Lock, Shield } from 'lucide-react';

interface LoginSecurityStatusProps {
  remainingAttempts?: number;
  lockedUntil?: Date | null;
  error?: string;
}

export const LoginSecurityStatus: FC<LoginSecurityStatusProps> = ({
  remainingAttempts,
  lockedUntil,
  error
}) => {
  if (lockedUntil && new Date() < new Date(lockedUntil)) {
    const remainingMinutes = Math.ceil(
      (new Date(lockedUntil).getTime() - Date.now()) / 60000
    );

    return (
      <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-md">
        <div className="flex items-start">
          <Lock className="h-5 w-5 text-red-500 mt-0.5 mr-3 flex-shrink-0" />
          <div className="flex-1">
            <h4 className="text-sm font-medium text-red-800">계정이 일시적으로 잠겼습니다</h4>
            <p className="mt-1 text-sm text-red-700">
              {remainingMinutes}분 후에 다시 시도해주세요.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (error && error.includes('too many')) {
    return (
      <div className="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded-md">
        <div className="flex items-start">
          <AlertCircle className="h-5 w-5 text-yellow-500 mt-0.5 mr-3 flex-shrink-0" />
          <div className="flex-1">
            <h4 className="text-sm font-medium text-yellow-800">로그인 시도 제한</h4>
            <p className="mt-1 text-sm text-yellow-700">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  if (remainingAttempts !== undefined && remainingAttempts <= 3 && remainingAttempts > 0) {
    return (
      <div className="mb-4 p-4 bg-amber-50 border border-amber-200 rounded-md">
        <div className="flex items-start">
          <Shield className="h-5 w-5 text-amber-500 mt-0.5 mr-3 flex-shrink-0" />
          <div className="flex-1">
            <h4 className="text-sm font-medium text-amber-800">보안 알림</h4>
            <p className="mt-1 text-sm text-amber-700">
              남은 로그인 시도 횟수: {remainingAttempts}회
            </p>
            <p className="mt-1 text-xs text-amber-600">
              {remainingAttempts}회 더 실패하면 계정이 일시적으로 잠깁니다.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return null;
};