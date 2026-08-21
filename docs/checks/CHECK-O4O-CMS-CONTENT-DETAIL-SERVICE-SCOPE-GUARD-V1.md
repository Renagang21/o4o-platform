# CHECK-O4O-CMS-CONTENT-DETAIL-SERVICE-SCOPE-GUARD-V1

**대상 WO**: WO-O4O-CMS-CONTENT-DETAIL-SERVICE-SCOPE-GUARD-V1
**기준 commit**: `5e3b3f205` (origin/main)
**작성일**: 2026-08-21

---

## 0. 요약

```text
cross-service read 재현:   성립 (익명으로 4개 서비스 content 전부 200)
detail 계약 판정:          D. MIXED — 하나의 URL 이 공개/회원/관리자 3계약 겸용
수정:                     2건 (조회 자체를 서비스로 제한하는 경로 + invalid UUID 500 누출)
남긴 것:                  "serviceKey 를 필수로 만들 것인가" = 정책 결정 (§9)
DB/schema/migration:      변경 0 · production write 0
```

**중요(과대평가 금지)**: 이번 수정으로 **PharmacyHub 회원 자료 경로의 경계는 닫혔지만**,
`serviceKey` 를 **생략한 요청은 종전대로 cross-service 조회가 된다**. 즉 WO §25 의
"타 서비스 UUID 직접 조회 → 노출 0" 은 **아직 충족되지 않았다**. 사유는 §8·§9.

---

## 1. 수정 전 cross-service 재현 (WO §3)

`GET /api/v1/cms/contents/:id` · **익명(서비스 컨텍스트 전무)** · 프로덕션 실측.

| 케이스 | content serviceKey | HTTP | 응답 serviceKey | organizationId | visibility |
|---|---|:---:|---|---|---|
| A/B | `glycopharm` | **200** | glycopharm | null | platform |
| A/B | `kpa` | **200** | kpa | null | platform |
| A/B | `kpa-society` | **200** | kpa-society | null | platform |
| A/B | `neture` | **200** | neture | null | platform |
| C | 존재하지 않는 valid UUID | 404 | — | — | `NOT_FOUND` |
| D | invalid UUID (`not-a-uuid`) | **500** | — | — | `INTERNAL_ERROR` + **Postgres 원문 노출** |

> 본문은 기록하지 않았다(WO §3). **service context 전달 방식: 없음** — URL(`/api/v1/cms`)·query·header 어디에도 없다.

---

## 2. CMS endpoint 전수 census (WO §4) — 미조사 0

mount: `app.use('/api/v1/cms', ...)` (`register-routes.ts:988`), 3 handler 분리.

| # | method/path | handler | auth | serviceKey 출처 | service 강제 |
|---|---|---|---|---|:---:|
| 1 | `GET /stats` | query | optionalAuth | query(선택) | ❌ 필터 |
| 2 | `GET /contents` | query | optionalAuth | **query(선택)** | ❌ **필터** |
| 3 | **`GET /contents/:id`** | query | optionalAuth | **없었음 → 이번에 query(선택) 인정** | ⚠️ **opt-in** |
| 4 | `POST /contents` | mutation | requireAuth | body | ✅ `authorizeCmsMutation` |
| 5 | `PUT /contents/:id` | mutation | requireAuth | content 행 | ✅ `authorizeCmsMutation` |
| 6 | `PATCH /contents/:id/status` | mutation | requireAuth | content 행 | ✅ `authorizeCmsMutation` |
| 7 | `GET /slots/:slotKey` | slot | optionalAuth | query(선택) | ❌ 필터 |
| 8~12 | `GET/POST/PUT/DELETE /slots*` | slot | requireAuth + `requireSlotAccess` | slot scope | ✅ |
| 13 | `GET /health` | routes | 없음 | — | — |

`DELETE /contents/:id` 는 **존재하지 않는다** (archive 는 #6 status 전환).

---

## 3. Detail consumer census (WO §5) — 미조사 0

| 서비스 | 상세 소비 | 화면 | 역할 | serviceKey 인지 | 요청 전달(수정 전 → 후) |
|---|:---:|---|---|:---:|---|
| **PharmacyHub** | ✅ | `/resources` (`PharmacyHubResourcesPage` `fetchDetail`) | 회원 | ✅ | ❌ → **✅ (이번 수정)** |
| **admin-dashboard** | ✅ | `CMSContentList.tsx:132` | platform admin | — | ❌ (유지 — cross-service 가 설계 의도) |
| GlycoPharm | ⚠️ dead | `api/cms.ts:118 getContent` | — | — | 소비처 **0** |
| KPA / Neture | ❌ | — | — | — | `/cms/` 호출 자체 0 |
| K-Cosmetics | ❌(상세) | `/cms/slots/:slotKey`, `/cms/contents`(목록)만 | — | — | — |
| shared UI/packages | ❌ | — | — | — | — |

> GP·KCos 는 콘텐츠 상세를 **서비스 prefix 경로**(`/glycopharm/contents/:id`, `/cosmetics/contents/:id`)로 별도 소비한다.

---

## 4. `cms_contents` scope 모델 (WO §6)

`packages/cms-core/src/entities/CmsContent.entity.ts`

| 필드 | 의미 |
|---|---|
| `serviceKey` varchar **nullable** | **null = global** (엔티티 주석 명시) |
| `organizationId` uuid **nullable** | **null = platform-wide** |
| `status` | `draft` / `pending` / `published` / `archived` |
| `visibilityScope` | **`platform` / `service` / `organization`** |
| `authorRole` | `admin` / `service_admin` / `supplier` / `community` |

### 4-1. 프로덕션 실분포 (read-only)

| serviceKey | published | draft | archived | organizationId 보유 |
|---|---:|---:|---:|---:|
| glycopharm | 2 | 63 | 1 | 0 |
| **kpa** | **1** | 0 | 0 | 0 |
| **kpa-society** | **53** | 0 | 0 | **32** |
| neture | 3 | 2 | 1 | 0 |
| **pharmacy-hub** | **0** | 0 | 0 | 0 |

```text
serviceKey IS NULL (global) 행: 0건        ← 모델엔 있으나 운영엔 없음
published 행의 visibilityScope: 전부 'platform'
```

---

## 5. 목록 canonical 계약 (WO §7) — **WO 전제가 성립하지 않음**

WO 는 "목록 → serviceKey scope 적용" 을 전제했으나 실제는 다르다.

```ts
// GET /contents
const { serviceKey, ... } = req.query;
if (serviceKey) { where.serviceKey = serviceKey as string; }   // 있으면 필터, 없으면 전체
```

- `serviceKey` 는 **클라이언트가 주는 선택적 필터**이지 서버 강제 경계가 아니다.
- 빼고 호출하면 **모든 서비스 콘텐츠가 반환된다.**
- PH 목록이 `pharmacy-hub` 만 반환하는 것은 **클라이언트가 붙이기 때문**이다.
- → **재사용할 canonical service-scope 계약이 이 모듈에 없다.** 상세만 고쳐서는 §17 정합이 완성되지 않는다.

---

## 6. Mutation 계약 (WO §8)

`authorizeCmsMutation(user, serviceKey)`:

```text
platform:super_admin  → 모든 serviceKey 허용
그 외                  → `${serviceKey}:admin` | `${serviceKey}:operator` 필요
serviceKey 출처: create=body / update·patch=content 행
```

**request 단위 service context 를 만들지 않는다** — 콘텐츠 행에서 파생할 뿐이라 read 에 재사용할 것이 없다.

### 6-1. 부수 발견 — `kpa` / `kpa-society` alias 로 mutation 이 사실상 막혀 있다

role 이름을 `content.serviceKey` 문자열로 **그대로** 조립한다.

| content.serviceKey | 요구 role | 프로덕션 보유자 |
|---|---|---:|
| `kpa` | `kpa:admin` / `kpa:operator` | 1 / 2 ✅ |
| `kpa-society` | `kpa-society:admin` / `kpa-society:operator` | **0 / 0** ❌ |

→ `kpa-society` 콘텐츠 **53건**은 platform admin 외 **아무도 수정할 수 없다.** (범위 밖 — §10)

---

## 7. Detail 최종 판정 (WO §10)

> **D. MIXED — visibility 별 계약 분리 필요**

| 축 | 사실 |
|---|---|
| 공개 | `optionalAuth` + 익명에게 published 제공. `WO-O4O-CMS-PUBLIC-VISIBILITY-HARDENING-V1` 이 **의도적으로 공개 경로를 설계·강화** |
| 회원 | PharmacyHub `/resources` 상세가 **회원 자료**로 동일 endpoint 소비 |
| 관리자 | admin-dashboard 는 **cross-service 조회가 설계 의도** |

하나의 URL 이 3계약을 겸한다. 일괄로 서비스 경계를 강제하면 공개·관리자 계약이 깨진다.

---

## 8. 이번에 수정한 것 (WO §13)

### 8-1. 조회 자체를 서비스로 제한하는 경로 신설 (opt-in)

`cms-content-query.handler.ts` — **목록과 동일한 기존 `serviceKey` query 계약을 상세에서도 인정**한다.
신규 파라미터·헤더·경로를 만들지 않았다 (WO §18 금지 항목 회피).

```ts
const detailWhere: Record<string, unknown> = { id };
if (serviceKey) { detailWhere.serviceKey = serviceKey as string; }
const content = await contentRepo.findOne({ where: detailWhere });
```

- **DB 조회 자체가** 제한된다 — "조회 후 controller/frontend 에서 숨김" 이 아니다(WO §13 금지).
- `serviceKey` 미지정 시 **기존 동작 그대로** → 공개·admin 계약 무변경(하위호환).

`pharmacyHubResources.ts` — PH 상세 호출이 목록과 동일하게 `serviceKey` 를 보낸다.
기존 클라이언트측 방어 검사(`PH_RESOURCE_SERVICE_MISMATCH`)는 방어층으로 **남겼다**.

### 8-2. invalid UUID → 500 + DB 원문 노출 제거

형식 검증 후 **기존 canonical 404**(`NOT_FOUND`, 존재하지 않는 UUID 와 동일 응답)로 정규화했다.
새 응답 형식을 만들지 않았다(WO §14). 기존 컨트롤러들과 같은 `UUID_REGEX` 관례를 썼다.

```text
before: 500 {"code":"INTERNAL_ERROR","message":"invalid input syntax for type uuid: \"not-a-uuid\""}
after : 404 {"code":"NOT_FOUND","message":"Content not found"}   (DB 까지 가지 않음)
```

---

## 9. 남긴 결정 — `serviceKey` 를 **필수**로 만들 것인가 (WO §23)

이번 수정은 경계를 **사용 가능하게** 만들었을 뿐, **강제**하지는 않았다. 강제하려면 정책 결정이 선행되어야 한다.

| WO §23 중지 조건 | 해당 근거 |
|---|---|
| service-neutral detail 이 **public contract 로 사용 중** | `optionalAuth` 익명 published 제공 + 전용 hardening WO 이력 + admin-dashboard cross-service 소비 |
| **organization visibility 정책 불명확** | `visibilityScope(platform/service/organization)` 가 목록에서 단순 필터로만 쓰이고 published 59건이 전부 `platform`. `platform` 이 cross-service read 허용을 뜻하는지 정의 없음. `organizationId` 보유 32건의 read 범위도 미정의 |
| 해결에 **신규 contract 필요** | 익명 요청에는 service context 가 원천적으로 없다. 필수화하면 공개 경로가 깨지므로 "공개 상세" 를 별도 계약으로 분리해야 한다 |

### 선택지

| 옵션 | 내용 | 영향 |
|---|---|---|
| **A** | `/cms/contents/:id` 를 **공개 published 전용**으로 명문화 + 회원 자료는 서비스 prefix 경로로 이관(GP·KCos 방식) | 공개·admin 무변경. PH 1곳 이관. 신규 서비스 경로 필요 |
| **B (이번 적용분)** | `serviceKey` opt-in 유지 — 아는 소비처가 붙여 쓰고, 공개/admin 은 종전대로 | 하위호환 100%. **경계가 클라이언트 선택**이라 보안 경계로는 약함 |
| **C** | 인증 사용자에 한해 membership 과 `content.serviceKey` 교차검증, 익명은 공개 동작 유지 | 공개 보존 + 회원 경계 확보. admin 예외 필요. **visibility 정책 정의 선행** |

`visibilityScope='platform'` 의 의미 확정이 A/C 선택의 선행 조건이다.

---

## 10. 부수 발견 (이번에 고치지 않음)

| # | 내용 | 성격 |
|---|---|---|
| 1 | `kpa-society` 콘텐츠 53건이 platform admin 외 수정 불가 (alias 미정규화, §6-1) | 결함 |
| 2 | GlycoPharm `api/cms.ts getContent` **dead code** (소비처 0) | 정리 |
| 3 | 목록 API 도 `serviceKey` 없이 호출하면 전 서비스 반환 (§5) | 정책 |

---

## 11. 횡전개 census (WO §21)

`collection 은 필터 / detail 은 UUID-only` 패턴 탐색 결과.

| 대상 | 결과 |
|---|---|
| `GET /cms/contents/:id` | ❌ 해당 → **이번 수정** |
| `PUT/PATCH /cms/contents/:id` | UUID 조회 후 **즉시 `authorizeCmsMutation(content.serviceKey)`** → read 노출 없음 |
| `GET /cms/slots/:slotKey` | serviceKey 선택 필터(목록과 동일 성질) |
| `PUT/DELETE /cms/slots/:id` | `requireSlotAccess` 가드 존재 |
| `content-assets` 라우트 | detail `:id` endpoint **없음** |
| attachment/download 전용 endpoint | CMS 모듈 내 **없음** (`attachments` 는 content row 의 jsonb) |

→ 같은 패턴의 **추가 read 노출 지점은 CMS 모듈 내에 없다.**

---

## 12. 자동 테스트 (WO §16·§17)

신규 `apps/api-server/src/__tests__/cms-content-detail-service-scope.spec.ts` — **12 케이스, supertest 로 실제 라우터 구동**.

```text
§17 list/detail 정합
  PH context + KPA UUID        → 404
  PH context + GP UUID         → 404
  KPA context + PH UUID        → 404 (반대 방향)
  차단이 응답 가공이 아니라 DB where 조건임을 검증 (lastWhere 대조)
자기 서비스 상세
  PH context + PH content      → 200
  KPA context + KPA content    → 200
하위호환
  serviceKey 미지정            → 종전대로 200, where = { id }
not-found / 형식
  존재하지 않는 valid UUID     → 404
  invalid UUID                 → 404 + 'invalid input syntax' 미포함
  invalid UUID 는 DB 미도달
visibility hardening 회귀
  비인증 + draft               → 404
  인증 + draft                 → 200
```

---

## 13. 검증 (WO §24)

| 항목 | 결과 |
|---|:---:|
| 신규 CMS detail scope 테스트 | **12/12 PASS** |
| CMS 인접 회귀 (PH adoption · KPA boundary · community commonization) | **4 suites / 73 tests PASS** |
| `apps/api-server` `tsc --noEmit` | **PASS** (exit 0) |
| `pharmacy-hub-web` `type-check` (`tsc -b`) | **PASS** (exit 0) |
| **전체 api-server Jest** | **179/180 suites · 2894/2896 tests PASS** — 실패 1건은 **무관**(§13-1) |
| production cross-service API smoke | **수정 전 재현만 수행**(§1). 수정본 미배포 → §13-2 |
| browser 회귀 | 미수행 → §13-2 |

### 13-1. 무관한 기존 실패 1건 (숨기지 않고 기록)

```text
FAIL src/__tests__/pharmacy-hub-community-capability-adoption.spec.ts (2 tests)
  §14 navigation — '/forum/request' · '/forum/my-dashboard' 가 공개 navigation 에 노출된다
```

- 대상 파일 `services/web-pharmacy-hub/src/config/navigation.ts` 는 **내가 건드리지 않았다**
  (`git diff HEAD -- <path>` 무출력).
- **`HEAD` 버전에도 해당 href 가 0건**이라 clean HEAD 에서도 실패한다 = **선행 실패**.
- CLAUDE.md 중지 조건("현재 변경과 무관한 test 실패")에 따라 **고치지 않고 보고**한다.

### 13-2. 미수행 항목 (정직 기록)

- **production read-only smoke (WO §19)** · **browser 회귀 (WO §20)**: 수정본이 **아직 배포되지 않았다.**
  지금 프로덕션을 때리면 구버전 동작만 보이므로 **배포 후 후속**으로 남긴다.
  배포 후 확인할 것: `?serviceKey=pharmacy-hub` + 타 서비스 UUID → 404 / PH `/resources` 목록·상세·딥링크 회귀 0.

---

## 14. 완료 기준 대조 (WO §25)

```text
CMS endpoint census 미조사 0        ✅ (13 endpoint)
detail consumer census 미조사 0     ✅ (7 소비 축)
detail canonical scope 확정         ✅ D.MIXED 로 판정 (최종 강제 여부는 §9 결정 대기)
타 서비스 UUID 직접 조회 → 노출 0    ⚠️ **부분** — serviceKey 를 붙인 요청에서는 0.
                                       생략한 요청은 종전대로 노출 (§9 결정 필요)
자기 서비스 detail → 기존 정상       ✅ (테스트 + 하위호환)
list/detail service scope 정합       ⚠️ 부분 — 목록도 opt-in 필터라 동일 조건에서만 정합 (§5)
organization visibility 회귀 0       ✅ (visibilityScope 로직 무변경)
mutation 권한 회귀 0                 ✅ (mutation handler 무변경)
public contract 회귀 0               ✅ (serviceKey 미지정 시 동작 동일 · 테스트 고정)
신규 API contract 0                  ✅ (기존 query 파라미터 재사용)
schema/migration 0                   ✅
production DB write 0                ✅
Jest/typecheck/build PASS            ✅ (무관 실패 1건 §13-1)
production smoke PASS                ⏸ 배포 후 (§13-2)
```

---

## 15. DB / schema 영향

**없음.** 프로덕션은 read-only 조회만 했다. 스키마·마이그레이션 변경 0.

---

## 16. 작업공간 (WO §2) — 편차 기록

WO 는 fresh worktree 를 요구했으나 **주 작업트리에서 수행**했다.

- 사유: 디스크 여유 **2.6GB / 99% 사용**. 신규 worktree + pnpm install 을 안전히 수용할 수 없다.
- 완화: 시작 시 주 작업트리가 **clean 이며 `origin/main`(5e3b3f205)과 정확히 일치**했다.
- 이후 다른 세션이 같은 트리에서 파일을 수정·stage 했으므로 **path-specific stage/commit** 으로 내 3개 파일만 커밋했다.
  `git add .` 미사용, 타 세션 파일 미접촉.

> 전체 Jest 를 워커 병렬로 돌리던 중 Node 가 크래시(Windows `0xC0000409`)해 CLI 프로세스가 종료된 적이 있다.
> `--runInBand` + `--max-old-space-size=3072` 로 재실행해 완주시켰다. 코드와 무관한 실행 환경 이슈다.

---

## 문서 정합

발견 0건 / SUPERSEDED 표기 0건 / 링크 수정 0건 / 별도 WO 제안 4건 (§9 정책 결정 · §10 부수 3건)
