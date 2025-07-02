import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Project } from '../types'

const CreatorDashboard = () => {
  const [activeTab, setActiveTab] = useState('overview')

  // Mock data
  const mockProjects: Project[] = [
    {
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
          reason: '10년 연구 끝에 나온 혁신적 기술',
          commission: 28,
          createdAt: '2024-06-15'
        }
      ]
    },
    {
      id: '2',
      title: '친환경 텐블러 프로 에디션',
      subtitle: '환경을 생각하는 선택',
      description: '',
      category: '생활',
      creator: { id: '1', name: '박트러스트', email: '', role: 'creator' },
      targetAmount: 30000000,
      currentAmount: 35000000,
      backerCount: 892,
      startDate: '2024-04-01',
      endDate: '2024-05-31',
      status: 'success',
      mainImage: 'https://via.placeholder.com/400x300',
      images: [],
      rewards: [],
      updates: [],
      comments: [],
      transparencyScore: 89,
      partnerEndorsements: []
    }
  ]

  const stats = {
    totalProjects: mockProjects.length,
    totalRaised: mockProjects.reduce((sum, p) => sum + p.currentAmount, 0),
    totalBackers: mockProjects.reduce((sum, p) => sum + p.backerCount, 0),
    activeProjects: mockProjects.filter(p => p.status === 'active').length,
    successRate: Math.round((mockProjects.filter(p => p.status === 'success').length / mockProjects.length) * 100)
  }

  const recentActivities = [
    {
      id: '1',
      type: 'backing',
      message: '신규 후원자 15명이 오늘 가입했습니다',
      time: '2시간 전',
      project: '스마트 워치 3.0'
    },
    {
      id: '2',
      type: 'milestone',
      message: '목표 금액 150% 달성!',
      time: '6시간 전',
      project: '스마트 워치 3.0'
    },
    {
      id: '3',
      type: 'partner',
      message: '새로운 파트너 추천이 등록되었습니다',
      time: '1일 전',
      project: '스마트 워치 3.0'
    },
    {
      id: '4',
      type: 'update',
      message: '프로젝트 업데이트에 32개의 새 댓글이 달렸습니다',
      time: '2일 전',
      project: '스마트 워치 3.0'
    }
  ]

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'backing':
        return <span className="text-green-600">👥</span>
      case 'milestone':
        return <span className="text-yellow-600">🏆</span>
      case 'partner':
        return <span className="text-blue-600">🤝</span>
      case 'update':
        return <span className="text-purple-600">💬</span>
      default:
        return <span className="text-gray-600">📊</span>
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">창작자 대시보드</h1>
              <p className="mt-2 text-gray-600">
                프로젝트 진행 상황을 확인하고 후원자들과 소통하세요.
              </p>
            </div>
            <Link
              to="/create"
              className="bg-crowdfunding-primary text-white px-6 py-3 rounded-lg font-semibold hover:bg-crowdfunding-primary/90 transition-colors"
            >
              새 프로젝트 만들기
            </Link>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-2xl font-bold text-gray-900">{stats.totalProjects}</div>
            <div className="text-sm text-gray-600">총 프로젝트</div>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-2xl font-bold text-crowdfunding-primary">
              ₩{(stats.totalRaised / 100000000).toFixed(1)}억
            </div>
            <div className="text-sm text-gray-600">총 모금 금액</div>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-2xl font-bold text-green-600">{stats.totalBackers.toLocaleString()}</div>
            <div className="text-sm text-gray-600">총 후원자</div>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-2xl font-bold text-blue-600">{stats.activeProjects}</div>
            <div className="text-sm text-gray-600">진행 중</div>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-2xl font-bold text-yellow-600">{stats.successRate}%</div>
            <div className="text-sm text-gray-600">성공률</div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Projects */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow">
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-xl font-semibold text-gray-900">내 프로젝트</h2>
              </div>
              <div className="p-6">
                <div className="space-y-6">
                  {mockProjects.map((project) => {
                    const progressPercentage = Math.min((project.currentAmount / project.targetAmount) * 100, 100)
                    
                    return (
                      <div key={project.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                        <div className="flex items-start space-x-4">
                          <img
                            src={project.mainImage}
                            alt={project.title}
                            className="w-16 h-16 object-cover rounded-lg"
                          />
                          <div className="flex-1">
                            <div className="flex items-start justify-between">
                              <div>
                                <Link
                                  to={`/projects/${project.id}`}
                                  className="text-lg font-semibold text-gray-900 hover:text-crowdfunding-primary"
                                >
                                  {project.title}
                                </Link>
                                <p className="text-sm text-gray-600">{project.subtitle}</p>
                              </div>
                              <span className={`inline-block px-2 py-1 text-xs font-medium rounded ${
                                project.status === 'active' ? 'bg-green-100 text-green-800' :
                                project.status === 'success' ? 'bg-blue-100 text-blue-800' :
                                'bg-gray-100 text-gray-800'
                              }`}>
                                {project.status === 'active' ? '진행 중' :
                                 project.status === 'success' ? '성공' : project.status}
                              </span>
                            </div>
                            
                            <div className="mt-3 grid grid-cols-3 gap-4 text-sm">
                              <div>
                                <span className="text-gray-500">달성률:</span>
                                <div className="font-semibold text-crowdfunding-primary">
                                  {progressPercentage.toFixed(0)}%
                                </div>
                              </div>
                              <div>
                                <span className="text-gray-500">후원자:</span>
                                <div className="font-semibold">{project.backerCount}명</div>
                              </div>
                              <div>
                                <span className="text-gray-500">모금액:</span>
                                <div className="font-semibold">
                                  ₩{project.currentAmount.toLocaleString()}
                                </div>
                              </div>
                            </div>
                            
                            {project.partnerEndorsements.length > 0 && (
                              <div className="mt-2 text-sm text-amber-600">
                                🤝 {project.partnerEndorsements.length}명의 파트너 추천
                              </div>
                            )}
                            
                            <div className="mt-3 flex space-x-3">
                              <Link
                                to={`/projects/${project.id}`}
                                className="text-sm text-crowdfunding-primary hover:text-crowdfunding-primary/80"
                              >
                                프로젝트 보기
                              </Link>
                              <button className="text-sm text-gray-600 hover:text-gray-800">
                                업데이트 작성
                              </button>
                              <button className="text-sm text-gray-600 hover:text-gray-800">
                                통계 보기
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Recent Activities */}
            <div className="bg-white rounded-lg shadow">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900">최근 활동</h3>
              </div>
              <div className="p-6">
                <div className="space-y-4">
                  {recentActivities.map((activity) => (
                    <div key={activity.id} className="flex items-start space-x-3">
                      <div className="flex-shrink-0">
                        {getActivityIcon(activity.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-gray-900">{activity.message}</p>
                        <p className="text-xs text-gray-500">
                          {activity.project} · {activity.time}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="bg-white rounded-lg shadow">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900">빠른 작업</h3>
              </div>
              <div className="p-6">
                <div className="space-y-3">
                  <button className="w-full text-left p-3 rounded-lg hover:bg-gray-50 transition-colors">
                    <div className="font-medium text-gray-900">후원자에게 업데이트 전송</div>
                    <div className="text-sm text-gray-600">진행 상황을 공유하세요</div>
                  </button>
                  <button className="w-full text-left p-3 rounded-lg hover:bg-gray-50 transition-colors">
                    <div className="font-medium text-gray-900">투명성 데이터 업데이트</div>
                    <div className="text-sm text-gray-600">신뢰도를 높이세요</div>
                  </button>
                  <button className="w-full text-left p-3 rounded-lg hover:bg-gray-50 transition-colors">
                    <div className="font-medium text-gray-900">파트너 추천 요청</div>
                    <div className="text-sm text-gray-600">전문가 버셔닝 요청</div>
                  </button>
                  <button className="w-full text-left p-3 rounded-lg hover:bg-gray-50 transition-colors">
                    <div className="font-medium text-gray-900">성과 분석 보기</div>
                    <div className="text-sm text-gray-600">상세 통계 확인</div>
                  </button>
                </div>
              </div>
            </div>

            {/* Tips */}
            <div className="bg-blue-50 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-blue-900 mb-3">팁 & 가이드</h3>
              <div className="space-y-2 text-sm text-blue-800">
                <p>• 정기적인 업데이트로 후원자 참여도를 높이세요</p>
                <p>• 투명성 허브를 활용해 신뢰도를 구축하세요</p>
                <p>• 파트너 추천으로 더 많은 후원을 유치하세요</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default CreatorDashboard