import { FC, ReactNode } from 'react';
import { useAppStatus } from '@/hooks/useDynamicMenu';
import { AlertCircle, Settings } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

interface AppGuardProps {
  appName: string;
  children: ReactNode;
  fallbackPath?: string;
}

/**
 * 앱 활성화 상태를 확인하여 접근을 제어하는 가드 컴포넌트
 * 비활성화된 앱에 접근하려고 하면 차단하고 안내 메시지 표시
 */
const AppGuard: FC<AppGuardProps> = ({ 
  appName, 
  children, 
  fallbackPath = '/dashboard' 
}) => {
  const { isActive } = useAppStatus(appName);

  // 앱이 활성화되어 있으면 정상적으로 렌더링
  if (isActive) {
    return <>{children}</>;
  }

  // 비활성화된 앱 접근 시 안내 페이지 표시
  return (
    <div className="min-h-screen bg-modern-bg-primary flex items-center justify-center p-4">
      <Card className="max-w-md w-full">
        <CardHeader className="text-center">
          <div className="mx-auto w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mb-4">
            <AlertCircle className="w-8 h-8 text-orange-600" />
          </div>
          <CardTitle className="text-xl text-modern-text-primary">
            앱이 비활성화되어 있습니다
          </CardTitle>
        </CardHeader>

        <CardContent className="text-center space-y-4">
          <div className="space-y-2">
            <p className="text-modern-text-secondary">
              <strong>{getAppDisplayName(appName)}</strong> 앱이 현재 비활성화되어 있어 접근할 수 없습니다.
            </p>
            <p className="text-sm text-modern-text-tertiary">
              이 기능을 사용하려면 관리자에게 앱 활성화를 요청하세요.
            </p>
          </div>

          <div className="flex gap-2 justify-center">
            <Button 
              variant={"outline" as const} 
              onClick={() => window.history.back()}
            >
              이전 페이지
            </Button>
            <Button onClick={() => window.location.href = fallbackPath}>
              대시보드로 이동
            </Button>
          </div>

          {/* 관리자용 앱 설정 링크 */}
          <div className="pt-4 border-t">
            <Button
              variant={"ghost" as const}
              size={"sm" as const}
              className="text-modern-text-tertiary hover:text-modern-text-secondary"
              onClick={() => window.location.href = '/apps'}
            >
              <span className="flex items-center gap-1">
                <Settings className="w-4 h-4" />
                앱 관리 설정
              </span>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

/**
 * 앱 이름을 표시용 이름으로 변환
 */
const getAppDisplayName = (appName: string): string => {
  const displayNames: Record<string, string> = {
    'ecommerce': 'E-commerce',
    'forum': 'Forum',
    'signage': 'Digital Signage',
    'crowdfunding': 'Crowdfunding',
    'affiliate': 'Affiliate Marketing',
    'vendors': 'Vendor Management'
  };
  
  return displayNames[appName] || appName;
};

export default AppGuard;