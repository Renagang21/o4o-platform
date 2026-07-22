# CHECK — HFF 영양소 복합형 완결형 생산 1차 배치 (Agent A)

- 상위 WO: `WO-O4O-HFF-MX-MULTI-INGREDIENT-EXPANSION-PILOT-V1` / 영양소 복합형 생산 트랙
- 성격: **select → compose(KO/EN 설명서 + 디자인) → G-MULTI·표준 Guard → dry-run → apply COMMIT(승인) → 독립 사후검증**.
- 도구: `hff-combo-select` · `hff-combo-generate`(composeCombo) · `hff-nutrient-store-canonical-apply`(dry-run 기본 / 이중게이트 `HFF_NUTRIENT_APPLY_CONFIRM=YES`).
- 정본: `docs/checks/data/product-description-guard/nc-batch1/gen/*.gen.json`(제품별 KO/EN 본문·grounding 포함) · rollback manifest `nc-batch1/manifests/`.

## 1. 기준선·시각

| 항목 | 값 |
|------|----|
| 시작 | 2026-07-22 01:21:53Z |
| apply 종료 | 2026-07-22 02:28:31Z (소요 ≈ 66분) |
| task 명시 기준선 | 복합형 LIVE 605 |
| **실측 기준선(드리프트)** | **838** (타 에이전트 대량 생산 반영 — task 605는 stale) |
| apply 후 | **1,036** (838 → 1,036, +198) |

## 2. 대상 선정 (strict exact full-set, read-only)

- N2~4 strict 인벤토리(scanned 41,261 · clean 3,668 / 675조합) → LIVE 태그 dedup → **완전 미생산 영양소 전용 조합** 우선 사이징.
- 우선순위 그룹 P1(N10 10원료)·P2·P3 등은 exact-set 저수율(0~3)로 **DROP**(운영원칙: 저수율 즉시 이동).
- ⚠️ **드리프트 dedup**: 초기 후보 289건 중 **90건이 이미 승격**(vc-vd 47/48·vc-vd-zn 34/34·va-vd-ve 9/9 — 타 에이전트가 이미 LIVE화). 3그룹 전량 DROP(중복 금지). → **완전 클린 9그룹 198건** 확정.

### 최종 9그룹 (READY 198)

| slug(tag) | 조합 | READY | PASS | REVIEW |
|-----------|------|:-:|:-:|:-:|
| nc-vd-vk | 비타민D + 비타민K | 62 | 60 | 2 |
| nc-mg-b6 | 마그네슘 + 비타민B6 | 33 | 27 | 6 |
| nc-b12-b6-folate | 비타민B12 + 비타민B6 + 엽산 | 31 | 25 | 6 |
| nc-biotin-panto | 비오틴 + 판토텐산 | 15 | 14 | 1 |
| nc-b1-b2-b6-vc | 비타민B1 + B2 + B6 + 비타민C | 14 | 14 | 0 |
| nc-b12-folate | 비타민B12 + 엽산 | 13 | 11 | 2 |
| nc-mg-b126 | 마그네슘 + 비타민B1 + B2 + B6 | 12 | 9 | 3 |
| nc-b2-vc | 비타민B2 + 비타민C | 9 | 8 | 1 |
| nc-niacin-vc | 나이아신 + 비타민C | 9 | 9 | 0 |
| **계** | | **198** | 177 | 21 |

- **G-MULTI HOLD 0** 전그룹(원료 attribution/수치분리 이상 0). REVIEW 21 = `D-CLAIM-GROUNDED-002`(코팅정제) + `PRE-SRC-BASIS-UNVERIFIABLE-003`(basis) — 기 배치 known-safe 선례 포함.
- **REVIEW_LATER(제외) 2건**: generate 표준 Guard BLOCKED 자동HOLD(b12-b6-folate 1 · b2-vc 1) — 배치에서 분리.

## 3. 생산 콘텐츠

- 제품별 **한국어 매장용 설명서 + 한국어 디자인**(sd-card 배지·표시량·원료별 기능성) 및 **영어 설명서 + 영어 디자인** 을 `composeCombo` 로 동시 생성(N-제너릭). 원료별 표시량 자기귀속·ko/en 카드 수·순서 G-MULTI 강제.
- KO 설명서 198 · EN 설명서 198 (= canonical SPD ko 198 / en 198).

## 4. dry-run → apply → 독립 사후검증

| 항목 | dry-run(exec+ROLLBACK) | apply(COMMIT, 승인) | 독립검증(새 연결) |
|------|:-:|:-:|:-:|
| target | 198 (9그룹) | 198 | masters **198** |
| 총 write | 792 (198×4) | 792 | — |
| ProductMaster INSERT | 198 | 198 | 198 |
| candidate UPDATE(approved_new_master) | 198 | 198 | candidate_links **198** |
| STORE SPD ko/en | 396 | 396 | canonical **396** (ko 198 / en 198) |
| canonicalDup | 0 | 0 | **0** |
| source_ref 보존 | 396 | 396 | srcref **396** |
| postVerifyPass | true(9/9) | true(9/9) | **PASS** |
| 결과 | DB write 0 | **COMMIT** | 복합형 838 → **1,036** |

- 사전승격(preload) 차단 0 · 기존 LIVE drift 0(신규 INSERT만, 기존 미변경 → 총계 정확히 +198).
- rollback manifest 9개 저장(제품별 createdMasters/createdSpd/candIds/snapshot) — `nc-batch1/manifests/`.
- 태그: `import:mfds-hff` + `batch:single-nutrient-nc-<slug>` + `wo:hff-single-nutrient`.

## 5. 처리량·운영 기록

- 소요 ≈ 66분 / 198건 = **약 180건/시간**(사이징 friction 포함: 병렬 select 실패·재정리·드리프트 dedup 재작업). 순수 generate+apply 구간은 훨씬 빠름.
- 병렬 select가 tsx 충돌로 빈 pool 산출 → 순차 재실행으로 안정화(교훈: 저선택도 `비타민` prefilter는 조합당 ~2-4분, 병렬 대신 순차).

## 6. 보고 요약

```text
시작 01:21:53Z · apply 종료 02:28:31Z (≈66분)
조사 대상: N2-4 675조합 사이징 → 후보 9그룹
READY 198 · REVIEW_LATER 2(BLOCKED) · DROP: 저수율 다수 + 이미승격 3그룹(90건)
KO 설명서 198 · EN 설명서 198 · KO/EN 디자인 각 198
dry-run write 792 = 실제 DB write 792
기존 LIVE drift 0 · canonicalDup 0
복합형 LIVE 838 → 1,036 (+198)
시간당 처리량 ≈ 180건/시간
rollback manifest 9개 저장(nc-batch1/manifests)
독립 사후검증 PASS(새 연결)
```

*apply COMMIT 은 사용자 승인 기반. 사후검증·CHECK 는 read-only. 이미승격 3그룹·저수율 그룹은 배치 제외.*
