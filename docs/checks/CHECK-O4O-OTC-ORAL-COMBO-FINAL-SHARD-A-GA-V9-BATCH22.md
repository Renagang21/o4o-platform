# CHECK — OTC 경구 복합성분 FINAL SHARD-A GA-V9 batch22

**WO:** WO-O4O-OTC-ORAL-COMBO-FINAL-SHARD-A-GA-V9
**에이전트:** 가 (Drug OTC) · **기계:** sohae · **일자:** 2026-07-25
**상태:** PASS — shard-A batch22 **25 fp / 75 master** KO+EN STORE canonical LIVE, 독립검증 GREEN, 재실행 no-op. **shard A 부분 완료(25/70 fp) — WO 완료 아님, batch23+ 계속 필요.**

## 1. shard 분할 SSOT (선행 · commit d4ad68c70)

READY 209fp/627master LPT master-균형 3분할: **A 70fp/210m(가) · B 70fp/210m(나) · C 69fp/207m(다)**. 결정론(master DESC, fp ASC → least-loaded, tie A<B<C), 각 fp 정확히 1 shard, 교집합 0. SSOT=`otc-combo-shard-assignment-ga-v9.json`. shard A 단독 write-owner 확인(existing authored 0). shard A 선(先) apply.

## 2. batch22 (shard A 상위 25 by master, 75 master)

종합비타민(B/C/D/E)·비타민D·칼슘·마그네슘·조혈(철)·자양강장·제산 복합 25그룹. sourceType: `A11/A12/A13A/B03AE`→`mfds_drug_otc_nutrition_combo`, 그 외(A02AX 알마트린)→`mfds_drug_otc`.

## 3. 콘텐츠 충실성 (원문 보존 — 신규 의료 사실 0)

deterministic KO composer + EN 그룹별 손저작(로마자 title). 보존 안전정보:
- **비타민 A ≥5,000 IU 선천 기형 + 임신 3개월 금기**: 씨엠지뷰플러스·아이비즈헬스·파워쎈·진셀몬큐텐.
- **6세 이하 철분 과량 치명적 중독 경고**: 진셀몬큐텐·훼로모아.
- **혈색소증·헤모시데린침착증·비철결핍성 빈혈·윌슨병·고칼륨혈증 금기**(철 복합): 진셀몬큐텐·훼로모아.
- **대두유/콩/땅콩 과민 금기**: 뉴로친·마그토닉·씨엠지뷰플러스·고칼디·아이비즈헬스·파워쎈·차엠지.
- **레보도파 병용 금기**: 뉴로친·비타콤보·탑콘도르600·메가트루액티브·임팩타민프리미엄·파워쎈·차엠지·임팩타민·콘트라민 등.
- **간성뇌증(혼수) 금기·15세 미만 금기**(자양강장): 광동리버샷.
- **고칼슘혈증·유육종증·신장결석·신부전 금기 + 강심배당체 병용주의**(비타민D/칼슘 공통). 연령 경계·용량·횟수·기간, 임신/수유/소아/고령 경고 전량 보존. 약사 상담 유지. 효능·금기 약화 0, 제품 간 조성·경로 혼합 0.

## 4. 실행 결과 (master당 6T = KO 4T + EN 2T, 배치 450 T)

| 단계 | 결과 |
|------|------|
| KO compose/dry-run/apply ×25 | 25/25 APPLIED · writePlan==writeActual · dup 0 = **300 T** |
| EN dry-run/apply ×25 | 25/25 APPLIED(한글 leak 0) = **150 T** |
| KO/EN 재실행 no-op | ALREADY_COMPLETE · dbWrite 0 |

## 5. 독립 검증 (runner 밖 직접 DB, 75 master)

| 항목 | 값 | 판정 |
|------|----|----|
| 대상 distinct master | 75 | — |
| KO authored canonical STORE | 75 | OK |
| EN canonical STORE | 75 | OK |
| EN needs_review 잔여 | 0 | OK |
| KO/EN canonicalDup | 0 / 0 | OK |
| easy 원문 deprecated / 잔여 canonical | 75 / 0 | OK (전량 교체) |
| audit == master | 75 | OK |

## 6. 중지 조건 점검

target/fingerprint/source 불일치 0 · 조성 혼합 0 · writePlan≠writeActual 0 · canonicalDup 0 · target 밖 write 0 · 기존 LIVE drift 0 · audit 누락 0 · rollback 0 · claim 교집합 0 → 미발동.

## 7. shard A 진행 · 다음

- shard A: 70 fp / 210 master. **batch22 완료 25 fp / 75 master.**
- **shard A 잔여: 45 fp / 135 master (PENDING).** → batch23·24로 계속(shard A 전체 완료 시 WO 종료).
- 다음 재시작: **batch23** — `shardA-full.json` sorted 26~50번째 25 fp. 동일 sohae 파이프라인.
- write-owner 인계: **shard A 미완**이므로 아직 나에게 인계하지 않음(shard A 전량 완료·no-op·push 후 인계).
