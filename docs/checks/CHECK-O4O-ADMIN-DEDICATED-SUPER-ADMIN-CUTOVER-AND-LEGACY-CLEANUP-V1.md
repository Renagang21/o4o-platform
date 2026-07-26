# CHECK-O4O-ADMIN-DEDICATED-SUPER-ADMIN-CUTOVER-AND-LEGACY-CLEANUP-V1

WO: `WO-O4O-ADMIN-DEDICATED-SUPER-ADMIN-CUTOVER-AND-LEGACY-CLEANUP-V1`
일시: 2026-07-26 (KST)

> # ✅ 2026-07-26 CUTOVER 완료 — 아래 "부분 수행" 결론은 갱신되었다
>
> `renariver21@gmail.com` 자격증명이 등록되어 §1 중지 조건이 해소되었고, cutover 전 단계를 완료했다.
> 상세는 문서 말미 **§10 Cutover 실행 기록 (2026-07-26)** 참조. 아래 §0~§9 는 실행 이전 시점의 조사 기록이다.

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

---

# 10. Cutover 실행 기록 (2026-07-26)

## 10-0. 결과 — **완료**

목표 최종 상태를 전부 달성했다. **직접 DB write 0 · migration 0** — 전부 기존 역할·계정 관리 API 사용.

## 10-1. 실행 직전 상태 재조회에서 발견한 이탈 2건

계획 실행 직전 재조회(WO 지시 1단계)에서, 조사 시점과 다른 상태가 확인되어 **쓰기를 멈추고 보고**했다.

| 계정 | 발견 상태 | 판정 |
|------|-----------|------|
| `sohae2100@gmail.com` | `isActive=false` 로 **비활성화됨** | 의도치 않음 → 재활성화 대상 |
| `renagang21@gmail.com` | `platform:super_admin` **신규 보유** + 비활성 | 의도치 않음 → 회수 대상 |

두 소스(`/admin/platform-accounts`, `/operator/members?all=true`)에서 교차 확인했다.
사용자 확인 후 목표 상태에 맞춰 교정하는 방향으로 진행했다.

## 10-2. 실행 내역 (actor = `renariver21@gmail.com`, 감사 로그 경로)

| # | 작업 | 엔드포인트 | 결과 |
|---|------|-----------|:---:|
| 1 | 상태 재조회 | `GET /admin/platform-accounts` | 4계정 확인 |
| 2 | `sohae2100` 활성화 | `PATCH /admin/platform-accounts/:id/status` | ✅ |
| 3 | `sohae2100` 최고권한 회수 | `DELETE /operator/members/:id/roles/platform:super_admin` | ✅ |
| 4 | `renagang21` 활성화 | `PATCH /admin/platform-accounts/:id/status` | ✅ |
| 5 | `renagang21` 최고권한 회수 | `DELETE /operator/members/:id/roles/platform:super_admin` | ✅ |
| 6 | 새 계정 재검증 | `GET` 관리자 API 5종 | 전부 200 |
| 7 | 시드 계정 legacy 회수 | `DELETE /admin/users/:id/role-assignments/super_admin` | ✅ |

### 7번에서 확인한 사실 — legacy `super_admin` 은 카탈로그 밖 orphan

`DELETE /operator/members/:id/roles/super_admin` 은 **`Invalid role`(400)** 로 거부되었다.
해당 엔드포인트는 `roleService.getRoleByName()` 으로 역할 카탈로그를 먼저 조회하는데,
**무접두 `super_admin` 은 카탈로그에 존재하지 않는다**(실측: 카탈로그의 무접두 이름은
`consumer/customer/partner/pharmacist/pharmacy/supplier` 6종뿐).

즉 legacy `super_admin` 은 **카탈로그에 정의가 없는 orphan `role_assignments` 행**이었다.
카탈로그 조회 없이 soft-revoke 하는 `AdminUserController.revokeRoleAssignment`
(`DELETE /admin/users/:userId/role-assignments/:role`) 경로로 회수했다.

## 10-3. 최종 상태 (실측)

| 계정 | active | 역할 | 목표 부합 |
|------|:---:|------|:---:|
| `renariver21@gmail.com` | ✅ | `platform:super_admin` (1) | ✅ 운영 canonical, 서비스 역할 0 |
| `sohae2100@gmail.com` | ✅ | 서비스 admin/operator 9종, 최고권한 없음 | ✅ 서비스 역할 전부 보존 |
| `renagang21@gmail.com` | ✅ | 서비스 테스트 역할 6종, 최고권한 없음 | ✅ 서비스 역할 전부 보존 |
| `super-admin@o4o.com` | ✅ | `platform:super_admin` (1) | ✅ 복구용, legacy 제거 |

- `platform:super_admin` **활성 보유자 = 2명** (`renariver21`, `super-admin@o4o.com`)
- **legacy 무접두 `super_admin` 잔존 = 0명**
- `sohae2100` 서비스 역할 9종 / `renagang21` 6종 — 회수 과정에서 **손실 0**

## 10-4. 새 canonical 계정 기능 검증 (cutover 후)

`renariver21@gmail.com` 세션으로 재검증 — 전부 **200**:
`/admin/platform-accounts` · `/admin/users` · `/operator/members?all=true` · `/operator/roles` · `/operator/stores?all=true`

`auth/status` → `authenticated: true`, `roles: ['platform:super_admin']`.
→ **서비스 역할 없이 `platform:super_admin` 단독으로 플랫폼 관리 기능이 완전히 동작한다.**

## 10-5. 마지막 관리자 보호 가드

- 구현·배포 완료: commit `3fbe29b8d`, Cloud Run 이미지 태그가 커밋 SHA 와 일치 확인.
- 동작: `DELETE /operator/members/:id/roles/platform:super_admin` 에서 대상이 **마지막 활성 보유자**면
  409 `LAST_PLATFORM_SUPER_ADMIN`.
- **라이브 트리거 테스트는 의도적으로 수행하지 않았다** — 가드를 발동시키려면 활성 보유자를 1명으로
  줄여야 하는데, 그 상태를 만드는 것 자체가 본 WO 가 방지하려는 위험이다. 현재 활성 보유자 2명이라
  이번 회수들은 정상적으로 통과했고(가드 오작동 없음), 코드 경로와 배포 일치로 검증을 갈음한다.

## 10-6. 비상 복구 계정 정책 (명문화)

`super-admin@o4o.com` (고정 UUID `b0000000-…-000000000001`):

- fresh DB · CI · 재해 복구 목적의 **bootstrap 시드 계정**. 일상 운영 사용 금지.
- **활성 상태 유지** — 비활성화하면 복구 시 스스로 되살릴 수 없어 순환 의존이 생긴다
  (역할·상태 변경 API 가 모두 platform admin 을 요구).
- `platform:super_admin` 유지, legacy `super_admin` 제거 완료.
- 부트스트랩 마이그레이션은 **변경하지 않았다**(안 B) — 실인물 계정을 시드 대상으로 삼으면
  CI/fresh DB 에서 그 계정의 비밀번호·상태를 덮어쓸 위험이 있기 때문이다.
- 운영 canonical 은 `renariver21@gmail.com` 으로 확정. 로컬 자격 SSOT 에 동일 내용 기재.

## 10-7. `AI 질문` 버튼 잔존 재조사 — 소스·번들 모두 clean

사용자 화면에 버튼이 계속 보인다는 보고에 따라 전 경로를 재조사했다.

| 확인 | 결과 |
|------|------|
| `FloatingAiButton` 마운트 (repo 전역) | **0건** — 주석 언급 외 없음 |
| 다른 AI 플로팅 위젯 마운트 | 없음 (`AIChatPanel` 은 에디터 전용, 별개) |
| 배포 entry 번들 `AI 질문` 문자열 | **ABSENT** (tree-shaken) |
| 배포된 다른 청크 전수 검사 | **HIT 0** |
| `version.json` | `2026.07.26-0358` (최신 빌드 서빙 중) |

→ **프로덕션 산출물에는 버튼이 존재하지 않는다.** 화면 잔존은 **브라우저 캐시**로 판단된다.
해결: 하드 새로고침(Ctrl+Shift+R) 또는 시크릿 창. admin 앱은 `app-version-update-pending`
localStorage 키로 버전 갱신을 추적하므로 캐시된 구 번들이 남아 있을 수 있다.

## 10-8. 남은 권고

1. **비밀번호 로테이션** — 본 작업 대화에 `sohae2100` / `renagang21` 비밀번호가 노출되었다.
   cutover 가 끝났으므로 두 계정 비밀번호를 변경하고 로컬 자격 SSOT 를 갱신할 것.
2. `menuPermissions` dead config 정리 (별도 WO — `…MENU-PERMISSION-CONFIG-RECONCILE-V1`).
3. backend `requireRole` 목록의 무접두 `super_admin` 잔존 — 이제 보유자가 0명이므로 실효 없는
   문자열이다. 일괄 제거는 타 서비스 영향 검토 후 별도 WO 로.
