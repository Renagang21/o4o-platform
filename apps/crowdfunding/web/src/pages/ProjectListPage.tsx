import { useState } from 'react'
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
  },
  {
    id: '4',
    title: '스마트 요가 매트',
    subtitle: '요가 자세 교정과 측정',
    description: '',
    category: '피트니스',
    creator: { id: '4', name: '유요가', email: '', role: 'creator' },
    targetAmount: 25000000,
    currentAmount: 18000000,
    backerCount: 432,
    startDate: '2024-06-12',
    endDate: '2024-07-30',
    status: 'active',
    mainImage: 'https://via.placeholder.com/400x300',
    images: [],
    rewards: [],
    updates: [],
    comments: [],
    transparencyScore: 88,
    partnerEndorsements: []
  }
]

const categories = ['전체', '전자기기', '생활', '뷰티', '피트니스', '헬스케어', '교육']
const sortOptions = [
  { value: 'popular', label: '인기순' },
  { value: 'recent', label: '최신순' },
  { value: 'ending', label: '마감임박' },
  { value: 'funded', label: '펀딩금액순' }
]

const ProjectListPage = () => {
  const [selectedCategory, setSelectedCategory] = useState('전체')
  const [selectedSort, setSelectedSort] = useState('popular')
  const [showOnlyActive, setShowOnlyActive] = useState(true)
  const [showPartnerEndorsed, setShowPartnerEndorsed] = useState(false)

  // 필터링된 프로젝트
  const filteredProjects = mockProjects.filter(project => {
    if (selectedCategory !== '전체' && project.category !== selectedCategory) return false
    if (showOnlyActive && project.status !== 'active') return false
    if (showPartnerEndorsed && project.partnerEndorsements.length === 0) return false
    return true
  })

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <h1 className="text-3xl font-bold text-gray-900">프로젝트 둘러보기</h1>
          <p className="mt-2 text-gray-600">
            투명한 정보 공개와 전문가 검증을 통해 신뢰할 수 있는 프로젝트를 발견하세요
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="bg-white rounded-lg shadow-sm p-6">
          {/* Category Tabs */}
          <div className="flex flex-wrap gap-2 mb-6">
            {categories.map(category => (
              <button
                key={category}
                onClick={() => setSelectedCategory(category)}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                  selectedCategory === category
                    ? 'bg-crowdfunding-primary text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {category}
              </button>
            ))}
          </div>

          {/* Sort and Filters */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div className="flex flex-wrap gap-4">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={showOnlyActive}
                  onChange={(e) => setShowOnlyActive(e.target.checked)}
                  className="rounded border-gray-300 text-crowdfunding-primary focus:ring-crowdfunding-primary"
                />
                <span className="ml-2 text-sm text-gray-700">진행 중인 프로젝트만</span>
              </label>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={showPartnerEndorsed}
                  onChange={(e) => setShowPartnerEndorsed(e.target.checked)}
                  className="rounded border-gray-300 text-crowdfunding-primary focus:ring-crowdfunding-primary"
                />
                <span className="ml-2 text-sm text-gray-700">파트너 추천 프로젝트</span>
              </label>
            </div>
            <select
              value={selectedSort}
              onChange={(e) => setSelectedSort(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-crowdfunding-primary"
            >
              {sortOptions.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Project Grid */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredProjects.map(project => (
            <ProjectCard key={project.id} project={project} />
          ))}
        </div>

        {filteredProjects.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500">해당하는 프로젝트가 없습니다.</p>
          </div>
        )}
      </div>
    </div>
  )
}

export default ProjectListPage