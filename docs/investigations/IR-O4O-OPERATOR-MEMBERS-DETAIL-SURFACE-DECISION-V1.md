# IR-O4O-OPERATOR-MEMBERS-DETAIL-SURFACE-DECISION-V1

> **조사 보고서 (Investigation Report) — 조사 전용 / 코드·DB·UI·migration 변경 없음.**
>
> 4 service (KPA / Neture / GP / K-Cos) 의 Operator 회원 관리 화면에서 회원 상세 표시 방식의 **Canonical UX 결정.**

- **작성일:** 2026-05-24
- **개정:** 2026-05-24 (Rev.1) — KPA scope 보강 (§2.1 정정, §2.5 신설, §7 WO scope 재정의)
- **분류:** Investigation (read-only)
- **선행 산출물:**
  - [IR-O4O-CROSS-SERVICE-CAPABILITY-PARITY-AUDIT-V1](IR-O4O-CROSS-SERVICE-CAPABILITY-PARITY-AUDIT-V1.md) (drift Top 5 의 #3)
  - `WO-O4O-USER-DETAIL-PAGE-COMMONIZATION-V1` (UserDetailPage 페이지 자체는 이미 commonized)
  - `WO-O4O-OPERATOR-RESOURCES-CANONICAL-COMMONIZATION-V1` (직전 완료)
- **사전 동기화:** origin/main 와 0 commits 차이, staged 비어 있음.
- **수정 행위:** **없음**

---

## 0. 한 줄 권고

> **Option C — Hybrid Canonical.** 기본 row click = **Drawer** (4 service 모두), Drawer 내 "전체 상세 보기" 버튼으로 **기존 `CommonUserDetailPage`** 진입 가능.
>
> **핵심 발견:** UserDetailPage **페이지 자체는 이미 4 service 모두 `@o4o/ui CommonUserDetailPage` thin wrapper 로 commonization 완료** (선행 WO-O4O-USER-DETAIL-PAGE-COMMONIZATION-V1). drift 는 "row click → drawer vs page nav" **진입 표면** 만 남음. Hybrid 채택 시 4 service 모두 Drawer 가 기본, 기존 페이지는 옵션으로 유지.

---

## 1. 조사 환경

| 항목 | 값 |
|---|---|
| 조사일 | 2026-05-24 |
| Repo 시점 | origin/main 와 일치 |
| 조사 범위 | 4 service `pages/operator/UsersPage|UsersManagementPage|UserDetailPage|EditUserModal` + 각 `App.tsx` + `@o4o/ui CommonUserDetailPage` (이미 commonized) |

---

## 2. 현재 구조 비교 — 핵심 발견

### 2.1 4 service 의 row click 동작 + UserDetailPage route 매트릭스 (Rev.1 — KPA 정정)

| Service | live page (실 라우팅) | row click | UserDetailPage route 등재 | Drawer footer "전체 상세" 링크 | 패턴 |
|---|---|---|---|---|---|
| **KPA** | `MemberManagementPage` (`/operator/members`) | `setSelectedMember(m)` → Drawer (MemberManagementPage:1181) | ✅ `OperatorRoutes.tsx:161` (App.tsx 아닌 OperatorRoutes 패턴) | ❌ 없음 | **Drawer ONLY (link 없음)** |
| **Neture** | `UsersManagementPage` (`/operator/users`) | `setSelectedUser(user)` → Drawer (line 719) | ✅ `/operator/users/:id` + `/admin/users/:id` (App.tsx 889, 965) | ✅ 있음 (line 832-840) | **Drawer + Page link 완성** |
| **GP** | `UsersPage` (`/operator/users` + `/admin/users`) | `navigate('/operator/users/${user.id}')` → Page (line 738) | ✅ `/operator/users/:id` x2 (App.tsx 537, 577) | (Drawer 없음) | **Page nav ONLY** |
| **K-Cos** | `UsersPage` (`/operator/users` + `/admin/users`) | `navigate('/operator/users/${user.id}')` → Page (line 550) | ✅ `/operator/users/:id` x2 (App.tsx 434, 474) | (Drawer 없음) | **Page nav ONLY** |

→ **Drawer 사용:** KPA / Neture (2 service)
→ **Page nav 사용:** GP / K-Cos (2 service)
→ **Hybrid (Drawer + footer link) 완성:** Neture (1 service)

> **이전 (Rev.0) 의 KPA 분석 오류**: `UsersPage.tsx` (956 lines) 기준으로 "Drawer ONLY + App.tsx route 미등록" 으로 기재했으나, **KPA UsersPage.tsx 는 dead code** 이며 (§2.5 참조) 실제 KPA 의 live members 페이지는 `MemberManagementPage` 이다. 라우팅은 App.tsx 가 아닌 `OperatorRoutes.tsx` 를 통해 처리된다. 본 표는 Rev.1 에서 live page 기준으로 재작성.

### 2.2 `UserDetailPage` 의 commonization 상태 — 이미 완료

4 service 모두 `@o4o/ui` 의 `CommonUserDetailPage` thin wrapper 사용 (선행 `WO-O4O-USER-DETAIL-PAGE-COMMONIZATION-V1`):

| Service | 파일 | 라인 | 구조 |
|---|---|---:|---|
| KPA | UserDetailPage.tsx | 72 | `<CommonUserDetailPage apiAdapter config={kpaConfig} ... />` |
| Neture | UserDetailPage.tsx | 104 | `+ actions={netureActions}` (Neture 만 status change 별도 endpoint 사용) |
| GP | UserDetailPage.tsx | 70 | `<CommonUserDetailPage ... config={glycopharmConfig}>` (theme: primary, businessNameLabel: '약국명') |
| K-Cos | UserDetailPage.tsx | 69 | 동일 패턴 |

→ **`/operator/users/:id` 페이지 자체는 100% commonization 완료.** drift 는 페이지가 아니라 "진입 방식 (drawer vs nav)" 에만 존재.

### 2.3 EditUserModal 분포 (참고)

| Service | EditUserModal.tsx 라인 |
|---|---:|
| KPA | 397 |
| Neture | 336 |
| GP | 354 |
| K-Cos | 356 |

→ 4 service 모두 별도 EditUserModal 보유 (size 비슷, structural 차이 미확정). 본 IR 의 직접 영역 아님 (별건 정합).

### 2.4 UsersPage 자체 라인 수 (참고)

| Service | 파일 | 라인 | 비고 |
|---|---|---:|---|
| KPA | UsersPage.tsx | 956 | **DEAD CODE** (§2.5) |
| KPA | MemberManagementPage.tsx | 1850+ | **live members 페이지** (KpaMember entity) |
| Neture | UsersManagementPage.tsx | 916 | live |
| GP | UsersPage.tsx | 809 | live |
| K-Cos | UsersPage.tsx | 620 | live |

→ live 평균 ~1050 lines (KPA MemberManagementPage 포함). KPA 는 entity 가 달라 다른 wrapper 후보. 향후 list-side commonization 후보 (별건 — 본 IR 영역 아님).

### 2.5 KPA 의 routing 실체 — UsersPage 는 dead code (Rev.1 신설)

**조사 발견:**

1. **`services/web-kpa-society/src/pages/operator/UsersPage.tsx` (956 lines) 는 어디서도 import 되지 않음:**
   - `pages/operator/index.ts` barrel 에 export 없음 (MemberManagementPage 만 export)
   - `OperatorRoutes.tsx:20` "UsersPage" 등장은 단순 comment
   - `EditUserModal.tsx:5` "UsersPage" 등장은 docstring
   - 실제 import 0건 → 어떤 route 에도 mount 되지 않음 → 렌더 불가능
   - 같은 폴더의 `EditUserModal.tsx` (397 lines) 도 UsersPage 만 사용한다면 dead code 후보

2. **KPA 는 `App.tsx` 가 아닌 `OperatorRoutes.tsx` 패턴 사용:**
   - `services/web-kpa-society/src/routes/OperatorRoutes.tsx` 가 모든 `/operator/*` 라우팅 담당
   - `/operator/members` (line 131) → `MemberManagementPage` ← **live members 페이지**
   - `/operator/users` (line 160) → `Navigate to /operator/members` (redirect)
   - `/operator/users/:id` (line 161) → `UserDetailPage` ← **이미 등재됨** (Rev.0 의 "App.tsx 에 미등록" 진술은 false)

3. **MemberManagementPage 의 entity 는 `KpaMember` (User 가 아님):**
   - `KpaMember.id` ≠ `User.id`
   - `KpaMember.user_id` (line 61) 는 `User.id` 참조
   - → Drawer 에서 `/operator/users/:id` 로 navigate 하려면 `selectedMember.user_id` 사용
   - → `CommonUserDetailPage` 와 entity 호환 가능 (user_id 기준)

4. **MemberManagementPage 의 Drawer 상태:**
   - `ActionBar`, `BaseDetailDrawer` 사용 중 (line 33 import, line 1233 mount)
   - Drawer footer 에 **"전체 상세 페이지 →" 링크 없음** (Neture 의 832-840 같은 패턴 부재)
   - → Hybrid Canonical 적용 시 footer 링크 1 추가가 KPA 작업 전부

**원본 IR (Rev.0) 의 영향:**
- §2.1 의 KPA 행 — UsersPage 기준 분석은 무의미. live page = MemberManagementPage 기준으로 재작성 (Rev.1 §2.1 참조).
- §7 의 KPA WO 작업 — "App.tsx 에 route 추가" 는 불필요. "MemberManagementPage Drawer 에 footer 링크 추가 (user_id 사용)" 로 재정의 (Rev.1 §7 참조).
- §10 에 dead code 정리는 본 IR 결정 외 별건으로 두되, follow-up WO 후보 1 건 추가 (§10 참조).

---

## 3. Drawer vs Page — 비교 분석

### 3.1 Drawer 방식 (KPA / Neture 현재)

**장점:**
- 목록 맥락 유지 — 운영자가 여러 회원 빠르게 검토 시 우수
- 빠른 검토 + 즉시 다음 row 로 이동
- 운영자 대량 처리 (승인/거부) 에 최적
- KPA / Neture 가 이미 검증 완료

**단점:**
- 복잡한 이력 / 권한 변경 / 다섯 탭 이상의 정보는 좁은 화면에서 답답
- URL 공유 / 북마크 불가 (회원 ID 가 URL 에 없음)
- 키보드 navigation 약함

### 3.2 Page Navigation 방식 (GP / K-Cos 현재)

**장점:**
- 상세 정보가 많을 때 layout 여유 (이력, 권한, 결제, 활동)
- URL 공유 / 북마크 / 브라우저 history 가능 (예: `/operator/users/abc-123`)
- 복잡한 편집/관리에 적합
- KPA/Neture 도 이미 같은 `CommonUserDetailPage` 페이지 보유 — 인프라 부재 없음

**단점:**
- 목록 맥락 이탈 (다시 list 로 돌아가야 함)
- 대량 승인/거부 처리 UX 떨어짐
- 빠른 검토 + 다음 row 흐름 깨짐

### 3.3 Hybrid 가능성 (권고)

**구조:**
- Default row click → **Drawer** (4 service 모두)
- Drawer 내 "전체 상세 보기" 버튼 → `navigate('/operator/users/:id')` (이미 commonized 페이지)

**장점:**
- Drawer 의 빠른 검토 + Page 의 깊이 있는 관리 모두 보존
- `/operator/users/:id` URL 공유/북마크 가능 (직접 URL 도 작동)
- 4 service 동일 UX (drawer = default, page = optional deeper)
- **이미 4 service 모두 `CommonUserDetailPage` 보유** → 새 인프라 부재 (GP/K-Cos route 보존, KPA route 만 추가)

**단점:**
- "전체 상세 보기" 버튼 UX 의 자연스러움이 운영자에 달림 — 실 사용 검증 필요
- KPA 가 현재 route 미등재 → App.tsx 추가 필요 (소규모)

---

## 4. 서비스별 상세 정보량 비교 (Page 필요성 평가)

`CommonUserDetailPage` 가 표시하는 정보 종류:

| 영역 | KPA | Neture | GP | K-Cos |
|---|---|---|---|---|
| 프로필 (name/email/phone/avatar) | ✓ | ✓ | ✓ | ✓ |
| 역할 (roles[]) | ✓ | ✓ | ✓ | ✓ |
| Memberships per service | ✓ | ✓ (다중) | ✓ | ✓ |
| 가입 흐름 (pending/rejected/approved) | ✓ | ✓ (Neture registration 별도) | ✓ | ✓ |
| 비밀번호 변경 (operator-as-user) | ✓ | ✓ | ✓ | ✓ |
| 정지 / 활성화 / 삭제 | ✓ | ✓ | ✓ | ✓ |
| Business 정보 (약국/사업자 정보) | "약국 정보" | "사업자 정보" | "약국 정보" | (default) |
| 서비스별 데이터 (포인트/수강/자격 등) | KPA only | (Neture supplier 등) | (GP-only billing 등) | (K-Cos 매장) |

→ **공통 영역은 6-7 항목** + service-specific theme/label 만 다름. CommonUserDetailPage 가 이미 generic config 로 처리.

**Page 필요성:** 위 정보를 Drawer (520-600px 폭) 에 모두 담기 어려움. **확장 상세는 Page 가 적합.**
**Drawer 필요성:** 빠른 상태 변경 (승인/거부/정지) 은 Drawer 의 footer action 으로 충분.

→ **Hybrid (Drawer + 전체 상세 Page) 가 최적.**

---

## 5. 공통화 대상 판정

| 컴포넌트 | 공통화 상태 | 추가 작업 |
|---|---|---|
| `CommonUserDetailPage` (`@o4o/ui`) | ✅ 이미 4 service 통합 | 없음 |
| `BaseDetailDrawer` (`@o4o/ui`) | ✅ 4 service 모두 채택 가능 (현재 KPA/Neture 사용) | GP/K-Cos 의 UsersPage 에 Drawer 추가 |
| `MemberListLayout` (`operator-ux-core`) | ✅ 4 service 모두 채택 | 없음 |
| Drawer 내 member detail content | ⚪ KPA/Neture 각자 구현 (300+ lines 의 InfoRow + actions) | **공통 컴포넌트 추출 가능** — 향후 commonization 의 핵심 후보 |
| Approval/status action (drawer footer) | ⚪ KPA/Neture 각자 구현 | **공통 actions slot 후보** |

**Slot 후보 (commonization WO 시):**
- `serviceKey: string`
- `client: MembersClient` (operatorList / operatorUpdateStatus 등)
- `drawerExtraSections?: (user) => ReactNode` (service-specific 추가 정보 영역)
- `customActions?: (user) => DrawerAction[]` (service-specific 액션)

---

## 6. Canonical 결정

### Option A — Drawer Canonical (4 service 모두 Drawer)
- 장점: 모두 KPA/Neture 패턴 통일 + 빠른 검토 강점
- 단점: 복잡한 정보 표시 불편, GP/K-Cos 의 기존 page navigation UX 손실
- 판정: ⚪ 가능하나 추천 안 함 (page 강점 폐기)

### Option B — Page Canonical (4 service 모두 page nav)
- 장점: 모두 GP/K-Cos 패턴 통일 + URL 공유 강점
- 단점: KPA/Neture 의 drawer 빠른 검토 UX 손실, 운영자 대량 처리 UX 떨어짐
- 판정: ❌ 비추천 (운영 현실에서 drawer 가 빠른 처리에 유리)

### Option C — Hybrid Canonical ✅ **권장**
- **기본 row click = Drawer (4 service 모두)**
- **Drawer 내 "전체 상세 보기" 버튼 = navigate to `/operator/users/:id`** (이미 commonized `CommonUserDetailPage`)
- 장점:
  - 두 UX 의 강점 모두 보존
  - 4 service 모두 동일 진입 패턴 (drawer = default, page = optional deeper)
  - 인프라 부재 없음 — `CommonUserDetailPage` 이미 4 service 보유
  - GP/K-Cos 기존 page route 보존 (직접 URL 접근 가능)
- 단점:
  - KPA App.tsx 에 `/operator/users/:id` route 1 개 신설 필요 (소규모)
  - GP/K-Cos UsersPage 의 row click 동작 변경 + BaseDetailDrawer 추가 필요 (중간 규모)
- 판정: ✅ **권장**

### 결정: **Option C — Hybrid Canonical**

---

## 7. 후속 WO 범위

### `WO-O4O-OPERATOR-MEMBERS-DETAIL-SURFACE-CANONICALIZATION-V1` (Rev.1)

| 항목 | 내용 |
|---|---|
| 범위 | **GP + K-Cos 의 UsersPage 에 Drawer 도입 + KPA MemberManagementPage Drawer 에 footer 링크 추가** (Rev.1 정정) |
| KPA 작업 | **MemberManagementPage Drawer 의 footer 에 "전체 상세 페이지 →" 링크 추가** — `href={\`/operator/users/${selectedMember.user_id}\`}` (KpaMember 의 user_id 사용, UserDetailPage 의 user UUID 매칭). **App.tsx 작업 0** (route 는 이미 OperatorRoutes.tsx:161 에 등재). **UsersPage.tsx 작업 0** (dead code, 본 WO 범위 외). |
| Neture 작업 | **작업 0** (Rev.1 정정 — Neture UsersManagementPage:832-840 에 이미 footer 링크 완성. 추가 작업 없음). |
| GP 작업 | UsersPage row click: `navigate` → `setSelectedUser`. BaseDetailDrawer 신설 (Neture 패턴 mirror). Drawer footer "전체 상세 페이지 →" 링크 추가 (기존 page route 보존). |
| K-Cos 작업 | 동일 (GP 와 같음). |
| Backend 변경 | 0 |
| `CommonUserDetailPage` 변경 | 0 (이미 commonized) |
| `BaseDetailDrawer` 변경 | 0 (이미 commonized) |
| 회귀 위험 | 중간 — GP/K-Cos 의 UsersPage UX 변경 (navigate → drawer). 운영자가 새 UX 에 익숙해질 시간 필요. 단, page 도 URL 직접 접근 가능 (보존). KPA 변경은 footer 링크 1 추가로 최소. |
| 검증 | KPA `/operator/members` → row click → Drawer → "전체 상세 페이지 →" → `/operator/users/<user_id>` 진입. Neture `/operator/users` 동작 변화 없음. GP/K-Cos `/operator/users` → row click → Drawer (신설) → "전체 상세 페이지 →" → 기존 page 진입. |

**Optional 별건 follow-up** (본 WO 후 또는 병렬):
- `WO-O4O-OPERATOR-MEMBERS-LIST-COMMONIZATION-V1` — 4 service members list 의 commonization. 단, KPA 는 `MemberManagementPage` (KpaMember entity) + Neture/GP/K-Cos 는 UsersPage (User entity) 이라 wrapper 가 entity-agnostic 이어야 함. 또는 KPA 만 별도 wrapper.
- `WO-O4O-OPERATOR-MEMBERS-EDIT-MODAL-COMMONIZATION-V1` — 4 service EditUserModal (~360 lines 평균) 의 통합. KPA EditUserModal 도 dead code 후보 (UsersPage 만 import 한다면).
- `WO-O4O-KPA-USERS-PAGE-DEAD-CODE-REMOVAL-V1` (Rev.1 신설) — KPA `UsersPage.tsx` (956 lines) + 연관 dead code (`EditUserModal.tsx` 일부 가능성) 의 정리. **본 IR 결정 외 별건** — 본 WO 와 분리 권장 (한 번에 두 WO 가 겹치면 staging 충돌 가능).

---

## 8. 현재 구조 vs O4O 철학 충돌 체크

| 차원 | Option C 채택 시 | 충돌 |
|---|:---:|:---:|
| 공통 Core (operator-ux-core / @o4o/ui) | ✅ `CommonUserDetailPage` + `BaseDetailDrawer` 이미 인프라 충실 | 없음 |
| 같은 Capability → 같은 UI/UX | ✅ 4 service 모두 drawer default + page optional 정합 | 없음 |
| 서비스별 독립 도메인 | ✅ Neture 의 status change actions slot / KPA 의 약국 정보 label override 등 service-specific 보존 | 없음 |
| URL 공유성 (북마크) | ✅ page route 보존 (drawer 가 default 일뿐) | 없음 |
| 운영자 대량 처리 UX | ✅ drawer 가 default 라 빠른 처리 가능 | 없음 |
| O4O "공통 Core + 독립 서비스" | ✅ 강화 | 없음 |

→ **충돌 0 건.** 본 IR 의 권고는 O4O 모든 원칙과 정합.

---

## 9. 핵심 발견 — 사용자 가설 검증

| 사용자 가설 | 본 IR 결과 |
|---|---|
| "회원 관리는 같은 capability → 같은 UI/UX 여야" | ✅ 정합 — Hybrid 채택으로 4 service 동일 진입 패턴 |
| "기본은 Drawer (운영자 빠른 처리)" | ✅ KPA/Neture 가 이미 검증한 패턴 |
| "확장 상세는 Page optional" | ✅ `CommonUserDetailPage` 가 이미 4 service 보유 — 인프라 비용 0 |
| "drift 가 본질" | △ 정정 필요 — drift 는 **진입 표면 (drawer vs nav)** 만 남았고, **detail page 자체는 이미 commonization 완료** (선행 WO) |
| "Drawer + Page 분리가 안정적" | ✅ Hybrid C 권고 |

→ **사용자 권고 그대로 채택.** 단, 사용자 분석에 빠진 사실 1 가지를 보고: **CommonUserDetailPage 페이지 commonization 은 이미 완료 상태** (WO-O4O-USER-DETAIL-PAGE-COMMONIZATION-V1).

---

## 10. 본 IR 이 결정하지 않는 것

- WO 의 실제 실행 시점 — 본 IR 의 직접 후속
- `WO-O4O-OPERATOR-MEMBERS-LIST-COMMONIZATION-V1` (list-side wrapper) 의 실행 — 별건 future WO
- EditUserModal 통합 — 별건
- 4 service UsersPage 내 columns / filter / status badge / bulk action 통일 — 본 IR 범위 외 (list-side commonization 영역)
- Neture-only registration 흐름 (`/neture/operator/registrations/:id/approve/reject`) — `CommonUserDetailPage` 의 `actions` slot 으로 이미 처리됨

---

## 11. 본 IR 의 의의 (Rev.1)

| 차원 | 결과 |
|---|---|
| 즉시 코드 변경 | 0 |
| 새 WO 후보 (직접 후속) | **1 건** (`WO-O4O-OPERATOR-MEMBERS-DETAIL-SURFACE-CANONICALIZATION-V1` — Rev.1 scope) |
| 큰 결정 | "Hybrid Canonical (Drawer default + Page optional)" 확정 |
| 사용자 가설 검증 | ✅ 정합 + 2 가지 사실 보완 (CommonUserDetailPage 이미 commonized + KPA UsersPage dead code) |
| 후속 IR / WO 후보 | 3 건 (list-side commonization / EditUserModal 통합 / **KPA UsersPage dead code 정리** — Rev.1 신설) |
| 사이클 정리 | Members 영역의 detail surface 결정 완료, list-side 는 별건. KPA 실체는 MemberManagementPage 임을 확정. |

### Rev.1 변경 요약

| 항목 | Rev.0 | Rev.1 |
|---|---|---|
| KPA live page | UsersPage.tsx (956 lines) | **MemberManagementPage.tsx** (UsersPage 는 dead code) |
| KPA `/operator/users/:id` route | "미등록" | **이미 등재** (OperatorRoutes.tsx:161) |
| KPA 의 WO 작업량 | App.tsx route 추가 + Drawer footer 링크 | **Drawer footer 링크 1 줄 추가만** (user_id 사용) |
| Neture 의 WO 작업량 | Drawer footer 링크 추가 | **작업 0** (이미 832-840 에 완성) |
| GP/K-Cos 의 WO 작업량 | 변경 없음 (Rev.0 동일) | 변경 없음 (Rev.0 동일) |
| WO 전체 회귀 위험 | "중간" | "중간" (GP/K-Cos UX 변경은 동일, KPA/Neture 는 더 가벼움) |

---

## 부록 — 조사 명령 (재현 가능)

```bash
# 1. 4 service Members 관련 파일 라인 수
for SVC in kpa-society neture glycopharm k-cosmetics; do
  echo "=== $SVC ==="
  for FILE in UserDetailPage EditUserModal UsersPage UsersManagementPage; do
    F="services/web-$SVC/src/pages/operator/$FILE.tsx"
    [ -f "$F" ] && printf "%-25s " "$FILE" && wc -l < "$F"
  done
done

# 2. row click 동작
for SVC in kpa-society glycopharm k-cosmetics; do
  echo "=== $SVC UsersPage row click ==="
  grep -nE "onRowClick|navigate.*users.*\${|setSelectedUser" services/web-$SVC/src/pages/operator/UsersPage.tsx | head -5
done
grep -nE "onRowClick|setSelectedUser" services/web-neture/src/pages/operator/UsersManagementPage.tsx | head -5

# 3. UserDetailPage route 등재
for SVC in kpa-society neture glycopharm k-cosmetics; do
  echo "=== $SVC ==="
  grep -nE "UserDetailPage|operator.*users/:" services/web-$SVC/src/App.tsx | head -5
done

# 4. CommonUserDetailPage 사용 확인
for SVC in kpa-society neture glycopharm k-cosmetics; do
  echo "=== $SVC ==="
  grep -n "CommonUserDetailPage" services/web-$SVC/src/pages/operator/UserDetailPage.tsx
done
```

---

*Created: 2026-05-24*
*Revised: 2026-05-24 (Rev.1 — KPA scope 보강 + dead code 발견 반영)*
*Type: Investigation Report (read-only)*
*Status: ✅ 결정 — Option C (Hybrid Canonical). Drawer default + Page optional. `CommonUserDetailPage` 이미 commonized 활용.*
*Decision Required: `WO-O4O-OPERATOR-MEMBERS-DETAIL-SURFACE-CANONICALIZATION-V1` (Rev.1 scope) 진입 — GP/K-Cos Drawer 도입 + KPA MemberManagementPage Drawer footer 링크 (user_id 사용) + Neture 작업 0.*
