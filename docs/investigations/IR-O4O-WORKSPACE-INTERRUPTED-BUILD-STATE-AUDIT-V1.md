# IR-O4O-WORKSPACE-INTERRUPTED-BUILD-STATE-AUDIT-V1

> **유형**: Investigation (read-only) — 작업공간 이동 후 GP/KCos web 빌드 실패의 정체 식별.
> **성격**: 코드/DB/dependency/lockfile/migration **무변경**. git·파일 상태 증거만.
> **결론(요약)**: **빌드 실패는 contact 자동회신 WO와 무관(판정 A)** — 동시 진행 중인 **LMS 공통 UI(`@o4o/lms-ui`) 추출 + reward-policy 리팩터 + product-applications 공통화** 세션이 main 에 커밋되었으나 **GP/KCos 소비측 빌드 와이어링이 미완(in-flight, 판정 C)** 인 상태가 원인. api-server 는 PASS(contact 백엔드 포함). 단순 dependency 누락(B) 아님(패키지 존재·링크됨), contact 직접 충돌(D) 아님.
> **작성일**: 2026-06-15

---

## 1. 조사 목적
작업공간 이동 후 GP/KCos web 빌드 실패가 어느 작업 축의 중단 상태인지 증거 기반으로 식별. 수정 작업 아님(코드/dep/lockfile/migration/commit 금지).

## 2. 현재 빌드 결과 (관찰)

| 대상 | 결과 |
|------|------|
| 루트 `pnpm build` (packages + main-site + admin) | ✅ PASS |
| `api-server` / `build:api` | ✅ PASS (dist/main.js 생성, contact 자동회신 백엔드 포함) |
| GP web (`tsc -b && vite build`) | ❌ FAIL (5 errors) |
| KCos web (`tsc -b && vite build`) | ❌ FAIL (5 errors) |

> `contact` / `service-contact` 관련 오류 **0건**. 실패는 전부 LMS / product-applications 축.

## 3. git 상태 요약 (HEAD `07496aa5f`, origin/main 동기화)

**modified (working tree, 미커밋)** — 전부 **store-content 용어/복사 정렬** 축(다른 세션 in-flight, IR-O4O-STORE-CONTENT... §13 WO#1 후보):
```
 M packages/shared-space-ui/src/ContentHubTemplate.tsx                (+3)
 M services/web-glycopharm/src/pages/hub/HubBlogLibraryPage.tsx
 M services/web-glycopharm/src/pages/hub/HubContentListPage.tsx
 M services/web-glycopharm/src/pages/hub/HubPopLibraryPage.tsx
 M services/web-k-cosmetics/src/pages/hub/{HubBlogLibraryPage,HubContentPage,HubPopLibraryPage,HubQrLibraryPage}.tsx
 M services/web-kpa-society/src/pages/pharmacy/HubContentLibraryPage.tsx
 M docs/investigations/CHECK-O4O-OPERATOR-ORDER-VIEW-LOOP-COMPLETION-V1.md
```
**untracked**: IR 문서 3건 + 스크린샷 6장 + `c:tmp...sh`(전부 타 세션 산출물).
> **working tree 에 contact 파일 0건.** `git diff --name-only | grep contact` = 없음.

## 4. 실패 오류 — 축별 분류

| 축 | 오류 | 파일 | 성격 |
|----|------|------|------|
| **L1. lms-ui 모듈 미해결** | TS2307 `Cannot find module '@o4o/lms-ui'` | GP `education/CourseDetailPage.tsx:32`·`education/LmsLessonPage.tsx:17` / KCos `lms/LmsCourseDetailPage.tsx:20`·`lms/LmsLessonPage.tsx:19` | LMS 공통 UI 추출 in-flight |
| **L2. LMS reward-policy 타입** | TS2322 `CourseFormReusablePolicy`→`CourseReusablePolicy` 불일치 / TS7006 implicit any `'l'` | GP `instructor/InstructorCourseEditPage.tsx:375`·`education/LmsLessonPage.tsx:388` / KCos `lms/LmsCourseDetailPage.tsx:209`·`LmsLessonPage.tsx:425` | reward-policy 리팩터 잔여 |
| **P1. product-applications 의존성** | TS2307 `Cannot find module '@o4o/types'` | `packages/operator-core-ui/src/modules/product-applications/ProductApplicationManagementConsole.tsx:16` | product-applications 공통화 in-flight |

## 5. 근거 — 관련 커밋 (전부 타 세션, main 에 커밋됨)

| 커밋 | 내용 |
|------|------|
| `09d228658` | feat(lms): separate completion progress from reward policy |
| `49625b5a0` | feat(lms): stabilize reward policy contract |
| `e042b4eb2` | feat(lms-ui): support full-row lesson navigation |
| `53dddc842` | docs(lms-ui): clarify course card primitive role |
| `e4a9edef1` | **fix(docker): copy @o4o/lms-ui into kpa-society-web build** (KPA Docker 만 명시 — GP/KCos 는 별도 확인 필요) |
| `677a9e61c`·`face32609`·`71f280860`·`c02fa33bb` | product-applications operator surface 공통화 Phase 1–5 |

> contact 커밋(`826fd6ade`/`efb26a4c9`/`649f16791`/`51c8c392b`/`b3659de05`)은 **모두 main 히스토리에 보존**. 빌드 실패 파일 집합과 무관.

## 6. 패키지/링크 상태 검증 (B vs C 판별)

| 점검 | 결과 | 해석 |
|------|------|------|
| `packages/lms-ui/package.json` 존재 | ✅ (`name: @o4o/lms-ui`) | 패키지 실존 |
| lms-ui exports | `{".":"./src/index.ts"}`, `main/types`=`./src/index.ts`, **build script 없음** | **source-only 소비 패키지**(dist 불필요 — 의도된 설계) |
| GP/KCos `package.json` lms-ui dep | ✅ `"@o4o/lms-ui":"workspace:*"` | 정상 선언 |
| GP/KCos `node_modules/@o4o/lms-ui` 링크 | ✅ LINKED, `src/index.ts` 도달 가능 | **단순 링크 누락 아님(→ B 배제)** |
| operator-core-ui `@o4o/types` dep | ✅ 선언됨 | P1 의 types 오류는 누락 아닌 **tsc -b 빌드순서/해석 phantom** |
| GP/KCos/KPA Dockerfile `lms-ui` COPY | ✅ 각 2건 | CI Docker 는 lms-ui COPY 보유(로컬 `tsc -b` 와 별개) |
| 루트 `build:packages` 에 lms-ui 포함 | ❌ 미포함 | 루트 빌드가 lms-ui 미경유 → 루트 build PASS 설명 |

> **핵심**: lms-ui 는 존재·선언·링크·src 도달 모두 정상인데 GP/KCos `tsc -b` 가 TS2307. operator-core-ui(동일 `"."→src` 패턴)는 정상 해석됨 → **신규 lms-ui 의 소비측 빌드/tsconfig 와이어링(project reference / moduleResolution / paths)이 미완**. 단순 누락(B)이 아니라 **in-flight 구조 변경의 소비측 미완(C)**.

## 7. contact WO 관련성 판정
- api-server build PASS(contact 백엔드 컴파일 산출). 실패 파일에 contact/service-contact **0건**. working tree 에 contact 변경 **0건**. contact 커밋 히스토리 보존. → **contact 직접 회귀(D) 아님.**

## 8. 즉시 수정 가능 여부
- **본 세션에서 즉시 수정 비권장.** L1/L2/P1 은 LMS·product-applications 세션의 **능동적 in-flight 작업**(main 에 연속 커밋 중). 임의 수정 시 해당 세션과 충돌. forum-core(efb26a4c9) 때처럼 **내 배포를 직접 막는 경우에만** 동반 수정했으나, 현재 contact 산출물(api-server)은 PASS 이고 GP/KCos web 은 LMS 와이어링 완료 시 자연 해소될 가능성이 높음.
- 확인 절차(소관 세션): `pnpm install`(lms-ui workspace 재해석) → GP/KCos `tsc -b` 재측정 → 잔여가 L2(reward-policy 타입)만이면 그건 실코드 수정. 본 read-only IR 범위 밖.

## 9. 판정

```
최종 판정: A + C (복합) — B/D 아님

- contact WO 직접 회귀 여부: 아니오 (api-server PASS, 실패 파일/working tree 에 contact 0, 커밋 보존)
- LMS 중단 작업 여부: 예 (lms-ui 소비측 와이어링 미완[L1] + reward-policy 타입 잔여[L2], 커밋 09d228658/49625b5a0/e042b4eb2/e4a9edef1)
- product-applications 중단 작업 여부: 예 (operator-core-ui product-applications 모듈, @o4o/types tsc -b 해석 phantom[P1], 커밋 677a9e61c~c02fa33bb)
- 단순 연결 누락 여부: 아니오 (lms-ui 존재·선언·링크·src 도달 정상 — B 배제)
- 즉시 수정 권장 여부: 아니오 (타 세션 in-flight; contact 산출물 PASS)
- 후속 작업 제안: 아래 §10
```

## 10. 권장 후속 (소관 세션)
1. **(LMS 세션)** `WO-O4O-LMS-UI-CONSUMER-BUILD-WIRING-V1`(후보) — GP/KCos `tsc -b` 의 `@o4o/lms-ui` 해석(project reference/paths/moduleResolution) 완결 + reward-policy 타입(`CourseReusablePolicy` vs `CourseFormReusablePolicy`, implicit any) 정합. forum-core/Docker 와 동형 "소비측 와이어링" 정리.
2. **(product-applications 세션)** operator-core-ui product-applications 모듈의 GP/KCos `tsc -b` `@o4o/types` 해석 확인(빌드 순서/참조).
3. **(공통, 선택)** 루트 `build:packages` 또는 web 서비스 `tsc -b` 참조 목록에 신규 패키지(lms-ui 등) 등록 누락 점검 — 신규 source-only 패키지 추가 시 소비측 빌드 와이어링 체크리스트화.
4. **(현 working tree)** store-content 용어 정렬 변경(ContentHubTemplate + Hub*LibraryPage)은 별도 세션 in-flight — 본 IR 미접촉.

## 11. 결론
- GP/KCos web 빌드 실패는 **contact 자동회신 WO 와 무관**(A). api-server(contact 백엔드 포함) PASS.
- 원인은 **동시 세션의 LMS 공통 UI 추출/reward-policy 리팩터 + product-applications 공통화가 main 에 커밋되었으나 GP/KCos 소비측 `tsc -b` 와이어링이 미완(C)**. `@o4o/lms-ui` 는 존재·선언·링크 정상이므로 **단순 dependency 누락(B) 아님**.
- contact 직접 충돌(D) 아님.
- **권고**: 본 세션은 수정하지 않음. LMS / product-applications 소관 세션이 소비측 빌드 와이어링을 완결하도록 분리. 확인은 `pnpm install` → GP/KCos `tsc -b` 재측정(별도).

---

*Date: 2026-06-15 · read-only IR · 코드 무변경 · GP/KCos build FAIL = LMS(lms-ui 와이어링 + reward-policy 타입) + product-applications in-flight(A+C). contact 무관(api-server PASS), 단순 누락 아님(lms-ui 링크 정상). 현 working tree=store-content 용어 정렬 타 세션.*
