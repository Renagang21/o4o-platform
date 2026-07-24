# CHECK — OTC 경구 복합성분 연속 생산 GA-V7 batch17

**WO:** WO-O4O-OTC-ORAL-COMBO-BATCH16-AND-FULL-POOL-EXPANSION-GA-V7
**에이전트:** 가 (Drug OTC)
**일자:** 2026-07-24
**상태:** PASS — batch17 25그룹 / 100 master KO+EN STORE canonical LIVE, 독립검증 GREEN, 재실행 no-op

---

## 1. 범위

batch16(25그룹 / 114 master, `e136b8766`) 이후 GA-V7 연속 생산 배치. 스크리너 slice 상한은 batch16에서 이미 제거(`712101b9a`)되어 전체 712 fp census 완료 상태이므로, batch17은 재산출 없이 재분류된 READY 351그룹 중 미처리분에서 상위 25그룹을 생산했다.

## 2. batch17 선정 그룹 (25 fp / 100 master, 전부 size 4)

| fp | 대표명 | ATC | master |
|----|--------|-----|-------:|
| 14454a4a8fa4c279 | 맥시라민에이정 | A11JC | 4 |
| 19620cb86ccc26e2 | 액티진맥스정 | A11JC | 4 |
| 1cffca51f742bf0b | 칼시롤정 | A12AX | 4 |
| 1de6385a4dd03a1e | 아로나민골드프리미엄정 | A11EX | 4 |
| 23646cc49126c07c | 디카본500정 | A12AX | 4 |
| 23766b9d9a97955a | 토비콤골드정 | A11JC | 4 |
| 24ba4176098374b8 | 칼디맥정 | A12AX | 4 |
| 2d55aded7a3f6d36 | 로페시콘츄정 | A07DA53 | 4 |
| 2debc17fab1c56f9 | 마그네스정 | A12CC | 4 |
| 2f22084af9dfa952 | 맥세렌디정 | A11CC55 | 4 |
| 30d703e80b47afb2 | 칼시마정 | A11CC55 | 4 |
| 30dd5847198cb416 | 복합유디리버연질캡슐 | A13A | 4 |
| 30fa9588213f669c | 비나폴로엑스트라연질캡슐 | A11AB | 4 |
| 32b4df64a0a52242 | 다이제스토정 | A09AA | 4 |
| 34cc6ad99d4408c0 | 레스톨캡슐 | A01AD | 4 |
| 36513c8609ca42b3 | 텐텐츄정 | A11AB | 4 |
| 3653a3158f691ba3 | 위엔자임듀얼정 | A09AA | 4 |
| 36a3e1c3de28c2f6 | 쎄토마연질캡슐 | A11JB | 4 |
| 3ba257da3d05b9df | 제노타에이캡슐 | A01AD | 4 |
| 3f2c9afe8f7389f3 | 헬씨민큐연질캡슐 | A11JA | 4 |
| 4254a1365b2c6470 | 헤모퀸골드엠프리미엄캡슐 | B03AE | 4 |
| 4264e0e5afaabae9 | 이가탄에프캡슐 | A01AD | 4 |
| 440424dc540fc606 | 칼비리아플러스정 | A12AX | 4 |
| 453753f682a6c0e8 | 비스칸비캡슐 | A07FA51 | 4 |
| 455ddab9c56a63ca | 카필러스캡슐 | D11AX | 4 |

치료군: 비타민·미네랄·칼슘 보급(A11/A12/A13 ×15) · 치주염 보조(A01AD ×4) · 소화기(A09AA ×2) · 지사(A07DA53 로페라마이드 ×1) · 정장(A07FA51 ×1) · 모발(D11AX ×1).

`sourceType` — ATC `A11/A12/A13A/B03AE` 접두 → `mfds_drug_otc_nutrition_combo`, 그 외(A01AD·A07·A09AA·D11AX) → `mfds_drug_otc`.

## 3. 콘텐츠 충실성 (원문 보존 — 신규 의료 사실 0)

공식 원문(easy_drug)의 효능·용법·금기·주의를 KO `content_json`으로 충실 재구성, EN은 KO를 1:1 번역하며 다음 안전정보를 보존했다.

- **비타민 A ≥5,000 IU 선천 기형 경고 + 임신 3개월 내 금기**: 맥시라민에이정 · 토비콤골드정 · 텐텐츄정 · 비나폴로엑스트라 · 헬씨민큐.
- **6세 이하 철분 과량 치명적 중독 경고(어린이 손 닿지 않는 곳 보관)**: 맥시라민에이정 · 헤모퀸골드엠프리미엄.
- **대두유/콩/땅콩 과민증 금기**: 복합유디리버 · 다이제스토 · 쎄토마 · 비나폴로엑스트라 · 헬씨민큐.
- **로페시콘츄정(로페라마이드)**: 38℃ 이상 고열·혈변/점액변 금기, 지사제 특성 명시.
- **카필러스캡슐**: 안드로겐성(유전성) 탈모·남성형 대머리 제외 명시.
- 모든 그룹에 매장 내 약사 상담 안내(GMP foot)를 유지, 효능·금기·주의 약화 0, 제품 간 조성·경로 혼합 0.

## 4. claim 교집합 0

- 나(SAFETY_MISMATCH) claim ∩ batch17 fp/master = **0**
- 다(첩부제 DA-V8/V9, `otc-combo-leaflet-*`) claim ∩ batch17(`otc-oral-combo-leaflet-*`) fp/master = **0**
- 기존 가 DONE claim fp ∩ batch17 fp(25) = **0**
- pool 필터 `pending===size` 가 타 트랙 선점분을 배제.

## 5. 실행 결과

| 단계 | 결과 |
|------|------|
| KO 저작(compose) ×25 | 25/25 · skip 0 |
| KO dry-run ×25 | 전부 PASS |
| KO apply ×25 | 전부 APPLIED · writePlan==writeActual · dup 0 = **400 T** (master당 4T) |
| KO 재실행(no-op) | 전부 ALREADY_COMPLETE · dbWrite 0 |
| EN dry-run ×25 | 전부 PASS (title 영문 교정 후) |
| EN apply ×25 | 전부 APPLIED = **200 T** (master당 2T) |
| EN 재실행(no-op) | 전부 ALREADY_COMPLETE · dbWrite 0 |

master당 총 **6T** (KO 4T + EN 2T), 배치 합 **600 T**.

> 초기 EN dry-run 25건이 `en 한글 포함`으로 ABORT — EN `title` 필드에 한글 제품명을 넣은 것이 원인(runner가 `title`을 `<h1>`으로 렌더). batch16 규약대로 `title`을 영문 로마자 표기(예: `Maxiramin A Tablet`)로 교정 후 재-merge → 25/25 PASS. `groupKey`(한글 유지)는 렌더 대상 아님.

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

| 항목 | batch16 | batch17 | **GA-V7 누계** |
|------|--------:|--------:|-------------:|
| fp | 25 | 25 | **50** |
| master | 114 | 100 | **214** |
| write T | 684 | 600 | **1,284** |

- 전체 재분류 READY 351그룹(1,193 master) 중 GA 누적 DONE 처리 후 **잔여 READY 301그룹 / 979 master**(size 4 ×76, size 3 ×225).
- WO 종료 조건 "신규 40 fp AND 400 master" 중 fp(50)는 충족, master(214)는 미도달 → batch18+ 연속 생산 지속.
