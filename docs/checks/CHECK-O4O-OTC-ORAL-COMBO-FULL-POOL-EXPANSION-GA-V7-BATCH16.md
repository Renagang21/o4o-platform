# CHECK — OTC 경구 복합성분 전체 풀 확장 + 연속 생산 GA-V7 batch16

**WO:** WO-O4O-OTC-ORAL-COMBO-BATCH16-AND-FULL-POOL-EXPANSION-GA-V7
**에이전트:** 가 (Drug OTC)
**일자:** 2026-07-24
**상태:** PASS — 스크리너 slice 상한 제거 · 전체 712 fp 재분류 · batch16 25그룹 / 114 master KO+EN STORE canonical LIVE, 독립검증 GREEN, 재실행 no-op

---

## 1. 범위

V6-2 재개분(batch13~15, 60그룹 / 483 master, 최종 `fd1643381`) 이후 GA-V7 배치. 두 축을 함께 수행했다.

1. **스크리너 전수 확장** — pool-regeneration의 `candidates.slice(0,300)` 상한을 제거하고 전체 풀을 실제 재산출·재분류.
2. **batch16 연속 생산** — 재분류된 READY 전량 중 상위 25그룹(114 master)을 KO+EN canonical로 생산.

기존 스크리너는 상위 300 후보만 보았으므로 WO가 인용한 "READY 잔여 77그룹"은 top-300 아티팩트였다. 상한 제거 후 실제 READY 는 **351그룹**이다(아래 §4).

## 2. 스크리너 slice 상한 제거

- 신규 스크리너 `otc-combo-pool-regen.ga.v7.mjs` — v5의 `candidates.slice(0,300)` 제한 제거, 전체 후보 census 산출(구조 census 로직 무변경, 커버 범위만 확장).
- 커밋 `712101b9a`.

## 3. 전체 풀 실제 재산출

| 항목 | 값 |
|------|----|
| 전체 fingerprint | 712 |
| pending master | 2,996 |

(WO 인용 772 fp / 3,479 pending 은 상한 존재 시점의 추정치. 상한 제거 후 `pending===size` 필터 기준 실측 = 712 fp / 2,996 master.)

## 4. 전체 712 fp 재분류 (READY / HOLD / EXCLUDE / SPLIT)

`otc-oral-combo-screen.ga.v6.mjs` 4-way verdict 를 전체 712 fp 에 적용.

| verdict | 그룹 | 비고 |
|---------|-----:|------|
| **READY** | 351 | 즉시 KO+EN 생산 가능 (READY master 합계 1,193) |
| HOLD | 22 | grounding 부족·라벨 모호 — 저작 보류 |
| EXCLUDE | 338 | 경로/제형 불일치·단일성분·비대상 등 자동 제외 |
| SPLIT | 1 | 조성·투여경로 상이 → subgroup 분리 필요 |

## 5. batch16 선정 그룹 (25 fp / 114 master)

재분류 READY 351그룹 중 batch13~15의 60그룹을 제외한 나머지의 size 상위 25그룹(size 5 ×14, size 4 ×11 = 114 master).

| fp | 대표명 | ATC | master |
|----|--------|-----|-------:|
| b7e84bfad150d52b | 하이스탈정 | A02AX | 5 |
| bebeb38e1b2b13de | 삐콤씨파워정 | A11BA | 5 |
| c09484d695fa71d2 | 콘티포르테정 | A11EX | 5 |
| d1710e8ea554557b | 덴티골드캡슐 | A01AD | 5 |
| d393b492c5de3da0 | 이튼튼캡슐 | A01AD | 5 |
| d7f61ed1a5341c66 | 노시드정 | A02AX | 5 |
| e5ecb6b594d33142 | 삐콤씨액티브정 | A11JA | 5 |
| eebe707f8213e2c3 | 미네서플라이정 | A11GB | 5 |
| f0dc37bed8ed92f6 | 쎄레톱씨연질캡슐 | A11JB | 5 |
| f25f8b3364ada004 | 루비돌플러스캡슐 | A01AD | 5 |
| f54123ac91e31665 | 파워본연질캡슐 | A12AX | 5 |
| f9129458bb5fc2b4 | 동성정로환에프환 | A07XA | 5 |
| f945e10ed339a0c4 | 마비스연질캡슐 | A11JC | 5 |
| fc13fa50134f4291 | 베아라제정 | A09AA | 5 |
| 001a6bbf6bed2f12 | 마그원매코정 | A11JC | 4 |
| 014ebc15802dbcc6 | 엑스프리벤정 | A11JC | 4 |
| 063b685facd455e5 | 덴타민캡슐 | A01AD | 4 |
| 0759da4951d62fb8 | 파워톤연질캡슐 | A11JA | 4 |
| 085b49eaed380f58 | 케라티모캡슐 | D11AX | 4 |
| 08f316b54793d40d | 마그킹코발정 | A11JC | 4 |
| 08f96bba598703cf | 원기쏘플러스정 | A09A | 4 |
| 09f03fde4e1d8c03 | 아로나민케어디엠정 | A11JC | 4 |
| 0fa53a993de0d9fa | 콘트로본600정 | A11EX | 4 |
| 127fc7216221bc6c | 레모나씨플러스정 | A11EX | 4 |
| 12c721b6c7f27c49 | 엑세라민엑소정 | A11EX | 4 |

치료군: 비타민·미네랄 보급(A11/A12 ×15) · 치주염 보조(A01AD ×4) · 소화기(A02/A09 ×4) · 지사·정장(A07 ×1) · 모발(D11 ×1).

`sourceType` — `mfds_drug_otc` 10그룹, `mfds_drug_otc_nutrition_combo` 15그룹.

## 6. claim 교집합 0

- 나(SAFETY_MISMATCH) claim ∩ batch16 fp/master = **0**
- 다(첩부제 DA-V8/V9) claim ∩ batch16 fp/master = **0**
- 기존 가 claim fp ∩ batch16 fp(25) = **0**
- pool 필터 `pending===size` 가 타 트랙 선점분을 배제한다.

## 7. 생산 파이프 (무변경 재사용)

- **KO:** `otc-combo-ko-compose.ga.v6.mjs` — batch12~15와 동일, 의료 로직 무변경. easy_drug 공식 원문 → `content_json` 충실 재구성(신규 의료 사실 0, 효능·금기·주의 약화 0, 약사 상담 안내 유지).
- **EN:** `otc-oral-combo-leaflet-en-batch16.ga.json` 저작 후 config 각 그룹 `en` 블록 병합. 수치·연령·금기·상호작용·페닐케톤뇨 아스파탐 경고·철분 중독 경고(레모나씨플러스)·상담연결 보존, 한글 렌더 0(`groupKey` 제외), summaryTable 3축.
- **runner:** `otc-oral-combo-store-leaflet-runner.ga.ts` 무변경, 이중게이트 `--apply` + `OTC_COMBO_LEAFLET_{KO,EN}_CONFIRM=YES`.

## 8. 실행 결과

| 단계 | 결과 |
|------|------|
| KO dry-run ×25 | 전부 PASS · 이상 0 |
| KO apply ×25 | 전부 APPLIED · authoredConflict 0 = **456 T** (master당 4T) |
| KO 재실행(no-op) | 전부 ALREADY_COMPLETE · dbWrite 0 |
| EN dry-run ×25 | 전부 PASS · koFingerprintKinds 전부 1 · existingEn 0 |
| EN apply ×25 | 전부 APPLIED · plan == actual · step1_inserted 114 / step2_flipped 114 = **228 T** · koUnchanged true ×25 · dup 0 ×25 |
| EN 재실행(no-op) | 전부 ALREADY_COMPLETE · dbWrite 0 |

master당 총 **6T** (KO 4T + EN 2T), 배치 합 **684 T**.

## 9. 독립 검증 (runner 밖 직접 DB 쿼리, 114 master)

| 항목 | 값 | 판정 |
|------|----|----|
| 대상 distinct master | 114 | — |
| KO authored canonical STORE (내 fp 앵커) | 114 | OK |
| EN canonical STORE | 114 | OK |
| EN needs_review 잔여 | 0 | OK |
| canonicalDup (master/type/lang) | 0 | OK |
| EN target 밖 drift (내 fp 앵커 ∧ 비대상 master) | 0 | OK |
| KO target 밖 drift | 0 | OK |
| easy 원문 잔여 canonical | 0 | OK (전량 deprecated) |

## 10. 중지 조건 점검

타 claim 교집합 0 / source·fingerprint 불일치 0 / writePlan≠writeActual 0 / canonicalDup 0 / target 밖 write 0 / 기존 LIVE drift 0 / audit 누락 0 / rollback 발동 0 / DB·스키마·인증 장애 0 / 동일 오류 반복 0 → **중지 조건 미발동.**

## 11. 누계 및 후속

| 항목 | batch13 | batch14 | batch15 | batch16 | **재개 누계** |
|------|--------:|--------:|--------:|--------:|-----------:|
| fp | 20 | 20 | 20 | 25 | **85** |
| master | 269 | 114 | 100 | 114 | **597** |
| write T | 1,614 | 684 | 600 | 684 | **3,582** |

- 전체 재분류 READY 351그룹 중 batch13~16 누계 85그룹 처리 → **잔여 READY 266그룹** 상위부터 batch17+ 연속 생산 대상.
- 스크리너 상한 제거로 전체 712 fp census 완료 — 후속 배치는 재산출 불필요.
