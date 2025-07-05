import { Link } from 'react-router-dom'
import { useState, useEffect } from 'react'
import ProjectCard from '../components/ProjectCard'
import { Project } from '../types'

// Mock data - 나중에 API로 대체
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
    title: '친환경 텐블러',
    subtitle: '지구를 위한 선택',
    description: '',
    category: '생활',
    creator: { id: '2', name: '김에코', email: '', role: 'creator' },
    targetAmount: 20000000,
    currentAmount: 15000000,
    backerCount: 523,
    startDate: '2024-06-10',
    endDate: '2024-07-25',
    status: 'active',
    mainImage: 'https://via.placeholder.com/400x300',
    images: [],
    rewards: [],
    updates: [],
    comments: [],
    transparencyScore: 87,
    partnerEndorsements: []
  },
  {
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
  }
]

const HomePage = () => {
  const [featuredProject, setFeaturedProject] = useState<Project | null>(null)

  useEffect(() => {
    // 실제로는 API에서 featured project를 가져오겠지만 지금은 mock data 사용
    setFeaturedProject(mockProjects[0])
  }, [])

  return (
    <div>
      {/* Hero Section */}
      <section className="bg-gradient-to-r from-crowdfunding-primary to-crowdfunding-accent text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
          <div className="text-center">
            <h1 className="text-5xl font-extrabold mb-6">
              전문가와 함께하는 신뢰 기반 크라우드펀딩
            </h1>
            <p className="text-xl mb-8 text-white/90">
              투명한 정보 공개와 전문가 검증으로 함께 만들어가는 프로젝트
            </p>
            <div className="flex justify-center space-x-4">
              <Link
                to="/projects"
                className="bg-white text-crowdfunding-primary px-8 py-3 rounded-lg font-semibold hover:bg-gray-100 transition-colors"
              >
                프로젝트 둘러보기
              </Link>
              <Link
                to="/create"
                className="bg-transparent border-2 border-white text-white px-8 py-3 rounded-lg font-semibold hover:bg-white hover:text-crowdfunding-primary transition-colors"
              >
                프로젝트 시작하기
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Featured Project */}
      {featuredProject && (
        <section className="py-16 bg-gray-100">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="text-3xl font-bold text-gray-900 mb-8">주목할 프로젝트</h2>
            <div className="bg-white rounded-lg shadow-lg overflow-hidden">
              <div className="md:flex">
                <div className="md:w-1/2">
                  <img
                    src={featuredProject.mainImage}
                    alt={featuredProject.title}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="md:w-1/2 p-8">
                  <div className="mb-4">
                    <span className="inline-block px-3 py-1 text-sm font-semibold text-crowdfunding-primary bg-crowdfunding-primary/10 rounded-full">
                      {featuredProject.category}
                    </span>
                  </div>
                  <h3 className="text-2xl font-bold text-gray-900 mb-2">
                    {featuredProject.title}
                  </h3>
                  <p className="text-gray-600 mb-6">{featuredProject.subtitle}</p>
                  
                  <div className="mb-6">
                    <div className="flex justify-between items-end mb-2">
                      <div>
                        <p className="text-3xl font-bold text-crowdfunding-primary">
                          {((featuredProject.currentAmount / featuredProject.targetAmount) * 100).toFixed(0)}%
                        </p>
                        <p className="text-sm text-gray-600">
                          ₩{featuredProject.currentAmount.toLocaleString()} 달성
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-semibold">{featuredProject.backerCount}명</p>
                        <p className="text-sm text-gray-600">후원자</p>
                      </div>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-3">
                      <div
                        className="bg-crowdfunding-primary h-3 rounded-full"
                        style={{ width: `${Math.min((featuredProject.currentAmount / featuredProject.targetAmount) * 100, 100)}%` }}
                      />
                    </div>
                  </div>

                  {featuredProject.partnerEndorsements.length > 0 && (
                    <div className="mb-6 p-4 bg-amber-50 rounded-lg">
                      <p className="text-sm font-semibold text-amber-800 mb-1">
                        🤝 {featuredProject.partnerEndorsements.length}명의 전문 파트너가 추천 중
                      </p>
                      <p className="text-sm text-amber-700">
                        "{featuredProject.partnerEndorsements[0].reason}"
                      </p>
                    </div>
                  )}

                  <Link
                    to={`/projects/${featuredProject.id}`}
                    className="block w-full text-center bg-crowdfunding-primary text-white py-3 rounded-lg font-semibold hover:bg-crowdfunding-primary/90 transition-colors"
                  >
                    프로젝트 보기
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Popular Projects */}
      <section className="py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center mb-8">
            <h2 className="text-3xl font-bold text-gray-900">인기 프로젝트</h2>
            <Link to="/projects" className="text-crowdfunding-primary hover:underline">
              모두 보기 →
            </Link>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {mockProjects.map((project) => (
              <ProjectCard key={project.id} project={project} />
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-16 bg-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-gray-900 text-center mb-12">
            어떻게 진행되나요?
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-20 h-20 bg-crowdfunding-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-10 h-10 text-crowdfunding-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold mb-2">프로젝트 등록</h3>
              <p className="text-gray-600">
                창작자가 프로젝트를 등록하고
                <br />전문가 검증을 받습니다
              </p>
            </div>
            <div className="text-center">
              <div className="w-20 h-20 bg-crowdfunding-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-10 h-10 text-crowdfunding-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold mb-2">후원 및 협업</h3>
              <p className="text-gray-600">
                후원자와 전문가가 함께
                <br />제품 개발에 참여합니다
              </p>
            </div>
            <div className="text-center">
              <div className="w-20 h-20 bg-crowdfunding-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-10 h-10 text-crowdfunding-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold mb-2">제품 수령/환급</h3>
              <p className="text-gray-600">
                펀딩 성공 시 제품 수령 또는
                <br />금액 환급을 선택합니다
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 bg-crowdfunding-secondary text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold mb-4">
            아이디어를 현실로 만들어보세요
          </h2>
          <p className="text-xl mb-8 text-white/90">
            전문가와 함께 하는 투명한 크라우드펀딩
          </p>
          <Link
            to="/create"
            className="inline-block bg-white text-crowdfunding-secondary px-8 py-3 rounded-lg font-semibold hover:bg-gray-100 transition-colors"
          >
            프로젝트 시작하기
          </Link>
        </div>
      </section>
    </div>
  )
}

export default HomePage