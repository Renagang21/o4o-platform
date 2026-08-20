# CHECK-O4O-SIGNAGE-MEDIA-LIBRARY-ROUTE-SHADOWING-AND-GUARD-CONTRACT-V1

- **WO**: `WO-O4O-SIGNAGE-MEDIA-LIBRARY-ROUTE-SHADOWING-AND-GUARD-CONTRACT-V1`
- **일자**: 2026-08-20
- **기준 commit**: `8502aec8d` (worktree 생성 시점 `origin/main`)
- **대상**: `apps/api-server/src/routes/signage/signage.routes.ts` · `.../repositories/media.repository.ts`
- **판정**: **FIXED** — route shadowing 해소 + `/media/library` 경계 필터 복구.

---

## 1. 문제

`GET /api/signage/:serviceKey/media/library` 가 먼저 등록된 `GET /media/:id` 에 매칭되어
`getMediaLibrary` 대신 `getMedia` 가 실행됐다. `id='library'` 가 그대로 SQL 로 내려가
`invalid input syntax for type uuid: "library"` → **500**.

`/schedules/calendar`(직전 WO)와 동일 유형이나, **두 route 의 guard 가 달라서**
(`/media/:id` = `requireSignageOperatorOrStore`, 기존 `/media/library` = `allowSignageStoreRead`)
순서만 바꾸면 적용 권한이 달라진다. 그래서 권한 계약을 먼저 확정한 뒤 수정했다.

---

## 2. 수정 전 재현 (production, `api.neture.co.kr`)

로그인 계정은 `docs/local/TEST-ACCOUNTS.local.md` (gitignored) 의 매장 계정. **DB write 0 · 조회만.**

| serviceKey | 요청 | 결과 |
|---|---|---|
| kpa-society | `/media/library` (org 헤더 있음) | **500** `invalid input syntax for type uuid: "library"` |
| kpa-society | `/media/library` (org 헤더 없음) | **403** `SIGNAGE_ACCESS_DENIED` |
| k-cosmetics | 동일 2건 | **500 / 403** |
| glycopharm | 동일 2건 | **500 / 403** |
| alias `cosmetics` · `kpa` | `/media/library` | **500** (동일) |

### 실제 진입 handler · 적용 guard 확정 근거

- org 헤더가 없을 때 **403 `SIGNAGE_ACCESS_DENIED`** 가 났다. 이 코드는
  `requireSignageOperatorOrStore` 만 반환한다 (`allowSignageStoreRead` 는 400 `ORGANIZATION_CONTEXT_REQUIRED`).
- 즉 production 에서 `/media/library` 에 실제 적용되던 guard 는 **`requireSignageOperatorOrStore`**,
  진입 handler 는 **`getMedia`(detail)** 였다. 소스에 적힌 `allowSignageStoreRead` 는 **한 번도 실행된 적이 없다.**
- DB error: `getMediaById` 의 `id = 'library'` uuid cast 실패.

### 대조군

| 요청 | 결과 |
|---|---|
| `/media` | 200 `{"data":[],"meta":{...,"total":0}}` (3 서비스 모두 0행) |
| `/media/<random-uuid>` | 404 `Media not found` |
| `/media/not-a-uuid` | **500** `invalid input syntax for type uuid: "not-a-uuid"` (§10 잔존 debt) |

### Guard 기준선 (수정 전)

| 조건 | 결과 |
|---|---|
| 미인증 | 401 `AUTH_REQUIRED` |
| 알 수 없는 serviceKey | 400 `INVALID_SERVICE_KEY` |
| 타 서비스 org | 403 `SIGNAGE_ACCESS_DENIED` |
| 존재하지 않는 org | 403 `SIGNAGE_ACCESS_DENIED` |

---

## 3. `/media` route 전수 census

mount: `app.use('/api/signage/:serviceKey', signageRoutes)` — `/api/v1` 아래가 아니다.
공통 chain: `router.use(requireAuth)` → `router.use(validateServiceKey)` → per-route guard.

| 등록 순서(수정 전) | Method / Path | Guard | Handler | service scope | org scope | Frontend consumer |
|---|---|---|---|---|---|---|
| L91 | GET `/media` | `requireSignageOperatorOrStore` | `getMediaList` | serviceKey | org 필수(store) | `admin-dashboard` `signageV2.ts` → `MediaLibrary.tsx`, `PlaylistEditor.tsx` |
| L94 | POST `/media` | `requireSignageStore` | `createMedia` | serviceKey | org 필수 | 동일 (`MediaLibrary.tsx` 업로드) |
| L97 | GET `/media/:id` | `requireSignageOperatorOrStore` | `getMedia` | serviceKey | org 선택 | 직접 호출 없음 |
| L100 | PATCH `/media/:id` | `requireSignageStore` | `updateMedia` | serviceKey | org 필수 | `signageV2.ts` `update()` |
| L103 | DELETE `/media/:id` | `requireSignageStore` | `deleteMedia` | serviceKey | org 필수 | `MediaLibrary.tsx` 삭제 |
| **L198** | GET `/media/library` | `allowSignageStoreRead` (미실행) | `getMediaLibrary` | serviceKey | org 선택 | **살아있는 UI 소비처 0** (§4) |
| L218 | GET `/global/media` | `allowSignageStoreRead` | `getGlobalMedia` | serviceKey | 불필요 | signage global 조회 |
| L221 | GET `/global/media/:source` | `allowSignageStoreRead` | `getGlobalMediaBySource` | serviceKey | 불필요 | 동일 |
| L230 | POST `/hq/media` | `requireSignageOperator` | `createHqMedia` | serviceKey | 불필요 | operator 콘솔 |
| L236 | PATCH `/hq/media/:id/status` | `requireSignageOperator` | `transitionHqMediaStatus` | serviceKey | 불필요 | operator 콘솔 |
| L242 | PATCH `/hq/media/:id` | `requireSignageOperator` | `updateHqMedia` | serviceKey | 불필요 | operator 콘솔 |
| L250 | GET `/hq/media/:id/usage` | `requireSignageOperator` | `getMediaUsage` | serviceKey | 불필요 | 사용처 가드 |
| L255 | DELETE `/hq/media/:id` | `requireSignageOperator` | `hardDeleteMedia` | serviceKey | 불필요 | 안전 삭제 |
| L276 | POST `/community/media` | `requireSignageCommunity` | `createCommunityMedia` | serviceKey | 불필요 | community 기여 |
| L279 | DELETE `/community/media/:id` | `requireSignageCommunity` | `deleteCommunityMedia` | serviceKey | 불필요 | community 기여 |

- `/media/upload` route 는 **없다** — 업로드는 `POST /upload/presigned`(`requireSignageOperatorOrStore`) + `POST /media` 조합이다.
- `/media/:id/*` 하위 route 없음 (`/hq/media/:id/usage` 만 존재, 다른 prefix).
- player/device 계열은 `signage-public.routes.ts` 이며 `/media` route 를 포함하지 않는다.
- sub-router 없음 (`router.use` 는 `requireAuth` / `validateServiceKey` 2건뿐).
- **미조사 0.**

---

## 4. `/media/library` 소비처 census

전체 저장소에서 `media/library` 문자열 검색 결과 (node_modules 제외):

| 위치 | 성격 |
|---|---|
| `apps/admin-dashboard/src/lib/api/signageV2.ts:600` `signageMediaApi.getLibrary()` | 유일한 client wrapper |
| `apps/api-server/.../signage.routes.ts` | route 정의 |

`getLibrary()` 를 **호출하는 화면은 0개**다. `MediaLibrary.tsx` / `PlaylistEditor.tsx` 는 모두
`signageMediaApi.list()`(= `GET /media`) 를 쓴다.

| 서비스 | 소비 여부 |
|---|---|
| KPA (`web-kpa-society`) | 없음 |
| K-Cosmetics | 없음 |
| GlycoPharm | 없음 |
| PharmacyHub | 없음 |
| Neture / admin-dashboard | wrapper 함수만 존재, 호출 0 |
| Operator / HQ | 없음 (`/hq/media/*` 사용) |
| backend 내부 호출 | 없음 |

→ **현행 소비처 0**. 다만 WO §1 이 "명백한 라우팅 결함으로 닫는다"이므로 `DEAD/REMOVE` 가 아니라
**계약을 고정하고 정상 동작시키는 방향**으로 처리했다 (은퇴 판단은 별도 WO 사안).

---

## 5. 두 guard 비교 (코드 기준)

| 항목 | `requireSignageOperatorOrStore` | `allowSignageStoreRead` |
|---|---|---|
| 인증 | 필수 (401) | 필수 (401) |
| operator 판정 | `hasSignageOperatorPermission` → 통과 시 org 없이 진행 | 판정하되 **차단 용도 아님** (context 라벨링) |
| store 판정 | `hasSignageStorePermission` → 실패 시 `organization_members` DB fallback | **없음** |
| organization ownership | **검사함** (DB fallback 포함) | **검사하지 않음** |
| org ↔ service 귀속 | **검사함** (`isSignageOrganizationInService`, WO-O4O-SIGNAGE-CROSS-SERVICE-ORGANIZATION-SCOPE-GUARD-V1) | **검사하지 않음** |
| org 헤더 없음 | store 는 403 `SIGNAGE_ACCESS_DENIED` | 400 `ORGANIZATION_CONTEXT_REQUIRED` (admin/operator 는 통과) |
| org 출처 | header / query / body | header / query / **`req.user.organizationId`** |
| platform admin | 우회 | 우회 |
| 실제 다른 소비 route | `/media`, `/media/:id`, `/playlists*`, `/upload/presigned`, `/ai/generate` | `/active-content`, `/templates*`, `/content-blocks*`, `/layout-presets*`, `/global/*` |

**`allowSignageStoreRead` 의 존재 이유**: 주석과 소비 route 가 일치한다 — **organization 에 귀속되지 않는
service-global 읽기 전용 자원**(템플릿 · 콘텐츠 블록 · 레이아웃 프리셋 · `/global/*` · 재생용 active-content).
이 자원들은 응답 자체가 org 별로 나뉘지 않으므로 ownership 검사가 계약상 불필요하다.

**`/media/library` 는 그 부류가 아니다.** repository(`findMediaLibrary`)가
`organization` 목록을 **요청자가 넘긴 organizationId 로** 조회한다. 즉 org-scoped 응답이므로
ownership 검사가 반드시 필요하다. `allowSignageStoreRead` 는 그것을 하지 않는다.

---

## 6. Guard 계약 판정 — **C. OPERATOR_OR_STORE**

`/media/library` 의 의도된 계약은 **`requireSignageOperatorOrStore`** 이다.

근거:

1. **실제 caller 기준**: production 에서 이 경로에 적용돼 온 guard 가 이미
   `requireSignageOperatorOrStore` 다 (§2). 계약을 이 값으로 고정하면 **외부 consumer 의 권한은 1건도 변하지 않는다.**
2. **응답 데이터 기준**: `findMediaLibrary` 는 `platform`(= 해당 serviceKey 의 org 없는 공용 media) +
   `organization`(= 요청 org 의 media) 을 반환한다. org-scoped 부분이 있으므로 ownership 검사가 필수다.
3. **형제 route 일관성**: `/media`, `/media/:id` 와 동일 guard. media 도메인 안에서 읽기 권한이 갈라질 이유가 없다.
4. **operator 지원**: operator 는 org 없이도 platform 목록을 읽어야 한다.
   `requireSignageOperatorOrStore` 의 operator branch 가 정확히 그 동작이다 (org 없으면 `organization: []`).
5. 판정 A(STORE_OWNED_LIBRARY)는 operator 를 배제해 `/media` 와 어긋나고,
   B(STORE_READ_GLOBAL_LIBRARY)는 org-scoped 응답이 존재하는 사실과 모순된다.
   D(OPERATOR_ONLY)는 매장 자기 media 를 못 읽게 만든다. E(DEAD)는 §4 상 후보이나 이번 WO 목적이 아니다.

---

## 7. 보안 검증 — 발견된 **추가 결함 1건 (수정함)**

WO §9 는 "현재 데이터가 안전하다는 이유로 느슨한 guard 를 유지하지 않는다" 를 요구한다.
guard 뿐 아니라 **데이터 계층**을 확인한 결과 `findMediaLibrary` 에서 경계 필터가 지워지고 있었다.

```ts
// 수정 전
const baseQuery = (qb: any) => {
  qb.where('media.deletedAt IS NULL');           // ← TypeORM 의 where() 는 기존 WHERE 를 전부 덮어쓴다
  ...
};
platformQb.where('media.serviceKey = :serviceKey', ...);
platformQb.andWhere('media.organizationId IS NULL');
baseQuery(platformQb);                            // ← 위 두 줄이 여기서 소멸
```

`typeorm@0.3.26` `SelectQueryBuilder.where()` 는 `this.expressionMap.wheres = []` 로 초기화한다
(`node_modules/typeorm/query-builder/SelectQueryBuilder.js:341`).
따라서 실제 실행 SQL 에는 **`serviceKey` · `organizationId` 조건이 없었다** —
`deletedAt IS NULL AND status='active'` 만 남아 platform / organization 양쪽 모두
**전 서비스 · 전 organization 의 signage media 를 최대 50건씩** 반환하는 상태였다.

- CLAUDE.md §7 Guard Rule 3 (Domain Primary Boundary 필터 필수) 위반.
- route shadowing(500) 이 이 결함을 **가리고 있었다.** 순서만 고치고 배포했다면 그 시점부터 실제 누출이 시작된다.
- 수정: 공통 조건을 `andWhere()` 로만 덧붙인다 (경계 필터는 각 QueryBuilder 의 최초 `where()` 1회로 유지).

guard 계층 검증 결과:

| 검사 | `/media/library` 수정 후 |
|---|---|
| KPA store_owner 가 KCos/GP media 를 보는가 | 불가 — guard 403 + repository serviceKey 필터 |
| organizationId 없이 전 tenant media 를 보는가 | 불가 — store 는 403, operator 는 `platform`(자기 serviceKey 공용)만 |
| 타 서비스 organizationId 통과 | 불가 — `isSignageOrganizationInService` 403 |
| 서비스 귀속 없는 org | 불가 — 소유 검사 실패 시 403 |

---

## 8. 수정 내용 (최소)

### 8-1. route 등록 순서 + guard 명시 — `signage.routes.ts`

`POST /media` 다음, `GET /media/:id` 앞으로 이동하고 guard 를 `requireSignageOperatorOrStore` 로 적었다.

```ts
  // ========== Media Library Routes ==========
  // NOTE: static path MUST stay registered before '/media/:id',
  // otherwise Express matches it as :id='library' (route shadowing).
  // Guard 는 형제 media route 와 동일한 requireSignageOperatorOrStore 다
  // (shadowing 상태의 실제 production 계약과 동일 — 권한 완화 없음).
  router.get('/media/library', requireSignageOperatorOrStore, mediaCtrl.getMediaLibrary);
```

`allowSignageStoreRead` **자체는 수정하지 않았다** — 다른 소비 route
(`/active-content`, `/templates*`, `/content-blocks*`, `/layout-presets*`, `/global/*`) 계약은 불변이다.
(WO §11: 공용 guard 변경이 아니라 **이 route 의 guard 선택 변경**이다.)

### 8-2. 경계 필터 복구 — `media.repository.ts`

`baseQuery` 의 `qb.where(...)` → `qb.andWhere(...)`. handler / DTO / 응답 형태 불변.

### 금지 항목 준수

`id === 'library'` controller 분기 없음 · 500 catch 후 재호출 없음 · frontend URL 우회 없음 ·
organization 자동 치환 없음 · `requireAuth` 제거 없음 · cross-service guard 완화 없음 ·
새 role/service mapping 없음 · schema/migration 0.

---

## 9. 권한 매트릭스 (수정 후 `/media/library`)

| 요청자 | org 헤더 | 결과 | 데이터 범위 |
|---|---|---|---|
| 미인증 | — | 401 `AUTH_REQUIRED` | — |
| 인증 + 알 수 없는 serviceKey | 임의 | 400 `INVALID_SERVICE_KEY` | — |
| store_owner (자기 서비스 · 자기 org) | 있음 | 200 | 자기 serviceKey 의 platform media + 자기 org media |
| store_owner (타 서비스 org) | 있음 | 403 `SIGNAGE_ACCESS_DENIED` | — |
| store_owner (미소유 org) | 있음 | 403 `SIGNAGE_ACCESS_DENIED` | — |
| store_owner | 없음 | 403 `SIGNAGE_ACCESS_DENIED` | — |
| operator (해당 서비스) | 불필요 | 200 | 자기 serviceKey 의 platform media (`organization: []`) |
| platform super_admin | 불필요 | 200 | 동일 (admin 우회) |

---

## 10. 자동 테스트

신규 `apps/api-server/src/__tests__/signage-media-library-route-order.spec.ts` — **12 케이스**, DB 미접속.

- router stack: GET `/media/library` 등록 index < GET `/media/:id`
- 두 route 의 **guard chain 이름 배열 동일** + `requireSignageOperatorOrStore` 포함 (권한 완화 감지)
- dispatch: `/media/library` → `getMediaLibrary` 진입, `getMedia` 미진입
- `/media/:id` → `getMedia` · `/media` → `getMediaList` · PATCH/DELETE 회귀 없음
- k-cosmetics / glycopharm + legacy alias(`cosmetics` / `kpa`) 동일 동작 (canonicalization 회귀)
- guard: 미인증 401 · 알 수 없는 serviceKey 400 · org context 없음 403 · 미소유/타 서비스 org 403 (모두 handler 미진입)
- repository: `findMediaLibrary` 의 각 QueryBuilder 에서 `where()` 는 **정확히 1회**이고 그 조건이 `media.serviceKey` 임을 고정,
  organizationId 없으면 organization 쿼리를 만들지 않음

**비공허성 확인**: 수정 전 코드로 동일 스펙 실행 시 **5 케이스 FAIL**(route order 2 · dispatch 2 · repository 1),
수정 후 12/12 PASS.

`validateServiceKey` / `requireSignageOperatorOrStore` 는 실제 구현을 사용하고,
`AppDataSource.query` · `requireAuth` · 관심사 밖 controller · entity 패키지만 stub 으로 대체했다.

---

## 11. 검증 결과

| 항목 | 결과 |
|---|---|
| `signage-media-library-route-order.spec.ts` | PASS (12) |
| `signage-schedule-route-order.spec.ts` | PASS |
| `signage-cross-service-org-guard.spec.ts` | PASS |
| `signage-servicekey-canonicalization.spec.ts` | PASS |
| api-server `tsc --noEmit` | PASS |
| api-server 전체 Jest | **PASS — 165 suites / 2558 tests** |
| production API smoke | PASS (§12) — `/media/library` 500 = 0 · cross-service 누출 0 |
| browser 회귀 | PASS (§13) — white screen 0 · console error 0 · API 회귀 0 |

> 참고: `packages/financial-core` 의 `tsup: No input files` 빌드 실패는 이번 변경과 무관한 **기존 상태**이며,
> `--no-bail` 로 나머지 46개 패키지를 빌드한 뒤 typecheck 를 수행했다.

---

## 12. Production 검증 (배포 후)

- 배포: commit `42bdf122f` → GitHub Actions run `32343552278` **success** → Cloud Run revision **`o4o-core-api-03409-8f2`** (100% traffic).
- 계정: `docs/local/TEST-ACCOUNTS.local.md` 의 매장 계정 (store_owner). **전 요청 GET · production DB write 0.**

| serviceKey | 요청 | 결과 |
|---|---|---|
| kpa-society | `/media/library` (org 있음) | **200** `platform` 5건 |
| kpa-society | `/media/library` (org 없음) | 403 `SIGNAGE_ACCESS_DENIED` |
| k-cosmetics | `/media/library` (org 있음) | **200** `platform` 0 / `organization` 0 |
| k-cosmetics | `/media/library` (org 없음) | 403 `SIGNAGE_ACCESS_DENIED` |
| glycopharm | `/media/library` (org 있음) | **200** `platform` 0 / `organization` 0 |
| glycopharm | `/media/library` (org 없음) | 403 `SIGNAGE_ACCESS_DENIED` |

**`/media/library` 관련 500 = 0** (수정 전 3 서비스 전부 500 → 수정 후 0).

### cross-service 누출 검증 (응답 payload 실측)

| serviceKey | platform / organization 건수 | 응답에 포함된 `serviceKey` | 응답에 포함된 `organizationId` |
|---|---|---|---|
| kpa-society | 5 / 0 | `["kpa-society"]` | `[null]` |
| k-cosmetics | 0 / 0 | `[]` | `[]` |
| glycopharm | 0 / 0 | `[]` | `[]` |

→ 타 서비스 media 0건 · 타 organization media 0건. 경계 필터 복구가 실제로 적용됐다.
(수정 전이라면 shadowing 해소 시점부터 3 서비스 모두 전 tenant media 를 최대 50건 반환했을 것이다.)

### 대조군 (회귀 없음)

| 요청 | kpa-society | k-cosmetics | glycopharm |
|---|---|---|---|
| `/media` | 200 (total 0) | 200 (total 0) | 200 (total 0) |
| `/media/<random-uuid>` | 404 `Media not found` | 404 | 404 |
| `/media/not-a-uuid` | 500 (기존 debt · §14) | 500 | 500 |

### Guard 회귀 매트릭스 (`/media/library`)

| 조건 | 결과 |
|---|---|
| 미인증 | 401 `AUTH_REQUIRED` |
| 알 수 없는 serviceKey (`bogus-key`) | 400 `INVALID_SERVICE_KEY` |
| 타 서비스 org (k-cosmetics 에 KPA org) | 403 `SIGNAGE_ACCESS_DENIED` |
| 존재하지 않는 org (`0000...`) | 403 `SIGNAGE_ACCESS_DENIED` |
| legacy alias `cosmetics` | 200 (k-cosmetics 와 동일) |
| legacy alias `kpa` | 200 (kpa-society 와 동일) |

→ serviceKey canonicalization(§12 WO) · cross-service organization guard(§13 WO) 회귀 0.

---

## 13. Browser 회귀

`/media/library` 를 호출하는 화면이 0개(§4)이므로, WO §17 에 따라 3 서비스 대표 Signage 화면을 확인했다.
매장 계정 로그인 · headless Chromium · 다른 세션의 브라우저 프로필 미접촉(별도 isolated context).

| 서비스 | 화면 | 렌더 | console error | Signage API 4xx/5xx |
|---|---|---|---|---|
| KPA | `/store/marketing/signage/playlist` | 정상 | 0 | 0 |
| KPA | `/store/marketing/signage/videos` | 정상 | 0 | 0 |
| KPA | `/store/marketing/signage/schedules` | 정상 | 0 | 0 |
| KPA | `/store/marketing/signage/player` | 정상 | 0 | 0 |
| KPA | `/store-hub/signage` | 정상 | 0 | 0 |
| K-Cosmetics | `/store-hub/signage` | 정상 | 0 | 0 |
| GlycoPharm | `/store-hub/signage` | 정상 | 0 | 0 |

**white screen 0 · JS exception 0 · Signage API 회귀 0.**

---

## 14. 잔존 debt (이번 WO 범위 밖 · WO §15/§18)

1. **`GET /media/not-a-uuid` → 500** — `/media/:id` 에 uuid 형식 검증이 없어 값이 그대로 DB 로 내려간다.
   `findMediaById` 의 `where.id` cast 실패. 400/404 정규화는 별도 WO.
2. **`GET /schedules/not-a-uuid` → 500** — 동일 유형 (직전 WO 에서도 debt 로 기록).
3. **`/media/library` 소비처 0** — 계약은 고정했으나 사용하는 UI 가 없다. 은퇴 또는 UI 연결은 별도 판단.

---

## 15. DB / schema 영향

- migration 0 · schema 변경 0 · **production DB write 0** (검증은 전부 GET).
- 수정은 route 등록 순서 · guard 선택 · QueryBuilder 조건 결합 방식뿐이다.

---

## 16. 문서 정합

발견 0건 / SUPERSEDED 표기 0건 / 링크 수정 0건 / 별도 WO 제안 2건
(① signage `:id` uuid 형식 미검증 500 정규화 ② `/media/library` 소비처 0 — 은퇴 또는 UI 연결 판단)
