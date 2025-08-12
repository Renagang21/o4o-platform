import { FC, ReactNode } from 'react';
interface SessionManagerProps {
    children: ReactNode;
    warningBeforeExpiry?: number;
    onSessionExpiring?: (remainingSeconds: number) => void;
}
export declare const SessionManager: FC<SessionManagerProps>;
export {};
//# sourceMappingURL=SessionManager.d.ts.map