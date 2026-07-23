# CHECK — HFF 잔여 대량 생산 shard 0 (Agent A) V1

- WO: `WO-O4O-HFF-REMAINDER-BULK-PRODUCTION-A-V1` · 자동승인 계약 적용.
- 성격: **잔여 대량 생산(자동 apply)** — shard 0(`hash(statementNo)%3=0`) 미생산·미선점 후보를 기존 파이프라인 재사용으로 생산.
- 종료 `2026-07-23 22:39 +0900`. 공용 parser/registry **무수정**(census 도구는 read-only import).

## 0. 결론

> **shard 0 미생산 후보 census(10,013) 후 turnkey SF 파이프라인으로 12 신규 LIVE.**
> DB write **48**(12×4) · canonicalDup 0 · statementNo 중복 0 · stmtDupMasters 0 · **independentVerifyPass true** · 기존 LIVE drift 0.
> turnkey 클린 잔여는 대부분 소진 — 대형 버킷은 정당 HOLD(EN-pending·parse-fail·액상·미분류) 또는 combo/nutrient 트랙 필요.

## 1. shard 0 미생산·미선점 census (read-only)

`hff-shard0-remainder-census.ts`(신규 A 도구, read-only) — `hash%3=0` · 미승격(matched NULL) · not-taken(canonical STORE SPD 부재):

| 버킷 | 수 | 액상 | 생산 경로 |
|---|:-:|:-:|---|
| scanned / shard0 / **not-taken** | 41,261 / 13,743 / **10,013** | | |
| probioticsSingle | 91 | 1 | probiotics(대부분 REVIEW_LATER 소진) |
| **sfSingle** | 98 | 29 | **SF 파이프라인(본 배치 대상)** |
| nutrientSingle | 441 | 91 | nutrient/func(대부분 기생산·잔여 held) |
| otherSingle | 378 | 223 | 미등록 원료(홍삼 217·단백질·크레아틴 등) |
| multiBracket | 2,701 | 298 | combo/cross-domain 트랙 |
| noBracket | 6,304 | 1,685 | MAIN_FNCTN 라벨 부재 — 미분류 |

## 2. SF turnkey 생산 (기존 파이프라인 재사용)

registry 22원료 × `hff-sf-select` → `hff-sf-generate --shard 0` → PASS 합산:

| 원료 | PASS |
|---|:-:|
| 감마리놀렌산 | 6 |
| 히알루론산 | 2 |
| 은행잎추출물·마늘·로즈힙·마리골드꽃추출물 | 각 1 |
| 인삼·스피루리나·오메가3·클로렐라·포스파티딜세린·헤마토코쿠스·쏘팔메토·홍국 외 | 0 |
| **합계 (dedup)** | **12** |

- 인삼(census 30)·오메가3 등 0 PASS = EN 미매핑(`FN_EN_PENDING`)·액상·grounding 실패로 HOLD(개별 실패, 배치 계속). SF 잔여 pool 사실상 소진.

## 3. 자동 apply 게이트 (전통과)

| 게이트 | 결과 |
|---|---|
| dry-run·postVerify | PASS · candMatch 12(missing/ambiguous 0) · masterDup 0 |
| 예상=실측 write | 48 = 12×4 |
| canonicalDup | 0 |
| apply(`HFF_SF_APPLY_CONFIRM=YES`) | **COMMIT** · masters/spdKo/spdEn 12 |
| 독립검증(tag) | masters 12 · canonicalDup 0 · candidatesLinked 12 · spdRefLinked 24 · **stmtDupMasters 0** · **independentVerifyPass true** |

- tag `batch:single-functional-shard0-remainder-a1`. 롤백 매니페스트 생성. **기존 LIVE drift 0**(신규 master INSERT + candidate 12 UPDATE). KO/EN 12/12.

## 4. HOLD 상위 원인 (빠른 처리 원칙 — 전체 중지 아님)

| 원인 | 규모 | 처리 |
|---|---|---|
| noBracket(MAIN_FNCTN 라벨 부재) | 6,304 | 미분류 — 원문 구조상 자동 귀속 불가 |
| multiBracket(combo) | 2,701 | combo/cross-domain 트랙(별도 파이프라인) |
| nutrientSingle 잔여 | 441 | 대부분 기생산·잔여는 grounding/EN held |
| otherSingle(홍삼 217 등 미등록 원료) | 378 | registry 미등재 → 등록 후(공용 변경, 본 배치 미실행) |
| SF EN_PENDING/액상 | 다수 | 개별 HOLD |

- **100건 이상 단일 원인 = noBracket 6,304·multiBracket 2,701** 이나, 이는 파서 결함이 아니라 **원문 구조(라벨 부재)·combo 도메인**이라 parser/registry 구조 변경 대상 아님(WO 원칙: 100건 미만 예외용 구조변경 금지, 대형 버킷은 별도 트랙).

## 5. 보고 요약

```text
종료 2026-07-23 22:39 +0900 · 공용 무수정 · 기존 SF 파이프라인 재사용
처리 후보: shard0 not-taken 10,013 census → SF turnkey 22원료
신규 LIVE 12 · DB write 48 · PASS 12 / HOLD(개별) 다수
HOLD 상위: noBracket 6,304 · multiBracket 2,701 · nutrient held 441 · otherSingle(미등록) 378
canonicalDup 0 · statementNo 중복 master 0 · stmtDupMasters 0 · 기존 LIVE drift 0
독립검증 PASS
남은 후보: multiBracket combo 트랙 · noBracket 미분류 · 미등록 원료(registry 필요)
중지 사유: 없음 (turnkey 클린 잔여 소진)
```

## 6. 산출물

- census 도구(신규, read-only): `apps/api-server/src/scripts/hff-shard0-remainder-census.ts`.
- data: `docs/checks/data/product-description-guard/hff-shard0-remainder/` — sf target(12)·rollback-manifest.
- 본 문서.

---

*잔여 대량 생산 · 자동 apply. 공용 parser/registry 무수정 · 기존 SF 파이프라인 재사용 · DB write 48 · 독립검증 PASS. turnkey 클린 shard0 잔여 소진, 대형 버킷은 combo/미분류/미등록 트랙.*
