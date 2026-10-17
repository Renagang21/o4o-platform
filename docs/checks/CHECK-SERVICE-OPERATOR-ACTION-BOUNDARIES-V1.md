# 서비스 운영자 조치별 권한 정비 검증

> 상태: 개발 검증 · push 인계
> 작성일: 2026-10-17
> 작업 branch: `wo/service-operator-action-boundaries`
> 개발 기준: `aee4957413fd02b443a85e5a68a786fdb76d63d1`
> 근거: [TODO](../work-orders/WO-SERVICE-OPERATOR-ACTION-BOUNDARIES-TODO-V1.md), [운영자 회원관리 기준 §1.0](../platform/operator/O4O-OPERATOR-USER-MANAGEMENT-STANDARD-V1.md)

## 범위·순서

TODO를 먼저 작성하고, 활성 서비스 catalog·정본·실제 route/guard·원장·화면·테스트를 재대조해 §4를 보완한 뒤 구현했다. 사용자의 추가 범위인 협동조합·약국 협력사업의 메인/개별 운영과 분회를 포함했다. 개발 종료점은 commit/push이며 PR·CI·병합·배포·운영 DB write는 실행하지 않았다.

`cloud-environment-onboarding:setup` 및 runtime 지침에 따라 기존 격리 클라우드 checkout을 사용하고 새 worktree를 만들지 않았다. 새 독립 branch는 당시 최신 main에서 만들었으며 이전 강의 수료증 branch를 재사용/혼합하지 않았다. 종료 직전 origin/main은 `f2b18165f3`(#684 홈/계정 헤더)로 이동했다. 변경 경로는 이번 변경과 겹치지 않았으며 자동 merge/rebase하지 않았다. 이 CHECK의 검증은 위 개발 기준 branch에 대한 것이다.

## 실제 변경

| 범위 | 결과 |
|---|---|
| Neture·KPA 공통 포럼 | 현재 서비스 가입 확인 추가, 구 operator hard-delete URL도 service admin 필수. admin 사전 확인/실행 모두 archived 전용, 정상 게시글을 포함한 기존 종속 purge와 필수 감사가 동일 transaction |
| 포럼 사용 중지/재개 | forum row 잠금, 공개 게시글만 중지. 서버 감사의 게시글 ID와 보관 당시 수정 시각이 일치하는 글만 재개. 과거/수정된 글·추적이 없는 글은 임의 복구하지 않음. admin 복구도 같은 처리 사용 |
| 강의 | 일상 검토·보관은 operator 유지. 완전 삭제는 lecture admin + 사유, lecture/archive 최종 확인·학습 관계 정리·감사를 같은 transaction에 저장 |
| 상품 | 조회·누락 분류 수정·휴지통/복원은 operator. pending/휴지통 완전 삭제·master 병합은 neture admin + 사유. 최종 상태·확인된 연결 검사·행 잠금·삭제/병합·감사 원자화. 주문/장바구니 참조는 삭제하지 않고 차단 |
| 상품 UI | operator 메뉴/직접 URL 추가, 기존 admin URL 유지. 실패를 빈 목록으로 바꾸지 않음. 쓰기 잠금·사유 보존·늦은 응답/권한 변경·부분 병합·저장 후 조회 실패 분리. 조회 복구로 파괴 조치를 재실행하지 않음. 복원은 비활성 유지 |
| Neture 문의 | 유형 전체의 상세/상태/내부 메모를 operator 일상 처리로 연결. 안전 필드 whitelist, 보안 telemetry 제외, 조회 시점 충돌 409, 재개 시 resolvedAt 해제, 필수 감사. admin URL은 같은 일상 화면을 재사용하고 일상 메뉴는 operator에 배치 |
| 공급자 | 기존 governance admin 경계와 승인/진열 비활성화 계약 유지. 이미 manager를 지원하는 역할 서비스를 사용해 상태·조직·역할·감사를 한 transaction에 저장. 알림은 commit 후 기존 best-effort 유지 |
| 회원 | 선택 서비스 admin 재확인, 가입 관계 삭제로 활성 운영 tier 보호를 우회하지 못하도록 차단. 공통 hard 가입 정리 감사와 KPA 전용 프로필/가입 정리·감사를 transaction 안에 저장. 공통 계정/타 서비스/활동 전체를 지운다는 표시 수정 |
| 협동조합·약국 협력사업 | 사업 생성·설정·담당자 관리를 neture service admin에 배치. 플랫폼 유료 기능/전체 설정은 기존 platform 전용 유지. 개별 사업 운영은 담당 관계 필수. 담당 지정은 유효 운영 역할 + 현재 메인 자격을 확인하고 생성/수정/지정/해제를 transaction 감사 |
| 분회·Community·Funding | 현재 개별 분회 소속·타 서비스 접근 거부·중앙 지정 경계, Community 서비스 역할/현재 가입, Funding 오프라인 일상 운영 경계를 재대조하고 회귀. 지역 operator에게 전 분회 심사권 부여, 폐기 개체 API 복구, 은행/결제 자동화는 추가하지 않음 |

공통 `MemberHardDeleteConfirmModal`은 선택적 `relationshipOnly`/`confirmDisabled`로 Neture/KPA 실제 범위를 표시한다. 기존 소비처 기본 계약은 유지하며 대상 변경 시 확인 입력을 초기화한다. 공통 포럼 UI의 완전 삭제 표시도 wrapper 권한에 맞춘다. shared 소비처는 Neture/KPA, 기존 공통 wrapper, 협력사업 UI와 협동조합 adapter까지 확인했다.

## 검증

| 실행 | 결과 |
|---|---|
| API Jest 집중 회귀 20 suites (`service-action-*`, forum guard, supplier lifecycle, business access/admin, membership/controller/KPA atomicity, 분회·Community·Funding·lecture 계약) | **458 PASS** |
| Neture 전체 Vitest 123 files | **1,104 PASS** (후속 상품 scope 회귀 1개·가입 정리 2개 추가 전 실행) |
| 최종 Neture 변경 UI/config 7 files | **57 PASS**; 별도 가입 정리 UI **2 PASS** |
| 공통 회원·포럼·약국 협력사업 Vitest 14 files | **94 PASS** |
| KPA-Society 전체 Vitest 24 files | **167 PASS** |
| 협동조합 전체 Vitest 4 files | **38 PASS** |
| API `tsc --noEmit`, `build:api` | PASS |
| Neture·KPA-Society `build` (tsc + Vite), 협동조합 `build` (tsc + Vite) | PASS |
| 변경 TS/TSX에 루트 flat ESLint | 오류 0, 기존 경고 7 (미사용 지역변수·기존 callback 의존성). `.eslintrc.cjs`/flat 혼용 결과는 유효 검사로 계산하지 않음 |
| 문서 민감정보 검사·`git diff --check` | PASS |

협동조합 node_modules가 초기 클라우드 설치 범위에 없어 첫 실행에서 workspace import가 실패했다. 기존 lockfile로 해당 workspace와 의존 패키지를 설치한 후 전체 테스트/빌드를 재실행했다. dependency·manifest·lockfile을 변경하지 않았다. operator-core-ui는 source-export 패키지이며 build script가 없어 소비 웹 빌드·공통 Vitest로 검증했다. Vite의 기존 큰 chunk/Browserslist 경고는 기능 실패로 계산하지 않는다.

브라우저는 Chromium으로 **실제 production build**를 열고 API를 전부 합성 fixture로 대체했다. 외부 운영 업무 요청/데이터 생성은 0건이다.

- Neture 1440px/390px × operator/admin: 메뉴·직접 URL, 휴지통 복원/완전 삭제 노출, 실패 사유 보존, 성공 후 조회 실패와 읽기만 재시도, 문의 상세·상태·메모 저장 확인.
- KPA 1440px/390px × operator/admin: 포럼 직접 진입과 operator 완전 삭제 비노출/admin 노출 확인.
- Neture/KPA 가입 정리 1440px 및 390px/844px: 명시 서비스 대상 확인·실제 가입 정리 범위·확인 입력·화면 내 버튼 접근·취소 시 write 0 확인. KPA admin flex 본문 overflow와 긴 공통 확인창 panel의 모바일 스크롤도 보완·재확인했다.
- 위 fixture browser의 page error·가로 page overflow 0. 스크린샷/요청 기록은 로컬 합성 검증 산출물이며 저장소에 넣지 않았다.

## 미확인·미구현 / 통합 인계

**전체 서비스 운영자가 모두 완성됐다는 판정이 아니다.** [TODO §5](../work-orders/WO-SERVICE-OPERATOR-ACTION-BOUNDARIES-TODO-V1.md#5-미구현후속-완료-조건)에 메인/연합 operator 지정 범위, 활동 전체 영구 삭제, 외부 첨부 정리, 기존 best-effort 감사와 완료 조건을 남겼다. 특히 `federationOperators: []`와 분회 service admin에 남은 전역 일상 심사를 임의의 전체 operator 허용으로 대체하지 않았다.

실제 PostgreSQL FK/CASCADE·데이터 rollback·경쟁 요청은 실행하지 않았다. 대역 테스트의 transaction 실패 전파/commit 미실행 검증을 실제 데이터 복구·동시성 검증으로 보고하지 않는다. 신규 주문 JSON 참조와 상품 삭제, 역할 지정과 가입 정리의 동시 경쟁까지 보장하는 변경도 아니다. 실제 운영 migration·삭제·권한 부여·실계정 smoke는 미실행이다.

통합 담당은 이 branch HEAD와 기준 main 차이를 확인한 뒤 PR/required CI·리뷰·병합·배포를 진행한다. 신규 schema/migration은 없다. 기존 API의 파괴 조치는 해당 서비스 admin과 사유가 필요하며, 구 operator URL로 권한을 우회할 수 없다.

문서 정합: 회원관리 기준의 조치별 운영/가입 정리 범위를 갱신하고 상위 정비 TODO에 최신 전체 범위를 연결했다. 이전 WO의 분회 제외와 과거 완료 기록은 소급 덮어쓰지 않았다.

## 최신 main 통합 재검증 (2026-10-18 KST)

기준 main `663e2c7d703ab67f19baf7e4482f85ad58c713aa`를 작업 branch에 merge했다. PR #685의 커뮤니티 전용 회원·활동/포럼 삭제 계획과 실행 API, PR #686의 협동조합 운영 workspace를 보존했다. 따라서 위 조사 시점의 활동 전체 삭제 미구현 판정은 커뮤니티 전용 경로에 일괄 적용하지 않는다. 커뮤니티는 전용 삭제 계획·참조 차단·원자 실행이 구현됐으며, 공통 가입 정리와 다른 서비스의 활동 삭제 후속은 별개다.

통합 후 권한·삭제 경계 API 5 suites/92 tests와 Neture production build가 통과했다. Neture의 CarePharm 라우트와 신규 operator 상품 정리 라우트를 함께 확인했다. 이번 변경에는 신규 schema/migration이 없다. PR required CI·리뷰와 배포 결과는 GitHub PR/Actions의 실제 결과로 판정한다.
