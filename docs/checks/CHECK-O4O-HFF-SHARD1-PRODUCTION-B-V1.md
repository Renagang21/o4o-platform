# CHECK — HFF shard 1 자동 완결형 생산 (Agent B)

- 선행: select 직접주입 최적화 `CHECK-O4O-HFF-SELECT-DIRECT-STMT-INJECTION-B-V1`(`cc3b25381`).
- 성격: shard 1 전용 · **자동 apply**(사전승인 반복생산, 게이트 통과 시 무프롬프트) · 독립검증.
- 파이프라인: 직접주입 select → 승격 재필터 → generate(KO/EN+디자인) → dry-run 게이트 → 자동 apply → 독립검증.

## 1. 시각·범위

| 항목 | 값 |
|------|----|
| 시작 | 2026-07-22 05:05:04Z (정비 포함) |
| 생산 종료 | 05:30:20Z |
| shard | 1 / 3 (교집합 0 검증) |

## 2. shard 계획

- `hff-combo-shard-plan --all-shards`: scanned 34,834 · clean 5,287 · sigs 998 · **다중shard 배정(교집합) 0**. shard1 = **279 signature · 후보합 813**.

## 3. 자동생산 결과 (279 signature 전량 처리)

| 결과 | 수 |
|------|:-:|
| **APPLIED(자동)** | **1그룹 / 7건** (마그네슘+망간+비타민D+비타민K+아연+칼슘) |
| DROP(elig<4) | 246 |
| SELECT_FAIL(미지원 원료) | 31 (몰리브덴 등 미등록 원료 포함 대형 종합비타민 → registry 없음, 안전 skip) |
| GATE_FAIL | 0 |
| REVIEW_LATER(BLOCKED) | 0 |

- **자동 apply 게이트**(전부 충족 시에만): dry-run postVerifyPass · canonicalDup 0 · 예상write=target×4 · rollback manifest. idx6 게이트 PASS → 자동 COMMIT → 검증 OK. **GATE_FAIL 0** = 게이트 미달로 apply한 사례 0.

## 4. 낮은 수율 — 원인(정직)

- shard-plan "clean"(parseSpecs exact-set·unknownLabels 0)은 **grounding(basis 비율)·MAIN_FNCTN 귀속·serving·정체(scale-up)를 미검** → 후보를 과다 계상.
- shard 1 미승격 813 후보의 대부분은 select 엄격검증에서 **grounding/identity HOLD**(예: 셀레늄+아연 170 → ELIGIBLE 0, 전량 grounding 152·정체 18). 우량 제품은 선행 배치(단일·복합형 1,700+)에서 **이미 생산 소진**, 잔여는 원문 결함 편중.
- 대형 종합비타민(N10~19)은 `몰리브덴` 등 registry 미등록 원료로 SELECT_FAIL(31). registry 확장 시 일부 해금 가능하나 귀속 복잡 → 별도 판단.

## 5. 독립 사후검증 (새 연결, read-only)

| 항목 | 실측 |
|------|:-:|
| s1-* masters | **7** |
| STORE canonical SPD | **14** (ko 7 / en 7) |
| canonicalDup | **0** |
| KO/EN 설명서·디자인 | 각 7 |
| 총 write | 28 (7×4) |

## 6. 보고 요약

```text
최적화 전후 select: 셀레늄+아연 direct 4.0s vs search 6.5s(순수쿼리 ~1s vs ~3.5s), 저선택도 조합 격차 극대
조사 signature: shard1 279 (교집합 0)
READY 7 · REVIEW_LATER 0 · DROP 246 · SELECT_FAIL 31 · GATE_FAIL 0
실제 DB write 28 · canonicalDup 0 · LIVE drift 0
자동 apply 1그룹(게이트 전부 통과) · 독립검증 PASS
시간당 처리량(생산): 낮음(수율 상한 도달) · 처리량(스캔): 279 signature/~25분
```

- **목표 800~1,500 대비 실적 7**: shard 1 미승격 producible 이 사실상 고갈(우량 기생산). 무리한 apply 없이 게이트 통과분만 안전 커밋. 전체 중지 조건(shard 교집합·master 오연결·write 불일치·canonical/rollback 오류·LIVE drift) 해당 없음.

*자동 apply 는 사전승인 반복생산 원칙. 사후검증 read-only. 미지원 원료 registry 확장은 별도 트랙.*
