# CHECK — HFF 영양소 복합형 완결형 생산 2차 배치 (Agent A)

- 상위 WO: `WO-O4O-HFF-MX-MULTI-INGREDIENT-EXPANSION-PILOT-V1` / 영양소 복합형 생산 트랙
- 성격: universe 스캔 → strict select → 승격 재필터 → compose(KO/EN+디자인) → Guard → dry-run → apply COMMIT(승인) → 독립 사후검증.
- 신규 도구: `hff-combo-universe-scan.ts`(1-pass exact full-set signature 스캔). 예약파일: `hff-combo-reservations/agent-a-batch2.json`.
- 정본: `nc-batch2/gen/*.gen.json`(제품별 KO/EN 본문·grounding) · rollback manifest `nc-batch2/manifests/`(19).

## 1. 기준선·시각

| 항목 | 값 |
|------|----|
| 시작 | 2026-07-22 03:10:14Z |
| apply 종료 | 2026-07-22 04:00:00Z (소요 ≈ 50분) |
| 기준선(실측) | 복합형 LIVE 1,227 |
| apply 후(내 기여) | +349 (동시 세션 병행으로 총계는 1,732 — 타 에이전트 생산 포함) |

## 2. 방법 — producible universe 1-pass

- `hff-combo-universe-scan`(hardened `parseSpecs`)로 41,261 스캔 → exact clean full-set **6,767 제품 / 1,413 signature** 산출.
- 전체 승격(approved_new_master) **5,202** 조회 → signature별 **비승격 clean 수** 계산(드리프트 무관 ground truth). 영양소 전용 clean≥6 = 70조합 / clean 1,426.
- **예약파일 선점**(14 대형 signature) commit·push(`21e62e4ce`) 후 select.

## 3. 대상·생산

- 1차 웨이브(대형 14) + 2차 웨이브(중형 18) strict select → **승격 재필터**(select는 승격 미필터 → pool에서 현재 승격 제거) → generate.
- ⚠️ **드리프트 극심**: 1차 웨이브 pool 772 중 **471 이미 승격**(타 에이전트 동시 대량 생산). 대형 조합 clean 상한 ~300.
- generate: **G-MULTI HOLD 0 전그룹**. REVIEW = 코팅정제/basis known-safe. BLOCKED 자동HOLD = REVIEW_LATER 분리.

### dry-run(통합 21그룹) → apply

| 항목 | 값 |
|------|----|
| 통합 dry-run target | 366 (21그룹) · write 1,464 · postVerifyPass 21/21 · canonicalDup 0 · 사전승격 0 |
| **apply 커밋 성공** | **19그룹 349** (write 1,396) |
| apply 실패(원자 거부) | 2그룹 17건 — `nc2b-mg-b126-se`(9)·`nc2b-na-b126-vd-zn`(8) **ALREADY_PROMOTED**(dry-run 이후 타 에이전트 생산, preload 원자 거부 → DB 무변경) |

### 커밋 19그룹 (READY)
```
2a(12): vd-zn 34·mg-vd-ca 44·mg-vd-zn-ca 40·bcx8 33·vd-ca 30·vc-zn 28·mg-vd-vk-ca 28·vd-ve 19·mg-mn-vd-zn-ca 14·mg-mn-vd-vk-ca 12·mg-mn-vd-ca 11·se-zn 6 = 299
2b(7):  b12-zn 8·b6-vd-ve-zn 8·b126-vd-folate 8·mg-vd-vk 7·cu-zn 7·biotin-se-zn 6·mg-b12126 6 = 50
계 349
```

## 4. 독립 사후검증 (새 연결, read-only)

| 항목 | 실측 | 판정 |
|------|:-:|:-:|
| nc2-*/nc2b-* masters | **349** | ✅ |
| STORE canonical SPD | **698** (ko 349 / en 349) | ✅ |
| canonicalDup | **0** | ✅ |
| candidate links(approved_new_master) | **349** | ✅ |
| 총 write | 1,396 (349×4) | ✅ |
| 기존 LIVE drift(내 write로 인한) | 0 (신규 INSERT만) | ✅ |

## 5. 보고 요약

```text
시작 03:10:14Z · apply 종료 04:00:00Z (≈50분)
조사: universe 1,413 signature · 영양소 clean≥6 70조합 · 검수 select 32조합
READY(커밋) 349 · REVIEW_LATER(BLOCKED) 소수 · DROP: 저수율 다수 + 드리프트 승격 다수
apply 실패 2그룹 17건 (ALREADY_PROMOTED, DB 무변경)
KO 설명서 349 · EN 설명서 349 · KO/EN 디자인 각 349
실제 DB write 1,396 · canonicalDup 0 · drift 0
복합형 내 기여 +349 (총계 1,732, 동시 세션 포함)
시간당 처리량 ≈ 419건/시간(2차, 도구 개선)
rollback manifest 19 (nc-batch2/manifests)
독립 사후검증 PASS
```

- **목표 600 미달 사유(정직)**: exact full-set 비승격 clean 상한이 **동시 다에이전트 생산으로 급속 소진**(내 top-14 pool 772 중 471 선점됨). universe clean(1,426)은 상한 추정이며 select attribution HOLD + 실시간 드리프트로 실제 producible이 크게 축소. 대형 조합은 사실상 포화, 잔여는 소형 롱테일. 무리한 확장 대신 clean 확정분만 안전 커밋.

*apply COMMIT 은 사용자 승인 기반. 사후검증 read-only. 드리프트 실패 2그룹은 원자 거부(무변경).*
