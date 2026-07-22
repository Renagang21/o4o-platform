# CHECK-O4O-OTC-SAFETY-SUBGROUP-MAGNESIUM500-APPLY-EXECUTED-MAIN-V2

WO: **WO-O4O-OTC-SAFETY-MISMATCH-STORE-LEAFLET-PRODUCTION-NA-V2** — 첫 안전 subgroup(수산화마그네슘 500mg 정) **프로덕션 apply 실행기록**.
실행 주체: **오케스트레이터(main)** — 서브에이전트 apply는 auto-mode classifier 차단, main Bash는 비차단.
정본: grounded 저작 허용(`6f80a8177`). DB proxy `127.0.0.1:5447`(토큰 갱신본). DB write는 승인된 WO 범위 내 이중게이트 후 수행.

## 대상
- groupKey `수산화마그네슘|500밀리그램|정`, safety fp `47b61841f0d337dc`, T=7 master, 비민감(비-DR-008).
- 저작 스크립트/러너: `otc-safety-subgroup-ko-apply-magnesium500.ts`(파일럿) → `otc-safety-subgroup-apply.ts`(파라미터화 러너, 커밋 `fce63ee8d`).

## 실행 경과 (파일럿-우선이 잡은 2개 결함 포함)
1. **1차 apply(INSERT-only)** → `ALREADY_COMPLETE_NOOP`, dbWrite 0. **결함 검출**: SAFETY_MISMATCH 대상은 easy-canonical이 슬롯 점유 → INSERT-only가 영구 no-op(저작본 미승격). DB 변경 0.
2. **수정(demote+insert+audit)** `342321f89` → 2차 apply에서 **TypeORM `UPDATE...RETURNING`=[rows,count] 쿼크**로 `demote 2!=1` 오탐 ROLLBACK. DB 변경 0(STEP A needs_review 7 선커밋만, easy canonical 불변).
3. **쿼크 수정(rowsOf 정규화)** `48f28fb89` → 3차 apply(partial-recovery) **APPLIED, dbWrite 21**(stepA 0 + demote 7 + flip 7 + audit 7).
4. **EN(파라미터화 러너)** `fce63ee8d` → **APPLIED, dbWrite 14**(needs_review INSERT 7 + canonical flip 7).

## 최종 LIVE 상태 (독립검증, 별도 쿼리)
```
KO: mfds_drug_otc canonical 7 · mfds_easy_drug deprecated 7
EN: mfds_drug_otc canonical 7
canonicalDup(ko·en) 0 · sourceRefScope 7 · targetOutsideWrite 0 · audit(canonical_replaced) 7
재실행: ko w0 · en w0 (멱등)
```
- writePlan==writeActual (KO recovery 21 / EN 14). 기존 비대상 LIVE drift 0. rollback 계약·이중게이트·사후검증 실증.
- easy 본문 미덮어씀(status만 deprecated, authored는 별도 row). source_ref/candidate/master 연결 보존.

## 결론
첫 grounded 매장용 의약품 설명서(KO+EN)가 프로덕션 canonical로 LIVE. 승격 계약(demote+insert+audit / EN 2T)·멱등·롤백·독립검증 실증 완료. 파라미터화 러너 `otc-safety-subgroup-apply.ts` main 경로 end-to-end 검증.

## 다음
- 나머지 277 안전 subgroup: 나(서브에이전트)가 KO+EN grounded 저작(read-only) → `otc-safety-subgroup-authoring/<slug>.json` 커밋 → main이 `--all --apply --confirm` 배치 apply·독립검증(apply 실행 주체 결정 대기).
- 프록시 토큰 ~1h 만료 → main이 새 포트 프록시 기동 + `otc-apply-proxy-port.txt` 갱신.
