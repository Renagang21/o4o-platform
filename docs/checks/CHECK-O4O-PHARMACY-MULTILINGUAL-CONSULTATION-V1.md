# 내 매장 다국어 상담 검증

> **상태**: COMPLETED — 코드·문서·로컬 검증·작업 branch push 범위
> **작성일**: 2026-10-18
> **작업**: [전체 TODO](../work-orders/TODO-O4O-PHARMACY-MULTILINGUAL-CONSULTATION-V1.md)

## 결과

내 매장 `다국어 상담` 메뉴에서 매대 약사 상담·매장 직원 응대·매장 약사 상담을 고른다. 한국어와 영어·중국어·일본어·베트남어·태국어·인도네시아어 간 문자 번역, 고객용 큰 글씨 화면, 새 상담 초기화를 제공한다. 직원의 고객 대상 응답은 서버가 선택하는 매장 안내·약사 연결 문구만 번역한다. 약사 모드는 직접 작성한 문장을 번역하며 의료 답변·추천을 생성하지 않는다.

- 관리자 기본/유료/등록 협력사업 기능 선택과 My Home 직원 허용을 재사용한다. 기존 회원·직원에 새 기능을 자동 제공하지 않는다. 운영 제공 대상을 설정해야 한다.
- 약사 사용 확인은 초기 구현 가정으로 My Home에서 실제 경영자가 확인하는 방식이다. 직원 자기 확인은 거절하고 경영자 본인은 자기 확인을 저장한다. 공식 면허 검증 표시를 만들지 않으며 기존 검증 프로필도 읽는다. 추가 확인 방식에 관한 사용자 답변이 있으면 후속 반영한다.
- 기존 조직 소속 metadata만 추가 사용한다. 직원 기능·확인은 같은 UPDATE, 최종 승인은 Role 발급과 같은 트랜잭션이다. 재초대는 두 설정을 초기화한다. 새 테이블·migration·직원 등급·유료 등급·사업별 코드 분기·의존성 변경은 없다.
- AI Core Extension과 CONTENT_TRANSLATION 정책·플랫폼 부담·회원 사용량/한도를 재사용한다. Core/Task/Memory 구조를 바꾸거나 provider를 직접 호출하지 않는다. AI 정본의 현행 정렬 §25와 개인 Assistant 구조 §18을 대조했다.
- 숫자와 일반적인 영문 수량 단위의 추가·누락·변경을 검사한다. 번역 어순에 따른 숫자 순서 변경은 허용한다. 임상적 의미·번역 정확성 보장은 아니며 결과는 사람이 확인한다.
- 원문·번역은 DB·애플리케이션 로그·브라우저 저장소에 남기지 않는다. 기존 AI 사용량 및 Extension 이벤트는 내용 없는 메타데이터다. 번역 provider에는 입력 문장이 전달된다.
- 계정·매장·모드·언어 변경과 pagehide에 내용을 지우고 늦은 응답을 폐기한다. 실행 전·Core 호출 전·완료 후 현재 관계/기능/약사 확인을 재검사한다. 조회 실패는 미가입으로 치환하지 않는다.

정본: [약국 설계 §15-8](../design/DESIGN-NETURE-PHARMACY-STORE-COMMERCE-V1.md#15-8-내-매장-다국어-상담-2026-10-18), [My Home](../baseline/O4O-MY-HOME-CANONICAL-V1.md), [Store 접근](../baseline/O4O-STORE-ACCESS-AND-MEMBERSHIP-V1.md).

## 로컬 검증

| 검증 | 결과 |
|---|---|
| API 단위·실제 PostgreSQL/HTTP·직원 승인·접근·raw-source 계약 | 12 suites / 118 tests PASS |
| 공통 운영 UI 전체 | 24 files / 177 tests PASS |
| My Home 직원/본인 확인 | 1 file / 13 tests PASS |
| 내 매장 상담·기능 판정·직원 지원 | 3 files / 13 tests PASS |
| 합계 | 321 tests PASS |
| 의존 패키지 | `pnpm run build:packages` PASS |
| API | TypeScript 및 `pnpm --filter @o4o/api-server build` PASS |
| Neture·Store | 타입 포함 Vite build PASS |
| Chromium PC·모바일 fixture | 1440/390px, 관리자·My Home·상담·고객 dialog 36개 확인 PASS, 화면 오류·가로 넘침 0 |
| 변경 ESLint | 오류 0, 기존 routes의 `_next` 미사용 경고 1건 |
| diff·문서 민감정보 검사 | 오류/민감정보 패턴 0 |

PostgreSQL은 운영과 분리한 loopback 전용 fixture다. 정책·사업·유료·관계·전문인 확인은 실제 SQL, session은 합성 인증을 사용했다. 실제 RoleAssignment repository를 포함한 최종 승인과 상담 HTTP까지 실행했다. 미가입 유료 경영자, 무료 직원 허용, 직원 임의 응답/자기 약사 확인 거절, 다른 매장 차단, 호출 중 Role·유료 기능·직원 허용·약사 확인 회수, 합집합 중복/종료, 조회/AI 실패를 확인했다. 실제 AI provider는 호출하지 않고 합성 번역 응답으로 Core 정책·한도·입출력 검사를 검증했다.

브라우저는 실제 관리자 설정·My Home·상담 React 컴포넌트와 합성 API를 연결했다. 기능 선택, 확인 전 약사 기능 비활성, 확인 후 승인, 세 모드, 안내 문구/고객 입력 번역, 고객 dialog, 실패 후 입력 보존/재시도, 늦은 응답 차단·새 상담을 확인했다. 실제 로그인·운영 전체 앱 smoke를 의미하지 않는다.

## Consumer Impact Matrix

| 소비처 | 영향 | 검증 |
|---|---|---|
| Admin·공통 operator UI | 기존 동적 기능 목록에 상담 세 기능 표시, 새 설정 화면 없음 | 전체 공통 UI 177 tests·실제 설정 화면 fixture |
| Neture My Home | 직원 허용·최종 승인에 약사 확인, 본인 확인 | 13 tests·SQL/HTTP 실제 승인·타입 포함 build·PC/모바일 |
| 공통 Store·서비스 지정 Store | 한 메뉴·세 기능 any-of 진입·모드별 실행 | 13 tests·접근/raw-source 계약·타입 포함 build·PC/모바일 |
| Pharmacy·Megapharm·CarePharm·Cooperative | 공통 설정/가입 원장과 Store 소비, 도메인별 상담 분기 없음 | 공통 UI·SQL/HTTP·공통 route/메뉴 검증. 개별 운영 호스트 로그인은 미실행 |
| 비약국 Store·기존 직원 지원 | 약국 adapter에서만 상담 메뉴 표시, 기존 기능 계약 유지 | StaffSupport·접근·메뉴/raw-source 회귀 |

심볼·route·파일 경로 literal 소비처를 함께 조사했다. `App.tsx`와 `UnifiedStoreLayout.tsx`를 읽는 `pharmacy-hub-retirement.spec.ts`, `store-service-scoped-owner-entry.spec.ts`도 실행했다. 공통 메뉴 변경에 사업별 조건이나 직원 Role을 추가하지 않았다.

## 통합 인계와 한계

- branch `wo/pharmacy-multilingual-consultation`, 시작 main `716504eaf2`. 선행 서비스 설정 `9af97a9413`을 merge commit `bd420020c9`로 포함한다. 선행 코드를 중복 cherry-pick하지 않는다.
- push 전 fetch에서 main은 `5abc453695`로 이동했다. 공급 제안 조건·홈·계정 헤더 변경이 포함되며 공통 pharmacy routes도 변경됐다. 이 개발 branch에 자동 병합하지 않았다. 통합 담당은 최신 main 병합 및 관련 재검증 후 진행해야 한다. 위 검증은 시작 main과 선행 기능을 합친 작업 branch 기준이다.
- PR 생성·PR CI/리뷰 운영·main 병합·배포·운영 정책 변경은 통합 담당 범위이며 실행하지 않았다. branch push만으로 운영에서 기능을 사용할 수 있지는 않다.
- `docs/local/TEST-ACCOUNTS.local.md`가 없어 실계정 smoke를 진행하지 않았다. 실제 번역 provider 호출·언어별 약사 검수·공용 태블릿 직원 식별·음성은 이번 검증/구현 범위에 없다.
- WORKTREE_DISPOSITION: main 미통합, 후속 수정에 필요한 branch/worktree를 `KEEP`한다. 로컬 전용 PostgreSQL fixture는 검증 후 종료한다.

문서 정합: 승인된 상담 범위의 약국 설계·My Home·매장 접근 정본과 TODO/CHECK를 갱신했다. 과거 기록과 canonical index는 변경하지 않았다.
