# CHECK-O4O-OTC-SAFETY-SUBGROUP-MAGNESIUM500-KO-NA-V2

WO: **WO-O4O-OTC-SAFETY-MISMATCH-APPLY-DEMOTE-INSERT-AUDIT-FIX-NA-V2** (에이전트 나) — 첫 저위험 subgroup apply 로직 정정.
정본: grounded 저작 허용(`6f80a8177`). DB proxy `127.0.0.1:5445`.
상태: **KO 저작 + 빌더 게이트 PASS + apply 로직 정정(demote+insert+audit) + dry-run PASS. 실제 apply 는 main 실행(자율 write 금지).**

## 설계 결함 → 정정
- **결함(main 파일럿 검출)**: SAFETY_MISMATCH 잔여 7 master 는 `mfds_easy_drug` **canonical 베이스라인**. 이전 `INSERT-only WHERE NOT EXISTS canonical` 은 easy 가 슬롯을 점유 → `planInsert=0` → 영구 no-op(저작본이 canonical 로 안 올라가고 소비자에겐 raw easy 만 노출). 파일럿 실행 결과 `existingKoCanonical:7, planInsert:0, ALREADY_COMPLETE_NOOP` — 아무것도 안 쓰였고 LIVE 불변.
- **정정**: batch-8 grounded-upgrade 러너 검증패턴(demote+insert+audit) 복제(공용 runner 미수정, 본 subgroup 스크립트에만).

## 대상 subgroup
- groupKey `수산화마그네슘|500밀리그램|정`, safety fp `47b61841f0d337dc`, **T=7**(전부 마그밀정), 공식 원문 easy md5 `0c8bcf57` 단일. 비민감(비-DR-008) → canonical flip.

## KO 저작 (grounded, 원문 외 의료사실 0 — 변경 없음, 본문 재저작 안 함)
공식 원문 효능·용법·주의·상호작용·이상반응·저장 **전 정보축 보존** 재구성. 질병명·허가효능 명확(위·십이지장궤양/위염/위산과다/변비), 수치 정확(2~5정 1~2.5g / 2~4정 1~2g), 금기·상호작용(테트라사이클린·우유알칼리증후군)·이상반응 강도 보존, 약사 footer(KO). 빌더 게이트 PASS(missing0·table0·주석0·sd-warn有·htmlLen1861).

## apply 계약 (정정본, 단일 TX)
1. 기존 `mfds_easy_drug` KO canonical 7 → **UPDATE status='deprecated'**(별도 row, easy 본문 덮어쓰지 않음).
2. authored KO canonical 7 **INSERT**(source_type=`mfds_drug_otc`, status='canonical'(STEP A needs_review→STEP B flip), source_ref=`a7d0e1c2-…` provenance).
3. `shared_product_description_audit_logs` **canonical_replaced 7**(metadata: targetMaster·beforeSource·afterSource·source_ref_id·groupKey·reason — batch-8 검증기 형식).
- 이중게이트: `--apply` + `OTC_SAFETY_SUBGROUP_CONFIRM=YES`. 민감(DR-008)=STEP A 만(needs_review 보류).
- **사후검증(하나라도 실패 시 전체 ROLLBACK)**: before easy canonical=7 & authored=0 → after easy deprecated=7 · authored canonical=7 · easy canonical 잔여 0 · audit=7 · canonicalDup(ko·en)=0 · source_ref scope==7 · target 밖 write=0 · EN canonical drift=0 · **writePlan==writeActual**.
- **재실행 no-op**: 이미 authored canonical & easy deprecated → STEP A insert 0 · STEP B per-master skip · write 0 (ALREADY_COMPLETE_NOOP).

## 2차 정정 (main 파일럿 재실행 검출) — TypeORM UPDATE...RETURNING quirk
- **결함**: TypeORM `query('UPDATE ... RETURNING id')` 는 `[rowsArray, affectedCount]` 튜플 반환 → `demote.length===2`(행수 아님) 오탐 → `demote 2!=1 → ABORT → ROLLBACK`. `flip` 도 동일(`flip[0]` 은 rows 배열, `flip[0].id` undefined). (INSERT...RETURNING 은 flat → STEP A·audit 정상.)
- **정정**: `const rows = Array.isArray(res[0]) ? res[0] : res;` 로 demote·flip 결과 정규화. 사후검증 카운트는 DB 재조회라 무영향.
- **partial-recovery 회계 정정**: STEP A 선커밋(7 needs_review)된 상태 재실행 시 STEP A 멱등 skip(insert 0) → writeActual=21(demote7+flip7+audit7)≠cumulative 28. → `writePlanThisRun = (T−authoredRowBefore) + 3×easyCanonBefore` 도입(fresh 28·recovery 21·noop 0), 사후검증은 `writeActual==writePlanThisRun`. cumulative `writePlan=28` 불변(회계).

## dry-run 결과 (write 0, 검증됨 — 현재 partial-recovery 상태)
`status: DRYRUN_PASS` · before `{easyCanonical:7, authoredKoCanonical:0, authoredRow:7(선커밋 needs_review 감지), enCanonical:0}` · `writePlan:28`(cumulative) · `writePlanThisRun:21`(recovery) · `reexecNoop:false` · anomalies 0 · html 1861. (RETURNING 정규화는 STEP B write 경로라 dry-run 미검증 → main 재실행으로 확인.)

## write 회계
- cumulative writePlan = **KO 4T = 28** (stepA insert 7 + easy demote 7 + authored flip 7 + audit 7). 현재 DB=partial-recovery → 재실행 writeActual **21**(stepA 0 재사용 + demote7+flip7+audit7). EN 은 별도 2T(후속).

## 실행 (main — 자율 write 금지, main 이 apply)
```
DB_PORT=5445 OTC_SAFETY_SUBGROUP_CONFIRM=YES npx tsx src/scripts/otc-safety-subgroup-ko-apply-magnesium500.ts --apply
```
기대(현재 partial-recovery): `status:APPLIED, dbWrite:21`(stepA 0 재사용 + demote7+flip7+audit7), `after{authoredKoCanonical:7, easyDeprecated:7, easyCanonicalLeft:0, audit:7, canonicalDupKo/En:0, sourceRefScopeMasters:7, targetOutsideWrite:0, enCanonical:0}`. 이후 재실행 → `ALREADY_COMPLETE_NOOP, dbWrite:0`. (완전 fresh 였다면 dbWrite:28.)

## 산출물
- apply 스크립트(정정): `apps/api-server/src/scripts/otc-safety-subgroup-ko-apply-magnesium500.ts`
- 저작 content_json + 렌더 HTML: `apps/api-server/src/scripts/data/otc-safety-subgroup-magnesium500-ko-render.json`
- 렌더 검증기: `apps/api-server/src/scripts/otc-safety-subgroup-ko-render-preview.ts`
- 인벤토리 SSOT: `otc-safety-subgroup-authoring-inventory-v1.json`(`98c4e6f6c`).
- 동일 결함 복제 스크립트: **없음**(apply 로직 보유 스크립트는 magnesium500 단 1개, inventory·render-preview 는 write 경로 없음).
- 이 세션 DB write 0(apply 미실행). 기존 LIVE 미접촉.
