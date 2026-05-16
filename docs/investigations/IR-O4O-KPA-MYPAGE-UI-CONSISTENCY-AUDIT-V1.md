# IR-O4O-KPA-MYPAGE-UI-CONSISTENCY-AUDIT-V1

**조사 유형:** Investigation Report (IR)
**조사 대상:** KPA-Society `/mypage` 하위 9개 화면의 UI 일관성 및 공통화 가능성
**조사 날짜:** 2026-05-16
**상태:** COMPLETE
**연관 작업:**
- WO-O4O-KPA-MYPAGE-ORG-LEGACY-CLEANUP-V1 (commit `ee9d9856b`) — 임원/회계/AI 블록 제거
- WO-O4O-KPA-MYPAGE-ENROLLMENTS-LAYOUT-ALIGN-V1 (commit `64b567eca` 안에 포함, 보조 커밋 `b68c5361c`) — `/mypage/enrollments` 외곽 정렬

---

## 0. 목적

KPA-Society `/mypage` 하위 9개 화면이 화면별로 독립 작성되어 외곽 레이아웃·헤더·container·스타일링 방식이 분기되어 있다. 개별 화면 정비(점적 수정)를 반복하면 회귀가 발생하므로, **공통 wrapper로 정리할 수 있는지 판단**하고 1차 정비 WO를 제안한다.

본 IR은 조사만 수행하며 코드 수정·커밋은 하지 않는다.

---

## 1. 라우트 ↔ 라벨 ↔ 페이지 컴포넌트 매핑

`MyPageGuard` + `Layout` 으로 9개 라우트 모두 동일하게 감싸짐 — 라우트 레벨 구조는 일관됨.

| # | 네비 라벨 | 실제 경로 | 페이지 컴포넌트 |
|---|-----------|-----------|------------------|
| 1 | 홈 | `/mypage` | `MyDashboardPage` |
| 2 | 프로필 | `/mypage/profile` | `MyProfilePage` |
| 3 | 내 포럼 | `/mypage/my-forums` | `MyForumDashboardPage` |
| 4 | 내 수강 | `/mypage/enrollments` | `MyEnrollmentsPage` |
| 5 | 내 신청 | `/mypage/my-requests` | `MyRequestsPage` |
| 6 | 학습 결과 | `/mypage/certificates` | `MyCertificatesPage` |
| 7 | 내 자격 | `/mypage/qualifications` | `MyQualificationsPage` |
| 8 | 크레딧 | `/mypage/credits` | `MyCreditsPage` |
| 9 | 설정 | `/mypage/settings` | `MySettingsPage` |

### 1-A. 사용자 인식 ↔ 실제 라우트 불일치

WO 요청서에 적힌 라우트와 실제 라우트가 일부 다름. IR 시점에 정리:

| WO 요청서 표현 | 실제 라우트 | 비고 |
|---------------|------------|------|
| `/mypage/forums` | `/mypage/my-forums` | 경로에 `my-` prefix |
| `/mypage/requests` | `/mypage/my-requests` | 경로에 `my-` prefix |
| `/mypage/learning-results` | `/mypage/certificates` | 라벨("학습 결과")과 경로명이 다름 |
| (누락) | `/mypage/qualifications` | "내 자격" — WO 목록에 없었음 |

향후 IA 정비 시 `/mypage/learning-results` ↔ `/mypage/certificates` 같은 라벨-경로 어긋남도 결정 필요.

---

## 2. 화면별 현재 구조 비교표

| # | 화면 | PageHeader | MyPageNav 위치 | container 폭 | styling 방식 | Card 컴포넌트 | 특이점 |
|---|------|:----------:|:--------------:|:-----------:|:-------------:|:-------------:|--------|
| 1 | 대시보드 (`/mypage`) | O | nav가 PageHeader 아래 | 1000px | inline | O | grid 요약 카드 |
| 2 | 프로필 | O | PageHeader 아래 | 600px | inline | O | tab UI (기본/직역) |
| 3 | 내 포럼 | X (h1 직접) | PageHeader 자리에 nav | Tailwind `max-w-4xl` | **Tailwind** | X | Lucide 아이콘, slate 컬러 |
| 4 | 내 수강 | O | PageHeader 아래 | 1000px | inline | (자체 카드) | 최근 정렬됨 |
| 5 | 내 신청 | X (h1 직접) | PageHeader 자리에 nav | Tailwind `max-w-4xl` | **Tailwind** | X | Lucide 아이콘, slate 컬러 |
| 6 | 학습 결과 | O | PageHeader 아래 | 1000px | inline | O | grid |
| 7 | 내 자격 | X (h1 직접) | PageHeader 자리에 nav | 800px | inline | X | section 직접 사용 |
| 8 | 크레딧 | O | PageHeader 아래 | 1000px | inline | O | balance 카드 |
| 9 | 설정 | O | PageHeader 아래 | 600px | inline | O | 모달 포함 |

### 2-A. 정량 요약

| 항목 | 분포 |
|------|------|
| PageHeader 사용 | 6개 사용 / **3개 미사용** (포럼·신청·자격) |
| container 폭 | 600px(2) / 800px(1) / **1000px(4)** / Tailwind max-w-4xl(2) |
| styling 방식 | **inline 7개** / Tailwind 2개 |
| Card 컴포넌트 사용 | 6개 사용 / 3개 미사용 |
| MyPageNavigation 사용 | 9개 모두 사용 (위치만 다름) |

---

## 3. 공통화 대상 후보

### 3-A. 9개 화면 모두 반복되는 패턴

1. `<div style={styles.container}>` (또는 동등한 Tailwind 클래스) — maxWidth + margin auto + padding
2. `<MyPageNavigation items={KPA_MYPAGE_NAV_ITEMS} />` 호출 (9회 반복)
3. `<MyPageGuard><Layout>...</Layout></MyPageGuard>` 라우트 wrapping (App.tsx 에서 반복)

### 3-B. 추출 가능 항목

| 추출 대상 | 현재 위치 | 추출 후 위치 (제안) |
|----------|----------|---------------------|
| container 스타일 | 9개 페이지 각자 인라인/Tailwind | `MyPageLayout` 단일 정의 |
| PageHeader 렌더링 | 6개 페이지 인라인 호출 | `MyPageLayout` props 로 |
| MyPageNavigation 호출 | 9개 페이지 인라인 호출 | `MyPageLayout` 내부에서 자동 렌더 |
| breadcrumb 구성 | 6개 페이지 inline 배열 | `MyPageLayout` props (또는 자동 생성) |

### 3-C. 추출하기 위해 깨야 하는 가정

- **포럼·신청 2개 화면은 Tailwind** — inline style 표준으로 통일하거나 Tailwind 표준으로 통일하거나 결정 필요
- **container 폭이 페이지별로 다름 (600/800/1000)** — `MyPageLayout` 에 `width="form" | "list" | "wide"` prop 으로 분기 노출 필요
- **PageHeader 없는 3개 화면은 h1 직접 사용** — 표준 적용 시 시각적 변화 발생 (사용자 검토 필요)

---

## 4. 권장 표준 구조

### 4-A. 공통 wrapper 신설

```tsx
// services/web-kpa-society/src/layouts/MyPageLayout.tsx (신규)
<MyPageLayout
  title="내 수강 목록"
  description="신청하거나 진행 중인 강의를 확인하세요."
  breadcrumb={[...]}
  width="wide"   // "form" | "wide" — 600px / 1000px
>
  {children}
</MyPageLayout>
```

내부 구성:
- container div (width prop 에 따른 maxWidth 분기, 1000px 또는 600px)
- `<PageHeader />` (title/description/breadcrumb 자동)
- `<MyPageNavigation items={KPA_MYPAGE_NAV_ITEMS} />`
- `{children}` 자리

### 4-B. 페이지 컴포넌트의 책임 축소

```tsx
// MyEnrollmentsPage.tsx 등
export function MyEnrollmentsPage() {
  // ... 데이터 로직만
  return (
    <MyPageLayout title="내 수강 목록" description="..." width="wide" breadcrumb={...}>
      {/* 페이지 고유 콘텐츠 (필터/리스트) */}
    </MyPageLayout>
  );
}
```

페이지 컴포넌트는 데이터 로직 + 본문 JSX만 책임. 외곽은 wrapper 가 보장.

### 4-C. 강제 위치

라우트 element wrapping 방식(`<Route element={<MyPageLayout />}>`) vs 페이지 내부 wrapping 방식 중, **페이지 내부 wrapping** 권장:
- 페이지마다 width / title 값이 다름 — props 로 전달 필요
- 점진적 마이그레이션 가능 (라우트 wrapping 은 9개 동시 전환 강제)

---

## 5. 1차 정비 WO 분할안

### Phase 1 — 기반 작업 (낮은 리스크)
**WO-O4O-KPA-MYPAGE-LAYOUT-FOUNDATION-V1**
- `MyPageLayout` 컴포넌트 신설
- 기존 페이지 무수정 (병행 가능 상태로만 도입)
- Storybook/단위 테스트 1개 추가 (선택)

### Phase 2 — 안전 마이그레이션 (낮은 리스크)
**WO-O4O-KPA-MYPAGE-LAYOUT-MIGRATE-SAFE-V1**
- 대상: 대시보드, 학습 결과, 크레딧, 수강 (이미 inline + PageHeader 있는 4개)
- 작업: 외곽 JSX → `MyPageLayout` props 전달로 교체
- 사유: 기능 변경 위험 가장 낮음. 시각 변화 거의 없음

### Phase 3 — 폼 화면 (중간 리스크)
**WO-O4O-KPA-MYPAGE-LAYOUT-MIGRATE-FORMS-V1**
- 대상: 프로필, 설정 (600px container)
- 작업: `width="form"` prop 으로 폭 유지하면서 외곽 통일
- 사유: 폼 가시성/탭 UI/모달 회귀 검증 필요

### Phase 4 — Tailwind 화면 (높은 리스크)
**WO-O4O-KPA-MYPAGE-LAYOUT-MIGRATE-TAILWIND-V1**
- 대상: 내 포럼, 내 신청
- 작업: Tailwind 색상/레이아웃 → inline style + colors/typography 토큰으로 변환, `MyPageLayout` 적용
- 사유: 스타일링 패러다임 전환 + Lucide 아이콘 유지 여부 결정 필요

### Phase 5 — 정리 (낮은 리스크)
**WO-O4O-KPA-MYPAGE-LAYOUT-MIGRATE-FINAL-V1**
- 대상: 내 자격 (800px, PageHeader 없음)
- 작업: 800px → 1000px 통합 또는 별도 width prop 추가 결정 + PageHeader 도입
- 사유: 단독 화면이라 마지막에 정리해도 영향 적음

### 정비 외 항목 (별도 결정)
- 라벨 ↔ 경로 어긋남 (`/mypage/learning-results` vs `/mypage/certificates` 등) → IA WO
- `MyPageNavigation` 컴포넌트 (`packages/account-ui`) 자체 변경 필요 여부 → 공통 패키지 변경은 별도 WO

---

## 6. 위험 신호

| 항목 | 현상 | 영향 | 권장 처리 |
|------|------|------|----------|
| Tailwind ↔ inline 이중 사용 | 포럼·신청만 Tailwind | 토큰/색상 매핑 부담, 디자인 시스템 분산 | Phase 4 에서 inline 으로 통일 |
| `MyPageNavigation` 외부 패키지 의존 | `@o4o/account-ui` 에 위치 | 외부 패키지 변경 시 다른 서비스(neture 등) 영향 가능 | 본 IR 범위 외, 별도 확인 |
| 외부 API 종속 페이지 | 포럼(`forumApi`), 자격(`qualificationApi`), 수강(`lmsApi`) | 외곽 wrapping 만 변경하면 무영향 — 단 본문 내부 컴포넌트가 외부 패키지(`@o4o/lms-client` 등)에서 오는 경우 wrapping 패턴 검증 필요 | 마이그레이션 시 본문 JSX 무수정 원칙 유지 |
| Lucide 아이콘 ↔ emoji 혼용 | 포럼·신청은 Lucide, 나머지는 emoji | 시각 일관성 부재 | 표준화 결정 별도 WO |
| 라벨 ↔ 경로 어긋남 | "학습 결과" → `/certificates` 등 | 사용자/개발자 인지 부담 | IA 정리 WO 분리 |
| **Parallel-session commit 사고 재발 가능성** | 다른 세션이 광범위 staging 사용 시 본 작업도 휩쓸릴 위험 | git history 오염 | 모든 정비 WO에서 정확한 파일 경로 `git add` 명시 |

---

## 7. 결론

- `/mypage` 9개 화면은 **라우트 wrapping은 일관**하나, **페이지 내부 외곽 JSX/스타일이 각자 작성됨**
- 작성 시점 차이로 인한 분기 (구식 inline 7개 / 신식 Tailwind 2개) 가 주된 불일치 원인
- **`MyPageLayout` 단일 wrapper 컴포넌트 신설 + 단계별 마이그레이션** 이 가장 안전한 정비 경로
- 1차 정비는 Phase 1(기반) → Phase 2(안전 4개 화면) 까지 진행 후 결과 검토 권장

본 IR 의 다음 단계는 **Phase 1 WO 발행**이다.

---

*Generated: 2026-05-16*
*Status: COMPLETE — 후속 WO 발행 대기*
