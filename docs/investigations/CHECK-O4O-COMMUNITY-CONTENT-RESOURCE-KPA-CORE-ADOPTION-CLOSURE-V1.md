# CHECK-O4O-COMMUNITY-CONTENT-RESOURCE-KPA-CORE-ADOPTION-CLOSURE-V1

**KPA 콘텐츠·자료실 Core adoption 마감 — 선행 WO 부분 완료분 종료**

- 근거 WO: `WO-O4O-COMMUNITY-CONTENT-RESOURCE-KPA-CORE-ADOPTION-CLOSURE-V1`
- 선행 WO: `WO-O4O-COMMUNITY-CONTENT-RESOURCE-BACKEND-CORE-COMMONIZATION-V1` (부분 완료)
- 선행 CHECK: `CHECK-O4O-COMMUNITY-CONTENT-RESOURCE-BACKEND-CORE-COMMONIZATION-V1` §7 을 실행 기준으로 사용
- 브랜치: `work/commonization-community` · 시작 commit `0a7d337b3`

---

## 1. 선행 WO 부분 완료 상태 (시작 시점)

| 항목 | 상태 |
|---|---|
| 공통 Core (`content-resource-core.ts` 706줄) | 완료 |
| GP / K-Cosmetics adoption (557→101 × 2) | 완료 |
| table isolation 스펙 19 tests | 완료 |
| KPA config (`kpa-content-resource.config.ts` 110줄) | 작성 완료 · **미배선** |
| **KPA 6 handler adoption** | **미완료** |

선행 CHECK §7 이 남긴 작업 목록을 그대로 실행 기준으로 삼았다.

## 2. KPA 6 handler 목록과 실제 adoption 결과

각 handler 를 배선 전에 SQL semantics · visibility · status · 권한 · pagination/filter ·
response DTO · audit · KPA 전용 field mapping 기준으로 재확인했다.

| # | handler | 재확인 결과 | adoption |
|---|---|---|:--:|
| G1 | `GET /contents` | 가시성 규칙 동일, KPA 는 `content_type` 필터 + ContentMeta enrichment + `status=all` → config 3종으로 재현 가능 | **Core** |
| G5 | `DELETE /contents/:id` | owner-or-operator 403 · soft delete · `CONTENT_DELETED` audit — Core 와 동일 | **Core** |
| G6 | `POST /contents/:id/view` | `view_count + 1` 단일 UPDATE — 완전 동일 | **Core** |
| G11 | `GET /operator/resources` | `sub_type='resource'` + source_type/status/usage_type 필터 + search — 동일. **select 컬럼만 GP/KCos 와 달라** config 정정(§6) | **Core** |
| G13 | `PATCH /operator/resources/:id/status` | status 검증 · 404 · `RESOURCE_STATUS_CHANGED` + `{title, from, to}` audit — Core 와 동일 | **Core** |
| G14 | `DELETE /operator/resources/:id` | soft delete · `RESOURCE_DELETED` audit — 동일 | **Core** |

**6/6 전부 adoption 완료.** 추가 `POLICY_DIFFERENT` 발견 없음 → WO §10 중지 조건 미발동.

Core 에 새 기능을 추가하지 않았다. 기존 Core 706줄을 그대로 소비했고,
변경한 것은 KPA config 의 `operatorListColumns` 1건(§6)뿐이다.

## 3. Core 로 옮기지 않은 KPA detail — 근거

`GET /contents/:id` 는 **`POLICY_DIFFERENT`** 라 KPA 라우터에 그대로 남겼다 (WO §2 절대 조건).

Core 의 `detail` 은 `SELECT * WHERE id AND is_deleted=false` 뿐이라 옮기면 다음이 사라진다.

```text
비로그인   : published 만
로그인     : published · ready · 본인(draft/private 포함)
운영자/관리자: 전체
+ kpa_content_recommendations 조회 → isRecommendedByMe
+ ContentMeta enrichment
```

→ **draft/private 콘텐츠가 ID 만 알면 조회되는 회귀**가 된다
(`WO-O4O-KPA-CONTENT-ACCESS-AND-COPY-POLICY-FINAL-ALIGNMENT-V1` 이 닫은 결함의 재발).

테스트로 고정했다: `kpaContentCore.detail` 참조 0 · `viewableStatuses` 분기 존재 ·
`kpa_content_recommendations` 조회 존재.

선행 CHECK §5-1 의 판정 정정(감사 `IDENTICAL` → `POLICY_DIFFERENT`)을 그대로 유지한다.

## 4. 함께 보존한 KPA 고유 handler

| handler | 판정 | 상태 |
|---|:--:|---|
| `GET /contents/:id` | POLICY_DIFFERENT | KPA 유지 |
| `POST /contents` · `PATCH /contents/:id` | DATA_MODEL_DIFFERENT (`content_type` NOT NULL) | KPA 유지 |
| `POST /contents/:id/recommend` | UNIQUE | KPA 유지 |
| `POST /contents/:id/ai/{summarize,extract,tag}` | UNIQUE | KPA 유지 |
| `POST /operator/resources` (G12) | GP/KCos 전용 | **KPA 로 확산시키지 않음** (테스트 고정) |

## 5. `status=all` 보존

```text
status=all + 운영자   → status 조건 없음 (전체 관리 목록)
status=all + 일반회원 → 공개 + 본인 조건 유지
그 외 status 지정     → 해당 status 필터
```

실제 생성 SQL 로 검증했다.

- 운영자: `SELECT c.id ...` 에 `c.status =` 없음, `'all'` 문자열 없음 → **`c.status='all'` 미생성**
- 일반회원: `c.status = 'published' OR c.created_by =` 유지
- 일반 필터(`status=draft`): `c.status =` 정상 생성

Core 는 이 분기를 알지 못한다 — `resolveKpaListVisibility` 훅에만 존재한다.

## 6. audit hook

기존 optional hook 계약을 그대로 썼다. `createKpaContentResourceConfig({ mapCmsStatus, audit: writeAuditLog })`.

| 경로 | action | entityType | meta |
|---|---|---|---|
| 콘텐츠 삭제 | `CONTENT_DELETED` | `kpa_content` | `{ title }` |
| 운영자 상태 변경 | `RESOURCE_STATUS_CHANGED` | `kpa_content` | `{ title, from, to }` |
| 운영자 삭제 | `RESOURCE_DELETED` | `kpa_content` | `{ title }` |

GP/KCos 는 audit 미주입 → 호출 0(기존과 동일).

### 6-1. 배선 중 정정한 계약 1건

KPA 운영자 목록의 select 컬럼이 GP/KCos 와 다르다는 것을 배선 직전 재확인에서 발견했다.

```text
원본 KPA : ... c.view_count, c.like_count, c.created_at, c.updated_at   (reusable_policy 없음)
초기 config: ... c.like_count, c.view_count, c.reusable_policy, ...      (GP/KCos 기준)
```

그대로 뒀다면 **운영자 목록 응답에 `reusable_policy` 가 새로 붙는 DTO 변경**이 됐다.
`KPA_OPERATOR_RESOURCE_COLUMNS` 를 원본과 필드·순서까지 1:1 로 맞췄고 테스트로 고정했다.

## 7. table isolation

| 검증 | 결과 |
|---|:--:|
| KPA Core handler 6종이 `kpa_contents` 만 접근 | PASS |
| `glycopharm_contents` / `cosmetics_contents` 접근 0 | PASS |
| tableName 명시 주입 (기본값 없음) | PASS |
| 위험 식별자 reject | PASS |
| 사용자 입력으로 table 선택 불가 | PASS |

기존 Core 의 안전 계약은 **변경하지 않았다**.

## 8. repository/entity 전환 없음

`KpaContent` 엔티티의 6컬럼 drift 때문에 raw SQL 계약을 유지했다 (WO §5).

- `kpa.routes.ts` 에 `getRepository(KpaContent)` 0
- Core 에 `getRepository` 0
- 테스트로 고정

## 9. 변경 전/후 LOC

| 파일 | 전 | 후 | 증감 |
|---|---:|---:|---:|
| `kpa.routes.ts` | 2,594 | 2,353 | **−241** |
| `kpa-content-resource.config.ts` | 110 | 115 | +5 (컬럼 정정 + 주석) |
| adoption 회귀 스펙 (신규) | — | 268 | +268 |

KPA 콘텐츠/자료실 인라인 handler 본체 **약 290줄 → 약 40줄**(배선).

### 9-1. 축 전체 누적 (선행 WO 포함)

```text
GP  resources.controller.ts    557 → 101
KCos resources.controller.ts   557 → 101
KPA  인라인 handler            약 290 → 약 40   (detail/create/update/추천/AI 는 별도 유지)
────────────────────────────────────────────
서비스 구현 합계               약 1,404 → 약 242
공통 Core                      706 (1벌)
구현체 수                      3벌 → 1벌
```

## 10. GP/KCos 회귀

이번 WO 에서 **GP/KCos 코드는 건드리지 않았다** (`git diff` 대상 파일 2개 = `kpa.routes.ts`, KPA config).
기존 Core 스펙 19 tests 가 GP/KCos config 로 계속 통과함을 재실행으로 확인했다.

## 11. Core 소비 서비스 수

```text
content-resource-core 소비: 3 서비스 (GlycoPharm · K-Cosmetics · KPA-Society)
미배선 KPA config: 0
half-wired reference: 0  (kpaContentCore 참조 7 = 선언 1 + 사용 6)
```

## 12. 검증 결과

| 항목 | 결과 |
|---|---|
| `content-resource-core-table-isolation.spec.ts` (기존) | **19/19 PASS** |
| `kpa-content-resource-core-adoption.spec.ts` (신규) | **29/29 PASS** |
| 합계 | **2 suites / 48 tests PASS** |
| 변경 3파일 typecheck (의존성 해석 포함) | **오류 0** |
| api-server 전체 typecheck | **미실측** |
| api-server 전체 jest | **미실측** |
| frontend typecheck | **미실측** (API 계약 무변경 — 수정 0) |
| 런타임 / DB 실측 | **미실측** |

### 12-1. 신규 스펙이 고정한 것 (29 tests)

배선 6종 · Core 인스턴스 생성 · half-wired 0 · 옮긴 handler 의 인라인 SQL 잔존 0 ·
detail/create/update/추천/AI 보존 · G12 미확산 · repository 전환 0 ·
`status=all` 3분기 · `resolveKpaListVisibility` 계약 · audit 3경로 ·
KPA 필드 매핑 4종 · ContentMeta enrichment · KPA table isolation.

### 12-2. 미실측 사유 (개별 분리)

| 미실측 | 원인 |
|---|---|
| 전체 typecheck / 전체 jest | **디스크** — C: 여유 526MB 로 워크트리 생성 불가 → D: 에 워크트리를 만들었으나 pnpm store 가 C: 에 있어 드라이브 간 하드링크 불가(설치 불가). 변경 3파일은 C: 도구 + `paths` 매핑으로 실제 타입 해석까지 거쳐 검사했고, 스펙 2종도 C: 도구로 실행했다 |
| 런타임 / DB | 위와 동일 + 프로덕션 DB 접근 채널 부재 (이전 WO 들과 동일) |

**PASS 로 간주하지 않았다.**

## 13. 잔존 위험

1. **KPA detail 을 이후에 Core 로 옮기면 안 된다** — draft/private 접근 회귀. 테스트로 막아 뒀으나
   테스트를 함께 지우면 방어가 사라진다.
2. **전체 빌드 미검증 누적** — 이 브랜치에 포럼 소유자 영역·GP/KCos Core·KPA adoption 이 쌓였는데
   전체 typecheck/jest 를 한 번도 완주하지 못했다. **main 통합 전 CI 또는 여유 환경에서 1회 전체 검증 필요.**
3. **런타임 미검증** — 정적/단위 검증만 했다. 배포 전 KPA 목록(`status=all` 포함)·자료실·운영자 목록·
   삭제·조회수의 실제 응답 비교 권장.
4. `listColumns` 를 문자열로 받는 Core 설계상 오타가 런타임 SQL 오류가 된다. 3서비스 config 는
   테스트로 고정돼 있으나 새 서비스 추가 시 주의.

## 14. 선행 WO 최종 완료 판정

`WO-O4O-COMMUNITY-CONTENT-RESOURCE-BACKEND-CORE-COMMONIZATION-V1` 의 미완료 항목
(KPA 6 handler adoption)이 전부 해소됐다.

| 선행 WO 완료 기준 (§10) | 상태 |
|---|:--:|
| GP/KCos 동일 handler 본체 중복 → 0 에 가깝게 | 달성 (557×2 → 101×2) |
| KPA `IDENTICAL/PARAMETERIZABLE` handler → Core 채택 | **달성 (6/6)** |
| `POLICY_DIFFERENT / DATA_MODEL_DIFFERENT / UNIQUE` → 근거 있는 service extension | 달성 (§3·§4) |
| 미배선 KPA config 0 · half-wired 0 | 달성 |

→ **선행 WO 를 `부분 완료` 에서 `완료` 로 닫는다.**

단, 위 §13-2 (전체 빌드 미검증)는 이 축이 아니라 **브랜치 전체의 미해결 사항**으로 남는다.
