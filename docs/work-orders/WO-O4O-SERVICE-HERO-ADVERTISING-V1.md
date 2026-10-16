# 서비스별 슬라이드 Hero · 광고 · 운영자 관리

> **상태**: IMPLEMENTED · 통합 대기 · **작성일**: 2026-10-15 · **최종 갱신**: 2026-10-15

## 승인 범위와 순서

사용자는 서비스별 슬라이드 Hero·광고 영역 및 해당 운영자의 관리 기능을 함께 구현하도록 지시했다. TODO → 문서·코드 규격 정비 → 구현·검증 순서로 진행한다. [AGENTS.md](../../AGENTS.md), [SETUP.md](../../SETUP.md), [공통 모듈 절차](../baseline/O4O-SHARED-MODULE-CHANGE-PROTOCOL-V1.md)를 따른다. 신규 worktree/branch `wo/service-hero-advertising`, 시작 main `7c53af8ca3`.

## 서비스별 TODO

| 영역 | 이용 목적 / 초기 콘텐츠 | 배치 / 관리 경계 |
|---|---|---|
| 대표 Neture | O4O 소개·업무 연결·약국 협력사업 안내 | 기존 주요 업무 진입 보존; Neture 운영자 |
| 공급자 | 상품·콘텐츠와 매장 연결, 공급 업무 소개 | 신청/상태 홈 Hero·업무 안내 이후 홍보; supplier 운영자 |
| 펀딩 | 유통참여형 펀딩 소개·사업 검토·참여 안내 | 회원 홈 Hero·사업 목록 이후 홍보; funding 운영자 |
| 커뮤니티 | 현장 경험·회원 소통·자료 공유 | 홈 Hero·게시 콘텐츠 이후 홍보; community 운영자 |
| CarePharm | 만성질환 관리 약국 협업 안내 | 공개/회원 홈; Neture의 기존 해당 사업 운영 경계 유지 |
| 약국 | 약국 경영지원·사업 소식·회원 소통 | 기존 회원 초기화면 보존; 협력사업별 지정 운영자 (일반 공개 홈은 kpa 운영자) |
| 강의 | 강의 탐색·학습·수강 안내 | 공개 홈 Hero·주요 안내 이후 홍보; 강의 운영자 |
| 분회 | 공지·행사·자료의 지역 회원 연결 | 분회별 홈페이지, 해당 분회 운영자만 관리; 분회 간 공유 금지 |
| 내 매장 | 선택 매장의 실제 업무 처리 | 별도 소개 홈을 만들지 않음; 주문·신청·결제에 광고 제외 |
| 계정센터·관리자·원내 약품 | 계정 관리·관리 업무·원내 파일 업무 | Hero·광고 제외, 새 인증·회원 게이트를 만들지 않음 |

## 실행 TODO

- [x] 현재 서브도메인·소비 화면·기존 CMS 및 운영자 기능 조사
- [x] 기존 데이터 원장과 서비스/분회 권한을 보존하는 노출·관리 규격 정리
- [x] 서비스 성격별 초기 Hero 콘텐츠(최대 3개), 광고와 자체 홍보 구분
- [x] 수동 슬라이드·이전/다음·위치 표시·모바일 스와이프·키보드 조작
- [x] 주요 업무/콘텐츠 다음 공통 광고 영역; 실제 광고 미등록 시 허위 광고를 만들지 않음
- [x] 운영자 문구·이미지·링크·순서·공개 여부·게시 기간·미리보기 관리
- [x] 저장/공개/읽기 오류·동시 수정·서비스 간 권한·분회 격리 검증
- [x] 소비처 빌드·실제 브라우저 desktop/mobile·회귀 테스트·CHECK·commit/push/PR

운영 DB 변경·실광고 등록·병합·배포는 실행하지 않는다. 광고 계약이 없는 초기 콘텐츠는 자체 서비스 안내로 표시한다. 로그인·입력·주문 화면에 홍보를 삽입하지 않는다. 기존 일반 서비스 홈 탐색/회원 소통/업무 진입을 삭제하거나 별도 서비스 가입을 만들지 않는다.

## 노출·저장 규격

`@o4o/types/home-presentation`은 서비스별 이름·목적·초기 문구와 슬라이드/홍보의 제목·설명·이미지·링크·순서·공개·게시 기간을 정의한다. Hero와 홍보 각각 최대 3개이며 기본은 수동 슬라이드다. 초기 홍보는 광고주를 꾸미지 않은 `서비스 안내`다. 실제 광고는 광고주 표시가 필수다.

기존 `cms_contents.metadata`의 예약 section `home-presentation`에 draft/published/revision을 보관한다. CMS Core·스키마·마이그레이션은 변경하지 않으며 일반 콘텐츠 feed에 노출되지 않도록 저장 row의 status는 draft를 유지한다. 전용 공개 read는 공개본의 현재 활성 항목만 반환한다. 편집은 기존 requireAuth와 서비스 scope guard, 분회는 추가 resolveBranch/requireBranchScope를 거친다. 서버 revision 충돌(409)을 제공해 다른 운영자의 변경을 덮어쓰지 않는다. URL은 상대 경로/HTTPS만 허용한다.

현재 supplier/funding/community는 독립 serviceKey·membership·role을 사용한다. 공통 번들이라는 이유로 neture 운영자에게 관리 권한을 합치지 않는다. 약국 협력사업은 기존 `requireOperatorOf`와 사업 조직 ID로 분리한다.

## 구현 결과와 운영 경로

공통 표현은 `packages/shared-space-ui/src/home-presentation`, 순수 데이터/검증은 `packages/types/src/home-presentation.ts`, 저장/조회는 `apps/api-server/src/routes/home-presentation`에 추가했다. 공통 UI가 런타임 검증을 사용하므로 기존 workspace 패키지 `@o4o/types` 의존과 lockfile link만 추가했다. 외부 라이브러리 버전·인프라는 변경하지 않았다.

| 운영 영역 | 화면 |
|---|---|
| Neture · CarePharm | `/operator/home-presentation/neture`의 대상 홈 선택 |
| 공급자 | `/operator/home-presentation/supplier` |
| 펀딩 | `/operator/home-presentation/funding` |
| 커뮤니티 | `/operator/home-presentation/community` |
| 약국 협력사업 | 기본 약국 `/home-presentation`, 그 외 `/businesses/:businessKey/home-presentation` |
| 강의 | `/operator/home-presentation` |
| 분회 | 기존 분회 운영의 홈페이지 설정 안 Hero·광고 편집 |

운영 순서: 문구·선택 이미지 주소·링크·순서·기간 설정 → 미리보기 → 초안 저장 → 공개 반영. 이미지 파일 업로드 기능은 추가하지 않고 기존에 게시할 수 있는 이미지의 주소를 입력한다. 홍보 항목은 최대 3개를 순서대로 보관하고 현재 활성인 첫 항목 하나만 표시한다. Hero는 자동 회전 없이 버튼·키보드·모바일 스와이프로 전환한다. 방문자 화면은 분 단위 재조회와 화면 복귀 재조회로 게시 시작을 반영하고, 종료는 30초 간격으로 재평가한다. 새로고침 시 즉시 현재 서버 판정을 적용한다.

검증 상세·소비처 영향·통합 담당 확인 항목은 [CHECK](../checks/CHECK-O4O-SERVICE-HERO-ADVERTISING-V1.md)에 기록했다. 개발 담당은 commit/push/PR까지 수행하며 병합·배포·운영 검증은 통합 담당에게 인계한다.
