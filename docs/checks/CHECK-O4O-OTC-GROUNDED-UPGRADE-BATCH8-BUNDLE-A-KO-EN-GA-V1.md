# CHECK — WO-O4O-OTC-GROUNDED-UPGRADE-BATCH8-BUNDLE-A-KO-EN-GA-V1

**에이전트 가 (단일 write-owner) · APPLIED (production DB write) · 2026-07-20**

batch-8 감사(`src/scripts/data/otc-next-batch-8-audit-v1.json`, commit `52fbdd9a7`) 번들 A 4그룹을
감사 순서대로 ko authored canonical 승격 → en 재사용 canonical 까지 **각각 연속 완결**. 각 그룹 독립.

대상 master 집합은 **감사 SSOT `target_master_ids` 를 권위**로 하고, 재열거(fp-harvest)로 byte-identical 재현을 선증명했다.

---

## 1. 대상 재확인 (fp-harvest read-only · runner dry-run 권위)

산출: `apps/api-server/src/scripts/otc-batch8-bundleA-fp-harvest.ts` → `src/scripts/data/otc-batch8-bundleA-fp-harvest.json`

| 그룹 | fp(그대로확장) | source_ref | coarse(easy) | target | exclude | other | 교집합 | easy canonical 정확히1 | authored 충돌 | nonOral |
|---|---|---|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|
| 락토바실루스아시도필루스균 300mg 캡슐 | `4ec78870b3318967` | `177466cf…` | 13 | **13** | 0 | 0 | 0 | 13 | 0 | 0 |
| 알파칼시돌 0.5μg 연질캡슐 | `8ac89c4550d02b6d` | `0436f0d8…` | 29 | **12** | 17 (3fp) | 0 | 0 | 12 | 0 | 0 |
| 아세틸시스테인 100mg 캡슐 | `41701ec292bc3fa6` | `240871d7…` | 18 | **9** | 9 (2fp) | 0 | 0 | 9 | 0 | 0 |
| 나프록센나트륨 275mg 정 | `124cccc95fde01af` | `006f1a2b…` | 96 | **8** | 88 (19fp) | 0 | 0 | 8 | 0 | 0 |

- 전 그룹 `target_master_ids` **감사 SSOT 와 정렬 후 완전일치(byte-identical)** · target 수 == 감사 T(13/12/9/8) · exclude 수 == 감사 exclude(0/17/9/88) · target route 전량 `oral` · 미분류 fp 0.
- 나프록센나트륨 275mg 정은 **나프록센(염 없음) 250mg 연질캡슐** 그룹(source_ref `02355c78…`)과 성분·함량·제형 모두 별개 — 미접촉.
- 알파칼시돌 0.5μg 은 1μg 그룹과 별개 함량 — 미접촉.

---

## 2. ko 승격 (그룹별) — 4T

| 그룹 | dry-run | apply (stepA insert / easy demote / authored flip / audit) | ko write | 사후검증(TX 내) | 재실행 |
|---|:-:|---|:-:|---|:-:|
| 락토바실루스 300mg | PASS(이상 0) | 13 / 13 / 13 / 13 | **52** | canon1=13·authored=13·dep=13·dup=0 | ALREADY_UPGRADED (write 0) |
| 알파칼시돌 0.5μg | PASS(이상 0) | 12 / 12 / 12 / 12 | **48** | canon1=12·authored=12·dep=12·dup=0 | ALREADY_UPGRADED (write 0) |
| 아세틸시스테인 100mg | PASS(이상 0) | 9 / 9 / 9 / 9 | **36** | canon1=9·authored=9·dep=9·dup=0 | ALREADY_UPGRADED (write 0) |
| 나프록센나트륨 275mg | PASS(이상 0) | 8 / 8 / 8 / 8 | **32** | canon1=8·authored=8·dep=8·dup=0 | ALREADY_UPGRADED (write 0) |

- dry-run 증거: `src/scripts/data/otc-grounded-upgrade-<group>.dryrun-pass.json` (4건). apply 는 dry-run 전량 PASS 후에만 실행(이중게이트 `--apply` + `DRUG_OTC_GROUNDED_UPGRADE_CONFIRM=YES`).
- authored draft HTML 검증: 필수필드 누락 0 · 빈 html 0 · `<table>` 0 · 주석 0 · 이중 escape 0 · `sd-warn` 존재. contentHash `8d0afba9…` / `5696e2a8…` / `e1f5ecc0…` / `b8d746e2…`.
- 실제 write == writePlan(52/48/36/32) 완전일치. 부분 승격·ABORT·ROLLBACK 0.

---

## 3. EN 완결 (그룹별 · 검토완료 EN 재사용) — 2T

EN 대상 스코프 = ko runner 산출 `rollback_master_ids`(master_id 스코프, source_ref 스코프 금지).
struct = 마스터 번역의 동일 groupKey entry **발췌(verbatim)** → `buildDrugOtcEnConsumerHtml` 산출이
동일 source_ref 공유 out master 의 LIVE en canonical 과 **byte-identical(diff 0)** 임을 apply 전에 선증명
(`apps/api-server/src/scripts/otc-batch8-bundleA-en-probe.ts`).

| 그룹 | build md5 = live out en | out(공유 source_ref) | summary | 대상 기존 en | en NR→canonical | en write | 재실행 |
|---|---|:-:|---|:-:|:-:|:-:|:-:|
| 락토바실루스 300mg | `81c45380008e6705…` | 13 | "Constipation, loose stools, …" | 0 | 13 → 13 | **26** | ALREADY_COMPLETE |
| 알파칼시돌 0.5μg | `d0e8523587e6cb11…` | 21 | null (out LIVE 동일) | 0 | 12 → 12 | **24** | ALREADY_COMPLETE |
| 아세틸시스테인 100mg | `c167e18fc0f04277…` | 3 | "Thick phlegm in bronchitis, …" | 0 | 9 → 9 | **18** | ALREADY_COMPLETE |
| 나프록센나트륨 275mg | `744aecaaac09a35b…` | 40 | null (out LIVE 동일) | 0 | 8 → 8 | **16** | ALREADY_COMPLETE |

- 전 그룹 `consistencyMatch=true` · `builtMd5 == referenceEn`(out en 단일 md5) · ko 에 없는 medical fact 0 · 한글 0 · `<table>`/주석/이중 escape 0 · 지문 불변(`fingerprintOk=T`) · 사후 `enCanonical=T · nr=0 · dup=0 · koCanonical=T`.
- 번역 파일(배치 전용 4종, 마스터 번역 발췌): `docs/guides/products/drug/pilot-en-design/translations/otc-en-translations-{lactobacillus-acidophilus-300mg, alfacalcidol-0.5mcg-softcap, acetylcysteine-100mg-capsule, naproxen-sodium-275mg-jeong}-v1.json`
- dry-run 증거: `src/scripts/data/otc-en-complete-<group>.dryrun-pass.json` (4건).

---

## 4. 독립검증 (별도 쿼리 패스 · read-only)

산출: `apps/api-server/src/scripts/otc-batch8-bundleA-verify.ts` → `src/scripts/data/otc-batch8-bundleA-verify.json` — **4그룹 전량 PASS (13/13 체크)**

| 그룹 | ko canon1 / authored / source_ref 일치 / easy deprecated / easy 잔존 canonical | audit rows | 형제(대상 밖 coarse) still_easy / authored | en canonical / nr / distinct md5 / dup |
|---|---|:-:|---|---|
| 락토바실루스 300mg | 13 / 13 / 13 / 13 / **0** | 13 | 0 / **0** | 13 / 0 / 1 / 0 |
| 알파칼시돌 0.5μg | 12 / 12 / 12 / 12 / **0** | 12 | 17 / **0** | 12 / 0 / 1 / 0 |
| 아세틸시스테인 100mg | 9 / 9 / 9 / 9 / **0** | 9 | 9 / **0** | 9 / 0 / 1 / 0 |
| 나프록센나트륨 275mg | 8 / 8 / 8 / 8 / **0** | 8 | 88 / **0** | 8 / 0 / 1 / 0 |

- `canonicalDup = 0` (ko·en 모두, 전 그룹).
- 제외/형제 master **전량 미접촉**(여전히 easy canonical, authored 승격 0).
- 대상 `target_master_ids` == 감사 SSOT (전 그룹).

---

## 5. write 합계 (실제 == 예상)

| 그룹 | T | ko (4T) | en (2T) | 소계 (6T) |
|---|:-:|:-:|:-:|:-:|
| 락토바실루스아시도필루스균 300mg 캡슐 | 13 | 52 | 26 | **78** |
| 알파칼시돌 0.5μg 연질캡슐 | 12 | 48 | 24 | **72** |
| 아세틸시스테인 100mg 캡슐 | 9 | 36 | 18 | **54** |
| 나프록센나트륨 275mg 정 | 8 | 32 | 16 | **48** |
| **합계** | **42** | **168** | **84** | **252** |

WO 예상치(ko 168 / en 84 / total 252)와 **완전일치**. 초과·누락 write 0.

---

## 6. 산출물 / 변경 파일

**신규 스크립트(read-only 조사·검증)**
- `apps/api-server/src/scripts/otc-batch8-bundleA-fp-harvest.ts` — excludeFp 하베스트 + 감사 target ID 대조
- `apps/api-server/src/scripts/otc-batch8-bundleA-en-probe.ts` — EN byte-identical 선증명
- `apps/api-server/src/scripts/otc-batch8-bundleA-verify.ts` — 독립검증

**runner 등재(데이터 전용 — 로직·fingerprint 산식·정책 무변경)**
- `apps/api-server/src/scripts/drug-otc-grounded-upgrade-runner.ts` — `GROUP_REGISTRY` 4그룹 추가 (`--selftest` 14건 PASS)
- `apps/api-server/src/scripts/drug-otc-en-complete-runner.ts` — `EN_REGISTRY` 4그룹 추가

**번역(마스터 발췌) 4종 · 실행 증거 JSON**
- `docs/guides/products/drug/pilot-en-design/translations/otc-en-translations-*-v1.json` (4)
- `apps/api-server/src/scripts/data/otc-grounded-upgrade-*.{dryrun-pass,run}.json` (4쌍)
- `apps/api-server/src/scripts/data/otc-en-complete-*.{dryrun-pass,run}.json` (4쌍)
- `apps/api-server/src/scripts/data/otc-batch8-bundleA-{fp-harvest,verify}.json`

---

## 7. 준수 확인

- 중지조건 해당 0건(target 수 불일치·fp 재현 실패·easy canonical 정확히1 불일치·authored 충돌·canonicalDup·postVerify 실패·EN byte-identical 실패·형제 변형 — 전부 미발생).
- 에이전트 다 번들(트리메부틴 200mg·메코발라민 500μg·덱스판테놀 100mg·폴산 1mg) 및 기완료 그룹 **미접촉**.
- runner 로직 무변경(등재 데이터만 추가) · 이중게이트 준수 · dry-run 선행 · 단일 TX + TX 내 사후검증 · 재실행 no-op 확인.
