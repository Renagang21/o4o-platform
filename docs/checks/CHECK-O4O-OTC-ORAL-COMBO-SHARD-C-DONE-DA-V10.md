# CHECK-O4O-OTC-ORAL-COMBO-SHARD-C-DONE-DA-V10 — 경구 복합 shard C LIVE 완결 + 전체 corpus 종료 (에이전트 다)

WO: `WO-O4O-OTC-ORAL-COMBO-FINAL-SHARD-C-DA-V10-APPLY-AND-CORPUS-CLOSEOUT` · SSOT: `otc-combo-shard-assignment-ga-v9.json`.
상태: **PASS — shard C 68 fp / 204 master KO+EN canonical LIVE · 독립검증 GREEN · 전체 A/B/C 624 master 완결.**

## 0. 결론

> **경구 복합 트랙 완결.** shard C 생산가능 68 fp / 204 master를 KO(816T)+EN(408T) LIVE apply, 독립검증 GREEN, 재실행 no-op. **전체 A/B/C 208 fp / 624 master 생산 완료** + HOLD_SOURCE 1 fp / 3 master(빅콘에스600정, 원문 부재 — 별도 트랙). SSOT 총 209 fp / 627 master.

## 1. 인계 · 사전 점검

- write-owner 인계: SSOT `shardBStatus.writeOwnerHandoff = "나 → 다"` 확인. shard A(GA)·B(NA) DONE + 독립검증 GREEN.
- SSOT shard C 69 fp / 207 master **고정 사용**(재분할 0, raw census 변동 미반영). claim 교집합 0(C∩A/B/GA 358/NA).
- 전용 proxy: `cloud-sql-proxy-v2 --port 5461`(netureyoutube:asia-northeast3:o4o-platform-db) 신설. 다른 LIVE write-owner 없음.
- HOLD_SOURCE 1 fp / 3 master(44a15789…) apply 대상 분리.

## 2. LIVE apply (생산가능 68 fp / 204 master)

| 단계 | 결과 |
|---|---|
| KO apply (fp별 독립 TX, 이중게이트) | 68/68 · **KO writeActual 816** (204×4) |
| KO 독립검증 | authored KO canonical 204 · easy deprecated 204 · **easy still canonical 0** · audit 204 · dup 0 · target 밖 write 0 |
| EN DB dry-run | **68/68 PASS** (한글 0 · 필수필드 0 · KO authored 선행 확인 · writePlan 408) |
| EN apply (이중게이트) | 68/68 · **EN writeActual 408** (204×2) |
| shard C 독립검증 | KO canonical 204 · EN canonical 204 · EN needs_review 0 · easy deprecated 204 · easy still canonical 0 · audit 204 · **canonicalDup 0** · en 한글 0 · **HOLD 3 master 미접촉(easy canonical 3·authored 0)** |
| 재실행 no-op | KO·EN **ALL ALREADY_COMPLETE · dbWrite 0** |

- source_ref_id = uuid(md5(targetFp)) 결정론 · writePlan(1,224T) == writeActual · 실패 subgroup 0.

## 3. 콘텐츠 충실성

공식 MFDS/e약은요 원문 grounding · 신규 의료 사실 0 · 조성/효능/금기/경고 혼합 0. **연령·용량·횟수·기간 보존**, 질환명·효능 약화 0, 임신·수유·소아·고령 경고 보존, **철분 과량 중독 사망 경고·비타민 A 임신 기형 경고·아스파탐/PKU·대두유/땅콩 과민 금기·레보도파 병용 금기·감초 가성알도스테론증·인산염/칼슘염/테트라사이클린/제산제/강심배당체/탄닌차 상호작용** 전량 EN 보존(오프라인 KO-EN 축 대조 mismatch 0). 매장 약사 상담 안내 유지.

## 4. 전체 경구 복합 최종 census (624 master ALL GREEN)

| 항목 | 값 |
|---|---:|
| 대상 master (A 210 + B 210 + C 204) | 624 |
| authored KO canonical | 624 |
| EN canonical | 624 |
| easy deprecated | 624 |
| easy still canonical | 0 |
| EN needs_review | 0 |
| audit (canonical_replaced) | 624 |
| canonicalDup | 0 |
| EN 한글 잔존 | 0 |
| target 밖 write / 비대상 drift | 0 / 0 |
| 전체 재실행 no-op | ALL ALREADY_COMPLETE |
| shard 교집합 | 0 |

## 5. 완결 판정

- **경구 복합 생산 트랙 완결.** 생산가능 READY 잔여 0(A/B/C 624 master 전량 LIVE).
- **HOLD_SOURCE 1 fp / 3 master(빅콘에스600정)** = 공식 원문 효능·용법·주의 섹션 부재 → **원문 보강 대기 별도 트랙**으로 분리. HOLD_SOURCE 때문에 전체 트랙을 미완결로 표기하지 않음.
- **write-owner 최종 해제** (SSOT shardCStatus).

## 6. 산출물

- SSOT: `otc-combo-shard-assignment-ga-v9.json`(shardCStatus DONE + fullCorpusCensus 추가)
- config: `otc-oral-combo-config-shardC.da.json`(KO+EN 68) · manifest: `otc-oral-combo-shardC-manifest.da.json`(DONE) · HOLD: `otc-oral-combo-shardC-hold-source.da.json`
- 본 문서. 프록시 5461 전용 · GA/NA transient·HFF·첩부제·KPA 미접촉.
