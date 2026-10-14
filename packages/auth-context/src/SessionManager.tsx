import type { FC, ReactNode } from 'react';

interface SessionManagerProps {
  children: ReactNode;
  warningBeforeExpiry?: number;
  onSessionExpiring?: (remainingSeconds: number) => void;
}

/** @deprecated Cookie expiry is private; retained as a passive compatibility wrapper. */
export const SessionManager: FC<SessionManagerProps> = ({ children }) => <>{children}</>;
