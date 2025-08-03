import { useState, useEffect, FC } from 'react';

type CustomerType = 'b2c' | 'b2b';
type B2CTier = 'member' | 'premium' | 'vip';
type B2BTier = 'corporate' | 'premium_corporate' | 'enterprise_vip';

interface CustomerBase {
  id: string;
  name: string;
  email: string;
  joinDate: string;
  lastActivity: string;
  status: 'active' | 'inactive' | 'suspended';
}

interface B2CCustomer extends CustomerBase {
  type: 'b2c';
  tier: B2CTier;
  annualPurchase: number;
  totalPurchase: number;
  orderCount: number;
  loyaltyPoints: number;
  referralCount: number;
  partnerReferred?: boolean;
  partnerName?: string;
}

interface B2BCustomer extends CustomerBase {
  type: 'b2b';
  tier: B2BTier;
  companyName: string;
  businessLicense: string;
  annualContract: number;
  totalContract: number;
  paymentTerms: 'immediate' | 'net_30' | 'net_60';
  dedicatedManager?: string;
  customServices: string[];
}

type Customer = B2CCustomer | B2BCustomer;

interface TierBenefits {
  discount: number;
  earnRate: number;
  freeShipping: boolean;
  support: 'standard' | 'priority' | 'dedicated';
  productAccess: 'basic' | 'premium' | 'exclusive';
  experienceOpportunity: 'lottery' | 'priority' | 'guaranteed';
  specialPerks: string[];
}

interface TierUpgradePrediction {
  customerId: string;
  currentTier: string;
  predictedTier: string;
  probability: number;
  timeframe: string;
  requiredActions: string[];
  estimatedRevenue: number;
}

interface CustomerTierManagerProps {
  customerType: CustomerType;
  onTierUpdate?: (customerId: string, newTier: string) => void;
  onCustomerAction?: (customerId: string, action: string) => void;
}

const CustomerTierManager: FC<CustomerTierManagerProps> = ({
  customerType,
  onTierUpdate,
  onCustomerAction
}) => {
  const [customers, setCustomers] = useState([]);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [upgradesPredictions, setUpgradesPredictions] = useState([]);
  const [filterTier, setFilterTier] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

  // 샘플 데이터
  useEffect(() => {
    if (customerType === 'b2c') {
      const sampleB2C: B2CCustomer[] = [
        {
          id: 'b2c_001',
          type: 'b2c',
          name: '김○○',
          email: 'kim@example.com',
          tier: 'vip',
          joinDate: '2023-03-15',
          lastActivity: '2024-06-13',
          status: 'active',
          annualPurchase: 3200000,
          totalPurchase: 8500000,
          orderCount: 47,
          loyaltyPoints: 45200,
          referralCount: 12,
          partnerReferred: true,
          partnerName: '박인플루'
        },
        {
          id: 'b2c_002',
          type: 'b2c',
          name: '이○○',
          email: 'lee@example.com',
          tier: 'premium',
          joinDate: '2023-08-20',
          lastActivity: '2024-06-12',
          status: 'active',
          annualPurchase: 850000,
          totalPurchase: 1200000,
          orderCount: 15,
          loyaltyPoints: 8500,
          referralCount: 3
        }
      ];
      setCustomers(sampleB2C);
    } else {
      const sampleB2B: B2BCustomer[] = [
        {
          id: 'b2b_001',
          type: 'b2b',
          name: '박○○',
          email: 'park.manager@hospital.com',
          tier: 'enterprise_vip',
          companyName: '서울대학교병원',
          businessLicense: '123-45-67890',
          joinDate: '2022-01-10',
          lastActivity: '2024-06-14',
          status: 'active',
          annualContract: 280000000,
          totalContract: 850000000,
          paymentTerms: 'net_60',
          dedicatedManager: '박○○ 이사',
          customServices: ['OEM 개발', '독점 공급', '24시간 지원']
        },
        {
          id: 'b2b_002',
          type: 'b2b',
          name: '정○○',
          email: 'jung@pharmacy.co.kr',
          tier: 'premium_corporate',
          companyName: '○○○약국체인',
          businessLicense: '987-65-43210',
          joinDate: '2023-05-15',
          lastActivity: '2024-06-10',
          status: 'active',
          annualContract: 95000000,
          totalContract: 150000000,
          paymentTerms: 'net_30',
          dedicatedManager: '김○○ 매니저',
          customServices: ['맞춤 제품 개발', '전담 계정 관리']
        }
      ];
      setCustomers(sampleB2B);
    }

    // 승급 예측 데이터
    setUpgradesPredictions([
      {
        customerId: customerType === 'b2c' ? 'b2c_002' : 'b2b_002',
        currentTier: customerType === 'b2c' ? 'premium' : 'premium_corporate',
        predictedTier: customerType === 'b2c' ? 'vip' : 'enterprise_vip',
        probability: 78,
        timeframe: '3개월 내',
        requiredActions: ['월 구매액 50만원 이상 유지', '리뷰 작성 5건 이상'],
        estimatedRevenue: 2500000
      }
    ]);
  }, [customerType]);

  const getTierBenefits = (tier: string): TierBenefits => {
    if (customerType === 'b2c') {
      switch (tier as B2CTier) {
        case 'member':
          return {
            discount: 0,
            earnRate: 1,
            freeShipping: false,
            support: 'standard',
            productAccess: 'basic',
            experienceOpportunity: 'lottery',
            specialPerks: ['기본 고객 서비스']
          };
        case 'premium':
          return {
            discount: 10,
            earnRate: 2,
            freeShipping: false,
            support: 'priority',
            productAccess: 'premium',
            experienceOpportunity: 'priority',
            specialPerks: ['프리미엄 제품 접근', '체험단 우선 선발', '빠른 배송']
          };
        case 'vip':
          return {
            discount: 20,
            earnRate: 3,
            freeShipping: true,
            support: 'dedicated',
            productAccess: 'exclusive',
            experienceOpportunity: 'guaranteed',
            specialPerks: ['VIP 전용 제품', '신제품 우선 구매', '이벤트 초대', '전담 상담사']
          };
        default:
          return {
            discount: 0,
            earnRate: 1,
            freeShipping: false,
            support: 'standard',
            productAccess: 'basic',
            experienceOpportunity: 'lottery',
            specialPerks: []
          };
      }
    } else {
      switch (tier as B2BTier) {
        case 'corporate':
          return {
            discount: 5,
            earnRate: 1,
            freeShipping: false,
            support: 'standard',
            productAccess: 'basic',
            experienceOpportunity: 'lottery',
            specialPerks: ['대량 구매 할인', '월 정산', '기업 전용 제품']
          };
        case 'premium_corporate':
          return {
            discount: 15,
            earnRate: 2,
            freeShipping: true,
            support: 'priority',
            productAccess: 'premium',
            experienceOpportunity: 'priority',
            specialPerks: ['맞춤 제품 개발', '전담 계정 관리자', '우선 고객 지원']
          };
        case 'enterprise_vip':
          return {
            discount: 25,
            earnRate: 3,
            freeShipping: true,
            support: 'dedicated',
            productAccess: 'exclusive',
            experienceOpportunity: 'guaranteed',
            specialPerks: ['독점 공급 계약', '24시간 지원', 'OEM 서비스', 'C-레벨 전담 지원']
          };
        default:
          return {
            discount: 0,
            earnRate: 1,
            freeShipping: false,
            support: 'standard',
            productAccess: 'basic',
            experienceOpportunity: 'lottery',
            specialPerks: []
          };
      }
    }
  };

  const getTierColor = (tier: string) => {
    if (customerType === 'b2c') {
      switch (tier as B2CTier) {
        case 'member':
          return 'text-gray-600 bg-gray-100';
        case 'premium':
          return 'text-blue-600 bg-blue-100';
        case 'vip':
          return 'text-purple-600 bg-purple-100';
        default:
          return 'text-gray-600 bg-gray-100';
      }
    } else {
      switch (tier as B2BTier) {
        case 'corporate':
          return 'text-green-600 bg-green-100';
        case 'premium_corporate':
          return 'text-blue-600 bg-blue-100';
        case 'enterprise_vip':
          return 'text-purple-600 bg-purple-100';
        default:
          return 'text-gray-600 bg-gray-100';
      }
    }
  };

  const getTierLabel = (tier: string) => {
    if (customerType === 'b2c') {
      switch (tier as B2CTier) {
        case 'member':
          return '일반 회원';
        case 'premium':
          return '프리미엄 회원';
        case 'vip':
          return 'VIP 회원';
        default:
          return tier;
      }
    } else {
      switch (tier as B2BTier) {
        case 'corporate':
          return '기업 회원';
        case 'premium_corporate':
          return '프리미엄 기업';
        case 'enterprise_vip':
          return '엔터프라이즈 VIP';
        default:
          return tier;
      }
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ko-KR', {
      style: 'currency',
      currency: 'KRW',
      minimumFractionDigits: 0
    }).format(amount);
  };

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('ko-KR').format(num);
  };

  const filteredCustomers = customers.filter(customer => {
    const matchesFilter = filterTier === 'all' || customer.tier === filterTier;
    const matchesSearch = customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         customer.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (customer.type === 'b2b' && (customer as B2BCustomer).companyName.toLowerCase().includes(searchTerm.toLowerCase()));
    return matchesFilter && matchesSearch;
  });

  const handleTierManualUpdate = (customerId: string, newTier: string) => {
    setCustomers(prev => prev.map(customer => 
      customer.id === customerId 
        ? { ...customer, tier: newTier as B2CTier | B2BTier }
        : customer
    ));
    onTierUpdate?.(customerId, newTier);
  };

  const renderCustomerCard = (customer: Customer) => {
    const benefits = getTierBenefits(customer.tier);
    
    return (
      <div key={customer.id} className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-to-br from-o4o-primary-400 to-o4o-primary-600 rounded-full flex items-center justify-center text-white font-bold">
              {customer.name.charAt(0)}
            </div>
            <div>
              <h3 className="font-medium text-gray-900">{customer.name}</h3>
              {customer.type === 'b2b' && (
                <p className="text-sm text-gray-600">{(customer as B2BCustomer).companyName}</p>
              )}
              <div className="flex items-center space-x-2 mt-1">
                <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getTierColor(customer.tier)}`}>
                  {getTierLabel(customer.tier)}
                </span>
                {customer.type === 'b2c' && (customer as B2CCustomer).partnerReferred && (
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-role-partner bg-opacity-20 text-role-partner">
                    파트너 추천
                  </span>
                )}
              </div>
            </div>
          </div>
          
          <button
            onClick={() => setSelectedCustomer(customer)}
            className="text-sm text-o4o-primary-600 hover:text-o4o-primary-700 font-medium"
          >
            상세 보기
          </button>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-3">
          {customer.type === 'b2c' ? (
            <>
              <div>
                <span className="text-xs text-gray-600">연간 구매액</span>
                <p className="font-medium">{formatCurrency((customer as B2CCustomer).annualPurchase)}</p>
              </div>
              <div>
                <span className="text-xs text-gray-600">주문 건수</span>
                <p className="font-medium">{formatNumber((customer as B2CCustomer).orderCount)}건</p>
              </div>
              <div>
                <span className="text-xs text-gray-600">적립 포인트</span>
                <p className="font-medium">{formatNumber((customer as B2CCustomer).loyaltyPoints)}P</p>
              </div>
              <div>
                <span className="text-xs text-gray-600">추천 고객</span>
                <p className="font-medium">{(customer as B2CCustomer).referralCount}명</p>
              </div>
            </>
          ) : (
            <>
              <div>
                <span className="text-xs text-gray-600">연간 계약액</span>
                <p className="font-medium">{formatCurrency((customer as B2BCustomer).annualContract)}</p>
              </div>
              <div>
                <span className="text-xs text-gray-600">결제 조건</span>
                <p className="font-medium">{(customer as B2BCustomer).paymentTerms.toUpperCase()}</p>
              </div>
              {(customer as B2BCustomer).dedicatedManager && (
                <>
                  <div>
                    <span className="text-xs text-gray-600">전담 매니저</span>
                    <p className="font-medium">{(customer as B2BCustomer).dedicatedManager}</p>
                  </div>
                  <div>
                    <span className="text-xs text-gray-600">특별 서비스</span>
                    <p className="font-medium">{(customer as B2BCustomer).customServices.length}개</p>
                  </div>
                </>
              )}
            </>
          )}
        </div>

        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-600">마지막 활동: {customer.lastActivity}</span>
          <div className="flex items-center space-x-2">
            <span className={`w-2 h-2 rounded-full ${customer.status === 'active' ? 'bg-trust-verified' : 'bg-gray-400'}`}></span>
            <span className="text-gray-600">{customer.status === 'active' ? '활성' : '비활성'}</span>
          </div>
        </div>
      </div>
    );
  };

  const renderCustomerDetail = () => {
    if (!selectedCustomer) return null;

    const benefits = getTierBenefits(selectedCustomer.tier);
    const prediction = upgradesPredictions.find(p => p.customerId === selectedCustomer.id);

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6 max-w-4xl w-full mx-4 max-h-screen overflow-y-auto">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-gray-900">고객 상세 정보</h2>
            <button
              onClick={() => setSelectedCustomer(null)}
              className="text-gray-400 hover:text-gray-600"
            >
              ✕
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* 고객 기본 정보 */}
            <div className="space-y-4">
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="font-medium text-gray-900 mb-3">기본 정보</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">이름:</span>
                    <span className="font-medium">{selectedCustomer.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">이메일:</span>
                    <span className="font-medium">{selectedCustomer.email}</span>
                  </div>
                  {selectedCustomer.type === 'b2b' && (
                    <>
                      <div className="flex justify-between">
                        <span className="text-gray-600">회사명:</span>
                        <span className="font-medium">{(selectedCustomer as B2BCustomer).companyName}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">사업자번호:</span>
                        <span className="font-medium">{(selectedCustomer as B2BCustomer).businessLicense}</span>
                      </div>
                    </>
                  )}
                  <div className="flex justify-between">
                    <span className="text-gray-600">가입일:</span>
                    <span className="font-medium">{selectedCustomer.joinDate}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">현재 등급:</span>
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getTierColor(selectedCustomer.tier)}`}>
                      {getTierLabel(selectedCustomer.tier)}
                    </span>
                  </div>
                </div>
              </div>

              {/* 혜택 정보 */}
              <div className="bg-blue-50 rounded-lg p-4">
                <h3 className="font-medium text-blue-900 mb-3">등급별 혜택</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-blue-700">할인율:</span>
                    <span className="font-medium text-blue-900">{benefits.discount}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-blue-700">적립률:</span>
                    <span className="font-medium text-blue-900">{benefits.earnRate}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-blue-700">무료배송:</span>
                    <span className="font-medium text-blue-900">{benefits.freeShipping ? '✅' : '❌'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-blue-700">고객지원:</span>
                    <span className="font-medium text-blue-900">
                      {benefits.support === 'standard' ? '표준' : 
                       benefits.support === 'priority' ? '우선' : '전담'}
                    </span>
                  </div>
                </div>
                
                <div className="mt-3">
                  <h4 className="font-medium text-blue-900 mb-2">특별 혜택</h4>
                  <ul className="space-y-1 text-xs text-blue-700">
                    {benefits.specialPerks.map((perk, index) => (
                      <li key={index} className="flex items-center">
                        <span className="w-1 h-1 bg-blue-400 rounded-full mr-2"></span>
                        {perk}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>

            {/* 성과 및 예측 */}
            <div className="space-y-4">
              {/* 구매 이력 */}
              <div className="bg-green-50 rounded-lg p-4">
                <h3 className="font-medium text-green-900 mb-3">구매 실적</h3>
                {selectedCustomer.type === 'b2c' ? (
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-green-700">연간 구매액:</span>
                      <span className="font-medium text-green-900">
                        {formatCurrency((selectedCustomer as B2CCustomer).annualPurchase)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-green-700">총 구매액:</span>
                      <span className="font-medium text-green-900">
                        {formatCurrency((selectedCustomer as B2CCustomer).totalPurchase)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-green-700">주문 건수:</span>
                      <span className="font-medium text-green-900">
                        {formatNumber((selectedCustomer as B2CCustomer).orderCount)}건
                      </span>
                    </div>
                    {(selectedCustomer as B2CCustomer).partnerReferred && (
                      <div className="mt-3 p-2 bg-role-partner bg-opacity-10 rounded">
                        <span className="text-xs text-role-partner font-medium">
                          파트너 추천 고객: {(selectedCustomer as B2CCustomer).partnerName}
                        </span>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-green-700">연간 계약액:</span>
                      <span className="font-medium text-green-900">
                        {formatCurrency((selectedCustomer as B2BCustomer).annualContract)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-green-700">총 계약액:</span>
                      <span className="font-medium text-green-900">
                        {formatCurrency((selectedCustomer as B2BCustomer).totalContract)}
                      </span>
                    </div>
                    <div className="mt-3">
                      <h4 className="font-medium text-green-900 mb-2">맞춤 서비스</h4>
                      <ul className="space-y-1 text-xs text-green-700">
                        {(selectedCustomer as B2BCustomer).customServices.map((service, index) => (
                          <li key={index} className="flex items-center">
                            <span className="w-1 h-1 bg-green-400 rounded-full mr-2"></span>
                            {service}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                )}
              </div>

              {/* 승급 예측 */}
              {prediction && (
                <div className="bg-purple-50 rounded-lg p-4">
                  <h3 className="font-medium text-purple-900 mb-3">🎯 승급 예측 (AI 기반)</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-purple-700">예상 승급:</span>
                      <span className="font-medium text-purple-900">{getTierLabel(prediction.predictedTier)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-purple-700">확률:</span>
                      <span className="font-medium text-purple-900">{prediction.probability}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-purple-700">예상 시기:</span>
                      <span className="font-medium text-purple-900">{prediction.timeframe}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-purple-700">추가 수익 예상:</span>
                      <span className="font-medium text-purple-900">{formatCurrency(prediction.estimatedRevenue)}</span>
                    </div>
                  </div>

                  <div className="mt-3">
                    <h4 className="font-medium text-purple-900 mb-2">필요 조건</h4>
                    <ul className="space-y-1 text-xs text-purple-700">
                      {prediction.requiredActions.map((action, index) => (
                        <li key={index} className="flex items-center">
                          <span className="w-1 h-1 bg-purple-400 rounded-full mr-2"></span>
                          {action}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* 액션 버튼들 */}
          <div className="mt-6 flex items-center justify-end space-x-3">
            <button
              onClick={() => onCustomerAction?.(selectedCustomer.id, 'contact')}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
            >
              고객 연락
            </button>
            <button
              onClick={() => onCustomerAction?.(selectedCustomer.id, 'personalized_service')}
              className="px-4 py-2 text-sm font-medium text-white bg-o4o-primary-500 rounded-md hover:bg-o4o-primary-600"
            >
              개인화 서비스 제공
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="max-w-7xl mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">
          {customerType === 'b2c' ? 'B2C 고객' : 'B2B 고객'} 등급 관리
        </h1>
        <p className="text-gray-600 mt-1">
          {customerType === 'b2c' 
            ? '개인 고객의 등급별 혜택과 승급 관리를 통해 고객 만족도를 높입니다'
            : '기업 고객의 등급별 서비스와 계약 관리를 통해 장기적 파트너십을 구축합니다'
          }
        </p>
      </div>

      {/* 필터 및 검색 */}
      <div className="bg-white border border-gray-200 rounded-lg p-4 mb-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0">
          <div className="flex items-center space-x-4">
            <select
              value={filterTier}
              onChange={(e: any) => setFilterTier(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-o4o-primary-500"
            >
              <option value="all">모든 등급</option>
              {customerType === 'b2c' ? (
                <>
                  <option value="member">일반 회원</option>
                  <option value="premium">프리미엄 회원</option>
                  <option value="vip">VIP 회원</option>
                </>
              ) : (
                <>
                  <option value="corporate">기업 회원</option>
                  <option value="premium_corporate">프리미엄 기업</option>
                  <option value="enterprise_vip">엔터프라이즈 VIP</option>
                </>
              )}
            </select>
            
            <input
              type="text"
              placeholder={customerType === 'b2c' ? '고객명 또는 이메일 검색' : '고객명, 회사명 또는 이메일 검색'}
              value={searchTerm}
              onChange={(e: any) => setSearchTerm(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-o4o-primary-500"
            />
          </div>

          <div className="text-sm text-gray-600">
            총 {filteredCustomers.length}명의 고객
          </div>
        </div>
      </div>

      {/* 승급 예측 카드 */}
      {upgradesPredictions.length > 0 && (
        <div className="bg-gradient-to-r from-purple-50 to-blue-50 border border-purple-200 rounded-lg p-4 mb-6">
          <h2 className="text-lg font-semibold text-purple-900 mb-3">🎯 등급 승급 예측 (AI 기반)</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {upgradesPredictions.map((prediction: any) => {
              const customer = customers.find(c => c.id === prediction.customerId);
              if (!customer) return null;
              
              return (
                <div key={prediction.customerId} className="bg-white rounded-lg p-4 border border-purple-200">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-medium text-gray-900">{customer.name}</h3>
                    <span className="text-sm font-medium text-purple-600">{prediction.probability}%</span>
                  </div>
                  <div className="text-sm text-gray-600 mb-2">
                    {getTierLabel(prediction.currentTier)} → {getTierLabel(prediction.predictedTier)}
                  </div>
                  <div className="text-xs text-gray-500">
                    {prediction.timeframe} 내 승급 예상
                  </div>
                  <div className="mt-2">
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="h-2 bg-purple-500 rounded-full transition-all duration-300"
                        style={{ width: `${prediction.probability}%` }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 고객 목록 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredCustomers.map(renderCustomerCard)}
      </div>

      {/* 고객 상세 모달 */}
      {renderCustomerDetail()}
    </div>
  );
};

export default CustomerTierManager;