# 역할 기반 콘텐츠 개인화 시스템 (M4)

## 개요

사용자의 `currentRole`과 **행태 신호(Behavior Signals)**를 결합하여 허브 내부 콘텐츠(피드, 배너, 공지, 추천)를 자동으로 개인화하는 시스템입니다.

## 목적

- **업무/구매 전환율 상승**: 관련성 높은 콘텐츠를 우선 노출
- **탐색 시간 단축**: 사용자가 필요한 정보를 빠르게 찾도록 지원
- **가이드 노출 최적화**: 신규 사용자 온보딩 및 교육 자료 자동 추천

## 아키텍처

### 1. 신호(Signal) 시스템

**파일**: `apps/main-site/src/services/signalTracker.ts`

#### 수집되는 신호:

**행태 신호 (BehaviorSignals)**:
- 메뉴 클릭 기록 (최근 30일)
- 카드 실행 기록
- 에러/실패 이벤트
- 미완료 작업 (주문, 재고, 캠페인)
- 세션 정보 (시작 시간, 페이지 깊이)

**상태 신호 (StateSignals)**:
- 첫 방문 여부
- 가입 후 경과일
- 온보딩 완료 여부

**기기 신호 (DeviceSignals)**:
- 모바일/데스크톱 구분
- 화면 너비
- 세션 길이

#### 데이터 저장:
- **로컬스토리지 기반** (익명, 30일 자동 삭제)
- 개인 식별 정보 저장 없음
- 사용자가 언제든지 삭제 가능

### 2. 개인화 규칙 엔진

**파일**: `apps/main-site/src/config/personalization/rules.ts`

#### 우선순위 규칙:

1. **우선순위 1: 미완료·긴급 작업**
   - 예: 출고 대기 주문이 있을 경우 해당 카드를 최상단에 고정
   - 가중치 증가: 미완료 작업 1개당 +10

2. **우선순위 2: 신규 사용자 온보딩**
   - 가입 후 7일 이내 사용자에게 가이드 카드 가중치 +30
   - 예: "판매자 시작 가이드", "트래킹 가이드"

3. **우선순위 3: 학습 기반 개인화**
   - 사용자가 반복적으로 클릭한 카드의 가중치 증가 (클릭 1회당 +5)
   - 최근 24시간 이내 행동과 관련된 카드 +20

4. **우선순위 4: 에러 관련 가이드**
   - 에러가 3회 이상 발생한 사용자에게 관련 가이드 카드 +15

#### 카드 가중치 계산 예시:

```typescript
// 기본 가중치: 100 (긴급 출고 대기 카드)
// + 미완료 주문 3건: +30
// + 최근 클릭 2회: +10
// = 총 140점 → 최우선 노출
```

### 3. 콘텐츠 맵

**파일**: `apps/main-site/src/config/personalization/content-map.ts`

#### 역할별 카드 정의:

**판매자 (Seller)**:
- 출고 대기 주문 (긴급, 가중치 100)
- 상품 등록 (액션, 가중치 50)
- 이번 주 매출 리포트 (정보, 가중치 40)
- 판매자 시작 가이드 (신규 7일, 가중치 80)
- 고객 리뷰 관리 (정보, 가중치 35)
- 재고 부족 상품 (경고, 가중치 70)

**공급자 (Supplier)**:
- 처리 대기 주문 (긴급, 가중치 100)
- 재고 경고 (긴급, 가중치 95)
- 제품 추가 (액션, 가중치 50)
- 파트너 관리 (정보, 가중치 40)
- API 통합 가이드 (신규 14일, 가중치 75)

**제휴자 (Affiliate)**:
- 이번 달 수익 (정보, 가중치 90)
- 캠페인 생성 (액션, 가중치 60)
- 트래킹 가이드 (신규 7일, 가중치 85)
- 인기 추천 상품 (정보, 가중치 55)
- 성과 분석 (정보, 가중치 45)

**고객 (Customer)**:
- 최근 주문 (정보, 가중치 80)
- 위시리스트 (정보, 가중치 50)
- 신상품 입고 (프로모션, 가중치 60)
- 적립금 (정보, 가중치 40)

#### 배너 정의:

**공통 배너**:
- 시스템 점검 안내 (우선순위 10)
- 신기능 출시 (우선순위 8)

**역할별 배너**:
- 판매자: 세금 신고 마감 (우선순위 9)
- 공급자: 계약 갱신 안내 (우선순위 7)
- 제휴자: 특별 보너스 캠페인 (우선순위 8)

### 4. 슬롯 시스템

**파일**: `apps/main-site/src/config/personalization/slots.ts`

#### 슬롯 구성:

| 슬롯 | 위치 | 최대 개수 | 표시 조건 |
|------|------|-----------|-----------|
| **Top Notice** | 상단 공지 | 1개 | 항상 표시 (콘텐츠 있을 때) |
| **Main Feed** | 메인 피드 | 6-12개 | 항상 표시 |
| **Side Suggestions** | 사이드바 | 3-4개 | 데스크톱만 표시 |
| **Bottom Banners** | 하단 배너 | 0-2개 | 콘텐츠 있을 때만 |

#### 모바일/데스크톱 조정:
- **모바일**: Main Feed 4개, Side Suggestions 숨김
- **데스크톱**: Main Feed 6개, Side Suggestions 3개

### 5. UI 컴포넌트

#### PersonalizedFeed
**파일**: `apps/main-site/src/components/personalization/PersonalizedFeed.tsx`

- 메인 카드 그리드 표시
- 스켈레톤 로딩 지원
- 카드 impression/click 이벤트 자동 추적

#### TopNotice
**파일**: `apps/main-site/src/components/personalization/TopNotice.tsx`

- 상단 공지 배너 표시
- Dismiss 기능 (로컬스토리지 저장)
- 배너 impression/click/dismissed 이벤트 추적

#### SideSuggestions
**파일**: `apps/main-site/src/components/personalization/SideSuggestions.tsx`

- 사이드바 추천 항목 표시
- 추천 클릭 이벤트 추적
- 데스크톱 전용 (lg 이상)

#### BottomBanners
**파일**: `apps/main-site/src/components/personalization/BottomBanners.tsx`

- 하단 교육/프로모션 배너 표시
- 그리드 레이아웃 (최대 2개)
- 배너 impression/click 이벤트 추적

### 6. HubLayout 통합

**파일**: `apps/main-site/src/components/layout/HubLayout.tsx`

HubLayout은 이제 개인화 슬롯을 자동으로 통합합니다:

```tsx
<HubLayout requiredRole="seller">
  {/* 자동으로 포함됨:
    - TopNotice (상단 공지)
    - PersonalizedFeed (메인 피드)
    - SideSuggestions (사이드바)
    - BottomBanners (하단 배너)
  */}
</HubLayout>
```

개인화를 비활성화하려면:
```tsx
<HubLayout requiredRole="seller" showPersonalization={false}>
  {/* M3 기본 UI로 폴백 */}
</HubLayout>
```

## 분석 이벤트

**파일**: `apps/main-site/src/utils/analytics.ts`

### 추적되는 이벤트:

| 이벤트 이름 | 설명 | 속성 |
|------------|------|------|
| `feed_loaded` | 개인화 피드 로드 | role, items, from |
| `card_impression` | 카드 노출 | role, cardId, pos |
| `card_click` | 카드 클릭 | role, cardId, pos |
| `banner_impression` | 배너 노출 | role, bannerId, type |
| `banner_click` | 배너 클릭 | role, bannerId, url |
| `suggestion_click` | 추천 클릭 | role, suggestionId, category |
| `personalization_toggled` | 개인화 ON/OFF | enabled |

### 외부 서비스 연동:
- **Google Analytics 4** (gtag.js)
- **Google Tag Manager** (dataLayer)
- **Mixpanel** (선택적)

## 개인화 설정

**파일**: `apps/main-site/src/components/settings/PersonalizationSettings.tsx`

### 사용자 제어 옵션:

1. **개인화 활성화/비활성화**
   - 전체 개인화 시스템 ON/OFF
   - 비활성화 시 모든 행동 데이터 삭제

2. **행동 데이터 수집**
   - 메뉴 클릭, 카드 실행 등의 행동 기록
   - 독립적으로 ON/OFF 가능

3. **추천 표시**
   - 사이드바 추천 및 관련 콘텐츠 표시
   - 독립적으로 ON/OFF 가능

### 개인정보 보호:
- 수집된 데이터는 익명으로 처리
- 개인 식별 정보 저장 없음
- 데이터는 최대 30일간 보존
- 언제든지 삭제 요청 가능

## API (선택적 확장)

현재는 클라이언트 기반 개인화이지만, 필요 시 서버 API로 확장 가능:

### 제안 엔드포인트:

```
GET /api/content/feed?role=seller
→ 서버에서 개인화된 피드 반환 (캐싱 가능)

POST /api/content/track
→ 행동 데이터 서버로 전송 (집계/분석용)
```

## QA 체크리스트

### 기능 테스트

- [ ] 각 허브에서 개인화 슬롯이 사양대로 표시 (Top/Feed/Side/Bottom)
- [ ] 미완료 작업이 있을 때 긴급 카드가 최상단에 표시
- [ ] 신규 사용자 (가입 7일 이내)에게 온보딩 카드 우선 노출
- [ ] 역할 전환 시 피드가 자동으로 재구성 (리로드 없이)
- [ ] 모바일에서 사이드 추천이 숨겨지고 피드만 표시
- [ ] 데스크톱에서 사이드 추천이 정상 표시

### 이벤트 테스트

- [ ] `feed_loaded` 이벤트가 피드 로드 시 전송
- [ ] `card_impression` 이벤트가 카드 노출 시 전송 (각 카드별)
- [ ] `card_click` 이벤트가 카드 클릭 시 전송
- [ ] `banner_impression` 이벤트가 배너 표시 시 전송
- [ ] `banner_click` 이벤트가 배너 클릭 시 전송
- [ ] `suggestion_click` 이벤트가 추천 클릭 시 전송

### 개인화 설정 테스트

- [ ] 개인화 ON/OFF 토글 정상 동작
- [ ] 개인화 OFF 시 모든 행동 데이터 삭제 확인
- [ ] 개인화 OFF 후 디폴트 구성으로 표시
- [ ] 행동 데이터 수집 OFF 시 신호 수집 중단
- [ ] 추천 표시 OFF 시 사이드바 추천 숨김

### 행동 학습 테스트

- [ ] 카드 클릭 후 다음 방문 시 해당 카드의 우선순위 상승
- [ ] 메뉴 5회 이상 클릭 후 온보딩 완료로 표시
- [ ] 30일 이상 된 행동 데이터 자동 삭제

### 접근성 테스트

- [ ] 키보드 포커스 순서 정상
- [ ] 스크린리더 레이블 적용
- [ ] 스켈레톤 로딩 표시 1초 이내

### 성능 테스트

- [ ] 최초 페인트 1초 이내
- [ ] 피드 생성 100ms 이내
- [ ] 역할 전환 시 UI 리컴포지션 지연 없음
- [ ] 메모리 누수 없음

## 사용 예시

### 1. 허브 페이지에서 개인화 적용

```tsx
// apps/main-site/src/pages/hubs/SellerHub.tsx
import { HubLayout } from '../../components/layout/HubLayout';
import { PersonalizedFeed } from '../../components/personalization/PersonalizedFeed';
import { generatePersonalizedFeed } from '../../services/personalizationService';

export const SellerHub: React.FC = () => {
  const { user } = useAuth();
  const [feed, setFeed] = useState(null);

  useEffect(() => {
    const personalizedFeed = generatePersonalizedFeed(
      user.currentRole,
      user.roles,
      user.createdAt
    );
    setFeed(personalizedFeed);
  }, [user]);

  return (
    <HubLayout requiredRole="seller">
      <PersonalizedFeed cards={feed.mainCards} role="seller" />
    </HubLayout>
  );
};
```

### 2. 행동 추적

```tsx
import { trackMenuClick, trackCardExecution } from '../../services/signalTracker';

// 메뉴 클릭 시
const handleMenuClick = (menuId: string) => {
  trackMenuClick(menuId);
};

// 카드 실행 시
const handleCardClick = (cardId: string) => {
  trackCardExecution(cardId);
};
```

### 3. 미완료 작업 업데이트

```tsx
import { updatePendingTasks } from '../../services/signalTracker';

// 주문 데이터 로드 후
useEffect(() => {
  updatePendingTasks({
    orders: pendingOrderCount,
    inventory: lowStockCount
  });
}, [pendingOrderCount, lowStockCount]);
```

## 확장 가능성

### A/B 테스트
- 규칙 가중치를 실험군으로 분기
- 슬롯 배치 변경 테스트
- 배너 카피 A/B 테스트

### 서버 API 통합
- `/content/feed?role=SELLER` 엔드포인트 추가
- 서버에서 더 복잡한 ML 모델 적용
- Redis 캐싱으로 성능 향상

### 크로스 디바이스 동기화
- 사용자 계정에 행동 데이터 동기화
- 모바일 앱과 웹 간 개인화 일관성 유지

## 배포 및 롤아웃

### 1차: 내부 사용자 10%
- Feature Flag로 개인화 활성화
- 에러 및 지표 모니터링

### 2차: 50% 롤아웃
- 1주일 안정화 기간

### 전량 배포
- 모든 사용자에게 개인화 활성화
- 이슈 시 플래그 단일 토글로 즉시 롤백

## 트러블슈팅

### 문제: 개인화 피드가 표시되지 않음
**해결**:
1. 브라우저 콘솔에서 `localStorage.getItem('o4o_personalization_settings')` 확인
2. `enabled: false`면 개인화 설정에서 활성화
3. 페이지 새로고침

### 문제: 이벤트가 전송되지 않음
**해결**:
1. 브라우저 콘솔에서 `[Analytics]` 로그 확인 (개발 환경)
2. gtag.js 스크립트 로드 확인
3. Ad Blocker 비활성화 테스트

### 문제: 30일 전 데이터가 남아있음
**해결**:
1. `localStorage.clear()` 수동 실행
2. 또는 개인화 설정에서 비활성화 후 재활성화

## 작성자

- **작성일**: 2025-10-30
- **버전**: 1.0.0
- **커밋**: M4 - Role & Behavior-aware Content Personalization

---

**관련 문서**:
- [M3 - Role-based Navigation](./ROLE_BASED_NAVIGATION.md)
- [Analytics Events](./ANALYTICS_EVENTS.md)
