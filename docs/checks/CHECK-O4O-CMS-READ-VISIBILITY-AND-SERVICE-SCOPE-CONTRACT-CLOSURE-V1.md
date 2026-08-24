# CHECK-O4O-CMS-READ-VISIBILITY-AND-SERVICE-SCOPE-CONTRACT-CLOSURE-V1

**대상 WO**: WO-O4O-CMS-READ-VISIBILITY-AND-SERVICE-SCOPE-CONTRACT-CLOSURE-V1
**기준 commit**: `d9ecc678a` (origin/main)
**작성일**: 2026-08-21
**결과**: **§9 `platform + serviceKey` 의미 확정** + **§11-1 read 경계 구현 완료** (2026-08-24 재개)
**구현 재개 commit 기준**: `21ed6d88d` (origin/main)
**구현/배포 commit**: `1a5babf96` (경계 강제) · `6cf2d935c` (alias SSOT 수렴) — Cloud Run revision `o4o-core-api-03452-hdz`

---

## 0. 요약

```text
CMS read endpoint census      완료 (미조사 0)
consumer census               완료 (미조사 0)
visibilityScope 의미 census   완료 — 코드 근거로 확정
§9 platform + serviceKey      확정: B. service-public (serviceKey 가 경계)

코드 수정                     0  — 디스크 여유 96~102MB 로 검증 불가 (§17)
production DB write           0
```

**2026-08-24 재개** — §12 의 중지 사유는 **정책이 아니라 디스크**였고, 다른 작업 PC 에서 여유가 확보돼
새 WO 없이 같은 WO 를 그대로 재개했다. §11-1 의 남은 구현 4건을 모두 적용하고 검증했다 (§9-1·§10-1).

```text
read 경계 강제 (contents/:id · contents · stats · slots/:slotKey)   ✅
KPA alias (kpa ↔ kpa-society) 정렬                                  ✅
PLATFORM_ADMIN cross-service = 역할 근거 (파라미터 생략 아님)        ✅
jest / typecheck                                                    ✅ PASS
production DB write                                                 0
schema / migration                                                  0
```

**이번 WO 의 실질 산출물**: 선행 CHECK(`…CMS-CONTENT-DETAIL-SERVICE-SCOPE-GUARD-V1` §9)가
"정책 미확정" 으로 남긴 **중지 조건을 코드 근거로 해소**했다. 이제 구현 방향이 확정 가능하다.

---

## 1. CMS read endpoint census (WO §4) — 최신 main 재산출, 미조사 0

mount: `app.use('/api/v1/cms', ...)`. read 성격 endpoint만 추림.

| # | method/path | auth | serviceKey 입력 | organizationId | visibility filter | status filter | scope 강제 |
|---|---|---|---|---|---|---|:---:|
| 1 | `GET /cms/stats` | optionalAuth | query(선택) | query(선택) | — | — | ❌ |
| 2 | `GET /cms/contents` | optionalAuth | **query(선택)** | query(선택) | query(선택) | 비인증=published 강제 | ❌ |
| 3 | `GET /cms/contents/:id` | optionalAuth | **query(선택)** ※선행 WO 로 추가 | — | — | 비인증=published 강제 | ⚠️ opt-in |
| 4 | `GET /cms/slots/:slotKey` | optionalAuth | query(선택) | query(선택) | — | activeOnly | ❌ |
| 5 | `GET /cms/slots` | requireAuth + `requireSlotAccess` | slot scope | — | — | — | ✅ |

### 1-1. 같은 `cms_contents` 를 읽는 **서비스별 wrapper (scope 강제됨)**

| 경로 | scope 처리 | 근거 |
|---|---|---|
| `ContentQueryService.listPublished()` | `where.serviceKey = In(config.serviceKeys)` **항상 제한** | `content-query.service.ts:48` |
| `HubContentService.queryCms()` | `where = { serviceKey, status:'published', visibilityScope: In(['platform','service']) }` | `hub-content.service.ts:270-274` |
| GP / KCos `/{service}/contents/:id` | URL 에 서비스 축 존재 | 서비스별 라우트 |

→ **경계를 강제하는 canonical read 경로는 이미 존재한다.** 강제하지 않는 것은 `/api/v1/cms/*` 공통 라우트뿐이다.

---

## 2. Consumer census (WO §5) — 미조사 0

| caller | 분류 | 대상 endpoint | serviceKey 전달 | org context | cross-service 필요 |
|---|---|---|:---:|:---:|:---:|
| **PharmacyHub** `/resources` | SERVICE_MEMBER | 목록 + 상세 | ✅ (목록·상세 모두) | ❌ | ❌ |
| **K-Cosmetics** `api/cms.ts` | SERVICE_MEMBER | 목록 · slot | ✅ (기본값 `'cosmetics'`) | ❌ | ❌ |
| **admin-dashboard** `CMSContentList` | PLATFORM_ADMIN | 목록(전 서비스) + 상세 | ❌ | ❌ | ✅ **업무상 필요** |
| GlycoPharm `api/cms.ts getContent` | — | 상세 | — | — | **dead (소비처 0)** |
| KPA / Neture | — | `/cms/*` 호출 **0** | — | — | — |
| 서비스별 wrapper (§1-1) | SERVICE_MEMBER / PUBLIC | 자체 route | 내부 강제 | — | ❌ |

**핵심**: 상세(`/contents/:id`) 소비자 중 cross-service 가 필요한 것은 **admin-dashboard 하나**이며,
그마저도 **목록 row 에서 `content.serviceKey` 를 이미 알고 있다**(`handleEdit(content)` → `getContent(content.id)`).
→ 상세는 **관리자 예외 없이도** 서비스 스코프화가 가능하다.

---

## 3. Production visibility 데이터 census (WO §7) — read-only, 최신 재산출

| serviceKey | visibilityScope | status | rows | organizationId |
|---|---|---|---:|---|
| glycopharm | service | draft | 63 | 전부 NULL |
| glycopharm | platform | published | 2 | NULL |
| glycopharm | service | archived | 1 | NULL |
| **kpa** | platform | published | **1** | NULL |
| **kpa-society** | platform | published | **53** | **32건 non-NULL** |
| neture | platform | published | 3 | NULL |
| neture | service | draft/archived | 3 | NULL |
| **pharmacy-hub** | — | — | **0** | — |

```text
serviceKey IS NULL (global) 행: 0
visibilityScope='organization' 행: 0        ← 모델엔 있으나 cms_contents 에는 미사용
published 행: 전부 visibilityScope='platform'
```

**비정상 조합**: `visibilityScope='platform'` 인데 `organizationId` 가 채워진 kpa-society 32건.
`organization` scope 를 쓰지 않으면서 org 를 기록한 상태다(§8-C 참조).

---

## 4. `visibilityScope` 실제 의미 (WO §6) — 이름이 아니라 코드로 확정

### 4-1. 누가 설정하는가 (create 경로)

`cms-content-mutation.handler.ts:150-154`

```ts
const authorRole      = isPlatformAdmin ? 'admin'    : 'service_admin';
const visibilityScope = isPlatformAdmin ? (reqVisibilityScope || 'platform') : 'service';
```

- **같은 `isPlatformAdmin` 불리언에서 `authorRole` 과 함께 파생된다.**
- service admin 은 `'service'` 로 **강제**되고 `serviceKey` 가 **필수**다.
- 즉 `visibilityScope` 는 사실상 **"누가 만들었는가"(제작 주체) 축**이며 `authorRole` 과 1:1 이다.

### 4-2. 어떻게 읽히는가 (read 소비처)

| 소비처 | 처리 |
|---|---|
| `HubContentService.queryCms` | `serviceKey` **고정** + `visibilityScope: In(['platform','service'])` → **둘을 함께** 그 서비스 안에서 노출 |
| `ContentQueryService.listPublished` | `serviceKey` **고정**, `visibilityScope` 는 **선택적 추가 필터**일 뿐 |
| `/cms/contents`, `/cms/contents/:id` | `visibilityScope` 는 단순 query 필터, 경계 아님 |

→ **어떤 read 경로도 `visibilityScope='platform'` 을 근거로 serviceKey 경계를 넘지 않는다.**

---

## 5. §9 최종 판정 — `platform + serviceKey`

> ## **B. service-public** — `serviceKey` 가 경계다.
> `visibilityScope` 는 **서비스 내부의 제작 주체/노출 축**이지 cross-service 공개 축이 아니다.

| 값 | 확정된 의미 |
|---|---|
| `platform` | **플랫폼 운영자가 제작**한 콘텐츠 (`authorRole='admin'`). 노출 범위는 여전히 그 `serviceKey` 안 |
| `service` | **서비스 운영자가 제작**한 콘텐츠 (`authorRole='service_admin'`) |
| `organization` | `cms_contents` 에는 **사용되지 않음**(0건). KPA store content 쪽 별도 테이블이 DB CHECK 로 사용 |

**근거 3종**
1. **생성**: `visibilityScope` 가 `authorRole` 과 같은 불리언에서 파생 → 제작 주체 축 (§4-1)
2. **소비**: canonical HUB 조회가 `serviceKey` 고정 + `platform`·`service` 를 **함께** 노출 (§4-2)
3. **데이터**: `serviceKey IS NULL` 인 진짜 global 행이 **0건** — cross-service 공개 콘텐츠는 실재하지 않는다 (§3)

→ 선행 WO 가 "`platform` 이 cross-service 공개를 뜻하는지 불명확" 으로 남긴 **중지 조건 해소**.
→ 따라서 `/cms/contents*` 가 `serviceKey` 없이 전 서비스를 반환하는 현 동작은 **정책상 정당화되지 않는다.**

---

## 6. 확정된 read 계약 (WO §8·§10·§11·§12)

§5 판정에 따라 아래가 canonical 이다. (구현은 §17 사유로 미적용)

| 주체 | 계약 |
|---|---|
| **ANONYMOUS** | `serviceKey` 필요 · `status='published'` 만. `platform`/`service` 모두 그 서비스 안에서 노출 |
| **SERVICE_MEMBER** | 자기 service context 안에서 `published`(+ 권한 시 draft). **serviceKey 생략으로 타 서비스 조회 불가** |
| **PLATFORM_ADMIN** | cross-service 조회 유지. 단 **역할 기반 인가**(`isPlatformAdmin`, `authorizeCmsMutation` 과 동일 근거)로 허용하며 "파라미터 생략 = 관리자 모드" 로 구현하지 않는다 |
| **ORGANIZATION** | `cms_contents` 에 0건이므로 이번 범위에서 **계약을 발명하지 않는다** (WO §14 준수) |

### 6-1. canonical service context SSOT (WO §13·§20)

새 헤더·새 mapping 을 만들 필요가 없다. 기존 축을 그대로 쓴다.

```text
query serviceKey            — 목록·상세 공통 (기존 계약)
ContentQueryService.config  — 서비스별 serviceKeys 집합
KPA alias                   — serviceKey IN ('kpa-society','kpa')
                              (kpa-asset.resolver.ts:88 이 canonical 로 명시)
```

**KPA alias 영향(WO §20)**: read 에서 `kpa` 1건 + `kpa-society` 53건을 **한 집합으로** 다뤄야 한다.
한쪽만 비교하면 콘텐츠가 사라지거나(1건 누락) 경계가 새는 방향 모두 가능하다.
`ContentQueryService` 는 이미 alias 집합을 쓰고 있고, `/cms/contents*` 는 단일 문자열 비교라 **정렬 필요**.

---

## 7. list/detail invariant (WO §15) — 현재 상태

```text
목록: serviceKey 생략 시 전 서비스 반환   (경계 없음)
상세: serviceKey 생략 시 전 서비스 반환   (경계 없음, 선행 WO 로 opt-in 만 추가)
```

→ 두 경로가 **같은 방식으로** 열려 있어 invariant 자체는 깨지지 않았으나,
   **둘 다 닫혀야** WO §15 가 성립한다. 상세만 닫으면 목록이 남고, 목록만 닫으면 상세가 남는다.

---

## 8. 횡전개 (WO §24)

| 대상 | 상태 |
|---|---|
| `GET /cms/slots/:slotKey` | `serviceKey` 선택 필터 — **동일 결함 축** |
| `GET /cms/stats` | `serviceKey` 선택 필터 — 집계 수치가 전 서비스 합산될 수 있음 |
| attachment/download 전용 endpoint | **없음** (`attachments` 는 content row 의 jsonb 필드) |
| `content-assets` 라우트 | detail `:id` endpoint 없음 |
| slot mutation (`PUT/DELETE /slots/:id`) | `requireSlotAccess` 가드 존재 |

→ 함께 닫아야 할 것은 **`/cms/contents`(목록) · `/cms/contents/:id`(상세) · `/cms/slots/:slotKey` · `/cms/stats`** 4개다.

---

## 9. 실제 수정 내용 (1차 — 2026-08-21)

**없음 (0건).** 사유는 §17.

선행 WO(`d98533518`)에서 적용된 상세 opt-in scope 와 invalid UUID 404 정규화는 그대로 유지된다.
이번 WO 는 그 위에 **정책 확정**만 얹었다.

---

## 9-1. 실제 수정 내용 (2차 — 2026-08-24 재개, §11-1 구현)

### backend

| 파일 | 내용 |
|---|---|
| `apps/api-server/src/routes/cms-content/cms-content-utils.ts` | read 경계 계약의 **단일 구현**을 추가. `resolveCmsServiceKeys()` (KPA alias) · `isCmsPlatformAdmin()` · `resolveCmsReadScope()` · `CMS_SERVICE_KEY_REQUIRED_ERROR` |
| `.../cms-content-query.handler.ts` | `/stats` · `/contents` · `/contents/:id` 3개 read 를 같은 `readScope()` 로 닫음. 상세는 opt-in → **강제**. `serviceKey` 없으면 `400 SERVICE_KEY_REQUIRED` |
| `.../cms-content-slot.handler.ts` | 공개 `GET /slots/:slotKey` 에 동일 경계 적용 (§8 횡전개). `meta` 에 `serviceKeys`/`crossService` 노출 |
| `.../cms-content-mutation.handler.ts` | `authorizeCmsMutation` 의 platform admin 판정을 공유 `isCmsPlatformAdmin()` 으로 수렴. **동작 변화 없음** (근거를 두 곳에 두지 않기 위함) |

설계상 중요한 두 지점:

- **차단은 응답 가공이 아니라 DB 조회 조건**이다 (`where.serviceKey = In(scope.serviceKeys)`).
  `/contents` 의 search QueryBuilder 경로는 `In()` FindOperator 를 `= :key` 로 바인딩하면 깨지므로
  `serviceKey` 만 루프에서 제외하고 `IN (:...scopeServiceKeys)` 로 별도 처리했다.
- **`serviceKey` 생략은 관리자 모드가 아니다.** 생략은 `platform:super_admin` **역할**이 있을 때만
  cross-service 로 허용된다 (JWT roles → `roleAssignmentService.hasAnyRole` fallback).
  일반 로그인 사용자의 생략은 400 이다.

### frontend

| 파일 | 내용 |
|---|---|
| `apps/admin-dashboard/src/lib/cms.ts` | `getContent(id, params?: { serviceKey? })` — 상세도 경계를 전달할 수 있게 확장 |
| `apps/admin-dashboard/src/pages/cms/contents/CMSContentList.tsx` | 편집 진입 시 `content.serviceKey` 전달 (목록이 이미 갖고 있는 값) |
| `services/web-glycopharm/src/api/cms.ts` | `getContentById` 에 `serviceKey` 기본값(`glycopharm`) — 목록/슬롯과 동일. (이 client 는 여전히 소비처 0 = §11-2 부채 3) |

**변경 불필요로 확인된 소비처**: KCos `api/cms.ts` (항상 `serviceKey` 세팅) · PH `pharmacyHubResources.ts`
(목록·상세 모두 `serviceKey='pharmacy-hub'`) · admin-dashboard slot 화면
(`SlotContentAssignment` / `SlotFormModal` — serviceKey 미선택 시 `platform:super_admin` 역할로 cross-service).

---

## 9-2. alias SSOT 수렴 (WO §9·§10 — `6cf2d935c`)

1차 구현에서 CMS 로컬에 `CMS_SERVICE_KEY_ALIASES = { 'kpa-society': [...], 'kpa': [...] }` 를 선언했는데,
이는 WO §9 가 금지한 **CMS 전용 mapping 신설**이다 (SSOT 2벌). 다음과 같이 플랫폼 canonical SSOT 파생으로 교체했다.

```ts
// cms-content-utils.ts — @o4o/security-core 의 양방향 resolver 합성
export function resolveCmsServiceKeys(serviceKey: string): string[] {
  const rolePrefix = resolveRolePrefixFromCanonicalServiceKey(serviceKey);
  const canonical  = resolveCanonicalServiceKey(rolePrefix);
  return canonical === rolePrefix ? [canonical] : [canonical, rolePrefix];
}
```

| 입력 | 결과 |
|---|---|
| `kpa` · `kpa-society` | `['kpa-society', 'kpa']` |
| `cosmetics` · `k-cosmetics` | `['k-cosmetics', 'cosmetics']` (§10 이 추가 코드 없이 성립) |
| `neture` · `glycopharm` · `pharmacy-hub` | 자기 자신 1개 (self-map) |

`cms-content-slot.handler.ts` 의 로컬 alias 값(`SCOPE_TO_CMS_KEYS`)도 같은 helper 파생으로 바꿔
**read 경계와 slot manage 범위가 한 벌의 파생**을 쓰게 했다.

---

## 10. 검증 (1차)

| 항목 | 결과 |
|---|---|
| 코드 변경 | 0 → 신규 테스트·build 대상 없음 |
| 선행 CMS detail scope 테스트 | **12/12 PASS** (회귀 없음 확인, `--runInBand`) |
| production read-only census | **수행** (§3, write 0) |
| production API matrix (WO §22) · browser smoke (WO §23) | **미수행** — 코드 변경이 없어 회귀 대상이 없고, 환경 제약(§17) |

---

## 10-1. 검증 (2차 — 2026-08-24)

| 항목 | 결과 |
|---|---|
| `cms-content-detail-service-scope.spec.ts` | **28/28 PASS** (12 → 20 → 28: 400 계약 · 역할 기반 cross-service · KPA/KCos alias · platform visibility · list/stats 경계) |
| `cms-content-slot-service-scope.spec.ts` (신규) | **4/4 PASS** |
| `pharmacy-hub-content-resource-adoption.spec.ts` | **18/18 PASS** — 정적 가드가 옛 리터럴(`where.serviceKey = serviceKey as string`)을 검사하고 있어 새 계약 문자열로 교정 |
| 인접 회귀 (`kpa-content-resource-core-adoption` · `content-resource-core-table-isolation` · `community-content-resource-frontend-view-commonization` · `pharmacy-hub-community-capability-adoption`) | **PASS** |
| `tsc --noEmit` — api-server · admin-dashboard · web-glycopharm | **PASS** |
| production DB write | **0** |
| production API matrix (WO §16) · browser smoke (WO §17) | **완료** — 아래 §10-2 |

---

## 10-2. 전체 회귀 · 배포 · production 실측 (2026-08-24, WO §16·§17·§18)

### 전체 회귀 (이 PC 실행, 완화·skip 0)

| 항목 | 결과 |
|---|---|
| api-server `tsc --noEmit` | **PASS** |
| api-server **전체 Jest** (`--runInBand`, `--max-old-space-size=3072`) | **182 suites / 2980 tests PASS** (exit 0) |
| admin-dashboard production build | **PASS** |
| web-glycopharm production build | **PASS** |
| 선행 실패(타 세션 귀속) | **0건** — CMS 관련 실패를 선행 실패로 귀속시킨 항목 없음 (WO §19) |

### 배포

`Deploy API Server (Cloud Run)` @ `6cf2d935c` — success → revision `o4o-core-api-03452-hdz` (2026-08-24 06:01 UTC).

### production read-only drift (WO §2, write 0)

`cms_contents` 총 **127**건 · `serviceKey IS NULL` **0** · `visibilityScope='organization'` **0**.
§3 census 대비 차이는 `pharmacy-hub | service | archived` **1건 증가**뿐(총 126→127)이며 정책 판정에 영향 없다.
PH 의 `published` 자료는 여전히 0건이므로 자료실 목록 0건은 정상 상태다.

### cross-service read matrix (`https://api.neture.co.kr/api/v1/cms`, 익명, DB write 0)

| 요청 | 기대 | 실측 |
|---|---|---|
| `GET /contents` (serviceKey 생략) | 차단 | **400 `SERVICE_KEY_REQUIRED`** — 과거처럼 전체 CMS 를 반환하지 않음 |
| `GET /contents?serviceKey=pharmacy-hub&status=published` | 자기 서비스만 | **200 / 0건** (DB 실제 0건) |
| `GET /contents?serviceKey=kpa-society` | 자기 서비스만 | **200 / kpa-society row** |
| `GET /contents/{KPA uuid}?serviceKey=pharmacy-hub` | 차단 | **404 `NOT_FOUND`** |
| `GET /contents/{GP uuid}?serviceKey=pharmacy-hub` | 차단 | **404** |
| `GET /contents/{KPA uuid}?serviceKey=kpa-society` | 허용 | **200** |
| `GET /contents/{legacy `kpa` uuid}?serviceKey=kpa-society` | alias 허용 | **200** |
| `GET /contents/{kpa-society uuid}?serviceKey=kpa` | 역방향 alias 허용 | **200** |
| `GET /contents/{GP uuid}?serviceKey=kpa-society` | 차단 | **404** |
| `GET /contents/{GP uuid}?serviceKey=glycopharm` | 허용 | **200** |
| `GET /contents/{uuid}` (serviceKey 생략, 익명) | 차단 | **400** |
| `GET /contents/not-a-uuid?serviceKey=kpa-society` | canonical not-found | **404 `NOT_FOUND`** (500·Postgres 텍스트 노출 없음) |
| `GET /stats` (생략) / `?serviceKey=kpa` | 차단 / 허용 | **400** / **200**, `scope.serviceKeys = ["kpa-society","kpa"]` |
| `GET /slots/home-hero` (생략) / `?serviceKey=kpa-society` | 차단 / 허용 | **400** / **200**, `meta.serviceKeys = ["kpa-society","kpa"]`, `crossService=false` |
| admin-dashboard(platform:super_admin) `GET /cms/contents` (생략) | cross-service 유지 | **200** — 역할 근거로 허용 |

### 실브라우저 smoke (Playwright chromium, 프로덕션)

| 화면 | 결과 |
|---|---|
| PH `/resources` Desktop 1440 | 정상 렌더 · `GET /cms/contents?serviceKey=pharmacy-hub&type=knowledge&status=published` **200** · "총 0개의 자료" (DB 0건과 일치) · console error 0 · pageerror 0 |
| PH `/resources` Mobile 390 | 정상 렌더 · 동일 요청 200 · console error 0 |
| K-Cosmetics `https://k-cosmetics.site/` | 정상 렌더 · `GET /cms/contents?serviceKey=cosmetics&type=notice&status=published` **200** · error 0 |
| admin-dashboard `/admin/cms/contents` · `/admin/cms/slots` | 정상 렌더 · serviceKey 생략 요청 **200** (cross-service 목록 유지, glycopharm row 표시) · error 0 |
| admin-dashboard 편집 진입(상세 hydrate) | `GET /cms/contents/857ac192-…?serviceKey=glycopharm` **200** — §8 대로 상세에 `content.serviceKey` 동행. 에러 토스트·console error 0 |

백화면 0 · JS 예외 0 · 신규 500 0 · 자기 서비스 콘텐츠 유실 0 · cross-service 노출 0.

---

## 11. 정책 미해결 / GAP (WO §27 대조)

```text
CMS read endpoint census 미조사 0            ✅
consumer census 미조사 0                     ✅
visibility 데이터 census 완료                ✅
platform/service/organization 계약 확정      ✅ (§5·§6) — organization 은 데이터 0 이라 발명 안 함
anonymous/member/operator-admin 계약 확정    ✅ (§6)
list/detail scope 동일                       ✅ 구현 (§9-1)
암묵적 serviceKey 생략 cross-service 제거     ✅ 구현 (400 SERVICE_KEY_REQUIRED)
명시적 admin cross-service 계약 유지          ✅ 구현 (platform:super_admin 역할 근거)
invalid UUID 500 회귀 0                      ✅ (선행 WO 유지, 12/12)
신규 API contract 0                          ✅ (기존 query 축만 사용하는 설계)
schema/migration 0                           ✅
production DB write 0                        ✅
```

### 11-1. 남은 구현 (설계는 확정됨) → **2026-08-24 4건 전부 완료** (§9-1)

1. `/cms/contents` 목록 · `/cms/slots/:slotKey` · `/cms/stats` 에 `serviceKey` 경계 강제
2. `/cms/contents/:id` 상세를 opt-in → **강제**로 전환하고 admin-dashboard 가 `content.serviceKey` 를 전달
3. KPA alias 를 `IN ('kpa-society','kpa')` 로 정렬 (§6-1)
4. PLATFORM_ADMIN cross-service 는 `isPlatformAdmin` **역할 근거**로 분기 (파라미터 생략 아님)

**남은 것은 배포 후 검증뿐이다** — production API matrix(WO §22) · browser smoke(WO §23).
CMS read 는 공개 경로를 포함하므로 배포 후 KCos 홈 슬롯 · PH 자료실 · admin-dashboard CMS 목록/편집을
실제로 확인해야 한다.

### 11-2. 후속 부채 (WO §18·§25 — 이번에 건드리지 않음)

| # | 내용 |
|---|---|
| 1 | `kpa-society` 콘텐츠 53건이 `authorizeCmsMutation` 의 alias 미정규화로 platform admin 외 수정 불가 |
| 2 | `visibilityScope='platform'` + `organizationId` non-NULL 32건 — org 를 쓰지 않으면서 기록한 조합 (§3) |
| 3 | GlycoPharm `api/cms.ts getContent` dead code — 이번에 `serviceKey` 기본값만 맞췄고 **소비처는 여전히 0** |
| 4 | `serviceKey='kpa'` 1건 — canonical `kpa-society` 로의 데이터 정합은 **migration 필요** → WO §25 에 따라 별도 보고 |

---

## 12. 중지 사유 (WO §26 아님 — 환경 제약) → **2026-08-24 해소**

정책 판단은 §5 에서 **해소**됐다. 이번에 구현하지 못한 사유는 정책이 아니라 **작업 환경**이다.

```text
디스크 여유:  537MB → (jest 1회) → 96MB → (내 산출물 정리) → 102MB
C: 전체:      223G / 223G 사용 (100%)
```

- `pnpm exec jest` **1회 실행에 약 440MB** 의 임시 공간을 쓴다. 현재 여유로는 **전체 회귀를 돌릴 수 없다.**
- WO §27 은 `Jest/typecheck/build PASS` 를 완료 조건으로 요구한다 → **검증 불가 상태에서 read 경계를 바꾸는 것은
  공개·관리자 계약을 깨뜨릴 위험이 크다**(§2 의 admin-dashboard·KCos·PH 소비처 전부 영향).
- 따라서 **census 와 정책 확정까지만 확정 산출물로 남기고 구현은 분리**한다.
- 내 작업 산출물(`c:/tmp/wo-viewdup`, 3MB)은 정리했다. 남은 사용량은 이번 세션과 무관하다.

**해소 (2026-08-24)**: 여유 공간이 충분한 작업 PC 에서 같은 WO 를 **새 WO 없이 재개**했다.
정책 재조사는 하지 않았다 (`serviceKey = read boundary` 는 §5 에서 이미 확정). jest·typecheck 를
전부 실행할 수 있었으므로 WO §27 의 검증 조건을 충족한다.

---

## 13. DB / schema 영향

**없음.** production read-only 조회만 수행했다. 2차 구현에서도 schema·migration·DB write 는 0 이다
(경계는 전부 기존 컬럼 `serviceKey` 의 query 조건으로만 구현했다).

---

## 14. 작업공간 (WO §3) — 편차 기록

fresh worktree 를 요구했으나 **주 작업트리에서 수행**했다 — 디스크 여유 537MB→102MB 로 worktree + install 이 불가능하다.
코드 변경이 0 이므로 격리 필요성은 낮았다. `git add .` 미사용 · 타 세션 WIP 미접촉 · path-specific stage 유지.

**2차(2026-08-24)** 도 주 작업트리에서 수행했다. 같은 원칙을 유지한다 — `git add .` 미사용,
타 세션의 dirty/미추적 파일(`apps/api-server/src/routes/operator/analytics.routes.ts`,
`docs/checks/WO-O4O-OPERATOR-CROSSSERVICE-...-CHECK.md`) 미접촉, path-specific stage.

---

## 문서 정합

발견 0건 / SUPERSEDED 표기 0건 / 링크 수정 0건 / 별도 WO 제안 2건 (§11-1 구현 · §11-2 부채 4종)

**2026-08-24 재개분**: 발견 0건 / SUPERSEDED 표기 0건 / 링크 수정 0건 / 별도 WO 제안 1건 (§11-2 부채 4종 잔존).
§11-1 은 별도 WO 없이 **같은 WO 로 구현 완료**했다.

**2026-08-24 최종(배포·실측분)**: 발견 0건 / SUPERSEDED 표기 0건 / 링크 수정 0건 / 별도 WO 제안 0건.
