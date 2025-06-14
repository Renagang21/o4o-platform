
# o4o-Platform 공통 컴포넌트 및 디자인 시스템 가이드

## 📋 개요

o4o-platform의 **공통 디자인 시스템**은 **정보 중심 제품의 신뢰도 기반 거래**를 지원하는 일관된 사용자 경험을 제공합니다. 모든 모듈에서 재사용 가능한 컴포넌트와 패턴을 통해 **B2B2C 생태계**의 복잡성을 직관적으로 해결합니다.

### 핵심 설계 원칙
1. **신뢰성 우선**: 모든 UI 요소는 신뢰도를 강화하는 방향으로 설계
2. **정보 계층화**: 복잡한 정보를 단계적으로 제공하는 Progressive Disclosure
3. **역할별 최적화**: 공급자, 판매자, 구매자별 맞춤형 인터페이스
4. **투명성 보장**: 모든 데이터와 프로세스의 투명한 공개

---

## 🎨 핵심 디자인 토큰

### **컬러 시스템**

#### **Primary Colors (브랜드 아이덴티티)**
```css
:root {
  /* 메인 브랜드 컬러 */
  --o4o-primary-50: #eff6ff;
  --o4o-primary-100: #dbeafe;
  --o4o-primary-200: #bfdbfe;
  --o4o-primary-300: #93c5fd;
  --o4o-primary-400: #60a5fa;
  --o4o-primary-500: #3b82f6;   /* 메인 블루 */
  --o4o-primary-600: #2563eb;
  --o4o-primary-700: #1d4ed8;
  --o4o-primary-800: #1e40af;
  --o4o-primary-900: #1e3a8a;
  
  /* 신뢰성 강조 컬러 */
  --o4o-trust-50: #f0fdf4;
  --o4o-trust-100: #dcfce7;
  --o4o-trust-200: #bbf7d0;
  --o4o-trust-300: #86efac;
  --o4o-trust-400: #4ade80;
  --o4o-trust-500: #22c55e;     /* 신뢰 그린 */
  --o4o-trust-600: #16a34a;
  --o4o-trust-700: #15803d;
  --o4o-trust-800: #166534;
  --o4o-trust-900: #14532d;
}
```

#### **Semantic Colors (의미 기반 컬러)**
```css
:root {
  /* 신뢰도 레벨 */
  --trust-verified: #10b981;     /* 검증됨 */
  --trust-pending: #f59e0b;      /* 검증 중 */
  --trust-unverified: #6b7280;   /* 미검증 */
  --trust-warning: #ef4444;      /* 주의 */
  
  /* 사용자 역할별 */
  --role-supplier: #8b5cf6;      /* 공급자 */
  --role-reseller: #06b6d4;      /* 판매자 */
  --role-customer: #84cc16;      /* 구매자 */
  --role-expert: #f59e0b;        /* 전문가 */
  
  /* 정보 타입별 */
  --info-technical: #3b82f6;     /* 기술 정보 */
  --info-safety: #10b981;        /* 안전성 정보 */
  --info-usage: #8b5cf6;         /* 사용법 정보 */
  --info-review: #f59e0b;        /* 사용자 리뷰 */
}
```

### **타이포그래피 시스템**

#### **폰트 패밀리**
```css
:root {
  --font-primary: 'Pretendard Variable', 'Pretendard', -apple-system, BlinkMacSystemFont, system-ui, sans-serif;
  --font-mono: 'JetBrains Mono', 'Fira Code', Consolas, monospace;
  --font-serif: 'Noto Serif KR', serif;
}
```

#### **타이포그래피 스케일**
```css
:root {
  /* Display - 대형 헤드라인 */
  --text-display-2xl: 4.5rem;    /* 72px */
  --text-display-xl: 3.75rem;    /* 60px */
  --text-display-lg: 3rem;       /* 48px */
  --text-display-md: 2.25rem;    /* 36px */
  --text-display-sm: 1.875rem;   /* 30px */
  
  /* Heading - 섹션 제목 */
  --text-heading-xl: 1.5rem;     /* 24px */
  --text-heading-lg: 1.25rem;    /* 20px */
  --text-heading-md: 1.125rem;   /* 18px */
  --text-heading-sm: 1rem;       /* 16px */
  
  /* Body - 본문 텍스트 */
  --text-body-xl: 1.125rem;      /* 18px */
  --text-body-lg: 1rem;          /* 16px */
  --text-body-md: 0.875rem;      /* 14px */
  --text-body-sm: 0.75rem;       /* 12px */
  
  /* Label - 라벨/캡션 */
  --text-label-lg: 0.875rem;     /* 14px */
  --text-label-md: 0.75rem;      /* 12px */
  --text-label-sm: 0.6875rem;    /* 11px */
}
```

### **간격 시스템 (Spacing)**
```css
:root {
  --spacing-0: 0;
  --spacing-0_5: 0.125rem;   /* 2px */
  --spacing-1: 0.25rem;      /* 4px */
  --spacing-1_5: 0.375rem;   /* 6px */
  --spacing-2: 0.5rem;       /* 8px */
  --spacing-2_5: 0.625rem;   /* 10px */
  --spacing-3: 0.75rem;      /* 12px */
  --spacing-3_5: 0.875rem;   /* 14px */
  --spacing-4: 1rem;         /* 16px */
  --spacing-5: 1.25rem;      /* 20px */
  --spacing-6: 1.5rem;       /* 24px */
  --spacing-8: 2rem;         /* 32px */
  --spacing-10: 2.5rem;      /* 40px */
  --spacing-12: 3rem;        /* 48px */
  --spacing-16: 4rem;        /* 64px */
  --spacing-20: 5rem;        /* 80px */
  --spacing-24: 6rem;        /* 96px */
}
```

---

## 🧩 핵심 공통 컴포넌트

### **1. TrustIndicator 컴포넌트 (신뢰도 표시기)**

#### **모든 모듈에서 재사용되는 신뢰도 시각화:**
```jsx
<TrustIndicator 
  score={87} 
  type="product" 
  details={{
    verified: true,
    expertReviewed: true,
    userRating: 4.5,
    certifications: ['FDA', 'ISO']
  }}
  size="large"
/>
```

#### **시각적 표현:**
```
┌─ 신뢰도 점수: 87점 ─────────────────────┐
│ ⭐⭐⭐⭐⭐ (4.5/5) | 🏆 전문가 인증     │
│                                       │
│ 📊 세부 평가                           │
│ 품질 검증: ████████████████░░ 90%      │
│ 사용자 만족: ████████████████░░ 85%    │
│ 전문가 평가: ████████████████░░ 88%    │
│                                       │
│ 🏅 인증 배지: [FDA] [ISO] [GMP]        │
└─────────────────────────────────────┘
```

#### **컴포넌트 구조:**
```jsx
export const TrustIndicator = ({ 
  score, 
  type, 
  details, 
  size = 'medium',
  showDetails = true 
}) => {
  return (
    <div className={`trust-indicator trust-indicator--${size}`}>
      <TrustScore score={score} />
      {details.verified && <VerificationBadge />}
      {details.certifications && (
        <CertificationBadges certs={details.certifications} />
      )}
      {showDetails && (
        <TrustBreakdown 
          quality={details.quality}
          safety={details.safety}
          satisfaction={details.satisfaction}
          expert={details.expert}
        />
      )}
    </div>
  );
};
```

### **2. InformationCard 컴포넌트 (정보 카드)**

#### **계층화된 정보 표시:**
```jsx
<InformationCard
  title="제품 상세 정보"
  level="detailed"
  sources={['공급자', '전문가', '사용자']}
  lastUpdated="2024-06-14"
  trustScore={92}
>
  <InfoSection type="technical">
    {/* 기술적 정보 */}
  </InfoSection>
  <InfoSection type="safety">
    {/* 안전성 정보 */}
  </InfoSection>
  <InfoSection type="usage">
    {/* 사용법 정보 */}
  </InfoSection>
</InformationCard>
```

#### **Progressive Disclosure 패턴:**
```
┌─ 제품 상세 정보 ─────────────── [📊 신뢰도: 92] ┐
│                                              │
│ 📋 기본 정보 (항상 표시)                      │
│ ├─ 제품명: 프리미엄 비타민 D3                  │
│ ├─ 주요 성분: 비타민 D3 1000IU                │
│ └─ 제조사: ○○○헬스케어                       │
│                                              │
│ [▼ 상세 정보 보기]                            │
│ ┌─ 📊 영양 성분표 ─────────────────────────┐ │
│ │ 비타민 D3: 1000IU (500% DV)              │ │
│ │ 부형제: 미정질셀룰로오스, 스테아린산마그네슘  │ │
│ └─────────────────────────────────────────┘ │
│                                              │
│ [▼ 안전성 정보 보기]                          │
│ ┌─ 🛡️ 안전성 데이터 ─────────────────────┐ │
│ │ ✅ 중금속 검사: 기준치 이하                │ │
│ │ ✅ 미생물 검사: 적합                      │ │
│ │ ⚠️ 주의사항: 임산부 복용 전 의사 상담       │ │
│ └─────────────────────────────────────────┘ │
│                                              │
│ 📅 최종 업데이트: 2024-06-14                  │
│ 📖 정보 출처: 공급자 + 전문가 검증 + 사용자 피드백│
└──────────────────────────────────────────────┘
```

### **3. UserRoleSwitch 컴포넌트 (사용자 역할 전환)**

#### **B2B2C 모델의 역할별 인터페이스:**
```jsx
<UserRoleSwitch 
  currentRole="reseller"
  availableRoles={['supplier', 'reseller', 'customer']}
  onRoleChange={handleRoleChange}
/>
```

#### **시각적 표현:**
```
┌─ 역할 선택 ─────────────────────────────────┐
│                                             │
│ 👤 현재 역할: 판매자                         │
│                                             │
│ 🔄 다른 역할로 전환:                         │
│ ┌─ 🏭 공급자 ─────┐ ┌─ 🛒 구매자 ─────┐ │
│ │ • 제품 등록      │ │ • 제품 구매      │ │
│ │ • 판매자 관리    │ │ • 리뷰 작성      │ │
│ │ • 정보 업데이트  │ │ • Q&A 참여      │ │
│ │ [전환하기]       │ │ [전환하기]       │ │
│ └─────────────────┘ └─────────────────┘ │
│                                             │
│ ℹ️ 역할 전환 시 해당 기능에 맞는 UI로 변경됩니다 │
└─────────────────────────────────────────────┘
```

### **4. ExternalResourceWidget 컴포넌트 (외부 리소스 연동)**

#### **유튜브, 블로그 등 외부 콘텐츠 통합:**
```jsx
<ExternalResourceWidget
  type="youtube"
  resourceId="dQw4w9WgXcQ"
  title="제품 사용법 영상"
  verified={true}
  relevanceScore={94}
  language="ko"
/>
```

#### **시각적 표현:**
```
┌─ 연관 리소스 ─────────────────────────────────┐
│                                               │
│ 🎬 "프리미엄 비타민 D3 올바른 복용법"          │
│ 📺 유튜브 • 조회수 1.2M • 👍 98% • ✅ 검증됨  │
│                                               │
│ ┌─ 영상 썸네일 ─────────────────────────────┐ │
│ │    [▶️ 재생 버튼]                        │ │
│ │                                           │ │
│ │    의사가 알려주는                         │ │
│ │    비타민D 복용법                         │ │
│ └───────────────────────────────────────────┘ │
│                                               │
│ 📊 연관성: ████████████████░░ 94%             │
│ 🏆 신뢰도: ⭐⭐⭐⭐⭐ (4.8/5)                 │
│ 📅 업로드: 2024-05-20                         │
│                                               │
│ [원본 보기] [북마크] [부적절 신고]              │
└───────────────────────────────────────────────┘
```

### **5. SurveyQuizLauncher 컴포넌트 (설문/퀴즈 실행기)**

#### **타겟 마케팅을 위한 상황별 설문 제공:**
```jsx
<SurveyQuizLauncher
  context="product-recommendation"
  triggerCondition="product-view"
  title="당신에게 맞는 건강기능식품 찾기"
  estimatedTime={3}
  incentive="맞춤 할인 쿠폰"
  style="card"
/>
```

#### **인터랙티브 프레젠테이션:**
```
┌─ 💡 개인 맞춤 추천 ─────────────────────────┐
│                                             │
│ "당신에게 딱 맞는 건강기능식품을 찾아드려요!"  │
│                                             │
│ ⏱️ 소요시간: 약 3분                         │
│ 🎁 완료 혜택: 15% 할인 쿠폰                  │
│ 📊 참여자: 12,547명                         │
│                                             │
│ ┌─ 미리보기 ─────────────────────────────┐ │
│ │ Q1. 주요 건강 관심사는?                 │ │
│ │ □ 면역력  □ 피로회복  □ 관절건강        │ │
│ │                                         │ │
│ │ Q2. 현재 복용 중인 영양제는?            │ │
│ │ □ 종합비타민  □ 오메가3  □ 없음        │ │
│ └─────────────────────────────────────────┘ │
│                                             │
│ [지금 시작하기] [나중에 하기]                │
└─────────────────────────────────────────────┘
```

### **6. B2BOrderInterface 컴포넌트 (B2B 주문 인터페이스)**

#### **기업 구매자를 위한 전용 주문 시스템:**
```jsx
<B2BOrderInterface
  buyerType="hospital"
  minimumOrder={100}
  bulkDiscounts={[
    { quantity: 500, discount: 10 },
    { quantity: 1000, discount: 15 }
  ]}
  paymentTerms="NET30"
  requireDocuments={['business_license', 'medical_license']}
/>
```

#### **기업 특화 UI:**
```
┌─ 기업 구매 전용 ─────────────────────────────┐
│                                             │
│ 🏥 구매 기관: 서울대학교병원                  │
│ 📋 구매 담당: 박○○ 과장 (구매팀)             │
│ 📞 연락처: 02-2072-****                     │
│                                             │
│ 💰 대량 구매 할인                            │
│ ┌─ 수량별 할인율 ─────────────────────────┐ │
│ │ 100-499개: 기본가 (할인 없음)            │ │
│ │ 500-999개: 10% 할인 💰                  │ │
│ │ 1000개 이상: 15% 할인 🎉                │ │
│ └─────────────────────────────────────────┘ │
│                                             │
│ 📄 필수 제출 서류                            │
│ ✅ 사업자등록증 (업로드 완료)                │
│ ✅ 의료기관 개설허가증 (업로드 완료)          │
│ ⏳ 구매 담당자 위임장 (업로드 필요)           │
│                                             │
│ 💳 결제 조건                                │
│ ○ 월말 정산 (NET 30)  ○ 즉시 결제           │
│                                             │
│ [견적서 요청] [정식 주문] [담당자 연결]       │
└─────────────────────────────────────────────┘
```

---

## 📱 반응형 컴포넌트 패턴

### **Adaptive Component Pattern**

#### **화면 크기별 컴포넌트 변화:**
```jsx
const ResponsiveProductCard = ({ product, viewMode }) => {
  const isMobile = useMediaQuery('(max-width: 768px)');
  const isTablet = useMediaQuery('(max-width: 1024px)');
  
  if (isMobile) {
    return <ProductCardMobile product={product} />;
  } else if (isTablet) {
    return <ProductCardTablet product={product} />;
  } else {
    return <ProductCardDesktop product={product} />;
  }
};
```

#### **컨테이너 쿼리 기반 적응형 디자인:**
```css
.product-card {
  container-type: inline-size;
}

/* 컨테이너 너비 300px 이하 */
@container (max-width: 300px) {
  .product-card {
    flex-direction: column;
  }
  
  .product-image {
    width: 100%;
    height: 200px;
  }
  
  .product-info {
    padding: 0.5rem;
  }
}

/* 컨테이너 너비 300px 이상 */
@container (min-width: 300px) {
  .product-card {
    flex-direction: row;
  }
  
  .product-image {
    width: 120px;
    height: 120px;
  }
  
  .product-info {
    flex: 1;
    padding: 1rem;
  }
}
```

---

## 🎭 애니메이션 및 인터랙션

### **애니메이션 토큰**
```css
:root {
  /* Duration */
  --duration-instant: 0ms;
  --duration-fast: 150ms;
  --duration-normal: 250ms;
  --duration-slow: 350ms;
  --duration-slower: 500ms;
  
  /* Easing */
  --ease-in: cubic-bezier(0.4, 0, 1, 1);
  --ease-out: cubic-bezier(0, 0, 0.2, 1);
  --ease-in-out: cubic-bezier(0.4, 0, 0.2, 1);
  --ease-spring: cubic-bezier(0.175, 0.885, 0.32, 1.275);
}
```

### **신뢰도 강화 애니메이션**

#### **로딩 시 신뢰성 전달:**
```css
.trust-loading {
  animation: trust-build 2s ease-out;
}

@keyframes trust-build {
  0% {
    opacity: 0;
    transform: translateY(20px);
  }
  50% {
    opacity: 0.7;
    transform: translateY(10px);
  }
  100% {
    opacity: 1;
    transform: translateY(0);
  }
}
```

#### **정보 검증 애니메이션:**
```css
.verification-check {
  animation: verify-pulse 1.5s ease-in-out;
}

@keyframes verify-pulse {
  0%, 100% {
    transform: scale(1);
    box-shadow: 0 0 0 0 rgba(34, 197, 94, 0.4);
  }
  50% {
    transform: scale(1.05);
    box-shadow: 0 0 0 10px rgba(34, 197, 94, 0);
  }
}
```

---

## 📐 레이아웃 시스템

### **Grid System**

#### **12-Column Responsive Grid:**
```css
.o4o-grid {
  display: grid;
  grid-template-columns: repeat(12, 1fr);
  gap: var(--spacing-4);
  width: 100%;
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 var(--spacing-4);
}

.col-1 { grid-column: span 1; }
.col-2 { grid-column: span 2; }
.col-3 { grid-column: span 3; }
.col-4 { grid-column: span 4; }
.col-6 { grid-column: span 6; }
.col-8 { grid-column: span 8; }
.col-9 { grid-column: span 9; }
.col-12 { grid-column: span 12; }

/* Responsive breakpoints */
@media (max-width: 768px) {
  .col-mobile-12 { grid-column: span 12; }
  .col-mobile-6 { grid-column: span 6; }
}

@media (min-width: 769px) and (max-width: 1024px) {
  .col-tablet-8 { grid-column: span 8; }
  .col-tablet-4 { grid-column: span 4; }
}
```

### **Component Layout Patterns**

#### **Information-Dense Layout:**
```css
.info-dense-layout {
  display: grid;
  grid-template-areas:
    "header header header"
    "sidebar main aside"
    "footer footer footer";
  grid-template-columns: 250px 1fr 300px;
  grid-template-rows: auto 1fr auto;
  min-height: 100vh;
  gap: var(--spacing-4);
}

.layout-header { grid-area: header; }
.layout-sidebar { grid-area: sidebar; }
.layout-main { grid-area: main; }
.layout-aside { grid-area: aside; }
.layout-footer { grid-area: footer; }
```

---

## 🔧 상태 관리 패턴

### **Trust State Management**

#### **신뢰도 상태 타입:**
```typescript
interface TrustState {
  overall: number;          // 전체 신뢰도 점수
  verification: {
    status: 'verified' | 'pending' | 'unverified';
    expert: boolean;        // 전문가 검증 여부
    community: number;      // 커뮤니티 평점
    official: boolean;      // 공식 인증 여부
  };
  transparency: {
    infoCompleteness: number;  // 정보 완성도
    sourceQuality: number;     // 정보 출처 품질
    updateFrequency: number;   // 업데이트 빈도
  };
  track_record: {
    pastPerformance: number;   // 과거 성과
    userSatisfaction: number;  // 사용자 만족도
    issueResolution: number;   // 문제 해결률
  };
}
```

### **Information State Management**

#### **정보 상태 관리:**
```typescript
interface InformationState {
  basic: ProductBasicInfo;
  detailed: ProductDetailedInfo;
  multimedia: MediaAsset[];
  external: ExternalResource[];
  verification: VerificationData;
  userGenerated: UserContent[];
  lastUpdated: Date;
  sources: InformationSource[];
}

interface InformationSource {
  id: string;
  type: 'supplier' | 'expert' | 'user' | 'external';
  credibility: number;
  lastVerified: Date;
  url?: string;
}
```

---

## 📋 컴포넌트 사용 가이드라인

### **컴포넌트 선택 매트릭스**

| 상황 | 추천 컴포넌트 | 이유 |
|------|---------------|------|
| 제품 신뢰도 표시 | `TrustIndicator` | 일관된 신뢰도 시각화 |
| 복잡한 정보 제공 | `InformationCard` | Progressive Disclosure 지원 |
| 역할별 기능 분리 | `UserRoleSwitch` | B2B2C 모델 최적화 |
| 외부 콘텐츠 연동 | `ExternalResourceWidget` | 검증된 외부 리소스 표시 |
| 개인화 데이터 수집 | `SurveyQuizLauncher` | 타겟 마케팅 데이터 확보 |
| 기업 구매 지원 | `B2BOrderInterface` | B2B 특화 기능 제공 |

### **접근성 가이드라인**

#### **WCAG 2.1 AA 준수:**
```css
/* 색상 대비비 4.5:1 이상 */
.text-primary { color: #1f2937; } /* 대비비: 12.63:1 */
.text-secondary { color: #4b5563; } /* 대비비: 7.07:1 */

/* 포커스 표시 */
.focusable:focus {
  outline: 2px solid var(--o4o-primary-500);
  outline-offset: 2px;
}

/* 터치 타겟 최소 크기 44px */
.touch-target {
  min-width: 44px;
  min-height: 44px;
}
```

#### **스크린 리더 지원:**
```jsx
<TrustIndicator 
  score={87}
  aria-label="신뢰도 점수 87점, 매우 높음"
  role="img"
/>

<InformationCard
  title="제품 상세 정보"
  aria-expanded={isExpanded}
  aria-controls="detail-content"
/>
```

---

## 🎯 성능 최적화

### **컴포넌트 최적화 전략**

#### **Lazy Loading:**
```jsx
const TrustIndicator = lazy(() => import('./TrustIndicator'));
const InformationCard = lazy(() => import('./InformationCard'));

// 사용 시
<Suspense fallback={<TrustIndicatorSkeleton />}>
  <TrustIndicator score={score} />
</Suspense>
```

#### **메모이제이션:**
```jsx
const OptimizedProductCard = memo(({ product }) => {
  const trustScore = useMemo(() => 
    calculateTrustScore(product.verifications), 
    [product.verifications]
  );
  
  return (
    <ProductCard 
      product={product} 
      trustScore={trustScore}
    />
  );
});
```

### **번들 최적화**

#### **Tree Shaking 지원:**
```javascript
// 개별 컴포넌트 임포트
import { TrustIndicator } from '@o4o/design-system/trust';
import { InformationCard } from '@o4o/design-system/information';

// 전체 임포트 지양
// import * from '@o4o/design-system'; ❌
```

---

*이 가이드는 o4o-platform 전체의 일관된 사용자 경험을 보장하고, 개발 효율성을 극대화하기 위한 종합적인 디자인 시스템 문서입니다.*