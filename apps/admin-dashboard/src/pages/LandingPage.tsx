import { useNavigate } from 'react-router-dom';
import { useAuth } from '@o4o/auth-context';
import { 
  DashboardOutlined,
  UsergroupAddOutlined,
  FileTextOutlined,
  ShoppingOutlined,
  BarChartOutlined,
  SettingOutlined
} from '@ant-design/icons';

const LandingPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const mainFeatures = [
    {
      icon: <DashboardOutlined className="text-4xl" />,
      title: '대시보드',
      description: '사이트 전체 현황을 한눈에 확인하세요',
      path: '/dashboard',
      color: 'bg-blue-500'
    },
    {
      icon: <UsergroupAddOutlined className="text-4xl" />,
      title: '사용자 관리',
      description: '회원 정보와 권한을 관리합니다',
      path: '/users',
      color: 'bg-green-500'
    },
    {
      icon: <FileTextOutlined className="text-4xl" />,
      title: '콘텐츠 관리',
      description: '게시물과 페이지를 작성하고 관리합니다',
      path: '/posts',
      color: 'bg-purple-500'
    },
    {
      icon: <ShoppingOutlined className="text-4xl" />,
      title: '전자상거래',
      description: '상품과 주문을 관리합니다',
      path: '/ecommerce/products',
      color: 'bg-orange-500'
    },
    {
      icon: <BarChartOutlined className="text-4xl" />,
      title: '분석',
      description: '매출과 트래픽을 분석합니다',
      path: '/analytics',
      color: 'bg-pink-500'
    },
    {
      icon: <SettingOutlined className="text-4xl" />,
      title: '설정',
      description: '시스템 설정을 관리합니다',
      path: '/settings',
      color: 'bg-gray-500'
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            관리자 대시보드
          </h1>
          <p className="text-xl text-gray-600">
            {user?.name || user?.email}님, 환영합니다
          </p>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-12">
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-sm font-medium text-gray-500">오늘 방문자</h3>
            <p className="text-2xl font-bold text-gray-900 mt-2">1,234</p>
            <span className="text-sm text-green-600">+12.5%</span>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-sm font-medium text-gray-500">신규 주문</h3>
            <p className="text-2xl font-bold text-gray-900 mt-2">48</p>
            <span className="text-sm text-green-600">+8.2%</span>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-sm font-medium text-gray-500">매출</h3>
            <p className="text-2xl font-bold text-gray-900 mt-2">₩3.2M</p>
            <span className="text-sm text-red-600">-2.1%</span>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-sm font-medium text-gray-500">활성 사용자</h3>
            <p className="text-2xl font-bold text-gray-900 mt-2">892</p>
            <span className="text-sm text-green-600">+5.4%</span>
          </div>
        </div>

        {/* Main Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {mainFeatures.map((feature) => (
            <div
              key={feature.path}
              onClick={() => navigate(feature.path)}
              className="bg-white rounded-lg shadow-lg hover:shadow-xl transition-shadow cursor-pointer overflow-hidden"
            >
              <div className={`${feature.color} text-white p-6`}>
                {feature.icon}
              </div>
              <div className="p-6">
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  {feature.title}
                </h3>
                <p className="text-gray-600">
                  {feature.description}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* Recent Activities */}
        <div className="mt-12 bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">최근 활동</h2>
          </div>
          <div className="p-6">
            <ul className="space-y-4">
              <li className="flex items-center text-sm">
                <span className="w-2 h-2 bg-green-500 rounded-full mr-3"></span>
                <span className="text-gray-600">새 주문이 접수되었습니다 - #1234</span>
                <span className="ml-auto text-gray-400">방금 전</span>
              </li>
              <li className="flex items-center text-sm">
                <span className="w-2 h-2 bg-blue-500 rounded-full mr-3"></span>
                <span className="text-gray-600">새 사용자가 가입했습니다</span>
                <span className="ml-auto text-gray-400">5분 전</span>
              </li>
              <li className="flex items-center text-sm">
                <span className="w-2 h-2 bg-purple-500 rounded-full mr-3"></span>
                <span className="text-gray-600">새 게시물이 발행되었습니다</span>
                <span className="ml-auto text-gray-400">12분 전</span>
              </li>
              <li className="flex items-center text-sm">
                <span className="w-2 h-2 bg-orange-500 rounded-full mr-3"></span>
                <span className="text-gray-600">재고 부족 알림 - 상품 #456</span>
                <span className="ml-auto text-gray-400">30분 전</span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LandingPage;