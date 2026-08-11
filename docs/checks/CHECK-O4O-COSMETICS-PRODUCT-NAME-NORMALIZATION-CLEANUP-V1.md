# CHECK-O4O-COSMETICS-PRODUCT-NAME-NORMALIZATION-CLEANUP-V1

- **WO**: `WO-O4O-COSMETICS-PRODUCT-NAME-NORMALIZATION-CLEANUP-V1`
- **선행**: `WO-O4O-COSMETICS-PRODUCTMASTER-STORE-DESCRIPTION-FULL-APPLY-V1` §9 (상품명 정규화 잔여 2,521 · 괄호 불균형 42)
- **일자**: 2026-08-11
- **판정**: **PASS** — 명백한 판매 문구 **339건만** 제거, 애매한 **165건은 CHECK 로 보류**, postVerify 전 항목 통과

> WO 기준: "2,521건을 억지로 모두 깨끗하게 만드는 것이 목표가 아니다. 오병합·제품명 훼손보다 일부 지저분한 이름을 남기는 것이 낫다."
> 이 CHECK 는 그 기준대로 **잔여를 남긴 상태로 종료**한 기록이다.

## 1. 기준 commit

| 항목 | 값 |
|---|---|
| 작업 시작 HEAD | `b2f4f65ee` |
| 대상 DB | 프로덕션 `o4o-platform-db` / `o4o_platform` (Cloud SQL Auth Proxy) |

## 2. 모집단 산출 (census — DB write 0)

WO §2 지시대로 문서 수치를 믿지 않고 운영 DB 에서 재산출했다. 선행 WO 문서 수치와 다른 항목은 **실측값을 채택**했다.

| 항목 | 선행 WO 기재 | 실측 | 채택 |
|---|---:|---:|---|
| `regulatory_type='COSMETIC'` 총수 | 32,674 | **32,674** | 일치 |
| 비문자로 시작하는 이름 | 2,521 | **2,521** | 일치 |
| 대괄호 `[` 로 시작 | — | 2,509 | — |
| 괄호 불균형 | 42 | **58** | 실측 |

## 3. 규칙 도출 근거 — 왜 2,509건을 일괄 제거하지 않았는가

선두 대괄호 토큰 빈도 상위 실측:

| 토큰 | 건수 | 판정 |
|---|---:|---|
| 네일락커 / 인피니트샤인 Gel-Like / 인피니트샤인 / 래피드라이 | 196 / 92 / 47 / 40 | **라인명 — 보존** (WO §4) |
| 네이처스트롱 / 차앤박 / 오무뷰 / 향수 | 51 / 36 / 22 / 20 | **브랜드·카테고리 — 보존** |
| 대용량 / 2SET / NEW / 리뉴얼 / 해외 | 60 / 46 / 44 / 20 / 24 | **SKU·리뉴얼 구분 — 보존(CHECK)** |
| 오직무신사뷰티 / 2개부터 구매가능 / 옵션선택 / 2개선택 / OOO PICK | 50 / 26 / 22 / 21 / 26 | **판매처 프로모션 — 제거 대상** |

선두 대괄호의 다수가 **실제 제품 라인명**이었다. 따라서 패턴 추측이 아니라 **빈도로 확인된 판매 문구만 allowlist** 로 등재했다.
규칙 정본: [`rules.mjs`](../../apps/api-server/src/scripts/cosmetics-name-cleanup/rules.mjs) — `PROMO_EXACT` 목록 + 4개 패턴(수량조건 / 엔도스먼트 PICK·픽 / %OFF / 소비기한).

## 4. dry-run 결과 (DB write 0)

| 구분 | 수 |
|---|---:|
| 모집단 | 32,674 |
| **자동 수정 대상** | **339** (1.0%) |
| **CHECK 큐** | **165** |
| 변경 없음 | 32,170 |
| 충돌로 CHECK 강등 | 106 |

규칙별 자동 수정 내역:

| 규칙 | 수 | 규칙 | 수 |
|---|---:|---|---:|
| PROMO_EXACT | 147 | PROMO_EXPIRY | 4 |
| PROMO_ENDORSEMENT | 68 | GIFT_TRAILING_DELIM | 3 |
| PROMO_QTY_CONDITION | 54 | STRAY_LEADING_PUNCT | 2 |
| EXPIRY_TRAILING_PAREN | 43 | PROMO_DISCOUNT | 2 |
| ZERO_WIDTH | 7 | GIFT_LEADING | 2 |
| WHITESPACE | 6 | PROMO_ORPHAN_LEADING / PROMO_TRAILING_EVENT / STRAY_TRAILING_OPEN / GIFT_TRAILING_PAREN | 각 1 |
| STRAY_TRAILING_CLOSE | 5 | | |

## 5. CHECK 큐 (`check-queue.json` — 운영 DB 수정하지 않음)

| 사유 | 수 | 성격 |
|---|---:|---|
| `NAME_COLLISION_EXISTING` | 102 | 정리하면 기존 master 와 (브랜드,이름) 중복 → **오병합 방지로 보류** |
| `BRACKET_IMBALANCE_UNRESOLVED` | 45 | 여는 괄호가 유실돼 복원 불가 (`×무민]`, `X가나디]` 등) |
| `NAME_COLLISION_CANDIDATE` | 12 | 후보끼리 같은 이름으로 수렴 |
| `AMBIGUOUS_PROMO_TOKEN` | 8 | 세트/리필/한정 등 실제 SKU 구분일 수 있음 |
| `GIFT_PHRASE_NO_SAFE_BOUNDARY` | 6 | 증정 문구와 제품명 경계 불명 |
| `LEADING_OPEN_BRACKET_DIGIT` | 1 | 숫자 시작 — 용량/수량 가능성 |

의도적으로 **보존한 표현**: 세트·팩·구성 / 리필 / 한정판·한정수량 / 대용량 / 리뉴얼 / 단독 숫자%(성분 농도 가능) / 해외·오프라인 / 잘린 콜라보 접두어.

## 6. 소비처 감사 (§11 중지 조건 확인)

`product_masters` 참조 FK 전수와, 이름을 스냅샷으로 복제할 수 있는 텍스트 컬럼 **86개**를 실측했다.

| 항목 | 결과 |
|---|---|
| 대상 339건을 참조하는 행 | `shared_product_descriptions.master_id` **339** — 그 외 FK 전부 **0** |
| (product_aliases / product_images / service_products / store_products / store_product_profiles / supplier_product_offers / product_identifiers / product_candidates / product_ai_contents / product_drug_extensions 등) | 0 |
| 이름 스냅샷 컬럼 86개에서 대상 이름 발견 | **0** |

→ 파급 범위는 ProductMaster + 1:1 canonical 설명서로 한정. 중지 조건 해당 없음.

## 7. apply 결과

| 항목 | 값 |
|---|---:|
| 계획 | 339 |
| `product_masters.name` 갱신 | **339** |
| `regulatory_name` 동반 갱신 | 339 (기존 값이 옛 name 과 같을 때만) |
| 설명서 `summary` 갱신 | 339 |
| 설명서 `content` 갱신 | 339 |
| 이름 불일치 skip (멱등 가드) | 0 |
| 실패 | 0 |
| 신규 master / 삭제 | 0 / 0 |

설명서는 **본문 내용을 재저작하지 않고** 박혀 있는 상품명 문자열만 치환했다 (WO §6·§8).

## 8. postVerify (§9)

| # | 검증 | 결과 |
|---|---|---|
| 1 | COSMETIC 총수 | 32,674 → **32,674** (불변) |
| 2 | master 신규/삭제 | 0 / 0 |
| 3 | expected == actual | 339 == 339 (`tags ? 'nameCleanupV1'`) |
| 4 | 빈 상품명 | 0 |
| 5 | 신규 master 중복 (brand,name) | **0 그룹** |
| 6 | canonical 중복 / orphan / canonical 없는 master | 0 / 0 / 0 |
| 7 | 비화장품 오수정 | 0 |
| 8 | DRUG 177,413 · 건강기능식품 40,948 · QUASI_DRUG 17,148 · MEDICAL_DEVICE 3,826 · GENERAL 11 · 일반 15 | drift **0** |
| 9 | 설명서 이름 정합 — 옛 이름 잔존 / 새 이름 누락 / 본문 길이 0 | 0 / 0 / 0 |
| 10 | 잔여 재산출 | 비문자 시작 2,521 → **2,266** · 괄호 불균형 58 → **50** · **자동수정 잔여 0** |

## 9. 검색 smoke (§10) — 표본 5

| before | after | 정확조회 | 옛 이름 |
|---|---|---:|---:|
| `[선물포장] 노스탤직 퍼퓸 핸드크림 100024 네롤리` | `노스탤직 퍼퓸 핸드크림 100024 네롤리` | 1 | 0 |
| `[무신사 단독] 라이스 세럼` | `라이스 세럼` | 1 | 0 |
| `[20개부터 구매가능] 세븐 데이즈 마스크 녹차 S` | `세븐 데이즈 마스크 녹차 S` | 1 | 0 |
| `글루타치온 히알 아쿠아 포밍 젤 클렌저 (소비기한 2027-03-06)` | `글루타치온 히알 아쿠아 포밍 젤 클렌저` | 1 | 0 |
| `[옵션선택] 46cm 두취케어 약산성 데오드란트 샴푸` | `46cm 두취케어 약산성 데오드란트 샴푸` | 1 | 0 |

5건 모두 브랜드+상품명 정확 조회 1건 이상, 본문 183~245자 정상, summary 에 새 이름 반영. 검색성 저하 없음.

## 10. rollback

```sql
UPDATE product_masters
   SET name = tags->'nameCleanupV1'->>'before',
       regulatory_name = CASE WHEN regulatory_name = name THEN tags->'nameCleanupV1'->>'before' ELSE regulatory_name END,
       tags = tags - 'nameCleanupV1'
 WHERE tags ? 'nameCleanupV1';
```

설명서 `summary`/`content` 는 `tmp/cosmetics-name-cleanup/apply-result.json` 의 `items`(masterId·descId·beforeName·afterName) 기준으로 역치환한다.
선행 WO 의 `tags->>'woBatch'` 태그와 키가 분리돼 있어 독립 원복된다.

## 11. 산출물

- [`tmp/cosmetics-name-cleanup/census.json`](../../tmp/cosmetics-name-cleanup/census.json) · `census-rows.json.gz`
- [`dry-run.json`](../../tmp/cosmetics-name-cleanup/dry-run.json) · [`check-queue.json`](../../tmp/cosmetics-name-cleanup/check-queue.json) · [`consumer-audit.json`](../../tmp/cosmetics-name-cleanup/consumer-audit.json) · [`apply-result.json`](../../tmp/cosmetics-name-cleanup/apply-result.json) · [`post-verify.json`](../../tmp/cosmetics-name-cleanup/post-verify.json)
- 스크립트: [`apps/api-server/src/scripts/cosmetics-name-cleanup/`](../../apps/api-server/src/scripts/cosmetics-name-cleanup/) (01-census / 02-dry-run / 03-consumer-audit / 04-apply / 05-post-verify / rules / lib)

## 12. 후속 (중지 사유 아님)

- CHECK 큐 165건은 사람 판단 대상. 특히 `NAME_COLLISION_EXISTING` 102건은 **중복 master 통합 여부** 판단이 선행돼야 하므로 이름 정규화가 아니라 **중복 master 정리 WO** 로 다루는 것이 맞다.
- 선행 WO 의 결손 문제 큐 16,870건(`mainFeatures` 부재 11,500 최다) 보완 저작은 여전히 미착수.

## 13. Git

| 항목 | 값 |
|---|---|
| commit | (아래 커밋 SHA) |
| push | `origin/main` |
