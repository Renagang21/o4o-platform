# CHECK — 식이섬유+동반원료 Combo 최대 생산 (Agent B) V1

- 상위 WO: `WO-O4O-HFF-FIBER-PARTNER-COMBO-MAX-PRODUCTION-B-V1`. 자동승인 계약 적용.
- 선행: parser `74c9e8f2d`(고정, 추가 수정 0) · B fiber `b81ffa32a` · A cross-domain `62143ff70` — origin 포함 ✓.
- 시작 `2026-07-23 21:57 +0900` · 종료 단일 세션 · 채널 Proxy 5437.

## 0. 결론

> **78건 식이섬유+동반원료 Combo STORE canonical LIVE (자동 apply · 독립검증 PASS).** DB write **312**(78×4).
> 주력: **가르시니아+차전자피 61** · 가르시니아+난소화성 5 · 3원료 1 · fiber-only(키워드 오탐 복원) 9.
> **동반 기능성 전부 병기·완전성 가드 통과분만 LIVE**(미렌더 1건이라도 있으면 HOLD). generic 642 비추정 유지.
> canonicalDup 0 · statementNo 중복 0 · A/C 교집합 0 · drift 0.

## 1. B-01/02 PARTNER 1,131 census·소유권 분류

| 구분 | 수 |
|---|---:|
| pool | 1,131 (taken 53 · liquid 256 → **fresh 822**) |
| **B**(장·배변·혈당·체지방·면역·대사) | **340** (EN 완비 155) |
| **OWN-track**(프로바이오틱스·홍삼 포함) | 347 |
| **AMBIG**(A/C 도메인 혼합·미귀속) | 134 → HOLD |
| C(눈·인지·혈행 중심) | 1 → 이관 |
| A(관절·피부 중심) | 0 |

- 상위 signature: 프락토올리고당 171 · 아연+프락토 133 · **가르시니아+차전자피 96** · 아연+판토텐산+프락토 47 · 셀레늄+아연+프락토 42.
- 산출: `hff-fiber-prep/fiber-partner-census-summary.json` + domain별 명단(A/C/OWN/AMBIG — 이관·후속용).

## 2. B-03 완전성 가드 (하나라도 미렌더 → HOLD)

B 340 → **target PASS 78** · HOLD 262:

| HOLD 사유 | 수 | 처리 |
|---|---:|---|
| FN_EN_PENDING | 148 | 공식 정적 EN 부재(유익균 증식 등) — 임의생성 금지 → registry EN 확장 WO 대기 |
| SPECLESS(기능성 有·표시량 無) | 57 | 표시량 귀속 불가 → HOLD |
| FN_UNRENDERED | 23 | 미귀속 기능성 존재 → HOLD(누락 게시 금지) |
| Guard REVIEW/BLOCKED | 28 | 개별 분리 |
| SERVING/BULK/기타 | 6 | 개별 분리 |

- 렌더 검증 항목: 식이섬유 원료명·원료별 기능성·동반원료명·동반 기능성·표시량 귀속·섭취량·statementNo 전부.
- (영문) 인라인 블록은 KO 정본과 중복 → KO 기준 렌더 + mapFunctionEn EN(임의생성 0).

## 3. B-04 FN_EN_PENDING 90 검토

- 기존 90(fiber 단독) + 신규 148(partner) 전수: **공식 정적 매핑(FUNCTION_MAP/mapFunctionEn)에 부재** — MFDS 공식 영문 확보 전 확정 불가 → **전량 PENDING 유지**(축약·약화·임의생성 0). registry EN 확장(사람검수) 후 재수확 대상.

## 4. B-05~08 생산 + 게이트

| 원료수 | 생산 |
|---|---:|
| 2원료 | **68** (가르시니아+차전자피 61 · 가르시니아+난소화성 5 · 마그네슘+차전자피 1 · 아연+차전자피 1) |
| 3원료 | **1** (가르시니아+난소화성+비오틴) |
| fiber-only(오탐 복원) | 9 (차전자피4·난소화성3·귀리2) |
| **합계 LIVE** | **78** |

| 게이트 | 결과 |
|---|---|
| dry-run | PASS · candMatch 78(missing/ambiguous 0) · masterDup 0 · 312=78×4 |
| apply | **COMMIT** · in-tx postVerify 78/78/78 · canonicalDup 0 |
| 독립검증(tag `batch:fiber-partner-combo-b1`) | masters 78 · spdRefLinked 156 · **stmtDup 0 · canonicalDup 0 · PASS** |

- 원료별 표시량 교차귀속 0(같은 라인 캡처 구조) · 기능성 누락 0(완전성 가드) · 4~6원료·다식이섬유 clean 후보는 fresh 풀 무존재.

## 5. 잔여

- OWN 347(프로바이오틱스·홍삼 함유) → own-track 파이프라인. AMBIG 134 → 도메인 판정 후속. C 1 → C 이관.
- FN_EN_PENDING 238(90+148) → registry EN 확장 WO(사람검수). SPECLESS 57·미렌더 23 → 원문 한계, HOLD 유지.

## 6. 산출물

- `hff-fiber-prep/`: fiber-partner-b1-target(78)·holds(262)·census-summary·domain-A/C/OWN/AMBIG·rollback manifest.
- 도구(B 전용): `hff-fiber-partner-census.ts` · `hff-fiber-partner-produce.ts`.

---

*완결형 자동 생산 · DB write 312 · 공용 parser 무수정 · 기능성 누락 0 · generic 비추정 · 독립검증 PASS.*
