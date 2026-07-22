# CHECK-O4O-HFF-COMBO-C-SHARD2-FUNCTIONAL-COMPLETION-BATCH4-V1 — shard 2 잔여 풀 마감 (7 기능성 원료 포함) (Agent C)

- 성격: **완결형 생산 (자동 apply)** — 조사 → KO/EN 설명서 → 디자인 → DB canonical → 검증 → commit/push. 게이트 전통과로 사전 승인 없이 완결.
- 종료 `2026-07-22 19:11 +0900` (baseline 실측~apply~독립검증 단일 세션)
- 샤딩: **FNV-1a · shard-count 3 · Agent C = shard 2**.
- 기준선: 복합형 LIVE 3,845 (tag-agnostic, sd-why 카드≥2) · canonicalDup 0.

## 0. 결론

> **333건 복합형 STORE canonical LIVE 반영 완료 (자동 apply · 독립 사후검증 PASS).**
> 최종 totalComboLive(tag-agnostic 카드≥2) = **4,269** (baseline 3,845 → 내 +333 + 병렬세션 +91).
> canonicalDup 0 · 기존 LIVE drift 0 · DB write **1,332** (master 333 + candidate 333 + SPD ko 333·en 333).
> **7 기능성 원료 신규 포함**: 오메가3 38 · 가르시니아 19 · 녹차 16 · 은행잎 10 · 프로폴리스 2 · 테아닌 2 (감마리놀렌산 0). 나머지는 비타민·미네랄 N-다중 조합.
> shard 2 clean 자동적용 풀 **소진** — 잔여 fresh 82 = 자동HOLD 55(G-MULTI) + REVIEW_LATER 27.

## 1. shard 계약 · 7원료 포함 경로

- 발견 = `hff-combo-c-harvest`(단일 코퍼스 스캔, 하드닝 파서 공용) → 1,672 signature / eligible 5,702.
- harvest 는 registry(meta) 지원 원료를 **전부 버킷팅** → 7 기능성 원료(오메가3·가르시니아·녹차·감마리놀렌산·프로폴리스·은행잎·테아닌) 자연 포함. (레거시 `shard-plan` 의 `EXC_ALWAYS` 는 이 경로에 관여하지 않음.)
- shard 배정 = `FNV-1a(sorted-sig join '+') % 3 == 2`. harvest sig(`|` 결합) → canonical(`+` 결합) 변환 후 판정.
- `--exclude-taken` = candidate 사전승격(matched≠NULL) **또는** mfds_permit_number 에 canonical STORE SPD 존재 → 제외.

## 2. 풀 → 생산 퍼널

| 단계 | 수량 |
|---|---:|
| harvest eligible (전 shard) | 5,702 |
| shard 2 signature (594) 후보 dedup | 2,467 |
| `--exclude-taken` DB 제거 | −1,961 |
| **shard 2 fresh 풀** | **506** |
| generate (auto-HOLD 55 = G-MULTI-AMOUNT-SOURCE · BLOCKED 0) | 451 |
| H1 은닉(분류가능 누락 원료) −9 · H3 은닉(카페인 등 미분류) −1 | −10 |
| REVIEW_LATER (PRE-SRC-BASIS-UNVERIFIABLE 16 · Q-TRUNCATED 1) | −17 |
| **최종 apply 후보** | **424** |
| apply 시점 race-taken(병렬세션 선점, `--skip-promoted`) | −91 |
| **READY (COMMIT)** | **333** |

- generate REVIEW 중 **D-CLAIM-GROUNDED-002(44)·E-NAME-DERIVED-GROUNDED-002(4)** 는 grounded 판정이라 apply 포함(batch3 정책 일치). **PRE-SRC·truncated·H1/H3 만 REVIEW_LATER 제외.**

## 3. 제외 처리 (task 명시 항목)

| 유형 | 수량 | 처리 |
|---|---:|---|
| 카페인 limit spec 은닉(H3) | 1 | 제외 — `뉴트리 디-데이 다이어트 카테킨 올뉴`(카페인 라벨). 녹차/카테킨 계열 카페인 오인 방지 |
| 은닉 분류가능 원료(H1) | 9 | 제외 — 나이아신/비타민E/B2 signature 밖 누락(파서 과소추출). 불완전 signature 방지 |
| PRE-SRC-BASIS-UNVERIFIABLE | 16 | REVIEW_LATER |
| Q-TRUNCATED-PARTIAL | 1 | REVIEW_LATER |
| G-MULTI-AMOUNT-SOURCE (자동HOLD) | 55 | generate 단계 자동 제외 |

- 식이섬유 귀속 불명확·신규 registry 추가 필요 원료: harvest attribution 실패로 애초 eligible 미포함(제외 자동 충족).

## 4. 자동 apply 게이트 (전통과)

| 게이트 | 결과 |
|---|---|
| dry-run | PASS · postVerifyPass ✓ · canonicalDup 0 → ROLLBACK(write 0) |
| 예상=실측 write | 1,332 = 333×4 ✓ (postVerify masters/spdKo/spdEn/candidatesLinked 333 · spdRefLinked 666) |
| H1/H3 은닉 (READY) | 0 ✓ (10건 사전 제외) |
| apply (`--apply --skip-promoted`, 이중게이트 CONFIRM=YES) | **COMMIT 완료** · skipped 91 · postVerify 333 · canonicalDup 0 |
| **독립 사후검증** (fresh 연결) | byTag 333 · midExist 333 · spdKo 333 · spdEn 333 · **canonicalDup 0** · candidatesLinked 333 · **INDEPENDENT_PASS** |

- 계약: status=canonical · description_type=STORE · source_type=o4o_hff_generated · barcode NULL · candidate=approved_new_master · tag `batch:single-nutrient-combo-c-shard2-b4`.
- **기존 LIVE drift 0** (신규 master INSERT + 대상 candidate 333 UPDATE 만). 롤백 매니페스트: `hff-combo-c-shard2-b4-rollback-manifest.json` (master 333·spd 666).

## 5. 보고 요약

```text
종료 2026-07-22 19:11 +0900
샤딩 FNV-1a shard 2/3 · 발견 signature 1,672(전shard) · shard2 594 sig
풀 fresh 506 → generate 451(자동HOLD 55·BLOCKED 0) → 최종후보 424 → race-taken 91 → READY 333
7원료 READY: 오메가3 38·가르시니아 19·녹차 16·은행잎 10·프로폴리스 2·테아닌 2·감마리놀렌산 0
REVIEW_LATER 27 (PRE-SRC 16 · H1 9 · H3 1(카페인) · truncated 1) · HOLD(auto) 55
KO 설명서 333 · EN 설명서 333 · DB write 1,332 · canonicalDup 0 · 기존 LIVE drift 0
baseline totalComboLive 3,845 → 최종 4,269 (내 +333 + 병렬 +91)
shard2 잔여 fresh 82 (= auto-HOLD 55 + REVIEW_LATER 27) — clean 자동적용 풀 소진
독립검증 PASS · 중지 사유: 없음(shard 교집합 0 · 은닉 0 · dup 0)
```

## 6. 산출물

- 결과 JSON: `docs/checks/data/product-description-guard/hff-combo-c-shard2-b4-completion.json`
- 롤백 매니페스트: `docs/checks/data/product-description-guard/hff-combo-c-shard2-b4-rollback-manifest.json`
- REVIEW_LATER 목록: `docs/checks/data/product-description-guard/hff-combo-c-shard2-b4-review-later.json`
- 본 문서

## 7. 후속 (권고 · 미실행)

- **shard 2 clean 자동적용 풀 소진.** 잔여 82 는 파서 하드닝(H1 과소추출 9 · 카페인 H3 1) + PRE-SRC basis 확보 후에만 재검토 가능.
- 레거시 `hff-combo-shard-plan.ts` `EXC_ALWAYS` 가 7원료를 여전히 차단 — harvest 경로엔 무영향이나, shard-plan 사용 세션과의 정합을 위해 `EXC_ALWAYS` 에서 registry-지원 7원료 제거 **별도 WO 권고**.
