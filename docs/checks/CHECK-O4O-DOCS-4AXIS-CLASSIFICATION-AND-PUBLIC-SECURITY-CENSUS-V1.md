# CHECK-O4O-DOCS-4AXIS-CLASSIFICATION-AND-PUBLIC-SECURITY-CENSUS-V1

docs Markdown 4축 분류(CANONICAL · DEVELOPER · INTERNAL_SECURITY · HISTORY) · PUBLIC 저장소 전제 보안 census

> **상태**: ACTIVE — 판정 **SECURITY_REMEDIATION_REQUIRED** · 후속 문서 정비 WO 의 입력 자료 (미해결 판단 사항 포함, LIFECYCLE-RULES §10-2 ④)
> **기준**: `origin/main` @ `35979b119` · 2026-10-03 — PR #275(`d5e87b18e`, docs 데이터 12,108 파일 분리) 반영 후
> **선행**: [`IR-O4O-DOCUMENTATION-CENSUS-AND-SECURITY-CLASSIFICATION-V1`](../investigations/IR-O4O-DOCUMENTATION-CENSUS-AND-SECURITY-CLASSIFICATION-V1.md) (데이터 분리 전 · `809b512ca`)
> **하지 않은 것**: 문서 수정 · 이동 · 삭제 · rename · DB 조회 · secret 값 기록 · history rewrite
> **방법**: `git archive` 로 docs + 루트 진입 문서 4개를 저장소 밖에 추출 → 위치 기반 4축 판정 + 상태 헤더 + 현행 문서 역참조(상대 링크 · WO/CHECK/IR 식별자) + 보안 패턴 스캔(값은 형태만 기록) → 보안 hit 전수 수동 판정. 전체 git history 는 고신뢰 secret 패턴으로 별도 스캔.

---

## 0. 결론

1. 판정: **SECURITY_REMEDIATION_REQUIRED** — public HEAD 의 기록물 1 파일에 **테스트 계정 비밀번호 평문**이 남아 있다(§3-2). 계정 활성 여부와 관계없이 과거 · 테스트 비밀번호도 문서에 둘 수 없으므로(LIFECYCLE-RULES §10-4) 이 판정이 문서 정비보다 앞선다.
   - 처리 순서: HEAD 평문 제거(별도 보안 PR) → 계정 로그인 불가 여부 read-only 확인 → 필요 시 폐기 · 교체 → 이 CHECK 판정 갱신 → 문서 정비 착수. history rewrite 는 범위 밖.
   - 그 밖에는 HEAD 와 git history 모두에서 key · token 류 실제 secret 을 찾지 못했다(§3-1).
2. 대상 `.md` 3,730 (docs 3,726 + 루트 4) 중 **HISTORY 성격 3,431 (92%)**. 현재 기준 문서는 CANONICAL 220 + DEVELOPER 79 = 299.
3. HISTORY 중 **345 건은 현재 정본 · 진입 문서 · 리팩토링 상태판이 참조 중**이다. 나머지 3,086 은 **위치 기준 1차 후보군일 뿐 이동 가능 목록이 아니다** — 그중 종료 상태를 명시한 문서는 662 건뿐이고 98 건은 여전히 진행 · 대기 상태를 적고 있다(§2). 실제 archive/move 후보는 문서별 상태와 트랙 종료 확인 후 별도 WO 에서 산출한다.
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

## 2. HISTORY 예외 — 현재 참조 중 (이동 보류)

| 사유 | 수 |
|---|---:|
| [`refactoring/status.md`](../refactoring/status.md) 가 인용 | 18 |
| 정본 · 개발자 · 진입 문서가 상대 링크 또는 WO/CHECK/IR 식별자로 인용 | 228 |
| `work-orders/` 30일 내 수정 + 상태 미종결 | 99 |
| **합계** | **345** |

폴더별: work-orders 129 · checks 128 · investigations 62 · archive 23 · ir 3.

**나머지 3,086 — 위치 기준 1차 후보군 (이동 가능 목록 아님)** — checks 1,713 · investigations 727 · archive 461 · work-orders 149 · ir 33 · 기타 3.

[`DOCUMENT-LIFECYCLE-AND-ARCHIVE-RULES-V1`](../rules/DOCUMENT-LIFECYCLE-AND-ARCHIVE-RULES-V1.md) 은 폴더 · prefix · 날짜만으로 archive 후보를 정하지 않고 **문서별 종료를 확인**하도록 한다. 1차 후보군을 문서 상단 상태 표기로 나누면:

| 상단 상태 표기 | 수 | 의미 |
|---|---:|---|
| 종료 명시 (COMPLETE · DONE · CLOSED · SUPERSEDED · 완료 등) | 662 | 이동 후보 검토 가능 — 그래도 트랙 종료는 별도 확인 |
| 진행 · 대기 명시 (ACTIVE · PENDING · HOLD · 진행 · 대기 등) | 98 | **이동 금지** — 예: 상태 `ACTIVE` 인 PharmacyHub community content resource CHECK |
| 상태 표기 없음 · 판독 불가 | 2,326 | 판정 불가 → 현 위치 유지 (CLAUDE.md §16-6) |

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
| 운영 관리자 계정 평문(과거 migration) | 레거시 password hash 축 DROP([`CHECK-O4O-LEGACY-PASSWORD-AUTH-RETIREMENT-V1`](CHECK-O4O-LEGACY-PASSWORD-AUTH-RETIREMENT-V1.md)), 새 email/password 는 별도 credential 테이블 → **구조적으로 무효 추정** | **DB read 확인 권장** |

한계: 일반 비밀번호 문자열은 정규식으로 history 전수 판정이 불가능하다.

### 3-2. Git 에 있으면 안 됨 — 1 파일 → **SECURITY_REMEDIATION_REQUIRED**

| 위치 | 내용 | 판정 |
|---|---|---|
| `archive/work-orders/` 의 과거 E2E 보고서 1건 (경로는 `docs/local/` 미추적 목록에만 기록) | 과거 E2E 테스트 계정 4건의 비밀번호 평문 | **HEAD 평문 제거 필수** — 별도 보안 PR(PR #279) 에서 `[REDACTED_PASSWORD]` 로 치환. 레거시 password hash 축 DROP 으로 로그인 불가로 추정되나 **DB 미확인**. history 잔존은 수용(선행 IR 판단 D3) |

해소 조건: ① 보안 PR main 반영 ② 해당 계정 로그인 불가 read-only 확인 (필요 시 폐기 · 교체). 둘 다 끝나면 이 절과 §0 판정을 갱신한다.

해당 없음으로 판정한 것:

- Demo 계정 2건 비밀번호 — [`O4O-CANONICAL-DEMO-ACCOUNTS-V1`](../baseline/O4O-CANONICAL-DEMO-ACCOUNTS-V1.md) 이 **의도적 공개(secret 아님)** 로 정함 → KEEP. 전제: Demo 계정 role 최소화 유지
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
| 기록물 위치 이전 1차 후보군 | 3,086 | **이동 가능 목록 아님.** 종료 명시 662 만 검토 대상 · 진행/대기 98 이동 금지 · 판독 불가 2,326 유지. 확정은 별도 WO (문서별 상태 + 트랙 종료 확인) |
| 이동 보류 (현재 참조) | 345 | 유지 |
| SUPERSEDED 정본 → archive | 3 | 별도 WO |
| HEAD redact | 1 | **선행 필수** — 보안 PR(PR #279) |
| 저장소 밖 이관 내용 판정 | 현행 4 + 기록 17 | 계약 · 정산 서술 |

---

## 5. 후속 WO 제안

1. **보안 remediation (최우선)** — HEAD 평문 제거(PR #279) → 과거 관리자 계정 · E2E 테스트 계정 로그인 불가 read-only 확인 → 필요 시 폐기 · 교체 → 이 CHECK 판정 갱신
2. **현재 기준 문서 집합 확정** — CANONICAL 상태 헤더 없음 69 판정 · SUPERSEDED 3 archive · 계약/정산 4건 공개 적합성 판정
3. **기록물 이동 후보 확정** — 1차 후보군 3,086 에서 문서별 상태 · 트랙 종료를 확인해 실제 후보를 산출한 뒤 위치 이전 (리팩토링 안정 후, 링크 · 테스트 동반)

---

## 6. 문서 정합 (CLAUDE.md §16)

- 발견: SUPERSEDED 정본 3 · 상태 헤더 없는 정본 69 · 계약/정산 공개 적합성 미판정 4 · 과거 보고서 비밀번호 평문 1
- 인라인 수정 0 건 (조사 전용) · 별도 WO 제안 3 건 (§5)
