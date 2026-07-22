# CHECK-O4O-OTC-SAFETY-SUBGROUP-RUNNER-KO-EN-NA-V2

WO: **WO-O4O-OTC-SAFETY-MISMATCH-STORE-LEAFLET-PRODUCTION-NA-V2** (에이전트 나) — 파라미터화 자가 스트림 러너(옵션 2).
정본: grounded 저작 허용(`6f80a8177`). 파일럿 KO 는 main 이 LIVE 독립검증 완료(7 authored canonical + 7 easy deprecated · dup0 · audit7 · outside0 · 재실행 dbWrite0).
상태: **러너 신설 + no-op 라벨 버그 수정 + EN(2T) 로직 + magnesium500 EN 저작 완료. dry-run 자기검증 PASS. 실제 apply 는 main/권한룰 후.**

## 1. 파라미터화 러너 `src/scripts/otc-safety-subgroup-apply.ts`
- 명령: `npx tsx src/scripts/otc-safety-subgroup-apply.ts --group <slug|groupKey> | --all [--lang ko|en|both] [--apply --confirm]` — **env 프리픽스 없음**(권한 패턴 `otc-safety-subgroup-apply*.ts` 매칭). dry-run 기본, write=`--apply --confirm` 둘 다.
- 포트: `src/scripts/data/otc-apply-proxy-port.txt`(현재 `5447`, main 갱신). 저작: `src/scripts/data/otc-safety-subgroup-authoring/<slug>.json`.
- KO 계약(파일럿 LIVE 검증본 이식, 공용 runner 미수정): 단일 TX ① easy canonical→deprecated ② authored canonical INSERT(needs_review→flip) ③ audit canonical_replaced. **TypeORM UPDATE...RETURNING=[rows,count] 정규화**(`rowsOf`). writePlanThisRun=(T−authoredRow)+3×easyCanon.
- 사후검증(실패 시 그 subgroup ROLLBACK+HOLD, 다음 진행): authored canonical=T·easy deprecated=T·easyLeft0·dup0(ko·en)·scope=T·audit=T·outside0·writePlan==writeActual.
- per-subgroup try/catch: 한 그룹 실패=HOLD, 나머지 계속. 전체중지 조건은 상위 오케스트레이션에서.

## 2. no-op 라벨 버그 수정 (검증됨)
- **버그**: 재실행 시 easy 가 deprecated 인데 균질 가드가 `status='canonical'` easy 조회 → 0행 → 허위 anomaly → `ABORT`(실제 dbWrite0인데).
- **수정**: `isNoop = (authoredCanonical==T)` 를 먼저 판정하고, **isNoop 이면 easy-md5-canonical 가드 skip**. dry-run 결과: `reexecNoop:true, status:ALREADY_COMPLETE_NOOP, dbWrite:0, anomalies:[]` (깔끔).

## 3. EN 계약 (2T, fresh)
- easy EN 없음(enCanonical 0) → demote 아님. **authored EN needs_review INSERT → canonical flip = 2T**. KO canonical 이 유일 번역기준(EN 시작 전 `koAuthoredCanonical==T` 확인, 미성립 시 EN 보류). buildDrugOtcEnConsumerHtml(sd-* 계약, GMP/약사 footer 자동 sd-foot). 한글 잔존 가드 · html 게이트.
- 사후검증: en canonical=T · enDup0 · en scope=T · outside0 · writePlanThisRun==writeActual. 재실행 no-op(en canonical==T → skip).
- magnesium500 EN 저작: 공식 원문/KO canonical 기준, KO 정보축 전부 보존(효능·용법 수치 1~2.5g/1~2g·2~5정/2~4정, 금기 신장애·설사, 상호작용 tetracycline·milk-alkali syndrome, 이상반응, 저장, 약사 문의), KO 외 fact 0. dry-run PASS(writePlanThisRun 14, 한글0, html 3113).

## 4. per-subgroup 워크플로우 (러너 구현)
grounding → KO dry-run → KO demote+insert+audit apply → 검증 → EN dry-run → EN insert+flip apply → 검증 → 재실행 no-op → CHECK/run/summary → path-specific commit·push → 다음.

## 5. DR-008 민감군
authoring `sensitive:true` → KO=STEP A(needs_review)만(canonical flip 금지, easy 유지), EN=보류(KO canonical 미성립). 러너에 분기 이식.

## dry-run 자기검증 (write 0)
`npx tsx src/scripts/otc-safety-subgroup-apply.ts --group magnesium500 --lang both` →
- KO `ALREADY_COMPLETE_NOOP`(before easy0/authored7, writePlanThisRun0, anomalies0) — no-op 수정 확인.
- EN `DRYRUN_PASS`(koAuthoredCanonical7, before enCanon0/enRow0, writePlan14/thisRun14, html3113, 한글0).

## main 실행 (검증·권한룰 후 자가 스트림)
```
npx tsx src/scripts/otc-safety-subgroup-apply.ts --group magnesium500 --lang en --apply --confirm
```
기대: EN `APPLIED, dbWrite:14, after{enCanonical1:7, enDup:0, sourceRefScopeMasters:7, targetOutsideWrite:0}`. 재실행 `ALREADY_COMPLETE_NOOP, dbWrite:0`. 이후 `--all --apply --confirm` 로 인벤토리 순서 스트림(신규 subgroup 저작 데이터 추가하며).

## 산출물
- 러너: `apps/api-server/src/scripts/otc-safety-subgroup-apply.ts`
- 포트: `apps/api-server/src/scripts/data/otc-apply-proxy-port.txt`
- 저작(KO+EN): `apps/api-server/src/scripts/data/otc-safety-subgroup-authoring/magnesium500.json`
- 파일럿(구): `otc-safety-subgroup-ko-apply-magnesium500.ts`(LIVE 검증 기록, 러너로 대체됨).
- 이 세션 DB write 0(apply 미실행, main 이 실행).
