# CHECK-O4O-HFF-COMBO-C-COMPLETION-BATCH1-JOINT-ANTIOX-V1 — 건강기능식품 완결형 생산 1차 배치 (Agent C)

- 성격: **완결형 생산** — 조사 → KO/EN 매장 설명서 → 디자인 데이터 → **DB canonical 반영**까지 독립 완결. (이전 read-only 조사 역할에서 전환된 첫 배치)
- 시작 `2026-07-22 10:21:54 +0900` · 종료 `2026-07-22 11:21:43 +0900` · 소요 **약 60분** (상당 부분 프로덕션 DB 고부하·프록시 복구에 소요, 순수 파이프라인 ~25분)
- 기준선: 복합형 LIVE **605** · 인벤토리 `1ee2d3fcb` · 파서 하드닝 `6a2769045` · Agent B 파서 보강 `09d5e50c3`
- 중복 금지 준수: Agent B 71건(D+아연+칼슘·A+E) 및 Agent A 영양소 전용 배치와 조합 **비중첩**, 추가로 DB dedup 으로 기제작 15건 제거.
- 소스: `G:/…/mfds-health-functional-food-info-raw.jsonl` (44,885), `--source file`

## 0. 결론

> **194건 복합형 STORE canonical LIVE 반영 완료 (COMMIT · 독립 사후검증 PASS). 복합형 LIVE 605 → 799.**
> 은닉 기능성 0 · 기존 LIVE 중복 0 · canonicalDup 0 · 기존 LIVE drift 0.
> DB write 776 (ProductMaster 194 + candidate UPDATE 194 + STORE SPD ko 194 · en 194).

## 1. 파이프라인 · 퍼널

```
hff-combo-select(--source file)         10그룹 실측
  → hff-combo-c-dedup-probe(DB)          기제작/승격 제거
  → hff-combo-generate                   KO/EN 설명서 + 디자인(sd-card) + G-MULTI/표준 Guard
  → hff-combo-c5-audit                   은닉 기능성·귀속 독립 감사(전수)
  → hff-combo-c-categorize               READY / REVIEW_LATER 분류
  → hff-nutrient-store-canonical-apply   dry-run(exec+rollback) → apply(이중게이트)
  → hff-combo-c-independent-verify       apply 후 독립 사후검증
```

| 단계 | 수량 |
|---|---:|
| raw ELIGIBLE (10그룹) | 214 |
| DB dedup 제거(기제작 승격) | −15 |
| clean | 199 |
| REVIEW_LATER 분리 | −5 |
| **READY (생산)** | **194** |

## 2. 그룹별 실측·생산

| 조합 | ELIGIBLE(clean) | REVIEW_LATER | **READY** |
|---|---:|---:|---:|
| MSM + 비타민D + 아연 | 41 | 0 | **41** |
| 비타민C + 비타민D | 48 | 1 | **47** |
| 비타민C + 비타민D + 아연 | 34 | 0 | **34** |
| MSM + 글루코사민 + 비타민D | 27 | 0 | **27** |
| 아연 + 옥타코사놀 | 19 | 0 | **19** |
| 비타민A + 비타민D + 비타민E | 9 | 0 | **9** |
| MSM + 아연 | 11 | 3 | **8** |
| MSM + 글루코사민 | 5 | 0 | **5** |
| 아연 + 칼슘 | 5 | 1 | **4** |
| 비타민E + 코엔자임Q10 | — | — | **DROP** |
| **합계** | 199 | 5 | **194** |

**DROP — 비타민E+코엔자임Q10**: ELIGIBLE 15 전량이 기제작 LIVE 로 흡수(dedup 15 = 이 그룹 전량). 신규 생산분 0.

## 3. 은닉 기능성 감사 (9그룹 전수 · 생산 전)

`hff-combo-c5-audit` 로 strict select ELIGIBLE 을 독립 재검증.

| 검사 | 결과 |
|---|---|
| H1 (TARGET 외 분류가능 원료 규격 존재) | **0 / 199** |
| H3 (TARGET 외 미분류 spec 라벨 = 은닉) | **0 / 199** |
| 기존 LIVE / 기생산 중복 | **0 / 199** |

> single-lutein 파일럿의 리버케어지티(곰피/디에콜 은닉) 형 오염이 **재발하지 않음**을 확인.
> Agent B 파서 보강(`09d5e50c3`)의 LOOSE_SPEC_RE 안전망이 미파싱 규격 라인을 HOLD 로 걸러내는 효과. H2 DISAGREE 다수는
> 감사 파서 inline registry 의 공유 기능성 다중귀속(칼슘·글루코사민·셀레늄 등 — 해당 제품 규격에 없음, H1/H3=0 로 확인)로 **전부 무해**, 생산 귀속이 옳음. MSM 관절 제품 표본검증에서 관절/연골 기능성이 MSM 에 정귀속 확인.

## 4. REVIEW_LATER (5건)

전부 `PRE-SRC-BASIS-UNVERIFIABLE-003` (표시량 비율 원문 자동검증 실패 — "사람이 원문 직접 확정"). 기능성 원료 귀속은 정상(select 통과)이나 basis 자동검증이 보류되어 **canonical 반영에서 제외**. WARNING·grounded 인 `D-CLAIM-GROUNDED-002` 15건은 원문 근거가 있어 READY 유지(prior 배치 관례 일치).

- 그룹 분포: MSM+아연 3 · 비타민C+비타민D 1 · 아연+칼슘 1
- 목록: `docs/checks/data/product-description-guard/hff-combo-c-batch1-completion.json` (`reviewLater.items`)

## 5. DB 반영 (COMMIT)

| 단계 | 결과 |
|---|---|
| dry-run(exec+rollback) | postVerifyPass ✓ · 예상=실측 776 · canonicalDup 0 → ROLLBACK(DB write 0) |
| **승인** | 사용자 COMMIT 승인 (단일 게이트) |
| apply (이중게이트 `HFF_NUTRIENT_APPLY_CONFIRM=YES`) | **COMMIT 완료** · 트랜잭션내 postVerify: masters 194 · spdKo 194 · spdEn 194 · canonicalDup 0 · candidatesLinked 194 · spdRefLinked 388 |
| **독립 사후검증** (`hff-combo-c-independent-verify`, fresh 연결) | masters 194 · spdKo 194 · spdEn 194 · **canonicalDup 0** · candidatesLinked 194 · sourceHff(o4o_hff_generated) 388 · **independentVerifyPass true** |

- 계약: `status='canonical'` · `description_type='STORE'` · `source_type='o4o_hff_generated'` · `regulatory_type='건강기능식품'` · `mfds_permit_number=STTEMNT_NO` · barcode NULL · candidate `approved_new_master`.
- **기존 LIVE drift 0** (INSERT-only + canonicalDup 0 → 사전 605 canonical 무변경).
- **복합형 LIVE 605 → 799** (+194).
- 롤백 매니페스트: `docs/checks/data/product-description-guard/hff-combo-c-batch1-rollback-manifest.json` (createdMasters 194 · createdSpd 388 · candIds 194 · snapshot 194).

## 6. 인프라 이슈 (해소)

apply 중 **프로덕션 DB 고부하**(동시 `product_candidates` 전량 스캔 9세션) + **공유 프록시(5442) 토큰 만료**로 2회 실패:
1회차 preload SELECT read-timeout, 2회차 canonicalSpdDup preload 중 `Connection terminated`. **둘 다 write 이전 preload 단계** → 매회 `committed=false` 독립 확인(DB 무변경, 부분커밋·hung txn 없음 — pg_stat_activity 로 idle-in-transaction 0 확인).
해소: **신규 프록시(5455, fresh token)** + apply 타임아웃 **env override**(`HFF_QUERY_TIMEOUT`/`HFF_STMT_TIMEOUT`, 기본 120000 불변 = 하위호환) → 3회차 COMMIT 성공.

## 7. 코드 변경 (additive · 하위호환)

| 파일 | 변경 |
|---|---|
| `hff-source-parse.ts` | `splitFunctions`/`parseFnAttribution` 기능성 문자열 **말미 구두점(,，、·) strip** — Agent B 선행 쉼표 strip 과 대칭. 표시 전용, 수량·귀속 불변(재select 카운트 199 동일 확인). |
| `hff-nutrient-store-canonical-apply.ts` | DataSource 타임아웃 **env override**(`HFF_QUERY_TIMEOUT`/`HFF_STMT_TIMEOUT`, 기본 120000). 고부하 시에만 상향, 기본 동작 불변. |
| 신규 스크립트 | `hff-combo-c-dedup-probe` · `hff-combo-c-categorize` · `hff-combo-c-independent-verify` · `hff-combo-c-masters-check` · `hff-combo-c-commit-check` · `hff-combo-c-session-probe` (전부 read-only 검증/조립 도구) |

## 8. 보고 요약

```text
조사 10그룹 · READY 194 · REVIEW_LATER 5 · DROP 1그룹(비타민E+CoQ10 전량 흡수)
KO 설명서 194 · EN 설명서 194 · 디자인 데이터(sd-card KO/EN) 194쌍
dry-run write 0(rollback) · 실제 DB write 776
기존 LIVE drift 0 · canonicalDup 0 · 은닉 기능성 0 · LIVE 중복 0
복합형 LIVE 605 → 799
시간당 처리량 ≈ 194건/시간(인프라 재시도 포함) · 순수 파이프라인 ~25분
중지 사유: 없음 (인프라 2회 실패는 write 이전·DB 무변경, 프록시 교체로 해소)
```

## 9. 산출물

- 결과 JSON: `docs/checks/data/product-description-guard/hff-combo-c-batch1-completion.json`
- 롤백 매니페스트: `docs/checks/data/product-description-guard/hff-combo-c-batch1-rollback-manifest.json`
- 본 문서
