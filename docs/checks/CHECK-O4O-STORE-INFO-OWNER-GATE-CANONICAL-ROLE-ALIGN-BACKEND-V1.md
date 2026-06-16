# CHECK-O4O-STORE-INFO-OWNER-GATE-CANONICAL-ROLE-ALIGN-BACKEND-V1

> GlycoPharm / K-Cosmetics `/store/info` business-info API 인가를 **legacy member.subRole → canonical role(role_assignments)** 로 정렬.
> **결과: PASS** — backend controller 2파일 인가 소스 교정. api-server 변경 파일 tsc 0. schema/migration/frontend 무변경.
> 선행: `IR-O4O-STORE-INFO-OWNER-GATE-LEGACY-CLEANUP-V1`(`4d77db844`) · 2026-06-16

---

## 1. 선행 IR 요약 / mismatch 구조

| 계층 | 인가 소스(전) | 결과 |
|---|---|---|
| `/store/info` 라우트 진입 | canonical role `glycopharm:store_owner` (route guard) | ✅ 통과 |
| business-info GET/PATCH | **legacy** `glycopharm_members.subRole === 'pharmacy_owner'` (`cosmetics_members.subRole === 'store_owner'`) | ❌ 403 |

→ 승인된 canonical store_owner 가 라우트는 통과하나 business-info 403 → "경영자만 이용 가능". (라이브 검증: 계정 roles 에 `glycopharm:store_owner` 포함 + 페이지 도달 + business-info 403 — IR §3.)

---

## 2. 수정 파일 (backend 2 + CHECK)

| 파일 | 변경 |
|---|---|
| `apps/api-server/src/routes/glycopharm/controllers/mypage.controller.ts` | business-info GET/PATCH 인가를 `isStoreOwner(dataSource, userId, 'glycopharm')`(canonical role_assignments)로 교체. legacy `memberService.getMyMembership().subRole==='pharmacy_owner'` 제거 |
| `apps/api-server/src/routes/cosmetics/controllers/cosmetics-mypage.controller.ts` | 로컬 `isStoreOwner(userId)` 를 canonical `isStoreOwner(ds, userId, 'cosmetics')` 위임으로 교체. legacy `cosmetics_members.subRole==='store_owner'` + `CosmeticsMember` repo 의존 제거 |

공통 인가 util: `apps/api-server/src/utils/store-owner.utils.ts` 의 `isStoreOwner(dataSource, userId, serviceKey)` —
`role_assignments WHERE role = '{service}:store_owner' AND is_active` (RBAC SSOT, F9). 신규 helper/추가 쿼리 작성 없이 기존 canonical util 재사용.

---

## 3. 인가 정렬 내용

### GlycoPharm
```
- const member = await memberService.getMyMembership(userId);
- if (!member || member.subRole !== 'pharmacy_owner') 403
+ const { isOwner } = await isStoreOwner(dataSource, userId, 'glycopharm');
+ if (!isOwner) 403
```
GET·PATCH 양쪽 적용. `memberService` 는 `/my-requests`(membership 표시)에서 계속 사용 — 유지.

### K-Cosmetics
```
- async function isStoreOwner(userId) { return !!member && member.subRole === 'store_owner'; }  // cosmetics_members
+ async function isStoreOwner(userId) { const { isOwner } = await isCanonicalStoreOwner(ds, userId, 'cosmetics'); return isOwner; }
```
GET·PATCH 의 `await isStoreOwner(userId)` 호출부 무변경(헬퍼 내부만 교체). 미사용 `CosmeticsMember` import·`memberRepo` 제거.

---

## 4. 권한 없는 사용자 차단 유지 근거

- `isStoreOwner(ds, userId, serviceKey)` 는 `role_assignments` 에 `{service}:store_owner`(is_active) 가 **없으면 `isOwner=false`** 반환 → 핸들러에서 **403 유지**.
- 즉 gate 제거가 아니라 **소스 교정**. store_owner role 없는 일반 사용자는 계속 403.
- DB backfill / subRole 채우기 / frontend 403 무시 — **사용 안 함**(CLAUDE.md §1 준수).

---

## 5. 검증

| 대상 | 결과 |
|---|---|
| 변경 파일 `tsc --noEmit` | **0** (mypage.controller / cosmetics-mypage.controller / store-owner.utils 에러 없음) |
| api-server 전체 tsc | ⚠️ 무관한 기존 baseline 에러 1건(`market-trial/marketTrialController.ts:105` CreateTrialDto.productId) — 본 WO 변경과 무관 |
| schema / migration / DB backfill | 없음 |
| frontend / KPA | 무변경 |
| 신규 dependency | 없음(기존 util 재사용) |

### Smoke (배포 후 권장)
- GP `renagang21`(roles 에 `glycopharm:store_owner`): `GET/PATCH /glycopharm/mypage/business-info` **200**, `/store/info` 차단 문구 미표시.
- KCos store_owner 계정: `GET/PATCH /cosmetics/mypage/business-info` 200, 차단 문구 미표시.
- store_owner role 없는 계정: 계속 **403** 유지.

> 미배포 — 본 CHECK 의 smoke 는 배포 후 검증 항목. 정적: 라이브 IR smoke 에서 `renagang21` 이 `glycopharm:store_owner`
> 보유 확인됨(IR §3) → canonical `isStoreOwner('glycopharm')` 통과 보장.

---

## 6. 변경 여부 요약

| 항목 | 변경 |
|---|---|
| backend controller 인가 (GP/KCos business-info) | ✅ canonical role 정렬 |
| backend schema / migration / DB | ❌ 무변경 |
| frontend | ❌ 무변경 |
| KPA | ❌ 무변경 |
| 공통 RBAC core | ❌ 무변경(기존 `store-owner.utils` 재사용) |
| dependency | ❌ 무변경 |

**판정: PASS** — `/store/info` business-info 인가가 라우트 가드와 동일한 canonical role(role_assignments) 기준으로 정렬됨. 승인된 경영자 통과 / 무권한 차단 유지.
