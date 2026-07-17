# CHECK · HFF 유산균 연속 End-to-End 생산 (WO-O4O-HFF-PROBIOTICS-CONTINUOUS-END-TO-END-PRODUCTION-V1)

- 담당: Agent A (유산균·프로바이오틱스 전용). 비타민·미네랄·Agent B·의약품 미접촉.
- 일자: 2026-07-18
- status: **PAUSED_EXTERNAL_DEPENDENCY_DB_WRITE_PERMISSION** (DB 적재는 권한 가능 세션 큐로 이관)

---

## PART A — Batch 003 226 LIVE (적재 대기)

오케스트레이터가 f82de45f5 로 처리 완료(`hff-b3-store-canonical-apply.ts` + `hff-b3-apply-lean.ts` + PENDING CHECK). 본 세션 기여:

- **§5 최신 Guard 재적용(226)**: BLOCKED **0** · REVIEW **5**(10건, 전부 `D-CLAIM-GROUNDED-002` 코팅 성상 중립인용 = 실제위반 REVIEW **0**) · ko/en 각 **226** · style/script **0** · 근거없는 물 **0** · 파편 **0** · source결손 **0** · 신고번호 유일 **226/226** · 비-batch003 코퍼스(2,431) 교집합 **0**. 최신 가드 `1c46a3651`(PRE-SRC-CFU 프로바이오틱스 범위화) HEAD 조상 확인.
- **DB write 0** (프록시/dry-run/apply 는 이 세션 권한 분류기 차단 → 미실행). 적재 절차·기대 write 904(master226+candidate226+SPD452)는 f82de45f5 PENDING CHECK 및 b3 스크립트에 고정.

## PART B — 유산균 추가 모집단 (DB 비의존)

### §9 read-only 재조사 결론 — 파일기반 P1 풀 소진

`poolA-remaining.json`(735) 중 Batch001~003·파일럿 사용분 제외 잔여 미사용 **100** → P1 필터(표시량·소비자 1일 N회·단일기능성·비액상) 통과 **94**. 정밀 분류:

| 분류 | 수 | 처리 |
|---|---|---|
| KIDS(아동/캐릭터) | 63 | 별도 검증 라인(§별도) |
| WOMENS(여성/인티메이트) | 9 | 별도 검증 라인 |
| EXPORT/개인화(Mylacto·Personalized·마이크로바이옴 등) | 13 | 제외 |
| COMBO(콜라겐) | 2 | 제외(복합) |
| INFANT(분유) | 1 | 별도 검증 라인 |
| SOURCE_ABNORMAL(CFU 미판독) | 2 | HOLD |
| BLACKLIST P1(특수포맷·기존제외) | 2 | 제외(알고케어 18캡슐 계량스푼·프로바이오틱스골드) |
| **WRITABLE P1** | **2** | 1 작성 / 1 HOLD |

> 표준 단일기능성(P1) 프로바이오틱스는 파일기반 모집단에서 **사실상 소진**. 잔여 적격 2건이 전량이며, 숫자를 채우려 복합·액상·벌크·대상성(아동/여성)·근거부족을 포함하지 않았다(§13 준수). 목표 1,000 은 파일기반으로 도달 불가 — 전체 프로바이오틱스 candidate 모집단은 DB(product_candidates) read-only 조회가 필요하나 동일 프록시 권한 차단.

### 생산 결과 (그룹 D-CP01)

| 항목 | 값 |
|---|---|
| 작성(production) | **1** — 생유산균 그린(종근당건강, 10억 CFU/2g, 1일1회1포) |
| HOLD | **3** — 전부 `HOLD_SOURCE_ABNORMAL`(원문 정정 필요) |
| BLOCKED(작성분) | **0** |
| REVIEW(작성분) | 1 — `PRE-SRC-BASIS-UNVERIFIABLE-003`(파서 basis 미판독). 원문 `1.0*10^9cfu/2g` basis **2g** 수동확인 완료 → 콘텐츠 위반 아님 |
| 반응형 5뷰포트 | PASS (1 × ko/en × 360·390·768·1024·1440) |
| ko/en 수치 대조 | 일치(10억 = 1 billion) |

**HOLD 3건**:
- `20040017014432` 셀립라이프타임가족유산균 — 원문 CFU 이중표기 `120,000,000(1억2천만)` 가 파서/가드에 상충값(1e8 vs 1.2e8)으로 읽힘 → ko 원문인용이 en 과 수량집합 불일치(`H-COUNT-MISMATCH-001` BLOCKED). 값은 1억2천만으로 일관하나 표기 정정 필요.
- `20120019007110` 일양살아있는프로바이오틱스장용캡슐 — `수(CFU/500 mg):표시량(100,000,000)` 값·단위 라벨 분리(VALUE_UNIT_SPLIT).
- `202000124466` 17종 생유산균 프로바이오틱스 — `300,000.000cfu` 소수점·천단위 혼용(DECIMAL_THOUSAND_MIX).

### 파서 개선 (일반화, 회귀 안전)

grounding CFU 추출기 `myCfu` 를 **명시적 콤마정수 우선**(한글 gloss 보다 authoritative)으로 정정 — `120,000,000(1억2천만)` 에서 gloss 선두 `1억`(1e8)만 잡히던 오독 방지. **Batch003 226건 회귀 = 226/226 동일값**(안전한 일반화). 파일: scratchpad `dcp-gen.mjs`.

## 별도 검증 라인 (오케스트레이터 결정 대상)

파일풀 내 **아동/여성/영유아 대상 73건**(KIDS 63·WOMENS 9·INFANT 1)은 별도 모집단이다. §13 「대상성 자동생성 금지」 및 HOLD 레지스트리(영유아=보호자 톤·주의문구 별도 검증)에 따라 **검증된 별도 패턴(보호자 톤·연령 주의문구)** 이 필요하며, 규제 톤 함의가 있어 본 P1 라인에서 즉석 생산하지 않았다. 20 파일럿 착수 여부는 오케스트레이터 판단.

## 적재 대기 큐 (실행 안 함)

- 그룹 D-CP01 production 1건: `hff-b3-store-canonical-apply.ts` 계약 재사용(loadTargets → `hff-probiotics-prod-d-cp01.json`, TARGET=1, 기대 write **4** = master1+candidate1+SPD ko1/en1). env 이중게이트 + 단일 트랜잭션 + 사후검증 PASS 시 COMMIT/불일치 ROLLBACK + 롤백매니페스트.
- 매니페스트: `docs/guides/products/health-functional-food/batch-probiotics-prod-004/PARTB-P1-RESIDUAL-MANIFEST.json`.
- **재개 절차**: 권한 가능 세션에서 Batch003(226) + D-CP01(1) 를 묶어 프록시(5460) 준비 즉시 dry-run → 조건충족 시 apply → 독립 사후검증 → 롤백매니페스트.

## 산출 파일

- 입력: `docs/checks/data/product-description-guard/hff-probiotics-prod-d-cp01.json`(+`-hold.json`)
- 초안: `docs/guides/products/health-functional-food/batch-probiotics-prod-004/D-CP01/drafts/*.{ko,en}.html`
- 매니페스트: 위
- 본 CHECK

## 완료 판정

파일기반 P1 유산균 모집단 소진(잔여 전량 처리: 1 작성 + 3 HOLD). 추가 대량 생산은 (a) DB read-only candidate 조회 권한 또는 (b) 아동/여성 별도 검증 패턴 승인 필요. 둘 다 외부 의존 → `PAUSED_EXTERNAL_DEPENDENCY`.
