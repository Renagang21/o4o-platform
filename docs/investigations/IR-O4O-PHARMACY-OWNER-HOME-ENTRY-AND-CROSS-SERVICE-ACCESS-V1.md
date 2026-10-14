# IR-O4O-PHARMACY-OWNER-HOME-ENTRY-AND-CROSS-SERVICE-ACCESS-V1

> **상태**: ACTIVE
> **작성일**: 2026-10-09 · **최종 갱신**: 2026-10-09
> **근거 WO/IR**: 사용자 제공 `IR-O4O-PHARMACY-OWNER-HOME-ENTRY-AND-CROSS-SERVICE-ACCESS-V1` 조사요청서 및 조사 후 수정 지시
> **분류**: 조사 기록
> **범위**: 사용자가 지정한 공개 매장 경영자 체험 계정, 대표 홈 및 8개 활성 호스트.
> 사용자의 직접 지시 "조사 후 수정"에 따라 요청서의 조사 전용 종료 조건을 대체했다. 조사 단계는 운영 조회만 수행하고 수정은 프런트엔드로 제한했다.

## 1. 계정 식별과 확인 범위

사용자가 문제 계정을 "매장 경영자 체험 계정"으로 확인했다. 공개 Demo 정의(`packages/auth-utils/src/demoAccounts.ts`)와 실제 LoginModal의 일반 이메일 로그인 경로를 사용했다. 다른 계정·관리자로 대체하거나 Google 인증을 우회하지 않았다. credentials·사용자/조직 ID·세션 토큰·쿠키·handoff URL은 기록하지 않는다.

일반 이메일 로그인 HTTP 200. `/auth/me`의 역할은 `kpa:store_owner`. Google 연결 여부와 DB의 전체 연결 관계는 **미검증**이다. 환경에 DB credential binding이 없으며, API로 확인한 사실을 직접 DB SELECT 결과로 주장하지 않는다. Google 로그인 계정이라는 요청서의 가정은 사용자 확인에 따라 정정한다.

## 2. 운영 API 재조사 (수정 전)

| API | HTTP | 결과 |
|---|---|---|
| `/auth/services` | 200 | neture·kpa-society active. 다른 서비스 membership 없음 |
| `/neture/home/entry` | 200 | stores 0 · branches 0 · supplier none · netureMain active |
| `/work-scope/accessible-stores` | 200 | 소유 매장 1개, memberRole owner |
| `/neture/pharmacy/membership` | 200 | 본인 owner 관계로 조회되는 약국 신청 원장 없음(data null) |
| `/neture/pharmacy/service-access/kpa-society` | 200 | allowed false · next apply_pharmacy · pharmacy/semi membership status null |
| `/communities` | 200 | pharmacy·o4o-general canParticipate true, cosmetics false |
| `/work-scope/operator-services` | 200 | 운영 서비스 0개 |
| `/neture/pharmacy/store/context` (Workspace 세션) | 403 | STORE_OWNER_REQUIRED |

서비스 카탈로그의 가입 조건: neture·kpa-society는 이미 active; lecture·community·funding·kpa-branch는 joinEnabled false이며 대표 홈의 자가 가입 경로 없음. pharmacy-hub·k-cosmetics도 신규 가입 disabled. supplier는 독립 신청 상태 none이므로 공급자 신청만 표시되는 것은 정상이다. Store는 serviceKey가 아닌 Workspace다.

## 3. 데이터 흐름과 제외 지점

대표 홈은 `/auth/services`, `/neture/home/entry`, `/communities`, `/work-scope/operator-services`를 조합한다. 네 번째 커뮤니티 호출은 기존 코드에서 오류 시 빈 목록으로 처리한다. 이 동작은 이번에 변경하지 않았다.

기존 home API는 service membership active → 특정 store_owner role → 서비스별 매장 후보 순서로 조회한다. 약국 후보(`store-organization.resolver.ts`)는 organization_members의 owner/admin/manager 관계와 active neture_pharmacy_memberships를 요구한다. 기존 프런트는 반환된 stores에 다시 active 서비스 membership과 SERVICE_PATHS.myStore를 요구한다.

Store의 `accessible-stores`는 조직 관계 후보를 조회하고 **존재하는 약국 원장의 inactive 상태**를 제외한다. 원장이 없는 기존 조직까지 모두 제외하지 않는다. 따라서 이 체험 계정은 Store 선택 목록에는 나오지만 약국 업무 API의 자격까지 갖춘 것은 아니다.

운영 계정의 관측은 **CASE B**(소유 관계가 있으나 home API에서 미노출)에 해당한다. 필요한 약국 원장이 조회되지 않는다는 점에서 home API의 제외 자체를 인가 결함으로 단정하지 않는다. 그러나 대표 홈 진입 목록과 Store Workspace 목록의 기준 차이는 현재 조직 중심 진입 구조와 어긋난다. 신규 승인 약국에는 kpa-society membership이 생성되지 않을 수 있다는 정본·카탈로그 계약도 기존 선행 조건과 충돌한다.

프런트의 추가 membership 제외는 모의 입력으로 별도 재현했다(CASE C 가능). 대상 운영 계정은 이미 home API stores가 비었으므로 실제 계정의 CASE C를 확정하지 않는다.

## 4. 이름과 서비스/커뮤니티 진입

`myServices`의 neture/kpa-society는 active membership에서 생성된다. Neture 항목은 내 정보(`/mypage`)이며 약국 항목은 kpa-society 대상 handoff 후 pharmacy 루트로 이동한다. 서버 catalog에 name='KPA Society', nameKo 없음이어서 UI nameOf의 fallback으로 과거 표시명이 노출된다. 도메인은 pharmacy.neture.co.kr로 맞으며 이름 문제와 옛 도메인 문제를 구분한다.

커뮤니티 참여 가능은 서비스 목록에서 추론하지 않고 `/communities`의 canParticipate를 따른다. pharmacy entries는 kpa-society `/forum`, pharmacy-hub `/forum`; o4o-general은 neture `/community`다. 현재 route adapter는 community 호스트의 독립 커뮤니티로 연결한다. 로그인/목록 표시와 실제 게시·댓글 권한은 별개이며 게시 write는 수행하지 않았다.

## 5. 호스트와 인증 인계 실측

8개 호스트(neture·pharmacy·supplier·community·study·funding·store·kpa)의 루트는 공개 GET HTTP 200 HTML이다. 이 결과는 브라우저 업무 기능 검증이 아니다.

| 대상 | handoff 발급 / 교환 | 업무 판정 |
|---|---|---|
| Store Workspace (`targetWorkspace=store`) | 200 / 200 | 로그인 인계 가능. 약국 context 403, 자격 미완료 |
| O4O 약국 (`kpa-society`) | 200 / 200 | 기존 active 서비스 가입으로 인증 인계 가능. 약국 업무 승인과 별개 |
| 커뮤니티 (`community`) | 200 / 200 | canParticipate 확인, 게시 기능 미검증 |
| 강의 (`lecture`) | 200 / 200 | 공개 서비스 탐색과 로그인 가능. 수강 권한 미검증 |
| 펀딩 (`funding`) | 200 / 200 | 공개 서비스 탐색과 로그인 가능. 참여 write 미검증 |
| 공급자 (`supplier`) | 200 / 200 | 공급자 상태 none, 공급자 업무가 없는 것은 정상 |
| 분회 (`kpa-branch`) | 200 / 200 | 소속 분회 0, 분회 업무 진입 없음은 정상 |

정상 auth API를 통한 발급/일회 교환만 수행했다. 운영 DB에 직접 write·migration·role/membership 변경·사용자 생성·배포는 하지 않았다. 로그인과 handoff가 내부적으로 만드는 세션 상태는 일반 인증 동작이며 "운영 변경 0"을 세션 write까지 없었다는 뜻으로 쓰지 않는다. 브라우저의 실제 cross-origin 세션 복구·Google 재로그인 여부는 이번 API 실측만으로 확정하지 않는다.

## 6. 원인 분류와 수정

| 분류 | 판정·처리 |
|---|---|
| DATA_MISSING / DATA_INCONSISTENT | 체험 계정의 기존 소유 조직에 현재 약국 승인 연결이 조회되지 않음. DB 직접 확인과 데이터 보정은 미실행 |
| API_FILTER_DEFECT | 정상 승인 데이터 제외 가능 경로를 코드로 확인. 대상 계정의 원장 누락과 혼동하지 않음. 이번에는 서버 인가를 완화하지 않음 |
| FRONTEND_FILTER_DEFECT | Store 진입에도 서비스 membership·옛 경로를 요구. Store와 같은 accessible-stores 및 Workspace handoff로 수정 |
| DISPLAY_NAME_DRIFT | 대표 홈 표시를 O4O 약국으로 정렬. 내부 serviceKey·API catalog는 유지 |
| AUTH_HANDOFF_DEFECT | 발급/교환 결함 미재현. 종전 pharmacy 경유 매장 진입을 직접 Workspace 인계로 정렬 |
| PERMISSION_MISMATCH | 목록 노출과 약국 업무 403은 서로 다른 자격 판정. 보호 guard 유지 |
| EXPECTED_BEHAVIOR | 공급자 none, 운영자 0, 분회 0, 실제 가입 경로 없는 서비스의 가입 버튼 비노출 |

수정 후 대표 홈은 `accessible-stores`를 추가 조회하고 그 조직 목록으로 매장 버튼을 만든다. 신규 조회에서 빈 목록/오류가 나오면 기존 서비스별 stores로 대체하지 않는다. 기존 순수 모델 입력과의 호환 경로만 유지한다. 1개 매장은 `/store`, 복수는 `/select-store`로 이동하며 매장을 자동 선택하지 않는다. 체험 자동 이동도 같은 모델·Workspace 인계를 사용한다.

로그인 후 개인 업무 아래에 공개 서비스 둘러보기를 항상 제공한다. 가입/권한을 생성하지 않는 기존 공개 링크이며 신규 가입 버튼을 만들지 않는다. 약국·공급자는 주요 서비스 2열, 커뮤니티·강의·펀딩은 보조 진입이다. Retail·Hospital은 추가하지 않았다.

## 7. 잔여와 안전한 데이터 보정 순서

체험 계정으로 **실제 약국 업무를 정상 체험하는 목표는 아직 BLOCKED**다. 프런트 수정만으로 보호 API 403을 해소할 수 없다. 기존 Demo provisioning 스크립트에는 synthetic 약국 원장을 만드는 코드가 있으나 실행하지 않았다.

우선순위: (1) 이번 UI 진입 정합·검증·PR (2) 별도 승인된 대상 DB 연결로 Demo registry·정확한 조직·소유권·약국 원장·참조 관계를 SELECT 대조 (3) 복구 가능한 구체적 보정 계획 검토 (4) 승인 범위 안에서 보정 후 실제 업무 재검증. 모든 서브도메인 자동 가입, 기존 KPA 승인으로 약국 자격 추론, guard 우회는 해결책이 아니다.

## 8. 검증 및 완료 상태

운영 API 실측은 위 §2·§5. 코드 수정은 로컬/PR 단계이며 운영에 적용하지 않았다. 검증: web-neture Vitest 45 files / 378 tests PASS, TypeScript 및 Vite production build PASS. 변경 소스 ESLint error 0 · 기존 unused-disable warning 1. 문서 민감정보 검사 PASS. Chromium 로컬 빌드 smoke는 로그인 전/후 × 1280/390 총 4회: 가로 overflow 0, pageerror 0, h1 1개. 로그인 후 매장 버튼 → targetWorkspace store / returnPath /store 이동 확인. 브라우저 API는 실측 형상의 합성 fixture로 mock했으며 운영 업무 성공 증거가 아니다. 스크린샷은 checkout 밖 scratch에 보관하고 커밋하지 않는다.

IR 핵심 원인 조사 = COMPLETE(API·코드 범위), DB/Google 연결·실제 로그인 브라우저 업무 = BLOCKED/UNVERIFIED.
TARGET_ACCOUNT = VERIFIED(public STORE_OWNER Demo, user-confirmed).
DATA_REPAIR = NOT_EXECUTED. DIRECT_DB_WRITE = 0. PRODUCTION_DEPLOY = 0.
문서 정합: 요청서의 Google 로그인 가정, 이전 4개 API 흐름, 서비스별 매장 진입 설명을 현재 실측·수정과 구분했다. 정본 정책은 변경하지 않았다.

## 9. 최신 main 통합

PR 검증 중 `main`에 Demo 체험 수리 단계 1(`3e7f44c38c`)이 반영되어 통합했다. API의 승인 약국 후보는 KPA 개인 membership/역할을 추가 요구하지 않는 최신 변경을 보존했다. §2의 운영 실측과 §3의 기존 코드 분석은 통합 전 기록이며 최신 API가 동일 조건이라고 해석하지 않는다. 프런트의 기존 순수 모델 입력 호환 경로에도 약국 후보의 개인 가입 추가 필터 제거를 보존했다. 조직 기반 조회·직접 Workspace 인계·목적지 검증은 유지하고, 추가된 커뮤니티 handoff 보존 및 개인 가입 상태별 회귀를 함께 실행했다. 통합 후 45 files / 378 tests PASS.

## 10. 403 후속 코드 수정

사용자의 추가 지시에 따라 약국 업무 403과 Demo 구축 코드를 재검증했다. `createRequireStoreOwner('kpa')` → `isStoreOwner` → `resolveStoreOrganization`의 약국 원장 active 및 활성 조직 관계 조건은 정책에 맞으므로 제거하지 않았다. 기존 provisioning의 dry-run에는 약국 원장 생성 계획이 출력되지 않았고 기존 행은 상태 검증 없이 존재만 확인했다. 구축 출력에 pharmacy 계획을 추가하고, 존재만 확인한 상태는 `exists(unverified)`로 명시한다.

작업 중 최신 main에 PR #367의 `RepairCanonicalDemoExperience1791501198171`이 반영됐다. 해당 migration은 Demo registry·고정 테스트 조직·생존 소유자·합성 원장·경합 조직을 확인하고, 원장·소유 관계·역할·세미프랜차이즈 연결을 복구하며 before/after를 DB snapshot에 보관한다. 쓰기 경로는 기존 승인된 migration 하나로 유지하고 중복 repair CLI는 도입하지 않는다. 타 세션 문서의 승인 기록을 이번 세션의 DB write 승인으로 전용하지 않는다.

추가한 `apps/api-server/src/scripts/demo-pharmacy-access-audit.ts`는 읽기 전용 SERIALIZABLE 트랜잭션으로 조회한다. 공개 credential 정본의 매장 계정·활성 Demo registry·활성 Neture 가입·단일 owner 관계·기존 canonical Demo 조직을 확인한다. 다른 생존 구성원, 충돌 원장, 다른 신청자, 비활성 원장은 상태 코드로 구분한다. 승인 원장과 표식의 누락 여부만 요약하며 사용자·조직 ID나 실제 응답은 출력하지 않는다. `--apply`를 거부한다. 소유 관계가 누락되거나 비활성인 경우도 진단 오류로 보이며 이 도구에서 복구하지 않는다.

안전하게 DB 환경 변수를 구성한 후 저장소 루트에서:

```bash
node --import tsx apps/api-server/src/scripts/demo-pharmacy-access-audit.ts
```

현재 환경의 조회 실행은 `DB_CONFIGURATION_REQUIRED`로 중단됐다. `.env` 파일도 없어 DB 행을 조회·복구한 것으로 보고하지 않는다. 운영 DB write는 AGENTS.md §5의 별도 명시 승인 경계다. 실제 복구 적용 후 Store 업무 API와 이용계약 동의 조건을 재검증해야 한다. 운영 403 해소는 코드 커밋만으로 완료라고 판정하지 않는다.

후속 검증: 진단·기존 Demo 구축·약국 guard 회귀 3 suites / 56 tests PASS, API TypeScript 검사 PASS, 변경 스크립트 ESLint PASS. 초기 TypeScript 검사는 미빌드 workspace 모듈을 찾지 못해 실패했으며 해당 패키지를 빌드한 뒤 통과했다. 실제 PostgreSQL 복구 통합 검증은 최신 main의 CHECK 기록과 구분하며 이 세션에서 실행했다고 주장하지 않는다. 문서 정합: 초기 잔여 데이터 문제에 최신 main의 복구 구현 및 읽기 전용 진단 경로를 연결했다.
