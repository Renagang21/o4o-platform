# CHECK — WO-O4O-OTC-UNPRODUCED-ORAL-UNIT2-EN-AUTHORING-AND-VALIDATION-V1 (에이전트 가)

**세션:** 에이전트 가 · 기계 sohae · 2026-07-26
**readiness 기준 commit:** `bedda7433` · **승인 SSOT commit:** `8328047ac`
**입력 SSOT:** `apps/api-server/src/scripts/data/otc-unproduced-oral-unit2-approved-ssot-v1.json` (**읽기 전용, 수정 0**)
**저작 원문:** `apps/api-server/src/scripts/data/otc-unproduced-oral-unit2-authoring-source.ga.json` (공식 효능/용법/주의 무절단)
**판정:** **EN_AUTHORING_COMPLETE** — 374/374 fp 저작 완주 · 전 게이트 PASS · 실패 0
**DB write: 0 · LIVE apply 0 · 설명서 DB 반영 0**

---

## 1. 최종 산출물

| 항목 | 값 |
|------|----|
| 최종 EN JSON | `apps/api-server/src/scripts/data/otc-unit2-en-config-ga-all.json` |
| 병합 스크립트 | `apps/api-server/src/scripts/otc-unit2-en-config-merge.ga.mjs` |
| 검증기 | `apps/api-server/src/scripts/otc-unit2-en-config-verify.ga.mjs` |
| 파트 저작본 | `otc-unit2-en-config-ga-p01.json` ~ `-p19.json` (19개) |
| 병합 방식 | 본문(title/efficacy/usage/caution/summaryTable) **무변형** 병합 · 타임스탬프 없음 |
| 파일 크기 | 1,240,555 bytes |
| md5 | `f48856404bbf95c8bf58850dddbc414d` |

## 2. 완주 집계

| 항목 | 목표 | 실측 | 판정 |
|------|-----:|-----:|:---:|
| fingerprint | 374 | **374** | PASS |
| master | 1,849 | **1,849** | PASS |
| 예상 EN write (master × 2T) | 3,698T | **3,698T** | PASS |
| 누락 fp | 0 | **0** | PASS |
| 중복 fp | 0 | **0** | PASS |

### 파트별 내역

| part | fp | master | EN write |
|------|---:|-------:|---------:|
| p01 | 20 | 654 | 1,308T |
| p02 | 20 | 181 | 362T |
| p03 | 20 | 132 | 264T |
| p04 | 20 | 107 | 214T |
| p05 | 20 | 89 | 178T |
| p06 | 20 | 80 | 160T |
| p07 | 20 | 77 | 154T |
| p08 | 20 | 60 | 120T |
| p09 | 20 | 60 | 120T |
| p10 | 20 | 60 | 120T |
| p11 | 20 | 43 | 86T |
| p12 | 20 | 40 | 80T |
| p13 | 20 | 40 | 80T |
| p14 | 20 | 40 | 80T |
| p15 | 20 | 40 | 80T |
| p16 | 20 | 40 | 80T |
| p17 | 20 | 40 | 80T |
| p18 | 20 | 40 | 80T |
| p19 | 14 | 26 | 52T |
| **합계** | **374** | **1,849** | **3,698T** |

파트는 승인 SSOT 를 `size` 내림차순 정렬한 순서에서 20 fp 단위로 절단했다(마지막 p19 만 14 fp).

## 3. 전건 검증 결과

```
$ npx tsx src/scripts/otc-unit2-en-config-verify.ga.mjs
UNIT2-EN-VERIFY — COMPLETE
  configs 19 · entries 374 · covered 374/374 fp · 누락 0 · 중복 0 기준검사 포함
  예상 EN write 3698T / 필요 3698T

$ npx tsx src/scripts/otc-unit2-en-config-verify.ga.mjs src/scripts/data/otc-unit2-en-config-ga-all.json
UNIT2-EN-VERIFY — COMPLETE
  configs 1 · entries 374 · covered 374/374 fp · 누락 0 · 중복 0 기준검사 포함
  예상 EN write 3698T / 필요 3698T
```

| 게이트 | 결과 |
|--------|-----:|
| 승인 대상 fp 소속 (비대상 혼입) | **0** |
| fp 중복 | **0** |
| 필수 필드 공백 (title/efficacy/usage/caution/summaryTable) | **0** |
| `usageLabel` 혼입 (러너 주입 침해) | **0** |
| **한글 잔존** | **0** |
| 공용 러너 `renderEn` 이상 | **0** |
| **용법 수치 mismatch** (`missingNumericsEn(official.dosage, usage)`) | **0** |
| **연령 축 누락** (용법 연령 → EN 용법) | **0** |
| **연령 축 누락** (주의 연령 → EN 용법·주의) | **0** |
| **기간·간격 축 누락** (용법 기간 → EN 용법) | **0** |
| **주의 축 부재** | **0** |
| **금기(금지) 매핑 누락** (원문 금지문 → `do not / must not / never`) | **0** |
| route=oral 복용 동사 부재 (`take/taken/taking/swallow/by mouth/orally`) | **0** |
| **실패 총계** | **0 / 374** |

## 4. 2회 실행 byte-identical

```
$ node src/scripts/otc-unit2-en-config-merge.ga.mjs   # 1회차
f48856404bbf95c8bf58850dddbc414d  otc-unit2-en-config-ga-all.json
$ node src/scripts/otc-unit2-en-config-merge.ga.mjs   # 2회차
f48856404bbf95c8bf58850dddbc414d  otc-unit2-en-config-ga-all.json
$ cmp run1 run2 → BYTE-IDENTICAL OK
```

검증기 표준출력도 2회 실행 결과 byte-identical 확인. 병합·검증 경로 모두 타임스탬프·난수·순서 비결정 요소가 없다.

## 5. 저작 계약 준수

| 원칙 | 준수 |
|------|:----:|
| 공식 원문(효능·용법·주의) 무절단 grounding | ✅ |
| 신규 의료사실 생성 0 (외부 LLM 사실 보강 없음) | ✅ |
| 질병명·효능 회피·약화 없음 (방어적 축소 금지) | ✅ |
| 수치·연령·횟수·간격·기간 보존 | ✅ (검증기 mismatch 0) |
| 금기·주의 축 보존 | ✅ (누락 0) |
| 매장 내 전문가(약사) 문의 안내 유지 | ✅ (`Ask the pharmacist` 전 374건) |
| 제품명 미사용 — 일반명코드 기준 동일성 안내 | ✅ (`Choosing a product`) |
| 조성·투여경로·효능 상이 제품 혼합 금지 | ✅ (fp 단위 개별 저작) |
| EN 수치 표기 comma 미사용 (수치 보존 게이트 대응) | ✅ |
| `usageLabel` 은 공용 러너 주입(`How to take it`) — config 미포함 | ✅ |

## 6. 금지사항 준수

| 금지 | 결과 |
|------|:----:|
| DB write | **0** |
| LIVE apply | **0** |
| 실행 순서 원장(`otc-unproduced-oral-execution-order-v1.json`) 수정 | **0** |
| 공용 러너(`otc-v2-store-leaflet-runner.shared.ts`) 수정 | **0** (import 사용만) |
| `pnpm-lock.yaml` 접촉 | **0** |
| 타 세션 변경 접촉 (`ContactInquiryAdminPage.tsx`, Unit 1 HELD 파일, `ServiceLegalSettingsPage.tsx`) | **0** |
| 기존 확정 파트(p01~p17) 수정 | **0** |

commit 은 전부 path-specific 으로 자기 산출물만 staging 했다.

## 7. Unit 1 GREEN 후 즉시 LIVE 생산 가능 여부

**판정: 가능 (EN 측 선행조건 충족).**

- Unit 2 EN 저작·검증은 완결되어 있고, 최종 EN JSON 1개(`otc-unit2-en-config-ga-all.json`)는 공용 러너의 `--en-config=<한 파일>` 입력 계약을 그대로 만족한다. eligible 374 fp 전건 페이로드가 존재하므로 러너의 "EN 저작 페이로드 부재 → 중지" 조건에 걸리지 않는다.
- 남은 선행조건은 **가 세션 밖**에 있다:
  1. Unit 1 이 GREEN 으로 종료되어 실행 순서 원장상 Unit 2 차례가 열릴 것 (원장은 라 세션 소유, 가 세션 수정 0),
  2. KO 조립분(`composeKo`) 경로의 Unit 2 확정,
  3. LIVE write-owner 단일 순서(가 → 나 → 다) 상의 write 슬롯 승인.
- 위 3건이 충족되면 Unit 2 는 **dry-run → 이중게이트 → 독립검증 → rollback 계약** 순서로 즉시 apply 가능하다. EN 예상 write 는 **3,698T**(master 1,849 × 2T)이며, KO 4T 를 합한 Unit 2 총 write 는 **11,094T** 이다.
- 본 CHECK 시점까지 DB 반영은 0 이며, 승인 없는 apply 는 수행하지 않는다.
