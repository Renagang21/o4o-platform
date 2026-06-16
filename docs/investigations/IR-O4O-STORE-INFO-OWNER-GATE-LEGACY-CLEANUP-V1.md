# IR-O4O-STORE-INFO-OWNER-GATE-LEGACY-CLEANUP-V1

> **성격: read-only 조사 IR** (코드/백엔드/DB 변경 없음 — 문서 1개만 commit).
> 결론: `/store/info` 차단은 **frontend legacy gate 가 아니라 백엔드 403** 이다. business-info 엔드포인트가
> **service-specific 회원 테이블(`glycopharm_members`/`cosmetics_members`)의 `subRole`** 로 인가하는데, 이는
> `/store/info` 라우트 가드가 쓰는 **canonical role(`role_assignments` → `glycopharm:store_owner`)** 와 다른 소스다.
> → 승인된 canonical store_owner 가 라우트는 통과하나 business-info 에서 403 → "경영자만 이용 가능".
> **수정은 backend.** 별도 WO 로 분리. · 2026-06-16

---

## 1. 증상

GlycoPharm 약국 경영자 계정(`renagang21`)으로 `/store/info` 접속 시:
```
약국 경영자만 이용 가능합니다
본 페이지는 약국 경영자 등록이 완료된 사용자만 사용할 수 있습니다.
```
상단/좌측 내 약국 영역은 접근 가능하나 이 페이지만 차단.

---

## 2. 근본 원인 — frontend 아님, 백엔드 이중 소스 mismatch

### 2.1 frontend 는 gate 가 아니다 (403 표시만)
- `services/web-glycopharm/src/pages/store/PharmacyInfoPage.tsx:80-92` — `mypageApi.getBusinessInfo()` 가 **HTTP 403 이면** `loadState='forbidden'` → 차단 문구 표시.
- `services/web-k-cosmetics/src/pages/store/StoreInfoPage.tsx:86-91` — 동일 패턴(`getBusinessInfo()` 403 → forbidden).
- 즉 frontend 는 **백엔드 403 을 그대로 표시**할 뿐, role 체크/legacy 조건 없음.

### 2.2 라우트 가드 = canonical role
- `services/web-glycopharm/src/App.tsx:999-1011` — `/store/info` 는 `RoleGuard allowedRoles=['glycopharm:store_owner', ADMIN, SUPER_ADMIN]`.
  → canonical role(`role_assignments`, F9 RBAC SSOT) 기반. `glycopharm:store_owner` 면 **페이지 진입 허용**.

### 2.3 백엔드 business-info = legacy 회원 테이블 subRole
- `apps/api-server/src/routes/glycopharm/controllers/mypage.controller.ts:154-166` (GET) · `:211-221` (PATCH):
  ```
  const member = await memberService.getMyMembership(userId);   // glycopharm_members
  if (!member || member.subRole !== 'pharmacy_owner') { 403 '약국 경영자만 접근 가능합니다.' }
  ```
- `getMyMembership` = `glycopharm_members` 테이블 `findOne({ where: { userId } })` (glycopharm-member.service.ts:266).
  `subRole` 은 별도 **회원 등록 엔드포인트**(glycopharm-member.controller.ts:54, `pharmacy_owner`|`staff_pharmacist`)로 채워짐.
  → `role_assignments`/`service_memberships`(F9/F11 canonical) 와 **다른 소스**.
- K-Cosmetics 동일: `cosmetics-mypage.controller.ts` — `cosmetics_members.subRole === 'store_owner'` 아니면 403.

### 2.4 결과 (mismatch)
| 계층 | 인가 소스 | 판정 |
|---|---|---|
| `/store/info` 라우트 진입 | canonical role `glycopharm:store_owner` (role_assignments) | ✅ 통과 |
| business-info GET/PATCH | legacy `glycopharm_members.subRole === 'pharmacy_owner'` | ❌ 403 (해당 row/subRole 부재 시) |

→ 승인된 canonical store_owner 가 페이지엔 도달하나 데이터 API 에서 거부 → "경영자만 이용 가능".

---

## 3. 라이브 검증 (Playwright, renagang21 / 배포 GlycoPharm)

| 관측 | 값 |
|---|---|
| `/auth/me` roles | `[kpa:store_owner, cosmetics:store_owner, lms:instructor, pharmacy, **glycopharm:store_owner**, supplier]` |
| `/store/info` 도달 | ✅ reachedPage, finalUrl=`/store/info`, 페이지 제목("약국/사업자 정보") 렌더 → **라우트 가드 통과** |
| `GET …/mypage/business-info` | **403** |
| 차단 문구 표시 | ✅ "약국 경영자만 이용 가능합니다" |

→ **canonical `glycopharm:store_owner` 보유 + 라우트 통과 + business-info 만 403.** 이중 소스 mismatch 확정.
(같은 계정이 `cosmetics:store_owner` 도 보유 → K-Cosmetics `/store/info` 도 동일 차단 예상.)

---

## 4. 판정

- **frontend legacy gate 아님** → frontend 수정으로 해결 불가(403 무시하면 권한 없는 사용자도 통과되어 위험).
- **backend business-info 인가가 legacy 회원 테이블 subRole 에 의존** → canonical role(`role_assignments`)·route guard 와 불일치.
- O4O 정책("승인된 매장/약국 경영자는 별도 추가 승인 없이 즉시 사용") 위반. **수정 대상 = backend.**

---

## 5. 권장 수정 (별도 backend WO)

**`WO-O4O-STORE-INFO-OWNER-GATE-CANONICAL-ROLE-ALIGN-BACKEND-V1`** (GP + KCos):

business-info GET/PATCH 인가를 **라우트 가드와 동일한 canonical 소스**로 정렬한다.
- 방안 A(권장): `req.user.roles` 에 `glycopharm:store_owner`(또는 `cosmetics:store_owner`) / admin / super_admin 포함 여부로 인가 — route guard 와 동일 기준.
- 방안 B: canonical `service_memberships`/`role_assignments` 로 store_owner 해석.
- ❌ 비권장: `glycopharm_members`/`cosmetics_members` 에 subRole **DB backfill** — CLAUDE.md §1(UI 정책을 DB backfill 로 해결 금지) 위반, legacy 소스 영속화.
- 권한 없는 사용자(store_owner role 없음)는 **계속 403 유지** — gate 제거가 아니라 소스 교정.
- subRole(pharmacy_owner vs staff_pharmacist) 구분이 필요한 별도 기능이 있으면 그건 유지하되, "사업자 정보 조회/수정" 접근 기준은 store_owner role 로.

검증: api-server tsc + GP/KCos `/store/info` 승인 계정 통과 + 권한 없는 계정 차단 + console/4xx(business-info 200) smoke.

---

## 6. 제외 / 주의

- frontend(PharmacyInfoPage/StoreInfoPage) **무변경** — 403 표시는 정확. (선택: forbidden copy 를 "store_owner 계정 필요"로 다듬을 수 있으나 gate 와 무관, 본 건 제외.)
- `glycopharm_members`/`cosmetics_members` 테이블 자체의 용도(회원 등록/staff 구분)는 본 IR 범위 외 — business-info 인가만 canonical 로 교정.
- DB/migration/공통 core 변경 없음(본 IR). backend WO 에서도 schema 변경 없이 controller 인가 로직만 교정 권장.

---

## 7. 완료 기준 답변

1. 차단 메시지 발생 위치 = **백엔드 403**(business-info GET), frontend 는 표시만.
2. 계정은 이미 canonical `glycopharm:store_owner` 보유(라우트 통과). 백엔드만 legacy subRole 요구.
3. 유형 = **B/D**(frontend 정상, API 가 legacy status 요구; business-info 만 다른 context 소스).
4. GP/KCos 동일 패턴. 수정 = backend, 별도 WO.

**판정: 조사 완료 — 수정은 `WO-O4O-STORE-INFO-OWNER-GATE-CANONICAL-ROLE-ALIGN-BACKEND-V1`(backend) 로 분리.**
