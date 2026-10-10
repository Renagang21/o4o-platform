# 서비스 진입·메뉴 정비 TODO

> **상태**: ACTIVE
> **작성일**: 2026-10-10 · **최종 갱신**: 2026-10-10
> **근거 WO/IR**: 사용자 요청 — TODO 작성 → 현행 코드·문서 조사 보완 → 순서대로 구현·push

## 기준과 조사 보완

[대표 홈 정본](../baseline/O4O-HOME-SERVICE-DISCOVERY-V1.md), [서비스 의미](../baseline/O4O-SUBDOMAIN-SERVICE-SEMANTICS-V1.md), [공유 모듈 규칙](../baseline/O4O-SHARED-MODULE-CHANGE-PROTOCOL-V1.md)을 적용한다. 클라우드 설정과 TODO 초안은 구현 전에 작성·보완했다. 본 문서는 저장소에 보존하는 실행 결과다.

- 대표 홈은 정본의 5분류를 사용한다. 교육·학습은 커뮤니티·단체활동에서 탐색하며 강의 앱·권한은 유지한다.
- 내 매장 루트는 KPI·최근 활동을 보여주는 실제 업무 현황이다. 소개 화면과 구분해 보존한다.
- Partner 준비 중 설명 페이지만 예외적으로 둔다. Legacy Partner API·권한은 복구하지 않는다.
- 병원 파일 도구는 `WO-O4O-HOSPITAL-PHARMACY-V1-DIRECT-FILE-SELECTION-AND-PRODUCTION-CLOSURE`에서 무로그인 공용 앱으로 확정됐다. 이 명시적 예외와 PC 로컬 파일 선택 조건을 유지한다.
- 기존 참여자 공간과 대표 홈 복귀는 이미 main에 있다. 데이터 이전·자동 승인·DB 변경은 필요 없다.

## 순서별 TODO

- [x] 0. 복원된 클라우드 환경의 DB·API·웹 재기동, 기존 테스트 및 migration 상태 확인.
- [x] 1. 대표 홈: AI 우선, 로그인 전후 전체 탐색, 개인 업무 분리, 5분류, Partner 준비 중 설명, 준비 중 3사업 팝업.
- [x] 2. 약국 협력사업: 상단과 본문 업무 메뉴 중복 제거, 사업명·참여 상태 표시, 승인·사업별 자원 경계 보존.
- [x] 2. 내 매장: 대표 루트의 별도 소개·Home 메뉴 제거 후 내 매장 업무 현황으로 진입, 서비스별 소개 메뉴 제거 후 첫 업무로 진입. 조직·약정·capability 필터 유지.
- [x] 3. 공급자: 승인된 이용자는 기존 업무 화면으로 진입, 신청·심사 상태와 SupplierRoute 유지, 중복 업무 링크 제거.
- [x] 3. 펀딩: 인증 확인 후 목록 조회, 비로그인 로그인 복귀, 소개 배너·단계 설명 제거. 기존 안내 경로·보상 API·데이터 유지.
- [x] 4. 커뮤니티·강의 공개 진입 유지. 강사·운영 메뉴를 기존 권한 필터로 업무군에 묶기.
- [x] 4. 분회: 별도 Home 메뉴·소개 영역 제거, 공지·행사·자료 첫 화면, 회원·운영자 메뉴 유지.
- [x] 4. 기타: 병원 파일 도구의 정본상 공개 예외 기록.
- [x] 5. 문의 배치 소스 확인, 기존 사업별 승인·게시판 경계 회귀 테스트, 공통 메인 복귀 19개 테스트.
- [x] 6. 변경된 5개 앱 빌드와 관련 테스트. 브라우저 검증의 범위·결과는 PR에 기록.
- [ ] 6. push 후 PR required CI와 review 확인.
- [ ] 사용자 main 통합 승인 후 병합·운영 배포 및 실계정 인증 인계 검증.
- [ ] 이전 작업공간 식별·미커밋/미추적/ignored/로컬 커밋 보존 확인 후 삭제 판단. 현 작업공간에서 식별·보존 확인이 불가능하므로 유지.

## 메뉴 소비처 조사

| 설정·화면 | 직접·간접 소비처 | 영향 |
|---|---|---|
| web-store `UNIFIED_STORE_CONFIG` | UnifiedStoreLayout → StoreWorkDashboard/MyStoreShell → StoreSidebar | 내 매장 루트 명칭 변경. 업무 현황·role·capability 유지 |
| web-store `SERVICE_WORK_CONFIGS` | ServiceWorkLayout/ServiceWorkHomePage → 공통 StoreWorkDashboard | 소개 메뉴 제거, 동일 설정의 첫 업무 경로로 replace |
| store-ui-core 메뉴 contract | StoreSidebar, StoreTopBar, MyStoreShell, StoreDashboardLayout, workspace adapters | 수정 없음. 기존 필터·빈 그룹 처리 유지 |
| KPA 업무 메뉴 | KpaGlobalHeader, BusinessWorkspace, MobileBottomNav | 해당 사업 상단 중복만 제거. 모바일 utility와 사업 본문 nav 유지 |
| Neture 업무 메뉴 | NetureGlobalHeader public/contextual nav, ServiceApplyPanel, SupplierRoute | 동일 href 중복 제거, 서버 승인 상태 후 기존 guard 진입 |

## 검증 및 한계

web-neture 전체 396개, KPA business/menu 관련 89개, store 관련 22개, branch 35개, lecture 4개 테스트를 실행했다. 변경 후 펀딩 비로그인 조회 차단·공급자 승인 진입·참여 상태를 focused test로 재검증했다. 5개 앱 build 통과. 변경 파일 lint 오류 0; 기존 dependency/unused-variable 경고는 남아 있다.

PC 1440px·모바일 390px에서 협력사업 메뉴·승인 상태, 분회 콘텐츠 첫 화면, 공개 강의 진입·문의, 내 매장·펀딩 로그인 경계를 확인했다. 브라우저는 로컬 실행 앱과 합성 API fixture를 사용한다. 운영 데이터·실계정 인계·실제 승인 처리는 이 검증의 범위가 아니다. 클라우드 환경 Publish 성공과 운영 코드 배포는 별개다.

## 문서 정합

대표 홈 정본의 화면 미적용 표기는 현재 main·운영 상태에는 유효하며 작업 branch 구현은 PR에서 별도 기록한다. GLOBAL-HEADER의 과거 은퇴 서비스 범위와 SETUP의 일부 사전 빌드 설명 차이는 이번 범위에서 수정하지 않는다.
