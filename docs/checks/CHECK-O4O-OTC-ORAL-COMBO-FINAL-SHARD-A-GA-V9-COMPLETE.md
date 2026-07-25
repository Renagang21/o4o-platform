# CHECK — OTC 경구 복합성분 FINAL SHARD-A GA-V9 **완결(COMPLETE)**

**WO:** WO-O4O-OTC-ORAL-COMBO-FINAL-SHARD-A-GA-V9 · 에이전트 가 · 기계 sohae · 2026-07-25
**상태:** **DONE — shard A 전량 70 fp / 210 master KO+EN STORE canonical LIVE.** 독립검증 GREEN, 전체 no-op, write-owner 나에게 인계.

## 1. shard 분할 SSOT

READY 209fp/627master LPT master-균형 3분할: **A 70/210(가) · B 70/210(나) · C 69/207(다)**. 결정론(master DESC, fp ASC → least-loaded, tie A<B<C). SSOT=`otc-combo-shard-assignment-ga-v9.json`(commit d4ad68c70) + `shardAStatus: DONE` 갱신.

## 2. shard A 배치 (batch22~24)

| batch | fp | master | commit |
|---|---:|---:|---|
| batch22 | 25 | 75 | 3bc284ffb |
| batch23 | 25 | 75 | 35fe97ddd |
| batch24 | 20 | 60 | (본 commit) |
| **합계** | **70** | **210** | — |

치료군: 종합비타민(A/D/E/B/C)·비타민D·칼슘·마그네슘·조혈(철)·자양강장·제산(알마게이트·유니자임·잔타뉴 등) 복합. sourceType: `A11/A12/A13A/B03AE`→`nutrition_combo`, 그 외(A02A·A09AA 등)→`mfds_drug_otc`.

## 3. 적용 계약 결과 (master당 6T = KO 4T + EN 2T)

- KO write(교체): 210 master × 4T = **840 T** (easy canonical→deprecated / authored ko canonical INSERT+flip / audit).
- EN write(신규): 210 master × 2T = **420 T**.
- writePlan == writeActual (전 배치). canonicalDup 0 · target 밖 write 0 · LIVE drift 0.

## 4. 독립 검증 (runner 밖 직접 DB, shard A 전량 210 master)

| 항목 | 값 | 판정 |
|------|----|----|
| shard A distinct master | 210 | — |
| KO authored canonical STORE | 210 | OK |
| EN canonical STORE | 210 | OK |
| EN needs_review 잔여 | 0 | OK |
| easy 원문 deprecated | 210 | OK (전량 교체) |
| easy 원문 잔여 canonical | 0 | OK |
| KO/EN canonicalDup | 0 / 0 | OK |
| canonical_replaced audit | 210 | OK (= master) |

## 5. 전체 no-op

batch22·23·24 재실행(KO/EN --apply) → **전량 ALREADY_COMPLETE · dbWrite 0.** 재실행 안전 확인.

## 6. 콘텐츠 안전정보 보존 (신규 의료 사실 0)

deterministic KO composer(공식 easy_drug 원문 충실 재구성) + EN 그룹별 손저작(로마자 title, 무검증 기계번역 미적용). 보존: 비타민 A ≥5,000 IU 임신 경고 · 6세 이하 철분 중독 경고 · 아스파탐/PKU · 혈색소증·윌슨병·고칼륨혈증 금기 · 대두유/콩/땅콩 과민 금기 · 레보도파 병용금기 · 알마게이트 특이금기(알츠하이머·임신중독증·미진단 소화기출혈) · 감초 가성알도스테론증 · 간성뇌증 금기 · 고칼슘혈증·신장결석·강심배당체 병용주의. 연령·용량·임신/수유/소아/고령 경고 전량 보존. 약사 상담 유지. 효능·금기 약화 0, 조성·경로 혼합 0.

## 7. 중지 조건 미발동

target/fp/source 불일치 0 · 조성 혼합 0 · writePlan≠writeActual 0 · canonicalDup 0 · target 밖 write 0 · LIVE drift 0 · audit 누락 0 · rollback 0 · claim 교집합 0.

## 8. write-owner 인계

- shard A LIVE write 완료 · 전량 검증 · 전체 no-op · commit · push 완료.
- **write-owner 가 → 나 명시적 인계** (SSOT `shardAStatus.writeOwnerHandoff`). 나는 shard B(70fp/210m), 다는 shard C(69fp/207m) 진행 가능.
- 전체 READY 잔여(shard B+C): 139 fp / 417 master (나·다 담당).
