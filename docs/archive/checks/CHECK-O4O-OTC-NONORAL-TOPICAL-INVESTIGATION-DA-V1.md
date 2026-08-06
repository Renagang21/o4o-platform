# CHECK-O4O-OTC-NONORAL-TOPICAL-INVESTIGATION-DA-V1 — 피부 외용제 독립 트랙 조사·대표 계약 검증 (에이전트 다)

WO: `WO-O4O-OTC-NONORAL-TOPICAL-10H-PRODUCTION-DA-V1` · 역할: 드럭 OTC 에이전트 다 · 성격: **read-only 조사 + 대표 계약 검증 (DB write 0)**.

## 0. 결론

> **피부 외용제 NON_ORAL 트랙을 분리·정량화하고 대표 10형 계약을 감사한 결과, 현행 committed 인프라로 안전하게 생산 가능한 후보 = 0.** 생산 착수 전 확정해야 할 4대 블로커(authored draft 부재 · 승인 디자인의 editorial 필드 · route/점막 혼입 · 콘텐츠-authoring 불변원칙)를 확인했다. **본 세션 DB write 0 · target 밖 drift 0 · canonicalDup 0 · 타 에이전트 claim 교집합 0.**

WO의 대표 계약 검증(≥10 후보 감사) 결과 = **생산 계약을 안전하게 확정할 수 없음** → 생산 대신 조사·spec·분류를 산출물로 확정. (WO: "임의 공통화가 필요하면 HOLD" · "신규 의료 판단 필요 시 HOLD".)

## 1. NON_ORAL 조사 규모

- bridge fingerprint 그룹 6,216 중 **topical 1,857 그룹 / 4,365 master** (extendability=`비경구-별도트랙`, authoredRefs **0**).
- 미생산(easy-drug STORE ko canonical 有 · mfds_drug_otc canonical 無) 전수 분류(18,473) 중 **피부 외용 2,462 master**:
  - 크림 1,052 · 겔 715 · 연고 305 · 스프레이 170 · 외용액 117 · 로션 103
- **HOLD_PATCH(첩부·플라스타·카타플) 1,517** (별도 상태).
- 제외 3,185: 안이비(점안/점이/비강/흡입) 976 · 점막 103 · 좌제·질 80 · route 불명확 2,026. (경구 11,309 = 범위 밖.)

## 2. 대표 계약 검증 (10형 감사)

| 대표형 | 원문 4축(효능/용법/주의/이상) | 외용전용 | 눈회피 | 도포횟수 | 기간 | 복용표현 | 판정 |
|---|:---:|:---:|:---:|:---:|:---:|:---:|---|
| 단일 크림(테르나졸) | ✅ | ✅ | ✅ | ✅ | ✅ | 0 | 원문 충분·editorial 필드만 결여 |
| 단일 연고(리도킨) | ✅ | – | ✅ | – | – | 0 | 도포횟수/기간 원문 결여 → VARIANCE |
| 겔(피캄스) | ✅ | – | – | ✅ | – | 0 | 눈회피/기간 결여 |
| 외용액(유클리어톡) | ✅ | ✅ | ✅ | ✅ | – | 0 | 양호 |
| 스프레이(코마키텐**나잘**) | ✅ | – | – | ✅ | ✅ | **1** | **route 혼입(비강)** → EXCL |
| 로션(코디케어) | ✅ | – | ✅ | ✅ | ✅ | 0 | 양호 |
| 복합 크림(하이로손, 수출명) | ✅ | – | ✅ | ✅ | ✅ | 0 | **수출명** → EXPORT 주의 |
| 패치(동의고카타플라스마, 수출명) | ✅ | ✅ | – | ✅ | – | 0 | HOLD_PATCH |
| 점막위험(래반포르테주입크림) | ✅ | – | ✅ | ✅ | – | 0 | route 모호 |

> 원문 4축은 9/9 전부 존재(결정적 추출 가능). 그러나 **외용전용·도포횟수·기간·눈회피 마커가 제품별 불균일** → fingerprint 그룹 내 HOLD_FREQUENCY/DURATION/APPLICATION_SITE_VARIANCE 다발 예상. name 기반 topical 버킷에 **나잘스프레이(비강)** 혼입 = 제품별 route/점막 스크리닝 필수.

## 3. 생산 블로커 (계약 확정 불가 근거)

1. **authored draft 0** — topical 승격(grounded-upgrade) 대상 없음(oral 95건 전부 경구).
2. **승인 디자인 editorial 필드** — sd-* summaryTable(작용/선택포인트 = How it works/Why this one)이 공식 원문에 부재. 생성 시 WO의 "신규 의료 문구·마케팅 표현 추가 금지"·"기존 템플릿 재설계 금지" 상충.
3. **route/점막 혼입** — name 기반 분류로 비강·점막 오분류(복용표현 검출) → 제품별 정밀 스크리너 필요.
4. **콘텐츠-authoring 불변원칙** — 의약품 소비자 콘텐츠는 외부 초안 자동생성 금지·공식 원문 grounding·DB 반영은 승인·이중게이트 후. 자율 대량 생성+apply 불가.

## 4. 생산 착수 선행조건 (후속 WO 범위)

- (1) grounded **topical 결정적 composer**(원문→sd-*, 경구표현 0, 원문 축 보존)
- (2) editorial 필드 정책 확정(원문 파생 규칙 or 디자인 예외 승인)
- (3) 제품별 **route/점막 스크리너**(비강·안과·구강·질 완전 배제)
- (4) **topical EN builder**(apply/spread/spray, GUIDE V0.5·GLOSSARY V0.2·route TEST-LOG)
- (5) 승인·이중게이트 apply + 독립검증

## 5. 상태별 분류

| 상태 | 수 |
|---|---:|
| READY_TOPICAL_* (생산 대상) | **0** (계약 미확정) |
| HOLD_CONTRACT_UNDEFINED (피부 외용) | 2,462 |
| HOLD_PATCH | 1,517 |
| HOLD_MUCOSAL | 103 |
| EXCLUDED (안이비/좌제질/route불명) | 3,082 |
| COMPLETED | 0 |

## 6. 보고 요약

```text
실제 작업: 조사·대표계약검증(read-only) · DB write 0
종료 이유: 대표 계약 검증 결과 안전 생산 계약 확정 불가(신규 authoring 필요) → WO "HOLD 후 조사 산출물 확정"
NON_ORAL 조사: 1,857 group / 4,365 master(bridge) · 미생산 피부외용 2,462 master
피부 외용 분리: 크림 1052·겔 715·연고 305·스프레이 170·외용액 117·로션 103 = 2,462
완료 그룹 0 · 완료 master 0 · KO write 0 · EN write 0
route HOLD: HOLD_PATCH 1517 · HOLD_MUCOSAL 103 · EXCL(안이비/좌제질/route불명) 3082
canonicalDup 0 · target 밖 drift 0 · 재실행 no-op N/A(write 0)
DB 연결: proxy 5433/5436 ECONNRESET(타 세션 프록시 불안정), 5444 healthy read-only 사용 · 공용 프록시 미종료
commit: 본 CHECK + inventory(otc-nonoral-topical-inventory-da.json)
origin/main 동기 예정 · 미푸시 자기 산출물 0(커밋 후)
다음 재시작 지점: topical composer/EN-builder 계약 확정 WO → READY_TOPICAL_SINGLE(단일 크림/연고 원문축 완전형)부터
```

## 7. 산출물

- 인벤토리/분류/대표감사: `docs/checks/data/product-description-guard/otc-nonoral-topical-inventory-da.json`
- 본 문서. 코드/DB write **0**. 공용 runner registry·타 claim·`pnpm-lock.yaml` 미접촉. 기존 da claim(nutrition-combo) 미변경.
