# CHECK-O4O-OTC-ORAL-MULTI-INGREDIENT-COMBO-DISCOVERY-AUDIT-GA-V1

WO: `WO-O4O-OTC-ORAL-MULTI-INGREDIENT-10H-PRODUCTION-GA-V1` · 에이전트 **가(GA)**
일시: 2026-07-22 · **READ-ONLY · DB write 0 · apply 0 · canonical 승격 0**

---

## 1. 결론 (verdict)

**NO_NEW_BATCH** — 경구 복합성분(oral multi-ingredient) 일반의약품 후보 풀 전수 감사 결과,
**본 WO 안전계약(신규 의료 판단 없이 기존 원문만으로 · full-content fingerprint 재현 · existing canonical 무충돌)을
충족하는 READY 그룹은 0.** 잔여 후보 전량이 **신규 작성(새 KO 설명서 저술)** 을 요구하며, 복합제 신규 작성은
**여러 성분의 종합 효능 합성 = 신규 의료 판단**에 해당하여 WO §"EN 계약"·§"공통 중지 조건"(남은 후보 전부가 신규
의료 판단 필요)에 따라 자동 생산 대상에서 제외한다.

생산(KO/EN write)은 수행하지 않았다. 안전 후보 소진 + 공통 중지 조건 충족으로 조기 종료.

---

## 2. 모집단 · 채널

- DB: 프로덕션 `o4o_platform`, Cloud SQL Auth Proxy(127.0.0.1:5434, 공유 프록시). **SELECT 전용**.
- 모집단: `product_masters.regulatory_type='DRUG'` + `product_drug_extensions.drug_category='otc'` +
  `mfds_easy_drug` STORE canonical 보유(grounded pool) = **18,427 master**.
- authored(기존 완결) source_type: `mfds_drug_otc`, `mfds_drug_otc_nutrition_combo`, `nutrition_combo`.

## 3. 기존 완결 트랙 상태 (재생산 금지 확인)

| source_type | KO canonical | EN canonical | 판정 |
|---|---:|---:|---|
| `mfds_drug_otc` (단일 grounded, 58 그룹) | 1,976 | 1,976 | 100% bilingual — EN-missing 0 |
| `mfds_drug_otc_nutrition_combo` (16 그룹) | 1,915 | 1,915 | 100% bilingual — EN-missing 0 |

→ **EN_ONLY 잔여 풀 = 0.** nutrition_combo 16 그룹 전부 KO+EN 완결(가 7 · 나 8 · 다 1, 전 세션 DONE).
단일 grounded 트랙은 CLOSED. **기존 완결분 재생산 금지 준수(write 0).**

## 4. 복합성분 후보 풀 (bridge SSOT · `otc-full-corpus-authored-bridge-summary-v1.json`)

경구 무성분명(ATC-keyed = 복합제 대리) master 분류:

| bucket | master | 본 WO 처리 |
|---|---:|---|
| 새설명서필요 | 6,274 | HOLD_SOURCE / 새 저술 필요(복합 효능 합성) |
| 안전지문불일치 | 418 | HOLD_SAFETY_MISMATCH |
| 검토후확장 (authored 내부 충돌) | 314 | REVIEW_LATER — WO "authored 충돌 = 자동 확장 금지" |
| 그대로확장 (pharmKey+dominant-safety 일치) | 295 | REVIEW_LATER — 아래 §5 참조(full-fp 미검증) |

명시적 복합제(name `·`≥2 / 성분 콤마) → `비경구별도트랙`(6,223) 로 별도 분리(범위 외).

## 5. 핵심 발견 — 복합제는 full-source-fingerprint 안전 확장이 불가능

독립 감사(`otc-oral-multi-ingredient-combo-fp-audit-ga.mjs`, bridge fingerprint 함수 VERBATIM):

- 경구 복합 fingerprint 클러스터 **2,826 그룹 / 11,439 master** 전수 그룹화.
- **authored anchor 를 같은 full-source-fingerprint 안에 가진 그룹 = 0** (`groups_with_authored_sibling: 0`).

구조적 원인(DB 실측):

- `mfds_easy_drug` canonical master(18,473) 와 authored ko canonical master(3,891) 는 **완전 disjoint
  (교집합 0)** — authored 승격 시 easy_drug canonical 이 강등된다.
- 따라서 authored anchor 는 grounded(easy) 원문을 보유하지 않아, **대상 easy 형제와 full-content
  fingerprint 를 대조·재현할 수 없다** (WO READY 필수조건 "full-content fingerprint가 재현됨" 불충족).
- bridge 의 `그대로확장` 295 는 **pharmKey(ATC|함량|제형) + dominant-safety** 일치 신호일 뿐,
  ATC(예: A12AX = 칼슘·비타민D 복합, A11JB/A11JC = 종합비타민+미네랄)는 **동일 함량 라벨이라도 조성이
  상이**할 수 있어 pharmKey 일치 ≠ 조성 동일 ≠ full-fp 동일. 단일성분 runner(coarse `name LIKE
  '%(성분)'`)로는 ATC-keyed 그룹을 주소화할 수 없고, 안전 확장을 하려면 조성 동일성의 **신규 의료 판단**이 필요.

→ `그대로확장`/`검토후확장` 은 **REVIEW_LATER**(향후 전용 ATC-coarse 도구 + 사람 조성 검토 WO 필요),
본 자율 세션의 안전 자동 생산 대상이 아니다.

## 6. 상태별 분류 요약

| 분류 | 그룹/제품 | 코드 |
|---|---|---|
| READY (KO+EN 또는 EN_ONLY) | **0** | — |
| REVIEW_LATER (그대로확장 pharmKey, full-fp 미검증) | 295 master | RL_PHARMKEY_NO_FP |
| REVIEW_LATER (authored 내부 충돌) | 314 master | RL_AUTHORED_CONFLICT |
| HOLD_SAFETY_MISMATCH | 418 master | HOLD_SAFETY |
| HOLD_MEDICAL_SYNTHESIS (새 저술=복합 효능 합성) | 6,274 master | HOLD_SYNTH |
| 범위 외 (명시 복합제 비경구별도트랙) | 6,223 master | OUT_OF_SCOPE |

## 7. 금지사항 준수

| 항목 | 결과 |
|---|---|
| DB write (INSERT/UPDATE/DELETE/DDL) | **0** (SELECT 전용) |
| canonical 승격 / SPD 변경 | 0 |
| 기존 완결분(48 단일 · 16 nutrition_combo) 재생산 | 0 |
| 펙소페나딘 잔여 / 기존 REVIEW_LATER 자동편입 | 0 |
| 타 에이전트(나·다) claim/config/산출물 접촉 | 0 |
| 공용 runner GROUP_REGISTRY 수정 | 0 (외부 config·독립 감사 스크립트만) |
| 성분 조합/효능 창작 · 복합 효능 합성 | 0 |

## 8. 산출물

- `apps/api-server/src/scripts/otc-oral-multi-ingredient-combo-fp-audit-ga.mjs` (read-only 감사 스크립트)
- `apps/api-server/src/scripts/data/otc-oral-multi-ingredient-combo-audit-ga-v1.json` (fingerprint 클러스터 상세)
- `apps/api-server/src/scripts/data/otc-production-claim.ga.json` (claim = NO_NEW_BATCH round)
- 본 CHECK

## 9. 다음 재시작 지점

1. **복합제 ATC-coarse 확장 도구 + 조성 원천(원료약품·분량) 확보 WO** — bridge `그대로확장` 295 /
   `검토후확장` 314 를 사람 조성 검토 후 안전 확장하려면 MFDS 허가정보 조성 원천이 전제(analgesic combo
   SOURCE-GAP-AUDIT 와 동일 병목). 자율 세션 범위 밖.
2. 그때까지 경구 복합성분 자동 생산은 **NO_NEW_BATCH** 로 유지.
