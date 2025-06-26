import { useState } from 'react'
import { Link } from 'react-router-dom'
import { formatDistanceToNow } from 'date-fns'
import { ko } from 'date-fns/locale'
import { Backing, Project } from '../types'

const BackerDashboard = () => {
  const [activeTab, setActiveTab] = useState('active')

  // Mock data
  const mockBackings: (Backing & { project: Project })[] = [
    {
      id: '1',
      project: {
        id: '1',
        title: '혁신적인 스마트 워치 3.0',
        subtitle: '건강 관리의 새로운 패러다임',
        description: '',
        category: '전자기기',
        creator: { id: '1', name: '박트러스트', email: '', role: 'creator' },
        targetAmount: 50000000,
        currentAmount: 76000000,
        backerCount: 1847,
        startDate: '2024-06-01',
        endDate: '2024-07-20',
        status: 'active',
        mainImage: 'https://via.placeholder.com/400x300',
        images: [],
        rewards: [],
        updates: [],
        comments: [],
        transparencyScore: 94,
        partnerEndorsements: []
      },
      backer: { id: '1', name: '유후원', email: '', role: 'backer' },
      reward: {
        id: '1',
        title: '얼리버드 스페셜',
        description: '최초 100명 한정 특가',
        price: 79000,
        deliveryDate: '2024-10',
        limit: 100,
        claimed: 77,
        items: ['스마트 워치 1개', '전용 충전기', '실리콘 밴드 2개']
      },
      amount: 79000,
      backedAt: '2024-06-15T10:30:00Z',
      status: 'completed',
      rewardChoice: 'product'
    },
    {
      id: '2',
      project: {
        id: '2',
        title: '친환경 텐블러',
        subtitle: '지구를 위한 선택',
        description: '',
        category: '생활',
        creator: { id: '2', name: '김에코', email: '', role: 'creator' },
        targetAmount: 20000000,
        currentAmount: 22000000,
        backerCount: 523,
        startDate: '2024-05-15',
        endDate: '2024-06-30',
        status: 'success',
        mainImage: 'https://via.placeholder.com/400x300',
        images: [],
        rewards: [],
        updates: [],
        comments: [],
        transparencyScore: 87,
        partnerEndorsements: []
      },
      backer: { id: '1', name: '유후원', email: '', role: 'backer' },
      reward: {
        id: '2',
        title: '일반 후원',
        description: '친환경 텐블러 1개',
        price: 35000,
        deliveryDate: '2024-08',
        claimed: 400,
        items: ['친환경 텐블러 1개', '포장용 나무 상자']
      },
      amount: 35000,
      backedAt: '2024-05-20T14:20:00Z',
      status: 'completed',
      rewardChoice: 'refund'
    },
    {
      id: '3',
      project: {
        id: '3',
        title: 'AI 피부 분석기',
        subtitle: '맞춤형 피부 관리의 시작',
        description: '',
        category: '뷰티',
        creator: { id: '3', name: '이뷰티', email: '', role: 'creator' },
        targetAmount: 30000000,
        currentAmount: 42000000,
        backerCount: 892,
        startDate: '2024-06-05',
        endDate: '2024-07-15',
        status: 'active',
        mainImage: 'https://via.placeholder.com/400x300',
        images: [],
        rewards: [],
        updates: [],
        comments: [],
        transparencyScore: 91,
        partnerEndorsements: []
      },
      backer: { id: '1', name: '유후원', email: '', role: 'backer' },
      reward: {
        id: '3',
        title: '프리미엄 패키지',
        description: '추가 액세서리 포함',
        price: 149000,
        deliveryDate: '2024-09',
        claimed: 89,
        items: ['AI 피부 분석기', '전용 앱', '케어 세트']
      },
      amount: 149000,
      backedAt: '2024-06-10T16:45:00Z',
      status: 'completed'
    }
  ]

  const stats = {
    totalBacked: mockBackings.length,
    totalAmount: mockBackings.reduce((sum, backing) => sum + backing.amount, 0),
    activeProjects: mockBackings.filter(b => b.project.status === 'active').length,
    completedProjects: mockBackings.filter(b => b.project.status === 'success' || b.project.status === 'delivered').length
  }

  const filteredBackings = mockBackings.filter(backing => {
    switch (activeTab) {
      case 'active':
        return backing.project.status === 'active'
      case 'completed':
        return backing.project.status === 'success' || backing.project.status === 'delivered'
      case 'failed':
        return backing.project.status === 'failed'
      default:
        return true
    }
  })

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800'
      case 'success': return 'bg-blue-100 text-blue-800'
      case 'delivered': return 'bg-gray-100 text-gray-800'
      case 'failed': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case 'active': return '진행 중'
      case 'success': return '성공'
      case 'delivered': return '배송 완료'
      case 'failed': return '실패'
      default: return status
    }
  }

  const getProgressText = (project: Project) => {
    const progress = (project.currentAmount / project.targetAmount) * 100
    if (project.status === 'active') {
      return `${progress.toFixed(0)}% 달성`
    } else if (project.status === 'success') {
      return '펀딩 성공'
    } else if (project.status === 'delivered') {
      return '배송 완료'
    }
    return '완료'
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <h1 className="text-3xl font-bold text-gray-900">내 후원 현황</h1>
          <p className="mt-2 text-gray-600">
            후원한 프로젝트들의 진행 상황을 확인하고 업데이트를 받아보세요.
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-2xl font-bold text-gray-900">{stats.totalBacked}</div>
            <div className="text-sm text-gray-600">총 후원 프로젝트</div>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-2xl font-bold text-crowdfunding-primary">
              ₩{stats.totalAmount.toLocaleString()}
            </div>
            <div className="text-sm text-gray-600">총 후원 금액</div>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-2xl font-bold text-green-600">{stats.activeProjects}</div>
            <div className="text-sm text-gray-600">진행 중인 프로젝트</div>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-2xl font-bold text-blue-600">{stats.completedProjects}</div>
            <div className="text-sm text-gray-600">완료된 프로젝트</div>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-lg shadow">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8 px-6">
              {[
                { id: 'all', label: '전체', count: mockBackings.length },
                { id: 'active', label: '진행 중', count: stats.activeProjects },
                { id: 'completed', label: '완료', count: stats.completedProjects },
                { id: 'failed', label: '실패', count: 0 }
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${
                    activeTab === tab.id
                      ? 'border-crowdfunding-primary text-crowdfunding-primary'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  {tab.label} ({tab.count})
                </button>
              ))}
            </nav>
          </div>

          {/* Project List */}
          <div className="p-6">
            {filteredBackings.length > 0 ? (
              <div className="space-y-6">
                {filteredBackings.map((backing) => (
                  <div key={backing.id} className="border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow">
                    <div className="flex items-start space-x-4">
                      {/* Project Image */}
                      <Link to={`/projects/${backing.project.id}`} className="flex-shrink-0">
                        <img
                          src={backing.project.mainImage}
                          alt={backing.project.title}
                          className="w-20 h-20 object-cover rounded-lg"
                        />
                      </Link>

                      {/* Project Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <Link
                              to={`/projects/${backing.project.id}`}
                              className="text-lg font-semibold text-gray-900 hover:text-crowdfunding-primary"
                            >
                              {backing.project.title}
                            </Link>
                            <p className="text-sm text-gray-600 mt-1">{backing.project.subtitle}</p>
                            <p className="text-xs text-gray-500 mt-1">by {backing.project.creator.name}</p>
                          </div>
                          <div className="flex-shrink-0 ml-4">
                            <span className={`inline-block px-2 py-1 text-xs font-medium rounded ${getStatusColor(backing.project.status)}`}>
                              {getStatusText(backing.project.status)}
                            </span>
                          </div>
                        </div>

                        {/* Backing Details */}
                        <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                          <div>
                            <span className="text-gray-500">후원 리워드:</span>
                            <div className="font-medium">{backing.reward.title}</div>
                            <div className="text-crowdfunding-primary font-semibold">
                              ₩{backing.amount.toLocaleString()}
                            </div>
                          </div>
                          <div>
                            <span className="text-gray-500">후원일:</span>
                            <div className="font-medium">
                              {formatDistanceToNow(new Date(backing.backedAt), { addSuffix: true, locale: ko })}
                            </div>
                          </div>
                          <div>
                            <span className="text-gray-500">진행 상황:</span>
                            <div className="font-medium">{getProgressText(backing.project)}</div>
                          </div>
                        </div>

                        {/* Reward Choice */}
                        {backing.rewardChoice && (
                          <div className="mt-3 p-3 bg-blue-50 rounded-lg">
                            <div className="text-sm">
                              <span className="text-blue-800 font-medium">보상 선택:</span>
                              <span className="ml-2">
                                {backing.rewardChoice === 'product' ? '📦 제품 수령' : '💰 금액 환급'}
                              </span>
                              {backing.rewardChoice === 'refund' && (
                                <span className="text-blue-600 ml-2">
                                  (예상 환급액: ₩{(backing.amount * 1.1).toLocaleString()})
                                </span>
                              )}
                            </div>
                          </div>
                        )}

                        {/* Action Buttons */}
                        <div className="mt-4 flex space-x-3">
                          <Link
                            to={`/projects/${backing.project.id}`}
                            className="text-sm text-crowdfunding-primary hover:text-crowdfunding-primary/80"
                          >
                            프로젝트 보기 →
                          </Link>
                          {backing.project.status === 'active' && (
                            <button className="text-sm text-gray-600 hover:text-gray-800">
                              알림 설정
                            </button>
                          )}
                          {backing.project.status === 'success' && !backing.rewardChoice && (
                            <button className="text-sm text-green-600 hover:text-green-800 font-medium">
                              보상 선택하기
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <div className="text-gray-500">
                  {activeTab === 'active' && '진행 중인 후원 프로젝트가 없습니다.'}
                  {activeTab === 'completed' && '완료된 후원 프로젝트가 없습니다.'}
                  {activeTab === 'failed' && '실패한 후원 프로젝트가 없습니다.'}
                  {activeTab === 'all' && '아직 후원한 프로젝트가 없습니다.'}
                </div>
                <Link
                  to="/projects"
                  className="mt-4 inline-block text-crowdfunding-primary hover:text-crowdfunding-primary/80"
                >
                  흔미로운 프로젝트 찾아보기 →
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default BackerDashboard