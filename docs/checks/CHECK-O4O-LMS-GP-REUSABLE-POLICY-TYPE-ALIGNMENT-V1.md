# CHECK-O4O-LMS-GP-REUSABLE-POLICY-TYPE-ALIGNMENT-V1

> **WO**: WO-O4O-LMS-GP-REUSABLE-POLICY-TYPE-ALIGNMENT-V1
> 공통 shell 계약·KPA/KCos 무변경. backend/DB/package/lock 무변경.
> KCos/KPA 무회귀(0/0).
> **작성일**: 2026-06-15

---

## 1. 목적
LMS 공통화 Cycle 1 closure(V2)의 선행 조건.

## 2. 선행 IR 요약
- LMS 공통화 구조(허브/운영자/강사 manager thin wrapper)는 PASS. Neture 제외·KPA-only 격리·AI/reward/payment 경계 정합.

## 3. 오류 원인
- 오류: `TS2322: Type 'CourseFormReusablePolicy' is not assignable to type 'CourseReusablePolicy | undefined'. Type '"organization"' is not assignable…`
- 근인:
  - 공통 `InstructorCourseFormShell`(@o4o/operator-core-ui)의 `InstructorCourseFormValues.reusablePolicy` 타입 = `CourseFormReusablePolicy` = **`'restricted' | 'platform' | 'organization'`**(Phase 2 값 `'organization'` 포함).
- **런타임 영향 없음(타입 경계만)**: 공통 shell 의 reusablePolicy 라디오 UI 는 `['restricted','platform']` 만 렌더(`InstructorCourseFormShell.tsx:254`) → `'organization'` 은 사용자 선택 불가.

## 4. 변경 파일
| 파일 | 변경 |
|------|------|
| `docs/checks/CHECK-O4O-LMS-GP-REUSABLE-POLICY-TYPE-ALIGNMENT-V1.md` | 본 CHECK |

> 공통 `InstructorCourseFormShell` / KPA / KCos / backend / DB / package.json / pnpm-lock.yaml / Dockerfile **무변경**.

## 5. 매핑/타입 정합 방식

```ts
// (CourseReusablePolicy: 'restricted' | 'platform')로 정합한다.
// - 만에 하나 'organization' 이 들어와도 재사용 범위를 넓히지 않도록 보수적으로 'restricted'(가장 좁은 재사용)로 대응.
const toGpReusablePolicy = (p: InstructorCourseFormValues['reusablePolicy']): CourseReusablePolicy =>
  p === 'platform' ? 'platform' : 'restricted';
```
- 호출부(line 375): `reusablePolicy: toGpReusablePolicy(values.reusablePolicy)`.
- 의미 보존: `'platform'` → `'platform'`(개방 재사용 유지), `'restricted'`/`'organization'` → `'restricted'`(좁은 재사용으로 보수적 대응 — 의도치 않은 범위 확대 방지). WO §3 의 "`'organization'` → `'restricted'`" 지침과 일치.
- `InstructorCourseFormValues['reusablePolicy']` indexed-access 로 폼 타입을 참조 → `CourseFormReusablePolicy` 별도 import 불요(최소 변경).

## 6. 검증 결과
- **KCos `tsc -b`**: ✅ 0 error(무회귀).
- **KPA `tsc -b`**: ✅ 0 error(무회귀).
- **공통 shell 무회귀**: `InstructorCourseFormShell` / `CourseFormReusablePolicy` / `InstructorCourseFormValues` 미변경 — 계약 그대로.
- **무변경 확인**: backend / DB / migration / package.json / pnpm-lock.yaml / Dockerfile 변경 0. KPA/KCos 파일 미수정.
- reward/payment/AI/provider/CourseStructureAi 미접촉.

## 7. 완료 판정
공통 shell 계약·KPA/KCos 무변경, 무회귀(0/0). LMS 공통화 3서비스 typecheck green 복귀.

## 8. 후속 작업
2. `WO-O4O-LMS-COPY-AND-EMPTY-STATE-ALIGNMENT-V1`(선택) — reward/감사 문구·NoPaymentNotice copy drift 가 실제 확인될 경우만 공통 상수화.
3. `KEEP-O4O-LMS-KPA-ADVANCED-FEATURES-AS-REFERENCE-V1` — quiz/assignment/grading/CourseStructureAi 를 KPA-only reference 로 유지.

---

*Date: 2026-06-15 · WO-O4O-LMS-GP-REUSABLE-POLICY-TYPE-ALIGNMENT-V1 · 공통 shell·backend·DB·package·lock 무변경. PASS.*
