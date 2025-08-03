import { useState, useEffect, FC } from 'react';
import { motion } from 'motion/react';
import { 
  Bot, 
  Zap, 
  ShoppingBag, 
  Coins, 
  MessageSquare, 
  Monitor,
  ArrowRight,
  CheckCircle,
  Clock,
  AlertCircle
} from 'lucide-react';
import { servicesAPI } from '../api/client';

interface ServiceStatus {
  status: 'operational' | 'maintenance' | 'beta';
  version: string;
}

interface ServicesData {
  ai: ServiceStatus;
  rpa: ServiceStatus;
  ecommerce: ServiceStatus;
  crowdfunding: ServiceStatus;
  forum: ServiceStatus;
  signage: ServiceStatus;
}

const services = [
  {
    id: 'ai',
    title: 'AI 서비스',
    icon: Bot,
    description: '인공지능 기반 상품 추천, 재고 분석, 고객 인사이트',
    features: ['상품 추천 AI', '재고 예측', '고객 분석', '챗봇 서비스'],
    color: 'from-blue-500 to-indigo-600'
  },
  {
    id: 'rpa',
    title: 'RPA 자동화',
    icon: Zap,
    description: '반복 업무 자동화로 시간과 비용 절약',
    features: ['주문 자동화', '재고 동기화', '가격 모니터링', '보고서 생성'],
    color: 'from-yellow-500 to-orange-600'
  },
  {
    id: 'ecommerce',
    title: '전자상거래',
    icon: ShoppingBag,
    description: '온라인 쇼핑몰 구축 및 운영 플랫폼',
    features: ['온라인 스토어', '결제 시스템', '주문 관리', '배송 추적'],
    color: 'from-green-500 to-emerald-600'
  },
  {
    id: 'crowdfunding',
    title: '크라우드펀딩',
    icon: Coins,
    description: '혁신적인 프로젝트 펀딩 및 투자 플랫폼',
    features: ['프로젝트 생성', '펀딩 관리', '후원자 소통', '수익 분석'],
    color: 'from-purple-500 to-pink-600'
  },
  {
    id: 'forum',
    title: '커뮤니티 포럼',
    icon: MessageSquare,
    description: '업계 전문가 네트워크 및 지식 공유',
    features: ['전문가 네트워크', '지식 공유', '비즈니스 상담', 'Q&A'],
    color: 'from-teal-500 to-cyan-600'
  },
  {
    id: 'signage',
    title: '디지털 사이니지',
    icon: Monitor,
    description: '스마트 디지털 광고 및 안내 시스템',
    features: ['디스플레이 관리', '콘텐츠 제작', '스케줄 관리', '실시간 업데이트'],
    color: 'from-indigo-500 to-purple-600'
  }
];

const getStatusInfo = (status: string) => {
  switch (status) {
    case 'operational':
      return { 
        icon: CheckCircle, 
        text: '서비스 중', 
        color: 'text-green-600 bg-green-100',
        clickable: true
      };
    case 'beta':
      return { 
        icon: Clock, 
        text: '베타', 
        color: 'text-yellow-600 bg-yellow-100',
        clickable: true
      };
    case 'maintenance':
    default:
      return { 
        icon: AlertCircle, 
        text: '준비 중', 
        color: 'text-gray-600 bg-gray-100',
        clickable: false
      };
  }
};

const Dashboard: FC = () => {
  const [servicesData, setServicesData] = useState<ServicesData | null>(null);
  const [loading, setLoading] = useState(true);
  const userStr = localStorage.getItem('user');
  const user = userStr ? JSON.parse(userStr) : null;

  useEffect(() => {
    const loadServicesStatus = async () => {
      try {
        const response = await servicesAPI.getStatus();
        setServicesData(response.data.services);
      } catch (error: any) {
        console.error('Failed to load services status:', error);
        // 기본값 설정
        setServicesData({
          ai: { status: 'maintenance', version: '1.0.0' },
          rpa: { status: 'maintenance', version: '1.0.0' },
          ecommerce: { status: 'operational', version: '1.0.0' },
          crowdfunding: { status: 'beta', version: '0.9.0' },
          forum: { status: 'operational', version: '1.0.0' },
          signage: { status: 'beta', version: '0.9.0' }
        });
      } finally {
        setLoading(false);
      }
    };

    loadServicesStatus();
  }, []);

  const handleServiceAccess = (serviceId: string) => {
    // 실제 서비스로 이동하는 로직
    const serviceUrls: { [key: string]: string } = {
      ai: '/services/ai',
      rpa: '/services/rpa',
      ecommerce: '/services/ecommerce',
      crowdfunding: '/services/crowdfunding',
      forum: '/services/forum',
      signage: '/services/signage'
    };
    
    const url = serviceUrls[serviceId];
    if (url) {
      alert(`${serviceId.toUpperCase()} 서비스로 이동합니다.\n곧 실제 서비스가 준비될 예정입니다.`);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="bg-white rounded-xl shadow-sm p-6 mb-8"
        >
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            환영합니다, {user?.name}님! 🎉
          </h1>
          <p className="text-gray-600">
            {user?.businessInfo?.businessName}에서 Neture 플랫폼의 다양한 서비스를 이용해보세요.
          </p>
        </motion.div>

        {/* Services Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {services.map((service, index) => {
            const serviceStatus = servicesData?.[service.id as keyof ServicesData];
            const statusInfo = getStatusInfo(serviceStatus?.status || 'maintenance');
            const StatusIcon = statusInfo.icon;

            return (
              <motion.div
                key={service.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                className="bg-white rounded-xl shadow-sm p-6 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className={`p-3 rounded-lg bg-gradient-to-r ${service.color}`}>
                    <service.icon className="w-6 h-6 text-white" />
                  </div>
                  <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${statusInfo.color}`}>
                    <StatusIcon className="w-3 h-3" />
                    {statusInfo.text}
                  </div>
                </div>

                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  {service.title}
                </h3>
                <p className="text-gray-600 text-sm mb-4">
                  {service.description}
                </p>

                <ul className="space-y-1 mb-6">
                  {service.features.map((feature, featureIndex) => (
                    <li key={featureIndex} className="flex items-center gap-2 text-sm text-gray-600">
                      <CheckCircle className="w-3 h-3 text-green-500" />
                      {feature}
                    </li>
                  ))}
                </ul>

                <button
                  onClick={() => handleServiceAccess(service.id)}
                  disabled={!statusInfo.clickable}
                  className={`w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
                    statusInfo.clickable
                      ? 'bg-indigo-600 text-white hover:bg-indigo-700'
                      : 'bg-gray-200 text-gray-500 cursor-not-allowed'
                  }`}
                >
                  {statusInfo.clickable ? '서비스 이용하기' : '준비 중'}
                  {statusInfo.clickable && <ArrowRight className="w-4 h-4" />}
                </button>
              </motion.div>
            );
          })}
        </div>

        {loading && (
          <div className="flex justify-center items-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
