# CHECK — WO-O4O-OTC-EASY-DRUG-READY-ORAL-UNIT1-CONTENT-FP-V3-FINAL-PRODUCTION-V1 (에이전트 다)

**세션:** 에이전트 다 · **단일 DB write-owner** · 2026-07-27
**대상:** `oral-unit-1` — 65 content fp / 270 master
**판정:** **GREEN** — KO 1,080T + EN 540T = **1,620T LIVE 반영 완료**, 사후검증 fail 0, 중지조건 8건 전부 미발동

---

## 1. 선행 확인 (WO §1~§3)

| 항목 | 결과 |
|------|------|
| main 동기화 | HEAD `3302d79e6` == `origin/main` |
| readiness commit `e808b9952` | **HEAD 조상 확인** |
| WO 산출물(러너·빌드·원장 19파일) readiness 이후 변경 | **0** (`git diff e808b9952..HEAD` 공집합, worktree clean) |
| 승인 SSOT (`...content-fingerprint-reapproval-ssot-v1.json`) | `APPROVED_FOR_PRODUCTION` · oral-unit-1 = 65fp/270m **일치** |
| unit ledger (`...content-fingerprint-unit-ledger-v1.json`) | 재승인 시점 이후 변경 **0** |
| EN payload / KO source dump | 변경 **0** |
| **dry-run 해시 불변** | `d9c3d4cd25f7976efa350ae88259580a` — readiness 원장과 **동일** |
| **rollback-test 해시 불변** | `4a9127b867af37bdafc0dcc969596013` — readiness 원장과 **동일** |
| 다른 세션 LIVE write | **0** (DB baseline: easy_canon 540 · authored 0 · v3ref 0 · audit 0 — readiness 시점과 동일) |

> dry-run·rollback-test 해시가 readiness 원장과 byte-identical → **적용 대상·계약·산출물이 승인 시점과 동일함이 실증**.

## 2. apply 경로 구현 (LIVE 잠금 해제)

readiness WO 에서 `--apply` 는 `exit 3` 으로 **미구현 잠금** 상태였다. 본 승인 WO 범위에서 LIVE 경로를 구현하되,
**rollback-test 가 검증한 SQL 을 그대로 공유**하도록 리팩터링했다(계약 이탈 0).

- `execKoFp(qr, sg)` / `execEnFp(qr, sg)` 로 write 계약 추출 → `rollbackTestFp`(항상 ROLLBACK)와 `applyFp`(사후검증 PASS 시 COMMIT)가 **동일 함수** 사용.
- 리팩터링 후 dry-run·rollback-test 해시 **불변** 재확인(위 §1) → SQL 이탈 없음이 해시로 증명됨.
- **3중 게이트**: `--apply --confirm --lang ko|en` + `OTC_V3_APPLY_{KO,EN}_ORAL_UNIT_1=CONFIRM` + **unit 화이트리스트**(`oral-unit-1` 단독, 그 외 `exit 3`).
- 게이트 실증: `--unit oral-unit-2 --apply` → `STOP: 승인 WO 범위 밖`, 토큰 미설정 → `LOCKED`.
- audit `metadata.wo` 는 rollback-test 검증본 **VERBATIM 유지**(readiness WO), 실행 WO 는 `productionWo` 로 병기 → 기존 독립 검증자의 대조축 불변.

## 3. LIVE apply 실측 (WO §4·§6)

| 단계 | fp | write 실측 | 예상 | 판정 |
|------|---:|----------:|-----:|:---:|
| KO LIVE apply | 65 / 65 commit | **1,080** | 1,080 | PASS |
| EN LIVE apply | 65 / 65 commit | **540** | 540 | PASS |
| **합계** | **65** | **1,620** | **1,620** | **일치** |

- fp별 단일 TX · TX 내부 사후검증 통과 시에만 COMMIT · 실패 시 해당 fp 전량 ROLLBACK 후 즉시 중지.
- EN 은 fp별 **KO authored canonical 270 전건 성립 선행조건**을 TX 안에서 재확인 후 진행.
- planDigest — KO `a35b6ca48b8f408c10da0b23227e8147` · EN `4a2772900304ce8d23d3552cd84073bb`.

## 4. KO postVerify (WO §5) · 최종 독립검증 (WO §7)

`postverify.da.ts` — apply 러너와 **별개 커넥션·별개 코드경로**, read-only.

| 항목 | KO | EN |
|------|---:|---:|
| master별 canonical 정확히 1 | **270** | **270** |
| **canonicalDup** | **0** | **0** |
| authored canonical | **270** | **270** |
| easy KO deprecated | **270** | — |
| easy canonical 잔존 | **0** | — |
| sourceRef scope / 범위밖 | **270 / 0** | **270 / 0** |
| audit `canonical_replaced` | **270** | — |
| 저장 content == 검증본 빌드 (md5) | **불일치 0** | **불일치 0** |
| 한글 잔존 | — | **0** |

**공식 6섹션 보존 — 1차 소스 직접 대조** (KO source dump ↔ DB 저장 canonical):

| 항목 | 결과 |
|------|-----:|
| fp 대조 | **65 / 65** |
| 공식 present 안전섹션 저장본 보존 | **199 / 199** |
| 효능·효과 / 용법·용량 수치 누락 fp | **0** |
| 매장 약사 문의 안내 (KO/EN) | **270 / 270** |

**범위 격리** — `oral-unit-2` 270 master: easy canonical **270 유지** · authored row **0** · audit **0** → **무변경**.

**독립 raw SQL 교차확인** (audit log 기준으로 대상 역추적, 빌드 JSON 미사용):
`appliedMasters 270 · distinctSourceRefs 65 · ko/canonical/mfds_drug_otc 270 · en/canonical/mfds_drug_otc 270 · ko/deprecated/mfds_easy_drug 270 · 금지요소(table/comment) 0 · EN 한글 0`.

> **readiness 독립 검증자(`verify.da.ts`) 해석**: §C 는 **pre-apply baseline(전 0)** 을 단언하므로 apply 후 6건 fail 은 **설계상 기대값**이다.
> 실측 `easy_canon 270 · authored_ko_canon 270 · en_authored_row 270 · v3ref_row 540 · wo_audit 270` 은 **unit-1 적용 + unit-2 미적용** 상태와 정확히 일치하며,
> §A(재현 131fp/540m·교집합 0·split 0) · §B(sourceRef 131/131) · §D·§E(KO/EN 보존) · §F(write 계약) 는 **전부 PASS**.

## 5. 중지 조건 점검 (WO 전 8항)

| 중지 조건 | 결과 |
|-----------|:----:|
| 기존 authored canonical 발견 | 미발동 (0) |
| V3 sourceRef 충돌 | 미발동 (0) |
| 예상 write 와 실측 불일치 | 미발동 (1,620 == 1,620) |
| 공식 6섹션 보존 실패 | 미발동 (199/199 · 수치누락 0) |
| canonicalDup 발생 | 미발동 (KO 0 / EN 0) |
| 다른 unit 또는 기존 LIVE 변경 | 미발동 (unit-2 무변경 · sourceRef 범위밖 0) |
| 독립검증 실패 | 미발동 (postVerify PASS · fail 0) |
| 다른 세션 DB write 감지 | 미발동 (baseline 불변) |

## 6. 산출물

| 구분 | 경로 |
|------|------|
| apply 러너 (LIVE 경로 구현 + 3중 게이트) | `apps/api-server/src/scripts/otc-easy-drug-ready-oral-v3-apply.da.ts` |
| **LIVE 사후검증자** (신규) | `apps/api-server/src/scripts/otc-easy-drug-ready-oral-v3-postverify.da.ts` |
| **oral-unit-1 GREEN 원장** | `.../data/otc-easy-drug-ready-oral-v3-green-oral-unit-1.json` |
| **oral-unit-2 UNBLOCKED 원장** | `.../data/otc-easy-drug-ready-oral-v3-unblocked-oral-unit-2.json` |

**공용 파일 변경 0** — 승인 SSOT · unit ledger · 빌드 산출물 · EN payload · KO dump · `verify.da.ts` · 공용 러너 · na 형제 러너 **미수정**.
가·나·라 세션 파일 · `pnpm-lock` **미접촉**. `git add .` / reset / clean / stash **미사용**.

## 7. oral-unit-2 상태 (WO §9)

**UNBLOCKED** — 선행 unit(oral-unit-1) GREEN 으로 차단 해제. 66fp / 270m / 예상 1,620T, `PRE_APPLY_READY` 유지, DB 전제 무변경.
단, 본 WO 는 **oral-unit-1 단독 승인** 범위이므로 unit-2 DB write **0**. 착수에는 별도 승인 WO + 화이트리스트 추가 + confirm 토큰이 필요하다.

---

**최종 판정: oral-unit-1 GREEN (1,620T LIVE) · oral-unit-2 UNBLOCKED (write 0)**
