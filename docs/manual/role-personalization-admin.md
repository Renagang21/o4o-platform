# 역할 기반 개인화 시스템 관리자 매뉴얼

## 목차

1. [개요](#개요)
2. [시스템 구조](#시스템-구조)
3. [개인화 설정 관리](#개인화-설정-관리)
4. [콘텐츠 관리](#콘텐츠-관리)
5. [분석 및 모니터링](#분석-및-모니터링)
6. [문제 해결](#문제-해결)
7. [사용자 지원](#사용자-지원)

---

## 개요

### 개인화 시스템이란?

역할 기반 개인화 시스템은 사용자의 **역할(Role)**과 **행동 패턴(Behavior)**을 분석하여 각 사용자에게 최적화된 콘텐츠를 자동으로 제공하는 시스템입니다.

### 주요 목표

- ✅ **업무 효율 향상**: 사용자가 자주 사용하는 기능을 우선 노출
- ✅ **전환율 증가**: 미완료 작업 자동 알림으로 업무 완료율 상승
- ✅ **온보딩 최적화**: 신규 사용자에게 가이드 자동 제공
- ✅ **탐색 시간 단축**: 개인화된 추천으로 필요한 정보 빠르게 찾기

### 지원 역할

| 역할 | 설명 | 주요 기능 |
|------|------|-----------|
| **Customer** | 일반 고객 | 주문 내역, 위시리스트, 적립금 |
| **Seller** | 판매자 | 상품 관리, 주문 처리, 매출 분석 |
| **Supplier** | 공급자 | 재고 관리, 파트너 주문, 발주 |
| **Affiliate** | 제휴자 | 캠페인 관리, 수익 현황, 링크 생성 |

---

## 시스템 구조

### 1. 신호(Signal) 수집

시스템은 다음 신호들을 수집하여 개인화에 활용합니다:

#### 행태 신호 (Behavior Signals)
- **메뉴 클릭 기록**: 사용자가 자주 사용하는 메뉴 추적
- **카드 실행 기록**: 대시보드 카드 클릭 빈도
- **에러 발생 기록**: 문제가 발생한 영역 파악
- **미완료 작업**: 처리 대기 중인 주문, 재고 경고 등

#### 상태 신호 (State Signals)
- **첫 방문 여부**: 신규 사용자 판별
- **가입 후 경과일**: 온보딩 기간 판단 (0-7일)
- **온보딩 완료 여부**: 기본 기능 사용 경험 확인

#### 기기 신호 (Device Signals)
- **모바일/데스크톱**: 기기별 최적화
- **화면 크기**: 슬롯 배치 조정
- **세션 시간**: 사용 패턴 분석

### 2. 개인화 슬롯

| 슬롯 이름 | 위치 | 개수 | 표시 조건 |
|-----------|------|------|-----------|
| **Top Notice** | 페이지 상단 | 1개 | 긴급 공지 있을 때 |
| **Main Feed** | 메인 영역 | 6-12개 | 항상 표시 |
| **Side Suggestions** | 오른쪽 사이드바 | 3-4개 | 데스크톱만 |
| **Bottom Banners** | 페이지 하단 | 0-2개 | 프로모션 있을 때 |

### 3. 우선순위 규칙

개인화 시스템은 다음 순서로 콘텐츠 우선순위를 결정합니다:

#### 우선순위 1: 긴급 작업 (가중치 +10~+30)
```
예시: 출고 대기 주문 3건 → 가중치 +30
→ 최상단에 "출고 대기 주문" 카드 노출
```

#### 우선순위 2: 신규 사용자 온보딩 (가중치 +30)
```
예시: 가입 후 3일차 판매자
→ "판매자 시작 가이드" 카드 상단 노출
```

#### 우선순위 3: 행동 학습 (가중치 +5/클릭)
```
예시: "매출 리포트" 카드를 5회 클릭
→ 다음 방문 시 해당 카드 가중치 +25
```

#### 우선순위 4: 에러 관련 가이드 (가중치 +15)
```
예시: 상품 등록 실패 3회 이상
→ "상품 등록 가이드" 카드 우선 노출
```

---

## 개인화 설정 관리

### 전역 설정

#### 1. 개인화 시스템 ON/OFF

**경로**: 시스템 관리 > 개인화 설정

```
[ ] 개인화 시스템 활성화
    - 활성화: 모든 사용자에게 개인화 적용
    - 비활성화: 기본 UI로 폴백
```

#### 2. 데이터 보존 기간

**기본값**: 30일
**권장값**: 30-90일

```
신호 데이터 보존 기간: [30] 일

⚠️ 주의: 기간 단축 시 개인화 정확도 하락
```

#### 3. 슬롯 설정

**경로**: 시스템 관리 > 슬롯 설정

```yaml
Main Feed:
  - 최소 개수: 3개
  - 기본 개수: 6개 (데스크톱) / 4개 (모바일)
  - 최대 개수: 12개

Side Suggestions:
  - 기본 개수: 3개
  - 표시 조건: 데스크톱 (1024px 이상)

Bottom Banners:
  - 최대 개수: 2개
  - 표시 조건: 콘텐츠 있을 때만
```

### 역할별 설정

#### 판매자(Seller) 설정 예시

**우선 노출 카드**:
1. 출고 대기 주문 (긴급) - 가중치 100
2. 재고 부족 상품 (경고) - 가중치 70
3. 판매자 시작 가이드 (신규 7일) - 가중치 80
4. 상품 등록 (액션) - 가중치 50
5. 이번 주 매출 리포트 (정보) - 가중치 40
6. 고객 리뷰 관리 (정보) - 가중치 35

**설정 위치**: `apps/main-site/src/config/personalization/content-map.ts`

```typescript
export const SELLER_CARDS: ContentCard[] = [
  {
    id: 'seller-pending-orders',
    type: 'warning',
    title: '출고 대기 주문',
    baseWeight: 100,
    conditions: {
      roles: ['seller'],
      requiresPendingTasks: true
    }
  },
  // ... 추가 카드
];
```

---

## 콘텐츠 관리

### 1. 카드 추가하기

#### Step 1: 카드 정의

**파일**: `apps/main-site/src/config/personalization/content-map.ts`

```typescript
{
  id: 'seller-new-feature',           // 고유 ID
  type: 'info',                        // 타입: action/guide/promotion/warning/info
  title: '신기능 소개',                // 제목
  description: '새로운 기능을 사용해보세요', // 설명
  icon: 'Sparkles',                    // Lucide 아이콘 이름
  badge: {
    text: '신규',
    variant: 'new'                     // urgent/new/warning/info
  },
  action: {
    label: '자세히 보기',
    url: '/seller/features/new',       // 링크
    variant: 'primary'                 // primary/secondary
  },
  conditions: {
    roles: ['seller'],                 // 표시할 역할
    maxDaysSinceSignup: 14             // 가입 후 14일 이내만 표시
  },
  baseWeight: 60                       // 기본 가중치 (높을수록 우선)
}
```

#### Step 2: 배열에 추가

```typescript
export const SELLER_CARDS: ContentCard[] = [
  // ... 기존 카드들
  {
    id: 'seller-new-feature',
    // ... (위 정의)
  }
];
```

#### Step 3: 배포

```bash
cd /home/dev/o4o-platform/apps/main-site
pnpm run build
# 배포 스크립트 실행 또는 git push
```

### 2. 배너 추가하기

#### 공통 배너 (모든 역할)

**파일**: `apps/main-site/src/config/personalization/content-map.ts`

```typescript
export const COMMON_BANNERS: Banner[] = [
  {
    id: 'maintenance-notice',
    type: 'system',                    // system/notice/promotion/guide
    title: '시스템 점검 안내',
    message: '2025년 11월 5일 02:00-04:00 정기 점검 예정',
    variant: 'info',                   // info/warning/success/error
    dismissible: true,                 // 사용자가 닫을 수 있는지
    action: {
      label: '자세히 보기',
      url: '/announcements/maintenance'
    },
    conditions: {
      priority: 10,                    // 우선순위 (1-10, 높을수록 우선)
      startDate: '2025-11-01',         // 노출 시작일
      endDate: '2025-11-05'            // 노출 종료일
    }
  }
];
```

#### 역할별 배너

```typescript
export const ROLE_BANNERS: Record<string, Banner[]> = {
  seller: [
    {
      id: 'seller-promotion',
      type: 'promotion',
      title: '수수료 할인 이벤트',
      message: '이번 달 판매 수수료 20% 할인!',
      variant: 'success',
      dismissible: true,
      action: {
        label: '이벤트 참여',
        url: '/seller/promotions/fee-discount'
      },
      conditions: {
        roles: ['seller'],
        priority: 8,
        startDate: '2025-11-01',
        endDate: '2025-11-30'
      }
    }
  ]
};
```

### 3. 추천(Suggestions) 관리

#### 역할별 추천 항목

**파일**: `apps/main-site/src/config/personalization/content-map.ts`

```typescript
export const ROLE_SUGGESTIONS: Record<string, Suggestion[]> = {
  seller: [
    {
      id: 'seller-bulk-upload',
      title: '대량 업로드',
      description: 'CSV로 상품 일괄 등록',
      icon: 'Upload',
      url: '/seller/products/bulk-upload',
      category: 'tool',                // tool/doc/shortcut/feature
      weight: 50                       // 가중치 (높을수록 우선)
    },
    {
      id: 'seller-sales-guide',
      title: '판매 가이드',
      description: '매출 향상 팁',
      icon: 'BookOpen',
      url: '/seller/guide',
      category: 'doc',
      weight: 40
    }
  ]
};
```

---

## 분석 및 모니터링

### 1. 추적되는 이벤트

#### 개인화 피드 관련

| 이벤트 이름 | 설명 | 주요 속성 |
|------------|------|-----------|
| `feed_loaded` | 피드 로드 완료 | role, items, from |
| `card_impression` | 카드 노출 | role, cardId, pos |
| `card_click` | 카드 클릭 | role, cardId, pos |

#### 배너 관련

| 이벤트 이름 | 설명 | 주요 속성 |
|------------|------|-----------|
| `banner_impression` | 배너 노출 | role, bannerId, type |
| `banner_click` | 배너 클릭 | role, bannerId, url |
| `banner_dismissed` | 배너 닫기 | role, bannerId |

#### 설정 관련

| 이벤트 이름 | 설명 | 주요 속성 |
|------------|------|-----------|
| `personalization_toggled` | 개인화 ON/OFF | enabled |

### 2. Google Analytics 확인

**경로**: Google Analytics > 이벤트

```
1. GA4 대시보드 접속
2. 이벤트 > 모든 이벤트 선택
3. "feed_loaded" 검색
4. 이벤트 매개변수 확인:
   - role: 사용자 역할
   - items: 표시된 카드 수
   - from: 소스 (rules/api/default)
```

### 3. 주요 지표

#### 개인화 효과 측정

```
지표 1: 카드 클릭률 (CTR)
= (card_click / card_impression) × 100

목표: 15% 이상

지표 2: 미완료 작업 완료율
= (완료된 긴급 작업 / 전체 긴급 작업) × 100

목표: 70% 이상

지표 3: 온보딩 완료율
= (가이드 카드 클릭 사용자 / 신규 사용자) × 100

목표: 60% 이상
```

#### 대시보드 예시

```
┌─────────────────────────────────────────┐
│  개인화 성과 대시보드                    │
├─────────────────────────────────────────┤
│  이번 주 피드 로드:        12,345회     │
│  카드 클릭률:              18.5% ▲      │
│  배너 클릭률:              8.2% ▲       │
│  긴급 작업 완료율:         75% ▲        │
│  신규 사용자 온보딩:       65% ▲        │
└─────────────────────────────────────────┘
```

---

## 문제 해결

### 문제 1: 개인화 피드가 표시되지 않음

**증상**: 허브 페이지에서 카드가 보이지 않음

**원인 및 해결**:

1. **개인화 비활성화 확인**
   ```
   해결: 브라우저 개발자 도구 > Console
   → localStorage.getItem('o4o_personalization_settings')
   → enabled: true 확인
   ```

2. **빌드 오류 확인**
   ```bash
   cd /home/dev/o4o-platform/apps/main-site
   pnpm run type-check
   pnpm run build
   ```

3. **로그 확인**
   ```
   브라우저 Console에서 [Analytics] 로그 확인
   feed_loaded 이벤트가 발생하는지 체크
   ```

### 문제 2: 긴급 카드가 최상단에 표시되지 않음

**증상**: 미완료 작업이 있는데 관련 카드가 하단에 표시

**원인 및 해결**:

1. **미완료 작업 업데이트 확인**
   ```typescript
   // 코드에서 updatePendingTasks 호출 확인
   import { updatePendingTasks } from '../../services/signalTracker';

   updatePendingTasks({
     orders: pendingOrderCount,  // 실제 값 전달 확인
     inventory: lowStockCount
   });
   ```

2. **카드 조건 확인**
   ```typescript
   // content-map.ts에서 조건 확인
   conditions: {
     requiresPendingTasks: true  // ← 이 조건이 있어야 함
   }
   ```

### 문제 3: 역할 전환 시 피드가 변경되지 않음

**증상**: 역할을 바꿔도 같은 카드가 표시됨

**원인 및 해결**:

1. **HubLayout useEffect 의존성 확인**
   ```typescript
   useEffect(() => {
     if (showPersonalization && user) {
       const feed = generatePersonalizedFeed(
         currentRole,
         user.roles || [currentRole],
         user.createdAt
       );
       setPersonalizedFeed(feed);
     }
   }, [currentRole, user, showPersonalization]); // ← currentRole 의존성 필수
   ```

2. **브라우저 캐시 삭제**
   ```
   Ctrl + Shift + R (강제 새로고침)
   또는 개발자 도구 > Application > Local Storage > Clear
   ```

### 문제 4: 이벤트가 Google Analytics에 전송되지 않음

**증상**: GA4에서 이벤트 확인 안 됨

**원인 및 해결**:

1. **gtag.js 스크립트 로드 확인**
   ```html
   <!-- index.html에 포함되어 있는지 확인 -->
   <script async src="https://www.googletagmanager.com/gtag/js?id=G-XXXXXXXX"></script>
   ```

2. **Ad Blocker 확인**
   ```
   Ad Blocker 비활성화 후 테스트
   ```

3. **개발 환경 로그 확인**
   ```
   브라우저 Console에서 [Analytics] 접두사로 이벤트 로그 확인
   ```

---

## 사용자 지원

### 1. 사용자 문의 대응

#### 질문 1: "개인화가 뭔가요?"

**답변 템플릿**:
```
개인화는 귀하의 사용 패턴을 학습하여
자주 사용하는 기능과 필요한 정보를
자동으로 우선 표시하는 기능입니다.

예를 들어:
- 미처리 주문이 있으면 최상단에 알림
- 자주 클릭하는 메뉴를 추천에 표시
- 신규 사용자에게 가이드 자동 제공

언제든지 설정 > 개인화에서 비활성화 가능합니다.
```

#### 질문 2: "내 데이터가 저장되나요?"

**답변 템플릿**:
```
개인화를 위해 수집되는 데이터는 다음과 같습니다:

✅ 수집되는 것:
- 메뉴 클릭 횟수 (익명)
- 카드 실행 기록 (익명)
- 가입 후 경과 일수

❌ 수집되지 않는 것:
- 개인 식별 정보
- 주문 내역, 결제 정보
- 민감한 개인정보

• 데이터는 브라우저에만 저장 (서버 전송 없음)
• 30일 후 자동 삭제
• 언제든지 삭제 가능 (설정 > 개인화 > 비활성화)
```

#### 질문 3: "개인화를 끄고 싶어요"

**답변 템플릿**:
```
개인화를 비활성화하는 방법:

1. 헤더 > 프로필 아이콘 클릭
2. "설정" 메뉴 선택
3. "개인화" 탭 클릭
4. "개인화 활성화" 토글 OFF

⚠️ 주의: 비활성화 시 저장된 모든 행동 데이터가 삭제되며,
기본 UI로 표시됩니다.
```

### 2. FAQ

**Q1. 개인화를 끄면 기능이 제한되나요?**
```
A. 아니요, 모든 기능은 동일하게 사용 가능합니다.
   단, 자주 사용하는 항목이 자동으로 우선 표시되지 않습니다.
```

**Q2. 다른 기기에서도 개인화가 적용되나요?**
```
A. 현재는 각 기기별로 독립적으로 작동합니다.
   향후 계정 기반 동기화를 지원할 예정입니다.
```

**Q3. 개인화 학습은 얼마나 걸리나요?**
```
A. 즉시 적용됩니다:
   - 미완료 작업: 실시간 반영
   - 클릭 학습: 1회 클릭부터 적용
   - 온보딩: 가입 즉시 적용
```

**Q4. 개인화 데이터를 백업할 수 있나요?**
```
A. 로컬스토리지 기반이므로 브라우저 내에서만 관리됩니다.
   계정 기반 백업은 향후 지원 예정입니다.
```

### 3. 고급 사용자 설정

#### 개인화 강도 조절 (향후 기능)

```typescript
// 관리자용 고급 설정
{
  urgentTaskBoost: 10,        // 긴급 작업 가중치 배수 (기본: 10)
  onboardingBoost: 30,        // 온보딩 가중치 배수 (기본: 30)
  clickLearningRate: 5,       // 클릭 학습 가중치 (기본: 5)
  errorGuideBoost: 15         // 에러 가이드 가중치 (기본: 15)
}
```

---

## 배포 가이드

### 1. 개인화 콘텐츠 업데이트

```bash
# 1. 콘텐츠 수정
cd /home/dev/o4o-platform/apps/main-site
vi src/config/personalization/content-map.ts

# 2. 타입 체크
pnpm run type-check

# 3. 빌드
pnpm run build

# 4. 커밋
git add .
git commit -m "feat(personalization): update content cards"

# 5. 배포
git push origin main
# 또는 수동 배포 스크립트 실행
./scripts/deploy-main-site.sh
```

### 2. 롤백 절차

#### 긴급 롤백 (개인화 전체 비활성화)

```typescript
// apps/main-site/src/components/layout/HubLayout.tsx
export const HubLayout: React.FC<HubLayoutProps> = ({
  requiredRole,
  children,
  showPersonalization = false  // ← true를 false로 변경
}) => {
  // ...
};
```

#### 특정 카드만 비활성화

```typescript
// content-map.ts에서 해당 카드 제거 또는 조건 수정
{
  id: 'problematic-card',
  // ...
  conditions: {
    roles: [],  // ← 빈 배열로 설정하면 표시 안 됨
  }
}
```

---

## 부록

### A. 파일 구조

```
apps/main-site/src/
├── types/
│   └── personalization.ts              # 타입 정의
├── services/
│   ├── signalTracker.ts                # 신호 수집
│   └── personalizationService.ts       # 피드 생성
├── config/personalization/
│   ├── content-map.ts                  # 콘텐츠 정의
│   ├── rules.ts                        # 규칙 엔진
│   ├── slots.ts                        # 슬롯 설정
│   └── index.ts                        # 통합 export
├── components/personalization/
│   ├── PersonalizedFeed.tsx            # 메인 피드
│   ├── TopNotice.tsx                   # 상단 공지
│   ├── SideSuggestions.tsx             # 사이드 추천
│   └── BottomBanners.tsx               # 하단 배너
└── components/settings/
    └── PersonalizationSettings.tsx     # 사용자 설정
```

### B. 용어 사전

| 용어 | 설명 |
|------|------|
| **Signal** | 개인화에 사용되는 사용자 행동 데이터 |
| **Weight** | 콘텐츠 우선순위를 결정하는 가중치 |
| **Slot** | 콘텐츠가 표시되는 영역 (Top/Main/Side/Bottom) |
| **Feed** | 개인화된 카드 목록 |
| **Card** | 개별 콘텐츠 항목 (액션, 가이드, 프로모션 등) |
| **Banner** | 공지 또는 프로모션 배너 |
| **Suggestion** | 사이드바 추천 항목 |

### C. 관련 문서

- [기술 문서](../../ROLE_PERSONALIZATION.md)
- [역할 기반 네비게이션](../../ROLE_BASED_NAVIGATION.md)
- [분석 이벤트 가이드](../../ANALYTICS_EVENTS.md)

---

**문서 버전**: 1.0.0
**작성일**: 2025-10-30
**최종 수정일**: 2025-10-30
**담당자**: 개발팀

---

**지원 문의**: support@o4o-platform.com
**기술 문의**: tech@o4o-platform.com
