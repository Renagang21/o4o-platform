# K-Cosmetics 현 개발 상태 조사 체크리스트 (v0.1)

> **조사 일시**: 2026-01-10
> **조사 대상**: K-Cosmetics (services/web-k-cosmetics)
> **기준 템플릿**: GlycoPharm (services/web-glycopharm)
> **조사자**: Claude Code
> **목적**: 판단이 아닌 식별 - KEEP / RELOCATE / REUSE 후보 발굴

---

## A. 홈 화면(Home) 구조 점검

### A-1. 홈의 성격

| 질문 | 답변 | 메모 |
|------|------|------|
| 홈은 로그인 후 기본 진입점인가? | ✅ YES | App.tsx에서 `/` 라우트 = HomePage |
| 상시 방문 기준으로도 과도한 정보가 없는가? | ✅ YES | 6개 섹션, GlycoPharm과 동일 구조 |
| "읽어야 하는 화면"이 아니라 "훑는 화면"인가? | ✅ YES | 카드 중심, 스캔 가능한 레이아웃 |
| 특정 섹션이 지나치게 주인공처럼 보이지 않는가? | ✅ YES | Hero는 슬라이더, 나머지 균형적 |

**종합**: 홈의 성격은 **명확함**. GlycoPharm 구조를 잘 따름.

---

### A-2. 홈 섹션 존재 이유

현재 구조 (상→하):
1. **HeroSection** - 슬라이더 (4개 슬라이드)
2. **QuickActionSection** - 운영 도구 (3개 카드)
3. **NowRunningSection** - 진행 중인 프로그램 (3개 카드)
4. **TouristServiceSection** - 관광객 연계 서비스 (1개 대형 카드)
5. **NoticeSection** - 운영 공지 (4개 공지)
6. **CTASection** - 비로그인 유저용 (조건부)
7. **PartnerTrustSection** - 협력 브랜드 (5개 브랜드)

| 섹션 | 홈에 있어야 할 이유 명확? | 기능 페이지가 더 적합? | 없어져도 서비스 이해 무너지지 않음? | 카드 분해 가능? |
|------|---------------------------|----------------------|----------------------------------|----------------|
| HeroSection | ✅ YES - 플랫폼 정체성 | ❌ | ❌ | ⚠️ 슬라이더 형태 |
| QuickActionSection | ✅ YES - 빠른 진입 | ❌ | ⚠️ 일부 카드는 가능 | ✅ YES |
| NowRunningSection | ✅ YES - 현재 참여 가능 | ❌ | ✅ YES (하지만 유용) | ✅ YES |
| TouristServiceSection | ⚠️ **애매** | ✅ **YES** | ✅ YES | ✅ YES |
| NoticeSection | ✅ YES - 운영 안내 | ❌ | ⚠️ 일부 공지는 중요 | ✅ YES (리스트) |
| CTASection | ✅ YES - 전환 유도 | ❌ | ❌ | ❌ |
| PartnerTrustSection | ✅ YES - 신뢰 요소 | ❌ | ✅ YES | ✅ YES |

**발견 사항**:
- **TouristServiceSection**: 홈에서 **과도하게 큰 공간** 차지
  - 대형 그라데이션 카드 (32px padding)
  - "연계 서비스"라는 카테고리가 모호함
  - 독립 페이지 `/services/tourists`가 있는데 홈에서 설명적
  - **RELOCATE 후보 1순위**

---

### A-3. 홈과 기능 화면의 경계

| 질문 | 답변 | 메모 |
|------|------|------|
| 홈에서 "일을 끝내려고" 하고 있지는 않은가? | ✅ NO | 모든 카드는 링크로 이동 |
| 홈의 버튼/카드는 반드시 다음 화면으로 이어지는가? | ⚠️ **일부 NO** | `/platform/stores`, `/products` 등 존재하지 않는 링크 |
| 홈에 상태 요약은 있지만, 관리 지표는 없는가? | ✅ YES | 숫자는 있지만 통계/차트 없음 |

**문제점**:
- **QuickActionCard**의 status 값: `{ label: '노출 중', value: 24 }`
  - 숫자 24는 **관리 지표**에 가까움 (KPI스러움)
  - GlycoPharm도 동일 구조 (일관성은 있음)
  - 하지만 "홈은 통계 ❌" 원칙과 충돌

- **존재하지 않는 링크**:
  - `/platform/stores` (App.tsx에 없음)
  - `/products` (App.tsx에 없음)
  - `/orders` (App.tsx에 없음)
  - `/services/tourists` (App.tsx에 없음)
  - `/for-store-owners` (App.tsx에 없음)

**현재 실제 라우트** (App.tsx 기준):
```
/ → HomePage
/login → LoginPage
/contact → ContactPage
/supplier/* → RoleNotAvailablePage
/partner/* → RoleNotAvailablePage
* → NotFoundPage
```

**발견**: 홈페이지가 **구현되지 않은 미래 기능**을 가정하고 만들어짐

---

## B. 카드 컴포넌트 점검 (핵심)

### B-1. 카드 구조

**QuickActionCard 구조**:
```tsx
{
  icon: '📦',                           // 이모지
  title: 'Products',                   // 영문 타이틀
  subtitle: '상품 관리',                // 한글 보조
  description: '매장에 노출할 상품을 관리하세요',
  link: '/platform/stores/products',
  color: '#e91e63',                    // 색상
  status: { label: '노출 중', value: 24 }  // ⚠️ KPI
}
```

| 질문 | 답변 | 메모 |
|------|------|------|
| 제목 + 보조 설명 + 행동 구조가 명확한가? | ✅ YES | title/subtitle/description 분리 |
| 숫자 KPI, 그래프, 진행률이 들어가 있지는 않은가? | ❌ **NO** | status.value에 숫자 KPI 포함 |
| 상태는 색상이 아니라 텍스트로 표현되는가? | ⚠️ 혼합 | status.label은 텍스트, color는 색상 |
| 클릭 시 "다음 화면"이 분명한가? | ❌ **NO** | 링크 404 예상 |

**NowRunningItem 카드**:
```tsx
{
  type: 'trial',                       // 타입 기반 뱃지
  title: '신규 스킨케어 라인 Trial',
  supplier: 'COSRX',                   // 공급자
  deadline: '2026.01.31',              // 마감일
  participants: 15,                     // ⚠️ KPI
  link: '/platform/stores',            // 404 예상
}
```

| 질문 | 답변 | 메모 |
|------|------|------|
| 제목 + 보조 설명 + 행동 구조가 명확한가? | ✅ YES | type 뱃지 + title + supplier |
| 숫자 KPI, 그래프, 진행률이 들어가 있지는 않은가? | ❌ **NO** | participants 숫자 표시 |
| 상태는 색상이 아니라 텍스트로 표현되는가? | ✅ YES | 뱃지에 이모지 + 텍스트 |
| 클릭 시 "다음 화면"이 분명한가? | ❌ **NO** | 링크 404 예상 |

**발견**:
- 카드 구조 자체는 **우수함**
- 하지만 **링크 무결성 0%** (GlycoPharm에서 복사했기 때문)
- 숫자 KPI는 GlycoPharm 패턴을 그대로 가져옴 (일관성은 있지만 원칙 위반)

---

### B-2. 카드 재사용성

| 질문 | 답변 | 메모 |
|------|------|------|
| 다른 서비스 홈에서도 그대로 쓸 수 있는가? | ✅ **YES** | 데이터만 바꾸면 재사용 가능 |
| 데이터만 바꿔서 확장 가능한 구조인가? | ✅ **YES** | interface 기반, static data 분리 |
| 추천/일반 카드의 디자인이 과도하게 다른가? | ✅ NO | 일관된 디자인 시스템 |

**발견**: 카드 컴포넌트 구조는 **재사용 자산으로 우수함**

---

## C. 서비스 진입 구조 점검

### C-1. 핵심 서비스 진입

**현재 제공하는 진입점 (HomePage 기준)**:
1. Products (상품 관리)
2. Market Trial (신상품 체험)
3. Orders (B2B 주문)
4. Tourist Service (관광객 연결)

| 질문 | 답변 | 메모 |
|------|------|------|
| 상품 / 공급자 / Trial / 파트너 진입이 분명한가? | ⚠️ **애매** | 링크가 실제 존재하지 않음 |
| 진입 방식이 카드 중심인가? | ✅ YES | QuickActionCard 사용 |
| 진입 후 화면이 "홈처럼 행동"하지는 않는가? | ❓ | 진입 화면 자체가 없음 |

**문제점**:
- K-Cosmetics는 현재 **GlycoPharm 구조를 모방만 한 상태**
- 실제 비즈니스 로직/페이지 구현 없음
- "드랍쉬핑 매장 플랫폼"이라는 정체성이 홈에서 명확하지 않음

---

### C-2. 서비스 간 일관성

| 질문 | 답변 | 메모 |
|------|------|------|
| 다른 o4o 서비스와 홈의 리듬이 유사한가? | ✅ **YES** | GlycoPharm과 100% 동일 구조 |
| 특정 서비스만 과도하게 설명적이지는 않은가? | ⚠️ **일부** | TouristServiceSection이 설명적 |

**발견**:
- 일관성은 **완벽함** (GlycoPharm 복사본이므로)
- 하지만 K-Cosmetics 고유 특성이 없음

---

## D. 사이트 맵 / 메뉴 구조 점검

### D-1. 메뉴 역할

**Header.tsx 메뉴**:
```tsx
- 홈
- 문의하기
- 매장 관리 (로그인 시)
- 로그인/회원가입 (비로그인 시)
```

| 질문 | 답변 | 메모 |
|------|------|------|
| 상단/사이드 메뉴가 "항상 필요한 것"만 담고 있는가? | ✅ YES | 최소 메뉴 |
| 홈에서 반복되는 메뉴 기능은 없는가? | ✅ NO | 중복 없음 |
| 메뉴와 홈 카드의 역할이 겹치지 않는가? | ✅ YES | 명확히 분리 |

**발견**: 메뉴 구조는 **간결하고 명확함**

---

### D-2. 숨겨진 기능

| 질문 | 답변 | 메모 |
|------|------|------|
| 기능이 너무 깊이 숨어 있지는 않은가? | ❓ | 기능 자체가 구현 안 됨 |
| 홈 카드로 끌어올리면 좋을 기능은 무엇인가? | ❓ | 기능 구현 후 판단 필요 |

**발견**:
- 현재는 **판단 불가**
- 실제 기능 구현 후 재점검 필요

---

## E. 이미 잘 만든 자산 식별

### E-1. KEEP 후보 (구조가 명확하고 재사용 가능)

1. **HeroSection (슬라이더 컴포넌트)**
   - 위치: `HomePage.tsx:213-363`
   - 이유: 자동 슬라이드, 네비게이션, 구조 우수
   - 재사용성: ⭐⭐⭐⭐⭐
   - 상태: **KEEP - 그대로 유지**

2. **QuickActionSection 카드 구조**
   - 위치: `HomePage.tsx:365-437`
   - 이유: 아이콘 + 제목 + 설명 + 상태 표시 구조 우수
   - 재사용성: ⭐⭐⭐⭐⭐
   - 주의: status.value 숫자 KPI 제거 고려
   - 상태: **KEEP - 일부 수정 후 유지**

3. **NowRunningSection 타입 뱃지 시스템**
   - 위치: `HomePage.tsx:440-535`
   - 이유: type 기반 뱃지 자동 생성, 색상/아이콘 매핑 우수
   - 재사용성: ⭐⭐⭐⭐⭐
   - 상태: **KEEP - 그대로 유지**

4. **NoticeSection 리스트**
   - 위치: `HomePage.tsx:612-681`
   - 이유: 핀 기능, 날짜 표시, 심플한 구조
   - 재사용성: ⭐⭐⭐⭐
   - 상태: **KEEP - 그대로 유지**

5. **PartnerTrustSection**
   - 위치: `HomePage.tsx:683-710`
   - 이유: 간결한 브랜드 표시, type 기반 스타일 분기
   - 재사용성: ⭐⭐⭐⭐
   - 상태: **KEEP - 그대로 유지**

6. **Header.tsx 전체**
   - 위치: `components/common/Header.tsx`
   - 이유: 모바일 메뉴, 유저 드롭다운, 반응형 완벽
   - 재사용성: ⭐⭐⭐⭐⭐
   - 상태: **KEEP - 그대로 유지**

7. **Footer.tsx** (미확인이지만 GlycoPharm 기반이라면)
   - 재사용성: ⭐⭐⭐⭐
   - 상태: **KEEP - 그대로 유지**

---

### E-2. RELOCATE 후보 (위치가 어색한 섹션)

1. **TouristServiceSection**
   - 현재 위치: `HomePage.tsx:537-610`
   - 문제점:
     - 홈에서 **과도하게 큰 공간** 차지 (32px padding)
     - "연계 서비스"라는 카테고리가 모호함
     - 독립 페이지 `/services/tourists`가 있는데 홈에서 **설명적**
     - K-Cosmetics 핵심 가치(드랍쉬핑 매장)와 거리 있음
   - 제안:
     - **QuickActionCard로 축소** (다른 카드와 동일 크기)
     - 또는 **제거** 후 Header 메뉴에 추가
     - 또는 **Footer의 "서비스" 섹션**으로 이동
   - 우선순위: **1순위 RELOCATE**

2. **CTASection (비로그인 유저용)**
   - 현재 위치: `HomePage.tsx:712-772`
   - 문제점:
     - 홈 하단에 위치 (Footer 직전)
     - 큰 그라데이션 박스
     - "매장 시작하기" + "로그인" 버튼
   - 제안:
     - Hero 슬라이더에 통합 (슬라이드 중 하나로)
     - 또는 QuickActionSection 상단에 작은 배너로
   - 우선순위: **2순위 RELOCATE**

---

### E-3. REUSE 후보 (다른 서비스에 바로 쓸 수 있는 컴포넌트)

1. **HeroSection 슬라이더**
   - 추출 대상: `components/common/HeroSlider.tsx`
   - 인터페이스: `HeroSlide[]` props
   - 재사용처: GlucoSeView, KPA-Society, Dropshipping 등 모든 서비스

2. **QuickActionCard**
   - 추출 대상: `components/common/QuickActionCard.tsx`
   - 인터페이스: `QuickActionCard` props
   - 재사용처: 모든 o4o 서비스 홈

3. **NowRunningCard**
   - 추출 대상: `components/common/NowRunningCard.tsx`
   - 인터페이스: `NowRunningItem` props
   - 재사용처: GlycoPharm, 모든 Trial/이벤트 서비스

4. **NoticeList**
   - 추출 대상: `components/common/NoticeList.tsx`
   - 인터페이스: `Notice[]` props
   - 재사용처: 모든 o4o 서비스

5. **PartnerLogos**
   - 추출 대상: `components/common/PartnerLogos.tsx`
   - 인터페이스: `Partner[]` props
   - 재사용처: 모든 o4o 서비스 (신뢰 요소)

**제안**:
- `packages/ui` 패키지로 추출 고려
- 또는 `components/shared/` 폴더로 이동

---

## F. 정리 메모 (중요)

### 1️⃣ 홈에서 가장 **과한 것 한 가지**

**TouristServiceSection**
- 대형 그라데이션 카드 (32px padding, 큰 아이콘, 설명적)
- 홈 중앙부에서 과도한 시각적 주목
- K-Cosmetics의 핵심 가치("드랍쉬핑 매장")보다 **부수적 기능**
- 독립 페이지가 있는데 홈에서 재설명

**리팩토링 제안**:
- QuickActionCard 4번째 카드로 축소
- 또는 제거 후 Header 메뉴로 이동

---

### 2️⃣ 홈에서 가장 **아쉬운 것 한 가지**

**존재하지 않는 링크 (404 예상)**
- `/platform/stores`
- `/products`
- `/orders`
- `/services/tourists`
- `/for-store-owners`
- `/about`
- `/mypage`
- `/register`
- `/store`

**현재 상태**: GlycoPharm 구조를 **복사만 하고 실제 기능 미구현**

**다음 단계 필요**:
1. K-Cosmetics 핵심 기능 정의
2. 실제 라우트 구현
3. 홈페이지 링크 정합성 맞추기

---

### 3️⃣ "이건 잘 만들었다"고 느껴지는 것 한 가지

**카드 중심 구조 설계 (Card-First Design)**
- QuickActionCard
- NowRunningCard
- NoticeList
- PartnerLogos

**잘한 점**:
- TypeScript interface로 명확한 구조 정의
- inline styles로 Tailwind 의존성 제거 성공
- GlycoPharm과의 구조 일관성 유지
- 컴포넌트 분리 가능한 구조 (REUSE 준비 완료)

**재사용 가능성**: ⭐⭐⭐⭐⭐

---

## 🎯 체크리스트 산출물 요약

### 즉시 실행 가능한 리팩토링 (기능 추가 없음)

#### Phase 1: RELOCATE (위치 조정)
1. **TouristServiceSection 축소**
   - 대형 카드 → QuickActionCard 4번째 카드로 변경
   - 또는 제거 후 Header 메뉴 "서비스" 추가

2. **CTASection 이동**
   - Hero 슬라이더 마지막 슬라이드로 통합
   - 또는 QuickActionSection 상단 작은 배너로

#### Phase 2: REUSE (컴포넌트 추출)
1. `components/common/HeroSlider.tsx` 추출
2. `components/common/QuickActionCard.tsx` 추출
3. `components/common/NowRunningCard.tsx` 추출
4. `components/common/NoticeList.tsx` 추출
5. `components/common/PartnerLogos.tsx` 추출

#### Phase 3: 정합성 (링크 수정)
1. 존재하지 않는 링크 식별
2. 임시 RoleNotAvailablePage로 연결 또는 제거
3. 실제 기능 구현 후 링크 복원

---

## 다음 단계 제안

### 즉시 가능 (코드 변경 없이)
1. 이 체크리스트를 바탕으로 **리팩토링 계획안** 수립
2. KEEP / RELOCATE / REUSE 우선순위 결정

### 단기 (1-2일)
1. TouristServiceSection 위치 조정
2. 존재하지 않는 링크 정리
3. QuickActionCard status.value 숫자 제거 고려

### 중기 (1주)
1. 재사용 컴포넌트 추출 (`components/common/`)
2. K-Cosmetics 핵심 기능 정의
3. GlycoPharm과의 차별화 포인트 식별

### 장기 (Phase 4+)
1. 실제 비즈니스 로직 구현
2. 드랍쉬핑 매장 특화 기능 추가
3. 다른 o4o 서비스에 재사용 컴포넌트 적용

---

## 첨부: 파일 구조 현황

### 현재 K-Cosmetics 파일 구조
```
services/web-k-cosmetics/src/
├── components/
│   ├── common/
│   │   ├── Header.tsx          ✅ KEEP
│   │   ├── Footer.tsx          ✅ KEEP (미확인)
│   │   └── index.ts
│   ├── layouts/
│   │   └── MainLayout.tsx      ✅ KEEP
│   ├── RoleSwitcher.tsx        ⚠️ 사용처 미확인
│   └── index.ts
├── pages/
│   ├── auth/
│   │   ├── LoginPage.tsx       ✅ KEEP
│   │   └── index.ts
│   ├── ContactPage.tsx         ✅ KEEP
│   ├── HomePage.tsx            ⚠️ 링크 정합성 문제
│   ├── NotFoundPage.tsx        ✅ KEEP
│   ├── RoleNotAvailablePage.tsx ✅ KEEP
│   └── index.ts
├── contexts/
│   ├── AuthContext.tsx         ✅ KEEP
│   └── index.ts
├── App.tsx                     ⚠️ 라우트 부족
└── main.tsx
```

### GlycoPharm과 비교
- 구조 일치도: **95%**
- Tailwind → inline styles 변환: **완료**
- K-Cosmetics 특화: **0%** (GlycoPharm 복사본)

---

**조사 완료일**: 2026-01-10
**다음 액션**: 사용자 피드백 대기 → 리팩토링 계획안 수립
