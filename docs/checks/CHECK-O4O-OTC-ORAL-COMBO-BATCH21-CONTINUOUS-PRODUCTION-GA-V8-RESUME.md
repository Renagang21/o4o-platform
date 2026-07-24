# CHECK — OTC 경구 복합성분 연속 생산 GA-V8 batch21 (RESUME)

**WO:** WO-O4O-OTC-ORAL-COMBO-BATCH21-CONTINUOUS-PRODUCTION-GA-V8-RESUME
**에이전트:** 가 (Drug OTC) · **기계:** sohae · **일자:** 2026-07-25
**상태:** PASS — batch21 **25 fp / 86 master** KO+EN STORE canonical LIVE, 독립검증 GREEN, 재실행 no-op.

## 1. 선정 (READY offset 0 of post-batch20 pool)

batch20 apply 후 READY 재산출: 234 pickable / 713 pending(size3 ×223·size4 ×11). batch20 fp(25) ∩ batch21(25) = **0**. batch21 = size 내림차순 상위 25(size4 ×11 + size3 ×14 = 86 master).

치료군: 종합비타민/미네랄·비타민 D·칼슘·마그네슘·조혈(철) 복합(A11/A12/B03AE ×21) · 제산/소화(A02AD·A02AX ×4). sourceType: `A11/A12/A13A/B03AE`→`mfds_drug_otc_nutrition_combo`, 그 외(A02AD01·A02AX)→`mfds_drug_otc`.

## 2. 콘텐츠 충실성 (원문 보존 — 신규 의료 사실 0)

deterministic KO composer(공식 easy_drug → sd-* content_json 충실 재구성) + EN 그룹별 손저작(로마자 title, 무검증 기계번역 미적용). 보존 안전정보:
- **6세 이하 철분 과량 치명적 중독 경고**: 헤모퀸탑연질캡슐.
- **비타민 A ≥5,000 IU 선천 기형 + 임신 3개월 내 금기**: 나노민·테스톤지플러스·메모론에스.
- **아스파탐/페닐케톤뇨증 경고**: 칼디텍츄어블정.
- **비타민 B12 결핍성 악성빈혈 금기 경고**: 네프비타정.
- **대두유/콩/땅콩 과민 금기**: 센도스·헤모퀸탑·조인탑200·칼시맥스500·알부골드·바이타민마하·나노민·테스톤지플러스.
- **레보도파 병용 금기**: 프로콘틴600·네프비타·비타포린·조인본콘드로800·조인탑200·비스콘틴800·알부골드·에코파워600·바이타민마하 등.
- **제산제(잔타뉴·위앤·보위황·툴스속편)**: 7세 이하·투석 금기, 테트라사이클린 병용금지; 툴스속편 = 고마그네슘/고인산/장폐색/충수염/임신초기 금기 + 디곡신 등 약물 재흡수 상호작용 + 알루미늄 제산제 복용간격, 보위황 = 나트륨 제한식이 주의 — 전량 보존.
- **고칼슘혈증·유육종증·신장결석·신부전 금기 + 강심배당체 병용주의**(비타민D/칼슘 복합 공통). 연령 경계·용량·횟수·기간, 임신/수유/소아/고령 경고 전량 보존. 약사 상담 안내 유지. 효능·금기 약화 0, 제품 간 조성·경로 혼합 0.

## 3. claim 교집합 0

기존 가 tracked done fp(312, batch20 포함) ∩ batch21(25) = **0**. 나(SAFETY_MISMATCH)·다(첩부제) 완결분은 authored SPD 보유 → pool-regen `pending===size` + prodscreen `authored===0` 이중 제외로 census 진입 불가 → 교집합 0.

## 4. 실행 결과 (master당 6T = KO 4T + EN 2T, 배치 516 T)

| 단계 | 결과 |
|------|------|
| KO compose ×25 | 25/25 · skip 0 |
| KO dry-run / apply ×25 | 25/25 PASS / APPLIED · writePlan==writeActual · dup 0 = **344 T** |
| EN dry-run / apply ×25 | 25/25 PASS(한글 leak 0) / APPLIED = **172 T** |
| KO/EN 재실행 no-op | ALREADY_COMPLETE · dbWrite 0 |

## 5. 독립 검증 (runner 밖 직접 DB, 86 master)

| 항목 | 값 | 판정 |
|------|----|----|
| 대상 distinct master | 86 | — |
| KO authored canonical STORE | 86 | OK |
| EN canonical STORE | 86 | OK |
| EN needs_review 잔여 | 0 | OK |
| KO/EN canonicalDup | 0 / 0 | OK |
| easy 원문 deprecated | 86 | OK (전량 교체) |
| easy 원문 잔여 canonical | 0 | OK |

## 6. 중지 조건 점검

target/fingerprint/source 불일치 0 · 조성 혼합 0 · writePlan≠writeActual 0 · canonicalDup 0 · target 밖 write 0 · 기존 LIVE drift 0 · audit 누락 0 · rollback 0 · DB/인증/프록시 장애 0 · claim 교집합 0 → **중지 조건 미발동.**

## 7. 잔여 및 다음

- batch21 후 READY 잔여: 234 − 25 = **209 fp**(pending master 713 − 86 = **627**). size3 ×209·size4 ×0.
- 다음 재시작: **batch22** (READY 재산출 후 offset 0, 전량 size3). 동일 sohae 파이프라인.
- GA-V8 누계(batch20+21): **50 fp / 189 master** KO+EN LIVE.
