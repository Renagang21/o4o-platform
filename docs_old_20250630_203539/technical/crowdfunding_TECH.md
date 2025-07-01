# 💰 Crowdfunding 서비스 기술 문서

> **서비스 이름**: Crowdfunding (크라우드펀딩)  
> **포트**: TBD  
> **상태**: 🟡 프론트엔드 부분 구현, ❌ 백엔드 미구현

---

## 📋 서비스 개요

O4O Platform의 **투명한 크라우드펀딩 플랫폼**으로, 전문가 검증과 파트너 추천을 통한 신뢰성 높은 펀딩 서비스를 제공합니다.

### 🎯 핵심 혁신
- **투명성 점수 시스템**: 프로젝트별 신뢰도 점수 (0-100%)
- **파트너 추천 시스템**: 전문가 파트너의 프로젝트 추천
- **보상 선택권**: 후원자가 제품 수령 또는 환불 선택 가능
- **계층별 파트너 시스템**: Gold/Silver/Bronze 파트너 등급

---

## 🏗️ 아키텍처

### 서비스 구조

```
services/crowdfunding/
├── admin/                     # 관리자 패널 (플레이스홀더)
├── api/                      # 백엔드 API (플레이스홀더)
└── web/                      # React 프론트엔드
    ├── src/
    │   ├── App.tsx           # 메인 라우터
    │   ├── api/              # API 계층
    │   ├── components/
    │   │   ├── Layout.tsx            # 메인 레이아웃
    │   │   ├── ProjectCard.tsx       # 프로젝트 카드
    │   │   ├── crowdfunding/         # 크라우드펀딩 전용
    │   │   │   ├── ProjectForm.tsx
    │   │   │   ├── RewardSelector.tsx
    │   │   │   └── TransparencyHub.tsx
    │   │   └── project/
    │   │       ├── ProjectComments.tsx
    │   │       └── ProjectUpdates.tsx
    │   ├── hooks/            # 커스텀 훅
    │   ├── pages/
    │   │   ├── HomePage.tsx          # 랜딩 페이지
    │   │   ├── ProjectListPage.tsx   # 프로젝트 목록
    │   │   ├── ProjectDetailPage.tsx # 프로젝트 상세
    │   │   ├── CreateProjectPage.tsx # 프로젝트 생성
    │   │   ├── BackerDashboard.tsx   # 후원자 대시보드
    │   │   └── CreatorDashboard.tsx  # 창작자 대시보드
    │   ├── store/            # 상태 관리
    │   ├── types/
    │   │   └── index.ts      # TypeScript 정의
    │   └── utils/            # 유틸리티
    └── package.json
```

### 기술 스택

| 구분 | 기술 | 버전 |
|------|------|------|
| **Frontend** | React + TypeScript | 18.x |
| **Build Tool** | Vite | 5.0.7 |
| **Styling** | TailwindCSS | 3.3.6 |
| **State Management** | Zustand | 4.4.7 |
| **Data Fetching** | TanStack React Query + Axios | 5.12.2 + 1.6.2 |
| **Date Handling** | date-fns | 2.30.0 |
| **Notifications** | react-hot-toast | 2.4.1 |

---

## 🎯 비즈니스 로직

### 핵심 데이터 모델

```typescript
// 🎯 프로젝트 엔티티
interface Project {
  id: string
  title: string
  subtitle: string
  description: string
  category: string
  creator: User
  
  // 펀딩 정보
  targetAmount: number
  currentAmount: number
  backerCount: number
  startDate: string
  endDate: string
  
  // 상태 관리
  status: 'preparing' | 'active' | 'success' | 'failed' | 'delivered'
  
  // 미디어
  mainImage: string
  images: string[]
  video?: string
  
  // 펀딩 구성요소
  rewards: Reward[]
  updates: Update[]
  comments: Comment[]
  
  // 🔥 혁신 기능
  transparencyScore: number           // 투명성 점수 (0-100%)
  partnerEndorsements: PartnerEndorsement[]  // 파트너 추천
}

// 🎁 보상 시스템
interface Reward {
  id: string
  title: string
  description: string
  price: number
  deliveryDate: string
  limit?: number
  claimed: number
  items: string[]
  shippingInfo?: string
  
  // 🔥 독특한 기능: 보상 선택권
  allowsRefund: boolean     // 환불 옵션 허용 여부
  refundRate: number        // 환불 시 수수료율
}

// 🤝 파트너 추천 시스템
interface PartnerEndorsement {
  id: string
  partner: Partner
  reason: string            // 추천 이유
  commission: number        // 투명하게 공개되는 수수료
  createdAt: string
  tier: 'gold' | 'silver' | 'bronze'
}

// 👤 후원 정보
interface Backing {
  id: string
  projectId: string
  backerId: string
  rewardId: string
  amount: number
  
  // 🔥 혁신 기능: 후원자 선택권
  rewardChoice: 'product' | 'refund'  // 제품 수령 vs 환불
  choiceDeadline: string              // 선택 마감일
  
  status: 'pending' | 'confirmed' | 'delivered' | 'refunded'
  createdAt: string
}
```

### 투명성 점수 알고리즘

```typescript
// 📊 투명성 점수 계산
interface TransparencyScore {
  // 기본 점수 (40점)
  creatorVerification: number    // 창작자 인증 (10점)
  projectDocumentation: number   // 프로젝트 문서화 (15점)
  budgetBreakdown: number        // 예산 내역 공개 (15점)
  
  // 신뢰성 점수 (30점)
  partnerEndorsements: number    // 파트너 추천 (15점)
  expertValidation: number       // 전문가 검증 (15점)
  
  // 투명성 점수 (30점)
  updateFrequency: number        // 업데이트 빈도 (10점)
  financialTransparency: number  // 재정 투명성 (10점)
  communicationQuality: number   // 소통 품질 (10점)
  
  totalScore: number             // 총점 (0-100%)
}

// 점수 계산 로직
const calculateTransparencyScore = (project: Project): number => {
  const baseScore = 
    (project.creator.isVerified ? 10 : 0) +
    (project.documentation?.length > 0 ? 15 : 0) +
    (project.budgetBreakdown ? 15 : 0)
  
  const trustScore =
    (project.partnerEndorsements.length * 3) + // 파트너당 3점
    (project.expertValidations.length * 5)     // 전문가당 5점
  
  const transparencyScore =
    Math.min(project.updates.length * 2, 10) +  // 업데이트당 2점 (최대 10점)
    (project.financialReports ? 10 : 0) +
    Math.min(project.responseRate * 10, 10)     // 응답률 기반 (최대 10점)
  
  return Math.min(baseScore + trustScore + transparencyScore, 100)
}
```

### 보상 선택 시스템

```typescript
// 🎁 후원자 보상 선택 프로세스
interface RewardChoice {
  // 선택 가능한 옵션
  options: {
    product: {
      items: string[]
      estimatedDelivery: string
      shippingCost: number
    }
    refund: {
      amount: number
      commission: number      // 파트너 수수료 (투명 공개)
      processingFee: number   // 처리 수수료
      netAmount: number       // 실제 환불액
    }
  }
  
  // 선택 프로세스
  choiceDeadline: string
  hasChosen: boolean
  chosenOption: 'product' | 'refund' | null
  choiceDate?: string
}

// 선택 로직
const processRewardChoice = async (backing: Backing, choice: 'product' | 'refund') => {
  if (choice === 'refund') {
    // 환불 처리
    const refundAmount = calculateRefundAmount(backing)
    await processRefund(backing.backerId, refundAmount)
    
    // 파트너 수수료 지급
    await distributePartnerCommission(backing.projectId, backing.amount)
  } else {
    // 제품 배송 처리
    await scheduleProductDelivery(backing)
  }
  
  // 선택 기록
  await updateBackingChoice(backing.id, choice)
}
```

---

## 🎨 프론트엔드 구조

### 핵심 컴포넌트

```typescript
// 🏠 HomePage 컴포넌트
const HomePage = () => {
  return (
    <Layout>
      <HeroSection />
      <FeaturedProjects />
      <TransparencyFeatures />
      <PartnerShowcase />
      <SuccessStories />
    </Layout>
  )
}

// 📋 ProjectCard 컴포넌트
interface ProjectCardProps {
  project: Project
  showTransparencyScore?: boolean
  showPartnerEndorsements?: boolean
}

const ProjectCard = ({ project, showTransparencyScore = true }: ProjectCardProps) => {
  const fundingProgress = (project.currentAmount / project.targetAmount) * 100
  
  return (
    <div className="project-card">
      <ProjectImage src={project.mainImage} alt={project.title} />
      
      <div className="project-info">
        <h3>{project.title}</h3>
        <p>{project.subtitle}</p>
        
        {/* 펀딩 진행률 */}
        <FundingProgress 
          current={project.currentAmount} 
          target={project.targetAmount}
          percentage={fundingProgress}
        />
        
        {/* 투명성 점수 */}
        {showTransparencyScore && (
          <TransparencyScore score={project.transparencyScore} />
        )}
        
        {/* 파트너 추천 */}
        {project.partnerEndorsements.length > 0 && (
          <PartnerEndorsements endorsements={project.partnerEndorsements} />
        )}
        
        <ProjectActions project={project} />
      </div>
    </div>
  )
}

// 🎯 TransparencyHub 컴포넌트
const TransparencyHub = ({ project }: { project: Project }) => {
  return (
    <div className="transparency-hub">
      <TransparencyScoreDisplay score={project.transparencyScore} />
      
      <div className="transparency-details">
        <ScoreBreakdown 
          creatorVerification={project.creator.isVerified}
          documentation={project.documentation}
          budgetBreakdown={project.budgetBreakdown}
          partnerEndorsements={project.partnerEndorsements}
        />
        
        <PartnerCommissionDisclosure 
          endorsements={project.partnerEndorsements}
        />
        
        <ExpertValidations 
          validations={project.expertValidations}
        />
      </div>
    </div>
  )
}

// 🎁 RewardSelector 컴포넌트
const RewardSelector = ({ project, onRewardSelect }: RewardSelectorProps) => {
  const [selectedReward, setSelectedReward] = useState<Reward | null>(null)
  const [rewardChoice, setRewardChoice] = useState<'product' | 'refund'>('product')
  
  return (
    <div className="reward-selector">
      <h3>보상 선택</h3>
      
      <div className="rewards-list">
        {project.rewards.map(reward => (
          <RewardCard 
            key={reward.id}
            reward={reward}
            isSelected={selectedReward?.id === reward.id}
            onSelect={() => setSelectedReward(reward)}
          />
        ))}
      </div>
      
      {selectedReward && (
        <RewardChoiceSection>
          <h4>보상 수령 방식 선택</h4>
          
          <ChoiceOption
            type="product"
            selected={rewardChoice === 'product'}
            onSelect={() => setRewardChoice('product')}
            title="제품 수령"
            description="펀딩 성공 시 실제 제품을 받습니다"
            details={selectedReward.items}
          />
          
          <ChoiceOption
            type="refund"
            selected={rewardChoice === 'refund'}
            onSelect={() => setRewardChoice('refund')}
            title="환불 + 수수료"
            description="펀딩 성공 시 환불 + 파트너 수수료를 받습니다"
            details={calculateRefundDetails(selectedReward)}
          />
          
          <BackingButton 
            reward={selectedReward}
            choice={rewardChoice}
            onBack={onRewardSelect}
          />
        </RewardChoiceSection>
      )}
    </div>
  )
}
```

### 상태 관리 (Zustand)

```typescript
// 🏪 크라우드펀딩 스토어
interface CrowdfundingStore {
  // 프로젝트 관리
  projects: Project[]
  currentProject: Project | null
  filters: ProjectFilters
  
  // 사용자 데이터
  userBackings: Backing[]
  userProjects: Project[] // 창작자가 만든 프로젝트
  
  // 파트너 데이터
  partnerEndorsements: PartnerEndorsement[]
  
  // 액션들
  fetchProjects: () => Promise<void>
  fetchProject: (id: string) => Promise<void>
  createProject: (projectData: CreateProjectRequest) => Promise<void>
  backProject: (projectId: string, rewardId: string, choice: 'product' | 'refund') => Promise<void>
  updateRewardChoice: (backingId: string, choice: 'product' | 'refund') => Promise<void>
  
  // 파트너 액션
  endorseProject: (projectId: string, reason: string) => Promise<void>
  
  // 투명성 관련
  calculateTransparencyScore: (project: Project) => number
}

const useCrowdfundingStore = create<CrowdfundingStore>((set, get) => ({
  projects: [],
  currentProject: null,
  filters: {},
  userBackings: [],
  userProjects: [],
  partnerEndorsements: [],
  
  fetchProjects: async () => {
    try {
      const response = await crowdfundingApi.getProjects(get().filters)
      set({ projects: response.data })
    } catch (error) {
      toast.error('프로젝트를 불러오는데 실패했습니다.')
    }
  },
  
  backProject: async (projectId, rewardId, choice) => {
    try {
      const backing = await crowdfundingApi.backProject({
        projectId,
        rewardId,
        rewardChoice: choice
      })
      
      // 사용자 후원 목록 업데이트
      set(state => ({
        userBackings: [...state.userBackings, backing]
      }))
      
      toast.success(`프로젝트 후원이 완료되었습니다! (${choice === 'product' ? '제품 수령' : '환불 + 수수료'})`)
    } catch (error) {
      toast.error('후원 처리 중 오류가 발생했습니다.')
    }
  },
  
  calculateTransparencyScore: (project) => {
    return calculateTransparencyScore(project)
  }
}))
```

---

## 🔌 API 연동 (예정)

### 필요한 API 엔드포인트

```typescript
// 📡 크라우드펀딩 API 클라이언트
class CrowdfundingApi {
  
  // 🎯 프로젝트 관리
  async getProjects(filters?: ProjectFilters): Promise<ApiResponse<Project[]>>
  async getProject(id: string): Promise<ApiResponse<Project>>
  async createProject(data: CreateProjectRequest): Promise<ApiResponse<Project>>
  async updateProject(id: string, data: UpdateProjectRequest): Promise<ApiResponse<Project>>
  async deleteProject(id: string): Promise<ApiResponse<void>>
  
  // 🎁 보상 관리
  async getRewards(projectId: string): Promise<ApiResponse<Reward[]>>
  async createReward(projectId: string, data: CreateRewardRequest): Promise<ApiResponse<Reward>>
  async updateReward(rewardId: string, data: UpdateRewardRequest): Promise<ApiResponse<Reward>>
  
  // 💰 후원 관리
  async backProject(data: BackProjectRequest): Promise<ApiResponse<Backing>>
  async getUserBackings(userId: string): Promise<ApiResponse<Backing[]>>
  async updateRewardChoice(backingId: string, choice: 'product' | 'refund'): Promise<ApiResponse<void>>
  async processRefund(backingId: string): Promise<ApiResponse<void>>
  
  // 🤝 파트너 추천
  async endorseProject(projectId: string, data: EndorseProjectRequest): Promise<ApiResponse<PartnerEndorsement>>
  async getEndorsements(projectId: string): Promise<ApiResponse<PartnerEndorsement[]>>
  
  // 📊 분석 및 통계
  async getProjectStats(projectId: string): Promise<ApiResponse<ProjectStats>>
  async getTransparencyScore(projectId: string): Promise<ApiResponse<TransparencyScore>>
  async getTrendingProjects(): Promise<ApiResponse<Project[]>>
  
  // 💳 결제 관리
  async processPayment(backingId: string, paymentData: PaymentData): Promise<ApiResponse<PaymentResult>>
  async refundPayment(backingId: string): Promise<ApiResponse<RefundResult>>
}

// 📮 API 엔드포인트 정의
const API_ENDPOINTS = {
  // 프로젝트
  PROJECTS: '/api/crowdfunding/projects',
  PROJECT: (id: string) => `/api/crowdfunding/projects/${id}`,
  PROJECT_STATS: (id: string) => `/api/crowdfunding/projects/${id}/stats`,
  
  // 보상
  REWARDS: (projectId: string) => `/api/crowdfunding/projects/${projectId}/rewards`,
  REWARD: (rewardId: string) => `/api/crowdfunding/rewards/${rewardId}`,
  
  // 후원
  BACK_PROJECT: '/api/crowdfunding/backings',
  USER_BACKINGS: (userId: string) => `/api/crowdfunding/users/${userId}/backings`,
  UPDATE_REWARD_CHOICE: (backingId: string) => `/api/crowdfunding/backings/${backingId}/choice`,
  
  // 파트너
  ENDORSE_PROJECT: '/api/crowdfunding/endorsements',
  PROJECT_ENDORSEMENTS: (projectId: string) => `/api/crowdfunding/projects/${projectId}/endorsements`,
  
  // 결제
  PROCESS_PAYMENT: '/api/crowdfunding/payments',
  REFUND_PAYMENT: (backingId: string) => `/api/crowdfunding/backings/${backingId}/refund`
}
```

---

## 📊 현재 개발 상태

### ✅ 완료된 기능

- **React 애플리케이션**: Vite + TypeScript 기반 구조
- **TypeScript 타입**: 모든 핵심 엔티티 타입 정의 완료
- **랜딩 페이지**: 히어로 섹션과 서비스 개요
- **프로젝트 카드**: 투명성 지표가 있는 프로젝트 표시 컴포넌트
- **파트너 추천 시스템**: 파트너 추천 표시 시스템
- **반응형 디자인**: TailwindCSS 기반 반응형 프레임워크
- **개발용 목업 데이터**: 개발을 위한 목업 데이터 구조

### 🟡 진행 중/누락된 기능

- **API 통합 계층**: 백엔드 API와의 연동
- **관리자 패널**: 관리자 기능
- **백엔드 API**: Express.js 기반 API 서버
- **사용자 인증**: 로그인/회원가입 시스템
- **결제 처리**: 결제 게이트웨이 연동
- **프로젝트 생성 폼**: 프로젝트 등록 인터페이스
- **보상 관리 시스템**: 보상 설정 및 관리
- **파트너 대시보드**: 파트너용 관리 인터페이스

### ❌ 미구현 기능

- **실시간 펀딩 진행률**: Socket.IO 기반 실시간 업데이트
- **이메일 알림**: 프로젝트 상태 변경 알림
- **파일 업로드**: 프로젝트 이미지/동영상 업로드
- **소셜 공유**: SNS 공유 기능
- **검색 및 필터**: 고급 검색 기능
- **모바일 앱**: 네이티브 모바일 애플리케이션

---

## 🔗 서비스 연동

### Main Platform과의 통합

```typescript
// 🔐 인증 시스템 연동
interface AuthIntegration {
  // 메인 플랫폼 인증 사용
  sharedAuthentication: boolean
  userRoles: ['creator', 'backer', 'partner', 'admin']
  
  // 프로필 연동
  userProfileSync: boolean
  businessInfoSharing: boolean
}

// 🛒 E-commerce 연동
interface EcommerceIntegration {
  // 성공한 펀딩 프로젝트 → 일반 상품 전환
  productConversion: {
    autoConvert: boolean
    conversionRules: ProductConversionRule[]
  }
  
  // 후원자 → 고객 전환
  customerConversion: {
    rewardDelivery: boolean
    loyaltyProgram: boolean
  }
  
  // 파트너 수수료 시스템
  affiliateIntegration: {
    commissionTracking: boolean
    transparentDisclosure: boolean
  }
}

// 💬 Forum 연동
interface ForumIntegration {
  // 프로젝트 토론
  projectDiscussions: boolean
  
  // 전문가 검증
  expertValidation: {
    forumExpertIntegration: boolean
    validationProcess: boolean
  }
  
  // 커뮤니티 피드백
  communityFeedback: boolean
}
```

---

## 🚀 개발 로드맵

### Phase 1: 백엔드 API 구현 (2-3개월)
- [ ] Express.js + TypeORM 기반 API 서버 구축
- [ ] 프로젝트 CRUD API 구현
- [ ] 후원 및 결제 시스템 구현
- [ ] 파트너 추천 시스템 구현
- [ ] 투명성 점수 계산 알고리즘 구현

### Phase 2: 프론트엔드 완성 (1-2개월)
- [ ] 프로젝트 생성/관리 인터페이스 구현
- [ ] 후원자/창작자 대시보드 구현
- [ ] 보상 선택 시스템 구현
- [ ] 결제 인터페이스 구현
- [ ] 파트너 대시보드 구현

### Phase 3: 고급 기능 (1-2개월)
- [ ] 실시간 펀딩 진행률 업데이트
- [ ] 이메일 알림 시스템
- [ ] 소셜 공유 기능
- [ ] 고급 검색 및 필터링
- [ ] 모바일 반응형 최적화

### Phase 4: 분석 및 최적화 (1개월)
- [ ] 펀딩 성과 분석 대시보드
- [ ] A/B 테스트 시스템
- [ ] 성능 최적화
- [ ] SEO 최적화
- [ ] PWA 기능

---

## 🎯 비즈니스 가치

### 차별화 포인트

1. **투명성 중심**: 업계 최초 투명성 점수 시스템
2. **파트너 추천**: 전문가 검증을 통한 신뢰성 확보
3. **선택권 제공**: 후원자의 보상 선택권 (제품 vs 환불)
4. **수수료 투명성**: 모든 수수료 구조 투명 공개

### 시장 기회

- **기존 크라우드펀딩 플랫폼의 신뢰성 문제** 해결
- **투명성과 전문성**을 통한 차별화
- **한국 시장의 크라우드펀딩 성장** 트렌드에 부합
- **헬스/웰니스 제품**에 특화된 전문 플랫폼

---

*📄 이 문서는 O4O Platform Crowdfunding 서비스의 포괄적인 기술 분석을 담고 있습니다.*