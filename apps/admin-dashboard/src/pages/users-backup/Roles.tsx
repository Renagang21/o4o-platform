import { FC } from 'react';
import { Shield, Users, Building, Star, Settings } from 'lucide-react'
import { ROLE_LABELS } from '@/types/user'

const Roles: FC = () => {
  const roleDescriptions = {
    admin: {
      description: '시스템의 모든 기능에 접근할 수 있는 최고 권한자',
      permissions: [
        '모든 사용자 관리 (승인, 거부, 정지)',
        '상품 관리 및 카테고리 설정',
        '주문 관리 및 결제 처리',
        '콘텐츠 관리 (게시글, 페이지, 미디어)',
        '시스템 설정 및 통계 조회',
        '다른 관리자 계정 생성'
      ],
      color: 'red',
      icon: <Shield className="w-6 h-6" />
    },
    business: {
      description: '도매가로 구매할 수 있는 사업자 회원',
      permissions: [
        '도매가격으로 상품 구매',
        '대량 주문 및 할인 혜택',
        '사업자 전용 상품 접근',
        '세금계산서 발행 요청',
        '전용 고객지원 서비스',
        '비즈니스 대시보드 이용'
      ],
      color: 'blue',
      icon: <Building className="w-6 h-6" />
    },
    affiliate: {
      description: '상품을 추천하고 수수료를 받는 파트너 회원',
      permissions: [
        '제품 추천 링크 생성',
        '수수료 수익 확인',
        '추천 성과 분석',
        '마케팅 자료 다운로드',
        '파트너 전용 교육 자료',
        '월별 정산 및 출금'
      ],
      color: 'purple',
      icon: <Star className="w-6 h-6" />
    },
    customer: {
      description: '일반 소비자 가격으로 구매하는 기본 회원',
      permissions: [
        '일반 가격으로 상품 구매',
        '장바구니 및 위시리스트',
        '주문 내역 확인',
        '상품 리뷰 작성',
        '고객 지원 센터 이용',
        '포인트 적립 및 사용'
      ],
      color: 'green',
      icon: <Users className="w-6 h-6" />
    }
  }

  const getColorClasses = (color: string) => {
    const colors = {
      red: 'bg-red-50 border-red-200 text-red-800',
      blue: 'bg-blue-50 border-blue-200 text-blue-800',
      purple: 'bg-purple-50 border-purple-200 text-purple-800',
      green: 'bg-green-50 border-green-200 text-green-800'
    }
    return colors[color as keyof typeof colors] || colors.green
  }

  const getIconColorClasses = (color: string) => {
    const colors = {
      red: 'text-red-600',
      blue: 'text-blue-600',
      purple: 'text-purple-600',
      green: 'text-green-600'
    }
    return colors[color as keyof typeof colors] || colors.green
  }

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">역할 및 권한 관리</h1>
        <p className="text-gray-600 mt-1">시스템의 사용자 역할과 권한을 관리합니다</p>
      </div>

      {/* 역할 개요 */}
      <div className="wp-card">
        <div className="wp-card-header">
          <h3 className="wp-card-title">
            <Settings className="w-5 h-5 mr-2" />
            역할 시스템 개요
          </h3>
        </div>
        <div className="wp-card-body">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="font-medium text-blue-900 mb-2">O4O 플랫폼 역할 체계</h4>
            <p className="text-sm text-blue-800">
              O4O 플랫폼은 사용자의 목적과 필요에 따라 4가지 주요 역할로 구분됩니다. 
              각 역할은 고유한 권한과 혜택을 제공하여 최적화된 사용자 경험을 제공합니다.
            </p>
          </div>
        </div>
      </div>

      {/* 역할별 상세 정보 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {Object.entries(roleDescriptions).map(([roleKey, roleInfo]) => (
          <div
            key={roleKey}
            className={`wp-card border-l-4 ${getColorClasses(roleInfo.color)}`}
          >
            <div className="wp-card-header">
              <div className="flex items-center gap-3">
                <div className={getIconColorClasses(roleInfo.color)}>
                  {roleInfo.icon}
                </div>
                <div>
                  <h3 className="wp-card-title text-lg">
                    {ROLE_LABELS[roleKey as keyof typeof ROLE_LABELS]}
                  </h3>
                  <p className="text-sm text-gray-600 mt-1">
                    {roleInfo.description}
                  </p>
                </div>
              </div>
            </div>
            
            <div className="wp-card-body">
              <h4 className="font-medium text-gray-900 mb-3">주요 권한</h4>
              <ul className="space-y-2">
                {roleInfo.permissions.map((permission, index) => (
                  <li key={index} className="flex items-start gap-2 text-sm text-gray-700">
                    <span className={`w-1.5 h-1.5 rounded-full mt-2 flex-shrink-0 ${getIconColorClasses(roleInfo.color).replace('text-', 'bg-')}`} />
                    {permission}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        ))}
      </div>

      {/* 역할 변경 정책 */}
      <div className="wp-card">
        <div className="wp-card-header">
          <h3 className="wp-card-title">역할 변경 정책</h3>
        </div>
        <div className="wp-card-body space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 bg-green-50 rounded-lg border border-green-200">
              <h4 className="font-medium text-green-900 mb-2">✅ 허용되는 변경</h4>
              <ul className="text-sm text-green-800 space-y-1">
                <li>• 일반회원 → 사업자회원 (사업자 정보 확인 후)</li>
                <li>• 일반회원 → 파트너회원 (신청 승인 후)</li>
                <li>• 사업자회원 → 파트너회원 (겸업 가능)</li>
                <li>• 모든 역할 → 일반회원 (권한 축소)</li>
              </ul>
            </div>

            <div className="p-4 bg-red-50 rounded-lg border border-red-200">
              <h4 className="font-medium text-red-900 mb-2">❌ 제한되는 변경</h4>
              <ul className="text-sm text-red-800 space-y-1">
                <li>• 일반회원 → 관리자 (별도 승인 필요)</li>
                <li>• 정지된 사용자의 역할 변경</li>
                <li>• 본인의 관리자 권한 해제</li>
                <li>• 승인되지 않은 사업자 정보로 역할 변경</li>
              </ul>
            </div>
          </div>

          <div className="p-4 bg-yellow-50 rounded-lg border border-yellow-200">
            <h4 className="font-medium text-yellow-900 mb-2">⚠️ 주의사항</h4>
            <ul className="text-sm text-yellow-800 space-y-1">
              <li>• 역할 변경 시 기존 권한이 즉시 적용됩니다</li>
              <li>• 사업자회원으로 변경 시 사업자등록번호 확인이 필요합니다</li>
              <li>• 파트너회원은 별도의 수수료 정책이 적용됩니다</li>
              <li>• 역할 변경 내역은 모두 로그로 기록됩니다</li>
            </ul>
          </div>
        </div>
      </div>

      {/* 통계 정보 */}
      <div className="wp-card">
        <div className="wp-card-header">
          <h3 className="wp-card-title">역할별 사용자 통계</h3>
        </div>
        <div className="wp-card-body">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {Object.entries(ROLE_LABELS).map(([roleKey, roleLabel]) => {
              const roleInfo = roleDescriptions[roleKey as keyof typeof roleDescriptions]
              return (
                <div key={roleKey} className="text-center p-4 bg-gray-50 rounded-lg">
                  <div className={`mx-auto mb-2 ${getIconColorClasses(roleInfo.color)}`}>
                    {roleInfo.icon}
                  </div>
                  <div className="text-2xl font-bold text-gray-900">-</div>
                  <div className="text-sm text-gray-600">{roleLabel}</div>
                </div>
              )
            })}
          </div>
          <p className="text-sm text-gray-500 text-center mt-4">
            * 실시간 통계는 개발 중입니다
          </p>
        </div>
      </div>
    </div>
  )
}

export default Roles