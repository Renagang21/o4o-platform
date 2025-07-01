# 💬 Forum 서비스 기술 문서

> **서비스 이름**: Forum (커뮤니티 포럼)  
> **포트**: TBD  
> **상태**: ❌ 백엔드 미구현, 🟡 Main-Site 통합 컴포넌트 존재

---

## 📋 서비스 개요

O4O Platform의 **신뢰 중심 커뮤니티 플랫폼**으로, 헬스/웰니스 정보의 신뢰성을 보장하는 전문가 검증 시스템과 팩트체킹 기능을 제공합니다.

### 🎯 핵심 목표
- **신뢰 우선 커뮤니티**: 의료/과학적 근거 기반 정보 공유
- **전문가 검증 시스템**: 자격을 갖춘 전문가들의 콘텐츠 검증
- **팩트체킹 통합**: 의료/과학 문헌과의 자동 대조 검증
- **커뮤니티 Q&A**: 평판 기반 신뢰도 시스템

---

## 🏗️ 아키텍처

### 현재 구조

```
services/forum/
├── api/            # 백엔드 API (빈 플레이스홀더)
└── web/            # 프론트엔드 (빈 플레이스홀더)
```

### 계획된 구조

```
services/forum/
├── api/                          # Express.js 백엔드
│   ├── src/
│   │   ├── controllers/
│   │   │   ├── postsController.ts
│   │   │   ├── commentsController.ts
│   │   │   ├── expertsController.ts
│   │   │   ├── verificationController.ts
│   │   │   └── consultationController.ts
│   │   ├── entities/
│   │   │   ├── Post.ts
│   │   │   ├── Comment.ts
│   │   │   ├── Expert.ts
│   │   │   ├── ContentVerification.ts
│   │   │   ├── TrustScore.ts
│   │   │   └── Consultation.ts
│   │   ├── routes/
│   │   │   ├── forum.ts
│   │   │   ├── experts.ts
│   │   │   └── verification.ts
│   │   ├── services/
│   │   │   ├── verificationService.ts
│   │   │   ├── trustScoreService.ts
│   │   │   ├── factCheckService.ts
│   │   │   └── consultationService.ts
│   │   └── middleware/
│   │       ├── expertAuth.ts
│   │       └── contentValidation.ts
│   └── package.json
└── web/                         # React 프론트엔드
    ├── src/
    │   ├── components/
    │   │   ├── PostList.tsx
    │   │   ├── PostDetail.tsx
    │   │   ├── CommentThread.tsx
    │   │   ├── ExpertBadge.tsx
    │   │   ├── TrustMeter.tsx
    │   │   └── FactCheckIndicator.tsx
    │   ├── pages/
    │   │   ├── ForumHome.tsx
    │   │   ├── CategoryView.tsx
    │   │   ├── TopicView.tsx
    │   │   ├── ExpertDashboard.tsx
    │   │   └── ConsultationPage.tsx
    │   └── hooks/
    │       ├── useTrustScore.ts
    │       ├── useExpertVerification.ts
    │       └── useFactCheck.ts
    └── package.json
```

### 기술 스택 (계획)

| 구분 | 기술 | 버전 |
|------|------|------|
| **Backend** | Express.js + TypeORM | Node 20.x |
| **Database** | PostgreSQL | 15+ |
| **Frontend** | React + TypeScript | 19.x |
| **Real-time** | Socket.IO | - |
| **External APIs** | Medical/Scientific DB APIs | - |
| **Text Processing** | NLP Libraries for fact-checking | - |

---

## 🧠 비즈니스 로직

### 핵심 데이터 모델

```typescript
// 📝 포스트 엔티티
interface Post {
  id: string
  title: string
  content: string
  category: ForumCategory
  author: User
  
  // 신뢰성 관련
  trustScore: number              // 0-100% 신뢰도 점수
  verificationStatus: 'verified' | 'pending' | 'disputed' | 'flagged'
  factChecks: FactCheck[]
  expertEndorsements: ExpertEndorsement[]
  
  // 커뮤니티 상호작용
  votes: Vote[]
  comments: Comment[]
  views: number
  saves: number
  
  // 메타데이터
  tags: string[]
  sources: Source[]              // 참조 문헌/소스
  lastVerifiedAt?: Date
  createdAt: Date
  updatedAt: Date
}

// 👨‍⚕️ 전문가 엔티티
interface Expert extends User {
  // 전문가 인증 정보
  specialty: string[]             // ['nutrition', 'dermatology', 'fitness']
  credentials: Credential[]
  license: LicenseInfo
  institution: string
  yearsOfExperience: number
  
  // 신뢰도 지표
  credibilityScore: number        // 전문가 신뢰도 (0-100%)
  endorsementCount: number
  verificationCount: number
  consultationRating: number
  
  // 활동 정보
  specialtyAreas: string[]
  consultationPrice: number       // 💰 유료 상담 가격
  availableForConsultation: boolean
  responseTime: number           // 평균 응답 시간 (시간)
  
  // 검증 상태
  isVerified: boolean
  verifiedBy: string            // 검증 기관/담당자
  verificationDate: Date
}

// 🔍 콘텐츠 검증 시스템
interface ContentVerification {
  id: string
  postId: string
  expertId: string
  
  // 검증 결과
  verificationStatus: 'verified' | 'needs_review' | 'disputed' | 'false'
  confidenceLevel: number        // 검증 확신도 (0-100%)
  verificationReason: string
  
  // 팩트체킹
  factCheckSources: Source[]
  scientificEvidence: Evidence[]
  
  // 메타데이터
  verifiedAt: Date
  lastReviewedAt: Date
  reviewCount: number
}

// 📊 신뢰도 점수 시스템
interface TrustScore {
  postId: string
  
  // 기본 점수 구성요소
  authorCredibility: number      // 작성자 신뢰도 (30%)
  expertEndorsements: number     // 전문가 추천 (25%)
  communityVotes: number         // 커뮤니티 투표 (20%)
  factCheckResults: number       // 팩트체킹 결과 (15%)
  sourceQuality: number          // 참조 소스 품질 (10%)
  
  // 계산된 총 점수
  totalScore: number             // 0-100%
  lastCalculatedAt: Date
  
  // 상세 투표 분석
  votes: {
    helpful: number
    accurate: number
    misleading: number
    harmful: number
  }
}

// 💡 전문가 상담 시스템
interface ExpertConsultation {
  id: string
  expertId: string
  userId: string
  
  // 상담 정보
  title: string
  description: string
  category: string
  urgency: 'low' | 'medium' | 'high' | 'urgent'
  
  // 상담 진행
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled'
  messages: ConsultationMessage[]
  
  // 결제 정보
  price: number
  paymentStatus: 'pending' | 'paid' | 'refunded'
  
  // 만족도
  rating?: number               // 1-5 점
  feedback?: string
  
  // 시간 정보
  createdAt: Date
  startedAt?: Date
  completedAt?: Date
  estimatedDuration: number     // 예상 소요 시간 (분)
}
```

### 신뢰도 점수 계산 알고리즘

```typescript
// 🧮 신뢰도 점수 계산
interface TrustScoreCalculator {
  // 작성자 신뢰도 (30%)
  calculateAuthorCredibility(author: User): number {
    if (author.type === 'expert') {
      const expert = author as Expert
      return expert.credibilityScore * 0.8 + 
             (expert.verificationCount / 10) * 0.2
    }
    
    // 일반 사용자의 경우
    return Math.min(
      (author.postsCount * 2) + 
      (author.helpfulVotes * 3) - 
      (author.flaggedPosts * 10),
      100
    )
  }
  
  // 전문가 추천 (25%)
  calculateExpertEndorsements(endorsements: ExpertEndorsement[]): number {
    return Math.min(
      endorsements.reduce((score, endorsement) => {
        const expert = endorsement.expert
        const expertWeight = expert.credibilityScore / 100
        return score + (expertWeight * 20)
      }, 0),
      100
    )
  }
  
  // 커뮤니티 투표 (20%)
  calculateCommunityVotes(votes: Vote[]): number {
    const totalVotes = votes.length
    if (totalVotes === 0) return 50 // 중립
    
    const positiveVotes = votes.filter(v => 
      ['helpful', 'accurate'].includes(v.type)
    ).length
    
    const negativeVotes = votes.filter(v => 
      ['misleading', 'harmful'].includes(v.type)
    ).length
    
    return Math.max(0, Math.min(100, 
      ((positiveVotes - negativeVotes) / totalVotes) * 100 + 50
    ))
  }
  
  // 팩트체킹 결과 (15%)
  calculateFactCheckResults(factChecks: FactCheck[]): number {
    if (factChecks.length === 0) return 50 // 중립
    
    const avgAccuracy = factChecks.reduce((sum, fc) => 
      sum + fc.accuracyScore, 0) / factChecks.length
    
    return avgAccuracy
  }
  
  // 소스 품질 (10%)
  calculateSourceQuality(sources: Source[]): number {
    if (sources.length === 0) return 30 // 소스 없음 시 낮은 점수
    
    return sources.reduce((score, source) => {
      switch (source.type) {
        case 'peer_reviewed': return score + 25
        case 'government': return score + 20
        case 'medical_journal': return score + 25
        case 'university': return score + 15
        case 'news': return score + 10
        case 'blog': return score + 5
        default: return score + 5
      }
    }, 0) / sources.length
  }
  
  // 총 점수 계산
  calculateTotalTrustScore(post: Post): number {
    const authorScore = this.calculateAuthorCredibility(post.author) * 0.30
    const expertScore = this.calculateExpertEndorsements(post.expertEndorsements) * 0.25
    const communityScore = this.calculateCommunityVotes(post.votes) * 0.20
    const factCheckScore = this.calculateFactCheckResults(post.factChecks) * 0.15
    const sourceScore = this.calculateSourceQuality(post.sources) * 0.10
    
    return Math.round(authorScore + expertScore + communityScore + factCheckScore + sourceScore)
  }
}
```

### 전문가 검증 프로세스

```typescript
// 🔬 전문가 검증 워크플로우
interface ExpertVerificationWorkflow {
  
  // 1단계: 자동 스크리닝
  async autoScreenPost(post: Post): Promise<ScreeningResult> {
    // 의료/건강 관련 키워드 감지
    const healthKeywords = this.detectHealthClaims(post.content)
    
    // 위험 신호 감지
    const riskSignals = this.detectRiskSignals(post.content)
    
    // 외부 팩트체킹 API 호출
    const factCheckResults = await this.runFactCheck(post.content)
    
    return {
      needsExpertReview: healthKeywords.length > 0 || riskSignals.length > 0,
      urgency: this.calculateUrgency(riskSignals),
      suggestedExperts: this.findRelevantExperts(healthKeywords),
      factCheckResults
    }
  }
  
  // 2단계: 전문가 배정
  async assignExperts(post: Post, screening: ScreeningResult): Promise<void> {
    const relevantExperts = screening.suggestedExperts
      .filter(expert => expert.availableForReview)
      .sort((a, b) => b.credibilityScore - a.credibilityScore)
      .slice(0, 3) // 상위 3명 전문가 선택
    
    for (const expert of relevantExperts) {
      await this.notifyExpertForReview(expert, post)
    }
  }
  
  // 3단계: 전문가 검증
  async submitExpertVerification(
    expertId: string, 
    postId: string, 
    verification: VerificationSubmission
  ): Promise<ContentVerification> {
    
    const verificationRecord = await ContentVerification.create({
      postId,
      expertId,
      verificationStatus: verification.status,
      confidenceLevel: verification.confidence,
      verificationReason: verification.reason,
      factCheckSources: verification.sources,
      scientificEvidence: verification.evidence
    })
    
    // 신뢰도 점수 재계산
    await this.recalculateTrustScore(postId)
    
    // 작성자에게 알림
    await this.notifyAuthor(postId, verificationRecord)
    
    return verificationRecord
  }
  
  // 4단계: 커뮤니티 피드백 통합
  async processCommunityFeedback(postId: string, votes: Vote[]): Promise<void> {
    // 전문가 검증과 커뮤니티 투표 결과 비교
    const expertVerifications = await ContentVerification.findByPostId(postId)
    const communityConsensus = this.calculateCommunityConsensus(votes)
    
    // 불일치 감지 시 추가 검토 요청
    if (this.detectDisagreement(expertVerifications, communityConsensus)) {
      await this.requestAdditionalReview(postId)
    }
    
    // 최종 신뢰도 점수 업데이트
    await this.updateFinalTrustScore(postId)
  }
}
```

---

## 🎨 Main-Site 통합 컴포넌트

### 현재 구현된 컴포넌트들

```typescript
// 🧩 Main-Site에서 발견된 Forum 컴포넌트들

// 📝 CommunityQA.tsx - 커뮤니티 Q&A 시스템
const CommunityQA = () => {
  return (
    <div className="community-qa">
      <QAHeader />
      <QuestionList />
      <ExpertAnswers />
      <CommunityVoting />
      <TrustIndicators />
    </div>
  )
}

// 👨‍⚕️ ExpertConsultationSystem.tsx - 전문가 상담 시스템
const ExpertConsultationSystem = () => {
  const [selectedExpert, setSelectedExpert] = useState<Expert | null>(null)
  const [consultationTopic, setConsultationTopic] = useState('')
  
  return (
    <div className="expert-consultation">
      <ExpertDirectory />
      <ConsultationBooking 
        expert={selectedExpert}
        topic={consultationTopic}
      />
      <ConsultationChat />
      <PaymentIntegration />
    </div>
  )
}

// 📚 KnowledgeHub.tsx - 지식 허브
const KnowledgeHub = () => {
  return (
    <div className="knowledge-hub">
      <VerifiedArticles />
      <ExpertContributions />
      <ScientificSources />
      <FactCheckDatabase />
    </div>
  )
}

// 📊 SmartSurveyIntegration.tsx - 스마트 설문 통합
const SmartSurveyIntegration = () => {
  return (
    <div className="smart-survey">
      <HealthAssessment />
      <PersonalizedRecommendations />
      <ExpertFollowUp />
      <DataPrivacyControls />
    </div>
  )
}

// 🔍 TransparencyHub.tsx - 투명성 허브  
const TransparencyHub = () => {
  return (
    <div className="transparency-hub">
      <SourceVerification />
      <ExpertCredentials />
      <ConflictOfInterestDisclosure />
      <FundingTransparency />
    </div>
  )
}

// ✅ TrustVerificationSystem.tsx - 신뢰 검증 시스템
const TrustVerificationSystem = () => {
  return (
    <div className="trust-verification">
      <TrustScoreDisplay />
      <VerificationBadges />
      <FactCheckResults />
      <CommunityFeedback />
      <ExpertEndorsements />
    </div>
  )
}
```

### API 통합 설정

```typescript
// 📡 Main-Site에 정의된 Forum API 엔드포인트
const FORUM_ENDPOINTS = {
  POSTS: '/api/forum/posts',
  POST: (id: string) => `/api/forum/posts/${id}`,
  COMMENTS: (postId: string) => `/api/forum/posts/${postId}/comments`,
  EXPERTS: '/api/forum/experts',
  CONSULTATIONS: '/api/forum/consultations',
  VERIFICATION: '/api/forum/verification',
  TRUST_SCORES: '/api/forum/trust-scores'
}

// Forum API 클라이언트 (구현 예정)
class ForumApi {
  async getPosts(filters?: PostFilters): Promise<ApiResponse<Post[]>>
  async getPost(id: string): Promise<ApiResponse<Post>>
  async createPost(data: CreatePostRequest): Promise<ApiResponse<Post>>
  async verifyPost(postId: string, verification: VerificationData): Promise<ApiResponse<void>>
  
  async getExperts(specialty?: string): Promise<ApiResponse<Expert[]>>
  async requestConsultation(data: ConsultationRequest): Promise<ApiResponse<Consultation>>
  
  async getTrustScore(postId: string): Promise<ApiResponse<TrustScore>>
  async submitVote(postId: string, vote: VoteData): Promise<ApiResponse<void>>
}
```

---

## 📊 현재 개발 상태

### ❌ 미구현 기능 (백엔드)

- **Express.js API 서버**: 포럼 API 서버 전체
- **데이터베이스 모델**: TypeORM 엔티티들
- **전문가 인증 시스템**: 전문가 자격 검증
- **팩트체킹 API**: 외부 의료/과학 데이터베이스 연동
- **신뢰도 계산 엔진**: 실시간 신뢰도 점수 계산
- **상담 시스템**: 유료 전문가 상담 시스템

### 🟡 부분 구현 (Main-Site 통합)

- **UI 컴포넌트**: 6개의 핵심 Forum 컴포넌트 존재
- **API 엔드포인트 정의**: 기본 API 경로 정의됨
- **라우팅 설정**: Forum 페이지 라우팅 구조
- **타입 정의**: 기본 TypeScript 인터페이스

### ✅ 설계 완료

- **비즈니스 로직**: 신뢰도 시스템 설계 완료
- **전문가 검증 워크플로우**: 검증 프로세스 설계
- **데이터 모델**: 핵심 엔티티 설계 완료
- **통합 아키텍처**: 다른 서비스와의 연동 방안

---

## 🔗 서비스 연동

### E-commerce 연동

```typescript
// 🛒 E-commerce와의 신뢰도 연동
interface EcommerceTrustIntegration {
  // 포럼 신뢰도 → 상품 신뢰도
  productCredibilityScoring: {
    forumTrustScore: number        // 포럼에서의 제품 논의 신뢰도
    expertRecommendations: number  // 전문가 제품 추천
    communityReviews: number       // 커뮤니티 리뷰 신뢰도
  }
  
  // 전문가 상품 추천
  expertProductEndorsements: {
    endorsementType: 'clinical' | 'experience' | 'research'
    confidenceLevel: number
    disclosureInfo: string        // 이해관계 공개
  }
  
  // 제품 Q&A 통합
  productQA: {
    expertAnswers: boolean
    communityDiscussion: boolean
    trustVerification: boolean
  }
}
```

### Crowdfunding 연동

```typescript
// 💰 크라우드펀딩과의 전문가 검증 연동
interface CrowdfundingExpertIntegration {
  // 프로젝트 전문가 검증
  projectValidation: {
    expertReview: boolean
    scientificBasis: boolean
    feasibilityAssessment: boolean
    riskAssessment: boolean
  }
  
  // 투명성 점수 기여
  transparencyContribution: {
    expertEndorsement: number     // 전문가 추천 가중치
    communityTrust: number        // 커뮤니티 신뢰도
    factCheckResults: number      // 팩트체킹 결과
  }
  
  // 펀딩 후 추적
  postFundingTracking: {
    progressVerification: boolean  // 진행 상황 검증
    resultValidation: boolean     // 결과 검증
    communityFeedback: boolean    // 커뮤니티 피드백
  }
}
```

### Main Platform 인증 연동

```typescript
// 🔐 중앙 인증 시스템과의 연동
interface AuthenticationIntegration {
  // 사용자 역할 확장
  extendedUserRoles: {
    expert: Expert
    moderator: Moderator
    factChecker: FactChecker
    communityMember: User
  }
  
  // 전문가 인증 프로세스
  expertVerification: {
    credentialVerification: boolean
    institutionValidation: boolean
    licenseCheck: boolean
    peerReview: boolean
  }
  
  // 권한 관리
  permissionMatrix: {
    'forum.post.create': string[]
    'forum.post.verify': string[]
    'forum.expert.consult': string[]
    'forum.content.moderate': string[]
  }
}
```

---

## 🚀 개발 로드맵

### Phase 1: 백엔드 기초 구축 (2-3개월)
- [ ] Express.js + TypeORM API 서버 구축
- [ ] 기본 포럼 기능 (포스트, 댓글, 투표) 구현
- [ ] 사용자 인증 및 권한 시스템 구현
- [ ] 기본 API 엔드포인트 완성

### Phase 2: 전문가 시스템 구현 (2-3개월)  
- [ ] 전문가 인증 시스템 구현
- [ ] 콘텐츠 검증 워크플로우 구현
- [ ] 신뢰도 점수 계산 엔진 구현
- [ ] 팩트체킹 API 연동

### Phase 3: 고급 기능 구현 (1-2개월)
- [ ] 전문가 상담 시스템 구현
- [ ] 실시간 알림 시스템 (Socket.IO)
- [ ] 고급 검색 및 필터링
- [ ] 커뮤니티 모더레이션 도구

### Phase 4: 통합 및 최적화 (1개월)
- [ ] 다른 서비스와의 완전한 연동
- [ ] 성능 최적화 및 캐싱
- [ ] 모바일 반응형 최적화
- [ ] 종합 테스트 및 배포

---

## 🎯 비즈니스 가치

### 차별화 포인트

1. **의료/과학적 신뢰성**: 전문가 검증을 통한 정보 신뢰도 보장
2. **투명한 검증 과정**: 모든 검증 과정과 근거 공개
3. **유료 전문가 상담**: 수익 모델과 전문성 결합
4. **커뮤니티 자정 작용**: 사용자 참여형 신뢰도 시스템

### 시장 기회

- **헬스케어 정보의 신뢰성 문제** 해결
- **가짜 의료 정보** 퇴치를 통한 사회적 가치 창출
- **전문가 네트워크** 구축을 통한 신뢰도 확보
- **한국 의료/웰니스 시장**의 디지털 전환 지원

---

*📄 이 문서는 O4O Platform Forum 서비스의 설계 및 개발 계획을 담고 있습니다.*