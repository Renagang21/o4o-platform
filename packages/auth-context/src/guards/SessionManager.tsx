import React, { useState, useEffect } from 'react';
import { useAuth } from '../AuthProvider';

interface SessionManagerProps {
  children: React.ReactNode;
  warningBeforeExpiry?: number; // 밀리초
  onSessionExpiring?: (remainingSeconds: number) => void;
  onSessionExpired?: () => void;
}

interface SessionExpiringModalProps {
  remainingSeconds: number;
  onExtend: () => void;
  onLogout: () => void;
  onClose: () => void;
}

const SessionExpiringModal: React.FC<SessionExpiringModalProps> = ({
  remainingSeconds,
  onExtend,
  onLogout,
  onClose
}) => {
  const [timeLeft, setTimeLeft] = useState(remainingSeconds);

  useEffect(() => {
    setTimeLeft(remainingSeconds);
  }, [remainingSeconds]);

  useEffect(() => {
    const interval = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(interval);
          onLogout();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [onLogout]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4 shadow-xl">
        <div className="text-center">
          <div className="text-yellow-500 text-4xl mb-4">⏰</div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            세션이 곧 만료됩니다
          </h2>
          <p className="text-gray-600 mb-4">
            보안을 위해 세션이 자동으로 만료됩니다.
          </p>
          
          <div className="text-2xl font-mono text-red-600 mb-6">
            {formatTime(timeLeft)}
          </div>
          
          <div className="flex gap-3">
            <button
              onClick={onExtend}
              className="flex-1 bg-blue-600 text-white py-2 px-4 rounded hover:bg-blue-700 font-medium"
            >
              세션 연장
            </button>
            <button
              onClick={onLogout}
              className="flex-1 bg-gray-600 text-white py-2 px-4 rounded hover:bg-gray-700 font-medium"
            >
              로그아웃
            </button>
          </div>
          
          <button
            onClick={onClose}
            className="mt-3 text-sm text-gray-500 hover:text-gray-700"
          >
            닫기 (자동 만료됨)
          </button>
        </div>
      </div>
    </div>
  );
};

interface SessionExpiredModalProps {
  onRelogin: () => void;
  reason?: string;
}

const SessionExpiredModal: React.FC<SessionExpiredModalProps> = ({
  onRelogin,
  reason = '세션이 만료되었습니다'
}) => (
  <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
    <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4 shadow-xl">
      <div className="text-center">
        <div className="text-red-500 text-4xl mb-4">🔒</div>
        <h2 className="text-xl font-semibold text-gray-900 mb-2">
          세션 만료
        </h2>
        <p className="text-gray-600 mb-6">
          {reason} 보안을 위해 자동으로 로그아웃되었습니다.
        </p>
        
        <button
          onClick={onRelogin}
          className="w-full bg-blue-600 text-white py-3 px-4 rounded hover:bg-blue-700 font-medium"
        >
          다시 로그인
        </button>
      </div>
    </div>
  </div>
);

/**
 * 세션 관리 컴포넌트
 * 세션 만료 경고 및 자동 로그아웃 처리
 */
export const SessionManager: React.FC<SessionManagerProps> = ({
  children,
  warningBeforeExpiry: _warningBeforeExpiry = 5 * 60 * 1000, // 5분
  onSessionExpiring,
  onSessionExpired
}) => {
  const { isAuthenticated, logout, refreshToken, getSessionStatus } = useAuth();
  const [showExpiringModal, setShowExpiringModal] = useState(false);
  const [showExpiredModal, setShowExpiredModal] = useState(false);
  const [remainingSeconds, setRemainingSeconds] = useState(0);

  useEffect(() => {
    if (!isAuthenticated) {
      setShowExpiringModal(false);
      setShowExpiredModal(false);
      return;
    }

    const checkSession = () => {
      const status = getSessionStatus();
      
      switch (status.status) {
        case 'expiring_soon':
          if (status.remainingSeconds && !showExpiringModal) {
            setRemainingSeconds(status.remainingSeconds);
            setShowExpiringModal(true);
            onSessionExpiring?.(status.remainingSeconds);
          }
          break;
          
        case 'expired':
          setShowExpiringModal(false);
          setShowExpiredModal(true);
          onSessionExpired?.();
          break;
          
        case 'active':
          setShowExpiringModal(false);
          break;
      }
    };

    // 30초마다 세션 상태 확인
    const interval = setInterval(checkSession, 30000);
    
    // 즉시 한 번 확인
    checkSession();

    return () => clearInterval(interval);
  }, [isAuthenticated, getSessionStatus, showExpiringModal, onSessionExpiring, onSessionExpired]);

  const handleExtendSession = async () => {
    try {
      await refreshToken();
      setShowExpiringModal(false);
    } catch (error) {
      console.error('Failed to extend session:', error);
      handleSessionExpired();
    }
  };

  const handleSessionExpired = async () => {
    setShowExpiringModal(false);
    setShowExpiredModal(true);
    await logout({ reason: 'session_expired' });
  };

  const handleRelogin = () => {
    const currentPath = window.location.pathname;
    window.location.href = `/login?redirect=${encodeURIComponent(currentPath)}`;
  };

  const handleCloseExpiringModal = () => {
    setShowExpiringModal(false);
  };

  return (
    <>
      {children}
      
      {showExpiringModal && (
        <SessionExpiringModal
          remainingSeconds={remainingSeconds}
          onExtend={handleExtendSession}
          onLogout={handleSessionExpired}
          onClose={handleCloseExpiringModal}
        />
      )}
      
      {showExpiredModal && (
        <SessionExpiredModal
          onRelogin={handleRelogin}
          reason="세션이 만료되었습니다"
        />
      )}
    </>
  );
};

export default SessionManager;