/**
 * LoginLink — 현재 위치를 들고 로그인 화면으로 간다(로그인 후 같은 화면으로 복귀).
 * WO-O4O-CROSS-SERVICE-LOGIN-ENTRY-AND-RETURN-FLOW-FIX-V1
 */
import type { ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';

export default function LoginLink({ className, children }: { className?: string; children: ReactNode }) {
  const location = useLocation();
  return (
    <Link to="/login" state={{ from: `${location.pathname}${location.search}` }} className={className}>
      {children}
    </Link>
  );
}
