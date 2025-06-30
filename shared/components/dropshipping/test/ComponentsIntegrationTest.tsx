import React, { useState } from 'react';
import { Package, TrendingUp, Users, DollarSign } from 'lucide-react';
import { StatCard } from '../ui/StatCard';
import { StatusBadge } from '../ui/StatusBadge';
import { DataTable } from '../ui/DataTable';
import { Modal, ModalHeader, ModalBody, ModalFooter, ModalButton } from '../ui/Modal';

// Test data
const testStats = [
  { title: '총 상품 수', value: 1247, icon: Package, change: 12.5, color: 'blue' as const },
  { title: '주문 건수', value: 2892, icon: TrendingUp, change: -2.3, color: 'green' as const },
  { title: '매출액', value: '₩12,450,000', icon: DollarSign, change: 8.7, color: 'yellow' as const },
  { title: '활성 사용자', value: 456, icon: Users, change: 5.2, color: 'purple' as const },
];

const testTableData = [
  { id: 1, name: '무선 이어폰', status: '판매중', price: '₩59,000', orders: 120 },
  { id: 2, name: '스마트워치', status: '품절', price: '₩299,000', orders: 85 },
  { id: 3, name: 'USB 케이블', status: '대기', price: '₩15,000', orders: 203 },
  { id: 4, name: '무선 충전기', status: '완료', price: '₩45,000', orders: 67 },
  { id: 5, name: '휴대폰 케이스', status: '활성', price: '₩25,000', orders: 145 },
];

const testTableColumns = [
  { key: 'name', label: '상품명', sortable: true, width: '30%' },
  { 
    key: 'status', 
    label: '상태', 
    sortable: true, 
    render: (value: string) => <StatusBadge status={value} />
  },
  { key: 'price', label: '가격', sortable: true, align: 'right' as const },
  { key: 'orders', label: '주문 수', sortable: true, align: 'center' as const },
  {
    key: 'actions',
    label: '작업',
    align: 'center' as const,
    render: (_, row: any) => (
      <button 
        onClick={() => alert(`${row.name} 상세보기`)}
        className="px-3 py-1 bg-blue-100 text-blue-700 rounded-md hover:bg-blue-200 transition-colors text-sm font-medium"
      >
        보기
      </button>
    )
  }
];

export const ComponentsIntegrationTest: React.FC = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">
            드랍쉬핑 컴포넌트 통합 테스트
          </h1>
          <p className="text-gray-600 max-w-2xl mx-auto">
            모든 UI 컴포넌트가 올바르게 작동하는지 확인하는 테스트 페이지입니다.
            각 컴포넌트의 기능과 Coupang 스타일 디자인을 검증할 수 있습니다.
          </p>
        </div>

        {/* StatusBadge 테스트 */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">StatusBadge 컴포넌트</h2>
          <div className="flex flex-wrap gap-3">
            {[
              '판매중', '품절', '대기', '완료', '활성', '중단', '승인', '거부', 
              '신규', '특별', '프리미엄', '처리중', '배송완료'
            ].map((status) => (
              <StatusBadge key={status} status={status} />
            ))}
          </div>
          <div className="mt-4 space-y-2">
            <p className="text-sm text-gray-600 font-medium">다양한 변형:</p>
            <div className="flex flex-wrap gap-3">
              <StatusBadge status="판매중" variant="default" />
              <StatusBadge status="판매중" variant="outline" />
              <StatusBadge status="판매중" variant="subtle" />
              <StatusBadge status="특별" size="sm" />
              <StatusBadge status="특별" size="md" />
              <StatusBadge status="특별" size="lg" />
            </div>
          </div>
        </div>

        {/* StatCard 테스트 */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">StatCard 컴포넌트</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {testStats.map((stat, index) => (
              <StatCard
                key={index}
                title={stat.title}
                value={stat.value}
                icon={stat.icon}
                change={stat.change}
                color={stat.color}
                subtitle="지난 주 대비"
              />
            ))}
          </div>
          <div className="mt-6">
            <p className="text-sm text-gray-600 font-medium mb-3">로딩 상태:</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              <StatCard
                title="로딩 테스트"
                value={0}
                icon={Package}
                loading={true}
              />
              <StatCard
                title="긴 제목이 있는 StatCard 테스트"
                value="₩1,234,567,890"
                icon={DollarSign}
                change={15.7}
                color="green"
                subtitle="매우 긴 부제목이 포함된 StatCard 컴포넌트 테스트"
              />
              <StatCard
                title="변화 없음"
                value={100}
                icon={Users}
                change={0}
                color="gray"
              />
            </div>
          </div>
        </div>

        {/* DataTable 테스트 */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900">DataTable 컴포넌트</h2>
            <p className="text-gray-600 mt-2">정렬, 페이지네이션, 호버 효과가 포함된 테이블</p>
          </div>
          <DataTable
            data={testTableData}
            columns={testTableColumns}
            pageSize={3}
            className="border-0 shadow-none"
          />
        </div>

        {/* Modal 테스트 */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Modal 컴포넌트</h2>
          <div className="space-x-4">
            <ModalButton 
              variant="primary" 
              onClick={() => setIsModalOpen(true)}
            >
              모달 열기
            </ModalButton>
            <ModalButton variant="secondary">보조 버튼</ModalButton>
            <ModalButton variant="danger">위험 버튼</ModalButton>
            <ModalButton variant="primary" disabled>비활성 버튼</ModalButton>
          </div>
        </div>

        {/* 반응형 테스트 정보 */}
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-6 border border-blue-200">
          <h2 className="text-xl font-semibold text-blue-900 mb-4">반응형 디자인 테스트</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
            <div>
              <h3 className="font-semibold text-blue-800 mb-2">테스트 가이드:</h3>
              <ul className="space-y-1 text-blue-700">
                <li>• 브라우저 크기를 조절하여 반응형 동작 확인</li>
                <li>• 모바일 뷰에서 사이드바 햄버거 메뉴 테스트</li>
                <li>• 테이블의 가로 스크롤 동작 확인</li>
                <li>• StatCard 그리드 레이아웃 변화 관찰</li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold text-blue-800 mb-2">중단점:</h3>
              <ul className="space-y-1 text-blue-700">
                <li>• Mobile: &lt; 768px</li>
                <li>• Tablet: 768px - 1023px</li>
                <li>• Desktop: 1024px+</li>
                <li>• Large: 1280px+</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Coupang 스타일 특징 */}
        <div className="bg-gradient-to-r from-red-50 to-orange-50 rounded-xl p-6 border border-red-200">
          <h2 className="text-xl font-semibold text-red-900 mb-4">Coupang 스타일 디자인 특징</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-sm">
            <div>
              <h3 className="font-semibold text-red-800 mb-2">색상 시스템:</h3>
              <ul className="space-y-1 text-red-700">
                <li>• 주요 색상: Red (#ef4444)</li>
                <li>• 보조 색상: Orange (#f97316)</li>
                <li>• 그라데이션 활용</li>
                <li>• 상태별 색상 구분</li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold text-red-800 mb-2">인터랙션:</h3>
              <ul className="space-y-1 text-red-700">
                <li>• 호버 시 미세한 상승 효과</li>
                <li>• 부드러운 전환 애니메이션</li>
                <li>• 그림자 강화 효과</li>
                <li>• 색상 변화 피드백</li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold text-red-800 mb-2">타이포그래피:</h3>
              <ul className="space-y-1 text-red-700">
                <li>• 시스템 폰트 우선</li>
                <li>• 적절한 폰트 두께 활용</li>
                <li>• 계층적 텍스트 크기</li>
                <li>• 가독성 우선 설계</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Test Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="테스트 모달"
        size="lg"
      >
        <ModalHeader>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
              <Package className="w-4 h-4 text-blue-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">모달 헤더 테스트</h3>
              <p className="text-sm text-gray-500">추가 설명이 들어갑니다</p>
            </div>
          </div>
        </ModalHeader>
        <ModalBody>
          <div className="space-y-4">
            <p className="text-gray-600">
              이것은 모달 컴포넌트의 테스트 내용입니다. 
              키보드 내비게이션(Tab, Escape), 포커스 트랩, 
              오버레이 클릭 등의 기능을 확인할 수 있습니다.
            </p>
            
            <div className="bg-gray-50 rounded-lg p-4">
              <h4 className="font-semibold text-gray-900 mb-2">테스트 가능한 기능:</h4>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• ESC 키로 모달 닫기</li>
                <li>• 오버레이 클릭으로 모달 닫기</li>
                <li>• Tab 키로 요소 간 이동</li>
                <li>• 포커스 트랩 기능</li>
                <li>• 반응형 크기 조절</li>
              </ul>
            </div>

            <div className="flex gap-3">
              <input 
                type="text" 
                placeholder="포커스 테스트 입력 필드"
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors">
                테스트
              </button>
            </div>
          </div>
        </ModalBody>
        <ModalFooter>
          <ModalButton variant="secondary" onClick={() => setIsModalOpen(false)}>
            취소
          </ModalButton>
          <ModalButton variant="primary" onClick={() => setIsModalOpen(false)}>
            확인
          </ModalButton>
        </ModalFooter>
      </Modal>
    </div>
  );
};