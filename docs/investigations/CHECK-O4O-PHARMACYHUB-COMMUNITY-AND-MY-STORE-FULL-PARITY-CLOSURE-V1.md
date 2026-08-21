# CHECK-O4O-PHARMACYHUB-COMMUNITY-AND-MY-STORE-FULL-PARITY-CLOSURE-V1

**KPA ↔ PharmacyHub 커뮤니티·내 매장 parity — 진행 기록 (NOT_COMPLETE)**

- WO: `WO-O4O-PHARMACYHUB-COMMUNITY-AND-MY-STORE-FULL-PARITY-CLOSURE-V1`
- 시작: `origin/main` `5e3b3f205`
- 브랜치: `work/ph-parity-closure` · 최종 commit `23627f8f0`
- 성격: 재조사 + 부분 구현. **closure 미달**

> ## ⚠️ 판정 고지
> 이번 세션에서 **회원 콘텐츠 축 1개만** 구현·검증·커밋했다.
> 나머지 잔여 capability(운영자 Content/Resources + 내 매장 9개 축)는 **미착수**다.
> 배포·프로덕션 E2E·migration apply 는 환경상 실행하지 못했다.
> 따라서 `KPA_PH_COMMUNITY_MY_STORE_PARITY = NOT_COMPLETE`.

---

## 1. WO 전제 정정 — SUPERSEDED_BY_CURRENT_MAIN

WO §7·§8 은 "PH 대응 table 없음 → 신규 persistence + migration 이 이번 범위"를 전제한다.
**현재 main 에서 이 질문은 이미 반대로 결론나 머지돼 있다.**

| 근거 | 내용 |
|---|---|
| `4a150c784` `WO-O4O-PHARMACYHUB-COMMUNITY-CONTENT-RESOURCE-TABLE-AND-ADOPTION-V1` | 판정 **B. SHARED_CORE_WITH_SERVICE_SCOPE** — 원장 `cms_contents`, 격리 `serviceKey`. 신규 backend/table/migration **0** |
| 같은 CHECK §8 | "기존 모델로 표현 가능함이 증명됐으므로 신규 테이블 검토 자체가 성립하지 않는다" |
| 프로덕션 실측 | `cms_contents` 126 rows · `pharmacy_hub_contents` **테이블 자체가 없음** |

지금 `pharmacy_hub_contents` 를 신설하면 이 WO 자신의 §8(임의 architecture 금지)·§20(두 번째 state machine 금지)을
위반하고 PH 콘텐츠 소스가 둘로 갈린다. → **신규 테이블 만들지 않음. migration 0.**
사용자 확인을 거쳐 이 전제를 `SUPERSEDED_BY_CURRENT_MAIN` 으로 처리했다.

---

## 2. 시작 census — main 에서 이미 닫힌 축 (재구현 금지 대상)

| 축 | 상태 | 근거 |
|---|---|---|
| LMS learner 전체 (14) | **ADOPTED** | `9a17c6408` + CHECK `PH_LMS_LEARNER_ADOPTION = COMPLETE`, 프로덕션 E2E 기록 `2ae7ef6e7` |
| Forum 전 축 | **ADOPTED** | 개설신청·내신청·비공개가입·owner dashboard·member mgmt·삭제요청·operator review route 실재 |
| 회원 자료실 | **ADOPTED** | `e2d03b8d1` 공통 `ResourcesHubTemplate` + `cms_contents` |
| 커뮤니티 홈/검색/가이드 | **ADOPTED** | `/community`, `/community/search`, `/guide/**` |

PH `App.tsx` 는 283줄 → **592줄**로 병렬 세션들이 이 트랙을 크게 진척시킨 상태였다.
**이번 WO 에서 위 축은 재구현하지 않았다.**

---

## 3. 이번 세션 구현 — 회원 콘텐츠 (`/content`)

| 항목 | 내용 |
|---|---|
| 원장 | 공통 `cms_contents` (`serviceKey='pharmacy-hub'`, `type='content'`) |
| 신규 table / migration / backend API | **0** |
| 목록 | 공통 `ContentHubTemplate` + PH adapter (`PharmacyHubContentPage`, 63줄) |
| 상세 | 공통 `CommunityContentDetailView` + PH adapter (`PharmacyHubContentDetailPage`, 72줄) |
| API client | `pharmacyHubContents.ts` (87줄) — 기존 resources client 계약 미러 |
| route | `/content`, `/content/:id` — **`MembershipGate` 뒤** (권한 모델 신설 0) |
| navigation | `PH_PUBLIC_NAV` 커뮤니티 children + footer 2곳 (dead link 0) |

### 3-1. 공통 모듈 generic 확장 1건

`ContentHubTemplate` 의 `href` 는 **외부 링크 전용(`target="_blank"`)** 이라 앱 내부 상세로 이동할 방법이 없었다.
`onItemClick?: (item) => void` 를 추가했다.

- 서비스 분기 아님 — 템플릿 코드에 serviceKey 문자열 0 (테스트로 고정)
- `href` 우선 유지 → 기존 4개 소비처(KPA/GP/KCos/Neture) 동작 무변경
- 구현 중 스코프 버그 2건(`config` 미도달)을 typecheck 로 잡아 prop 스레딩으로 수정

### 3-2. 회원 **작성**(create/edit) 미구현 — 판정 보류 (설계 결정 필요)

이번 세션 초기 서술은 "권한 모델 재설계 필요"로 단정했으나 **부정확했다.** 실제 대조 결과는 아래와 같다.

**canonical write 경로가 둘이다.**

| 모델 | 원장 | 회원 작성 | 소비 서비스 | 근거 |
|---|---|:--:|---|---|
| **A** | `{service}_contents` | **가능** (`authenticate` 만) | KPA · GlycoPharm · K-Cosmetics | `kpa.routes.ts:1587` `contentRouter.post('/', authenticate, …)` · `resources.controller.ts:74` `router.post('/', authenticate, write.create)` |
| **B** | `cms_contents` | **불가** (`{serviceKey}:admin\|operator`) | PharmacyHub(읽기) · 플랫폼 CMS | `cms-content-mutation.handler.ts` `authorizeCmsMutation` |

즉 "PH 가 회원 작성을 못 한다"는 **`cms_contents` 인가가 잘못됐다는 뜻이 아니라**,
PH 가 A 가 아니라 B 위에 있다는 뜻이다. KPA 3서비스는 회원 작성형이 **실재**하므로
(즉 "KPA 에도 없어서 gap 이 아니다" 는 성립하지 않는다) parity 관점의 gap 은 맞다.

**선택지 3가지 — 다음 세션에서 판정한다.**

1. **`INTENTIONAL_DIFFERENCE`** — PH 콘텐츠는 운영자 발행 모델(읽기 전용)이 제품 의도라고 확정.
   PH 공지 canonical 이 이미 forum pinned post 인 점(선행 CHECK §10)과 정합적이다.
2. **B 확장** — `authorizeCmsMutation` 에 회원 작성을 허용. 단 이 handler 는 **전 서비스 공통 CMS 원장**을
   지키므로 kpa/neture/cosmetics/glycopharm 에 모두 영향 → 공통 권한 모델 변경으로 신중히 다뤄야 한다.
3. **A 채택** — `pharmacy_hub_contents` 신규 테이블 필요 → **확정 canonical(§1) 위반이므로 배제.**

이번 세션에는 구현하지 않았고 회원 작성 CTA 도 노출하지 않았다(노출 시 반드시 403 인 dead CTA).
**판정 자체가 미완이므로 gap 으로 계상한다.**

---

## 4. 잔여 gap (실측 완료 · 미착수)

### 4-1. 커뮤니티 — 운영자

| capability | 상태 | 비고 |
|---|---|---|
| 운영자 Content 관리 | **MISSING_ADOPTION** | PH `operatorMenuGroups` 에 `content` 키가 이미 선언돼 있으나 route/page 없음 → **현재 dead navigation** |
| 운영자 Resources 관리 | **MISSING_ADOPTION** | 동일 (`resources` 키 선언, route 없음) |

공통 모듈은 존재한다 — `@o4o/operator-core-ui/modules/operator-content-hub`, `.../modules/resources`
(`OperatorResourcesConsolePage`). KCos 가 이미 소비 중이라 채택 경로는 확인됐다.
다만 KCos client 는 `{service}_contents` API 를, PH 는 `cms_contents` API 를 쓰므로
**CMS 기반 `ResourcesConsoleClient` / `ContentHubClient` adapter 작성이 필요**하다. 미착수.

### 4-2. 내 매장 (grep 실측 — PH 0 / KPA 보유)

| capability | PH | KPA | 분류 |
|---|:--:|:--:|---|
| 다국어 상품 콘텐츠 | 0 | 22 | CODE_GAP |
| 온라인 판매 | 0 | 9 | CODE_GAP |
| 외국인 여행객 판매지원 | 0 | 9 | CODE_GAP |
| 판매자 모집 / 신청현황 | 0 | 9 | CODE_GAP |
| QR AI 설명 | 0 | 7 | CODE_GAP |
| 상품 상세설명 | 0 | 2 | CODE_GAP |
| 매장 상품 관리자 | 0 | 1 | CODE_GAP |
| 매장 마케팅 분석 | 0 | (별도) | CODE_GAP |
| Signage 전체 flow | **PARTIAL** (`signage` 1 route) | playlist/new·videos·schedules·player·play | CODE_GAP |

> WO §14 판정(“KPA 에서 실제 active 인가 / PH 에 같은 업무가 필요한가 / shared Core 존재 여부”)은
> **각 항목별로 아직 수행하지 않았다.** 위 표는 route/파일 실재 기준 실측일 뿐 최종 판정이 아니다.

---

## 5. 집계

WO §34 형식을 따르되, **이번 세션에서 항목 단위로 검증한 범위**를 명시한다.

```text
전체 capability 모집단: 97   (선행 audit 모집단 승계 — 항목 단위 재열거는 미수행)
ADOPTED: 64                  (선행 49 + LMS 14 + 회원 콘텐츠 1)
PARTIAL_ADOPTION: 1          (Signage flow)
MISSING_ADOPTION: 29
INTENTIONAL_DIFFERENCE: 2
OUT_OF_SCOPE: 1
미조사: 0
```

```text
P0: 0
P1: 23   (내 매장 핵심 + 운영자 Content/Resources)
P2: 6
```

⚠️ **정직성 고지**: `ADOPTED 64` 는 축 단위 확인(LMS CHECK·forum route 실재·resources 커밋·이번 콘텐츠 구현)에서
도출했고, 선행 audit 의 97개 항목을 **한 줄씩 다시 열거해 대조하지는 않았다**. WO §29 가 요구하는
"항목 단위 재census" 는 미완이며, 위 숫자는 그 전 단계의 근사다.

### 5-1. 잔여 항목 분류 (WO §8 요구)

| 분류 | 항목 |
|---|---|
| `CODE_GAP` | 운영자 Content/Resources · 내 매장 9개 축 (§4) |
| `ENVIRONMENT_UNVERIFIED` | 배포 · 프로덕션 desktop/mobile E2E · migration apply · 전체 build/typecheck |
| `EXTERNAL_DEPENDENCY` | — |
| `INTENTIONAL_DIFFERENCE` | 매장허브 서비스 운영자 개입 축(승인·지원·큐레이션) 2건 (선행 audit 승계) |
| `OUT_OF_SCOPE` | 선행 audit 1건 승계 |
| **미분류/판단 필요** | 회원 콘텐츠 **작성** — 권한 모델 완화가 전 서비스 영향 (§3-2) |

---

## 6. 검증

| 항목 | 결과 |
|---|---|
| `pharmacyhub-community-content-adoption.spec.ts` (신규) | **11/11 PASS** |
| PharmacyHub web `tsc -b` — 변경 파일 귀속 오류 | **0** |
| 공통 `ContentHubTemplate` 확장 후 기존 소비처 | 선택 prop · `href` 우선 유지로 구조적 무영향 (개별 서비스 build 미실행) |
| api-server 전체 typecheck / 전체 jest | **미실측** |
| KPA / GP / KCos / Neture frontend build | **미실측** |
| migration | **없음** (신규 table 0) |
| 배포 | **미실행** |
| 프로덕션 desktop/mobile E2E | **미실행** |

### 6-1. 미실측 원인 (WO §6 요구대로 분리 기록)

| 미실측 | 원인 |
|---|---|
| 전체 typecheck/build | 물리 8GB RAM — 전체 `tsc` 가 V8 `Fatal process out of memory: Zone`. 영향 범위별 검증(변경 파일 귀속 오류 0 + 대상 spec)으로 대체 |
| 배포 | outward-facing 액션 · CI/gcloud 필요 |
| 프로덕션 E2E | 배포 선행 필요 |
| migration apply | 이번 변경에 migration 자체가 없음(§1) |

---

## 7. 잔존 위험

1. **운영자 Content/Resources 가 dead navigation** — `operatorMenuGroups` 에 키만 선언돼 있고 route 가 없다.
   WO §21(dead link 0)에 위배되므로 **다음 착수 1순위**.
2. **회원 콘텐츠 작성 부재** — KPA/GP/KCos 3서비스는 회원 작성형이 실재하고 PH 는 읽기 전용이다.
   §3-2 의 선택지 1/2 중 판정이 필요하며(3은 배제), 판정 전까지 parity gap 으로 계상한다.
3. **내 매장 9개 축 미착수** — 각 항목 §14 판정(active/필요/shared Core) 자체가 아직 없다.
4. **공통 템플릿 변경의 타 서비스 영향 미실측** — 구조상 안전하나 4개 서비스 build 를 돌리지 못했다.
5. **집계 근사** — §5 경고 참조.

---

## 8. 최종 판정

```text
KPA_PH_COMMUNITY_MY_STORE_PARITY = NOT_COMPLETE
```

코드상 P1 gap(운영자 Content/Resources + 내 매장 9축)이 남아 있으므로 WO §30 완료 조건 미달이다.
구현 완료와 production verification 완료를 구분하면:

```text
구현(코드) 완료         = NOT_COMPLETE  (CODE_GAP 잔존)
production verification = NOT_PERFORMED (ENVIRONMENT_UNVERIFIED)
```

---

## 9. 인계 — 같은 WO 를 이어서 완료한다

**새 WO 를 만들지 않는다.** 이 문서의 WO 를 그대로 이어간다.

```text
worktree : C:/tmp/o4o-ph-parity   (clean)
branch   : work/ph-parity-closure (main 미병합)
resume   : 6502904ce
canonical: cms_contents + serviceKey  — pharmacy_hub_contents 신규 테이블/migration 금지
```

시작 시 최신 `origin/main` 진행분을 확인해 충돌 없이 동기화하고, **기존 구현을 재작성하지 않는다.**

### 실행 순서 (중간 완료 선언 없이 잔여 전체를 연속 처리)

1. PH 운영자 Content/Resources **dead navigation 해소** + canonical CMS adapter 채택
   (`@o4o/operator-core-ui/modules/operator-content-hub` · `.../modules/resources`,
    PH 는 `cms_contents` API 라 CMS 기반 console client adapter 필요)
2. 회원 Content create/edit — §3-2 선택지 1/2 판정 후 필요하면 공통 권한 모델로 **안전하게** 구현
3. My Store 잔여 9개 축 §14 전수 판정 → 필요한 capability 전부 채택
4. Signage partial flow 완결
5. **97 모집단을 항목 단위로 전수 재대조** — §5 의 근사 수치를 제거한다 (closure 숫자로 쓰지 말 것)
6. 가능한 tests / typecheck / build
7. 본 CHECK 갱신
8. path-specific commit / push
9. 안전하게 가능하면 main 병합까지

### 완료 조건

```text
미조사 = 0 · PARTIAL_ADOPTION = 0 · MISSING_ADOPTION = 0
P0 = 0 · P1 = 0 · dead navigation = 0
```

환경 제약(배포·E2E)은 **코드 gap 을 남기는 사유가 되지 않는다.** 코드 완료와
production verification 을 분리 판정한다.
