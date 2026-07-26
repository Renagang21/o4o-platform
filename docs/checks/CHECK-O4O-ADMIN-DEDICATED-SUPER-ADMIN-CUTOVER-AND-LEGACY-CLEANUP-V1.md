# CHECK-O4O-ADMIN-DEDICATED-SUPER-ADMIN-CUTOVER-AND-LEGACY-CLEANUP-V1

WO: `WO-O4O-ADMIN-DEDICATED-SUPER-ADMIN-CUTOVER-AND-LEGACY-CLEANUP-V1`
일시: 2026-07-26 (KST)

## 0. 결론 — **부분 수행**

| 구분 | 결과 |
|------|:---:|
| 권한 cutover (부트스트랩 이전 / sohae2100 super_admin 제거 / legacy 제거·비활성화) | **미수행 — 중지 조건 2건 해당** |
| UI 범위 (역할 필터 canonical / 전체 역할 보기 / AI 질문 버튼 제거) | **완료·배포** |

WO 규정("중지 조건이 발생해도 전체 역할 보기, 역할 필터 정비, AI 질문 버튼 제거는 계속 진행한다")에 따라
UI 범위만 구현했다. **프로덕션 역할 변경 0 · DB write 0 · migration 0.**

## 1. 새 전용 계정 로그인 — **미확인 (중지 조건 1 해당)**

- `renariver21@gmail.com` 의 비밀번호가 자격증명 SSOT(`docs/local/TEST-ACCOUNTS.local.md`, CLAUDE.md §15)에 **미등재**다.
  해당 문서는 `sohae2100` / `renagang21` / `sohae21@naver.com` 3계정만 관리한다.
- 따라서 WO 가 선행으로 요구한 "새 전용 계정 로그인·복구 가능성 확인"과 `platform:super_admin` 기능 smoke 를
  **수행할 수 없었다.** 자격증명 추측·probe 는 시도하지 않았다.
- 중지 조건 "새 전용 계정 로그인이 실패하는 경우"에 해당(= 성공을 실증할 수 없음) → cutover 전체 보류.

계정의 프로덕션 존재 여부 역시 미확인이다. `admin.neture.co.kr` 은 별도 로그인 세션을 요구하며
(`/login` 리다이렉트 확인), 조회에 필요한 인증을 확보하지 못했다.

## 2. legacy `super_admin` 소비처 전수 조사 — **활성 사용 중 (중지 조건 3 해당)**

### 2-A. 보유자

프로덕션 전체 37 사용자 중 무접두 `super_admin` 보유자는 **1명** — `super-admin@o4o.com`
(roles: `platform:super_admin`, `super_admin`). bootstrap 시드 계정이다.

### 2-B. 결정적 발견 — admin 메뉴 가시성이 legacy 역할에 의존

`apps/admin-dashboard/src/config/rolePermissions.ts` 의 `menuPermissions` 는 `hasMenuPermission()` 으로
**실제 강제되는 게이트**다. 여기서 다음 메뉴들이 **무접두 역할로만** 제한되어 있다.

| menuId | roles | `platform:super_admin` 포함 |
|--------|-------|:---:|
| `system-settings` | `['super_admin','admin','manager']` | ❌ |
| `integrations` | `['super_admin','admin','manager']` | ❌ |
| `tools` | `['super_admin','admin','manager']` | ❌ |
| `import-export` | `['super_admin','admin','manager']` | ❌ |
| `database` | `['super_admin','admin','manager']` | ❌ |
| (참고) line 66 메뉴 | `['super_admin','platform:super_admin']` | ✅ |

> ## ⚠️ 정정 (2026-07-26, 후속 조사) — 아래 §2-B 의 결론은 **틀렸다**
>
> `WO-O4O-ADMIN-CANONICAL-SUPER-ADMIN-MENU-PERMISSION-FIX-V1` 수행 중 확인한 사실:
>
> - `/api/v1/navigation/admin` 은 **빈 배열을 반환하는 stub** 이다(`navigation.routes.ts` — Phase R1 에서
>   navigation registry 제거). 따라서 동적 메뉴는 항상 비어 있고 **정적 메뉴가 유일한 소스**다.
> - `admin-menu.static.tsx` 에 `system-settings` / `integrations` / `tools` / `import-export` /
>   `database` id 를 가진 메뉴 항목이 **하나도 없다**(각 0건). `getAccessibleMenus` 도 사용처가 없다.
> - 즉 이 5개 `menuPermissions` 항목은 **어떤 메뉴에도 매칭되지 않는 dead config** 다.
>
> **따라서:** ① canonical `platform:super_admin` 에게 숨겨진 메뉴는 없었다(기능 은폐 아님).
> ② legacy `super_admin` 은 이 경로로 "실사용 중"이 아니다 → **legacy 제거를 막는 근거가 되지 못한다.**
> 실제로 게이트가 적용되는 유일한 항목은 `core-users` 이며, 이미 `super_admin` 과
> `platform:super_admin` 을 병기하고 있어 legacy 제거의 영향을 받지 않는다.
>
> §1(자격증명 미보유) 중지 조건은 **그대로 유효**하므로 cutover 보류 결론 자체는 변하지 않는다.
> 다만 그 사유에서 §2-B 는 제외해야 한다. 아래 원문은 이력 보존을 위해 남긴다.

**함의 2가지:**

1. legacy `super_admin` 은 죽은 문자열이 아니라 **admin 메뉴 가시성에 현재 사용 중**이다
   → WO 중지 조건 "legacy `super_admin` 이 실제 인증·배포·복구에 사용 중인 경우" 성립.
   `super-admin@o4o.com` 에서 legacy 역할을 제거하면 위 메뉴들이 그 계정에서 사라진다.
2. 역으로, canonical `platform:super_admin` **만** 가진 계정(= `sohae2100`, 그리고 향후
   `renariver21`)은 위 5개 메뉴를 **볼 수 없다.** canonical 최고 관리자가 legacy 계정보다
   적은 메뉴를 보는 역전 상태이며, 이는 기능 은폐다.

→ **cutover 를 강행했다면**, canonical 전용 계정으로 갈아탄 직후 `system-settings`/`tools`/`database` 등에
접근할 수 없게 되고 legacy 계정은 이미 비활성이라 되돌리기 어려운 상태가 될 수 있었다.

### 2-C. 그 외 소비처 (참고, 미변경)

- `admin-menu.static.tsx` 의 `roles: ['admin','super_admin']` 다수 — 해당 필드는 `hasMenuPermission` 이
  사용하지 않고 pass-through 될 뿐이라(메뉴 게이트는 `menuPermissions` 의 `menuId` 기준) **실효 없음**.
- backend `requireRole` 목록의 무접두 `super_admin`(예: `routes/operator/roles.routes.ts:24`,
  `routes/admin/users.routes.ts:18`, `operator-notification.routes.ts`) — 타 서비스 접근 범위에 영향을 주므로
  본 WO 범위 밖.

## 3. 구현한 UI 범위

### 3-A. 역할 필터 canonical 화

- 기존: 계정들의 `roles` 를 전부 합집합해 옵션 생성 → legacy `super_admin` 이 필터에 섞여 노출.
- 변경: backend `admin/platform-accounts.routes.ts` 가 목록을 구성하는 기준과 **동일한 4개**만 옵션으로 노출.
  `platform:super_admin` · `platform:admin` · `neture:admin` · `neture:operator`
- 각 옵션 라벨에 **계정 수**를 표기 → "역할 필터와 실제 계정 수 일치" 검증 항목을 UI 자체로 충족.
- legacy 역할은 필터에서만 제외하고 **배지 표시·검색·정렬에는 그대로 유지**(데이터 은폐 없음).

### 3-B. 전체 역할 보기

- 기존: `+N` 배지에 `title` hover 만 제공(마우스 필요, 모바일 불가, 발견성 낮음).
- 변경: `+N` 을 **토글 버튼**으로 승격 — 클릭 시 해당 행의 역할 전체를 펼치고 `접기` 로 복귀.
- 축약은 표시 계층에만 적용되므로 **필터·정렬 계약 무손상**(중지 조건 "역할 축약이 필터·정렬 계약을 깨는 경우" 회피).

### 3-C. 고정 `AI 질문` 버튼 제거

- `AdminLayout.tsx` 의 상시 마운트(`{!isFullscreenMode && <FloatingAiButton />}`) 해제 + import 제거.
- `FloatingAiButton` 컴포넌트 파일은 **보존**(다른 곳에서 재사용 가능하도록). 삭제 아님.
- 우하단 고정 버튼이 목록 하단 행의 액션 영역과 겹치던 문제 해소.

## 4. 검증

| 항목 | 결과 |
|------|:---:|
| typecheck (`@o4o/admin-dashboard`) | 변경 전 4건 = 변경 후 4건 — **신규 0** |
| 위 4건의 출처 | `routes/apps.routes.tsx` 의 `@o4o/cgm-pharmacist-app` 모듈 미해결(사전 존재, 본 WO 무관) |
| 변경 파일의 오류 | **0** |
| build (`vite build`) | **PASS** (35.35s) |
| 공통 컴포넌트(`@o4o/ui`) 수정 | **0** |
| backend / DB / migration | **0** |
| 권한 정책 변경 | **0** |

typecheck 기준선은 변경분을 `git stash` 후 재측정해 동일 4건임을 확인했다.

## 5. 관리자 계정별 최종 역할 상태 (변경 없음 — 조사 시점 실측)

| 계정 | platform:super_admin | legacy super_admin | 비고 |
|------|:---:|:---:|------|
| `sohae2100@gmail.com` | ✅ | ❌ | 4개 서비스 admin/operator 겸임. **제거 대상이었으나 미변경** |
| `super-admin@o4o.com` | ✅ | ✅ | bootstrap 시드, memberships 0 |
| `renariver21@gmail.com` | — | — | **존재 여부 미확인** |

`platform:admin` 보유자 0명.

## 6. 미수행 항목과 사유

| WO 항목 | 상태 | 사유 |
|---------|:---:|------|
| 새 계정 로그인·기능 smoke | 미수행 | §1 자격증명 미보유 |
| 부트스트랩 대상 계정 이전 | 미수행 | §1 선행 미충족 |
| `sohae2100` 의 `platform:super_admin` 제거 | 미수행 | §1 + §2-B |
| `renagang21` 역할 정리 | 미수행 | cutover 종속 |
| `super-admin@o4o.com` legacy 제거·비활성화 | 미수행 | §2-B 활성 사용 중 |

## 7. 후속 권고 (우선순위 순)

1. **`rolePermissions.ts` 의 5개 menuId 에 `platform:super_admin` 추가** — canonical 최고 관리자가
   `system-settings`/`integrations`/`tools`/`import-export`/`database` 를 보지 못하는 은폐 해소.
   **legacy 제거의 선행 조건**이기도 하다(이것 없이 legacy 를 걷어내면 해당 메뉴 접근자가 0이 된다).
   frontend 전용·additive 변경이라 위험 낮음.
2. `renariver21@gmail.com` 자격증명을 `TEST-ACCOUNTS.local.md` 에 등재 → §1 게이트 해소.
3. 1·2 완료 후 cutover 재시도(부트스트랩 이전 → sohae2100 제거 → legacy 정리) 순서로 수행.
4. `removeMemberRole` 최후 platform admin 보호 가드
   (`CHECK-O4O-KPA-PLATFORM-SUPER-ADMIN-ROLE-SEPARATION-V1 §9` 와 동일 권고).

## 8. 변경 파일과 커밋

| 항목 | 값 |
|------|-----|
| commit | `1d7025107` |
| 변경 파일 | `apps/admin-dashboard/src/pages/settings/AdminAccountsSettings.tsx`, `apps/admin-dashboard/src/components/layout/AdminLayout.tsx` |
| 변경량 | +54 / -13 |
| 배포 | `Deploy Admin Dashboard (Cloud Run)` run `30186490285` |

### 8-1. 배포 결과

| 항목 | 값 |
|------|-----|
| workflow | `Deploy Admin Dashboard (Cloud Run)` run `30186490285` — conclusion **success** |
| job | `deploy` success |
| 배포 확인 | `https://admin.neture.co.kr` 로그인 화면의 빌드 스탬프 갱신 확인 (`2026. 7. 26. 오후 12:42`) |

### 8-2. 브라우저 smoke — **미완 (인증 한계)**

배포는 성공했으나 **로그인 세션을 확보하지 못해 UI 실측을 수행하지 못했다.**

관측 사실:

| 단계 | 결과 |
|------|------|
| `POST /api/v1/auth/login` (sohae2100) | **200** — 자격증명 자체는 유효 |
| 직후 `POST /api/v1/auth/refresh` | **401** |
| `GET /api/v1/auth/status` | 200, `authenticated: **false**` |
| localStorage 토큰 | 없음 (admin 앱은 httpOnly 쿠키 전용) |
| `document.cookie` | 비어 있음(httpOnly 이므로 정상) |
| 결과 | `/settings/admin-accounts` 접근 시 `/login` 으로 리다이렉트 |

**해석 (단정 아님):** admin 앱은 `admin.neture.co.kr` → `api.neture.co.kr` 의 **cross-site httpOnly 쿠키**에
의존한다. 동일 자동화 브라우저에서 `kpa-society.co.kr` 로그인은 성공했는데(그쪽은 localStorage 토큰 사용),
admin 만 실패하는 양상은 **자동화 프로필의 서드파티 쿠키 차단**과 일치한다. 사용자는 평소 브라우저에서
`admin.neture.co.kr` 로그인에 성공하고 있으므로 **프로덕션 결함으로 단정하지 않는다.**

따라서 다음 3개 항목은 **정적 검증(코드·typecheck·build·배포 성공)까지만** 확인되었고 화면 실측은 미수행이다:
역할 필터 canonical 노출 · 전체 역할 보기 토글 · `AI 질문` 버튼 부재.

후속: 사용자 브라우저 또는 서드파티 쿠키 허용 프로필에서 재확인 필요.
(`/settings/admin-accounts` 진입 → 역할 필터 옵션 4개+건수 · `+N` 클릭 펼침/접기 · 우하단 AI 버튼 부재)
