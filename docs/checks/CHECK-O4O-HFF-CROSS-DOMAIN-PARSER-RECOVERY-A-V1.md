# CHECK — HFF 교차도메인 Parser 보강 후 A 잔여 재생산 (Agent A) V1

- WO: `WO-O4O-HFF-CROSS-DOMAIN-PARSER-RECOVERY-A-V1` · 자동승인 계약 적용.
- 성격: **재분석(read-only) + A 주도 교차도메인 재생산(자동 apply)**. 공용 parser **추가 수정 0**(`splitFunctions` read-only import만). A 전용 additive(`hff-combo-a-mixed-build.ts`) 보완.
- 종료 `2026-07-23 22:05 +0900`.
- 선행: `62143ff70`(A cross-domain)·`74c9e8f2d`(공용 parser, 고정 기준)·`b81ffa32a`(B fiber) origin/main 포함 확인. 검증 = 자기 manifest tag/stmt/master/candidate 기준(전역 LIVE 는 drift 지표 아님).

## 0. 결론

> **Parser 보강(`splitFunctions` 원자 분리·라벨경계) 적용으로 PENDING_SHARED_PARSER 잔여에서 A 주도 교차도메인 45건 신규 LIVE** (고형 21 + 액상 24).
> DB write **180**(45×4) · canonicalDup 0 · statementNo 중복 0 · stmtDupMasters 0 · **independentVerifyPass true**(2배치).
> **기존 34건 재생성 0**(exclude-taken) · **기능성 삭제 0**(완전성 가드) · **가비지 렌더 0**(콜론·라벨잔재 클린니스 가드).

## 1. Parser 적용 검증 (74c9e8f2d 기준)

| 항목 | 결과 |
|---|---|
| 이전 미커버 문장 원자 추출 | `extractFunctionsKo`→`splitFunctions` 교체(브래킷 하드경계 sentinel·번호·구분자·라벨접두 스트립). 이중언어 `(영문)` 블록 사전 제거(국문만). incomplete **128→103** |
| (국문)/(영문) 블록 포함 | `(영문)…` 제거 후 국문 기능성만 원자 추출 |
| 원료별 기능성 귀속 유지 | A=레지스트리 FN(불변)·비-A=splitFunctions+mapFunctionEn. `attributeFunctions`(A 귀속) 무변경 |
| 표시량 타 원료 이동 | N/A — 기능성-기반 렌더(표시량 미기재) |
| 기능성 일부 누락 | 완전성 가드: 전 문장이 (A ∪ 비-A 매핑) 커버 안 되면 HOLD |
| **기존 생산 34 재생성** | **0** (target ∩ 기존34 = 0, exclude-taken 35 확인) |
| EN 미매핑 문장 | `FN_EN_PENDING` 분리(해당 제품만 HOLD, 배치 계속) |

## 2. 생산 (A-03/A-05)

| 배치 | tag | target | LIVE | DB write |
|---|---|:-:|:-:|:-:|
| 고형 재생산(v2) | batch:combo-a-crossdomain-v2 | 21 | **21** | 84 |
| 액상(clear-serving) | batch:combo-a-crossdomain-liquid-v1 | 24 | **24** | 96 |
| **합계** | | 45 | **45** | **180** |

- 액상 24 = 젤리스틱·앰플·젤리컷 등 **명확한 serving**(1회 1포/1병 · 1일 N회, chips 정합). 기능성-기반 렌더라 **총내용량↔원료량 혼동 없음**(basis 미사용). 서빙 불명확분은 HOLD.
- 비-A 기능성 병기(삭제 0): 예 히알루론산(피부보습·자외선) + 비타민D(뼈 형성) + 혈행/항산화 등 원문 공식 기능성 전부 "함께 표시된 공식 기능성(원문 보존)" 블록.

## 3. 자동 apply 게이트 (2배치 전통과)

| 게이트 | v2 고형 | 액상 |
|---|---|---|
| dry-run·postVerify | PASS · candMatch 21(0/0)·masterDup 0 | PASS · candMatch 24(0/0)·masterDup 0 |
| 예상=실측 | 84=21×4 | 96=24×4 |
| canonicalDup | 0 | 0 |
| 독립검증(tag) | masters/ko/en 21·spdRefLinked 42·stmtDupMasters 0·**PASS** | masters/ko/en 24·spdRefLinked 48·stmtDupMasters 0·**PASS** |

- 계약: canonical·STORE·o4o_hff_generated·barcode NULL·approved_new_master. 롤백 매니페스트 2종. **자기 manifest drift 0 · B/C 교집합 0**.

## 4. PENDING_SHARED_PARSER 128 재판정 결과

| 결과 | 수 | 비고 |
|---|:-:|---|
| **재생산 LIVE** | **45** | 고형 21 + 액상 24 |
| FN_EN_PENDING / INCOMPLETE | ~103 | 비-A 기능성이 공용 `mapFunctionEn` 미등재(개별인정 기타기능 등) → 공용 EN 레지스트리 보강 시 재평가(본 WO 범위 밖) |
| Guard BLOCKED/REVIEW | 27 | 개별 grounding 미검증 |
| SKIN_AMBIGUOUS·NAME_SEG_NO_FUNC·A귀속실패 | 2·1·4 | A 귀속 모호(parser 무관) — 원천 라벨 정밀화 시 재평가 |

- **SKIN_AMBIGUOUS/NAME_SEG 는 parser 보강과 무관**(A 원료 간 피부기능 귀속 모호) → HOLD 유지 정당.

## 5. 매장 원칙 준수

공식 관절·연골·피부 기능성 + 동반 B/C 기능성 **전부 보존**(삭제 0, 완전성 가드) · 질환·전문용어 순화 0 · 원문 밖 주장 0 · 전문가 상담 footer 유지.

## 6. 보고 요약

```text
종료 2026-07-23 22:05 +0900 · 공용 parser 무수정(splitFunctions import) · A 전용 additive 보완
parser commit 74c9e8f2d 확인 · incomplete 128→103(원자추출+FN_EN_PENDING 분리)
재생산: 고형 21 + 액상 24 = 신규 LIVE 45 · DB write 180
기존 34 재생성 0 · 기능성 삭제 0 · 가비지 0 · canonicalDup 0 · statementNo 중복 0 · stmtDupMasters 0
액상: 명확 serving 후보만(젤리/앰플/포/병), basis 미사용(기능성-기반)
FN_EN_PENDING/incomplete ~103(공용 EN 레지스트리 필요)·Guard 27·SKIN_AMBIG 2·NAME_SEG 1·attr-fail 4 (개별 HOLD)
독립검증 PASS(2배치) · 자기 manifest drift 0 · B/C 교집합 0
교차도메인 누적 LIVE 34→79
남은 TODO: FN_EN_PENDING(공용 EN 보강)·SKIN_AMBIGUOUS(라벨 정밀화)
중지 사유: 없음
```

## 7. 산출물

- A 전용 tool 보완: `apps/api-server/src/scripts/hff-combo-a-mixed-build.ts`(splitFunctions·FN_EN_PENDING·클린니스 가드 강화).
- data: `docs/checks/data/product-description-guard/hff-combo-a-crossdomain/` — v2/액상 target·hold·rollback-manifest(2).
- 본 문서.

---

*재분석 read-only · 생산 자동 apply. 공용 parser 무수정(import) · A 전용 additive만 · DB write 180 · 독립검증 PASS · 기존 34 재생성 0.*
