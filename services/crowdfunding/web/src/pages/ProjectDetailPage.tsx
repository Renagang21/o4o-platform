import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { differenceInDays } from 'date-fns'
import { Project } from '../types'
import TransparencyHub from '../components/crowdfunding/TransparencyHub'
import RewardSelector from '../components/crowdfunding/RewardSelector'
import ProjectUpdates from '../components/project/ProjectUpdates'
import ProjectComments from '../components/project/ProjectComments'

const ProjectDetailPage = () => {
  const { id } = useParams<{ id: string }>()
  const [project, setProject] = useState<Project | null>(null)
  const [activeTab, setActiveTab] = useState('story')
  const [showRewardModal, setShowRewardModal] = useState(false)

  // Mock project data
  useEffect(() => {
    const mockProject: Project = {
      id: id || '1',
      title: '혁신적인 스마트 워치 3.0',
      subtitle: '건강 관리의 새로운 패러다임',
      description: `혁신적인 스마트 워치 3.0은 최첨단 기술을 통해 사용자의 건강을 24시간 모니터링하고, 정확한 데이터를 제공하는 의료기기 등급 웨어러블 디바이스입니다.

특히 10년간의 연구 끝에 개발된 독자적인 알고리즘으로 심박수, 혈압, 수면 패턴을 의료용 수준의 정확도로 측정합니다.

배터리 수명은 7일로, 기존 제품 대비 3배 이상 길며, IPX8 방수 등급으로 어떤 환경에서도 안전하게 사용할 수 있습니다.

FDA 승인과 CE 마크를 획득하여 글로벌 시장에서도 인정받은 안전성과 효과를 보장합니다.`,
      category: '전자기기',
      creator: { id: '1', name: '박트러스트', email: '', role: 'creator' },
      targetAmount: 50000000,
      currentAmount: 76000000,
      backerCount: 1847,
      startDate: '2024-06-01',
      endDate: '2024-07-20',
      status: 'active',
      mainImage: 'https://via.placeholder.com/800x600',
      images: [
        'https://via.placeholder.com/800x600',
        'https://via.placeholder.com/800x600',
        'https://via.placeholder.com/800x600'
      ],
      rewards: [],
      updates: [],
      comments: [],
      transparencyScore: 94,
      partnerEndorsements: [
        {
          id: '1',
          partner: {
            id: '1',
            name: '이크라우드',
            specialty: '헬스케어 크라우드펀딩',
            followers: 125000,
            rating: 4.8,
            tier: 'gold'
          },
          reason: '10년 연구 끝에 나온 혁신적 기술. 임상 데이터가 매우 인상적입니다.',
          commission: 28,
          createdAt: '2024-06-15'
        },
        {
          id: '2',
          partner: {
            id: '2',
            name: '테크리뷰어 이크테크',
            specialty: 'IT 전문 리뷰',
            followers: 89000,
            rating: 4.6,
            tier: 'silver'
          },
          reason: '사용자 경험이 기존 제품과 차원이 다름',
          commission: 25,
          createdAt: '2024-06-18'
        }
      ]
    }
    setProject(mockProject)
  }, [id])

  if (!project) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-crowdfunding-primary mx-auto mb-4"></div>
          <p className="text-gray-600">로딩 중...</p>
        </div>
      </div>
    )
  }

  const progressPercentage = Math.min((project.currentAmount / project.targetAmount) * 100, 100)
  const daysLeft = differenceInDays(new Date(project.endDate), new Date())

  const tabs = [
    { id: 'story', label: '스토리' },
    { id: 'transparency', label: '투명성 허브' },
    { id: 'updates', label: '업데이트' },
    { id: 'comments', label: '댓글' }
  ]

  const handleRewardSelect = (reward: any, choice: 'product' | 'refund') => {
    console.log('리워드 선택:', reward, '보상 선택:', choice)
    setShowRewardModal(false)
    // 여기에서 결제 프로세스로 이동
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero Section */}
      <div className="bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Image Gallery */}
            <div className="space-y-4">
              <div className="aspect-w-16 aspect-h-12 rounded-lg overflow-hidden">
                <img
                  src={project.mainImage}
                  alt={project.title}
                  className="w-full h-96 object-cover"
                />
              </div>
              <div className="grid grid-cols-3 gap-2">
                {project.images.slice(0, 3).map((image, index) => (
                  <img
                    key={index}
                    src={image}
                    alt={`${project.title} ${index + 1}`}
                    className="w-full h-24 object-cover rounded cursor-pointer hover:opacity-75"
                  />
                ))}
              </div>
            </div>

            {/* Project Info */}
            <div className="space-y-6">
              <div>
                <div className="flex items-center space-x-2 mb-2">
                  <span className="inline-block px-3 py-1 text-sm font-semibold text-crowdfunding-primary bg-crowdfunding-primary/10 rounded-full">
                    {project.category}
                  </span>
                  {project.transparencyScore >= 90 && (
                    <span className="inline-block px-3 py-1 text-sm font-semibold text-green-700 bg-green-100 rounded-full">
                      투명도 {project.transparencyScore}%
                    </span>
                  )}
                </div>
                <h1 className="project-hero-title text-gray-900 mb-2">{project.title}</h1>
                <p className="project-subtitle">{project.subtitle}</p>
                <p className="text-sm text-gray-500 mt-2">by {project.creator.name}</p>
              </div>

              {/* Partner Endorsements */}
              {project.partnerEndorsements.length > 0 && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                  <div className="flex items-center space-x-2 mb-2">
                    <svg className="w-5 h-5 text-amber-500" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                    <span className="font-semibold text-amber-800">
                      {project.partnerEndorsements.length}명의 전문 파트너가 추천 중
                    </span>
                  </div>
                  <p className="text-sm text-amber-700">
                    "{project.partnerEndorsements[0].reason}"
                  </p>
                  <p className="text-xs text-amber-600 mt-1">
                    - {project.partnerEndorsements[0].partner.name}
                  </p>
                </div>
              )}

              {/* Funding Progress */}
              <div className="bg-gray-50 rounded-lg p-6">
                <div className="grid grid-cols-3 gap-4 mb-4">
                  <div>
                    <div className="funding-amount">₩{project.currentAmount.toLocaleString()}</div>
                    <div className="text-sm text-gray-600">달성 금액</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-gray-900">{project.backerCount}</div>
                    <div className="text-sm text-gray-600">후원자</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-gray-900">{daysLeft}</div>
                    <div className="text-sm text-gray-600">일 남음</div>
                  </div>
                </div>
                
                <div className="mb-4">
                  <div className="flex justify-between text-sm mb-2">
                    <span>달성률</span>
                    <span className="font-semibold">{progressPercentage.toFixed(0)}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-3">
                    <div
                      className="bg-crowdfunding-primary h-3 rounded-full transition-all duration-500"
                      style={{ width: `${progressPercentage}%` }}
                    />
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    목표: ₩{project.targetAmount.toLocaleString()}
                  </div>
                </div>

                <button
                  onClick={() => setShowRewardModal(true)}
                  className="w-full bg-crowdfunding-primary text-white py-3 px-6 rounded-lg font-semibold hover:bg-crowdfunding-primary/90 transition-colors text-lg"
                >
                  이 프로젝트 후원하기
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="-mb-px flex space-x-8">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${
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
      </div>

      {/* Tab Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'story' && (
          <div className="bg-white rounded-lg shadow-lg p-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">프로젝트 스토리</h2>
            <div className="prose prose-lg max-w-none">
              {project.description.split('\n').map((paragraph, index) => (
                <p key={index} className="mb-4 text-gray-700 leading-relaxed">
                  {paragraph}
                </p>
              ))}
            </div>

            {/* Key Features */}
            <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-blue-50 p-6 rounded-lg">
                <h3 className="text-lg font-semibold text-blue-900 mb-3">핵심 기능</h3>
                <ul className="space-y-2 text-blue-800">
                  <li className="flex items-center">
                    <span className="w-2 h-2 bg-blue-500 rounded-full mr-3"></span>
                    24시간 연속 건강 모니터링
                  </li>
                  <li className="flex items-center">
                    <span className="w-2 h-2 bg-blue-500 rounded-full mr-3"></span>
                    의료기기 등급 정확도
                  </li>
                  <li className="flex items-center">
                    <span className="w-2 h-2 bg-blue-500 rounded-full mr-3"></span>
                    7일 배터리 수명
                  </li>
                  <li className="flex items-center">
                    <span className="w-2 h-2 bg-blue-500 rounded-full mr-3"></span>
                    IPX8 방수 등급
                  </li>
                </ul>
              </div>
              <div className="bg-green-50 p-6 rounded-lg">
                <h3 className="text-lg font-semibold text-green-900 mb-3">인증 현황</h3>
                <ul className="space-y-2 text-green-800">
                  <li className="flex items-center">
                    <span className="w-2 h-2 bg-green-500 rounded-full mr-3"></span>
                    FDA 승인 완료
                  </li>
                  <li className="flex items-center">
                    <span className="w-2 h-2 bg-green-500 rounded-full mr-3"></span>
                    CE 마크 획득
                  </li>
                  <li className="flex items-center">
                    <span className="w-2 h-2 bg-green-500 rounded-full mr-3"></span>
                    ISO 13485 인증
                  </li>
                  <li className="flex items-center">
                    <span className="w-2 h-2 bg-green-500 rounded-full mr-3"></span>
                    국내 특허 등록
                  </li>
                </ul>
              </div>
            </div>
          </div>
        )}
        
        {activeTab === 'transparency' && <TransparencyHub project={project} />}
        {activeTab === 'updates' && <ProjectUpdates updates={project.updates} />}
        {activeTab === 'comments' && <ProjectComments comments={project.comments} />}
      </div>

      {/* Reward Modal */}
      {showRewardModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center p-6 border-b">
              <h2 className="text-2xl font-bold text-gray-900">리워드 선택</h2>
              <button
                onClick={() => setShowRewardModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-6">
              <RewardSelector rewards={project.rewards} onRewardSelect={handleRewardSelect} />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default ProjectDetailPage