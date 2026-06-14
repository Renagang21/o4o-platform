# CHECK-O4O-LMS-GPKCOS-HUB-VISIBILITY-MAPPING-V1

> **작업명:** WO-O4O-LMS-GPKCOS-HUB-VISIBILITY-MAPPING-V1
> **유형:** GP/KCos `/lms` hub 공개/회원제 visibility 배지 표시 — frontend mapper 보강 (frontend-only)
> **결과: PASS** — GP·KCos `mapCourse` 가 응답의 `visibility`(+requiresApproval/isPaid)를 `LmsHubCourse` 로 매핑 → `LmsHubTemplate` 유형 컬럼이 공개/회원제 배지 표시. backend/API/DB 무변경(데이터 이미 응답에 존재). KPA/Neture/backend 무변경. GP·KCos typecheck 0.
> **선행:** `IR-O4O-LMS-HUBTEMPLATE-VISIBILITY-COLUMN-V1`(판정 A) · `WO-O4O-LMS-HUBTEMPLATE-SERVICE-ACCENT-V1`
> **작성일:** 2026-06-13 · 기준 HEAD `5143cfbcc`

---

## 1. 목적

선행 IR(판정 A) 대로 GP/KCos `/lms` hub 에서 공개/회원제 배지가 표시되도록 frontend adapter 만 보강. backend 응답엔 visibility 가 이미 있고(service-neutral, KPA 가 사용 중) GP/KCos `mapCourse` 가 버리던 것을 매핑.

## 2. 변경 파일

| 파일 | 변경 |
|------|------|
| `services/web-glycopharm/src/api/lms.ts` | `LmsCourse` 에 optional `visibility`/`requiresApproval`/`isPaid` 추가 |
| `services/web-glycopharm/src/pages/education/EducationPage.tsx` | `normalizeVisibility` 헬퍼 + `mapCourse` 에 visibility/requiresApproval/isPaid 매핑 |
| `services/web-k-cosmetics/src/api/lms.ts` | `LmsCourse` 에 optional `visibility`/`requiresApproval`/`isPaid` 추가 |
| `services/web-k-cosmetics/src/pages/lms/EducationPage.tsx` | `normalizeVisibility` 헬퍼 + `mapCourse` 매핑 |
| `docs/checks/CHECK-O4O-LMS-GPKCOS-HUB-VISIBILITY-MAPPING-V1.md` | 본 문서 |

**무변경:** backend, DB/migration, KPA, Neture, `LmsHubTemplate`(구조), `@o4o/lms-ui`, package.json/pnpm-lock, Dockerfile.

## 3. 구현 기준

- `normalizeVisibility(v) = (v === 'public' || v === 'members') ? v : undefined` — 유효값만 매핑, 그 외 undefined → 기존 category fallback 유지.
- `mapCourse`: `visibility: normalizeVisibility(c.visibility)`, `requiresApproval: c.requiresApproval`, `isPaid: c.isPaid`.
- `LmsCourse` 리스트 타입에 세 필드 optional 추가(응답 JSON 에 이미 존재 — 타입만 미선언이던 것을 선언). 값 hardcode·강제 members 없음.

## 4. 동작

- 유효 visibility → `LmsHubTemplate` 유형 컬럼이 공개/회원제(+승인필요/유료) 배지(템플릿 visibility-aware render). KPA 와 동일.
- visibility 무효/부재 → category fallback(기존). → 3서비스 동형.
- service accent(GP green/KCos pink) 등 다른 동작 불변.

## 5. 검증 결과

- **TypeScript:** `web-glycopharm` **0**(본 변경 관련; 잔존은 타 세션 forum), `web-k-cosmetics` **0**.
- **grep:** GP·KCos `mapCourse` 에 `visibility: normalizeVisibility(c.visibility)` 확인. payment/checkout/rewardPolicy/youtube/iframe 재도입 0.
- **무변경:** KPA(LMS)·Neture·backend·`LmsHubTemplate`·package/lock/Dockerfile. *(tree 의 `ProductApplicationManagementPage` 등은 타 세션 — 미접촉·미스테이징.)*
- **browser smoke:** 미수행 — 배포 후 GP/KCos `/lms` 목록에서 공개/회원제 배지 표시·강의 상세 이동 확인 권장.

## 6. 후속 작업

1. **`WO-O4O-LMS-COURSECARD-RETIRE-OR-SPECIALIZE-V1`** — dormant `@o4o/lms-ui CourseCard/List` 처리 방향(유지 vs card 맥락 specialize).
2. **`WO-O4O-LMS-COMMON-INSTRUCTOR-OPERATOR-UI-BOUNDARY-V1`** — 강사/운영자 LMS 관리 화면 공통화 경계.
3. **`IR-O4O-REWARD-BUDGET-FLOW-PLATFORM-SERVICE-INSTRUCTOR-V1`** — 별도 작업선.

## 7. 완료 판정

**PASS.** GP·KCos `/lms` hub 가 공개/회원제 visibility 배지를 표시(mapper 매핑) — `/lms` hub 의 **구조·색상·visibility 표시까지 3서비스 정렬 완료**. backend/API/DB·KPA·Neture·LmsHubTemplate 구조 무변경, typecheck 0.
