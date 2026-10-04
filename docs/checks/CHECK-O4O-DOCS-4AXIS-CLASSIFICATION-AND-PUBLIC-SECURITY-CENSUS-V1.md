# CHECK-O4O-DOCS-4AXIS-CLASSIFICATION-AND-PUBLIC-SECURITY-CENSUS-V1

> **상태**: ACTIVE
> **작성일**: 2026-10-03 · **최종 갱신**: 2026-10-04
> **근거 WO/IR**: WO-O4O-DOCS-4AXIS-CLASSIFICATION-AND-PUBLIC-SECURITY-CENSUS-V1 · 선행 [`IR-O4O-DOCUMENTATION-CENSUS-AND-SECURITY-CLASSIFICATION-V1`](../investigations/IR-O4O-DOCUMENTATION-CENSUS-AND-SECURITY-CLASSIFICATION-V1.md) (데이터 분리 전 · `809b512ca`)

docs Markdown 4축 분류(CANONICAL · DEVELOPER · INTERNAL_SECURITY · HISTORY) · PUBLIC 저장소 전제 보안 census. 후속 문서 정비 WO 의 입력 자료이며 미해결 판단 사항을 포함한다 (LIFECYCLE-RULES §10-2 ④).

- **판정**: `READY_FOR_DOCUMENT_REFACTOR` (2026-10-04 갱신) — 보안 해소 조건 ① PR #279 main 반영(`f2204b2da`) · ② 로그인 불가 확인 모두 완료. 이전 판정 `SECURITY_REMEDIATION_REQUIRED` 의 근거는 §3-2 에 보존
- **정본 집합 확정**: §7 (2026-10-04, `WO-O4O-DOCS-CANONICAL-SET-CONFIRMATION-V1`)
- **기준**: `origin/main` @ `35979b119` · 2026-10-03 — PR #275(`d5e87b18e`, docs 데이터 12,108 파일 분리) 반영 후
- **하지 않은 것**: 문서 이동 · 삭제 · rename · DB write · credential 변경 · secret 값 기록 · history rewrite
- **방법**: `git archive` 로 docs + 루트 진입 문서 4개를 저장소 밖에 추출 → 위치 기반 4축 판정 + 상단 상태 표기 + 현행 문서 역참조(상대 링크 · WO/CHECK/IR 식별자) + 보안 패턴 스캔(값은 형태만 기록) → 보안 hit 전수 수동 판정. 전체 git history 는 고신뢰 secret 패턴으로 별도 스캔. 계정 로그인 가능 여부는 운영 DB read-only SELECT(Auth Proxy · `default_transaction_read_only=on`).

---

## 0. 결론

1. 현재 판정 **READY_FOR_DOCUMENT_REFACTOR** (2026-10-04) — 보안 remediation 완료.
   - 이력: 2026-10-03 판정은 `SECURITY_REMEDIATION_REQUIRED` 였다. public HEAD 의 기록물 1 파일에 테스트 계정 4건 + 운영자(admin 역할) 계정 1건의 비밀번호 평문이 있었기 때문이다(§3-2).
   - 해소: HEAD 평문 제거 PR #279 main 반영(`f2204b2da`) + 운영 DB read-only 로 **이 평문들로 로그인 가능한 계정 없음** 확인. history 잔존은 수용(rewrite 범위 밖).
   - 그 밖에는 HEAD 와 git history 모두에서 key · token 류 실제 secret 을 찾지 못했다(§3-1). history rewrite 는 범위 밖.
2. 대상 `.md` 3,730 (docs 3,726 + 루트 4) 중 **HISTORY 성격 3,431 (92%)**. 현재 기준 문서는 CANONICAL 220 + DEVELOPER 79 = 299.
3. HISTORY 중 **345 건은 현재 정본 · 진입 문서 · 리팩토링 상태판이 참조 중**이다. `docs/archive/**` 의 461 건은 이미 archive 위치다. 나머지 **2,625 는 위치 기준 1차 후보군일 뿐 이동 가능 목록이 아니다** — 그중 종료 상태를 명시한 문서는 512 건이고 73 건은 여전히 진행 · 대기 상태를 적고 있다(§2). 실제 archive/move 후보는 문서별 상태와 트랙 종료 확인 후 별도 WO 에서 산출한다.
4. 문제의 본질은 "읽어야 할 문서가 많다" 가 아니라 **기록물이 `docs/` 전면에 노출된 것**이다.
5. 같은 저장소 안의 `internal/` 폴더는 보안 경계가 아니다 (저장소 PUBLIC). INTERNAL 후보는 저장소 밖 이관 여부를 판정해야 한다.

> 기준 이후 main 변동: `docs/` 2 파일(CHECK 1 신규 · WO 1 수정) — 수치 영향 HISTORY +1 수준이라 재계산하지 않았다.

---

## 1. 4축 분류

| 축 | `.md` 수 | 구성 |
|---|---:|---|
| **CANONICAL** | 220 | baseline 71 · architecture 61 · platform 27 · design 10 · services 10 · rbac 6 · rules 5 · reference 5 · 서비스 소폴더(kpa · neture · cosmetics · event-offer · market-trial · media-pilot) 18 · adr 4 · decisions 1 · `CANONICAL-INDEX` · `o4o-common-structure` |
| **DEVELOPER** | 79 | guides 48 (상품 설명 저작 규칙) · templates 20 · 루트 `CLAUDE` · `AGENTS` · `README` · `SETUP` · runbooks 2 · `docs/README` · refactoring · development · manual · registries |
| **HISTORY** | 3,431 | checks 1,841 · investigations 789 · archive 484 · work-orders 278 · ir 36 · audits · data-audits · handoffs 각 1 |
| **INTERNAL_SECURITY** | 겹침 표기 | §3 |

CANONICAL 품질:

- SUPERSEDED 표기 3 — `architecture/O4O-IDENTITY-ARCHITECTURE-V1` · `-V2` · `baseline/O4O-AUTOMATION-AGENT-ARCHITECTURE-V1` → archive 이동 후보
- 상태 헤더 없음 69 — 현행 여부 판정 필요 (판단 불가 시 ACTIVE 유지, CLAUDE.md §16-6)

---

## 2. HISTORY 분해

### 2-1. 현재 참조 중 (이동 보류) — 345

| 사유 | 수 |
|---|---:|
| [`refactoring/status.md`](../refactoring/status.md) 가 인용 | 18 |
| 정본 · 개발자 · 진입 문서가 상대 링크 또는 WO/CHECK/IR 식별자로 인용 | 228 |
| `work-orders/` 30일 내 수정 + 상태 미종결 | 99 |
| **합계** | **345** |

폴더별: work-orders 129 · checks 128 · investigations 62 · archive 23 · ir 3.

### 2-2. 이미 archive 위치 — 461

`docs/archive/**` 의 나머지 461 건은 lifecycle 상 이미 archive 위치에 있으므로 위치 이전 후보가 아니다 (archive 전체 484 = 참조 중 23 + 461).

### 2-3. 위치 이전 1차 후보군 — 2,625 (이동 가능 목록 아님)

checks 1,713 · investigations 727 · work-orders 149 · ir 33 · 기타 3 (audits · data-audits · handoffs).

[`DOCUMENT-LIFECYCLE-AND-ARCHIVE-RULES-V1`](../rules/DOCUMENT-LIFECYCLE-AND-ARCHIVE-RULES-V1.md) 은 폴더 · prefix · 날짜만으로 archive 후보를 정하지 않고 **문서별 종료를 확인**하도록 한다. 1차 후보군을 문서 상단 상태 표기로 나누면:

| 상단 상태 표기 | 수 | 의미 |
|---|---:|---|
| 종료 명시 (COMPLETE · DONE · CLOSED · SUPERSEDED · 완료 등) | 512 | 이동 후보 검토 가능 — 그래도 트랙 종료는 별도 확인 |
| 진행 · 대기 명시 (ACTIVE · PENDING · HOLD · 진행 · 대기 등) | 73 | **이동 금지** — 예: 상태 `ACTIVE` 인 PharmacyHub community content resource CHECK |
| 상태 표기 없음 · 판독 불가 | 2,040 | 판정 불가 → 현 위치 유지 (CLAUDE.md §16-6) |

상태 판독은 상단 3,000자의 `상태:` 표기를 정규식으로 읽은 근사치다. 실제 archive/move 후보는 별도 WO 에서 문서별 상태와 소속 트랙의 종료 여부를 확인해 산출한다.

한계: docs 밖 코드 주석의 식별자 인용(선행 IR 기준 8,345 파일)은 재계산하지 않았다. 경로 이동은 파일명(식별자)을 바꾸지 않으므로 이동 판정에는 영향이 없다.

---

## 3. INTERNAL_SECURITY (PUBLIC 전제 · 값 미기록)

### 3-1. 실제 secret 의심 (key · token 류) — 0

| 범위 | 결과 |
|---|---|
| HEAD 비밀번호 · secret 패턴 | 38 hit / 18 파일 전수 판정 → **실제값 0** (`secretKeyRef` 참조 · `CREATE(plan)` · 형식 설명 · `rotated` · env 변수 참조 · 코드 식별자) |
| HEAD token · private key · DB URL · JWT · API key | 0 |
| 전체 git history 고신뢰 패턴 (private key · AWS · Google API/OAuth · GitHub · LLM · Slack · SA key JSON) | 15 커밋 hit → **key 본문(base64) 0 줄**. 가이드 문서의 헤더 텍스트와 AWS 문서 예시 키뿐 |

기존 기록상 history 노출 2건의 현재 상태:

| 노출 | 현재 | 확인 |
|---|---|---|
| 과거 DB 비밀번호 | rotated / invalidated — [`CHECK-O4O-CLOUDSQL-AND-RUNTIME-SECRET-HARDENING-V1`](CHECK-O4O-CLOUDSQL-AND-RUNTIME-SECRET-HARDENING-V1.md) | 기록으로 확인 |
| 운영 관리자 계정 평문(과거 migration) | 레거시 password 저장 위치 제거([`CHECK-O4O-LEGACY-PASSWORD-AUTH-RETIREMENT-V1`](CHECK-O4O-LEGACY-PASSWORD-AUTH-RETIREMENT-V1.md)) · 현재 비밀번호 credential 보유 계정에 admin/operator 역할 0 | **DB read 로 확인** (§3-2 와 같은 쿼리) |

한계: 일반 비밀번호 문자열은 정규식으로 history 전수 판정이 불가능하다.

### 3-2. Git 에 있으면 안 됨 — 1 파일 → 해소 (2026-10-04 · 당시 판정 `SECURITY_REMEDIATION_REQUIRED`)

| 위치 | 내용 | 조치 |
|---|---|---|
| `archive/work-orders/` 의 과거 E2E 보고서 1건 (경로는 `docs/local/` 미추적 목록에만 기록) | 과거 E2E 테스트 계정 4건 + **운영자(admin 역할) 계정 1건**의 비밀번호 평문 (운영자 건은 최초 census 의 정규식이 놓쳤고 PR #279 Codex 리뷰가 발견) | 별도 보안 PR #279 에서 `[REDACTED_PASSWORD]` 로 치환 — main 반영 완료(`f2204b2da`). 같은 값은 저장소의 다른 파일에 없다. history 잔존은 수용(선행 IR 판단 D3) |

**로그인 가능 여부 — 운영 DB read-only 확인 (2026-10-03)**:

| 확인 | 결과 |
|---|---|
| 레거시 `users.password` 컬럼 | 없음 |
| 레거시 `service_credentials` 테이블 | 없음 |
| 그 밖의 password 계열 컬럼 | 없음 |
| 현행 비밀번호 credential 테이블 행 수 | 2 — 2건 모두 공개 Demo 계정([`O4O-CANONICAL-DEMO-ACCOUNTS-V1`](../baseline/O4O-CANONICAL-DEMO-ACCOUNTS-V1.md)), 2026-10-02 생성 |
| credential 보유 계정의 활성 역할 | `kpa:store_owner` · `neture:supplier` — admin/operator 역할 0 |

→ 비밀번호 hash 가 존재할 수 있는 곳은 현행 credential 테이블뿐이고, 그 보유자는 공개 Demo 계정 2개뿐이다. Demo 비밀번호는 노출된 평문들과 길이부터 다르다. **노출된 5개 평문으로 로그인 가능한 계정은 없다.** credential 폐기 · 교체는 필요 없다. 조회는 집계 · 존재 여부만 출력했고 이메일 · hash 는 출력하지 않았다 (Demo 계정 식별자는 baseline 에 이미 공개).

해소 조건: ① PR #279 main 반영 (**완료** · `f2204b2da`) ② 로그인 불가 확인 (**완료**) → 2026-10-04 해소. §0 판정 갱신 완료.

**재스캔 — 탐지 규칙 검증 포함**: 운영자 건 발견 후 docs 전체 `.md` 를 두 규칙으로 다시 스캔했다. 알려진 양성 5건이 남아 있는 main 기준 tree(redact 전)에서 돌려 규칙이 실제로 잡는지 먼저 확인했다.

| 규칙 | 알려진 양성 5건 검출 | 그 외 hit | 판정 |
|---|---|---|---|
| ① 대 · 소문자 · 숫자 · 기호 혼합 8~40자 토큰 (마크다운 강조 `*` · URL `&` 포함 토큰 제외) | **5 / 5** | 링크 앵커 · URL 인코딩 | 실제값 0 (알려진 5건 외) |
| ② 계정 · 비밀번호 문맥 줄의 영문 · 숫자 · 기호 토큰 | **2 / 5** — 표 헤더에만 문맥어가 있고 값은 다음 행인 표 3행을 놓침 | 패키지명 · 경로 · 이메일 · 강조 표기 · 비밀번호 정책 테스트 입력값 · 패키지 버전 (106) | 보조 규칙으로만 사용 |

- 결론은 **탐지 범위로 한정**한다: 규칙 ① 이 잡는 형태(대 · 소문자 · 숫자 · 기호를 모두 포함하고 `*` · `&` 가 없는 8~40자 토큰)에서는 알려진 5건 외 추가 평문 비밀번호가 없다.
- **사각지대 (미검사)**: 대문자 또는 기호가 없는 비밀번호 · `*` · `&` 를 포함한 비밀번호 · 7자 이하 또는 41자 이상 · 표에서 문맥어가 헤더에만 있는 행의 짧은 값. 이 형태들은 정규식으로 전수 판정할 수 없어 "없음"을 주장하지 않는다. 신규 문서는 LIFECYCLE-RULES §10-4 에 따라 작성자가 지키고, 기존 기록물은 후속 정비에서 문서를 열 때 확인한다.
- 범위 한계: docs 밖 코드(seed · 테스트 · migration)의 비밀번호 리터럴은 이 census 범위가 아니다 — 선행 [`IR-O4O-PRIVACY-DATA-CENSUS-V1`](../investigations/IR-O4O-PRIVACY-DATA-CENSUS-V1.md) 이 다룬다.

해당 없음으로 판정한 것:

- Demo 계정 2건 비밀번호 — [`O4O-CANONICAL-DEMO-ACCOUNTS-V1`](../baseline/O4O-CANONICAL-DEMO-ACCOUNTS-V1.md) 이 **의도적 공개(서비스 체험 기능의 일부)** 로 정함 → KEEP. 근거는 role 이름이 아니라 **ownership 경계**다 — Demo 사용자는 일반 사용자와 같은 identity 구조로 로그인하고, 보는 데이터는 그 Demo 사용자에게 귀속되어 다른 사용자 데이터와 연결되지 않는다. 사용자 확정(2026-10-04)에 따라 LIFECYCLE-RULES §10-4 에 "공개 Demo credential 예외" 를 명시하고 baseline §4 에 격리 근거를 적었다 (이 PR). 예외는 그 정본의 Demo 2계정에 한정되며, 일반 · 운영자 · 관리자 · 실제 테스트 계정 비밀번호는 여전히 금지다.
- 개인 이메일 0 (`274e90be7` 마스킹 후)
- 휴대전화 5 hit — 전부 예시값
- 공인 IP — 공개 DNS 리졸버 · 문서 예시 대역 · 이미 /16 마스킹된 값 · `CLAUDE.md` 의 은퇴한 구 IP(금지 대상 명시용)

### 3-3. 민감하지만 secret 아님 — 178 파일 (HISTORY 171)

| 범주 | 파일 |
|---|---:|
| Cloud SQL 연결명 | 108 |
| Cloud Run URL | 24 |
| 계약 · 정산 · 수수료 키워드 | 21 |
| 사업자등록번호 패턴 (법정 공시값 위주) | 16 |
| GCS 버킷 | 9 |
| 테스트 계정 언급 | 7 |
| GCP 서비스계정 주소 | 4 |

- 인프라 식별자는 `.github/workflows/` · `SETUP.md` 에 이미 공개 → KEEP (선행 판단과 동일).
- **현행 문서 중 내용 판정 필요 4건** (정산 · 수수료 서술이 내부 사업 조건인지): `architecture/DROPSHIPPING-SETTLEMENT-MODEL` · `architecture/DROPSHIPPING-STATE-MODEL` · `baseline/O4O-DISTRIBUTION-FUNDING-INITIAL-OPERATION-MODEL-V1` · `baseline/O4O-OPERATOR-NON-APPROVAL-UX-BASELINE-V1`. 기록물 17건은 같은 기준으로 후속 판정.

---

## 4. 이동 · 삭제 후보 (실행 아님)

| 후보 | 수 | 방식 |
|---|---:|---|
| 삭제 | 0 | 확정 근거 없음 |
| 기록물 위치 이전 1차 후보군 | 2,625 | **이동 가능 목록 아님.** 종료 명시 512 만 검토 대상 · 진행/대기 73 이동 금지 · 판독 불가 2,040 유지. 확정은 별도 WO (문서별 상태 + 트랙 종료 확인) |
| 이미 archive 위치 | 461 | 이전 대상 아님 |
| 이동 보류 (현재 참조) | 345 | 유지 |
| SUPERSEDED 정본 → archive | 3 | 이동 보류 — 링크 결합으로 history 정비 WO (§7-2) |
| HEAD redact | 1 | **완료** — PR #279 (`f2204b2da`) |
| 저장소 밖 이관 내용 판정 | 현행 4 + 기록 17 | 현행 4 = PUBLIC 유지(§7-3) · 기록 17 은 history 정비 때 |

---

## 5. 후속 WO 제안

1. ~~보안 remediation 마무리~~ — **완료** (2026-10-04 · PR #279 · §0 · §3-2 갱신)
2. ~~현재 기준 문서 집합 확정~~ — **수행** (2026-10-04 · §7). 남은 항목은 §7-5
3. **기록물 이동 후보 확정** — 1차 후보군 2,625 에서 문서별 상태 · 트랙 종료를 확인해 실제 후보를 산출한 뒤 위치 이전 (리팩토링 안정 후, 링크 · 테스트 동반)

---

## 6. 문서 정합 (CLAUDE.md §16)

- 발견: SUPERSEDED 정본 3 · 상태 헤더 없는 정본 69 · 계약/정산 공개 적합성 미판정 4 · 과거 보고서 비밀번호 평문 1 파일(계정 5) · Demo 공개 credential ↔ LIFECYCLE-RULES §10-4 충돌 1
- 정본 수정 2 건 (사용자 확정 2026-10-04): `rules/DOCUMENT-LIFECYCLE-AND-ARCHIVE-RULES-V1` §10-4 Demo 예외 · `baseline/O4O-CANONICAL-DEMO-ACCOUNTS-V1` §4 격리 근거 — 충돌 해소
- 진입점 포인터 2 건 (사용자 승인 2026-10-04): `CLAUDE.md` DB · 보안 경계 절 · `AGENTS.md` 비밀번호 금지 줄에 "예외는 공개 Demo credential 하나뿐 — 조건은 LIFECYCLE-RULES §10-4" 한 줄씩. 예외 조건은 복제하지 않고 §10-4 를 SSOT 로 둔다
- 별도 WO 제안 3 건 (§5)

---

## 7. 정본 집합 확정 (2026-10-04 · `WO-O4O-DOCS-CANONICAL-SET-CONFIRMATION-V1`)

기준 `origin/main` @ `bc1a0bcdd`. 대상: canonical 폴더(baseline · architecture · platform · rbac · rules · adr · decisions · reference · design · services · 서비스 소폴더) 중 상단 15줄에 상태 줄이 없는 **82건**(§1 의 69 는 상단 3,000자 기준이었다) + SUPERSEDED 3 + 계약 · 정산 4. 문서별로 앞부분을 읽고 CANONICAL-INDEX · refactoring/status · 코드 존재(`git grep`)와 대조했다. 운영 DB 조회 없음.

### 7-1. 82건 판정

| 판정 | 수 | 조치 |
|---|---:|---|
| ACTIVE (미등재) | 28 | 상위 정본 · 더 최신 문서 · 코드와 교차검증한 뒤 나눴다 (7-1-A). **색인 ACTIVE 9** · **§9 판정 대기 11** · 등재 불필요 8(폴더 README 2 · Catalog Import 모듈 문서 3 · ADR 1 · HFF 초안 저장 설계 1 · 색인 자신). 함께 미등재였던 현행 SSOT `O4O-MARKET-TRIAL-CONTENT-ONLY-DOMAIN-BOUNDARY-V1` 을 ACTIVE 로 추가 → 색인 ACTIVE 10행 |
| ACTIVE (등재 · 일치) | 15 | 변경 없음 |
| 색인 불일치 | 8 | 색인 §9 "판정 대기" 로 이동하고 유효 절 · stale 절을 행에 명시. 본문 정합은 후속 |
| 기록물이 canonical 폴더에 있음 | 17 | 11건은 `ACTIVE · 기록물 — 현재 기준 정본 아님` 상태 줄 — 제안한 후속 조치의 완료 여부가 미확인이라 COMPLETED 로 닫지 않는다(보류 IR 규칙). 산출물이 구현됐고 후속이 없는 `SERVICE-PRODUCT-LAYER-PREP-V1` 1건만 `COMPLETED`. Promotion 계획 · 매트릭스 2건은 미실행 초안이라 `DRAFT`. MINEROCK600 media-pilot 3건은 진행 중 트랙이라 표기하지 않음 |
| SUPERSEDED | 2 | `NETURE-DOMAIN-ARCHITECTURE-FREEZE-V1` → V3 · `DECISION-O4O-IDENTITY-ARCHITECTURE-V2-ADOPTION-V1` → IDENTITY V3 상태 줄 |
| OBSOLETE | 1 | `ALPHA-STATUS-DISPLAY-STANDARD` (서비스 코드에서 표시 소멸) |
| 판정 불가 | 11 | 상태 줄 없음 = ACTIVE 유지(LIFECYCLE §6 · CLAUDE.md §16-6). 아래 7-4 |

#### 7-1-A. ACTIVE 후보 28건 교차검증

처음에는 문서 앞부분만 보고 28건을 ACTIVE 로 등재하려 했으나, PR 리뷰에서 상위 정본과 충돌하는 문서가 연속으로 나왔다. 그래서 전체를 다시 **문서 전문 · 상위 정본(ROLE-WORKSPACE · COMMERCE-BOUNDARY · SUPPLIER-DOMAIN · IDENTITY-V3 · STORE-ACCESS · Frozen) · 같은 주제의 더 최신 문서 · 코드**와 대조했다.

| 결과 | 문서 |
|---|---|
| ACTIVE (깨끗) | SHARED-SPACE-FRAME-PRINCIPLE · SHARED-SPACE-STANDARD-BLOCKS · DISTRIBUTION-EVIDENCE-SEED-PRINCIPLE · DESIGN-STORE-LIBRARY-AND-ASSET · DATA-CLEANUP-IDENTIFICATION-SAFETY |
| ACTIVE (낡은 참조 — 색인 행에 주의 표기) | STANDARD-LIST-PHASE1(대표 화면 은퇴) · TEMPLATE-PRESETS(Health Dashboard preset 소멸) · DESIGN-STORE-EXECUTION-MANAGEMENT(`signage_playlists` 서술) · APP-CONTENT-STANDARD-SPEC(없는 API) |
| §9 판정 대기 | STORE-OWNER-RBAC(내부 모순) · PLAYWRIGHT-MCP(고정 버전 stale) · DISTRIBUTION-FUNDING-INITIAL · MARKET-TRIAL-OFFLINE-PAYMENT(둘 다 content-only 경계와 충돌) · EventOffer-Operation-Policy(승인 계약과 충돌) · DESIGN-KPA-STORE-PRODUCT-DETAIL(소유권 대체) · APP-STANDARD-LIST-AND-MATRIX(Neture Signage 채택 보류와 충돌) · DESIGN-PRODUCT-AI-CONTENT-OWNERSHIP(§1~§4 · §8 유효, §7 · POP 절 stale) · SIGNAGE-APPROVAL(상태 모델이 구현과 다름) · CONTENT-META(은퇴 테이블을 정본으로 서술) · INTERNAL-BETA-RUNBOOK(없는 endpoint · 미기록 지표) |

추가 발견: `DROPSHIPPING-ORDER-RELAY` · `-SETTLEMENT-MODEL` · `-STATE-MODEL` 3건은 본문에 `Status: Active` 가 있으나 Dropshipping 도메인 코드 0 · 대응 패키지 없음 → 상단에 `OBSOLETE` 상태 줄(원문 Status 줄 보존).

### 7-2. SUPERSEDED 3건 (§1) — archive 이동 보류

`O4O-IDENTITY-ARCHITECTURE-V1` · `-V2` · `O4O-AUTOMATION-AGENT-ARCHITECTURE-V1` 은 SUPERSEDED 상태 줄과 존재하는 대체 문서를 이미 갖췄다. archive 이동은 canonical 문서 13곳 · 기록물 34곳 · 코드 주석 1곳의 링크를 함께 바꿔야 해 **history 정비 WO 로 넘긴다**. 색인 §6 의 AUTOMATION-V1 행(색인 어휘 밖 `SUPERSEDED` 상태)은 제거했다 — 대체 문서 V2 는 등재돼 있다.

### 7-3. 계약 · 정산 4건 — 모두 PUBLIC

`DROPSHIPPING-SETTLEMENT-MODEL` · `DROPSHIPPING-STATE-MODEL` · `O4O-DISTRIBUTION-FUNDING-INITIAL-OPERATION-MODEL-V1` · `O4O-OPERATOR-NON-APPROVAL-UX-BASELINE-V1` 의 정산 · 수수료 서술은 개념(필드 · 규칙)과 예시 금액뿐이다. 실제 계약 요율 · 거래처명 · 단가는 없다 → **저장소 유지(PUBLIC)**. 기록물 17건은 history 정비 때 같은 기준으로 본다.

### 7-4. 판정 불가 11건 (ACTIVE 유지 · 후속 판단 필요)

| 문서 | 이유 |
|---|---|
| `architecture/O4O-KPA-OPERATOR-CANONICAL-STATE-V1` | 2026-05 시점 스냅샷인데 SSOT 를 자처 — 역할 업무공간 리팩터링 후 재검증 표기 없음 |
| `baseline/NETURE-CAMPAIGN-ARCHITECTURE-FREEZE-V2` | 런타임 코드 0(migration 만) — 운영 테이블 존재 확인 전에는 OBSOLETE 판정 보류 |
| `baseline/NETURE-DOMAIN-BOUNDARY-V1` | Order · Campaign 소유 서술이 SUPPLIER-DOMAIN-BOUNDARY(FROZEN) · B2B 계약과 겹침 |
| `baseline/operations/KPA-MEMBERS-PRESENCE-DRIFT-DIAGNOSTICS` | backfill WO 산출물 — backfill 종료 여부 미확인 |
| `platform/operator/O4O-OPERATOR-USER-MANAGEMENT-STANDARD-V1` | 운영자 비밀번호 변경을 표준으로 둠 — 해당 UI 코드 0 |
| `platform/promotion/` CORE-EXTENSION-BOUNDARY · DATA-MODEL-AND-API-SCOPE · SLOT-CATALOG · UI-COMPONENT-STRATEGY (4) | `/cms/slots` API 는 존재 · 설계한 공통 UI 는 미구현 |
| `media-pilot/minerock600/CHARACTER-SHEET-…-V1` | 파일럿 산출물(파일럿 ≠ Canonical) — 트랙 진행 중 |

### 7-5. 후속 (별도 WO)

1. §9 판정 대기로 등재한 19건(18행 — 색인 불일치 7 · 7-1-A 의 11 · CHECKOUT-STABLE 1. `baseline/README` 는 2번)의 본문 정합 · 판정 — 특히 `CLAUDE.md` 가 직접 가리키는 `O4O-STORE-RULES` · `DEBUG-SSR-TEST-PAGE-GUIDE-V1` 우선. ACTIVE 로 둔 4건의 낡은 참조(7-1-A) 정정도 함께
2. `docs/baseline/README.md` 의 상태 표기(3-ROLE-FLOW · KPA-ROLE-MATRIX · ROLE-POLICY · E-COMMERCE)가 색인과 다름 — 색인 기준으로 정렬
3. `O4O-CORE-FREEZE-V1`(F10) 의 `RefreshToken.ts` 목록 stale(Identity V3 `refresh_tokens=DEAD_RETIRE`) — Frozen 본문이라 명시적 WO
4. 판정 불가 11건 결정 · SUPERSEDED 3 과 기록물 14건의 위치 이전은 history 정비 WO 에서
