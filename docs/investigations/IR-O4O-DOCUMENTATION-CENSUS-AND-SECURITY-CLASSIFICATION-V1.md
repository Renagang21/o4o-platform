# IR-O4O-DOCUMENTATION-CENSUS-AND-SECURITY-CLASSIFICATION-V1

> **타입**: Investigation Report (READ-ONLY census)
> **상태**: ACTIVE — 후속 정비 WO 의 입력 자료
> **기준**: `main` @ `809b512ca` · 2026-10-03
> **범위**: `docs/**` 추적 파일 전체 + 저장소 전체에서 `docs/` 를 참조하는 코드 · 문서
> **하지 않은 것**: 문서 삭제 · 이동 · rename · `CLAUDE.md` / `AGENTS.md` 변경 · 코드 변경 · 민감정보 값 기록
> **방법**: `git ls-files` · `git log --name-only`(파일별 최종 커밋일) · 정규식 기반 역참조 · 상대 링크 해석 · 민감정보 패턴 스캔 (Node 스크립트, 저장소 밖 scratchpad 에서 실행)

---

## 0. 결론 요약

1. **`docs/` 의 67% 는 문서가 아니라 데이터다.** 추적 15,863 파일 중 `.md` 는 3,730 개(23.5%). `guides/products/**` 10,623 파일(HTML/JSON 상품설명 산출물, 30 MB)과 `checks/data/**` 1,246 파일(JSON 데이터, 대부분 `product-description-guard`)이 나머지 대부분이며, **코드(`apps/api-server/src/scripts/*`) 48 개 파일이 이 경로를 런타임에 직접 읽는다.**
2. **`.md` 3,730 개 중 기록물(WO · CHECK · IR · archive)이 3,425 개(92%)**, 기준 문서는 약 305 개. 새 개발자가 읽어야 할 범위는 그중에서도 수십 개다.
3. **폴더 ≠ 문서 유형.** `checks/` 에 WO 187건, `investigations/` 에 CHECK 378건, `work-orders/` 에 CHECK 30 · IR 9건이 섞여 있다.
4. **상태 표기가 30 종 이상으로 분산**(완료 / COMPLETE / DONE / CLOSED / COMPLETED / PASS / READY …). 상태 헤더가 있는 `.md` 는 1,134 / 3,730(30%).
5. **이동 · rename 은 이미 높은 결합도를 가진다.** 문서 간 유효 `.md` 링크 2,786 개 중 1,524 개가 기록물 폴더를 가리키고, **docs 밖 8,345 개 파일이 WO/CHECK/IR 식별자 3,533 종을 주석 등으로 인용**한다. 경로 이동은 링크를, rename 은 추적성을 깨뜨린다.
6. **상대 링크 6,882 개 중 2,980 개가 이미 깨져 있다** (코드 파일 대상 2,723 · `.md` 대상 257). 이동 전 기준선으로 삼아야 한다.
7. **보안 검토 대상 312 파일**(개인 이메일 · IP · 서비스계정 · 전화번호 패턴). **평문 비밀번호 · 토큰 · private key · DB 접속 문자열은 패턴상 0건.** 다만 이 저장소는 Public 이므로 **HEAD 에서 지워도 git history 에는 남는다** (force push 금지 정책 → history 정리는 별도 판단 사안).
8. **기존 문서 거버넌스가 이미 있다** — `docs/README.md`(2026-08-06 기준, 수치 stale) · `rules/DOCUMENT-LIFECYCLE-AND-ARCHIVE-RULES-V1`(상태 6종) · `CANONICAL-INDEX` · `development/COLLABORATOR-START-HERE`. 새 체계는 이를 **대체가 아니라 흡수 · 정렬**해야 한다.

---

## 1. 현행 문서 구조 · 폴더별 문서 수

추적 파일 15,863 · `.md` 3,730 · 최상위 폴더 31 개 (`docs/README.md` 는 27 개 · 2,952 개로 stale).

| 폴더 | 파일 | `.md` | 용량 | 성격 | 역참조 0 인 `.md` |
|---|---:|---:|---:|---|---:|
| `guides/` | 10,649 | 60 | 30.4 MB | 저작 규칙 60 + **상품설명 데이터 10,589** | 4 |
| `checks/` | 3,082 | 1,836 | 94.8 MB | CHECK 기록 + **`data/` JSON 1,246** | 1,053 |
| `investigations/` | 1,046 | 786 | 12.8 MB | IR · CHECK + `samples/` 261 | 309 |
| `archive/` | 490 | 484 | 7.6 MB | 완료 기록 | 242 |
| `work-orders/` | 278 | 278 | 2.8 MB | WO (+ CHECK · IR 혼재) | 47 |
| `baseline/` | 70 | 70 | 0.8 MB | 정책 정본 | 4 |
| `architecture/` | 61 | 61 | 0.7 MB | 구조 정본 | 6 |
| `ir/` | 44 | 36 | 0.7 MB | IR (`investigations/` 와 중복 역할) | 3 |
| `templates/` | 33 | 20 | 0.2 MB | 서비스/매장 템플릿 | 0 |
| `platform/` | 27 | 27 | 0.3 MB | 공통 기능 정본 | 6 |
| `services/` | 11 | 10 | — | 서비스 정의 (8 개가 >180일 미수정) | 0 |
| `design/` | 10 | 10 | 0.2 MB | 설계 | 2 |
| `manual/` | 10 | 1 | — | 매뉴얼 | 0 |
| `rbac/` · `rules/` · `reference/` | 6 · 5 · 5 | 16 | — | 정본 | 3 |
| `kpa/` · `neture/` · `cosmetics/` · `event-offer/` · `market-trial/` · `media-pilot/` | 18 | 18 | — | 서비스별 소폴더 | 7 |
| `adr/` · `decisions/` | 5 | 5 | — | 결정 기록 (역할 중복) | 0 |
| `development/` · `runbooks/` · `registries/` | 4 | 4 | — | 개발 · 운영 절차 | 0 |
| `audits/` · `data-audits/` · `handoffs/` | 4 | 3 | — | 기록 | 1 |
| `local/` | 2 | 2 | — | **`*.local.md` 외 IR 2 건이 추적됨** (폴더 취지와 불일치) | 2 |
| 루트 (`README` · `CANONICAL-INDEX` · `o4o-common-structure`) | 3 | 3 | — | 진입점 | 0 |

### 최근성 (`.md`, 최종 커밋일 기준)

| 구간 | `checks/` | `investigations/` | `work-orders/` | `archive/` | 기준 문서 계열 |
|---|---:|---:|---:|---:|---:|
| ≤30일 | 835 | 534 | 132 | 328 | 140 |
| 31–90일 | 903 | 58 | 102 | 22 | 93 |
| 91–180일 | 98 | 194 | 43 | 134 | 32 |
| >180일 | 0 | 0 | 1 | 0 | 40 |

> 최근 커밋일은 "최근 이동 · 일괄 수정"도 포함하므로 **활성도 지표가 아니라 참고값**이다 (`archive/` 328 건이 ≤30일인 것은 최근 archive 이동 때문).

---

## 2. 문서 유형 혼재 (파일명 prefix × 폴더)

| 폴더 | WO | CHECK | IR | 기타 |
|---|---:|---:|---:|---:|
| `work-orders/` | 232 | **30** | **9** | PLAN 4 · 기타 3 |
| `checks/` | **187** | 1,641 | 1 | 7 |
| `investigations/` | 1 | **378** | 391 | DECISION 1 · 기타 15 |
| `archive/` | 10 | 47 | 405 | 22 |
| `ir/` | — | — | 33 | 3 |

- 같은 basename 이 두 곳에 있는 쌍 4건 — **내용이 모두 다르다** (단순 중복 아님, 삭제 후보 아님): `archive/audits` ↔ `archive/investigations` 3쌍, `checks/` ↔ `work-orders/` 의 `CHECK-O4O-NETURE-SUPPLIER-ACTIVATION-GATE-ALIGN-AND-ERROR-SURFACE-V1` 1쌍.
- 폴더 역할 중복: `ir/` ↔ `investigations/`, `adr/` ↔ `decisions/`, `audits/` · `data-audits/` ↔ `archive/audits/`.

---

## 3. 상태 어휘 분산

상태 헤더 보유 1,134 건에서 추출한 첫 토큰 상위:

`완료` 138 · `ACTIVE` 127 · `COMPLETE` 86 · `DONE` 78 · `구현` 64 · `조사` 60 · `CLOSED` 55 · `PASS` 54 · `READ-ONLY` 36 · `INVESTIGATION` 35 · `COMPLETED` 23 · `DRAFT` 22 · `FROZEN` 17 · `READY` 14 · `SUPERSEDED` 7 · `CLOSED_WITH_SMOKE_PENDING` 6 · `PAUSED_…` 5 … (30 종 이상)

- 현행 규칙(`DOCUMENT-LIFECYCLE-AND-ARCHIVE-RULES-V1 §2`)은 **DRAFT · ACTIVE · SUPERSEDED · COMPLETED · ARCHIVED · OBSOLETE 6종**이다.
- 정비 제안안은 **ACTIVE · DRAFT · DEPRECATED · HISTORICAL 4종**이다. 대응: `DEPRECATED ≈ SUPERSEDED + OBSOLETE`, `HISTORICAL ≈ COMPLETED + ARCHIVED`. **두 체계 중 하나로 확정이 필요하다** (§10 판단 요청 D1).
- 파일명에 상태 · 회차가 들어간 사례(`-FINAL-`, `-CLOSURE-`, `-PHASE2-`, `-R3-` 등)가 다수 — 파일명이 상태 관리 역할을 대신하고 있다.

---

## 4. 생명주기 분류 (Phase 1 · 휴리스틱)

판정식: 기준 폴더 = ACTIVE / `archive/` = HISTORICAL / 기록물 폴더는 **기준 문서 · 진입 문서(CLAUDE · AGENTS · README · SETUP · CANONICAL-INDEX)에서 인용되면 REFERENCE**, `work-orders/` 의 WO 중 30일 내 커밋은 ACTIVE_WORK, 나머지 HISTORICAL.

| 분류 | `.md` 수 | 주요 구성 |
|---|---:|---|
| **ACTIVE** (기준) | 305 | baseline 70 · architecture 61 · guides 60 · platform 27 · templates 20 · 기타 소폴더 |
| **ACTIVE_WORK** (진행 WO 후보) | 106 | `work-orders/` 최근 30일 WO |
| **REFERENCE** (정본이 근거로 인용하는 기록) | 209 | checks 113 · investigations 64 · work-orders 27 · ir 5 |
| **HISTORICAL** | 3,110 | checks 1,723 · investigations 722 · archive 484 · work-orders 145 · ir 31 · 기타 5 |
| **SECURITY_REVIEW** (중첩 표기) | 312 | §6 |
| **DELETE_CANDIDATE** | 0 | 확정 근거 있는 삭제 후보 없음 — Phase 1 에서는 지정하지 않는다 |

> ACTIVE_WORK 106 건은 "최근 수정"만으로 잡힌 상한값이다. 실제 진행 WO 는 WO 본문 상태 확인이 필요하다 (Phase 2 입력).

---

## 5. 정본 후보 · 신규 개발자 필요 문서

### 이미 있는 진입 계층

| 문서 | 상태 | 비고 |
|---|---|---|
| 루트 `README.md` · `AGENTS.md` · `CLAUDE.md` · `SETUP.md` | ACTIVE | `CLAUDE.md` 가 docs 경로 58 개를 직접 링크 → **이 경로들은 이동 금지 대상** |
| `docs/CANONICAL-INDEX.md` | ACTIVE | 정본 지도 (§0~§9) |
| `docs/development/COLLABORATOR-START-HERE.md` | ACTIVE | 신규 협업자 진입점 (리팩토링 상태 · 첫 작업 대상 · Production 경계) |
| `docs/README.md` | **stale** | 2026-08-06 수치 (27 폴더 / 2,952 개) — 현재 31 / 3,730 |
| `docs/services/README.md` + `_core/apps/*` | **stale 의심** | 10 개 중 8 개가 180일 이상 미수정 |

### 신규 개발자 최소 독서 경로 후보 (5개 내외)

`README.md` → `docs/development/COLLABORATOR-START-HERE.md` → `docs/CANONICAL-INDEX.md` → `SETUP.md` → `docs/baseline/O4O-ROLE-WORKSPACE-ARCHITECTURE-V1.md` → (담당 서비스 문서)

- 정비안의 `docs/architecture/platform.md` · `docs/services/{service}/README.md` · `docs/refactoring/status.md` 에 해당하는 **짧은 요약 문서는 현재 없다.** 정보는 baseline/architecture 장문 정본과 `COLLABORATOR-START-HERE §2` · `CANONICAL-INDEX §9` 에 흩어져 있다.

### 정본 흡수가 필요한 대형 주제군 (기록물 폴더, 주제 접두 기준 상위)

`DRUG-OTC-DESCRIPTION` 90 · `HEALTH-FUNCTIONAL-FOOD` 23 · `OTC-EASY-DRUG` 23 · `CROSS-SERVICE-MYPAGE` 22 · `NETURE-SUPPLIER-PRODUCT` 19 · `OTC-ORAL-COMBO` 17 · `PHARMACY-HUB-STORE` 14 · `KPA-STORE-LIBRARY` 13 · `KPA-TABLET-*`(CONTENT/SCREEN/CORNER/TEMPLATE/QR/TOUCH) 54 · `CROSSSERVICE-OPERATOR-FORUM` 10 · `NETURE-DISTRIBUTION-FUNDING` 9 …

→ 이 주제군이 "WO 8 + CHECK 12 + IR 4 → 정본 1" 흡수 대상의 1차 후보다.

---

## 6. 보안 검토 필요 문서 (값 미기록 · 집계만)

패턴 스캔 결과 (오탐 포함, 파일 단위). **상세 파일 목록은 git 미추적 `docs/local/DOC-SECURITY-REVIEW-CANDIDATES.local.md` 에만 기록했다** (Public 저장소에 위치 목록을 올리지 않기 위함).

| 범주 | 파일 수 | 판정 |
|---|---:|---|
| 개인 메일 도메인(gmail · naver 등) 이메일 | 219 | **고유 주소 6 개** — 대부분 내부 운영/테스트 계정 소유자 주소. 1 개는 제3자 가능성 → 우선 확인. CLAUDE.md "실제 사용자 이메일 금지" 규칙 위반 상태 |
| 플랫폼 테스트 도메인 이메일 | 39 | 테스트 계정 식별자. 비밀은 아니나 계정 구조 노출 |
| 공인 IP 주소 | 45 | 클라우드 리소스 IP 및 개인 접속 IP 추정값 포함 → RESTRICTED |
| Cloud SQL 인스턴스 연결명 | 107 | 대부분 CHECK 의 반복 서술. 비밀은 아니나 인프라 식별자 과다 노출 |
| GCP 서비스계정 주소 | 3 | RESTRICTED |
| 휴대전화 번호 패턴 | 7 | 대부분 예시값 추정, 1 개 파일(6회)은 실번호 가능성 → 우선 확인 |
| 사업자등록번호 패턴 | 16 | 대부분 회사 법정 공시값(푸터 표기 대상) · 예시값 → 위험 낮음 |
| 비밀번호 키워드 | 34 → 실질 0 | 모두 코드 식별자(`user.password`) · `NULL` · secret **이름** 참조. 평문 값 없음 |
| 토큰 · private key · DB 접속 문자열 | 0 | — |

추가 사실:
- 위 결과는 **현재 HEAD 기준**이다. 과거 커밋에 있다가 지워진 값은 조사하지 않았고, HEAD 에서 지워도 history 에 남는다.
- `docs/local/` 은 `*.local.md` 만 ignore 되며, 그 외 파일(IR 2 건)은 추적되고 있다.
- 운영 절차 문서(`baseline/operations/**` · `rbac/` runbook · `SETUP.md` DB 절차)는 공개 범위 판단이 필요한 INTERNAL/RESTRICTED 경계 문서다 — 패턴이 아니라 **내용 판정**이 필요해 이번 census 에서 등급을 확정하지 않았다.

---

## 7. 이동 시 깨지는 참조 (결합도)

| 종류 | 규모 | 이동 영향 |
|---|---:|---|
| docs 내부 유효 `.md` 상대 링크 | 2,786 | 이동 시 깨짐. 그중 **1,524 개가 기록물 폴더(checks/investigations/work-orders/ir/archive)를 가리킴** |
| 이미 깨진 상대 링크 | 2,980 | 코드 파일 대상 2,723 (경로 깊이 오류 · 삭제된 코드) · `.md` 대상 257 |
| `CLAUDE.md` / `AGENTS.md` / `README.md` / `SETUP.md` 의 docs 경로 | 58 / 18 / 15 / 7 | §-고정 진입점. 이동 시 진입 문서 동시 수정 필요 |
| 런타임에 docs 데이터를 읽는 코드 | `guides/products` 18 · `checks/data` 30 · `investigations/samples` 4 · `docs/services` 2 (CLI · OpenAPI generator) | **이동 = 코드 변경** |
| docs 경로를 단언하는 테스트 | `archive-retention-…spec`(archive 하위 6 폴더 · checks · investigations 존재 단언) · `supplier-domain-boundary.spec` · `channels-stack-retirement.spec` · CI `detect-affected` / `deploy-risk` 테스트 | 이동 시 테스트 실패 |
| 코드 주석의 WO/CHECK/IR 식별자 인용 | docs 밖 8,345 파일 · 고유 식별자 3,533 | **rename 시 추적성 단절** (경로 이동만이면 식별자는 유지됨) |
| 역참조 허브 (비-README) | `WO-O4O-LEGACY-PASSWORD-AUTH-RETIREMENT-V1` 119 · `WO-O4O-SERVICE-IDENTITY-AND-OPERATOR-SCOPE-V1` 116 · `WO-O4O-LECTURE-INDEPENDENT-SERVICE-SEPARATION-V1` 85 | 대부분 코드 주석 인용. 이 WO 들은 사실상 "설계 정본" 역할 → 정본 흡수 1순위 |

**함의**: (a) 파일명 rename 은 하지 않는다 — 신규 정본만 짧은 이름으로 만든다. (b) 기록물은 **경로 유지 + 색인 계층 추가**가 기본이고, 이동은 링크 재작성 스크립트와 테스트 갱신을 동반하는 별도 WO 로 한다.

---

## 8. 향후 디렉터리 매핑 제안 (실행 아님)

| 제안 구조 | 현행 출처 | 방식 |
|---|---|---|
| `docs/README.md` (진입 5문서) | `docs/README.md`(stale) + `COLLABORATOR-START-HERE` | **재작성** (경로 유지) |
| `docs/architecture/` 요약 (`platform.md` 등) | `baseline/` · `architecture/` · `rbac/` · `platform/` 의 정본 | **신규 요약 + 정본 링크**. 정본 파일은 이동하지 않음 (CLAUDE.md · 테스트 고정 경로) |
| `docs/services/{neture,kpa-society,pharmacy-hub,glycopharm,k-cosmetics,…}/` | `neture/` · `kpa/` · `cosmetics/` · `event-offer/` · `market-trial/` · `media-pilot/` · `services/_core` · 대형 주제군(§5) | 소폴더 18 개는 이동 가능(역참조 소수). 주제군은 정본 흡수 |
| `docs/development/` | `SETUP.md`(루트 유지) · `COLLABORATOR-START-HERE` · `runbooks/` · `templates/` · `registries/` | 색인 우선, 소폴더 이동은 2차 |
| `docs/decisions/` | `adr/` + `decisions/` | 통합 (5 파일) |
| `docs/refactoring/` (임시 영역) | `CANONICAL-INDEX §9` · `ROLE-WORKSPACE-ARCHITECTURE` · `COLLABORATOR-START-HERE §2` · legacy 은퇴 WO 들 | 신규 작성 |
| `docs/work-orders/active/` | `work-orders/` ACTIVE_WORK(≤106) | 상태 확인 후 |
| `docs/archive/` | `checks/` · `investigations/` · `ir/` · `audits/` · `data-audits/` · `handoffs/` · 완료 WO | **마지막 단계**. 링크 재작성 · 테스트 갱신 필수 |
| **docs 밖 (데이터)** | `guides/products/**` (10,589) · `checks/data/**` (1,246) · `investigations/samples/**` (261) | 문서가 아니라 데이터 자산 — `data/` 등 별도 위치 검토. **스크립트 52 개 경로 변경 수반** |
| **저장소 밖 (Private)** | §6 RESTRICTED 대상 · 운영 절차 중 민감 부분 · `docs/local/` 추적 IR 2 건 | Private 공간 신설 후 이관 |

권장 순서(정비안과 동일): ① 보안 분리 → ② 신규 개발자 진입 문서 → ③ 현재 정본 확립(주제군 흡수) → ④ 완료 WO/CHECK 정리 → ⑤ archive 축소. 데이터 자산 분리는 ①과 독립적으로 병행 가능.

---

## 9. 문서 정합 (CLAUDE.md §16)

- 발견: `docs/README.md` 수치 stale (27 → 31 폴더, 2,952 → 3,730 `.md`) · `docs/services/` 8 개 문서 >180일 · 상대 링크 2,980 개 깨짐 · `docs/local/` 추적 파일 2 건 · 상태 어휘 이원화(규칙 6종 vs 정비안 4종).
- 이번 IR 에서 인라인 수정 0 건 (조사 전용).

---

## 10. 후속 WO 착수 전 판단 요청

| # | 판단 사항 | 선택지 |
|---|---|---|
| D1 | 상태 어휘 | 현행 6종 유지 / 정비안 4종으로 `LIFECYCLE-RULES` 개정 |
| D2 | Private 운영 문서 공간 | 별도 private 저장소 / 외부 문서 도구 / 기타 |
| D3 | 개인 이메일 등 history 잔존 | HEAD 정리만 (history 수용) / history 재작성 (force push 금지 정책 예외 필요) |
| D4 | 상품설명 데이터(`guides/products` 등) | docs 밖 이동(스크립트 수정 WO) / 현 위치 유지 + 색인 제외 |

후속 WO 후보: `WO-O4O-DOCS-SECURITY-SEPARATION-V1`(①) · `WO-O4O-DOCS-ONBOARDING-ENTRY-V1`(②) · `WO-O4O-DOCS-DATA-ASSET-RELOCATION-V1`(D4) · 주제군별 정본 흡수 WO(③).
