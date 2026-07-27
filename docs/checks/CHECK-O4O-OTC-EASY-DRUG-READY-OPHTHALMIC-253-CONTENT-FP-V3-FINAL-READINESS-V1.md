# CHECK — WO-O4O-OTC-EASY-DRUG-READY-OPHTHALMIC-253-CONTENT-FP-V3-FINAL-READINESS-V1 (에이전트 가)

**세션:** 에이전트 가 (write-owner ophthalmic-unit-1) · 2026-07-27
**모델 전환:** gencode-fingerprint(폐기, commit `0b7b25447`) → **content-fingerprint V3** (전역 재승인 agent 라, commit `00851d237`)
**판정:** **PRE_APPLY READY** — 253/26 재현 · 26 fp KO+EN 저작·검증 · 이중게이트 apply 잠금 · 전 게이트 PASS
**DB write: 0 · LIVE apply 0 · 설명서 DB 반영 0**

---

## 0. 배경 — 왜 V3 인가

기존 gencode 단독 fingerprint 는 **같은 일반명코드라도 제품별 공식 원문(효능·용법·주의)이 동질임을 보장하지 못한다**.
V3 는 공식 6섹션을 개별 정규화·해시하여 fingerprint 를 구성한다:

```
CONTENT_SECTIONS = [효능·효과, 용법·용량, 경고, 사용상 주의사항, 이상반응, 상호작용]
hv[k]            = H(normalize(sec[k] || ''))              // H = md5(s).slice(0,16)
contentFingerprint(gencode, route, hv) = H([gencode, route, ...CONTENT_SECTIONS.map(k=>hv[k])].join('|'))
sourceRef        = contentFpToUuid(fp) = uuid(md5('otc-v3-content-leaflet:' + fp))   // V2(otc-v2-leaflet:) 와 다른 namespace
```

같은 content fp 안에서는 **6섹션이 정의상 byte-identical** 이므로, fp 당 1회 저작(KO+EN)이 그 fp 의 모든 master 에 그대로 적용된다.

## 1. 산출물

| 구분 | 경로 |
|------|------|
| V3 순수 계약 (fingerprint·sourceRef·census 조인·로더) | `apps/api-server/src/scripts/otc-easy-drug-ready-ophthalmic-253-v3-contract.ga.ts` |
| 재현·grounding 준비 (read-only) | `apps/api-server/src/scripts/otc-easy-drug-ready-ophthalmic-253-v3-reproduce.ga.ts` |
| V3 6섹션 KO 합성기 + EN 렌더러 | `apps/api-server/src/scripts/otc-easy-drug-ready-ophthalmic-253-v3-composer.ga.ts` |
| EN 저작 페이로드 (26 fp) | `apps/api-server/src/scripts/otc-easy-drug-ready-ophthalmic-253-v3-en-config.ga.ts` |
| KO+EN 검증기 | `apps/api-server/src/scripts/otc-easy-drug-ready-ophthalmic-253-v3-validate.ga.ts` |
| 생산 실행기 (dry-run · preflight · rollback-test · apply 잠금) | `apps/api-server/src/scripts/otc-easy-drug-ready-ophthalmic-253-v3-executor.ga.ts` |
| **독립** 검증자 (executor 미import) | `apps/api-server/src/scripts/otc-easy-drug-ready-ophthalmic-253-v3-verify.ga.ts` |
| 공식 원문 grounding | `.../data/otc-easy-drug-ready-ophthalmic-253-v3-official-source-v1.json` |
| dry-run manifest | `.../data/otc-easy-drug-ready-ophthalmic-253-v3-dryrun-manifest.ga.json` (md5 `4ded10109bc96bb6ff57097f5131c7fc`) |
| preflight / rollback / verify 리포트 | `.../data/otc-easy-drug-ready-ophthalmic-253-v3-{preflight,rollback-test,verify}.ga.json` |
| **PRE_APPLY READY 원장** | `.../data/otc-easy-drug-ready-ophthalmic-253-v3-pre-apply-ready-ledger.ga.json` |

**공용 파일 변경 0** — `otc-v2-store-leaflet-runner.shared.ts`, 점안 Unit 2 GREEN profile, V3 승인 SSOT/원장 은 **import·read-only**. 점안 계약은 `OPHTHALMIC_PROFILE` 주입으로만 적용.

## 2. fp / master 재현 (V3 unit 원장 + DB 공식 원문 독립 재현)

| 항목 | 선언 | 독립 재현 | 판정 |
|------|-----:|---------:|:---:|
| content fingerprint | 26 | **26** | PASS |
| master | 253 | **253** | PASS |
| group size 합 == master | 253 | 253 | PASS |
| master 누락 / 중복 | 0 | **0 / 0** | PASS |
| easy_drug STORE ko canonical 확보 | 253 | **253** | PASS |
| 일반명코드 단일 확정 · fp 일치 | 253 | **253** | PASS |
| **fp 재현율** | 100% | **26/26** | PASS |

census 조인은 승인본 VERBATIM(`product_identifiers`→`product_drug_extensions`(otc)→`product_candidates.raw_payload`). 제품명은 route·성분 판정에 **일절 미사용**.

## 3. route · 6섹션 안전지문

| 검증 | 결과 |
|------|-----:|
| route=ophthalmic 전건 (일반명코드 접미 COS) | **253 / 253** |
| 제형 | 점안액 (COS) |
| fp 내부 6섹션 byte-identical | **26/26 (정의상 보장 · census gate 4)** |
| 공식 효능·용법 결손 | **0 / 26** |
| 효능·용법 경로 충돌 (점안 + 경구 전용 용법) | **0** |
| **경고 present** | 1 fp (`b497101eb4bc556d`) |
| **상호작용 present** | 4 fp (`6719ba1ecdd10aa9` · `9dba4a694da86090` · `d274d7256f243712` · `fb48c83e85ad84eb`) |
| 사용상 주의사항 · 이상반응 present | 26 fp 전건 |
| sourceRef 충돌 (LIVE) | **0** |
| V3 sourceRef == V2 namespace | **0 (26/26 상이)** |

## 4. KO 합성 — 6섹션 보존

프로즌 HTML 빌더는 콘텐츠 존이 3개(efficacy/usage/caution)뿐이다. V3 6섹션을 보존하기 위해 4개 안전 섹션을 **고정순서 `【라벨】` 블록**으로 단일 caution 존에 적재한다.

| 항목 | 결과 |
|------|-----:|
| KO 구성 가능 fp | **26 / 26** |
| KO anomalies | **0** |
| 용법·효능 수치 누락 (`missingNumerics`) | **0** |
| 경구 동사 잔존 (용법·주의 양쪽, `복용→사용` 재표현 후) | **0** |
| present 안전 섹션 caution 보존 (정규화 부분일치) | **26/26 전량 보존** |
| KO usageLabel | `점안 사용 안내` |

> `NONORAL_REWRITE`(복용→사용) 은 점안 용법·주의에만 적용. 공식 원문이 눈물약을 "복용" 으로 쓴 fp(`6719ba1ecdd10aa9`)도 신규 사실 없이 "사용" 으로 정정된다. `PHARMACIST_LINE_KO` 는 매장 약사 문의 안내를 유지하되 경구 동사를 쓰지 않게 재작성.

## 5. EN 저작 — 26 fp

grounding = 각 fp 대표 원문의 공식 6섹션. 신규 의료 사실 0. safety 맵은 present 안전 섹션과 **1:1**.

```
$ tsx otc-easy-drug-ready-ophthalmic-253-v3-validate.ga.ts
fp=26 masters=253 koOk=26 enOk=26
=== GREEN — 26 fp KO+EN anomalies=0, safety 1:1 ===
```

| 게이트 | 결과 |
|--------|-----:|
| EN fp 커버리지 | **26 / 26** |
| safety 키 present 섹션 1:1 | **26/26** |
| 한글 잔존 | **0** |
| 경구 동사 (본문·요약표; `take` — "take care" 관용구 포함 차단) | **0** |
| 점안 경로 표현 부재 (`instill`/`eye`/`eyelid`) | **0** |
| 1회 방울 수 누락 (`방울` 요구) | **0** |
| 공식 용법 수량 누락 (`missingNumericsEn` — 방울·횟수·간격·연령) | **0** |
| 한쪽·양쪽 눈 축 누락 | **0** (공식 용법에 눈측 토큰 없음 → 요구 없음) |
| 점안 고유 주의 축 누락 (콘택트렌즈 · 용기 끝 접촉 · 점안 간격) | **0** |
| 신규 의료 사실 | **0** |

> "먹었을 경우" 같은 문장은 경구 동사를 피해 `accidentally ingested` 로 옮겼다.

## 6. dry-run (2회 byte-identical)

```
DRY-RUN GREEN fp=26 masters=253 ko_4T=1012 en_2T=506 total=1518
```

| 산출물 | md5 | 2회 실행 |
|--------|-----|:-------:|
| dry-run manifest | `4ded10109bc96bb6ff57097f5131c7fc` | **동일** |

타임스탬프·난수 없음, 정렬 고정, html 해시 기록.

## 7. preflight (read-only DB, write 0)

```
fp 26 · masters 253 · blockers []
gates: 253/26 재현 · gencode 일치 · easy ko canonical 정확히1 · authored 슬롯 충돌 0 ·
       en canonical 0 · V3 sourceRef LIVE 충돌 0 · V3≠V2 namespace · canonicalDup 0  → 전부 PASS
writePlan ko_4T 1012 + en_2T 506 = 1518
=== PREFLIGHT GREEN — 모든 게이트 통과, write 0 ===
```

## 8. rollback-test (트랜잭션 → 강제 ROLLBACK, 순 DB write 0)

실제 write 계약(KO 4T demote→insert→flip→audit · EN 2T insert→flip)을 **전 253 master** 트랜잭션 안에서 그대로 수행 후 무조건 ROLLBACK.

```
koWriteInTx 1012 · enWriteInTx 506 · expected total 1518
before { spd_all 253, ko_canon 253, en_canon 0, audit 0 }
inTx   { spd_all 759, ko_canon 253, en_canon 253, audit 253 }   ← 계약대로 동작
after  { spd_all 253, ko_canon 253, en_canon 0, audit 0 }   ← ROLLBACK
netZero: true
=== ROLLBACK TEST GREEN — net DB write 0, KO+EN 계약 확인 ===
```

- 트랜잭션 내부에서 KO 1012T + EN 506T = 1518T 가 계약대로 발생(easy demote, authored ko/en canonical 승격, audit).
- 커밋 없이 전량 ROLLBACK → 전후 카운트 완전 동일. **순 DB write 0**.

## 9. 독립 검증자 (executor 미import)

`verify.ga.ts` 는 executor 의 buildPlan 을 쓰지 않고 계약·합성기·config·manifest 를 **재유도**해 대조한다.

```
v1_reproduce true · v2_sourceRef true · v3_htmlHash { ko 26, en 26 } ·
v5_writePlan { ko_4T 1012, en_2T 506, total 1518 } ·
v6_db { easy_ko 253, v3_ko 0, en_canon 0, v3_ref_rows 0, wo_audit 0 } · pass true
=== INDEPENDENT VERIFY GREEN — 253/26 재현 · 해시 일치 · write 0 · PRE_APPLY 상태 ===
```

`v6_db` 가 LIVE 미반영을 실증: V3 authored ko/en canonical 0, V3 sourceRef 행 0, WO audit 0.

## 10. 예상 write · 교집합

| 항목 | 결과 |
|------|-----:|
| 기존 LIVE master / fp / sourceRef 교집합 | **0 / 0 / 0** |
| authored STORE ko canonical 기존 보유 | **0** |
| STORE en canonical 기존 보유 | **0** |
| canonicalDup | **0** |
| 예상 write | KO **1012T** + EN **506T** = **1518T** (master 253 × 6T) |
| **실제 DB write** | **0** |

## 11. 금지사항 준수

| 금지 | 결과 |
|------|:----:|
| LIVE apply | **0** (`--apply` 는 이중 게이트 `V3_APPLY_GATE1`·`V3_APPLY_GATE2` + preflight blockers 0 + 명시 차단문으로 잠금) |
| V3 승인 SSOT / unit 원장 / 실행순서 원장 변경 | **0** (read-only) |
| 공용 fingerprint · sourceRef 산식 변경 | **0** |
| 점안 Unit 2 GREEN 파일 · 공용 러너 수정 | **0** (import 만) |
| 다른 세션(나·다·라) 파일 · pnpm-lock 수정 | **0** |
| `git add .` / reset / clean / stash | **미사용** (path-specific add 만) |
| `.env` 수정·삭제·자격증명 출력 | **0** (process.env 로만 전달) |

## 12. LIVE apply 선행조건 (가 세션 밖)

**판정: ophthalmic-unit-1 측 선행조건 전부 충족 (PRE_APPLY READY).**

- 남은 선행조건: write-owner 인계 + LIVE apply 승인 WO + 이중 게이트 토큰 부여.
- 충족 시 `--apply` (KO 선행 → EN) 로 총 1518T, INSERT-only, 단일 트랜잭션, 사후검증, 실패 시 전량 rollback.
- 본 CHECK 시점까지 DB 반영 **0**. 승인 없는 apply 는 수행하지 않는다.
