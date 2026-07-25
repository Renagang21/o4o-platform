# CHECK — OTC 경구 복합성분 FINAL SHARD-A GA-V9 batch23

**WO:** WO-O4O-OTC-ORAL-COMBO-FINAL-SHARD-A-GA-V9 · 에이전트 가 · 기계 sohae · 2026-07-25
**상태:** PASS — shard-A batch23 **25 fp / 75 master** KO+EN STORE canonical LIVE, 독립검증 GREEN, 재실행 no-op. shard A 진행 50/70 fp (batch22+23), 잔여 20 fp — batch24로 완결 예정.

## 1. batch23 (shard A 26~50번째, 75 master)

종합비타민(B/C/D/E)·비타민D·칼슘·마그네슘·조혈(철)·제산(알마게이트 ×2·유니자임) 복합 25그룹. sourceType: `A11/A12/A13A/B03AE`→`nutrition_combo`, 그 외(알마게이트·유니자임 A02A)→`mfds_drug_otc`.

## 2. 콘텐츠 충실성 (원문 보존 — 신규 의료 사실 0)

deterministic KO composer + EN 손저작(로마자 title). 보존 안전정보:
- **비타민 A ≥5,000 IU 임신 금기**: 톨시렌·메가트루포커스.
- **6세 이하 철분 과량 중독 경고 + 혈색소증 금기**: 헤모포스.
- **대두유/콩/땅콩 과민 금기**: 벤티메가나이스·테라비타·모아칼·투와이스골드·엠지플러스큐·벤포액티브·렛잇비프로원.
- **레보도파 병용 금기**: 조인본골드·벤티메가나이스·엠지플러스큐·벤포액티브·빅콘에프600·비타씬플러스·비엘비·렛잇비프로원·구바파·메가트루포커스.
- **알마게이트(제산제) 특이 금기**: 알츠하이머병·치질·체액저류·임신중독증·미진단 소화기출혈·설사 금기, 테트라사이클린 병용금지, NSAID/디기탈리스/철염/살리실산염 상호작용 — 대웅바이오·일양바이오 알마게이트 전량 보존.
- **유니자임(제산제)**: 15세 미만·투석·임신/수유 금기, 감초/글리시리진산/이뇨제(가성알도스테론증)·근병증 경고 보존.
- **고칼륨혈증·알칼리증 금기**(아로나민케어HT). 고칼슘혈증·신장결석·강심배당체 병용주의(비타민D 공통). 연령·용량·임신/수유/소아/고령 경고 전량 보존. 약사 상담 유지. 효능·금기 약화 0, 조성·경로 혼합 0.

## 3. 실행 결과 (batch 450 T)

KO compose/dry-run/apply ×25 = 25/25 APPLIED (300 T) · EN dry-run/apply ×25 = 25/25 APPLIED(한글 leak 0, 150 T) · KO/EN 재실행 no-op ALREADY_COMPLETE.

## 4. 독립 검증 (75 master)

targets 75 · KO authored canonical 75 · EN canonical 75 · EN needs_review 0 · KO/EN dup 0 · easy deprecated 75 · easy 잔여 canonical 0 · audit == master 75. **GREEN.**

## 5. 중지 조건 미발동

target/fp/source 불일치 0 · 조성 혼합 0 · writePlan≠writeActual 0 · canonicalDup 0 · target 밖 write 0 · LIVE drift 0 · audit 누락 0 · rollback 0 · claim 교집합 0.

## 6. shard A 진행

- shard A 70 fp / 210 master. 완료: batch22(25/75) + batch23(25/75) = **50 fp / 150 master**.
- **잔여: 20 fp / 60 master → batch24로 완결.** 완결 후 전량 검증·full no-op·write-owner 나에게 인계.
