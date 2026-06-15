# CHECK-O4O-LMS-GP-REUSABLE-POLICY-TYPE-ALIGNMENT-V1

> **WO**: WO-O4O-LMS-GP-REUSABLE-POLICY-TYPE-ALIGNMENT-V1
> **선행**: `IR-O4O-LMS-COMMONIZATION-QUALITY-AUDIT-V1` §6 — GP `tsc -b` 잔여 1건(TS2322 reusablePolicy).
> **성격**: GP LMS reusablePolicy 타입 경계 정합만. 공통 shell 계약·KPA/KCos 무변경. backend/DB/package/lock 무변경.
> **결과: PASS — GP 로컬 mapper 추가로 GP `tsc -b` 0. KCos/KPA 무회귀(0/0).**
> **작성일**: 2026-06-15

---

## 1. 목적
`IR-O4O-LMS-COMMONIZATION-QUALITY-AUDIT-V1` 에서 확인된 GlycoPharm LMS 강사 편집 화면의 typecheck 잔여 오류 1건을 정합한다. LMS 공통화 Cycle 1 closure(V2)의 선행 조건.

## 2. 선행 IR 요약
- LMS 공통화 구조(허브/운영자/강사 manager thin wrapper)는 PASS. Neture 제외·KPA-only 격리·AI/reward/payment 경계 정합.
- 단 GP `tsc -b` 1건 잔존(in-flight Phase 2 reusablePolicy 타입 드리프트) → 본 WO 가 그 1건만 닫는다.

## 3. 오류 원인
- 위치: `services/web-glycopharm/src/pages/instructor/InstructorCourseEditPage.tsx:375` (`handleSaveCourse`).
- 오류: `TS2322: Type 'CourseFormReusablePolicy' is not assignable to type 'CourseReusablePolicy | undefined'. Type '"organization"' is not assignable…`
- 근인:
  - 공통 `InstructorCourseFormShell`(@o4o/operator-core-ui)의 `InstructorCourseFormValues.reusablePolicy` 타입 = `CourseFormReusablePolicy` = **`'restricted' | 'platform' | 'organization'`**(Phase 2 값 `'organization'` 포함).
  - GP `@/api/lms` 의 `CourseReusablePolicy` = **`'restricted' | 'platform'`**(GP 는 `'organization'` tier 미지원).
  - `handleSaveCourse` 가 `values.reusablePolicy`(폼 타입)를 GP `instructorUpdateCourse`(GP 도메인 타입) 에 그대로 전달 → union 불일치.
- **런타임 영향 없음(타입 경계만)**: 공통 shell 의 reusablePolicy 라디오 UI 는 `['restricted','platform']` 만 렌더(`InstructorCourseFormShell.tsx:254`) → `'organization'` 은 사용자 선택 불가. GP `course.reusablePolicy`(initialValue)도 `CourseReusablePolicy`(2값)·기본 `'restricted'` → `'organization'` 미유입. 즉 `'organization'` 은 **타입 union placeholder**일 뿐 GP 런타임에 발생하지 않음.

## 4. 변경 파일
| 파일 | 변경 |
|------|------|
| `services/web-glycopharm/src/pages/instructor/InstructorCourseEditPage.tsx` | `CourseReusablePolicy` 타입 import 추가 + GP 로컬 mapper `toGpReusablePolicy` 추가 + line 375 매핑 적용 |
| `docs/checks/CHECK-O4O-LMS-GP-REUSABLE-POLICY-TYPE-ALIGNMENT-V1.md` | 본 CHECK |

> 공통 `InstructorCourseFormShell` / KPA / KCos / backend / DB / package.json / pnpm-lock.yaml / Dockerfile **무변경**.

## 5. 매핑/타입 정합 방식
GP 로컬 adapter 로 폼 타입 → GP 도메인 타입을 **좁히는(narrow)** 방식. 공통 shell 계약은 그대로 두고 GP 소비측에서만 정합.

```ts
// 공통 shell 의 CourseFormReusablePolicy(Phase 2 값 'organization' 포함)를 GlycoPharm domain
// (CourseReusablePolicy: 'restricted' | 'platform')로 정합한다.
// - GP 는 'organization'(조직 범위 재사용) tier 미지원, 공통 shell 폼 UI 도 restricted/platform 만 노출.
// - 만에 하나 'organization' 이 들어와도 재사용 범위를 넓히지 않도록 보수적으로 'restricted'(가장 좁은 재사용)로 대응.
const toGpReusablePolicy = (p: InstructorCourseFormValues['reusablePolicy']): CourseReusablePolicy =>
  p === 'platform' ? 'platform' : 'restricted';
```
- 호출부(line 375): `reusablePolicy: toGpReusablePolicy(values.reusablePolicy)`.
- 의미 보존: `'platform'` → `'platform'`(개방 재사용 유지), `'restricted'`/`'organization'` → `'restricted'`(좁은 재사용으로 보수적 대응 — 의도치 않은 범위 확대 방지). WO §3 의 "`'organization'` → `'restricted'`" 지침과 일치.
- `InstructorCourseFormValues['reusablePolicy']` indexed-access 로 폼 타입을 참조 → `CourseFormReusablePolicy` 별도 import 불요(최소 변경).

## 6. 검증 결과
- **GP `tsc -b`**: ✅ **0 error**(이전 1건 TS2322 해소).
- **KCos `tsc -b`**: ✅ 0 error(무회귀).
- **KPA `tsc -b`**: ✅ 0 error(무회귀).
- **공통 shell 무회귀**: `InstructorCourseFormShell` / `CourseFormReusablePolicy` / `InstructorCourseFormValues` 미변경 — 계약 그대로. KPA/KCos 의 동일 shell 소비 영향 0(타입 narrow 는 GP 파일 내부 한정).
- **무변경 확인**: backend / DB / migration / package.json / pnpm-lock.yaml / Dockerfile 변경 0. KPA/KCos 파일 미수정.
- reward/payment/AI/provider/CourseStructureAi 미접촉.

## 7. 완료 판정
**PASS** — GP `InstructorCourseEditPage` 의 reusablePolicy 타입 경계를 GP 로컬 mapper 로 정합하여 GP `tsc -b` 0 달성. 공통 shell 계약·KPA/KCos 무변경, 무회귀(0/0). LMS 공통화 3서비스 typecheck green 복귀.

## 8. 후속 작업
1. **`CHECK-O4O-LMS-COMMONIZATION-CYCLE1-CLOSURE-V2`** — GP green 재측정 반영하여 LMS 공통화 Cycle 1 최종 closure 갱신(본 WO 로 차단 요인 해소됨).
2. `WO-O4O-LMS-COPY-AND-EMPTY-STATE-ALIGNMENT-V1`(선택) — reward/감사 문구·NoPaymentNotice copy drift 가 실제 확인될 경우만 공통 상수화.
3. `KEEP-O4O-LMS-KPA-ADVANCED-FEATURES-AS-REFERENCE-V1` — quiz/assignment/grading/CourseStructureAi 를 KPA-only reference 로 유지.

---

*Date: 2026-06-15 · WO-O4O-LMS-GP-REUSABLE-POLICY-TYPE-ALIGNMENT-V1 · GP 로컬 mapper(toGpReusablePolicy)로 reusablePolicy 타입 정합. GP tsc -b 0, KCos/KPA 무회귀. 공통 shell·backend·DB·package·lock 무변경. PASS.*
