# CHECK — OTC 경구 복합성분 연속 생산 GA-V7 batch18

**WO:** WO-O4O-OTC-ORAL-COMBO-BATCH16-AND-FULL-POOL-EXPANSION-GA-V7
**에이전트:** 가 (Drug OTC)
**일자:** 2026-07-24
**상태:** PASS — batch18 25그룹 / 100 master KO+EN STORE canonical LIVE, 독립검증 GREEN, 재실행 no-op

---

## 1. 범위

batch17(25그룹 / 100 master, `d29af7f1a`) 이후 GA-V7 연속 생산 배치. 스크리너 slice 상한은 batch16에서 이미 제거(`712101b9a`)되어 전체 712 fp census 완료 상태이므로, batch18은 재산출 없이 재분류된 READY 잔여 중 상위 25그룹(전부 size 4)을 생산했다.

## 2. batch18 선정 그룹 (25 fp / 100 master, 전부 size 4)

| fp | 대표명 | ATC | master |
|----|--------|-----|-------:|
| 4e1151ef2d5fe10c | 디카본100정 | A12AX | 4 |
| 4ef62448ebb73b91 | 프리미엄미네코다정 | A12AX | 4 |
| 4fc096b175507a1d | 알미틴플러스정 | A02AX | 4 |
| 5006d5f6f18fdf9b | 랑스씨씨정 | D11AX | 4 |
| 576a17b04fc3ca8f | 아로나민실버프리미엄정 | A11AB | 4 |
| 5976a61b920a9636 | 제텐씨정 | A11JB | 4 |
| 5c2893cfdf6a4ad6 | 위편정 | A09A | 4 |
| 617fd90ccdf5cc53 | 마그벤연질캡슐 | A11JC | 4 |
| 62b7096e02a5fe1b | 마그엔지연질캡슐 | A11JC | 4 |
| 650e2fe675ef7cec | 임팩타민파워에이플러스정 | A11EX | 4 |
| 67e75d1a151e6acd | 알부라민연질캡슐 | A11JC | 4 |
| 68051835fe74d7ad | 맥스케어알파정 | A11JC | 4 |
| 68be768a3f5fdce5 | 웰타민연질캡슐 | A11JC | 4 |
| 6a02826e3af13106 | 위엔젤정 | A09AA | 4 |
| 6a07906c3b87ecaf | 비타코플러스연질캡슐 | A11BA | 4 |
| 6ebc495542e8337e | 바이오콘연질캡슐 | A11JC | 4 |
| 7179fbfb8e463f66 | 이젠이캡슐 | A01AD | 4 |
| 72d67a639e7f7ad2 | 임팩타민프리미엄원스정 | A11EX | 4 |
| 7344c40d7322d087 | 마이믹스정 | A11JA | 4 |
| 73eddd80a29e4df3 | 영비원정 | A11JB | 4 |
| 76a342e81bb95afb | 멀티큐텐플러스정 | A11AB | 4 |
| 77deb57445ed48b1 | 애드칼정 | A12AX | 4 |
| 7d05d7fe029702a5 | 마그넥신연질캡슐 | A11DB | 4 |
| 7de02f495f657d79 | 투엑스비콘드로800정 | A11JC | 4 |
| 80e91eb751950f82 | 케라네일캡슐 | D11AX | 4 |

치료군: 비타민·미네랄·칼슘 보급(A11/A12/A13/B03 계열 ×19) · 제산/소화기(A02AX·A09A·A09AA ×3) · 치주염 보조(A01AD ×1) · 모발·네일 보조(D11AX ×2).

`sourceType` — ATC `A11/A12/A13A/B03AE` 접두 → `mfds_drug_otc_nutrition_combo`, 그 외(A02AX·A09A·A09AA·A01AD·D11AX) → `mfds_drug_otc`.

## 3. 콘텐츠 충실성 (원문 보존 — 신규 의료 사실 0)

공식 원문(easy_drug)의 효능·용법·금기·주의를 KO `content_json`으로 충실 재구성, EN은 KO를 1:1 번역하며 다음 안전정보를 보존했다.

- **비타민 A ≥5,000 IU 선천 기형 경고 + 임신 3개월 내 금기**: 아로나민실버프리미엄정 · 임팩타민파워에이플러스정 · 웰타민연질캡슐 · 비타코플러스연질캡슐 · 멀티큐텐플러스정.
- **6세 이하 철분 과량 치명적 중독 경고(어린이 손 닿지 않는 곳 보관)**: 아로나민실버프리미엄정.
- **대두유/콩/땅콩 과민증 금기**: 마그벤 · 마그엔지 · 알부라민 · 웰타민 · 위엔젤 · 비타코플러스 · 바이오콘 · 마그넥신.
- **알미틴플러스정(제산제)**: 투석·고마그네슘혈증·고인산혈증·변비·장협착·급성 충수염·임신 3개월 내·7세 미만 금기, 알루미늄 제산제 복용 후 1~2시간 내 타약 회피 명시.
- **이젠이캡슐(치주염 보조)**: 15세 미만 금기, 계란 과민 이력 주의, 스티븐스-존슨 증후군·독성 표피 괴사용해 경고 보존.
- **케라네일캡슐(모발·네일)**: 남성형 대머리·반흔성 탈모·안드로겐성(유전성) 탈모·12세 미만 금기 명시.
- **멀티큐텐플러스정**: "정상 식사로 충분 공급되므로 1일 5,000 IU 초과 금지" 명시 + 고칼륨혈증 금기/주의.
- **애드칼정**: 저녁 식후 2정, 부족 시 아침·점심 각 1정, 1일 4정 초과 금지 용법 보존.
- **투엑스비콘드로800정**: 19세 이상 연령 제한 보존.
- 모든 그룹에 매장 내 약사 상담 안내(GMP foot)를 유지, 효능·금기·주의 약화 0, 제품 간 조성·경로 혼합 0.

## 4. claim 교집합 0

- 나(SAFETY_MISMATCH) claim ∩ batch18 fp/master = **0**
- 다(첩부제 DA-V8/V9, `otc-combo-leaflet-*`) claim ∩ batch18(`otc-oral-combo-leaflet-*`) fp/master = **0**
- 기존 가 DONE claim fp(batch16·17) ∩ batch18 fp(25) = **0**
- prep 스크립트가 da 교집합 가드(`da intersection` throw)로 사전 차단, pool 필터 `pending===size` 가 타 트랙 선점분을 배제.

## 5. 실행 결과

| 단계 | 결과 |
|------|------|
| KO 저작(compose) ×25 | 25/25 · skip 0 |
| KO dry-run ×25 | 전부 PASS |
| KO apply ×25 | 전부 APPLIED · writePlan==writeActual · dup 0 = **400 T** (master당 4T) |
| KO 재실행(no-op) | 전부 ALREADY_COMPLETE · dbWrite 0 |
| EN dry-run ×25 | 전부 PASS |
| EN apply ×25 | 전부 APPLIED = **200 T** (master당 2T) |
| EN 재실행(no-op) | 전부 ALREADY_COMPLETE · dbWrite 0 |

master당 총 **6T** (KO 4T + EN 2T), 배치 합 **600 T**. EN `title`은 batch17 규약대로 영문 로마자 표기(예: `Dicarbon 100 Tablet`)로 저작하여 `en 한글 포함` ABORT 없이 25/25 통과.

## 6. 독립 검증 (runner 밖 직접 DB 쿼리, 100 master)

| 항목 | 값 | 판정 |
|------|----|----|
| 대상 distinct master | 100 | — |
| KO authored canonical STORE (내 fp 앵커) | 100 | OK |
| EN canonical STORE | 100 | OK |
| EN needs_review 잔여 | 0 | OK |
| KO canonicalDup | 0 | OK |
| EN canonicalDup | 0 | OK |
| 앵커 밖 drift (내 fp 앵커 ∧ 비대상 master) | 0 | OK |
| easy 원문 잔여 canonical | 0 | OK (전량 deprecated) |

## 7. 중지 조건 점검

타 claim 교집합 0 / source·fingerprint 불일치 0 / writePlan≠writeActual 0 / canonicalDup 0 / target 밖 write 0 / 기존 LIVE drift 0 / audit 누락 0 / rollback 발동 0 / DB·스키마·인증 장애 0 / 동일 오류 반복 0 → **중지 조건 미발동.**

## 8. 누계 및 후속

| 항목 | batch16 | batch17 | batch18 | **GA-V7 누계** |
|------|--------:|--------:|--------:|-------------:|
| fp | 25 | 25 | 25 | **75** |
| master | 114 | 100 | 100 | **314** |
| write T | 684 | 600 | 600 | **1,884** |

- 전체 재분류 READY 잔여 중 GA 누적 DONE(75 fp) 처리 후 **잔여 READY 276그룹 / 879 master**(size 4 ×51, size 3 ×225).
- WO 종료 조건 "신규 40 fp AND 400 master" 중 fp(75)는 충족, master(314)는 미도달 → batch19 연속 생산 지속(예상 100 master → 414 도달, 종료 조건 충족 전망).
