# CHECK-O4O-HFF-SHARD2-REMAINDER-COMPLETION-C-V1 — HFF shard 2 잔여 완결 생산 (Agent C)

- 성격: **완결형 생산 (자동 apply)**. 코드 변경 없음(7종 registry 확장은 batch5 `9b872b05d` 에서 완료). harvest → 생산 → 검증 → commit/push.
- 시작 `2026-07-22 18:53:56 +0900` · 종료 `2026-07-22 19:08:00 +0900` · 소요 **약 14분**
- 대상: shard 2 (FNV-1a stableHash · shard-count 3) 잔여 producible 전수 — 오메가3·가르시니아·녹차·감마리놀렌산·프로폴리스·은행잎·테아닌 포함

## 0. 결론

> **shard 2 잔여 fresh 131 → READY 91 LIVE (COMMIT · 독립검증 PASS).**
> tag-agnostic totalComboLive **3,845 → 3,936 (+91)** (ko=en). DB write **364 = 91×4** (예상=실측). canonicalDup 0 · 기존 LIVE drift 0 · master 오연결 0.
> REVIEW_LATER 13 · hidden 제외 5 (H1 4 · H3 1) · auto-HOLD 22. **은닉 0**(H1/H3 전량 READY 제외).

## 1. SSOT 기준선 (새 DB 연결)

| 항목 | 값 |
|---|---|
| database | `o4o_platform` (production, proxy :5433) |
| tag-agnostic totalComboLive (ko) | **3,845** (WO SSOT 일치) |
| totalComboLive (en) | 3,845 (ko=en) |
| globalHffStoreCanonicalDup | 0 |
| HFF candidates | 41,261 |

> tag-agnostic = `source_type='o4o_hff_generated'` STORE ko canonical 중 `sd-why` 카드 ≥2 (복합형). 태그/prefix 비의존.

## 2. Harvest (FNV-1a · shard-count 3 · exclude-taken)

- 코퍼스 전량 스캔 41,261 → signatures(eligible>0) **1,028** · totalEligible **4,523** (batch5 일치) · totalFresh(전 shard) **893**.
- produced/taken set **7,757** (matched master 연결 OR canonical STORE SPD 존재 = `--exclude-taken` 정의 그대로).
- **shard fresh 분포** (stableHash % 3, 정렬 signature): shard0 443 · shard1 319 · **shard2 131** (59 signatures).
- **md5 shard 미사용** — FNV-1a(`2166136261`/`16777619`) 단일, hff-combo-select·shard-plan 과 동일 구현.

## 3. 생산 (harvest seed → generate → hidden audit)

| 단계 | 수량 |
|---|---:|
| shard2 fresh pool | 131 |
| generate inputs (PASS 96 + REVIEW 13) | 109 |
| auto-HOLD (BLOCKED 0) | 22 |
| hidden 제외 (H1 4 + H3 1) | −5 |
| REVIEW_LATER (PRE-SRC 12 · Q-TRUNCATED 3) | −13 |
| **READY** | **91** |

- auto-HOLD 22: `HOLD_GUARD_BLOCKED` 9 · `HOLD_MULTI_GUARD` 8 (G-MULTI-AMOUNT-SOURCE) · `HOLD_NAME_UNGROUNDED_CLAIM` 5.
- READY 91 = **28 signatures**. 상위: 루테인+비타민A+비타민E+아연 17 · 루테인+비타민A+비타민D+비타민E+오메가3 11 · 루테인+비타민C 9 · 루테인+비타민A+비타민E+오메가3 9.
- 7종 기능성 원료 READY 포함: **오메가3 29 · 은행잎 1** (나머지 순수-기능성 조합은 batch5 에서 기소진, 잔여는 루테인·비타민 영양소 조합 위주).
- KO/EN 설명서·디자인 생성(composeCombo). sanitize 무손실(byte-동일).

## 4. 은닉 감사 (H1/H3)

- **H1 (signature-외 분류가능 원료) 4** · **H3 (라벨:값/기준 CLS 미분류) 1** → 전량 READY 제외(REVIEW_LATER).
- 제외 5: 일양 루테인 프로(`20190009483202`) · 뉴트리 디-데이 다이어트 카테킨 올뉴(`20040017021587`, H3=카페인) · 간 건강 플러스(`20220011370284`) · 젊음愛 코큐텐100 부스터(`20210016229126`) · 쑥쑥에너지젤리(`2021001622970`).
- H3 카페인 = batch5 와 동일 false-positive(`카페인` NONFUNC 편입 후속 권고 유지). **READY 은닉 0.**

## 5. DB 반영 · 검증 (자동 apply — 게이트 전통과)

| 게이트 | 결과 |
|---|---|
| dry-run (INSERT/UPDATE → postVerify → ROLLBACK) | PASS · DB write 0 |
| 예상=실측 write | **364 = 91×4** (masters 91 · candidate_update 91 · SPD 182) ✓ |
| canonicalDup | 0 |
| sanitize 무손실 | byte-동일 (ko/en) |
| apply (`--skip-promoted --apply`, 이중게이트 `HFF_NUTRIENT_APPLY_CONFIRM=YES`) | **COMMIT** · skippedStmts 0 · postVerify masters/spdKo/spdEn/candidatesLinked 91 · canonicalDup 0 · spdRefLinked 182 |
| **독립 사후검증** (fresh 연결) | masters 91 · regType 건강기능식품+barcode NULL 91 · spdKo(card≥2) 91 · spdEn 91 · **canonicalDup 0** · candidatesLinked 91 · globalCanonicalDup 0 · **PASS** |

- 계약: `status='canonical'` · `description_type='STORE'` · `source_type='o4o_hff_generated'` · `source_ref_id=candidate.id` · `regulatory_type='건강기능식품'` · `barcode NULL` · `mfds_permit_number=STTEMNT_NO`.
- **기존 LIVE drift 0** (3,845 보존, +91 만 추가). 롤백 매니페스트: `hff-combo-c-shard2-rem-rollback-manifest.json` (createdMasters 91 · createdSpd 182 · candIds 91).

## 6. 보고 요약

```text
시작 18:53:56 · 종료 19:08:00 · 소요 14분
SSOT baseline totalComboLive 3,845 (ko=en) · production o4o_platform
harvest: scanned 41,261 · eligible 4,523 · fresh(전shard) 893 · shard2 fresh 131 (59 sig) · taken 7,757
생산: pool 131 → generate 109(PASS 96·REVIEW 13) · auto-HOLD 22 · hidden 5 · REVIEW_LATER 13 → READY 91
원료별(READY 포함): 오메가3 29 · 은행잎 1 (잔여는 루테인·비타민 조합 위주, 28 signature)
DB write 364 = 91×4 (예상=실측) · canonicalDup 0 · 기존 LIVE drift 0 · 은닉 0
독립검증 PASS · 최종 tag-agnostic totalComboLive 3,936 (ko=en, +91)
shard2 잔여 fresh: 0 (131 전수 처리 — READY 91 적재 + REVIEW_LATER 13 + hidden 5 + auto-HOLD 22)
중지 사유: 없음 (기능성 오귀속 0 · shard 교집합 0 · master 오연결 0 · canonical/rollback 오류 0 · 예상=실측 · 독립검증 PASS)
```

## 7. 산출물

- 결과 JSON: `docs/checks/data/product-description-guard/hff-combo-c-shard2-rem-completion.json`
- 롤백 매니페스트: `docs/checks/data/product-description-guard/hff-combo-c-shard2-rem-rollback-manifest.json`
- 코드 변경 **없음** (harvest/generate/hidden-audit/apply 전부 기존 스크립트 재사용, 7종 registry 는 batch5 `9b872b05d` 확장분).
- 본 문서
