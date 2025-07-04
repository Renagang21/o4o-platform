import React, { useState } from 'react';
import { 
  TrendingUp, 
  Package, 
  ShoppingCart, 
  DollarSign, 
  Users, 
  Eye,
  MoreVertical,
  ArrowUpRight,
  Calendar
} from 'lucide-react';
import { StatCard } from '../ui/StatCard';
import { StatusBadge } from '../ui/StatusBadge';
import { DataTable } from '../ui/DataTable';
import { Modal, ModalHeader, ModalBody, ModalFooter, ModalButton } from '../ui/Modal';
import { UserRole } from '../layout/RoleSelector';

interface DashboardPageProps {
  currentRole: UserRole;
  activeMenu: string;
  onMenuChange: (menuId: string) => void;
}

// Mock data for demonstration
const generateMockData = (role: UserRole) => {
  const baseData = {
    supplier: {
      stats: [
        { title: '등록 상품 수', value: 1247, icon: Package, change: 12.5, color: 'blue' as const, subtitle: '지난 달 대비' },
        { title: '총 주문 건수', value: 2892, icon: ShoppingCart, change: -2.3, color: 'green' as const, subtitle: '이번 달 기준' },
        { title: '정산 예정 금액', value: '₩12,450,000', icon: DollarSign, change: 8.7, color: 'yellow' as const, subtitle: '이번 주 정산' },
        { title: '활성 거래처', value: 45, icon: Users, change: 5.2, color: 'purple' as const, subtitle: '협력 업체 수' },
      ],
      tableData: [
        { id: 1, product: '무선 블루투스 이어폰', status: '판매중', orders: 156, revenue: '₩3,120,000', supplier: 'TechCorp' },
        { id: 2, product: '스마트워치 밴드', status: '품절', orders: 89, revenue: '₩1,780,000', supplier: 'WearTech' },
        { id: 3, product: 'USB-C 케이블', status: '대기', orders: 203, revenue: '₩2,030,000', supplier: 'CablePro' },
        { id: 4, product: '무선 충전 패드', status: '판매중', orders: 124, revenue: '₩2,480,000', supplier: 'PowerUp' },
        { id: 5, product: '스마트폰 케이스', status: '완료', orders: 78, revenue: '₩1,560,000', supplier: 'ProtectAll' },
      ]
    },
    seller: {
      stats: [
        { title: '선택한 상품', value: 89, icon: Package, change: 15.2, color: 'green' as const, subtitle: '판매 가능 상품' },
        { title: '파트너 수', value: 23, icon: Users, change: 8.7, color: 'blue' as const, subtitle: '활성 파트너' },
        { title: '이번 달 매출', value: '₩8,750,000', icon: DollarSign, change: 22.1, color: 'yellow' as const, subtitle: '목표 대비 87%' },
        { title: '전환율', value: '3.2%', icon: TrendingUp, change: 0.8, color: 'purple' as const, subtitle: '평균 대비' },
      ],
      tableData: [
        { id: 1, partner: '파트너A', sales: 45, commission: '₩450,000', status: '활성', performance: '92%' },
        { id: 2, partner: '파트너B', sales: 32, commission: '₩320,000', status: '활성', performance: '85%' },
        { id: 3, partner: '파트너C', sales: 18, commission: '₩180,000', status: '대기', performance: '67%' },
        { id: 4, partner: '파트너D', sales: 56, commission: '₩560,000', status: '활성', performance: '98%' },
        { id: 5, partner: '파트너E', sales: 23, commission: '₩230,000', status: '중단', performance: '45%' },
      ]
    },
    partner: {
      stats: [
        { title: '추천 클릭 수', value: 15420, icon: Eye, change: 18.5, color: 'blue' as const, subtitle: '이번 달 누적' },
        { title: '커미션 수익', value: '₩2,340,000', icon: DollarSign, change: 25.8, color: 'green' as const, subtitle: '이번 달 예상' },
        { title: '전환 고객 수', value: 342, icon: Users, change: 12.3, color: 'purple' as const, subtitle: '구매 완료' },
        { title: '성과 지수', value: '8.7', icon: TrendingUp, change: 2.1, color: 'yellow' as const, subtitle: '10점 만점' },
      ],
      tableData: [
        { id: 1, campaign: '스마트워치 프로모션', clicks: 2340, conversions: 45, commission: '₩450,000', status: '진행중' },
        { id: 2, campaign: '이어폰 특가 세일', clicks: 1890, conversions: 32, commission: '₩320,000', status: '진행중' },
        { id: 3, campaign: '케이블 번들 할인', clicks: 1456, conversions: 28, commission: '₩280,000', status: '완료' },
        { id: 4, campaign: '충전기 신제품', clicks: 3240, conversions: 67, commission: '₩670,000', status: '진행중' },
        { id: 5, campaign: '케이스 컬렉션', clicks: 1123, conversions: 19, commission: '₩190,000', status: '대기' },
      ]
    }
  };

  return baseData[role];
};

export const DashboardPage: React.FC<DashboardPageProps> = ({ 
  currentRole, 
  activeMenu, 
  onMenuChange 
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<any>(null);
  
  const data = generateMockData(currentRole);
  const currentTime = new Date().toLocaleString('ko-KR');

  // 역할별 테이블 컬럼 설정
  const getTableColumns = () => {
    if (currentRole === 'supplier') {
      return [
        { key: 'product', label: '상품명', sortable: true, width: '30%' },
        { 
          key: 'status', 
          label: '상태', 
          sortable: true, 
          render: (value: string) => <StatusBadge status={value} />
        },
        { key: 'orders', label: '주문 수', sortable: true, align: 'center' as const },
        { key: 'revenue', label: '매출', sortable: true, align: 'right' as const },
        { key: 'supplier', label: '공급업체', sortable: true },
        {
          key: 'actions',
          label: '작업',
          align: 'center' as const,
          render: (_, row: any) => (
            <button 
              onClick={() => {
                setSelectedItem(row);
                setIsModalOpen(true);
              }}
              className="p-1 hover:bg-gray-100 rounded-md transition-colors"
            >
              <MoreVertical className="w-4 h-4 text-gray-500" />
            </button>
          )
        }
      ];
    } else if (currentRole === 'seller') {
      return [
        { key: 'partner', label: '파트너명', sortable: true, width: '25%' },
        { key: 'sales', label: '판매 건수', sortable: true, align: 'center' as const },
        { key: 'commission', label: '커미션', sortable: true, align: 'right' as const },
        { 
          key: 'status', 
          label: '상태', 
          sortable: true, 
          render: (value: string) => <StatusBadge status={value} />
        },
        { key: 'performance', label: '성과율', sortable: true, align: 'center' as const },
      ];
    } else {
      return [
        { key: 'campaign', label: '캠페인명', sortable: true, width: '30%' },
        { key: 'clicks', label: '클릭 수', sortable: true, align: 'center' as const },
        { key: 'conversions', label: '전환 수', sortable: true, align: 'center' as const },
        { key: 'commission', label: '커미션', sortable: true, align: 'right' as const },
        { 
          key: 'status', 
          label: '상태', 
          sortable: true, 
          render: (value: string) => <StatusBadge status={value} />
        },
      ];
    }
  };

  const getRoleName = () => {
    const roleNames = {
      supplier: '공급자',
      seller: '판매자',
      partner: '파트너'
    };
    return roleNames[currentRole];
  };

  return (
    <div className="space-y-6">
      {/* Welcome Header */}
      <div className="bg-gradient-to-r from-red-50 via-orange-50 to-yellow-50 rounded-2xl p-6 border border-red-100">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              안녕하세요, {getRoleName()}님! 👋
            </h1>
            <p className="text-gray-600 font-medium">
              오늘도 성공적인 비즈니스를 위해 함께 해보세요.
            </p>
            <div className="flex items-center gap-2 mt-3 text-sm text-gray-500">
              <Calendar className="w-4 h-4" />
              <span>마지막 업데이트: {currentTime}</span>
            </div>
          </div>
          <div className="hidden sm:block">
            <div className="w-20 h-20 bg-gradient-to-br from-red-400 to-orange-500 rounded-full flex items-center justify-center shadow-lg">
              <TrendingUp className="w-10 h-10 text-white" />
            </div>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        {data.stats.map((stat, index) => (
          <StatCard
            key={index}
            title={stat.title}
            value={stat.value}
            icon={stat.icon}
            change={stat.change}
            color={stat.color}
            subtitle={stat.subtitle}
          />
        ))}
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">빠른 작업</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: '상품 관리', icon: Package, color: 'bg-blue-50 text-blue-600 hover:bg-blue-100' },
            { label: '주문 처리', icon: ShoppingCart, color: 'bg-green-50 text-green-600 hover:bg-green-100' },
            { label: '정산 확인', icon: DollarSign, color: 'bg-yellow-50 text-yellow-600 hover:bg-yellow-100' },
            { label: '분석 보고서', icon: TrendingUp, color: 'bg-purple-50 text-purple-600 hover:bg-purple-100' },
          ].map((action, index) => (
            <button
              key={index}
              className={`flex flex-col items-center gap-2 p-4 rounded-xl transition-all duration-200 hover:scale-105 ${action.color}`}
            >
              <action.icon className="w-6 h-6" />
              <span className="text-sm font-medium">{action.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Data Table */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">
              {currentRole === 'supplier' ? '상품 현황' : 
               currentRole === 'seller' ? '파트너 현황' : '캠페인 현황'}
            </h2>
            <button className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700 font-medium">
              전체 보기
              <ArrowUpRight className="w-4 h-4" />
            </button>
          </div>
        </div>
        
        <DataTable
          data={data.tableData}
          columns={getTableColumns()}
          pageSize={5}
          className="border-0 shadow-none"
        />
      </div>

      {/* Modal for item details */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="상세 정보"
        size="md"
      >
        <ModalHeader>
          <h3 className="text-lg font-semibold">
            {selectedItem?.product || selectedItem?.partner || selectedItem?.campaign}
          </h3>
        </ModalHeader>
        <ModalBody>
          <div className="space-y-4">
            <p className="text-gray-600">
              선택된 항목의 상세 정보를 여기에 표시합니다.
            </p>
            {selectedItem && (
              <div className="bg-gray-50 rounded-lg p-4">
                <pre className="text-sm text-gray-700">
                  {JSON.stringify(selectedItem, null, 2)}
                </pre>
              </div>
            )}
          </div>
        </ModalBody>
        <ModalFooter>
          <ModalButton variant="secondary" onClick={() => setIsModalOpen(false)}>
            닫기
          </ModalButton>
          <ModalButton variant="primary" onClick={() => setIsModalOpen(false)}>
            확인
          </ModalButton>
        </ModalFooter>
      </Modal>
    </div>
  );
};