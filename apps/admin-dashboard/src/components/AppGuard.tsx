import { FC, ReactNode } from 'react';

interface AppGuardProps {
  appName: string;
  children: ReactNode;
  fallbackPath?: string;
}

/**
 * 앱 가드 컴포넌트 - 이제 모든 앱이 항상 활성화되어 있으므로 단순히 children을 렌더링
 * 향후 필요시 권한 체크 등의 기능 추가 가능
 */
const AppGuard: FC<AppGuardProps> = ({ 
  appName, 
  children, 
  fallbackPath = '/dashboard' 
}) => {
  // 모든 앱이 항상 활성화되어 있으므로 바로 children 렌더링
  return <>{children}</>;
};

export default AppGuard;