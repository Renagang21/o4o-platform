# CHECK-O4O-COMMUNITY-CONTENT-RESOURCE-BACKEND-CORE-COMMONIZATION-V1

**콘텐츠·자료실 backend Core 공통화 — GP/K-Cosmetics 완료, KPA 미완료**

- 근거 WO: `WO-O4O-COMMUNITY-CONTENT-RESOURCE-BACKEND-CORE-COMMONIZATION-V1`
- 선행 감사: `IR-O4O-COMMUNITY-CONTENT-RESOURCE-BACKEND-CANONICALIZATION-AUDIT-V1` (판정 B)
- 브랜치: `work/commonization-community` · 시작 commit `e20292818`

> ## ⚠️ 완료 범위 고지
>
> **GP ↔ K-Cosmetics 수렴(WO §5)과 공통 Core·안전 규칙(§3·§4)·안전 테스트(§12)는 완료했다.**
> **KPA adoption(WO §6)은 완료하지 못했다.** config 파일까지 준비했으나 `kpa.routes.ts` 배선은
> 적용하지 않았고, 착수한 편집은 되돌렸다. 사유와 남은 작업은 §7 에 적는다.
> 이 문서는 완료 보고가 아니라 **부분 완료 기록**이다.

---

## 1. 시작 구조

| 파일 | LOC | 내용 |
|---|---:|---|
| `routes/glycopharm/controllers/resources.controller.ts` | 557 | 회원 6 handler + 운영자 4 handler |
| `routes/cosmetics/controllers/resources.controller.ts` | 557 | 동일 |
| `routes/kpa/kpa.routes.ts` 인라인 (L1519~L2233) | 약 700 | 회원 10 handler(추천·AI 3종 포함) + 운영자 3 handler |

## 2. GP ↔ K-Cosmetics 동일성 재확인

서비스 토큰 정규화 후 기계 diff:

```text
557줄 / 557줄 · diff 26줄
  주석 3처 + console.error 접두어 10처
  SQL · 권한 · DTO · 검증 차이 0
```

선행 감사 판정 재확인. 두 파일은 로그 문자열 외 100% 동일했다.

## 3. 추출한 Core

`apps/api-server/src/routes/common/content-resource/content-resource-core.ts` (**706줄**)

| export | 대상 handler 그룹 |
|---|---|
| `createContentResourceCore` | G1 list · G2 detail · G5 delete · G6 view · G11 operator list · G13 operator status · G14 operator delete |
| `createMemberWriteHandlers` | G3 create · G4 update (**GP/KCos 전용** — KPA 는 `content_type` 때문에 DATA_MODEL_DIFFERENT) |
| `createOperatorResourceCreateHandler` | G12 operator create (**GP/KCos 전용** — 감사 UNIQUE 판정) |
| `assertSafeTableName` · `defaultListVisibility` · `deriveUsageType` · `sanitizeContentTags` | 공통 유틸 |

Core 는 서비스명을 알지 않는다. 서비스 분기(`if (service === ...)`) 0.

## 4. config / adapter 계약

```ts
interface ContentResourceConfig {
  tableName: string;              // 기본값 없음 — 반드시 주입
  logPrefix: string;
  operatorRoles: string[];
  listColumns: string;            // 서비스별 응답 필드 보존
  operatorListColumns: string;
  listFilters: {param, column}[];        // 회원 목록이 실제로 읽던 것만
  operatorListFilters: {param, column}[]; // 운영자 목록과 다를 수 있어 분리
  resolveListVisibility?: (ctx) => ListVisibilityDecision;  // KPA status=all
  mapListRow?: (row) => any;      // KPA ContentMeta
  audit?: AuditHook;              // KPA writeAuditLog
  auditEntityType?: string;
}
```

### 4-1. tableName fail-fast (WO §4-A·B)

- Core 에 **기본값 없음**. 미주입 시 `createContentResourceCore()` 호출 시점에 throw — 첫 요청까지 미루지 않는다.
- `assertSafeTableName` 이 `^[a-z][a-z0-9_]*$` 만 통과시킨다. `public.x` · `"x"` · `x; DROP ...` · `x--` 전부 거부.
- 테이블명을 `req.query/body/params` 에서 읽는 경로가 **존재하지 않는다**. 테스트로 고정했다(§6).

### 4-2. field / filter mapping

DB 컬럼명을 바꾸지 않고 config 로 흡수했다.

| 서비스 | 회원 목록 필터 | 운영자 목록 필터 | select 특이 |
|---|---|---|---|
| GlycoPharm | `sub_type` · `usage_type` · `source_type` | `source_type` · `usage_type` | — |
| K-Cosmetics | 동일 | 동일 | — |
| KPA (config 준비만) | **`content_type` · `sub_type`** | `source_type` · `usage_type` | `c.content_type` 포함 |

> 회원/운영자 필터를 분리한 이유: 하나로 합치면 KPA 회원 목록에 그동안 무시되던
> `usage_type`/`source_type` 가 갑자기 필터로 붙는다 — **계약 변경**이다.

### 4-3. KPA `status=all` 보존

가시성 절과 `status=<값>` 필터를 **독립 결정**으로 분리했다(`ListVisibilityDecision`).

```text
status=all + 운영자   → visibility='none',            applyExplicitStatus=false
status=all + 일반회원 → visibility='published-or-own', applyExplicitStatus=false
그 외                → 기존 GP/KCos 규칙
```

`status=all` 은 필터 값이 아니라 모드 지시자이므로 `c.status = 'all'` 조건이 생기지 않는다.
Core 는 이 분기를 알지 못하고 `resolveKpaListVisibility` 훅에만 존재한다.

> **초기 구현에서 이 부분을 틀렸다.** 가시성과 status 필터를 하나의 `switch` 로 합쳤는데,
> 원본은 `my=true&status=draft` 에서 `created_by=me AND status='draft'` 를 **둘 다** 건다.
> 합치면 계약이 바뀌므로 독립 결정으로 되돌렸고, 회귀 테스트로 고정했다.

### 4-4. audit hook

optional `AuditHook` 으로 주입한다. GP/KCos 는 미주입 → 호출 0(기존과 동일).
KPA config 는 `writeAuditLog` 를 주입하도록 준비했고, 감사 meta 도 원본과 동일하게 맞췄다
(`RESOURCE_STATUS_CHANGED` → `{ title, from, to }`).

## 5. Core 로 옮긴 handler / 서비스 고유로 남긴 handler

| 그룹 | GP | KCos | KPA |
|---|:--:|:--:|:--:|
| G1 list | **Core** | **Core** | config 준비(미배선) |
| G2 detail | **Core** | **Core** | **서비스 유지** — 아래 §5-1 |
| G3 create | Core factory(GP/KCos 전용) | 동일 | 서비스 유지 (DATA_MODEL_DIFFERENT) |
| G4 update | Core factory(GP/KCos 전용) | 동일 | 서비스 유지 (DATA_MODEL_DIFFERENT) |
| G5 delete | **Core** | **Core** | config 준비(미배선) |
| G6 view | **Core** | **Core** | config 준비(미배선) |
| G7~G10 추천·AI | 없음 | 없음 | 서비스 유지 (UNIQUE) |
| G11 operator list | **Core** | **Core** | config 준비(미배선) |
| G12 operator create | Core factory(GP/KCos 전용) | 동일 | 없음 — KPA 로 확산시키지 않음 |
| G13 operator status | **Core** | **Core** | config 준비(미배선) |
| G14 operator delete | **Core** | **Core** | config 준비(미배선) |

### 5-1. 선행 감사 판정 정정 — G2 detail 은 `IDENTICAL` 이 아니다

감사에서 G2 를 `IDENTICAL` 로 판정했으나, KPA 구현을 라인 단위로 보니 다르다.
(감사 §11 에 "KPA 는 라인 단위 diff 를 하지 않았다"고 적어 둔 불확실성이 실제로 드러난 것이다.)

KPA `GET /contents/:id` 는 GP/KCos 의 단순 `SELECT *` 와 달리 다음을 갖는다.

- 접근 정책: 비로그인 `published` 만 / 로그인 `published`·`ready`·본인 / 운영자 전체
  (`WO-O4O-KPA-CONTENT-ACCESS-AND-COPY-POLICY-FINAL-ALIGNMENT-V1`)
- `kpa_content_recommendations` 조회 → `isRecommendedByMe`
- ContentMeta enrichment

→ **KPA G2 는 `POLICY_DIFFERENT`** 로 정정한다. Core 의 `detail` 을 쓰면 draft/private 접근 정책이
사라지므로 **KPA 는 자기 구현을 유지해야 한다.** 감사 집계도 다음과 같이 정정된다.

```text
(정정 전) IDENTICAL 2 · PARAMETERIZABLE 5 · POLICY_DIFFERENT 0 · DATA_MODEL_DIFFERENT 2 · UNIQUE 5
(정정 후) IDENTICAL 1 · PARAMETERIZABLE 5 · POLICY_DIFFERENT 1 · DATA_MODEL_DIFFERENT 2 · UNIQUE 5
```

## 6. cross-service table isolation

`apps/api-server/src/__tests__/content-resource-core-table-isolation.spec.ts` — **19 tests, 전부 PASS**

fake DataSource 로 Core 가 만든 **실제 SQL 문자열**을 가로채 접근 테이블을 assert 한다(DB 불필요).

| 검증 | 결과 |
|---|:--:|
| GP config → `glycopharm_contents` 만 (7 handler 전부) | PASS |
| KCos config → `cosmetics_contents` 만 | PASS |
| KPA config → `kpa_contents` 만 | PASS |
| 타 서비스 테이블 fallback 0 | PASS |
| tableName 미주입 → 생성 시점 throw | PASS |
| 위험 식별자 7종 거부 | PASS |
| query/body/params 에 테이블명을 심어도 무시 | PASS |
| 가시성 절 ⊥ status 필터 독립 (`my=true&status=draft`) | PASS |
| KPA `status=all` 운영자/일반회원 분기 | PASS |
| `status='all'` 조건이 SQL 에 생기지 않음 | PASS |
| operator 판정이 타 서비스 role 로 통과하지 않음 | PASS |

## 7. KPA adoption 미완료 — 사유와 남은 작업

### 무엇을 했나

- `routes/kpa/controllers/kpa-content-resource.config.ts` (**110줄**) 작성 완료
  — 테이블·컬럼·필터·`status=all` 훅·ContentMeta mapper·audit 주입까지 전부 준비했고,
  §6 테스트가 이 config 를 실제로 사용해 격리·가시성·필터 계약을 검증한다.
- `kpa.routes.ts` 배선은 **적용하지 않았다.** 착수했던 편집(view handler 1건)은 `git checkout` 으로 되돌렸다.

### 왜 멈췄나

`kpa.routes.ts` 는 2,200줄 단일 파일이고, adoption 은 6개 handler 블록을 정확한 앵커로 교체하면서
`contentCore` 인스턴스 생성·import 를 함께 넣어야 한다. 작업 중 남은 컨텍스트로는 **6개 블록 교체를
끝까지 검증할 수 없다고 판단**했고, 절반만 적용된 상태(예: `contentCore` 참조는 있는데 정의가 없는 상태)는
빌드를 깨뜨린다. **깨진 트리를 남기는 것보다 되돌리고 보고하는 편이 낫다고 판단해 되돌렸다.**

WO §17 의 명시된 중지 조건에 해당하지는 않는다 — 기술적 차단이 아니라 **작업 분량 문제**다.

### 남은 작업 (후속에서 그대로 이어받으면 된다)

1. `kpa.routes.ts` 에 import 추가 + `const contentCore = createContentResourceCore(dataSource, createKpaContentResourceConfig({ mapCmsStatus, audit: writeAuditLog }))`
2. 아래 6개를 Core 위임으로 교체
   - `contentRouter.get('/')` → `contentCore.list`
   - `contentRouter.delete('/:id')` → `contentCore.remove`
   - `contentRouter.post('/:id/view')` → `contentCore.incrementView`
   - `opResourcesRouter.get('/')` → `contentCore.operatorList`
   - `opResourcesRouter.patch('/:id/status')` → `contentCore.operatorUpdateStatus`
   - `opResourcesRouter.delete('/:id')` → `contentCore.operatorRemove`
3. **유지**: detail(§5-1) · create · update · recommend · AI 3종
4. 회귀: `status=all` 운영자 목록 · audit 기록 · 추천/AI · KPA 고유 필터

## 8. 변경 전/후 LOC

| 파일 | 전 | 후 | 증감 |
|---|---:|---:|---:|
| GP `resources.controller.ts` | 557 | **101** | −456 |
| KCos `resources.controller.ts` | 557 | **101** | −456 |
| KPA 인라인 | 약 700 | 약 700 | 0 (미착수) |
| 공통 Core (신규) | — | 706 | +706 |
| KPA config (신규, 미배선) | — | 110 | +110 |
| 안전 테스트 (신규) | — | 264 | +264 |

```text
GP/KCos 중복 본체   1,114 → 202      (−912, −81.9%)
구현체 수(GP/KCos)  2벌   → 1벌
실제 회수(순 코드)  1,114 → 908 (Core 706 + wrapper 202)  = −206
KPA 포함 시 예상    미착수 — 감사 추정 1,100~1,250 중 약 900 미회수
```

> 순 LOC 감소가 −206 에 그치는 이유는 Core 가 KPA 까지 받도록 config 표면(가시성 훅·필터 분리·
> row mapper·audit)을 갖췄기 때문이다. **KPA adoption 이 끝나야 설계 의도대로 회수가 실현된다.**

## 9. API 계약 변화 / migration

| 항목 | 결과 |
|---|---|
| route · method · params | **변화 0** |
| response DTO · status code · error code | **변화 0** (Core 가 동일 문자열·구조를 그대로 사용) |
| pagination shape | **변화 0** (`{items,total,page,limit,totalPages}`) |
| authorization semantics | **변화 0** (owner-or-operator → 403, 동일 role 목록) |
| frontend 수정 | **0** |
| **migration** | **0** |

## 10. 검증

| 항목 | 결과 |
|---|---|
| `content-resource-core-table-isolation.spec.ts` | **19/19 PASS** |
| 변경/신규 파일 typecheck (`tsc` 파일 한정) | **오류 0** |
| api-server 전체 `tsc --noEmit` | **미실측** |
| api-server 전체 jest | **미실측** |
| GP/KCos/KPA frontend typecheck | **미실측** |
| 런타임/DB 실측 | **미실측** |

### 10-1. 미실측 사유

작업 머신 물리 8GB / C: 디스크 여유 400MB 수준. 이전 WO 들에서 확인된 것과 동일하게
전체 `tsc --noEmit` 은 V8 `Fatal process out of memory: Zone` 으로 완주하지 못한다.
대신 **변경/신규 4파일만 대상으로 하는 tsconfig** 로 컴파일해 귀속 오류 0 을 확인했다.
프런트는 API 계약 무변경이라 수정하지 않았고 typecheck 도 돌리지 않았다. **PASS 로 적지 않았다.**

## 11. 잔존 위험

1. **KPA adoption 미완료** — 이번 WO 의 절반. §7 의 남은 작업이 그대로 남아 있다.
2. **감사 판정 정정(§5-1)** — G2 detail 이 `POLICY_DIFFERENT` 다. 후속에서 KPA detail 을
   Core 로 옮기면 **draft/private 콘텐츠가 ID 만 알면 조회되는 회귀**가 발생한다. 절대 옮기지 말 것.
3. **Core 의 config 표면이 넓다** — `listColumns` 를 문자열로 받으므로 오타가 런타임 SQL 오류가 된다.
   현재는 3서비스 config 가 테스트로 고정돼 있어 방어되지만, 새 서비스 추가 시 주의.
4. **GP/KCos 런타임 미검증** — 정적 검증만 했다. 배포 전 목록/상세/작성/수정/삭제/운영자 목록의
   실제 응답 비교가 필요하다.
5. **`operatorListFilters` 신설** — GP/KCos 운영자 목록은 기존과 동일하게 `source_type`·`usage_type`
   만 읽도록 맞췄으나, 원본과 1:1 대조는 코드 리뷰 수준이며 런타임 실측은 하지 않았다.
