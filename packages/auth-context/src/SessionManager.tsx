import React, { ReactNode, useEffect, useRef } from 'react';

interface SessionManagerProps {
  children: ReactNode;
  warningBeforeExpiry?: number;
  onSessionExpiring?: (remainingSeconds: number) => void;
}

export const SessionManager: React.FC<SessionManagerProps> = ({
  children,
  warningBeforeExpiry = 5 * 60 * 1000, // 기본값: 5분
  onSessionExpiring
}) => {
  const warningShownRef = useRef(false);

  useEffect(() => {
    // 세션 만료 타이머 설정
    const checkSession = () => {
      // 실제 구현에서는 토큰 만료 시간을 체크
      // 현재는 기본 로직만 구현
      if (onSessionExpiring && !warningShownRef.current) {
        // warningShownRef.current = true;
        // onSessionExpiring();
      }
    };

    // 주기적으로 세션 상태 체크 (1분마다)
    const interval = setInterval(checkSession, 60 * 1000);

    return () => {
      clearInterval(interval);
    };
  }, [warningBeforeExpiry, onSessionExpiring]);

  return <>{children}</>;
};