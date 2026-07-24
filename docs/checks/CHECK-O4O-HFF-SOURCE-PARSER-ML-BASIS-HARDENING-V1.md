# CHECK — 공용 원문 파서·Guard mL 기준량 검증 + SPEC_RE 포맷 확장 (Agent C) V1

- WO: `WO-O4O-HFF-LIQUID-BULK-PRODUCTION` 후속 — 액상 재생산 선행조건(파서/Guard 하드닝). 별도 commit 분리.
- 성격: **공용 parser·Guard 변경**(이전 무수정 원칙의 명시적 인가 항목). 완전 additive — 기존 mg/g 동작 불변.
- 범위: ① SPEC_RE 반복 포맷 변이 확장(mL 기준량·`X% 이상`) ② parseBasis/Guard mL 기준량 검증 지원 ③ 회귀 테스트 ④ 별도 commit·push.
- 시작·종료 `2026-07-25` 단일 세션. DB 미접촉(파서·Guard 순수 함수 + jest).

## 0. 결론

> **완전 additive 하드닝 완료.** 기존 content-guard jest **162 → 170 PASS**(+8 mL 케이스), parseSpecs selftest **130 → 136 PASS**(+6),
> tsc 오류 0. mg/g 고형 경로 **바이트 동일 회귀**(REG-STABLE·170 jest). 실데이터 검증: 액상 단일 기능성 후보 Guard PASS **60 → 150 / 162**.

## 1. 변경 (3 파일 코어)

### ① `source-grounding-parser.ts` — parseBasis mL 지원
- `ParsedBasis.unit`: `'mg'|'g'` → `'mg'|'g'|'mL'`. `normBasisUnit()` 신설(ml/㎖→mL).
- **mL 기준량은 원료 표시량(값+단위) 바로 뒤 슬래시로만 인정**: `([값][mg|g|μg|IU]) / ([N]) mL`. viaUnit 컨테이너형(`/1병(100mL)`)도 허용.
- **numbered/bare 에는 mL 미포함**(의도적) — 미생물 한도 `세균수 : 100 이하/1mL`·`1mL당` 을 원료 기준량으로 오독 방지. viaDang(`N 당`)도 mg/g 만.
  - 실측 교정: `세균수 100/1ml … 아연 8.5mg/5ml` → **5mL**(오독 1mL 아님). `아연 8.5mg/4000mg` → 4000mg(불변).

### ② `product-description-guard.ts` — PRE-SRC-BASIS 차원 인지
- 질량(mg/g→mg 환산)·부피(mL) **차원 구분**. `declDim(vol/mass)` ≠ `parsedDim` 이면 숫자 우연일치라도 **UNVERIFIABLE 강등**(false MATCH 방지).
- mg/g 경로는 기존과 100% 동일(dimOf 둘 다 mass → 기존 mg 환산 비교).

### ③ `hff-source-parse.ts` — SPEC_RE / LOOSE_SPEC_RE 확장
- 기준량 단위군에 `mL|ml|㎖` 추가. 비율 tail 에 **하한 백분율 `X% 이상`** 추가(신규 캡처군, parseSpecs ratio 로직 정합). uNorm mL 처리.
- SPEC_RE 는 `라벨 : 값단위/기준단위 비율` 구조라 미생물 라인(`세균수:100 이하` — 값 뒤 단위 없음) 매칭 불가 → 오염 없음.

## 2. 회귀 테스트

| 스위트 | 결과 |
|---|---|
| content-guard jest (기존+신규 mL) | **170 PASS** (기존 162 불변 + parseBasis mL 5 + Guard 차원 3) |
| parseSpecs/fiber selftest | **136 PASS** (REG-STABLE 바이트 동일 · REG-HARDENED mL/이상 신규 기대값 · SPEC-HARDEN 6 · FIB · DET) |
| tsc (변경 6파일) | 오류 0 |
| 실데이터(액상 pool 162) 재검 | Guard PASS 60→**150** · REVIEW/BLOCKED 12(genuine) |

- **회귀 게이트**: mg/g 기준량 파싱 불변(REG-STABLE + jest 기존 전수) · mL 은 원료 표시량 tied 매처로만(미생물 오탐 0) · 차원 불일치 false MATCH 0 · 결정적.
- 남은 12 held = 실제 기준량 불일치(MISMATCH 2)·진성 미검증(UNVERIFIABLE 4)·기타 — 보수적 HOLD(오생산 0).

## 3. 신규 테스트 자산

- `__tests__/source-grounding-parser.test.ts` +5(액상 mL: /100ml·/250 mL·㎖·1병(100mL)·mg/g 회귀).
- `__tests__/product-description-guard.test.ts` +3(mL↔mL MATCH·mL↔mg 차원불일치 UNVERIFIABLE·mg/g 회귀).
- `hff-source-parse.fixtures.json` specHardening +6 · `hff-source-parse-selftest.ts` REG-STABLE/HARDENED 분리.

## 4. 변경 파일

- `apps/api-server/src/modules/content-guard/source-grounding-parser.ts` · `product-description-guard.ts`
- `apps/api-server/src/scripts/hff-source-parse.ts` · `hff-source-parse.fixtures.json` · `hff-source-parse-selftest.ts`
- `apps/api-server/src/modules/content-guard/__tests__/source-grounding-parser.test.ts` · `product-description-guard.test.ts`
- 본 문서.

## 5. 후속 (item 5)

- A·B·C 각 shard 액상 재생산: 본 commit 기준 재실행 시 mL 기준량 후보가 Guard PASS 로 전환(액상 shard-2 실측 60→150). 별도 생산 CHECK 로 기록.

---

*완전 additive · mg/g 불변 회귀 · mL 원료-tied 매처(미생물 오탐 0) · 차원 인지 · jest 170 · selftest 136 · tsc 0.*
