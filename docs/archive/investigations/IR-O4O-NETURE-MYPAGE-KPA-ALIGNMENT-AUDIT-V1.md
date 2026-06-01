# IR-O4O-NETURE-MYPAGE-KPA-ALIGNMENT-AUDIT-V1

> **조사 보고서 (Investigation Report) — 조사 전용 / 코드·DB·UI·migration 변경 없음.**
>
> Neture 의 MyPage 구조·디자인을 KPA-Society 의 canonical MyPage 와 비교하여, Neture 에 필요한 항목만 남기고 정비 범위를 확정한다. **없는 기능을 억지로 추가하지 않는다.**

- **작성일:** 2026-05-24
- **분류:** Investigation (read-only)
- **선행 산출물:**
  - [IR-O4O-MYPAGE-VS-ACCOUNT-CENTER-CANONICAL-V1](IR-O4O-MYPAGE-VS-ACCOUNT-CENTER-CANONICAL-V1.md) — 각 서비스 `/mypage` canonical 확정
  - [IR-O4O-KPA-MYPAGE-UI-CONSISTENCY-AUDIT-V1](IR-O4O-KPA-MYPAGE-UI-CONSISTENCY-AUDIT-V1.md) — KPA MyPage 일관성 audit
- **참조 SSOT:**
  - Identity V2 4-Layer 모델 (L1 Identity / L2 Credential / L3 Membership / L4 Role)
- **검증 환경:** local repo (origin/main 동기화 완료, 0 commits 차이)
- **사전 동기화:** main pull 완료. 본 IR 작업 중 평행 세션의 신규 commit (`f25a339bf`) 1 건 있으나 본 IR 범위와 무관.
- **수정 행위:** **없음** (조사 전용)

---

## 0. 최종 권고 — 한 줄 요약

> **Neture MyPage 는 현재 3 페이지 (Hub / Profile / Settings) 구조가 Neture 의 서비스 성격에 부합한다. 디자인 정렬은 `@o4o/account-ui` 의 MyPageLayout 에 KPA 의 PageHeader/breadcrumb 패턴을 끌어올리면 4 service 모두 혜택. 기능 추가는 향후 별건 (`/mypage/my-forums` 일반 사용자 forum 활동 페이지) 으로 분리.**

### 분류 매트릭스 — 한눈에 보기

| 항목 | Neture 적용 | 사유 |
|---|:----:|------|
| 홈 (MyDashboard) | **Keep** | 현 MyPageHub 의 공급자/파트너 quick actions 가 Neture 성격에 더 적합 |
| 프로필 | **Keep** | 이미 존재 + V2 L1 정합 |
| 설정 (비밀번호) | **Keep** | 이미 존재 + V2 L2 `serviceKey='neture'` 정합 |
| 내 포럼 (일반 사용자 활동) | **Hold** | Neture forum 있음, 사용자 활동 페이지는 향후 별건 |
| 내 신청 (가입 / supplier / partner) | **Hold** | 검토 가치 있으나 본 IR 범위 외 |
| 강의 / 수강 / 자격 / 인증서 | **Remove (해당 없음)** | Neture LMS 없음 |
| 자료실 / 콘텐츠 | **Remove (해당 없음)** | 본 정비 범위 외 (사용자 지정) |
| 디지털 사이니지 | **Remove (해당 없음)** | Neture signage 없음 |
| KPA 약국/매장 전용 메뉴 | **Remove (해당 없음)** | 도메인 무관 |
| AnnualReportForm / PersonalStatusReport | **Remove (해당 없음)** | KPA 약사회 도메인 |
| 크레딧 | **Hold** | Neture 의 정산은 `/account/supplier/settlements` 별도 — 본 IR 범위 외 |
| 디자인 layout 정렬 | **Align (별건)** | account-ui MyPageLayout 강화로 4 service 공통 이득 |

→ **Keep 3 / Hold 3 / Remove (해당없음) 6 / Align 1.**

---

## 1. 조사 환경

| 항목 | 값 |
|---|---|
| 조사일 | 2026-05-24 |
| Repo 시점 | origin/main 와 일치 |
| 조사 범위 | `services/web-{kpa-society,neture}/src/pages/mypage/**` + 각 `App.tsx` + `NetureGlobalHeader.tsx` + `packages/account-ui/src/components/MyPage*` |
| 평행 세션 충돌 | 없음 (다른 modified/untracked docs 다수 — migrations/services/account-ui 무관) |

---

## 2. 산출물 1 — KPA-Society MyPage Canonical 구조

### 2.1 라우트 (12 개, App.tsx L817~835)

| Route | Page | 도메인 |
|---|---|:---:|
| `/mypage` | MyDashboardPage | Summary |
| `/mypage/profile` | MyProfilePage | L1 Identity |
| `/mypage/settings` | MySettingsPage | L2 Credential |
| `/mypage/my-forums` | MyForumDashboardPage | Forum |
| `/mypage/my-forums/request` | → `/forum/request` (redirect) | Forum |
| `/mypage/my-forums/:forumId/members` | ForumMemberManagementPage | Forum 운영 |
| `/mypage/my-requests` | MyRequestsPage | 통합 신청함 |
| `/mypage/qualifications` | MyQualificationsPage | KPA 약사 자격 |
| `/mypage/enrollments` | MyEnrollmentsPage | LMS |
| `/mypage/certificates` | MyCertificatesPage | LMS 수료증 |
| `/mypage/completions` | → `/mypage/certificates` (redirect) | LMS 호환 |
| `/mypage/credits` | MyCreditsPage | LMS 크레딧 |

### 2.2 Navigation Items ([navItems.ts](services/web-kpa-society/src/pages/mypage/navItems.ts))

상태 기준 IA (Summary → Relation → Activity → Request → Result → Asset → Config):

```
홈 / 프로필 / 내 포럼 / 내 수강 / 내 신청 / 학습 결과 / 내 자격 / 크레딧 / 설정
```

→ **9 탭 고정.** `MyPageLayout` 호출 시 항상 표시 ([layouts/MyPageLayout.tsx:43](services/web-kpa-society/src/layouts/MyPageLayout.tsx#L43)).

### 2.3 MyPageLayout (KPA local custom — canonical)

[services/web-kpa-society/src/layouts/MyPageLayout.tsx](services/web-kpa-society/src/layouts/MyPageLayout.tsx):

```tsx
<div className="w-full max-w-[1120px] mx-auto px-4 sm:px-5 lg:px-6 pb-10">
  <PageHeader title={...} description={...} breadcrumb={...} />
  <MyPageNavigation items={KPA_MYPAGE_NAV_ITEMS} />
  {/* width: wide/list/form */}
  {children}
</div>
```

**책임:**
- container 폭 1120px (form 모드 시 inner max-w-860px)
- PageHeader (title/description/breadcrumb) 렌더링
- MyPageNavigation 항상 표시
- width prop: `'wide' | 'list' | 'form'`

### 2.4 MyDashboardPage 구조 (홈)

| 섹션 | 내용 |
|---|---|
| 프로필 카드 | 아바타 + 이름 + 이메일 + org/role 배지 + "프로필 수정" |
| 활동 요약 그리드 | 수강 중 / 수료 / 수료증 / 작성 글 / 이벤트 (5 카드) |
| 최근 활동 | 최근 5 건 (course_progress / forum_post / groupbuy / certificate) |
| 내 감사 활동 | 받은/보낸 감사 포인트 + 최근 5 건씩 |
| 바로가기 | 프로필 / 내 포럼 / 학습 결과 / 내 자격 / 설정 |

### 2.5 도메인 분류

| Layer | 페이지 | API |
|:---:|---|---|
| L1 Identity | MyProfilePage | `PUT /users/profile` |
| L2 Credential | MySettingsPage | `PUT /users/password` with `serviceKey: 'kpa-society'` |
| Forum | MyForumDashboardPage, ForumMemberManagementPage | `forumApi.getMyForums/updateMyForum/requestDeleteForum` |
| LMS | MyEnrollments / MyCertificates / MyCredits / MyCompletions | LMS API |
| Request | MyRequestsPage, RequestCategoryPage | 신청 통합 API |
| Qualification | MyQualificationsPage | KPA 약사 자격 API |
| Report | AnnualReportFormPage, PersonalStatusReportPage | KPA 보고서 API |

---

## 3. 산출물 2 — Neture MyPage 현재 구조

### 3.1 라우트 (3 개, App.tsx L625~627)

| Route | Page | 도메인 |
|---|---|:---:|
| `/mypage` | MyPageHub | Hub (공급자/파트너 quick actions) |
| `/mypage/profile` | MyProfilePage | L1 Identity |
| `/mypage/settings` | MySettingsPage | L2 Credential |

**관련 별도 라우트 (mypage 외):**
| Route | Page | 비고 |
|---|---|---|
| `/supplier/my-forum` | MyForumDashboardPage | Neture 공급자 측 forum 운영 — `/mypage/*` 와 별도 |

### 3.2 MyPageLayout (account-ui shared 사용)

[packages/account-ui/src/components/MyPageLayout.tsx](packages/account-ui/src/components/MyPageLayout.tsx):

```tsx
<div className="max-w-4xl mx-auto py-10 px-4">
  {title && (
    <div className="mb-6">
      <h1>{title}</h1>
      {subtitle && <p>{subtitle}</p>}
    </div>
  )}
  {showNav && <MyPageNavigation basePath={basePath} items={navItems} />}
  {children}
</div>
```

**책임:**
- container 폭 4xl (896px) — KPA 의 1120px 보다 좁음
- title/subtitle — **breadcrumb 없음**
- MyPageNavigation 표시 (`showNav` default true, `navItems` 안 보내면 DEFAULT 3 탭)
- width prop 없음

### 3.3 MyPageNavigation DEFAULT_ITEMS

Neture 가 `navItems` 미지정 → [DEFAULT_ITEMS](packages/account-ui/src/components/MyPageNavigation.tsx#L8-L12) 사용:

```
마이페이지 / 프로필 / 설정 (3 탭)
```

→ Neture 현재 3 탭으로 정확히 일치 (라우트 3 개와 매칭).

### 3.4 MyPageHub 구조 (홈)

[services/web-neture/src/pages/mypage/MyPageHub.tsx](services/web-neture/src/pages/mypage/MyPageHub.tsx):

| 섹션 | 내용 |
|---|---|
| Compact Greeting Bar | 아바타 + 이름 + 역할 배지 + "프로필 보기" |
| Role-based Quick Actions | **공급자**: 상품 등록 / 상품 관리 / 주문 관리 / 유통 참여형 펀딩 / 정산 관리 (5)<br>**파트너**: 파트너 대시보드 / 커미션 / 콘텐츠 라이브러리 / 커뮤니티 (4)<br>**그 외**: 표시 안 함 |
| Navigation Cards | 프로필 편집 / 설정 (2 카드) |
| QuickActionsSection | `{role} 대시보드` 진입 + 로그아웃 |

### 3.5 진입 경로 ([NetureGlobalHeader.tsx:135-140](services/web-neture/src/components/NetureGlobalHeader.tsx#L135-L140))

```tsx
<GlobalHeaderMenuItem to="/mypage">마이페이지</GlobalHeaderMenuItem>
<GlobalHeaderMenuItem to="/mypage/settings">설정</GlobalHeaderMenuItem>
```

→ 사용자 dropdown 에 2 항목. 운영/공급자/파트너 dashboard 는 별도 항목으로 분리됨.

### 3.6 Neture forum 의 위치 분리

| 사용자 측 forum | 공급자/운영 측 forum 운영 |
|---|---|
| `/forum`, `/forum/:id`, `/forum/write` 등 (`pages/forum/*` — 4 pages) | `/supplier/my-forum` (`pages/supplier` 의 MyForumDashboardPage) |

→ **forum 자체는 있으나 일반 사용자의 "내가 작성한 글" 페이지는 `/mypage/` 아래에 없음.** 공급자의 forum 운영만 `/supplier/my-forum` 에 별도.

---

## 4. 산출물 3 — 기능 매핑 (Keep / Hold / Remove / Align)

### 4.1 KPA → Neture 매핑 매트릭스

| KPA 페이지 / 항목 | Neture 매핑 | 결정 | 사유 |
|---|---|:----:|------|
| `/mypage` MyDashboardPage | `/mypage` MyPageHub (다른 구조) | **Keep (현행)** | Neture 의 공급자/파트너 quick actions 가 Neture 사용자 성격에 더 적합. KPA 의 LMS 메트릭 (수강/수료/수료증) 은 Neture 에 의미 없음 |
| `/mypage/profile` MyProfilePage | `/mypage/profile` MyProfilePage | **Keep** | 이미 일치 — `PUT /users/profile` 공통 API |
| `/mypage/settings` MySettingsPage | `/mypage/settings` MySettingsPage | **Keep** | 이미 일치 — `PUT /users/password` with `serviceKey='neture'` |
| `/mypage/my-forums` MyForumDashboardPage | 부분: `/supplier/my-forum` (공급자 측만) | **Hold** | 일반 사용자의 forum 활동 (내가 작성한 글/댓글) 페이지 미구현. 신규 도입 가능하나 본 IR 범위 외 |
| `/mypage/my-forums/:forumId/members` | (없음) | **Remove (해당 없음)** | Neture 의 forum 은 공개형 추정 — 비공개 회원 관리 없음 |
| `/mypage/my-requests` MyRequestsPage | (없음) | **Hold** | Neture 의 supplier/partner 가입 신청 상태를 모아 보여줄 가치 있음. 본 IR 범위 외 |
| `/mypage/qualifications` MyQualificationsPage | (없음) | **Remove (해당 없음)** | KPA 약사 자격 도메인 — Neture 무관 |
| `/mypage/enrollments` MyEnrollmentsPage | (없음) | **Remove (해당 없음)** | Neture LMS 없음 (사용자 지정) |
| `/mypage/certificates` MyCertificatesPage | (없음) | **Remove (해당 없음)** | 동일 |
| `/mypage/credits` MyCreditsPage | (없음) | **Hold** | Neture 의 정산은 `/account/supplier/settlements` 별도. mypage 통합 여부 본 IR 범위 외 |
| `/mypage/completions` redirect | (없음) | **Remove (해당 없음)** | LMS 관련 |
| AnnualReportFormPage / PersonalStatusReportPage | (없음) | **Remove (해당 없음)** | KPA 약사회 보고서 도메인 |
| 콘텐츠 / 자료실 / 디지털사이니지 | (해당 없음) | **Remove (해당 없음)** | 사용자 지정 — 본 정비 범위 외 |

### 4.2 Neture 에만 있는 항목 (KPA 에 없음)

| Neture 항목 | 평가 |
|---|------|
| Role-based Quick Actions (공급자/파트너) | **Neture 고유 — 유지** (KPA 에 가져갈 필요 없음) |
| `/supplier/my-forum` (공급자 측 forum 운영) | **위치 정합** — `/mypage` 가 아닌 `/supplier` 아래가 적절 (공급자 권한 기능) |
| `getNetureDashboardRoute / getNetureRoleLabel` | Neture 의 다중 role 처리 — 그대로 유지 |
| QuickActionsSection (dashboard + logout) | account-ui 공통 — 유지 |

→ **Neture 의 MyPage 는 "사용자의 일반 정보" + "공급자/파트너 의 사업 quick actions" 가 결합된 hub 형태.** Neture 의 사용자 성격 (소비자 / 공급자 / 파트너 / 운영자) 다양성에 맞춰진 적절한 설계.

---

## 5. 산출물 4 — 디자인 정렬 (KPA vs Neture vs account-ui)

### 5.1 차이 매트릭스

| 측면 | KPA `layouts/MyPageLayout.tsx` (local) | account-ui `MyPageLayout.tsx` (Neture 사용) | 정합 가능성 |
|---|---|---|:---:|
| 최대 폭 | `max-w-[1120px]` | `max-w-4xl` (≈896px) | △ Neture 는 좁은 화면이 의도일 수 있음 |
| PageHeader | ✅ title + description + breadcrumb | ❌ title + subtitle 만 (breadcrumb 없음) | ⚪ account-ui 에 breadcrumb 추가 검토 |
| Navigation | KPA_MYPAGE_NAV_ITEMS (9 탭 고정) | DEFAULT_ITEMS (3 탭) | △ Neture 는 DEFAULT 가 적절 |
| width prop | `'wide' | 'list' | 'form'` (form 시 inner max-w-860px) | 없음 | ⚪ account-ui 에 width prop 추가 검토 |
| Card 스타일 | local Card 컴포넌트 (boxShadow + padding) | tailwind 직접 (`rounded-2xl shadow-sm`) | 다름 — Neture 의 모던 카드가 일관성 측면 좋음 |
| breadcrumb 패턴 | `[{label:'홈', href:'/'}, {label:'마이페이지'}, ...]` | 미사용 | ⚪ 가져올 가치 있음 |

### 5.2 정렬 권고 — Option B (Light Alignment)

**account-ui `MyPageLayout` 강화 (4 service 공통 이득):**

1. **breadcrumb prop 추가** — KPA 가 이미 사용 중. Neture 도 도입 가능 (선택적)
2. **width prop 추가** — `'wide' | 'list' | 'form'` 으로 form 모드 좁은 wrapper 지원
3. **max-w 옵션화** — 4xl (default) / 1120px (wide 모드)

→ 본 정렬은 KPA 의 `layouts/MyPageLayout.tsx` 를 점진적으로 account-ui 로 끌어올리는 별건 WO 가능. KPA 의 local layout 은 deprecate 가능.

### 5.3 Neture-specific 잔재 (없음)

- Neture 의 MyPage 3 페이지 모두 account-ui 의 `MyPageLayout` 사용 — Neture-only 디자인 잔재 없음
- ProfileCard / ProfileInfoField / SettingsSection / PasswordChangeModal 도 모두 account-ui — 일관성 좋음

---

## 6. 산출물 5 — 라우트 정리

### 6.1 Neture 현재 mypage 라우트 (3)

| Route | 상태 | 비고 |
|---|:---:|---|
| `/mypage` | ✅ 사용 중 | MyPageHub |
| `/mypage/profile` | ✅ 사용 중 | MyProfilePage |
| `/mypage/settings` | ✅ 사용 중 | MySettingsPage |

→ **Dead route 없음. 빈 route 없음. 기능 없는 route 없음.**

### 6.2 KPA 와 동등 추가 검토 후보 (본 IR 즉시 도입 안 함)

| 후보 Route | KPA 대응 | Neture 도입 검토 |
|---|---|:---:|
| `/mypage/my-forums` | MyForumDashboardPage | △ Neture forum 일반 사용자 활동 페이지 — 신규 page 신설 필요. 사용자 결정 후 별건 WO |
| `/mypage/my-requests` | MyRequestsPage | △ supplier/partner 가입 신청 통합 — Neture 의 가입 흐름이 KPA 와 다르므로 별건 검토 |
| `/mypage/notifications` | (KPA 도 미구현) | ⚪ 공통화 별건 |

→ 본 IR 의 권고: **현재 3 route 유지. 추가는 사용자 결정 시 별건.**

### 6.3 관련 비-mypage 라우트 (참고)

| Route | 분류 |
|---|---|
| `/supplier/my-forum` | 공급자 forum 운영 (권한 기반 — `/mypage` 와 별도 위치 정합) |
| `/account/supplier/settlements` | 공급자 정산 (account-ui 의 AccountPageLayout 사용 추정) |

---

## 7. Current Structure vs O4O Philosophy Conflict Check

| 차원 | 평가 | 충돌 |
|---|------|:---:|
| Neture 가 KPA 구조를 무리하게 복사하고 있는가? | ✗ Neture 는 자체 minimum 구조 (3 페이지) — 무리한 복사 없음. KPA 의 LMS/자격/보고서/크레딧 메뉴 미도입 | **없음** |
| 없는 기능을 메뉴로 노출하고 있는가? | ✗ Neture MyPageHub 의 navigation cards (프로필/설정) + role-based quick actions 만 표시. 강의/자료실/사이니지 noise 없음 | **없음** |
| Neture 의 서비스 성격과 MyPage 구조가 맞는가? | ✅ 공급자/파트너 quick actions 가 hub 의 중심 — Neture 의 다중 사용자 성격 (소비자/공급자/파트너) 에 적절 | **없음** |
| 공통화와 서비스별 차이가 적절히 분리되어 있는가? | △ 부분 — account-ui MyPageLayout 이 공통이나 KPA 의 local 변형 (`layouts/MyPageLayout.tsx`) 이 양립. 점진적 통합 가치 있음 | **약함 (디자인 측면)** |
| O4O 의 "공통 Core + 독립 서비스" 원칙 | ✅ Neture 의 MyPage 는 Neture 사업 성격을 반영하면서도 L1/L2 공통 API 사용 — 원칙 정합 | **없음** |
| Identity V2 정합 | ✅ L1 `PUT /users/profile` + L2 `PUT /users/password` with `serviceKey='neture'` — V2 Phase 1/2 정렬 완료 | **없음** |
| forum 기능이 mypage 가 아닌 supplier 아래 있는 것이 자연스러운가? | ✅ 공급자 측 forum 운영은 권한 기반 — `/supplier/*` 가 적절. 일반 사용자 forum 활동 페이지가 향후 `/mypage/my-forums` 로 추가될 수 있음 | **없음** |

→ **충돌 0 건.** 본 IR 의 권고 (현재 구조 유지 + 디자인 점진 정렬) 는 O4O 모든 철학 원칙과 정합.

---

## 8. 산출물 6 — 최종 권고

### 8.1 권장 — Option A + 선택적 Option B

| 권고 | 내용 | 즉시 코드 변경 |
|---|---|:---:|
| **Option A: Conservative Keep** | Neture MyPage 현재 3 페이지 (Hub / Profile / Settings) 그대로 유지. 기능 추가 없음. | **0** |
| **Option B: Light Alignment (선택적)** | account-ui `MyPageLayout` 에 KPA 의 breadcrumb + width prop 도입. 4 service 모두 옵션으로 사용. Neture 는 default 동작 유지 | **별건 WO** |
| Option C: Full feature import | `/mypage/my-forums` / `/mypage/my-requests` 등 신설 | **별건 WO + 사용자 결정** |

### 8.2 권장 = A 단독 또는 A + B 선택 — **즉시 코드 변경 없음**

본 IR 은 **현재 Neture MyPage 구조를 canonical 정합으로 인정** 하는 결정. 추가 정렬 작업은 별건으로 분리.

### 8.3 즉시 효과

- Neture MyPage 의 minimum 구조 (3 페이지) 를 정합 표준으로 공식 인정
- "Neture 가 KPA 를 무리하게 따라가야 하는가?" 의 자연스러운 NO 답변 — Neture 성격에 맞는 구조 보존
- account-ui MyPageLayout 의 향후 강화 방향 제시 (4 service 공통 이득)

---

## 9. 산출물 7 — 후속 WO/IR 제안

### 9.1 본 IR 의 직접 후속

**없음.** 본 IR 의 권장 Option A 채택 시 즉시 코드 변경 없음.

### 9.2 별건 후속 (우선순위별)

| 후속 | 우선순위 | 비고 |
|---|:---:|------|
| `WO-O4O-ACCOUNT-UI-MYPAGE-LAYOUT-ENHANCEMENT-V1` | 中 | account-ui `MyPageLayout` 에 breadcrumb + width prop 추가. 4 service 공통 이득. KPA 의 local layout 점진 통합 |
| `IR-O4O-NETURE-MYPAGE-MY-FORUMS-DESIGN-V1` | 低 | Neture 사용자의 forum 활동 (내가 작성한 글/댓글) 페이지 신설 필요성 평가 |
| `IR-O4O-NETURE-MYPAGE-MY-REQUESTS-DESIGN-V1` | 低 | supplier/partner 가입 신청 상태 통합 페이지 평가 |
| `WO-O4O-KPA-MYPAGE-LAYOUT-MIGRATE-TO-ACCOUNT-UI-V1` | 매우 低 | account-ui 강화 후 KPA 의 local layout 폐기 가능 시 진행 |

### 9.3 본 IR 이 결정하지 않는 것

- `/mypage/my-forums` (Neture 일반 사용자 forum 활동) 페이지 신설 여부 — 별건 IR
- `/mypage/my-requests` (Neture supplier/partner 가입 통합) 페이지 신설 여부 — 별건 IR
- account-ui MyPageLayout 강화의 실제 작업 — 별건 WO
- KPA local MyPageLayout 의 account-ui 통합 시점 — 별건 WO
- 알림 / 보안 / 2FA / 탈퇴 등 미래 기능 위치 — 본 IR 범위 외

---

## 10. Drift 방지 원칙 (요약)

본 IR 의 권고를 향후 drift 없이 유지하려면:

```text
원칙:
1. Neture MyPage 는 Neture 의 사용자 성격 (소비자/공급자/파트너) 에 맞춘 minimum 구조 유지.
2. KPA 의 LMS/자격/보고서/크레딧 메뉴를 Neture 에 억지로 복사하지 않는다.
3. 공급자 측 forum 운영은 /supplier/* (권한 기반). 일반 사용자 forum 활동은 향후 /mypage/* 로 신설 가능.
4. account-ui MyPageLayout 을 공통 source. KPA 의 local 변형은 점진적으로 account-ui 로 끌어올린다.
5. 새 mypage 페이지 추가 시 "Neture 의 사업 성격에 맞는가?" 를 기준으로 결정 — 다른 서비스 메뉴를 mirror 하지 않는다.
6. L1 (프로필) / L2 (비밀번호) 의 V2 정합 유지 — 4 service 공통 패턴 (`PUT /users/profile`, `PUT /users/password` with serviceKey).
```

---

## 11. 본 IR 의 의의

| 차원 | 결과 |
|---|---|
| 즉시 코드 변경 | 0 |
| 즉시 WO 후보 | 0 (본 IR 의 직접 후속) |
| 별건 후속 IR/WO 후보 | 4 (account-ui 강화 / my-forums 평가 / my-requests 평가 / KPA layout 통합) |
| Neture MyPage 구조 정당화 | ✅ "현재 구조가 Neture 성격에 부합" 명문화 |
| O4O 철학 정합 강화 | ✅ "공통 Core + 독립 서비스" 원칙을 MyPage 영역에 명확화 |
| 사이클 정리 | 본 IR 로 "Neture vs KPA MyPage" 비교 결정 종료. 안정화 사이클 |

---

## 부록 — 조사 명령 (재현 가능)

```bash
# 1. KPA + Neture mypage 파일 목록
find services/web-{kpa-society,neture}/src/pages/mypage -name '*.tsx' -o -name '*.ts' | sort

# 2. mypage 라우트 등록
grep -n "/mypage" services/web-{kpa-society,neture}/src/App.tsx

# 3. MyPageLayout / MyPageNavigation 사용처
grep -rn "MyPageLayout\|MyPageNavigation" \
  services/web-{kpa-society,neture}/src packages/account-ui/src

# 4. Neture Global Header 의 mypage 진입
grep -n "/mypage" services/web-neture/src/components/NetureGlobalHeader.tsx

# 5. forum 위치 차이 (KPA vs Neture)
grep -rn "MyForumDashboardPage" services/web-{kpa-society,neture}/src

# 6. account-ui 공통 컴포넌트 목록
ls packages/account-ui/src/components/
```

---

*Created: 2026-05-24*
*Type: Investigation Report (read-only)*
*Status: 조사 완료 — 권장 Option A (현재 3 페이지 구조 유지) + 선택적 Option B (account-ui MyPageLayout 강화 별건).*
*Decision Required: Option A 확정 + 별건 후속 (account-ui 강화 WO / my-forums 평가 IR) 진행 여부.*
