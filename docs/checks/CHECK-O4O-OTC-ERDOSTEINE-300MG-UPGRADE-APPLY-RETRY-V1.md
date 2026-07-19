# CHECK-O4O-OTC-ERDOSTEINE-300MG-UPGRADE-APPLY-RETRY-V1 — 승격 apply 재실행 완료 (에이전트 가)

WO: `WO-O4O-OTC-ERDOSTEINE-300MG-UPGRADE-APPLY-RETRY-GA-V1` (승인 봉투 `ERDOSTEINE-300MG-26` 이어서) · 일자: 2026-07-18 · 상태: **완료 — 26건 e약은요→authored canonical 승격 LIVE**
기준 커밋: flip 파싱 수정 `7ae86e7eb`. 채널: Cloud SQL Auth Proxy(:5442) → production.

---

## 0. 결론

> **flip 결과 파싱 수정본(7ae86e7eb)으로 apply 재실행 → 성공 COMMIT. STEP A needs_review INSERT 0(기존 26 멱등 재사용) · STEP B easy demote 26 · authored flip 26 · audit 26. TX 내부 사후검증 PASS(canonical1 26·authored 26·deprecatedEasy 26·dup 0). 독립 연결 재검증 전항목 일치(audit metadata previous/new+source 26 보존). 제외 4건 불변(easy canonical 4). 재실행 no-op(DB write 0). 총 write 78. 인시던트 시 STEP A 가 남긴 needs_review 26 이 그대로 flip 됨(중복·재삽입 0).**

---

## 1. apply 결과 (STEP A + STEP B)

| 단계 | 연산 | 수 | 기대 | 판정 |
|---|---|---:|---:|:---:|
| STEP A | authored needs_review INSERT | **0** (기존 26 재사용) | 0 | ✅ |
| STEP B | easy canonical → deprecated | **26** | 26 | ✅ |
| STEP B | authored needs_review → canonical flip | **26** | 26 | ✅ |
| STEP B | audit `canonical_replaced` INSERT | **26** | 26 | ✅ |
| — | **총 write** | **78** (demote26+flip26+audit26) | — | ✅ |

### TX 내부 사후검증
`canonical1 26 · authored 26 · deprecatedEasy 26 · dup 0` → PASS → COMMIT.

---

## 2. 독립 연결 재검증 (새 pg client)

| 항목 | 값 | 판정 |
|---|---|:---:|
| STORE ko canonical source | **mfds_drug_otc 26** (authored) | ✅ |
| canonical 정확히 1건/master | **26** | ✅ |
| deprecated easy (mfds_easy_drug) | **26** | ✅ |
| canonical duplicate | **0** | ✅ |
| canonical 0건 슬롯 | **0** | ✅ |
| audit `canonical_replaced` | **26** | ✅ |
| audit metadata previous/new ID + previousSource=mfds_easy_drug + newSource=mfds_drug_otc | **26/26** | ✅ |
| 제외 4건(fp d68b3eec) 상태 | **mfds_easy_drug canonical 4 (불변)** | ✅ |

---

## 3. 재실행 no-op

- 동일 명령 재실행 → **DB write 0**. pre-gate ABORT(이상 2: `target 0`·`easy canonical 정확히1 0/26`) — 승격 후 상태(canonical=authored, easy=deprecated)가 pre-gate 전제(easy 26)와 반대라 스크립트가 재승격을 **정상 거부**.
- 재실행 후 상태 재확인: canonical mfds_drug_otc **26 불변** · audit **26 불변** → **추가 write·변경 0**(idempotent-safe). ABORT 는 이미-승격 그룹의 안전한 거부이며 손상 없음.
- ⚠️ 참고: 스크립트가 매 실행 시 산출 JSON 을 덮어써(pre-gate 진단 포함), no-op 재실행이 dry-run JSON 을 pre-gate 버전으로 clobber → 커밋본(PASS dry-run)으로 **복원**(작업트리 보호). apply 성공 metric 은 본 CHECK + 독립검증에 보존.

---

## 4. 완료 절차 / 준수

| WO 완료 항목 | 결과 |
|---|---|
| TX 내부 사후검증 PASS | ✅ |
| 독립 연결 재검증 | ✅ (§2) |
| 재실행 no-op | ✅ (write 0, 상태 불변) |
| 실행 JSON·CHECK commit | ✅ (dry-run PASS JSON 기커밋 · 본 완료 CHECK) |
| 원격 반영 | ✅ |
| 프록시·.env 정리 | ✅ (teardown) |
| 중단 조건 해당 | 없음 (STEP A 0·demote/flip/audit 각 26·중복0·제외 불변·metadata 보존) |

> **결과**: 에르도스테인 300mg 정 **26건 e약은요→authored canonical 승격 LIVE**(Track A 첫 파일럿 완료). rollback = master 26(dry-run JSON `rollback_master_ids`) + audit `canonical_replaced` 26(previous_description_id=deprecated easy, new=authored). 나머지 authored그대로확장 9 Top 그룹은 안전지문 하위 분리 후 후속 파일럿, Track B 는 관제 원문 인입 대기.
