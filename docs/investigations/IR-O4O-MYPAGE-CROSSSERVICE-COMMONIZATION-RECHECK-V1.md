# IR-O4O-MYPAGE-CROSSSERVICE-COMMONIZATION-RECHECK-V1

**작성 일자**: 2026-06-04
**작업 성격**: read-only audit IR — 코드 / UI / API / DB / migration / route / menu 수정 일절 없음
**조사 도구**: 5 병렬 Explore agent — KPA / GlycoPharm / K-Cosmetics / Neture My Page 영역 + 공통 layout & API contract
**조사 기준 commit**: `d8c40e78c` (main, working tree clean)

---

## 0. 핵심 결론 (TL;DR)

> ✅ **My Page 공통화 기본 골격은 완료**, 단 **잔재 5종 + Neture backend 미구현** 정비 권장
>
> 1. **`@o4o/account-ui` 공통 layout 4 서비스 도입 완료** — `MyPageLayout` / `ProfileCard` / `MyPageNavigation` / `MyRequestsInbox` / `SettingsSection` / `PasswordChangeModal` / `RoleBadge` 등 12+ 공통 컴포넌트 사용. drift 거의 없음.
> 2. **Role boundary 완벽 분리** — `/mypage` 와 `/admin/operator/store/supplier/partner` workspace 가 4 서비스 모두 명확 분리. operator/admin action 노출 0. cross-workspace leakage 0.
> 3. **민감정보 보안 OK** — 비밀번호 변경 `serviceKey` 스코핑 (4 서비스 모두), store_owner 비즈니스 정보는 `/store/info` 별도 격리 (KPA 만 부분적으로 `/mypage/profile` 직역 탭에 표시 — 본인 정보 only).
> 4. **Neture 의 workspace 경계 가장 모범적** — `/mypage` 는 personal account 전용, `/supplier/*` / `/partner/*` / `/account/{supplier,partner}/*` 4 workspace 완전 분리.
> 5. **잔재 5종 정비 후보 (Tier 1)** — KPA settings withdrawRequest mock / GP settings 2FA·알림설정·계정삭제 stub / KPA `/event-offers/history` dead link / KPA `MyCompletionsPage` 레거시 / KPA `/mypage/groupbuys` backend 미구현.
> 6. **Backend API 정비 후보 (Tier 2)** — KPA `/mypage/{settings,activities,summary}` placeholder 실 데이터 wiring / Neture `mypage` controller 부재 (의도적인지 결정 필요).
> 7. **KPA-only 풍부 페이지는 도메인 차이로 유지 (H)** — `/mypage/qualifications` / `/mypage/my-forums` / `/mypage/credits` 거래 내역 등.

권고: ① Tier 1 잔재 5종 정비 (small WO) → ② Tier 2 KPA placeholder API wiring / Neture mypage backend 결정 → ③ Tier 3 (선택) UI 미세 정합 (KPA ProfileCard 도입 검토).

---

## 1. 조사 개요

### 1.1 목적

4 서비스 (KPA-Society / GlycoPharm / K-Cosmetics / Neture) 의 My Page 영역 공통화 상태를 read-only 재점검하고 **잔재 / drift / 정합 미달 / 위험** 4 축으로 분류.

### 1.2 범위

- `/mypage*` route + 하위 페이지 전체
- 공통 layout (`@o4o/account-ui`) 사용 현황
- ProfileCard / 신청 / 주문 / 알림 / 인증 / 권한 / UI-UX / API
- 25 sections (제출 IR 요구 사항)

### 1.3 금지 사항 준수

- ✅ 코드 / UI / API / DB / migration / route / menu / 파일 수정 0
- ✅ git add / commit / push 보류 (사용자 승인 후)
- ✅ 다른 세션 WIP 미접촉

---

## 2. 사전 git 상태

| 항목 | 값 |
|------|------|
| branch | main |
| HEAD | `d8c40e78c0053511a2b5d976aef82bc45d77fa79` |
| origin/main 동기화 | Already up to date |
| ahead/behind | 0 / 0 |
| working tree | clean (외부 세션 WIP 0) |

조사 기준 commit: `d8c40e78c` (feat(store): align my-products & local-products headings across 3 services).

---

## 3. My Page 대상 서비스와 범위

| 서비스 | URL | 주요 사용자 | 비고 |
|--------|-----|------------|------|
| KPA-Society | `kpa-society.co.kr/mypage*` | 약사 / 약국 경영자 / 학생 | 가장 풍부 (qualifications, my-forums, credits 거래) |
| GlycoPharm | `glycopharm.co.kr/mypage*` | 약사 / 약국 경영자 | LMS + 매장 신청 통합 inbox |
| K-Cosmetics | `k-cosmetics.site/mypage*` | 판매자 / 소비자 / 파트너 | 매장 입점 + LMS |
| Neture | `neture.co.kr/mypage*` | 공급자 / 파트너 / 구매자 | personal account 전용 — workspace 와 완전 분리 |

---

## 4. Route / Menu 매트릭스

### 4.1 4 서비스 횡단

| 영역 | KPA | GlycoPharm | K-Cosmetics | Neture | 분류 |
|------|:---:|:----------:|:-----------:|:------:|:----:|
| `/mypage` (Hub/Dashboard) | ✅ MyDashboardPage | ✅ MyPageHub | ✅ MyPageHub | ✅ MyPageHub | A |
| `/mypage/profile` | ✅ (기본+직역 탭) | ✅ (이름/닉네임/연락처) | ✅ | ✅ (이름만) | B (KPA 풍부) |
| `/mypage/settings` | ✅ | ✅ | ✅ | ✅ | A |
| `/mypage/my-requests` | ✅ (4 type 통합) | ✅ (membership + 매장) | ✅ (매장 + LMS) | ❌ | C / H |
| `/mypage/enrollments` | ✅ | ✅ | ✅ | ❌ | H (Neture LMS 없음) |
| `/mypage/certificates` | ✅ | ✅ | ✅ | ❌ | H |
| `/mypage/credits` | ✅ (거래 풍부) | ✅ | ✅ | ❌ | C / H |
| `/mypage/qualifications` | ✅ (KPA only) | ❌ | ❌ | ❌ | H (약사회 도메인) |
| `/mypage/my-forums` | ✅ (KPA only) | ❌ | ❌ | ❌ | H (커뮤니티 도메인) |
| `/mypage/my-forums/:id/members` | ✅ (KPA only) | ❌ | ❌ | ❌ | H |
| `/mypage/business-profile` | (별도 /pharmacy) | (별도 /store/info) | (별도 /store/info) | ✅ (supplier wrapper) | H |
| `/mypage/completions` (legacy) | ⚠️ redirect → certificates | ❌ | ❌ | ❌ | E (잔재) |
| `/mypage/groupbuys` | ⚠️ backend 정의만 | ❌ | ❌ | ❌ | E / F |

### 4.2 Dead route / 미정의 link

- KPA `MyDashboardPage` line 198: `/event-offers/history` link — App.tsx route 미정의 → **dead link** (분류 E)
- KPA `MyCompletionsPage`: 파일 잔존, route 는 `/mypage/completions` → `/mypage/certificates` redirect 만 — **레거시 파일** (분류 E)
- KPA `/mypage/groupbuys` backend route: 정의되어 있으나 실제 구현 미발견 — **backend dead** (분류 F)

---

## 5. 공통 Layout 사용 현황

### 5.1 `@o4o/account-ui` 공통 컴포넌트 인벤토리

**위치**: `packages/account-ui/src/components/`

| 컴포넌트 | 역할 |
|----------|------|
| `MyPageLayout` | breadcrumb + title + subtitle + nav + children (width `wide`/`list`/`form`) |
| `ProfileCard` | avatar + name + email + role badge + edit toggle |
| `ProfileInfoField` | 라벨/값/편집 필드 단위 |
| `MyPageNavigation` | tab 스타일 navigation (DEFAULT_ITEMS 3 + customizable) |
| `MyPageHubCard` | Hub quick-nav card |
| `MyPageLoadingState` / `MyPageEmptyState` | 표준 loading/empty |
| `MyRequestsInbox` | 통합 신청 inbox (3 서비스 사용) |
| `RequestStatusBadge` / `RequestTypeBadge` | 상태/타입 배지 |
| `SettingsSection` | 설정 카드 컨테이너 |
| `PasswordChangeModal` | 비밀번호 변경 (4 서비스 사용) |
| `QuickActionsSection` | 로그아웃 등 빠른 action |
| `RoleBadge` / `RoleBadgeGroup` | 역할 표시 |
| `NotificationBell` | 알림 종 (header) |
| `GlobalUserProfileDropdown` | 글로벌 사용자 드롭다운 |
| `BusinessRegistrationFields` | 사업자 등록 정보 입력 |

### 5.2 4 서비스 사용 매트릭스

| 컴포넌트 | KPA | GlycoPharm | K-Cosmetics | Neture |
|---------|:---:|:----------:|:-----------:|:------:|
| `MyPageLayout` | ✅ wrapper | ✅ | ✅ | ✅ |
| `ProfileCard` | ❌ 자체 렌더 | ✅ | ✅ | ✅ |
| `ProfileInfoField` | (자체) | ✅ | ✅ | ✅ |
| `MyPageNavigation` | ✅ (KPA_MYPAGE_NAV_ITEMS) | ✅ | ✅ (KCOS_NAV_ITEMS) | (NetureLayout 사용) |
| `MyPageHubCard` | (자체) | ✅ | ✅ | ✅ |
| `MyRequestsInbox` | ✅ | ✅ | ✅ | ❌ |
| `MyPageLoadingState/EmptyState` | ✅ | ✅ | ✅ | ✅ |
| `PasswordChangeModal` | ✅ | ✅ | ✅ | ✅ |
| `SettingsSection` | (자체) | ✅ | ✅ | ✅ |
| `RoleBadge` | ✅ | ✅ | ✅ | ✅ |

**판정**: 공통화 골격 거의 완료. **KPA 만 ProfileCard 미사용** (자체 avatar+info 렌더, 분류 B) — 도메인 차이가 아닌 구현 편차.

---

## 6. KPA My Page 조사 결과

### 6.1 Route 인벤토리 (12 routes)

`/mypage` / `/mypage/profile` / `/mypage/settings` / `/mypage/certificates` / `/mypage/my-forums` / `/mypage/my-forums/:forumId/members` / `/mypage/my-requests` / `/mypage/qualifications` / `/mypage/enrollments` / `/mypage/credits` / `/mypage/completions` (redirect) / `/mypage/my-forums/request` (redirect).

전부 `MyPageGuard` 적용.

### 6.2 Profile / Account 영역

- **기본 탭**: 성/이름, 닉네임, 핸드폰, 이메일
- **직역 탭** (약사 only): 약사면허 (read-only), 활동유형, 출신교, 근무처
- **약국 정보** (pharmacy_owner only): 약국명, 약국 전화, 대표자명, 담당자명, 세금계산서 이메일, 우편번호/기본주소/상세주소
- **소속 조직**: 분회명 + 직위
- **비밀번호 변경**: `/users/password` PUT + serviceKey='kpa-society' 스코핑

### 6.3 API 인벤토리

| Endpoint | 동작 | mock |
|----------|------|:----:|
| `GET /mypage/summary` | 대시보드 요약 | ⚠️ placeholder |
| `GET /mypage/activities` | 활동 로그 | ⚠️ placeholder |
| `GET/PUT /mypage/profile` | 프로필 조회/수정 | ✅ |
| `GET/PUT /mypage/settings` | 알림 토글 | ⚠️ placeholder |
| `GET /mypage/certificates` | 수료증 | ✅ |
| `GET /mypage/my-requests` | 통합 신청 (4 type) | ✅ |
| `/mypage/groupbuys` | (정의만, 미구현) | ❌ dead |

### 6.4 mock / TODO / no-op

- `MySettingsPage`: `withdrawRequest()` → `// TODO: 실제 API 연동`, mock alert
- `MyDashboardPage`: `/event-offers/history` dead link
- `MyCompletionsPage`: 레거시 파일 (redirect 만)
- `/mypage/groupbuys` backend route: 구현 부재

### 6.5 KPA-only 풍부 페이지 (분류 H)

- `/mypage/qualifications` — 자격 (LMS 제작자 자격)
- `/mypage/my-forums` — 내 포럼 관리 + 회원 조회 (`/mypage/my-forums/:forumId/members`)
- `/mypage/credits` — 크레딧 잔액 + 적립/사용 거래 내역
- Appreciation activity (감사 포인트 received/sent)

→ KPA 약사회 도메인 정체성 반영, 다른 서비스에 부재. 도메인 차이로 유지.

---

## 7. GlycoPharm My Page 조사 결과

### 7.1 Route 인벤토리 (7 routes)

`/mypage` / `/profile` / `/settings` / `/enrollments` / `/certificates` / `/credits` / `/my-requests`. 모두 `SoftGuard feature="mypage"` (allowedRoles 없음 — 인증만).

### 7.2 Profile / Account 영역

- 이름 / 닉네임 / 연락처 / 이메일 (편집 가능: 이름/연락처/닉네임)
- 비밀번호 변경: `/users/password` PUT + serviceKey='glycopharm' 스코핑
- 모든 기기 로그아웃 functional
- 사업자 정보는 `/store/info` (PharmacyInfoPage, store_owner only) 에 격리

### 7.3 API 인벤토리

| Endpoint | 동작 | mock |
|----------|------|:----:|
| `PUT /users/profile` | 프로필 수정 | ✅ |
| `PUT /users/password` | 비밀번호 변경 (serviceKey scoped) | ✅ |
| `GET /glycopharm/mypage/my-requests` | 통합 (membership + 매장 신청) | ✅ |
| `GET/PATCH /glycopharm/mypage/business-info` | 사업자 정보 (pharmacy_owner only) | ✅ |
| `GET /lms/enrollments/me` | LMS 수강 | ✅ |
| `GET /lms/certificates/me` | 수료증 | ✅ |
| `GET /credits/me` + `/transactions` | 크레딧 | ✅ |
| `GET /appreciation/my-received` / `my-sent` | 감사 활동 | ✅ |

### 7.4 mock / TODO / no-op

- `MySettingsPage` 의 stub 3건:
  - 2FA 버튼 (비활성화 표시만, 핸들러 없음)
  - 알림 설정 링크 (no handler)
  - 계정 삭제 버튼 (no handler, red 스타일링)

→ UI 표시만 + functionality 없음. **Tier 1 정비 후보**.

### 7.5 GlycoPharm 특수 사항

- `WO-O4O-GLYCOPHARM-MYPAGE-SPLIT-V1`: monolithic → 3-split architecture (hub + profile + settings)
- `WO-O4O-MYPAGE-MY-REQUESTS-INBOX-GLYCO-KCOS-ROUTE-V1`: K-Cos 와 통합 inbox 정합
- 사업자 정보는 `/store/info` 별도 (`/mypage` 와 분리 — 모범)

---

## 8. K-Cosmetics My Page 조사 결과

### 8.1 Route 인벤토리 (7 routes)

`/mypage` / `/profile` / `/settings` / `/my-requests` / `/enrollments` / `/certificates` / `/credits`. 모두 `<ProtectedRoute>` 인증만.

### 8.2 Profile / Account 영역

- 이름 / 닉네임 / 연락처 / 이메일 / 역할 + 상태
- 비밀번호 변경: serviceKey='cosmetics' 스코핑
- 모든 기기 로그아웃 ✅
- 사업자 정보: `/store/info` (StoreInfoPage, store_owner only) 격리

### 8.3 API 인벤토리

| Endpoint | 동작 | mock |
|----------|------|:----:|
| `GET /cosmetics/stores/application/me` | 매장 입점 신청 상태 | ✅ |
| `GET/PATCH /cosmetics/mypage/business-info` | 사업자 정보 (store_owner only) | ✅ |
| `GET /lms/enrollments/me` | LMS 수강 | ✅ |
| `GET /lms/certificates/me` | 수료증 | ✅ |
| `GET /credits/me` + transactions | 크레딧 | ✅ |
| `GET /appreciation/*` | 감사 활동 | ✅ |

### 8.4 mock / TODO / no-op

- `MySettingsPage`: 알림 설정 / 계정 삭제 등 미구현 (비밀번호 + 모든기기로그아웃만)

→ GP 와 유사 stub 패턴, 정도는 다소 작음.

### 8.5 K-Cos 특수 사항

- `MyRequestsPage`: frontend aggregation 2 source (매장 신청 + LMS 수강) → MyRequestItem[] 정규화
- 가장 깔끔한 role boundary — `/store/info` 와 `/mypage` 명확 분리
- 상품 신청 / 판매자 관리는 My Page 미포함 (operator workspace 영역)

---

## 9. Neture My Page 조사 결과

### 9.1 Route 인벤토리 (4 routes — 최소)

`/mypage` / `/profile` / `/settings` / `/business-profile` (supplier wrapper). 인증만.

### 9.2 Profile / Account 영역

- 이름 (편집 가능) / 이메일 (read-only) / 역할 표시
- `getNetureRoleLabel()` helper — "공급자" / "파트너" / "구매자" badge 조건부
- 비밀번호 변경: serviceKey='neture' 스코핑

### 9.3 Workspace 경계 (가장 중요)

**4 workspace 완전 분리**:
- `/mypage/*` — personal account (NetureLayout, 인증만)
- `/supplier/*` — supplier workspace (`SupplierRoute` + `SupplierSpaceLayout`)
- `/partner/*` — partner workspace (`PartnerSpaceLayout`)
- `/account/supplier/*` + `/account/partner/*` — workspace account 대시보드 (별도 layout)
- `/admin/*` + `/operator/*` — 별도 guard

**경계 검증**:
- `MyPageHub` 의 `isSupplier` flag (lines 50-52): 조건부 supplier badge 표시 — workspace 접근 grant 아님
- `/mypage/business-profile` 는 supplier profile wrapper (lines 106) — `<MyPageLayout>` 내부에서 `<SupplierProfilePage>` 재렌더. 의도된 구조 정합 (`WO-O4O-SUPPLIER-MYPAGE-CANONICAL-PROFILE-ALIGNMENT-V1`).
- Legacy redirect: `/workspace/supplier/profile` → `/mypage/business-profile` (line 1082) — 명확한 마이그레이션.

→ **Neture 가 cross-workspace boundary 가장 모범적**.

### 9.4 Neture 특수 사항

- `/mypage` 가장 최소 (4 routes) — LMS / certificates / credits / my-requests 부재
- "최근 활동" `MyPageEmptyState` — 의도적 placeholder (TODO 아님)
- Backend `mypage` controller 부재 — `/users/profile`, `/users/password` 일반 endpoint 사용
- **결정 필요**: Neture 에 별도 `mypage` controller 도입 vs 의도적 부재 유지 (Tier 2 후보)

---

## 10. Profile / ProfileCard parity

| 서비스 | ProfileCard 사용 | 자체 렌더 | 표시 필드 |
|--------|:---------------:|:--------:|----------|
| KPA | ❌ | ✅ avatar + 직역/약국 정보 + edit | 가장 풍부 (탭 분리) |
| GlycoPharm | ✅ | — | 표준 |
| K-Cosmetics | ✅ | — | 표준 |
| Neture | ✅ | — | 최소 (이름만 편집) |

→ **분류 B (UI 편차)**: KPA `ProfileCard` 도입 가능. 단 KPA 의 풍부한 직역/약국 정보 표시가 ProfileCard 스코프에 안 맞을 수 있음 — Tier 3 검토 후보.

---

## 11. 신청 / 자격 / 승인 내역 parity

| 서비스 | endpoint | 통합 type | 컴포넌트 |
|--------|----------|----------|----------|
| KPA | `/mypage/my-requests` | 4 (forum / course / instructor / membership) | `MyRequestsInbox` (account-ui) |
| GlycoPharm | `/glycopharm/mypage/my-requests` | 2 (membership + service_application) | `MyRequestsInbox` |
| K-Cosmetics | (frontend aggregation 2 source) | 2 (매장 입점 + LMS 수강) | `MyRequestsInbox` |
| Neture | ❌ 없음 | — | (supplier workspace 별도) |

→ KPA / GP / K-Cos 통합 inbox 정합 ✅. **Neture 만 부재** — 의도된 차이 (supplier 신청은 supplier workspace 에).

---

## 12. 주문 / 거래 / 활동 내역 parity

| 서비스 | My Page 노출 | 별도 위치 |
|--------|:------------:|----------|
| KPA | ❌ (credits 거래만) | (개인 구매 없음) |
| GlycoPharm | ❌ | `/store/commerce/orders` (store_owner) |
| K-Cosmetics | ❌ | `/store/commerce/orders` (store_owner) |
| Neture | ❌ | `/account/supplier/orders`, `/store/orders` 별도 |

→ **4 서비스 모두 주문 내역 My Page 미포함** — 도메인 차이 + workspace 분리. 정합 ✅.

---

## 13. 알림 / 메시지 / 활동 로그 parity

| 서비스 | 알림 페이지 | 메시지 페이지 | 활동 로그 |
|--------|:----------:|:-----------:|----------|
| KPA | ❌ (`/mypage/settings` 안 토글만) | ❌ | `/mypage` Dashboard "최근 활동" 카드 (실 데이터, placeholder 일부) |
| GlycoPharm | ❌ (stub) | ❌ | Hub "감사 활동" 카드만 |
| K-Cosmetics | ❌ | ❌ | Hub "감사 활동" 카드만 |
| Neture | ❌ | ❌ | Hub "최근 활동" `MyPageEmptyState` (의도) |

**공통 `NotificationBell` 컴포넌트는 `account-ui` 에 존재** — header 영역 사용. My Page 안 별도 페이지는 4 서비스 모두 부재.

→ **분류 C / F**: 알림 페이지 자체가 4 서비스 모두 부재. 통합 정비 필요 시 별도 IR (Tier 2).

---

## 14. 권한 / Role Boundary 확인

| 서비스 | `/mypage` 진입 | operator/admin action 노출 | workspace 분리 |
|--------|:------------:|:------------------------:|:--------------:|
| KPA | MyPageGuard (인증만) | ❌ | ✅ `/operator/*` `/admin/*` 별도 |
| GlycoPharm | SoftGuard feature="mypage" | ❌ | ✅ |
| K-Cosmetics | ProtectedRoute | ❌ | ✅ |
| Neture | 인증만 | ❌ | ✅ (4 workspace 완전 분리) |

**판정**: 4 서비스 모두 role boundary 명확. operator/admin/store_owner/supplier action 이 `/mypage` 안에 섞임 없음. ✅

---

## 15. UI-UX 공통성 확인

| 항목 | 정합 |
|------|:----:|
| MyPageLayout 4 서비스 사용 | ✅ |
| 카드 layout / spacing / neutral tone | ✅ |
| header (title + subtitle + breadcrumb) | ✅ |
| sidebar / nav tab | ✅ (Neture 만 NetureLayout 사용 — 의도) |
| profile summary | ⚠️ KPA 자체 렌더, 나머지 3개 ProfileCard |
| empty / loading / error state | ✅ (MyPageEmptyState / LoadingState) |
| action button 위치 | ✅ |
| badge / status color (RoleBadge / RequestStatusBadge) | ✅ |
| mobile layout | ✅ (WO-O4O-KPA-MYPAGE-FORM-MOBILE-V1 등 정비됨) |
| icon 사용 | ✅ lucide |
| guide / help link | ✅ |
| CTA 문구 | ⚠️ 일부 편차 (Tier 3 검토) |

---

## 16. API / Backend Contract 확인

### 16.1 namespace 분리

4 서비스 모두 `/api/v1/{service}/mypage/*` 네임스페이스 분리 ✅. cross-service boundary 위반 0.

### 16.2 backend controller 인벤토리

| 서비스 | controller 위치 | 상태 |
|--------|----------------|------|
| KPA | `apps/api-server/src/routes/kpa/controllers/mypage.controller.ts` | ⚠️ summary/activities/settings placeholder |
| GlycoPharm | `apps/api-server/src/routes/glycopharm/controllers/mypage.controller.ts` | ✅ |
| K-Cosmetics | `apps/api-server/src/routes/cosmetics/controllers/cosmetics-mypage.controller.ts` | ✅ |
| Neture | ❌ 없음 | `/users/profile`, `/users/password` 일반 endpoint 사용 |

### 16.3 권한 / boundary

- userId 기반: 모든 mypage endpoint (`req.user.id`)
- organizationId 기반: notifications (멀티 테넌트)
- serviceKey 기반: notifications 선택 필터 + 비밀번호 변경 스코핑
- cross-service 위반 가능성 매우 낮음 ✅

### 16.4 PII 응답 범위

- 표준 profile 응답: name / email / phone / nickname / role / status
- KPA 추가: licenseNumber / pharmacy 정보 (CEO / 사업자번호 / 주소 / 세금 이메일)
- GP / K-Cos: business-info 별도 endpoint (store_owner only)
- 응답 자체 PII 노출은 본인 계정 한정 — **위험 낮음**

---

## 17. mock / TODO / no-op / dead surface 목록

| # | 위치 | 종류 | 분류 |
|:-:|------|------|:----:|
| 1 | KPA `MySettingsPage.tsx` line 82 `withdrawRequest()` | TODO mock alert | E |
| 2 | KPA `MyDashboardPage.tsx` line 198 `/event-offers/history` | dead link | E |
| 3 | KPA `MyCompletionsPage.tsx` | 레거시 파일 (redirect only) | E |
| 4 | KPA backend `/mypage/groupbuys` | 정의만, 구현 부재 | E / F |
| 5 | KPA backend `/mypage/{summary,activities,settings}` | placeholder | F |
| 6 | GP `MySettingsPage` 2FA 버튼 | UI stub, 핸들러 없음 | E |
| 7 | GP `MySettingsPage` 알림 설정 링크 | stub | E |
| 8 | GP `MySettingsPage` 계정 삭제 버튼 | stub | E |
| 9 | K-Cos `MySettingsPage` 알림 설정 / 계정 삭제 | 미구현 | E |
| 10 | Neture backend `mypage` controller | 부재 | F (의도 vs 누락 결정 필요) |

→ 총 **10건 정비 후보** — Tier 1 (8건) + Tier 2 (2건).

---

## 18. Route / Menu / Dead link 목록

| 위치 | dead 정도 | 정비 권장 |
|------|:--------:|----------|
| KPA `/event-offers/history` (dashboard link) | route 미정의 | link 제거 또는 route 추가 |
| KPA `/mypage/completions` | redirect 동작 OK / 파일 잔존 | `MyCompletionsPage.tsx` 삭제 |
| KPA `/mypage/groupbuys` (backend) | 구현 부재 | route 제거 또는 wiring |

기타 4 서비스 dead link 발견 0 ✅.

---

## 19. 개인정보 / 보안 위험 목록

| 위치 | 노출 | 위험도 | 비고 |
|------|------|:------:|------|
| KPA `/mypage/profile` 직역 탭 | licenseNumber, pharmacy 정보, CEO명, 세금 이메일 | 중 | 본인 only, role-gated (pharmacy_owner) |
| GP / K-Cos `/store/info` | 사업자 정보 | 중 | store_owner only, `/mypage` 와 분리 |
| 4 서비스 비밀번호 변경 | password (POST body) | 낮 | serviceKey 스코핑, HTTPS, response 평문 0 |
| Notification API | serviceKey + organizationId 필터 | 낮 | boundary 명확 |
| User entity `businessInfo` JSONB | 공유 구조 | 중 | 서비스별 prefix 없음 — 관례 의존 |

**판정**: 본인 계정 한정 + role gating + serviceKey 스코핑으로 **위험 낮음**. KPA 약국 정보 표시는 의도된 design.

---

## 20. 분류표

| 분류 | 정의 | 항목 수 | 예시 |
|:----:|------|:------:|------|
| **A** | 4 서비스 공통화 완료 | 다수 | MyPageLayout / ProfileCard / MyPageNavigation / PasswordChangeModal / RoleBadge / role boundary |
| **B** | 기능 동등하나 UI 편차 | 1 | KPA ProfileCard 미사용 (자체 렌더) |
| **C** | 일부 서비스만 풍부 | 3 | KPA my-requests 4 type / KPA credits 거래 / KPA activity 카드 |
| **D** | route/menu 불일치 | 0 | (4 서비스 기본 path 정합) |
| **E** | mock/TODO/no-op/dead | 8 | §17 의 1-9 항목 |
| **F** | backend API contract 부족 | 2 | KPA placeholder / Neture controller 부재 |
| **G** | workspace 영역 (My Page 외) | 0 | (4 서비스 모두 명확 분리) |
| **H** | 도메인 차이로 유지 | 4 | KPA qualifications / my-forums / Neture business-profile / KPA-only 풍부 페이지 |
| **I** | 개인정보 노출 위험 | 0 (모두 낮음) | (§19 의 모든 항목이 role-gated / scoped) |

---

## 21. 즉시 WO 가능한 후보 (Tier 1)

작은 cleanup / dead 정비. 코드 변경 작음.

| 가칭 WO | 범위 | 비용 |
|---------|------|:----:|
| WO-O4O-KPA-MYPAGE-SETTINGS-WITHDRAW-MOCK-CLEANUP-V1 | `MySettingsPage` TODO mock alert 정리 (hide 또는 메시지 명시) | 작음 |
| WO-O4O-KPA-MYPAGE-EVENT-OFFERS-HISTORY-DEAD-LINK-CLEANUP-V1 | `MyDashboardPage` line 198 dead link 제거 또는 route 추가 | 작음 |
| WO-O4O-KPA-MYPAGE-COMPLETIONS-LEGACY-FILE-REMOVAL-V1 | `MyCompletionsPage.tsx` 파일 제거 (redirect 유지) | 매우 작음 |
| WO-O4O-GLYCOPHARM-MYPAGE-SETTINGS-STUB-CLEANUP-V1 | 2FA / 알림설정 / 계정삭제 stub 3건 정리 (hide 또는 "준비 중" 명시) | 작음 |
| WO-O4O-KCOSMETICS-MYPAGE-SETTINGS-STUB-CLEANUP-V1 | 알림설정 / 계정삭제 stub 정리 | 작음 |

→ 총 5 small WO 후보. 모두 fail-closed (drift 정비). 각각 ~2-5 lines.

---

## 22. Backend / API 선행 후보 (Tier 2)

backend 작업 필요. 결정 후 진행.

| 가칭 WO/IR | 범위 | 비용 |
|------------|------|:----:|
| WO-O4O-KPA-MYPAGE-PLACEHOLDER-API-WIRING-V1 | `/mypage/{summary,activities,settings}` placeholder → 실 데이터 query | 중간 |
| WO-O4O-KPA-MYPAGE-GROUPBUYS-DEAD-ROUTE-CLEANUP-V1 | backend `/mypage/groupbuys` 구현 vs 제거 결정 | 작음 |
| IR-O4O-NETURE-MYPAGE-BACKEND-CONTRACT-V1 | Neture mypage controller 도입 vs 의도적 부재 유지 결정 | 작음 (IR only) |
| IR-O4O-MYPAGE-NOTIFICATION-PAGE-V1 (선택) | 4 서비스 통합 알림 페이지 도입 검토 | 중간 (IR only) |

---

## 23. 다른 축으로 이관할 후보

| 항목 | 이관 대상 | 사유 |
|------|----------|------|
| KPA `/mypage/my-forums` 운영자 경계 모호 영역 | Operator 공통화 축 / 또는 Forum 영역 | 회원 관리 액션이 operator 권한과 겹치는지 별도 검토 |
| 사업자 정보 (`/store/info`) 4 서비스 정합 | Store Hub / My Store 공통화 축 | `/mypage` 와 분리됐으나 4 서비스 정합 별도 검토 (필요 시) |

---

## 24. 우선순위 제안

| 순위 | 그룹 | 항목 | 사유 |
|:----:|------|------|------|
| 1 | Tier 1 (즉시) | Tier 1 small WO 5건 묶음 (또는 개별) | dead/mock 정비. 사용자 체감 향상. 비용 낮음. |
| 2 | Tier 2 결정 | IR-O4O-NETURE-MYPAGE-BACKEND-CONTRACT-V1 | Neture mypage controller 의도 confirm. 결정 후 다음 단계 분기. |
| 3 | Tier 2 작업 | KPA placeholder API wiring | KPA summary / activities / settings 실 데이터 필요 시 진행. |
| 4 | Tier 3 (선택) | KPA ProfileCard 도입 검토 | UI 편차 정비. 우선순위 낮음. |
| 5 | Tier 3 (선택) | 알림 페이지 통합 검토 | 4 서비스 통합 알림 IR. 우선순위 낮음. |

---

## 25. Current Structure vs O4O Philosophy Conflict Check

[`O4O-BUSINESS-PHILOSOPHY-V1`](../baseline/O4O-BUSINESS-PHILOSOPHY-V1.md) + [`O4O-3-ROLE-FLOW-BASELINE-V1`](../baseline/O4O-3-ROLE-FLOW-BASELINE-V1.md) 정합 점검.

| 원칙 | 정합 | 비고 |
|------|:----:|------|
| My Page = 개인 계정 / 활동 중심 공간 | ✅ | 4 서비스 모두 정합 |
| 서비스별 차이 = 도메인 차이 vs 구현 편차 구분 | ✅ | KPA-only 풍부 페이지는 도메인 (H), KPA ProfileCard 미사용은 구현 편차 (B) |
| 공통 계정 경험 제공 | ✅ | `@o4o/account-ui` 12+ 공통 컴포넌트 4 서비스 사용 |
| `/mypage` 와 workspace 분리 | ✅ | 4 서비스 명확. Neture 가장 모범. |
| 주문/신청/자격/활동 사용자 관점 이해 | ✅ | `MyRequestsInbox` 통합 (3 서비스) + `RoleBadge` / `RequestStatusBadge` |
| 위험 action 노출 최소 | ✅ | operator/admin action 0. 비밀번호 스코핑. 사업자 정보 store_owner 격리 |
| §3 참여 주체 (공급자 / 운영자 / 매장 / 사용자) | ✅ | Neture workspace 분리가 §3 정합 모범 |
| §3.2 operator 정의 (일상 운영) | ✅ | operator 영역이 `/mypage` 에 섞이지 않음 |
| §7 Drift 방지 | ✅ | 도메인 어휘 / role 어휘 격리 양호 |
| 1인 개발 유지보수성 | ✅ | 공통 컴포넌트 12+ 사용으로 유지보수 부담 작음 |
| 개인정보 노출 최소화 | ✅ | role gating + serviceKey 스코핑 + 본인 한정 |

> **종합 판정**: My Page 공통화는 **O4O 철학과 정합**. 잔재 정비 (Tier 1 5건) + Neture backend 결정 (Tier 2 IR) 후 종결 가능. 도메인 차이 (H 분류) 는 의도된 차이로 유지 자연스러움.

---

## 최종 보고에 포함할 것 (요약)

| 항목 | 값 |
|------|------|
| 수정 파일 | 없음 ✅ (read-only IR) |
| 생성 IR 문서 경로 | `docs/investigations/IR-O4O-MYPAGE-CROSSSERVICE-COMMONIZATION-RECHECK-V1.md` |
| 조사 기준 commit | `d8c40e78c` |
| 4 서비스 route 요약 | KPA 12 / GP 7 / K-Cos 7 / Neture 4 routes |
| 공통 layout 사용 | `MyPageLayout` 4/4 / `ProfileCard` 3/4 (KPA 미사용) / `MyPageNavigation` 3/4 (Neture 미사용) / `MyRequestsInbox` 3/4 (Neture 미사용) |
| ProfileCard parity | 3/4 정합. KPA 만 자체 렌더 (분류 B) |
| 신청/자격 내역 parity | 3/4 통합 inbox / Neture 부재 (의도) |
| 주문/거래 parity | 4/4 My Page 미포함 (workspace 분리 ✅) |
| 알림/메시지 parity | 4/4 별도 페이지 부재 |
| Role boundary | ✅ 4 서비스 모두 명확 |
| mock/TODO/no-op/dead | 10건 (Tier 1 8 + Tier 2 2) |
| 개인정보 위험 | 위험 낮음 (모두 role-gated + scoped) |
| 즉시 WO 후보 | Tier 1 small WO 5건 |
| Backend 선행 후보 | Tier 2 IR/WO 2건 (Neture / KPA placeholder) |
| 다른 축 이관 | KPA `/mypage/my-forums` 검토 / 사업자 정보 4 서비스 정합 |
| 우선순위 | Tier 1 → Tier 2 (Neture IR) → Tier 2 (KPA wiring) → Tier 3 (선택) |
| git status | working tree clean (외부 세션 WIP 없음) |

---

> **상태**: My Page cross-service 공통화 재점검 IR 완료. 공통 layout / role boundary / API contract 정합 양호. 잔재 10건 (mock/dead) 정비 후보 + Neture backend 결정 필요. 본 IR commit 은 사용자 승인 후 path-restricted single commit 으로 진행 예정.
