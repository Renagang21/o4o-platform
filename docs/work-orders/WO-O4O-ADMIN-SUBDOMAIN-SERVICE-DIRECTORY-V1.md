# 관리자 서비스 관리 화면의 현재 서브도메인 정렬

> 현행 안내(2026-10-31): 협업체 이름은 **드럭스토어형 약국**, 현재 주소는 `https://drugstore.neture.co.kr`다.
> **과거 증적의 대상 보존:** 아래 “해당 협업체(당시 구명칭)”·“당시 협업체 구호스트”는 개명·주소 변경 전의 관측 대상이다. 아래 성공·실패·배포 결과를 현재 이름·주소의 운영 검증으로 읽지 않는다. 사용자 지시로 이전 표시명·주소 문자열은 재게시하지 않으며, 문서 경로와 기술 키의 현행 참조 정합은 과거 재실행을 뜻하지 않는다. 당시 원문·실제 호스트 식별자는 기존 Git 이력에서 확인하며 이력을 변경하지 않는다.

> **상태**: COMPLETED
> **작성일**: 2026-10-20 · **최종 갱신**: 2026-10-20 (Asia/Seoul)
> **근거 WO/IR**: 사용자 `/admin/platform/services`의 이전 서비스 목록을 현재 서브도메인 구조로 정비 요청
> **관련 정본**: [서비스 탐색](../baseline/O4O-HOME-SERVICE-DISCOVERY-V1.md) · [서브도메인 의미](../baseline/O4O-SUBDOMAIN-SERVICE-SEMANTICS-V1.md) · [역할별 업무공간](../baseline/O4O-ROLE-WORKSPACE-ARCHITECTURE-V1.md)

후속 통합 범위: 사용자가 개발 push 후 main 병합·운영 배포를 승인했다. 아래의 PR CI 미실행·운영 미반영은 최초 개발 인계 당시의 기록이다. 최신 main의 CarePharm 변경과 파일 충돌 없이 통합했으며, 후속 CI·리뷰·병합·실제 서빙 검증 결과는 이 branch의 병합 PR과 최종 운영 인계 보고에 기록한다. 이 문서의 개발 검증을 운영 완료 증거로 해석하지 않는다.

통합 리뷰 보완: PR #731의 약국 서비스 소개 문구 P2를 반영해 서비스 탐색 정본 §1의 확정 소개와 정확히 맞췄다. API 응답·화면·브라우저 fixture에 같은 문구의 검증을 추가하고 API 7·UI 8·Chromium 6 tests 및 변경 파일 lint를 다시 통과했다. 운영 데이터·권한·설정 변경은 추가하지 않았다.

## 1. 조사와 범위

기준 main `3f584bcab186dd8676e0a79f2563166b865b71f3`. 클라우드 격리 checkout을 유지하고 최신 main에서 새 전용 branch `wo/admin-subdomain-service-directory`를 생성했다. onboarding skill에 따라 추가 worktree는 만들지 않는다.

- 현재 화면은 `/api/v1/admin/platform-services` → `PlatformServiceCatalogService.listServices()` → `platform_services` DB 행을 표시한다. `entryUrl`은 현재 코드의 공식 URL과 별개이며 과거 상품 모듈·K-Cosmetics가 포함될 수 있다.
- 실제 서비스 호스트는 API `service-catalog.ts`, 사업별 호스트는 `@o4o/types`의 `PHARMACY_COLLABORATORS`, 내 매장 주소는 `store-workspace.ts`에 있다. `ServiceDiscovery.tsx`와 서비스 탐색 정본에 현재 공개 진입과 Partner 준비 중 정책이 있다.
- serviceKey·사업 key·운영 권한·업무공간·서브도메인은 다른 축이다. Pharmacy의 legacy `kpa-society`와 분회의 `kpa-branch`를 구분하고, CarePharm/해당 협업체(당시 구명칭)/협동조합의 새 service membership을 만들지 않는다.
- `platformAdminApi.getServices`/`PlatformService`의 관리자 UI 소비처는 이 페이지 하나다. 기존 DB catalog GET/PATCH와 공개 catalog 소비처는 변경하지 않고, 같은 관리자 guard 아래 별도 읽기 `/directory`를 추가한다.
- 기존 `requireAuth` + `requireAdmin`은 `platform:super_admin`을 확인한다. 권한·역할·인증·handoff·DNS·배포 설정·DB schema/seed/write는 변경하지 않는다.

## 2. 구현 TODO

- [x] 코드·정본·화면 및 문자열 소비처 대조, 데이터 출처와 퇴역 경계 확인
- [x] 현재 서비스 / 대표·공통 업무공간 / 연동·준비 중 항목으로 구성하는 서버 읽기 투영
- [x] 공식 코드 URL 재사용, K-Cosmetics·PharmacyHub·내부 상품 모듈을 현행 서비스로 노출하지 않음
- [x] Pharmacy·CarePharm·해당 협업체(당시 구명칭)은 해당 사업 원장의 운영/종료/미등록을 구분; 협동조합은 연합회 수준만 표시
- [x] Store·admin을 별도 가입 서비스와 구분, Partner는 대표 홈의 준비 중 설명으로 연결
- [x] 기존 실제 경로인 Cafe24·병원 도구는 연동/도구로 구분하고 서브도메인을 임의 생성하지 않음
- [x] 화면에 서비스명·공식 주소·업무 범위·원장 상태, 이름/주소 검색·구분 선택·오류 재시도 제공
- [x] 기존 활성 배지는 운영 확인으로 사용하지 않음; DB 읽기 실패를 미등록/0으로 숨기지 않음
- [x] API guard·읽기 전용·URL/퇴역 회귀, UI 상태·검색·필터, 데스크톱/모바일 브라우저 검증
- 타입·build·lint·문서 검사 후 path-specific commit/push, 원격 SHA 확인 결과와 운영 미반영 상태를 최종 보고로 인계

## 3. 화면과 데이터 계약

기존 route와 상위 메뉴는 유지한다. 초기 화면은 전체 목록을 세 구분으로 보여 주며 이름·주소로 검색한다. 내부 legacy key·서비스 기술 유형·대표 배지는 일상 화면에서 제거한다. 주소 등록은 실제 DNS/서빙/가입 가능 상태 확인을 뜻하지 않으며, 약국 협력사업 상태만 해당 `semi_franchises`의 현재 행으로 판정한다. 협동조합 연합회는 단일 사업 행이나 개별 조합 상태를 추정하지 않는다.

기존 catalog 편집·가입/승인·계정/역할 관리 기능은 이 화면에 추가하지 않는다. 이번 종료점은 검증·commit·push이며 PR·main 병합·배포는 후속 통합 단계다.


## 4. 개발 검증 결과와 통합 인계

- 현재 서비스 9개, 대표·공통 업무 공간 3개, 연동·도구·준비 중 3개의 총 15개 진입을 표시한다. 현재 이름·주소를 우선하고 이전 DB의 `entryUrl`/기술 유형/대표 배지는 읽지 않는다.
- 관리자 섹션 공통 탭이 모바일에서 세로로 꺾이는 문제를 같은 섹션 내부의 가로 스크롤로 보완했다. 소비처는 `platform.routes.tsx` 아래 플랫폼 홈·계정·서비스·사용자·역할·대상 정책 6화면이다. 메뉴 항목·경로·guard는 유지한다. 브라우저에서 기존 계정 탭 → 서비스 탭 진입과 직접 URL/새로고침을 확인했다.
- API Jest 7, 관리자 Vitest 8, 데스크톱·모바일 Chromium 6 tests PASS. 양쪽 타입 검사·build PASS, 변경 파일 ESLint 오류/경고 0. 최초 브라우저의 광범위한 alert selector가 기존 개발 버전 배너까지 선택해 실패했으며 실제 오류 영역으로 한정해 전체 6건 재검증을 통과했다.
- [검증 CHECK](../checks/CHECK-O4O-ADMIN-SUBDOMAIN-SERVICE-DIRECTORY-V1.md)에 표시 대상·출처·제한을 기록한다. 실제 Google 관리자 로그인·운영 DB/원장 상태·DNS/서빙·실제 외부 서비스 클릭 검증은 수행하지 않았다. 테스트는 로컬 fixture로 외부 API를 차단했다.
- API의 새 GET을 관리자 화면보다 먼저 사용할 수 있어야 한다. 통합 시 API → admin 순서의 기존 배포 경로를 사용한다. 신규 migration/seed/DB write·역할/인증/공통 서비스 카탈로그 변경은 없다. 이번 branch에서는 PR·CI·병합·배포를 수행하지 않는다.

문서 정합: 이전 관리자 표시와 현재 서비스 탐색·서브도메인 정본 간 차이를 구현 WO/CHECK로 기록했다. 과거 catalog CHECK의 DB `entry_url` 정리 잔여는 이 화면에서 공식 코드 주소를 사용하도록 해소하며 DB 값 자체의 삭제·수정은 수행하지 않는다. 정본 정책·CANONICAL-INDEX는 바꾸지 않았다.

## 5. 후속 main 통합·운영 배포 결과

2026-10-20 16:31 (Asia/Seoul) 확인. 위 개발 인계 기록 이후 사용자가 main 병합·운영 배포를 승인했고, 다른 공간의 배포 종료를 확인한 뒤 순차 진행했다.

- [PR #731](https://github.com/Renagang21/o4o-platform/pull/731) 병합: `f37ff2dcab971cdc4def5086eb565b9613410b10`. 최신 branch의 PR CI·CodeQL·SonarCloud 통과, Codex 미해결 finding 0건을 확인했다. 약국 소개 문구와 응답 검증 오류 메시지에 대한 리뷰 보완을 반영했다.
- 병합 후 [main CI](https://github.com/Renagang21/o4o-platform/actions/runs/39384764123)와 CodeQL 통과. [Delivery](https://github.com/Renagang21/o4o-platform/actions/runs/39385916999)가 LEVEL 2로 API → admin을 자동 배포했고 최종 `production` 상태는 `DEPLOYED`다. 다른 웹 서비스는 이번 배포 대상이 아니다.
- API `o4o-core-api-04107-sad`, 관리자 `o4o-admin-dashboard-01529-dir` 각각 트래픽 100%, revision label의 SHA가 위 병합 SHA와 일치했다. 운영 HTTP·게시 파일 검증과 한계는 [CHECK §4](../checks/CHECK-O4O-ADMIN-SUBDOMAIN-SERVICE-DIRECTORY-V1.md#4-후속-운영-배포-검증)에 기록했다.
- 신규 migration·seed·DB write 코드는 없다. 기존 배포 절차의 migration Job `o4o-api-migrations-rxgh9` 성공을 확인했으나 적용 건수·운영 데이터 무변경을 직접 검증한 것은 아니다. 별도 DB 조회·수정이나 운영 로그인은 수행하지 않았다.
- 배포 결과 기록은 동일 WO의 연속 단계로 기존 전용 branch에서 문서만 갱신한다. 이 문서 변경의 배포는 `NOT_APPLICABLE`이며 서비스 재배포는 하지 않는다. 클라우드가 준비한 단일 기본 checkout은 `KEEP`한다.

문서 정합: WO 완료 상태와 기존 CHECK의 운영 증적을 추가했다. 개발 당시의 미배포 기록은 이력으로 보존하며 정본·정책·index는 변경하지 않았다.
