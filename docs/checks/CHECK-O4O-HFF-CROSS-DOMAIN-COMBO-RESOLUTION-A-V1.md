# CHECK — HFF MIXED_NONA 교차도메인 Combo 재분류·생산 (Agent A) V1

- WO: `WO-O4O-HFF-CROSS-DOMAIN-COMBO-RESOLUTION-A-V1` · 자동승인 계약 적용.
- 성격: **재분류(read-only) + A 주도 교차도메인 생산(자동 apply)**. 공용 parser/registry/classify/composer/apply/Guard **무수정** — A 전용 additive 파일만.
- 종료 `2026-07-23 20:50 +0900`.
- 선행 확인: `2c33268f2`(A)·`26cb4253f`(B)·`828704e82`(C) origin/main 포함. baseline canonicalDup 0·statementNo 중복 master 0(독립검증 실측). 전역 LIVE 는 병렬 생산 공유 증가 → drift 지표 아님(manifest ID 기준).

## 0. 결론

> **MIXED_NONA 244 전수 재분류 완료 + A 주도 교차도메인 combo 34 신규 LIVE.**
> DB write **136**(master 34 + candidate 34 + SPD ko 34·en 34) · canonicalDup 0 · statementNo 중복 0 · stmtDupMasters 0 · **independentVerifyPass true**.
> **비-A(B/C) 기능성 삭제 없이 병기** — 완전성 가드로 미렌더 시 HOLD(삭제 방지).

## 1. MIXED_NONA 244 재분류 (A-01/A-02, read-only)

`hff-combo-a-mixed-analyze.ts`(A 전용 additive) — 전체 기능성 원료 signature 로 판정(제품명 무관):

| 분류 | 수 | 정의 |
|---|:-:|---|
| **B_LED** | 111 | A 원료 + **장·배변·혈당·체지방·면역** 도메인(프로바이오틱스·식이섬유·가르시니아·홍삼 등) → B 이관 |
| **C_LED** | 87 | A 원료 + **눈·인지·혈행·중성지질·항산화** 도메인(루테인·은행잎·오메가3·Q10 등) → C 이관 |
| **AMBIGUOUS** | 46 | 다도메인 혼합 or 간·기타(밀크씨슬·강황·백수오 등) → HOLD |
| 합계 | 244 | |

- 도메인 분포: C 91·B 111·AMBIG 20·B+C 11·AMBIG+C 6·AMBIG+B 2·AMBIG+B+C 3.
- **A 주도 렌더가능 후보 57**(A 귀속 성공 + 비-A 전부 `mapFunctionEn` 매핑 + 미생산). 산출물: `mixed-nona-classified.json`·`mixed-nona-a-led-renderable.json`.

## 2. A 주도 교차도메인 생산 (A-03/A-04)

`hff-combo-a-mixed-build.ts`(A 전용 additive) — A 기능성(레지스트리 canonical) + 비-A 기능성(`extractFunctionsKo`→공용 `mapFunctionEn` EN, 임의생성 0) **병기 렌더**. **완전성 가드**: MAIN_FNCTN 전 기능성 문장이 (A ∪ 비-A 매핑)으로 커버 안 되면 HOLD(삭제 방지). **클린니스 가드**: 라벨 잔재(`원료명:`·EPA/DHA/NAG·함유유지) 섞인 문장 → HOLD(가비지 렌더 방지).

| 단계 | 수 |
|---|---:|
| MIXED_NONA | 244 |
| A 귀속 실패 | 4 |
| 액상(고형 apply 대상 아님) | 54 |
| taken/promoted | 1 |
| **완전성 미충족(비-A 미렌더)** | **128** → PENDING_SHARED_PARSER |
| Guard BLOCKED | 18 |
| Guard REVIEW | 5 |
| **TARGET (생산)** | **34** |

- 34 = 관절·피부 A 기능성 + (비-A 공식 기능성 병기 24 · 순수 A 10). 가비지 렌더 0(클린니스 가드로 3건 제외).
- 예: `글루코사민+오메가3` → 글루코사민 "관절 및 연골 건강" + 병기 "혈중 중성지질·혈행 개선"(삭제 0).

## 3. 자동 apply 게이트 (전통과)

| 게이트 | 결과 |
|---|---|
| dry-run(exec+rollback) | PASS · candMatch 34(missing/ambiguous 0) · masterDup 0 · 예상=실측 136=34×4 · postVerifyPass ✓ |
| apply(`HFF_SF_APPLY_CONFIRM=YES`) | **COMMIT** · in-tx postVerify 34/34/34 · canonicalDup 0 |
| **독립검증(새 연결, manifest tag)** | masters 34 · spdKo 34 · spdEn 34 · **canonicalDup 0** · candidatesLinked 34 · spdRefLinked 68 · **stmtDupMasters 0** · **independentVerifyPass true** |

- 계약: status=canonical · description_type=STORE · source_type=o4o_hff_generated · barcode NULL · candidate=approved_new_master · tag `batch:combo-a-crossdomain-v1`. 롤백 매니페스트 master 34·spd 68. **자기 manifest ID 기준 drift 0**. **B/C manifest 교집합 0**(MIXED_NONA 는 A 재분류 소유, B/C 는 B_LED/C_LED 이관 목록 수신).

## 4. 매장용 설명서 원칙 준수

- 공식 기능성(관절 및 연골 건강·피부보습·자외선 피부손상) verbatim 유지·순화 0.
- **비-A(B/C) 기능성 삭제 없이 병기**("함께 표시된 공식 기능성 (원문 보존)" 블록). 삭제 시 완전성 가드가 HOLD.
- 원문 밖 치료·예방 주장 0. 전문가 상담 footer("매장 내 약사 등 전문가와 상담") 유지.

## 5. 잔여 (개별 HOLD·PENDING — 전체 중지 아님)

| 유형 | 수 | 처리 |
|---|:-:|---|
| B_LED / C_LED | 111 / 87 | **B/C 이관**(classified.json, 도메인 중심) |
| AMBIGUOUS | 46 | HOLD(다도메인·간·기타) |
| PENDING_SHARED_PARSER(완전성 미충족) | 128 | 비-A 기능성 문장이 `extractFunctionsKo`/`mapFunctionEn` 미커버(구분자·라벨 변이) → 공용 파서 보강 시 재평가 |
| 액상 | 54 | 액상 모델 트랙(기준량 grounding 확보 후) |
| Guard BLOCKED/REVIEW | 23 | 개별 grounding 미검증 |
| SKIN_AMBIGUOUS·NAME_SEG_NO_FUNC·A귀속실패 | 3+4 | 원천 라벨 정밀화 시 재평가 |

## 6. 보고 요약

```text
종료 2026-07-23 20:50 +0900 · 공용 무수정 · A 전용 additive
MIXED_NONA 244 재분류: B_LED 111 · C_LED 87 · AMBIGUOUS 46 (A 주도 렌더가능 57)
A 주도 교차도메인 생산: TARGET 34 → 신규 LIVE 34 (2~N원료, 비-A 병기 24·순수 A 10)
DB write 136 · canonicalDup 0 · statementNo 중복 master 0 · stmtDupMasters 0
완전성/클린니스 가드 HOLD: incomplete 128(PENDING_SHARED_PARSER)·garbage 0
액상 54 · Guard 23 · AMBIG 46 · A귀속실패 4 (개별 HOLD, 전체 중지 아님)
독립검증 PASS · 자기 manifest drift 0 · B/C 교집합 0
남은 TODO: 액상 grounding 트랙 · PENDING_SHARED_PARSER(공용 파서 보강) · SKIN_AMBIGUOUS 2·NAME_SEG 1
중지 사유: 없음
```

## 7. 산출물

- A 전용 tools(신규): `apps/api-server/src/scripts/hff-combo-a-mixed-analyze.ts` · `hff-combo-a-mixed-build.ts`.
- data: `docs/checks/data/product-description-guard/hff-combo-a-crossdomain/` — target(34)·hold·pool·classified·a-led-renderable·rollback-manifest.
- 본 문서.

---

*재분류 read-only · 생산 자동 apply(자동승인). 공용 parser/registry/classify/composer/apply/Guard 무수정 · A 전용 additive만 · DB write 136 · 독립검증 PASS.*
