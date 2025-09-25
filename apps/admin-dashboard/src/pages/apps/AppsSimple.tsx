import { FC } from 'react';
import { 
  Package, 
  Settings, 
  Info,
  Shield,
  ShoppingCart,
  Users,
  FileText,
  TrendingUp,
  Monitor,
  DollarSign,
  Box
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Link } from 'react-router-dom';

// 앱 타입 정의
interface App {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  version: string;
  author: string;
  category: string;
  isCore: boolean;
  dependencies?: string[];
  features?: string[];
  settings?: string;
}

// 사용 가능한 앱 목록 (정적 데이터)
const availableApps: App[] = [
  {
    id: 'ecommerce',
    name: '전자상거래',
    description: '온라인 쇼핑몰 기능 - 상품 관리, 주문 처리, 결제 시스템',
    icon: <ShoppingCart className="w-6 h-6" />,
    version: '2.0.0',
    author: 'O4O Platform',
    category: 'Sales',
    isCore: true,
    features: ['상품 관리', '재고 관리', '주문 처리', 'Toss Payments 결제'],
    settings: '/ecommerce/settings'
  },
  {
    id: 'affiliate',
    name: '제휴 마케팅',
    description: '파트너 추천 프로그램 및 수수료 관리 시스템',
    icon: <TrendingUp className="w-6 h-6" />,
    version: '1.5.0',
    author: 'O4O Platform',
    category: 'Marketing',
    isCore: false,
    features: ['추천 링크 생성', '수수료 추적', '파트너 대시보드', '실적 분석'],
    settings: '/affiliate/settings'
  },
  {
    id: 'crowdfunding',
    name: '크라우드펀딩',
    description: '프로젝트 펀딩 및 후원 관리 플랫폼',
    icon: <DollarSign className="w-6 h-6" />,
    version: '1.2.0',
    author: 'O4O Platform',
    category: 'Finance',
    isCore: false,
    features: ['프로젝트 관리', '후원자 관리', '리워드 시스템', '펀딩 통계'],
    dependencies: ['ecommerce'],
    settings: '/crowdfunding'
  },
  {
    id: 'forum',
    name: '포럼/커뮤니티',
    description: '사용자 커뮤니티 및 토론 게시판',
    icon: <Users className="w-6 h-6" />,
    version: '1.8.0',
    author: 'O4O Platform',
    category: 'Community',
    isCore: false,
    features: ['게시판 관리', '사용자 등급', '포인트 시스템', '실시간 알림'],
    settings: '/forum'
  },
  {
    id: 'signage',
    name: '디지털 사이니지',
    description: '디지털 디스플레이 콘텐츠 관리 시스템',
    icon: <Monitor className="w-6 h-6" />,
    version: '1.0.0',
    author: 'O4O Platform',
    category: 'Media',
    isCore: false,
    features: ['콘텐츠 스케줄링', '다중 디스플레이', '실시간 업데이트', '템플릿 관리'],
    settings: '/signage'
  },
  {
    id: 'cpt-acf',
    name: 'CPT & ACF',
    description: '사용자 정의 게시물 타입 및 필드 관리',
    icon: <FileText className="w-6 h-6" />,
    version: '1.3.0',
    author: 'O4O Platform',
    category: 'Content',
    isCore: true,
    features: ['커스텀 포스트 타입', '커스텀 필드', '메타 박스', '분류 체계'],
    settings: '/cpt-engine'
  },
  {
    id: 'vendor',
    name: '벤더 관리',
    description: '다중 판매자 마켓플레이스 시스템',
    icon: <Box className="w-6 h-6" />,
    version: '1.1.0',
    author: 'O4O Platform',
    category: 'Sales',
    isCore: false,
    features: ['판매자 대시보드', '수수료 정산', '상품 승인', '판매 통계'],
    dependencies: ['ecommerce'],
    settings: '/vendors'
  }
];

const AppsSimple: FC = () => {
  // 카테고리별 그룹화
  const groupedApps = availableApps.reduce((acc, app) => {
    if (!acc[app.category]) {
      acc[app.category] = [];
    }
    acc[app.category].push(app);
    return acc;
  }, {} as Record<string, App[]>);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">앱 관리</h1>
        <p className="text-gray-600 mt-2">
          O4O 플랫폼에서 사용 가능한 앱 목록
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">전체 앱</p>
                <p className="text-2xl font-bold">{availableApps.length}</p>
              </div>
              <Package className="w-8 h-8 text-gray-400" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">코어 앱</p>
                <p className="text-2xl font-bold text-blue-600">
                  {availableApps.filter(a => a.isCore).length}
                </p>
              </div>
              <Shield className="w-8 h-8 text-blue-400" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">추가 앱</p>
                <p className="text-2xl font-bold text-green-600">
                  {availableApps.filter(a => !a.isCore).length}
                </p>
              </div>
              <Package className="w-8 h-8 text-green-400" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Apps Grid by Category */}
      {Object.entries(groupedApps).map(([category, categoryApps]) => (
        <div key={category} className="space-y-4">
          <h2 className="text-xl font-semibold text-gray-700">{category}</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {categoryApps.map((app) => (
              <Card key={app.id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-blue-100 text-blue-600">
                        {app.icon}
                      </div>
                      <div>
                        <CardTitle className="text-lg flex items-center gap-2">
                          {app.name}
                          {app.isCore && (
                            <Badge variant="secondary" className="text-xs">
                              Core
                            </Badge>
                          )}
                        </CardTitle>
                        <p className="text-sm text-gray-500">v{app.version}</p>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                
                <CardContent className="space-y-4">
                  <CardDescription>{app.description}</CardDescription>
                  
                  {app.features && (
                    <div className="space-y-1">
                      <p className="text-sm font-medium text-gray-700">주요 기능:</p>
                      <div className="flex flex-wrap gap-1">
                        {app.features.slice(0, 3).map((feature, idx) => (
                          <Badge key={idx} variant="outline" className="text-xs">
                            {feature}
                          </Badge>
                        ))}
                        {app.features.length > 3 && (
                          <Badge variant="outline" className="text-xs">
                            +{app.features.length - 3}
                          </Badge>
                        )}
                      </div>
                    </div>
                  )}
                  
                  {app.dependencies && (
                    <div className="text-xs text-amber-600 flex items-center gap-1">
                      <Info className="w-3 h-3" />
                      의존성: {app.dependencies.join(', ')}
                    </div>
                  )}
                  
                  <div className="flex justify-between items-center pt-2 border-t">
                    <span className="text-xs text-gray-500">by {app.author}</span>
                    
                    {app.settings && (
                      <Button
                        size="sm"
                        variant="ghost"
                        asChild
                      >
                        <Link to={app.settings}>
                          <Settings className="w-4 h-4 mr-1" />
                          설정
                        </Link>
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};

export default AppsSimple;