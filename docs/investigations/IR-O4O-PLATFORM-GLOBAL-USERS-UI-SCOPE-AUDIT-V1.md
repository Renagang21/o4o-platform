# IR-O4O-PLATFORM-GLOBAL-USERS-UI-SCOPE-AUDIT-V1

> **유형**: Investigation Report (read-only 조사 — 코드/DB/운영 데이터 변경 없음)
> **대상**: platform-admin `/admin/platform` section 의 global users UI 도입 범위
> **선행**: platform-admin 1차 사이클 (routing / accounts·services UI / role-based entrypoint) — 운영 smoke PARTIAL PASS
> **작성일**: 2026-06-17
> **상태**: 조사 완료 — 권장안 B (read-only list, PII 투영 전제)

---

## 0. 결론 요약 (TL;DR)

- **global users API 는 이미 존재**: `GET /api/v1/admin/users`, guard `requireRole(['platform:admin','platform:super_admin'])`, pagination/search/role·status filter 지원.
- **`/admin/platform/users` UI 는 미구현**: PlatformAdminLandingPage 에 "Global 사용자 관리" 카드가 `to: null` + "연결 예정" 배지로만 존재.
- **⚠️ 핵심 리스크**: 기존 `/admin/users` 목록 응답은 `password` 만 제거하고 **나머지 User 전 컬럼을 반환**한다 (refreshTokenFamily / lastLoginIp / businessInfo / phone / 동의 타임스탬프 등). 이 raw 응답을 platform UI 에 그대로 붙이면 **PII·보안 토큰 과다노출**.
- **권장: 안 B (read-only global users list)** — 단, raw `/admin/users` 직결이 아니라 **platform-accounts 와 동일한 "필드 투영(projection)" 패턴**으로 안전 필드만 반환하는 얇은 read endpoint 를 두는 조건. 삭제·상태변경·권한수정·개인정보 상세는 **이번 단계 비포함**.

---

## 1. 조사 질문 답변 (§8 질문 1:1 대응)

| # | 질문 | 답 |
|---|------|-----|
| 1 | global users API 존재? | **존재.** `GET /api/v1/admin/users` (`routes/admin/users.routes.ts`, mount `register-routes.ts:164`) |
| 2 | frontend 에서 이미 쓰는 곳? | **platform 에서는 미사용.** `web-neture/src/lib/api/platform.ts` 는 accounts/services 만 호출, `/admin/users` 호출 없음. neture `/admin/users` route 는 실제로 `AdminMemberManagementPage`(=`/operator/members?serviceKey=neture`)를 렌더 — global API 아님 |
| 3 | response shape? | User entity 전체(password 제외) + `roles[]`(role_assignments JOIN) + `pagination{page,limit,total,totalPages}` |
| 4 | 개인정보 필드 수준? | **과다.** email·phone·firstName·lastName·nickname·businessInfo·avatar·provider/provider_id·lastLoginAt·**lastLoginIp**·kakao URLs·tos/privacy/marketing 동의 타임스탬프, 그리고 **refreshTokenFamily** 까지 (password 만 명시 제거) |
| 5 | platform accounts 와 users 는 같은 entity? | **같은 `users` 테이블/엔티티.** 차이는 응답 **필드 필터링**과 대상 role 범위뿐. platform-accounts 는 `ADMIN_ACCOUNT_ROLES=['platform:super_admin','platform:admin','neture:admin','neture:operator']` 만, 최소 필드만 반환 |
| 6 | service member tables 와 연결? | `users`(global identity) ← `role_assignments`(RBAC SSOT) / `service_memberships`(serviceKey 별 가입). global users API 응답에는 **service_memberships 미포함**(별도 쿼리 필요) |
| 7 | 현재 guard 가 platform-level? | **그렇다.** `requireRole(['platform:admin','platform:super_admin'])` |
| 8 | read-only list 구현 가능? | **가능.** API·guard·pagination·search 이미 존재. 프론트 페이지 + (권장) 안전 projection 만 추가하면 됨 |
| 9 | action 기능 위험? | 높음. 같은 라우터에 POST/PUT/PATCH status/**DELETE(hard·soft)**/DELETE role-assignment 가 이미 존재 → UI 에 노출 시 service admin(완전삭제·파기)·operator(이용중지) 경계와 충돌, 감사·승인 정책 부재 |
| 10 | 추천안? | **B** (read-only list, PII 투영 전제). 아래 §5 |

---

## 2. Backend 현황 (근거)

### 2.1 `GET /api/v1/admin/users` (global users)
- 라우트: `apps/api-server/src/routes/admin/users.routes.ts` / mount `bootstrap/register-routes.ts:164`
- guard: `authenticate` → `requireRole(['platform:admin','platform:super_admin'])`
- 컨트롤러: `AdminUserController.getUsers` — 목록 매핑 시 `const { password, ...rest } = user`(password 만 제거), `roles[]` 는 `role_assignments`(is_active) ARRAY_AGG JOIN
- pagination(page/limit=20) · search(email/firstName/lastName/company ILIKE) · filter(role, status) · sort
- service_memberships **미포함**
- **mutation(같은 라우터)**: `POST /`, `PUT /:id`(email/role/status), `PATCH /:id/status`, `DELETE /:id`(hard/soft), `DELETE /:userId/role-assignments/:role`

### 2.2 `GET /api/v1/admin/platform-accounts` (대조군 — 안전 패턴)
- 라우트: `routes/admin/platform-accounts.routes.ts` / mount `register-routes.ts:165`
- guard: 동일(platform:admin/super_admin)
- 응답: **투영된 최소 필드** `{id,email,name,roles,isActive,status,createdAt,lastLoginAt}` — phone/businessInfo/token 등 PII 제외
- 대상: `ADMIN_ACCOUNT_ROLES` 만
- 서버측 가드: SELF_LOCK / LAST_SUPER_ADMIN / SUPER_ADMIN_ONLY
- 프론트: `PlatformAccountsPage` ← `platform.ts getAccounts/resetPassword/setAccountStatus`

> **시사점**: platform-accounts 가 이미 "global API 의 안전 projection" 패턴을 보여준다. global users read-only 도 동일 패턴으로 만들어야 PII 노출 없이 안전하다.

### 2.3 데이터 모델
```
users (global identity; email unique; status; isActive)
  ├─ role_assignments (userId, role, is_active) — RBAC SSOT
  └─ service_memberships (userId, serviceKey, status, role) — 서비스별 가입
```
- platform account ↔ 일반 user: 동일 `users` 테이블, role 로만 구분
- hard delete / 개인정보 파기 책임: **service admin** 레이어(`/operator/members` DELETE mode=hard) — 본 정비 사이클(GP/KCos)에서 "회원 데이터 관리"로 이미 귀속

---

## 3. Frontend 현황 (근거)

- platform section: `web-neture/src/pages/admin/platform/` = Landing / Accounts / Services / SectionLayout **4개뿐**. `/admin/platform/users` 페이지·라우트 **없음** (App.tsx platform Route 블록에 미존재).
- `PlatformAdminLandingPage` "Global 사용자 관리" 카드: `to: null`, `api: 'GET /api/v1/admin/users'`, "연결 예정" 배지 — 정확히 본 IR 이 결정할 지점.
- 전체 사용자를 한 화면에서 보는 UI 는 현재 **없음**. 사용자 관리는 서비스별 분산:
  - neture/glycopharm/k-cosmetics → `/operator/members?serviceKey=…`
  - kpa-society → `/admin/members`(면허번호 특화)
- 중복 위험: global read-only list 는 "조회"만 하므로 서비스별 **관리(삭제·이용중지) 화면과 기능 중복 없음**. 단 라벨/진입 동선에서 "관리"로 오인되지 않게 read-only 임을 명시해야 함.

---

## 4. 경계 충돌 분석 (admin scope 기준 유지)

| 레이어 | 책임 | global users UI 가 침범하면 안 되는 것 |
|--------|------|----------------------------------------|
| operator | 이용중지/재개/운영메모 | 상태 mutation 노출 금지 |
| service admin | 완전삭제/개인정보 파기 | DELETE/파기 노출 금지 |
| **platform admin** | 전체 계정·권한·서비스간 사용자 **식별/거버넌스** | **read-only 식별·요약까지만** |

→ platform global users 는 "누가 어떤 서비스에 어떤 role 로 있는가"를 **보는** 거버넌스 도구. **바꾸는** 행위는 기존 레이어에 둔다.

---

## 5. 구현안 비교 & 권장

| 안 | 내용 | 리스크 | 가치 | 판정 |
|----|------|--------|------|------|
| A | 미구현 유지(연결 예정) | 0 | 가시성 0 | 차선(현상유지) |
| **B** | **read-only list** (검색/필터/페이지네이션, action 없음) | 낮음(투영 전제) | 운영 가시성 확보 | **권장** |
| C | list + role/membership summary + read-only 상세 | 중(service_memberships JOIN·RBAC 결합으로 범위 확대) | governance 유용 | B 다음 단계 후보 |
| D | full management(상태/권한/삭제·파기) | 높음(경계 충돌·PII·감사 부재) | — | **비권장** |

### 권장: **안 B** — 단 2가지 전제 조건

1. **PII 투영 필수 (B2 방식)**: raw `/admin/users` 를 그대로 프론트에 직결(B1)하지 말 것. 응답이 refreshTokenFamily/lastLoginIp/businessInfo/phone/동의 타임스탬프까지 브라우저로 전송됨. → platform-accounts 처럼 **안전 필드만 반환하는 투영**을 둔다.
   - 안전 컬럼 후보: `id, email(또는 부분 마스킹), name, roles[], status, isActive, lastLoginAt`. phone/businessInfo/token/IP/동의정보 제외.
   - 구현 택1: (a) `/admin/users` 에 `view=platform-summary` 같은 투영 모드 추가, 또는 (b) 별도 read endpoint `GET /admin/platform/users`(platform-accounts 패턴 복제). **(b) 권장** — accounts/services 와 동선·guard 일관.
2. **read-only 고정**: 페이지에서 status/delete/role mutation 호출·버튼 **없음**. 상세·편집·삭제·파기는 별도 정책(IR) 후 결정.

> 즉 본 권장 B 는 **frontend-only 가 아니다** — 안전 projection 을 위해 backend 얇은 read endpoint 1개가 동반되어야 한다(작은 범위). 기존 `/admin/users` 의 mutation 군은 건드리지 않는다.

---

## 6. 후속 WO 제안

### (권장) read-only list
```
WO-O4O-PLATFORM-GLOBAL-USERS-READONLY-LIST-V1
범위:
- backend: GET /admin/platform/users — 안전 필드 투영(platform:admin guard), pagination/search/role·status filter
  (또는 /admin/users 에 platform-summary 투영 모드)
- frontend: /admin/platform/users read-only 페이지 + platform.ts client + Landing 카드 to 연결
- 명시 제외: status mutation / delete / role 편집 / 개인정보 상세
- service_memberships 요약은 옵션(미포함 시작 권장 → C 단계)
```

### (조건부) 거버넌스 정책 확장 — service membership 요약·상세가 필요해질 때
```
IR-O4O-PLATFORM-USER-GOVERNANCE-POLICY-V1
범위: global user ↔ service member ↔ platform account ↔ role assignment 통합 뷰,
      개인정보 파기 요청/처리, 감사 로그, role 편집 권한 경계
```

---

## 7. 이번 IR 준수 확인

```
✅ 문서 1개만 생성 (본 파일)
✅ 코드/route/UI/backend/DB 변경 없음
✅ 운영 데이터 변경·민감 개인정보 실조회 없음 (코드 정적 분석만)
✅ 구현안 A/B/C/D 비교 + 권장안(B, projection 전제) 제시
✅ 후속 WO/IR 분기 명확화
```

---

*read-only investigation. 권장: 안 B (read-only global users list) + PII 안전 투영 backend endpoint. 삭제·상태변경·권한수정·개인정보 상세는 별도 정책(IR) 후.*
