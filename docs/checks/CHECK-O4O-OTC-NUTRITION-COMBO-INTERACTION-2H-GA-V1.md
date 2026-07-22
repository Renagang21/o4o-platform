# CHECK — WO-O4O-OTC-NUTRITION-COMBO-INTERACTION-2H-GA-V1

**에이전트 가 · 티티아민 combo EN-only 완결 (APPLIED · production LIVE) · 2026-07-22**

## 0. 결론

티티아민(비타민 D·E·C 복합) nutrition_combo **EN-only 138 master 완결(LIVE)**. 병용주의 문구('혈전 소인·에스트로겐 함유
피임약 복용 시 상담')를 **의미·강도·대상 약물 그대로 직접 번역**(원인·기전·결과 신규 설명 0). ko 전량 불변. **대상 완결로 조기 종료.**

- 실제 시간 ~20분 (상한 2h) · 종료 = 대상 완결
- target 138 · md5종 1(균일) · en 선존재 0 · EN write **276 (2T, plan==actual)**

## 1. 번역 계약 (병용주의 직접 번역)

- 유일 원문 = ko canonical. fresh 번역. 빌더 = 공용 `buildDrugOtcEnConsumerHtml`(sd-*). ko 미변경.
- **병용주의**: `혈전 소인·에스트로겐 함유 피임약 복용 시 상담하세요` → `If you are prone to blood clots or are taking estrogen-containing contraceptives, consult a pharmacist.`
  - 대상 약물(estrogen-containing contraceptives)·조건(prone to blood clots)·행동(consult a pharmacist) 직접 보존.
  - **상호작용의 원인·기전·결과를 새로 설명하지 않음**(해석 0).
- 다효능 병렬 보존: 효능 4절(비타민 D·E·C 보급 / 말초혈행·수족냉증 / 색소침착 완화 / 잇몸·코 출혈 예방) 병렬 유지, 합성 0.

## 2. 실행

- config `otc-nutrition-combo-titiamin-en-ga.config.json` + 번역 `otc-en-translations-combo-titiamin-ga-v1.json`(자기 전용). 공용 combo runner 미수정.
- claim `232917d2a`(교집합 0) → dry-run 2회 **byte-identical PASS** → apply(STEP1 INSERT 138 + STEP2 flip 138 = 2T 276) → **재실행 ALREADY_COMPLETE(write 0)**.
- in-TX 사후검증: enCanonical=138 · nr 0 · dup 0 · **koUnchanged true**.

## 3. 독립 검증 (runner 밖)

| 항목 | 결과 |
|---|---|
| ko canonical | 138 · md5종 1 **불변**(count·지문) |
| en canonical | `9ae52e98` × 138 uniform |
| 한글 / `<table>` | X / X |
| **병용문구 보존** | `estrogen-containing contraceptives` = true (138 전건) |
| 연령 정확 | `under 3 months` = true (ko '만 3개월 미만' 보존, 타 그룹 12개월과 구분) |
| exactly1 / ko-en 1:1 / dup | 138 / 138 / 0 |

**대상 밖 write 0**(스코프=source_ref ko canonical) · **canonical duplicate 0** · ko 불변.

## 4. TEST-LOG (전수 대조)

| 축 | ko | EN 보존 |
|---|---|---|
| 효능(병렬 4) | D·E·C 보급 / 말초혈행·수족냉증 / 기미·주근깨 색소침착 / 잇몸·코 출혈 예방 | 4절 병렬, 합성 0 |
| 용법 | 만 12세 이상·성인 1정 1일 2회 | one tablet twice a day (12+) |
| 연령 금기 | 만 3개월 미만 영아 | under 3 months (정확) |
| 금기(불복용) | 과민·대두유/콩/땅콩·고칼슘혈증·신장질환·신장결석·3개월 영아 | 전수 보존 |
| 병용주의(상담) | 혈전 소인·에스트로겐 피임약 → 상담 | 직접 번역·기전 0 |

## 5. 게이트·규칙

- DB write = en INSERT/flip 만(ko UPDATE 0·DELETE 0·audit 0) · writeActual=plan=2T · dup 0 · 대상 밖 0 · 공통 장애 0.
- 공용 runner registry .ts **미수정** · 자기 claim/config/translation/run/CHECK만 · 타 세션 파일 미접촉 · `git commit -- <명시 경로>`.

**결론**: 티티아민 138 master **EN canonical LIVE**. 병용주의 직접 번역(해석 0)·ko 불변·대상 밖 0·dup 0. 대상 완결로 종료.
