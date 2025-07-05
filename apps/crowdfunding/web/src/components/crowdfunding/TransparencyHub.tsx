import { useState } from 'react'
import { Project } from '../../types'

interface TransparencyHubProps {
  project: Project
}

const TransparencyHub = ({ project }: TransparencyHubProps) => {
  const [activeTab, setActiveTab] = useState('overview')

  const tabs = [
    { id: 'overview', label: '종합 점수' },
    { id: 'technical', label: '기술 검증' },
    { id: 'safety', label: '안전성 문서' },
    { id: 'expert', label: '전문가 검증' },
    { id: 'partner', label: '파트너 투명성' }
  ]

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-900">투명성 허브</h2>
        <div className="flex items-center space-x-2">
          <div className="text-3xl font-bold text-green-600">{project.transparencyScore}/100</div>
          <div className="text-sm text-gray-500">투명성 점수</div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="-mb-px flex space-x-8">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === tab.id
                  ? 'border-crowdfunding-primary text-crowdfunding-primary'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="space-y-6">
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-green-50 p-4 rounded-lg">
              <div className="text-2xl font-bold text-green-600">96점</div>
              <div className="text-sm text-green-700">기술적 타당성</div>
              <div className="mt-2 space-y-1">
                <div className="flex items-center text-xs text-green-600">
                  <span className="w-2 h-2 bg-green-500 rounded-full mr-2"></span>
                  특허 등록 완료
                </div>
                <div className="flex items-center text-xs text-green-600">
                  <span className="w-2 h-2 bg-green-500 rounded-full mr-2"></span>
                  기술 검증 통과
                </div>
                <div className="flex items-center text-xs text-green-600">
                  <span className="w-2 h-2 bg-green-500 rounded-full mr-2"></span>
                  프로토타입 시연 성공
                </div>
              </div>
            </div>

            <div className="bg-blue-50 p-4 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">92점</div>
              <div className="text-sm text-blue-700">안전성 확인</div>
              <div className="mt-2 space-y-1">
                <div className="flex items-center text-xs text-blue-600">
                  <span className="w-2 h-2 bg-blue-500 rounded-full mr-2"></span>
                  임상시험 완료
                </div>
                <div className="flex items-center text-xs text-blue-600">
                  <span className="w-2 h-2 bg-blue-500 rounded-full mr-2"></span>
                  부작용 테스트 통과
                </div>
                <div className="flex items-center text-xs text-yellow-600">
                  <span className="w-2 h-2 bg-yellow-500 rounded-full mr-2"></span>
                  장기 추적 연구 진행중
                </div>
              </div>
            </div>

            <div className="bg-purple-50 p-4 rounded-lg">
              <div className="text-2xl font-bold text-purple-600">95점</div>
              <div className="text-sm text-purple-700">제조 신뢰성</div>
              <div className="mt-2 space-y-1">
                <div className="flex items-center text-xs text-purple-600">
                  <span className="w-2 h-2 bg-purple-500 rounded-full mr-2"></span>
                  GMP 인증 제조사
                </div>
                <div className="flex items-center text-xs text-purple-600">
                  <span className="w-2 h-2 bg-purple-500 rounded-full mr-2"></span>
                  품질관리 시스템 완비
                </div>
                <div className="flex items-center text-xs text-purple-600">
                  <span className="w-2 h-2 bg-purple-500 rounded-full mr-2"></span>
                  공급망 투명 공개
                </div>
              </div>
            </div>

            <div className="bg-orange-50 p-4 rounded-lg">
              <div className="text-2xl font-bold text-orange-600">93점</div>
              <div className="text-sm text-orange-700">팀 신뢰도</div>
              <div className="mt-2 space-y-1">
                <div className="flex items-center text-xs text-orange-600">
                  <span className="w-2 h-2 bg-orange-500 rounded-full mr-2"></span>
                  관련 분야 전문가 팀 구성
                </div>
                <div className="flex items-center text-xs text-orange-600">
                  <span className="w-2 h-2 bg-orange-500 rounded-full mr-2"></span>
                  이전 성공 프로젝트 경험
                </div>
                <div className="flex items-center text-xs text-orange-600">
                  <span className="w-2 h-2 bg-orange-500 rounded-full mr-2"></span>
                  투명한 이력 공개
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'technical' && (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">기술 사양 및 검증</h3>
            <div className="bg-gray-50 p-4 rounded-lg">
              <h4 className="font-medium mb-2">상세 기술 사양</h4>
              <ul className="space-y-1 text-sm text-gray-600">
                <li>• CPU: ARM Cortex-M4 32bit 프로세서</li>
                <li>• 센서: 6축 가속도계, 심박센서, 혈압센서</li>
                <li>• 배터리: 400mAh 리튬폴리머 (7일 사용)</li>
                <li>• 연결성: Bluetooth 5.0, Wi-Fi</li>
              </ul>
            </div>
            <div className="bg-gray-50 p-4 rounded-lg">
              <h4 className="font-medium mb-2">테스트 결과</h4>
              <ul className="space-y-1 text-sm text-gray-600">
                <li>• 정확도: 의료기기 등급 ±2% 오차범위</li>
                <li>• 내구성: IP68 방수방진 인증</li>
                <li>• 호환성: iOS 12+, Android 8+ 지원</li>
              </ul>
            </div>
          </div>
        )}

        {activeTab === 'safety' && (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">안전성 문서</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="border border-gray-200 p-4 rounded-lg">
                <h4 className="font-medium mb-2">안전성 테스트 보고서</h4>
                <p className="text-sm text-gray-600 mb-3">
                  200명 대상 6개월 임상시험 결과
                </p>
                <button className="text-crowdfunding-primary text-sm hover:underline">
                  📄 보고서 다운로드
                </button>
              </div>
              <div className="border border-gray-200 p-4 rounded-lg">
                <h4 className="font-medium mb-2">규제 승인</h4>
                <p className="text-sm text-gray-600 mb-3">
                  FDA, CE 마크 획득 완료
                </p>
                <button className="text-crowdfunding-primary text-sm hover:underline">
                  📜 인증서 보기
                </button>
              </div>
              <div className="border border-gray-200 p-4 rounded-lg">
                <h4 className="font-medium mb-2">위험성 평가</h4>
                <p className="text-sm text-gray-600 mb-3">
                  부작용 발생률 2.5% (경미한 수준)
                </p>
                <button className="text-crowdfunding-primary text-sm hover:underline">
                  📊 상세 분석
                </button>
              </div>
              <div className="border border-gray-200 p-4 rounded-lg">
                <h4 className="font-medium mb-2">품질 보증</h4>
                <p className="text-sm text-gray-600 mb-3">
                  ISO 13485 의료기기 품질관리
                </p>
                <button className="text-crowdfunding-primary text-sm hover:underline">
                  🏆 인증 현황
                </button>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'expert' && (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">전문가 검증</h3>
            <div className="space-y-4">
              <div className="border-l-4 border-green-500 bg-green-50 p-4">
                <div className="flex items-start space-x-3">
                  <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                    <span className="text-green-600 font-bold">김</span>
                  </div>
                  <div className="flex-1">
                    <h4 className="font-semibold">김박사 (서울대 의공학과)</h4>
                    <p className="text-sm text-gray-600 mb-2">의료기기 전문가 · 15년 경력</p>
                    <p className="text-sm">"기술적 타당성이 매우 높으며, 특허 기술의 혁신성이 인상적입니다."</p>
                    <div className="mt-2 text-xs text-green-600">✅ 검증 완료 (95점)</div>
                  </div>
                </div>
              </div>
              
              <div className="border-l-4 border-blue-500 bg-blue-50 p-4">
                <div className="flex items-start space-x-3">
                  <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                    <span className="text-blue-600 font-bold">이</span>
                  </div>
                  <div className="flex-1">
                    <h4 className="font-semibold">이교수 (연세대 약학과)</h4>
                    <p className="text-sm text-gray-600 mb-2">약물동태학 전문가 · 20년 경력</p>
                    <p className="text-sm">"안전성 데이터가 충분하며, 임상 결과가 신뢰할 만합니다."</p>
                    <div className="mt-2 text-xs text-blue-600">🔍 검토 중 (예정 완료: 7/15)</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'partner' && (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">파트너 투명성</h3>
            {project.partnerEndorsements.map((endorsement) => (
              <div key={endorsement.id} className="border border-gray-200 p-4 rounded-lg">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h4 className="font-semibold">{endorsement.partner.name}</h4>
                    <p className="text-sm text-gray-600">{endorsement.partner.specialty}</p>
                    <div className="mt-2 flex items-center space-x-4 text-sm">
                      <span>팔로워: {endorsement.partner.followers.toLocaleString()}명</span>
                      <span>평점: {endorsement.partner.rating}/5</span>
                      <span className={`px-2 py-1 rounded text-xs ${
                        endorsement.partner.tier === 'gold' ? 'bg-yellow-100 text-yellow-800' :
                        endorsement.partner.tier === 'silver' ? 'bg-gray-100 text-gray-800' :
                        'bg-orange-100 text-orange-800'
                      }`}>
                        {endorsement.partner.tier === 'gold' ? '골드' : 
                         endorsement.partner.tier === 'silver' ? '실버' : '브론즈'} 파트너
                      </span>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-medium">추천 수수료</div>
                    <div className="text-lg font-bold text-crowdfunding-primary">
                      {endorsement.commission}%
                    </div>
                  </div>
                </div>
                <div className="mt-3 p-3 bg-gray-50 rounded">
                  <h5 className="text-sm font-medium mb-1">추천 근거</h5>
                  <p className="text-sm text-gray-600">"{endorsement.reason}"</p>
                </div>
                <div className="mt-3 text-xs text-gray-500">
                  법적 준수: 단일계층 구조, 35% 미만 수수료, 투명한 공개
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default TransparencyHub