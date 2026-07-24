# CHECK — OTC 경구 복합성분 잔여 연속 생산 GA-V6-2 batch14

**WO:** WO-O4O-OTC-ORAL-COMBO-REMAINDER-CONTINUOUS-PRODUCTION-GA-V6-2-RESUME
**에이전트:** 가 (Drug OTC)
**일자:** 2026-07-24
**상태:** PASS — batch14 20그룹 / 114 master KO+EN STORE canonical LIVE, 독립검증 GREEN, 재실행 no-op

---

## 1. 범위

batch13(20그룹 / 269 master, commit `338653a8a`) PASS 이후 **연속 생산 두 번째 배치**. 신규 조사·파일럿 없이 batch12~13에서 검증된 V6 composer·runner·검증 계약을 그대로 재사용했다.

선정 기준 = batch13 CHECK §4 스크린(상위 300 후보) 결과 READY 137그룹 중 batch13 20그룹을 제외한 117그룹의 size 상위 20그룹.

## 2. batch14 선정 그룹 (20 fp / 114 master)

| fp | 대표명 | ATC | master | 치료 내용 |
|----|--------|-----|-------:|-----------|
| e530d144f54871bf | 미니메이드정 | A08AX | 7 | 체중감량 보조 |
| ee28633e7a5eed1c | 트레스탄츄정 | A15 | 7 | 식욕부진 (씹어서 복용) |
| 1b7cccc0402d7dc8 | 모앤캡슐 | D11AX | 6 | 모발·손톱·탈모 보조 |
| 20d8ed89e214e81d | 훼스탈플러스정 | A09A | 6 | 소화불량 |
| 2e4225c9924b550a | 판다모캡슐 | D11AX | 6 | 모발·탈모 보조 |
| 3da722c81b581b0f | 이튼돌플러스캡슐 | A01AD | 6 | 치은염·치주염 보조 |
| 4fc49192468169d4 | 속편엔이중정 | A09A | 6 | 소화불량 |
| 57692a7723807e11 | 복합파자임이중정 | A09A | 6 | 소화불량 |
| 9053f22ece1b5ee7 | 트레스탄캡슐 | A15 | 6 | 식욕부진 |
| a7dd2657282f9587 | 덴티에프캡슐 | A01AD | 6 | 치주염 보조 |
| b1a39fa8d29232b8 | 이덴트플러스캡슐 | A01AD | 6 | 치주염 보조 |
| c506a7ed5f65c916 | 이모나캡슐 | A01AD | 6 | 치주염 보조 |
| 02eb435a230f204f | 이가덱스캡슐 | A01AD | 5 | 치주염 보조 |
| 1404759f012bc15d | 콜다운연질캡슐 | C10B | 5 | 고콜레스테롤·말초 혈행장애 |
| 25b075bfcd043094 | 아로마에프캡슐 | A01AD | 5 | 치주염 보조 |
| 2adaeff9ec92af65 | 큐자임정 | A09A | 5 | 소화불량·식욕부진 |
| 317acacfa802ee04 | 트랜미정 | D11AX | 5 | 기미 (트라넥삼산 금기 주의) |
| 32b68a4506229b67 | 베루본에스정 | A07AX | 5 | 설사 |
| 5c4f9cc44f44c115 | 카베진코와알파정 | A09A | 5 | 위부불쾌감·위산과다 |
| 600dcb9c85bdeef6 | 비올씨정 | A11EB | 5 | 비타민 B1·B2·B6·C 보급 |

치료군: 치주염 보조(A01AD ×6) · 소화기(A09A ×5) · 모발·색소(D11AX ×3) · 식욕부진(A15 ×2) · 체중감량 보조(A08AX) · 지질(C10B) · 지사(A07AX) · 비타민(A11EB).

`sourceType` — 19그룹 `mfds_drug_otc`, 1그룹(비올씨정) `mfds_drug_otc_nutrition_combo`.

## 3. claim 교집합 0

- 나(SAFETY_MISMATCH) claim ∩ batch14 fp/master = **0**
- 다(첩부제 DA-V8) claim ∩ batch14 fp/master = **0**
- 기존 가 claim fp(99) ∩ batch14 fp(20) = **0**
- 보강 검증: `src/scripts/data` 내 JSON 307개 전문에 대해 내 20 fp + 114 master UUID 토큰 스캔 → **hit 0**
- pool 필터 `pending===size` 자체가 타 트랙 선점분을 배제한다.

## 4. 생산 파이프 (무변경 재사용)

- **KO:** `otc-combo-ko-compose.ga.v6.mjs` — batch12~13과 동일, 의료 로직 무변경. easy_drug 공식 원문 → `content_json` 충실 재구성(신규 의료 사실 0, 효능·금기·주의 약화 0, 약사 상담 안내 유지).
- **EN:** `otc-oral-combo-leaflet-en-batch14.ga.json` 저작 후 config 각 그룹 `en` 블록 병합. 수치·연령·금기·상호작용·상담연결 보존, 한글 렌더 0, summaryTable 3축.
- **runner:** `otc-oral-combo-store-leaflet-runner.ga.ts` 무변경, 이중게이트 `--apply` + `OTC_COMBO_LEAFLET_{KO,EN}_CONFIRM=YES`.

## 5. 실행 결과

| 단계 | 결과 |
|------|------|
| KO dry-run ×20 | 전부 PASS · 이상 0 |
| KO apply ×20 | 전부 APPLIED · stepA_inserted 114 / flipped 114 / demoted 114 / audited 114 · authoredConflict 0 = **456 T** |
| KO 사후 | canonical1 114 / authored 114 / deprecatedEasy 114 / dup 0 |
| KO 재실행(no-op) | 전부 ALREADY_COMPLETE · dbWrite 0 |
| EN dry-run ×20 | 전부 PASS · 이상 0 · koFingerprintKinds 전부 1 · existingEn 0 |
| EN apply ×20 | 전부 APPLIED · plan == actual · step1 114 / step2 114 = **228 T** · koUnchanged true ×20 · dup 0 ×20 |
| EN 재실행(no-op) | 전부 ALREADY_COMPLETE · dbWrite 0 |

master당 총 **6T** (KO 4T + EN 2T), 배치 합 **684 T**.

## 6. 독립 검증 (runner 밖 직접 DB 쿼리, 114 master)

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

## 7. 중지 조건 점검

타 claim 교집합 0 / source·fingerprint 불일치 0 / writePlan≠writeActual 0 / canonicalDup 0 / target 밖 write 0 / 기존 LIVE drift 0 / audit 누락 0 / rollback 발동 0 / DB·스키마·인증 장애 0 / 동일 오류 반복 0 → **중지 조건 미발동.**

## 8. 누계 및 후속

| 항목 | batch13 | batch14 | **재개 누계** |
|------|--------:|--------:|-----------:|
| fp | 20 | 20 | **40** |
| master | 269 | 114 | **383** |
| write T | 1,614 | 684 | **2,298** |

- 종료 조건 "신규 40 fp **AND** 400 master" — fp 40 충족, master 383 미달 → **batch15 계속 진행.**
- 다음 재시작 지점 = 스크린 READY 137그룹 중 batch13·14의 40그룹을 제외한 **97그룹 / 422 master** 상위부터.
- 전체 772 fp 커버에는 `otc-combo-pool-regen.ga.v5.mjs` 의 `candidates.slice(0,300)` 상한 상향이 필요하다(batch13 CHECK §2).
