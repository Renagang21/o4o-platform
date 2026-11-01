# 약국 서비스 설정·My Home 직원 허용 검증

> 현행 안내(2026-10-31): 협업체 이름은 **드럭스토어형 약국**, 현재 주소는 `https://drugstore.neture.co.kr`다.
> **과거 증적의 대상 보존:** 아래 “해당 협업체(당시 구명칭)”·“당시 협업체 구호스트”는 개명·주소 변경 전의 관측 대상이다. 아래 성공·실패·배포 결과를 현재 이름·주소의 운영 검증으로 읽지 않는다. 사용자 지시로 이전 표시명·주소 문자열은 재게시하지 않으며, 문서 경로와 기술 키의 현행 참조 정합은 과거 재실행을 뜻하지 않는다. 당시 원문·실제 호스트 식별자는 기존 Git 이력에서 확인하며 이력을 변경하지 않는다.

> **상태**: COMPLETED
> **작성일**: 2026-10-18
> **작업**: [전체 TODO](../work-orders/TODO-O4O-PHARMACY-SERVICE-POLICY-V1.md)
> **종료 범위**: 코드·문서·로컬 검증·작업 branch push. 운영 적용은 후속 통합 담당 범위.

## 결과

- 전체 관리자 `약국 서비스 설정` 메뉴에서 기본·유료·등록 협력사업의 제공 기능을 선택한다. 사업 등록·가입 원장은 기존 경로를 사용한다.
- 기존 settings와 조직 소속 metadata만 재사용한다. 새 테이블·migration·유료 등급·약국 규모 조건·개별 사업 코드 분기는 없다.
- 기능은 기본/사업/경영자 유료 합집합이며 근무자는 경영자 허용과 교집합으로 사용한다. 유료 자격은 회원 소유이고 직원의 결제 여부는 약국의 기능을 늘리지 않는다.
- My Home의 초대·수락·최종 승인과 직원별 수정, 내 매장 메뉴·직접 URL·로그인 실행 API를 연결했다. 기본 매장 접근과 전문인 자격은 별도다.
- 기존 승인 직원의 호환 범위를 고정하고 신규 승인 시 목록을 Role과 같은 트랜잭션으로 저장한다. 명시적 빈 목록·재초대 초기화·권한 발급 실패 롤백을 확인했다.
- 정책/직원 설정의 malformed 값과 조회 실패는 미가입으로 처리하지 않는다. 계정·매장 전환 시 이전 응답/허용 상태를 폐기한다.

정본: [약국 설계 §15-7](../design/DESIGN-NETURE-PHARMACY-STORE-COMMERCE-V1.md#15-7-대상별-서비스-설정과-my-home-근무자-허용-2026-10-18), [My Home](../baseline/O4O-MY-HOME-CANONICAL-V1.md), [매장 접근](../baseline/O4O-STORE-ACCESS-AND-MEMBERSHIP-V1.md).

## 로컬 검증

| 검증 | 결과 |
|---|---|
| API 단위·실제 PostgreSQL/HTTP·직원 승인·매장 접근·raw-source 계약 | 8 suites / 93 tests PASS |
| 공통 운영 UI 전체 | 24 files / 177 tests PASS |
| My Home 직원 관리·호스트 분기 | 2 files / 57 tests PASS |
| 내 매장 이용 판정·직원 지원 | 2 files / 6 tests PASS |
| 협동조합 앱 회귀 | 4 files / 39 tests PASS |
| 기본 약국/독립 사업 문맥 | 1 file / 1 test PASS |
| 합계 | 373 tests PASS |
| API TypeScript·build | `tsc --noEmit` 및 `pnpm --filter @o4o/api-server build` PASS |
| 공통 의존 패키지 | `pnpm run build:packages` PASS |
| 관리자·Neture·Store 앱 | Vite build / Neture·Store 타입 포함 build PASS |
| PC·모바일 Chromium fixture | 1440/390px, 세 화면 26개 확인 PASS, 화면 오류·가로 넘침 0 |
| 변경 ESLint·diff·문서 민감정보 검사 | 오류 0, 기존 파일의 미사용 변수 경고 잔여. 문서 민감정보 패턴 0 |

SQL 검증은 운영 DB와 분리한 전용 로컬 fixture DB만 사용했다. 회원/사업/약국·개별 직원 권한은 실제 SQL과 HTTP guard로 검증하고 세션 인증만 합성했다. 기존 HTTP fixture의 빈 roles를 실제 로컬 role 원장 투영으로 보완해 최신 Neture 관리자 guard 계약과 맞췄다. 순수 매장 자격 테스트는 `resolveStore`, 직원 로그인 판정은 실제 소속 사용자·실행 API로 검증한다.

브라우저는 실제 React 컴포넌트·메뉴 필터·이용 판정 hook에 합성 네트워크 응답을 연결했다. 관리자 저장 실패/재시도·대상별 저장, My Home 승인/직원별 수정·선택 매장 전달, 내 매장 제한/조회 실패 재시도를 확인했다. 실제 로그인·운영 API·운영 전체 앱 smoke를 의미하지 않는다.

## Consumer Impact Matrix

| 소비처 | 변경 영향 | route/role/capability 영향 | 검증 |
|---|---|---|---|
| Admin | 새 서비스 설정 메뉴/화면 | `/admin/pharmacy-service-settings`, platform super admin | 전체 공통 UI·build·PC/모바일 fixture PASS |
| Neture | 관리자 호환 wrapper·My Home | 관리자 호스트 이동·메뉴 권한·직원 승인/수정 | 관련 57 tests·타입 포함 build·PC/모바일 fixture PASS |
| 공통 Store/서비스 지정 Store | 사용자별 기능 제한 | 계정/조직 scope·메뉴·직접 URL·실행 API | 6 tests·타입 포함 build·PC/모바일 fixture PASS |
| Pharmacy/Drugstore | 공통 사업/내 매장 API 재사용 | 사업별 코드 분기 추가 없음 | 사업 문맥·SQL/HTTP·공통 모듈 검증 PASS |
| CarePharm | Neture/Store 공통 기능 소비 | 기존 사업 가입과 비공개 자료 guard 유지 | 호스트 분기·Neture build·SQL/HTTP PASS |
| Cooperative | 공통 pharmacy-management export 소비 | 조합의 명시적 businessKey·가입 원장 유지 | 전체 39 tests PASS |
| 비약국 Store·은퇴 서비스 | 새 약국 정책 적용 없음 | 공개 QR/보유 사본·기존 기기 계약 유지 | 기존 접근·메뉴 raw-source 계약 PASS |

심볼·API/route·파일 경로를 함께 검색했다. `UnifiedStoreLayout.tsx`의 raw-source 소비처 `store-service-scoped-owner-entry.spec.ts` 21개도 포함해 실행했다. KPA/조합의 operator UI는 기존 export와 선택 props 계약을 유지한다.

## 운영 및 후속 범위

- 정책·사업 등록·회원 유료 자격·직원 관계를 운영에서 변경하지 않았다. 이번 변경은 migration이 필요 없다.
- 현재 테스트 계정 기준 파일 `docs/local/TEST-ACCOUNTS.local.md`는 작업/기준 checkout 모두 없어 실계정 관리자·경영자·직원 smoke는 미실행이다. 운영 계정이나 과거 계정으로 대신하지 않았다.
- 실시간 다국어 상담·전문인 확인·AI 입출력, 공용 태블릿의 직원 식별, 실제 수납·갱신은 이번 구현에 포함하지 않는다. 미구현 서비스 메뉴도 추가하지 않는다.
- branch `wo/pharmacy-service-policy`, 기준 main `78909a7a87`. PR 생성·CI/리뷰 운영·병합·배포는 통합 담당에게 인계한다. worktree는 후속 수정용으로 유지한다.

문서 정합: 현재 승인한 정책 범위의 약국 설계·My Home·매장 접근 정본을 갱신했다. 과거 WO/CHECK와 canonical index는 변경하지 않았다.
