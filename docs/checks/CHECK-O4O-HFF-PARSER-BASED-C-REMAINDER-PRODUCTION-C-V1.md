# CHECK — Parser 기준 C 잔여 Combo 생산 (Agent C) V1

- WO: `WO-O4O-HFF-PARSER-BASED-C-REMAINDER-PRODUCTION-C-V1` · 자동승인 계약 [`...AUTO-AUTHORIZATION-CONTRACT-V1`](../work-orders/WO-O4O-HFF-CONTENT-PRODUCTION-AUTO-AUTHORIZATION-CONTRACT-V1.md).
- 성격: parser commit `74c9e8f2d` 고정 기준 · **공용 parser/registry/classify/composer/apply/Guard 무수정** · C 전용 additive 재사용만.
- 시작 `2026-07-23 22:00 +0900` · 종료 단일 세션. 채널 Cloud SQL Proxy 5448(자체 OAuth 토큰, netureyoutube:asia-northeast3:o4o-platform-db).
- 선행 commit origin/main 확인: 공용 parser `74c9e8f2d` · C 미등록 Combo `828704e82` · A cross-domain `62143ff70` · B fiber `b81ffa32a`. HEAD=b81ffa32a(동기).

## 0. 결론

> **안전 후보 최대 생산 = 1 LIVE**(C_LED 등록형 combo 2024002023365). DB write **4**(master 1 + candidate 1 + SPD ko/en 2).
> 코퍼스 **수렴 확인**: C_LED 87 중 39 이미 taken·47 개별 HOLD, C-unreg fresh 5 중 5 전량 amount/claim 가드 HOLD.
> 신규원료(레시틴·스피루리나·클로렐라·당귀) 등록 **보류**(공식 EN canonical 미확정·저수율), **홍경천 PENDING**(EN 미확정, WO 명시).
> canonicalDup 0 · statementNo 중복 0 · BLOCKED target 0 · expected=actual write 4 · **독립검증 PASS** · A/B 교집합 0 · 자기 manifest drift 0.

## 1. C_LED 87 재분류 결과 (우선 대상 #1)

A 이관 `mixed-nona-classified.json:C_LED`(87) 재분석(read-only, 공용 parseSpecs 기준):

| 구분 | 수 | 처리 |
|---|--:|---|
| 이미 taken(병렬 세션 생산) | 39 | 제외 |
| not-taken | 48 | 아래 진단 |
| ├ UNKNOWN_LABELS | 33 | **HOLD** — 히알루론산·세라마이드·콜라겐(A도메인 피부, 미등록) + `(N) 원료`·`EPA와DHA의 합` 등 **공용 parseSpecs 포맷갭(PENDING_SHARED)**. 공용 parser 무수정 원칙으로 미생산 |
| ├ N_LT_2(등록키 <2) | 11 | HOLD |
| ├ ATTR_FAIL | 1 | HOLD |
| └ 등록형 harvest 적격 | 1 | **생산**(amount/serving 게이트로 3→1) |

- C_LED 미등록 원료 대다수 = **A 도메인 피부 원료**(히알루론산 54·세라마이드 7 등) → C 가 임의 등록 시 도메인 소유 충돌. A 좌표로 남김.

## 2. Parser 적용 전후 (우선 대상 #2/#10)

- 공용 parser `74c9e8f2d`(식이섬유 additive) 는 **B 도메인**(장·배변) 대상 — C 도메인(눈·인지·혈행) 신규 구조화 기여 **없음**(C_LED UNKNOWN_LABELS 는 fiber 아닌 `(N)`/EPA·DHA 합 포맷갭).
- `parseSpecs` PENDING_SHARED 복구: C_LED UNKNOWN_LABELS 33 이 해당. **공용 parser 추가 수정 금지**(WO) → 재평가 보류. 원료 간 표시량 교차연결·다원료 합침·원자 누락은 생산분(1)에서 0(§4 게이트).

## 3. C-unreg fresh discovery (우선 대상 #9)

- 전 코퍼스 C-unreg harvest(injectC 5원료): scanned 41,261 · signatures 97 · **eligible 501 · fresh 5**.
- **수렴**: eligible 496 이미 taken(병렬 C 세션 493 + 후속). fresh 5 = 잔여 난이도 높은 조합.
- fresh 5 generate 결과 **전량 auto-HOLD**: G-MULTI-AMOUNT-SOURCE 4(액티브솔루션·올인원브레인아이·메모리메이트·써큐파워) + D-CLAIM-UNGROUNDED 1(VIKlab, 제품명 특허형 클레임). → 표시량 근거·클레임 가드가 정상 차단. 개별 HOLD.

## 4. 생산 1건 게이트 (전통과)

대상: `2024002023365` 눈ㆍ관절ㆍ기억력개선 N 뉴랜드 — `글루코사민|루테인|망간|비타민A|비타민E|오메가3`(6원료).

| 게이트 | 결과 |
|---|---|
| generate | PASS/REVIEW 1 · BLOCKED 0 · REVIEW rule E-NAME-DERIVED-GROUNDED-002(근거명, 허용) |
| dry-run(hff-nutrient-store-canonical-apply --skip-promoted) | postVerifyPass ✓ · expectedWrites 4 · sanitize 무손실(ko 3079·en 4160) · DB write 0 |
| apply(`HFF_NUTRIENT_APPLY_CONFIRM=YES --apply`) | **COMMIT** · postVerify masters1/spdKo1/spdEn1/canonicalDup0/candLinked1/spdRef2 |
| 독립검증(hff-combo-c-independent-verify, 새 연결·manifest master id) | masters1·spdKo1·spdEn1·**canonicalDup0**·candidatesLinked1·sourceHff2 · **independentVerifyPass true** |

- 계약: status=canonical · description_type=STORE · source_type=o4o_hff_generated · barcode NULL · candidate=approved_new_master · regulatory_type=건강기능식품. 롤백 매니페스트 master1·spd2·cand1.
- 설명서: 6원료 공식 기능성 전량 보존(글루코사민 관절 = **동반 A 기능성 삭제 0**, 루테인 눈·오메가3 혈행/중성지질/기억력/눈건조·망간·비타민 항산화/시각). 원문밖 치료·예방 클레임 0. 전문가 상담 footer 유지. EN 충실 번역(임의 의미생성 0).

## 5. 신규원료 판정 (우선 대상 #3~#8)

not-taken·solid 상한(공용 census, 조합/기능성/게이트 필터 전):

| 원료 | not-taken solid | 판정 |
|---|--:|---|
| 레시틴 | 1 | 신규 registry 필요 · 공식 EN canonical 미확정 → **미등록 보류** |
| 스피루리나 | 5 | 동상 · **미등록 보류** |
| 클로렐라 | 5 | 동상 · **미등록 보류** |
| 당귀 | 0 | 전량 액상 → 대상 외 |
| 나토균배양분말 | 3 | 이미 injectC 등록 · ≥2등록원료 조합 부재로 fresh 0 |
| **홍경천** | 45 | **PENDING** — 공식 EN 기능성 정본 미확정(WO 명시), 등록 안 함 |

- WO 등록 기준(공식 기능성 원료명·KO·EN 정본·표시량·지표·1일섭취·statementNo 전부 확정) **미충족** → CLAUDE.md 원문밖 의료사실 생성금지 준수로 미등록. 저수율(≤4)이라 ROI 낮음도 부기.

## 6. 자동 apply 게이트 종합

| 게이트 | 결과 | | 게이트 | 결과 |
|---|---|---|---|---|
| parser 회귀 | 0(무수정) | | canonicalDup | 0 |
| 기존 C 생산 재생성 | 0(taken 제외) | | statementNo 중복 | 0 |
| 기능성 누락 | 0 | | BLOCKED target | 0 |
| dry-run·postVerify | PASS | | expected=actual write | 4=4 |
| rollback manifest | 생성 | | A/B/C 교집합 | 0 |
| 자기 manifest drift | 0 | | 독립검증 | PASS |

- 전체 중지 사유(§WO): 없음. 개별 HOLD/PENDING 은 계속 처리 원칙대로 분리.

## 7. 산출물 (C 전용, 공용 무수정)

- data: `docs/checks/data/product-description-guard/hff-combo-c-remainder/` — target(1)·drafts(ko/en)·blocked-hold(5)·rollback-manifest·census-summary.
- 재사용 도구(무편집): `hff-combo-c-unreg-harvest`·`hff-combo-c-harvest`·`hff-combo-c-unreg-generate`·`hff-nutrient-store-canonical-apply`·`hff-combo-c-independent-verify`·`hff-combo-c-unreg-registry(injectC)`.
- 본 문서.

## 8. 남은 TODO

- C_LED UNKNOWN_LABELS 33(PENDING_SHARED): 공용 parseSpecs `(N) 원료`/`EPA와DHA의 합` 포맷갭 보강 시 재평가(별도 parser WO).
- 히알루론산·세라마이드·콜라겐 등 A 도메인 피부 원료 combo: A 좌표(도메인 소유).
- 신규원료(레시틴·스피루리나·클로렐라) 등록: 공식 EN canonical 확정 후.
- 홍경천 45: 공식 EN 기능성 정본 확정 시 등록·생산.
- C-unreg amount-source HOLD 5: 표시량 근거 정밀화 시 재평가.

---

*parser 74c9e8f2d 고정 · 공용 무수정 · C 전용 additive 재사용 · DB write 4 · 독립검증 PASS · 코퍼스 수렴 확인.*
