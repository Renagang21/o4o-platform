# o4o 플랫폼 공통 패턴 발견 보고서 (v0.1)

> **조사 일시**: 2026-01-10
> **조사 대상**: K-Cosmetics, GlycoPharm
> **조사 목적**: 플랫폼 공통 구조 식별 및 서비스별 차별화 포인트 발견
> **조사 방법**: 동일 렌즈(B안+C안) 적용, KEEP/RELOCATE/REINTERPRET 분류

---

## 1. 조사 개요

### 조사 전제
- **주축(B)**: 각 서비스는 허브 역할을 한다 (연결의 중심)
- **보완(C)**: 운영자가 큐레이션하는 쇼케이스
- 판단이 아닌 **식별**이 목적

### 조사 대상 서비스

| 서비스 | 도메인 | 허브 축 |
|--------|--------|---------|
| **K-Cosmetics** | K-Beauty 드랍쉬핑 매장 플랫폼 | 관광객·콘텐츠·매장 연결 |
| **GlycoPharm** | 혈당관리 전문 약국 플랫폼 | 약국·환자·CGM 데이터 연결 |

---

## 2. 발견된 공통 패턴 (Structure Pattern)

### 패턴 1: 홈 화면 7단 구조

**두 서비스 모두 동일한 구조를 따름**:

```
1. HeroSection (슬라이더)
2. QuickActionSection (3개 카드)
3. NowRunningSection (3개 카드)
4. [허브 서비스] 독립 섹션 ← ⚠️
5. NoticeSection
6. CTASection (비로그인 유저용)
7. PartnerTrustSection
```

**공통점**:
- Hero: 4개 슬라이드 (플랫폼 소개 + 핵심 기능 + 허브 축 + 신뢰)
- QuickAction: 3개 카드 (운영 도구)
- NowRunning: 3개 카드 (type 뱃지 시스템)
- 독립 섹션: 대형 그라데이션 카드 (허브 서비스 강조)
- Notice: isPinned 기능
- CTA: 조건부 렌더링 (isAuthenticated 체크)
- Partner: type 기반 스타일 분기 (association/supplier/partner)

---

### 패턴 2: "연계 서비스" 독립 섹션 문제

**K-Cosmetics**:
```tsx
TouristServiceSection
  - 위치: 4번째 섹션
  - 제목: "연계 서비스"
  - 내용: "외국인 관광객을 매장으로 연결해드립니다"
  - 크기: 대형 그라데이션 카드 (padding: 32px)
```

**GlycoPharm**:
```tsx
CGMServiceSection
  - 위치: 4번째 섹션
  - 제목: "연계 서비스"
  - 내용: "CGM 데이터 요약을 기반으로 환자에게 맞춤형 제품을 추천하세요"
  - 크기: 대형 그라데이션 카드 (padding: 24-32px)
```

**공통 문제**:
1. **위상 모호**: 허브 핵심 축인데 "연계 서비스"로 부가 기능처럼 표현
2. **고립**: QuickAction/NowRunning과 격리됨
3. **설명 과잉**: 독립 페이지가 있는데 홈에서 재설명
4. **출발점 아님**: "~해드립니다" 톤 (설명서)

**식별 결과**: ☑️ **RELOCATE + REINTERPRET** (두 서비스 모두)

---

### 패턴 3: QuickActionCard 구조

**K-Cosmetics**:
```tsx
interface QuickActionCard {
  icon: string;           // 이모지
  title: string;          // 영문
  subtitle: string;       // 한글
  description: string;
  link: string;
  color: string;
  status: { label: string; value: number };
}

카드 3개: Products, Market Trial, Orders
```

**GlycoPharm**:
```tsx
interface QuickActionCard {
  icon: LucideIcon;       // Lucide React 아이콘
  title: string;
  subtitle: string;
  description: string;
  link: string;
  color: string;          // Tailwind class
  status: { label: string; value: number | string };
}

카드 3개: Signage, Market Trial, Forum
```

**공통점**:
- title/subtitle/description 3단 구조
- status 숫자 표시 (KPI)
- 카드 개수: **3개로 고정**
- 우측 상단 숫자 강조

**차이점**:
- K-Cosmetics: 이모지 아이콘 + inline styles + 16진수 색상
- GlycoPharm: Lucide 아이콘 + Tailwind + className

**식별 결과**: ☑️ **KEEP** (구조 우수)
**주의**: status.value 숫자 KPI는 "홈은 통계 ❌" 원칙과 충돌

---

### 패턴 4: NowRunning 타입 뱃지 시스템

**K-Cosmetics**:
```tsx
type: 'trial' | 'event' | 'campaign' | 'product'

타입별 뱃지:
  trial: 🎯 Trial (green)
  product: ✨ 신상품 (orange)
  event: 🎉 이벤트 (blue)
  campaign: 📢 캠페인 (purple)
```

**GlycoPharm**:
```tsx
type: 'trial' | 'event' | 'campaign'

타입별 뱃지:
  trial: Tag 아이콘 + Trial (green)
  event: Sparkles 아이콘 + 이벤트 (blue)
  campaign: Calendar 아이콘 + 캠페인 (purple)
```

**공통점**:
- type 기반 자동 뱃지 생성
- 색상 매핑 (trial=green, event=blue, campaign=purple)
- deadline 표시
- participants 숫자 (사회적 증거)

**차이점**:
- K-Cosmetics: 이모지 + type: 'product' 추가
- GlycoPharm: Lucide 아이콘

**식별 결과**: ☑️ **KEEP + REUSE 후보**

**확장 가능성**:
- K-Cosmetics: `type: 'content'` 추가 (관광객용 콘텐츠)
- GlycoPharm: `type: 'cgm-event'` 추가 (GlucoseView 연계)

---

### 패턴 5: Hero 슬라이더 메시지 패턴

**K-Cosmetics**:
```
Slide 1: "K-Beauty Store를 위한 운영 플랫폼"
Slide 2: "신상품 Market Trial 참여 매장 모집 중"
Slide 3: "외국인 관광객을 위한 검증된 매장 네트워크"
Slide 4: "다수 매장·다수 브랜드가 함께하는 K-Beauty 플랫폼"
```

**GlycoPharm**:
```
Slide 1: "혈당관리 약국을 위한 운영 플랫폼"
Slide 2: "신제품 Market Trial 참여 약국 모집 중"
Slide 3: "CGM 데이터 요약 기반 설명·판매 지원"
Slide 4: "다수 약국·다수 기업이 함께하는 세미 프랜차이즈 플랫폼"
```

**공통 패턴**:
1. **Slide 1**: 플랫폼 정체성 (고정)
2. **Slide 2**: Market Trial (공통 기능)
3. **Slide 3**: 허브 축 소개 (서비스별 차별화)
4. **Slide 4**: 신뢰/규모 강조 (고정)

**발견**:
- Slide 1, 4: **거의 동일** (플랫폼 소개)
- Slide 2: **완전 동일** (Market Trial)
- Slide 3: **차별화 포인트** (허브 축)

**식별 결과**: ☑️ **REINTERPRET**
- 현재: 플랫폼 소개 (고정 메시지)
- 제안: 상태 쇼케이스 (동적 메시지)

---

### 패턴 6: 운영자 큐레이션 요소

**공통 요소**:
1. **NowRunning 섹션**: "지금 참여 가능한 프로그램"
2. **NoticeSection**: isPinned 기능 (운영자 판단)
3. **PartnerTrustSection**: 운영자 선정 브랜드/기관

**차이점**:

| 요소 | K-Cosmetics | GlycoPharm |
|------|-------------|------------|
| Partner 1순위 | COSRX (브랜드) | 한국당뇨협회 (협회) |
| 큐레이션 톤 | 브랜드 큐레이션 | 협회 신뢰 강조 |
| Notice 주제 | 플랫폼 오픈, Trial 가이드 | 서비스 업데이트, Trial 가이드 |

**식별 결과**: ☑️ **KEEP** (구조 우수, 톤 적절)

---

## 3. 발견된 차별화 패턴 (Differentiation Pattern)

### 차별화 1: 허브 축의 성격

| 서비스 | 허브 축 | 연결 대상 | 흐름 |
|--------|---------|-----------|------|
| **K-Cosmetics** | Tourist Service | 관광객 ↔ 콘텐츠 ↔ 매장 | 양방향 |
| **GlycoPharm** | CGM Service (GlucoseView) | 약국 ↔ CGM 데이터 ↔ 환자 | 양방향 |

**공통점**:
- **3자 연결** 구조
- 외부 서비스 연계 (GlucoseView / 관광객 플랫폼)
- 데이터/정보를 중심으로 연결

**차이점**:
- K-Cosmetics: B2C 중심 (관광객 → 매장)
- GlycoPharm: B2C + 데이터 중심 (환자 → 약국, CGM 데이터 활용)

---

### 차별화 2: 콘텐츠의 역할

| 서비스 | 콘텐츠 | 역할 | 위치 |
|--------|--------|------|------|
| **K-Cosmetics** | ❌ 없음 | - | - |
| **GlycoPharm** | Signage (TV 콘텐츠) | 환자 교육 + 판매 도구 | QuickActionCard 1번째 |

**발견**:
- K-Cosmetics: 콘텐츠 축 부재 → NowRunning type 확장 필요
- GlycoPharm: 콘텐츠가 **일상 도구**로 배치됨 (적절)

---

### 차별화 3: QuickActionCard 도메인 차이

| 순서 | K-Cosmetics | GlycoPharm |
|------|-------------|------------|
| 1번째 | Products (상품 관리) | Signage (콘텐츠 라이브러리) |
| 2번째 | Market Trial | Market Trial |
| 3번째 | Orders (B2B 주문) | Forum (약사 커뮤니티) |

**공통점**: Market Trial은 **플랫폼 공통 기능**

**차이점**:
- K-Cosmetics: 상품/주문 중심 (전자상거래)
- GlycoPharm: 콘텐츠/커뮤니티 중심 (전문성)

---

## 4. 공통 문제점 요약

### 문제 1: "연계 서비스" 독립 섹션

**두 서비스 모두 동일한 문제**:
- 허브 핵심 축이 부가 기능처럼 보임
- 독립 섹션으로 격리 → 흐름 단절
- 설명 과잉 (독립 페이지 존재)

**해결 방향** (공통):
1. 독립 섹션 제거
2. QuickActionCard 4번째로 이동
3. 카테고리명 변경 ("연계 서비스" → "관광객 허브" / "CGM 데이터 허브")

---

### 문제 2: Hero 슬라이더 의미

**두 서비스 모두 동일한 문제**:
- 플랫폼 소개에 머무름 (고정 메시지)
- "지금의 흐름" 부재
- 운영자 큐레이션 느낌 약함

**해결 방향** (공통):
1. Slide 1: 플랫폼 정체성 (간결화)
2. Slide 2: 구체적 상태 ("이번 주 Trial: COSRX" / "이번 주 Trial: 글루코헬스")
3. Slide 3: 허브 상태 ("지금 12개 매장 연결 중" / "지금 23개 약국 연결 중")
4. Slide 4: 파트너 큐레이션

---

### 문제 3: 콘텐츠 밀도

**K-Cosmetics**:
- 관광객용 콘텐츠 0개
- "관광객 → 콘텐츠 → 매장" 흐름 부재

**GlycoPharm**:
- Signage는 있지만 CGM 연계 부족
- "CGM → 콘텐츠 → 환자" 흐름 약함

**해결 방향**:
- K-Cosmetics: NowRunning `type: 'content'` 추가
- GlycoPharm: Signage description 조정

---

## 5. 즉시 가능한 공통 액션

### 액션 1: 허브 서비스 재배치 (RELOCATE)

**K-Cosmetics**:
```tsx
// Before
4. TouristServiceSection (독립 섹션)

// After
2. QuickActionSection (4개 카드)
   - Products
   - Market Trial
   - Orders
   - Tourist Hub (신규)
```

**GlycoPharm**:
```tsx
// Before
4. CGMServiceSection (독립 섹션)

// After
2. QuickActionSection (4개 카드)
   - Signage
   - Market Trial
   - Forum
   - CGM Hub (신규)
```

---

### 액션 2: 카드 카피 재정의 (REINTERPRET)

**K-Cosmetics - Tourist Hub 카드**:
```tsx
{
  id: 'tourist-hub',
  title: 'Tourist Hub',
  subtitle: '관광객 허브',
  description: '관광객·콘텐츠·매장을 연결합니다',
  icon: '🌏',
  link: '/services/tourists',
  color: '#2196f3',
  status: { label: '연결 중', value: 12 },
}
```

**GlycoPharm - CGM Hub 카드**:
```tsx
{
  id: 'cgm-hub',
  title: 'CGM Hub',
  subtitle: 'CGM 데이터',
  description: '환자 CGM 데이터 기반 맞춤 제품 추천',
  icon: Activity,
  link: 'https://glucoseview.co.kr',
  color: 'bg-blue-500',
  status: { label: '연계 중', value: 'GlucoseView' },
}
```

---

### 액션 3: Hero 메시지 조정 (REINTERPRET)

**K-Cosmetics**:
```tsx
// Slide 3 (Before)
title: '외국인 관광객을 위한 검증된 매장 네트워크'

// Slide 3 (After)
title: '지금 12개 매장 · 관광객 연결 중'
subtitle: 'Tourist Hub를 통해 실시간 연결됩니다'
```

**GlycoPharm**:
```tsx
// Slide 3 (Before)
title: 'CGM 데이터 요약 기반\n설명·판매 지원'

// Slide 3 (After)
title: '지금 23개 약국 · GlucoseView 연결 중'
subtitle: 'CGM Hub를 통해 환자 맞춤 제품 추천'
```

---

## 6. 재사용 가능 공통 컴포넌트 후보

### 후보 1: HeroSlider
- 두 서비스 모두 동일 구조
- 자동 슬라이드 (6초)
- 네비게이션 (prev/next/dots)
- **추출 대상**: `packages/ui/HeroSlider.tsx`

### 후보 2: QuickActionCard
- interface 99% 동일
- icon 타입만 차이 (string vs LucideIcon)
- **추출 대상**: `packages/ui/QuickActionCard.tsx`

### 후보 3: NowRunningCard
- type 뱃지 시스템 동일
- 색상 매핑 동일
- **추출 대상**: `packages/ui/NowRunningCard.tsx`

### 후보 4: NoticeList
- isPinned 기능 동일
- Pin 아이콘 표시 동일
- **추출 대상**: `packages/ui/NoticeList.tsx`

### 후보 5: PartnerLogos
- type 기반 스타일 분기 동일
- association 강조 동일
- **추출 대상**: `packages/ui/PartnerLogos.tsx`

---

## 7. 플랫폼 공통 패턴 정의 (초안)

### o4o 서비스 홈 구조 표준 (v0.1)

```
1. HeroSection (4개 슬라이드)
   - Slide 1: 플랫폼 정체성
   - Slide 2: 공통 기능 (Market Trial)
   - Slide 3: 허브 축 상태 (서비스별 차별화)
   - Slide 4: 파트너 신뢰

2. QuickActionSection (4개 카드)
   - 카드 1-3: 서비스별 핵심 기능
   - 카드 4: 허브 서비스 (공통 패턴)

3. NowRunningSection (3-6개 카드)
   - 운영자 큐레이션 "지금 주목할 것"
   - type 뱃지 시스템 (확장 가능)

4. NoticeSection
   - 운영자 발신 공지
   - isPinned 기능

5. CTASection (조건부)
   - 비로그인 유저 전환 유도

6. PartnerTrustSection
   - 운영자 선정 파트너
   - association 강조
```

---

## 8. 다음 단계 (순서대로)

### 단기 (즉시 가능)
1. **K-Cosmetics + GlycoPharm 동시 리팩토링**
   - TouristService/CGMService → QuickActionCard 4번째
   - 예상 시간: 2-3시간
   - 파일 수정: 각 1개 (HomePage.tsx)

2. **Hero 메시지 조정**
   - Slide 3 상태 쇼케이스로 전환
   - 예상 시간: 30분
   - 파일 수정: 각 1개 (HomePage.tsx)

### 중기 (1주)
1. **공통 컴포넌트 추출**
   - `packages/ui` 패키지 생성
   - HeroSlider, QuickActionCard, NowRunningCard, NoticeList, PartnerLogos
   - 예상 시간: 1일

2. **K-Cosmetics 콘텐츠 추가**
   - NowRunning `type: 'content'` 추가
   - 관광객용 콘텐츠 3개 추가
   - 예상 시간: 2시간

### 장기 (Phase 4+)
1. **다른 o4o 서비스 적용**
   - GlucoseView, KPA-Society, Dropshipping
   - 공통 패턴 검증 및 확장

2. **플랫폼 공통 패턴 문서화**
   - o4o 홈 구조 표준 v1.0 확정

---

## 9. 조사 요약

### 발견된 공통 패턴
1. ✅ 홈 화면 7단 구조 (100% 일치)
2. ✅ "연계 서비스" 독립 섹션 (문제 패턴)
3. ✅ QuickActionCard 3개 (확장 → 4개)
4. ✅ NowRunning 타입 뱃지 시스템
5. ✅ Hero 4개 슬라이드 패턴
6. ✅ 운영자 큐레이션 요소 (Notice/Partner)

### 발견된 차별화 패턴
1. ✅ 허브 축 성격 (관광객 vs CGM 데이터)
2. ✅ 콘텐츠 역할 (부재 vs 일상 도구)
3. ✅ QuickActionCard 도메인 (전자상거래 vs 전문성)

### 재사용 가능 컴포넌트
1. ✅ HeroSlider
2. ✅ QuickActionCard
3. ✅ NowRunningCard
4. ✅ NoticeList
5. ✅ PartnerLogos

---

**조사 완료일**: 2026-01-10
**참고 문서**:
- K-Cosmetics 조사: `KCOS-STRUCTURE-AUDIT-CHECKLIST-V02.md`
- GlycoPharm 조사: `GLYCOPHARM-STRUCTURE-AUDIT-V02.md`
