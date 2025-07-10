import React from 'react';
import { useAuth } from '../contexts/AuthContext';

interface AdminBarSpacerProps {
  children: React.ReactNode;
}

const AdminBarSpacer: React.FC<AdminBarSpacerProps> = ({ children }) => {
  const { user } = useAuth();
  
  // 관리자 권한이 있는 사용자에게만 상단 여백 적용
  const hasAdminAccess = user && ['admin', 'administrator', 'manager', 'seller', 'supplier', 'partner'].includes(user.role);
  
  return (
    <div className={hasAdminAccess ? 'pt-8' : ''}>
      {children}
    </div>
  );
};

export default AdminBarSpacer;