# CHECK-O4O-SERVICE-HEADER-ACCOUNT-DISPLAY-V1

> **진행 현황 안내 (2026-10-30)**: 이름+계정 메뉴 변경은 PR #695(`5abc453695`)로 main에 반영됐다. 아래 「이 CHECK는 main 병합 성공을 주장하지 않는다」는 개발 당시의 증거 범위다. 후속 [관리자 정비 CHECK](CHECK-O4O-ADMIN-PLATFORM-MENU-ROLE-CLEANUP-V1.md)의 2026-10-21 누적 main 배포 기록을 참조한다. 이 문서의 합성 브라우저 결과는 실제 Google 로그인 검증이 아니다.
> 전체 경과와 남은 확인은 [디자인 정비 진행 현황](../guides/O4O-PUBLIC-DESIGN-PROGRESS-V1.md)을 참조한다. 아래 기존 본문·수치·실행일은 과거 회차 기록으로 보존한다.

> 상태: ACTIVE · 검증일: 2026-10-18 · 범위: 로그인 서비스의 계정 표시
> 작업서: [WO](../work-orders/WO-O4O-SERVICE-HEADER-ACCOUNT-DISPLAY-V1.md) · 기준: [Global Header](../architecture/ui/GLOBAL-HEADER-STANDARD-V1.md)

## 결과

대표 메인 코드는 유지했다. CarePharm·공급자·펀딩·커뮤니티·약국·강의·매장·분회(공용/개별) 헤더에 이름+계정 메뉴 하나를 적용했다. Demo 안내는 계정 메뉴 안에 보존했다. 기존 역할별 업무 항목, 내 정보 링크와 로그아웃 함수를 그대로 연결했다. 모바일 하단 프로필을 쓰는 Neture/약국은 그 단일 진입을 유지한다. 계정이 없는 병원약국 파일 도구와 userId만 제공하는 협동조합 구조 미리보기에는 이름을 만들어 넣지 않았다.

ServiceAccountMenu는 표시만 담당한다. 공통 GlobalHeader에는 accountSlot을 추가하여 기존 다른 소비처의 기본 동작을 유지한다. 계정 변경 시 key로 메뉴를 초기화하고, 경로 변경·Escape·외부 클릭·메뉴 이동 시 닫는다. 새 의존성·manifest·lockfile·인증/가입/권한 정책·API·schema/migration 변경은 없다.

## 검증

| 검사 | 결과 |
|---|---|
| Neture 전체 Vitest | 128 files / 1,132 tests PASS |
| KPA-Society 전체 Vitest | 24 files / 167 tests PASS |
| Lecture 전체 Vitest | 10 files / 41 tests PASS |
| Store 전체 Vitest | 57 files / 649 tests PASS |
| KPA-Branch 전체 Vitest | 5 files / 39 tests PASS |
| auth-react 전체 Vitest | 20 files / 232 tests PASS |
| ui 전체 Vitest | 3 files / 33 tests PASS |
| 위 웹 5개 TypeScript + production build | PASS |
| 변경 TS/TSX root flat ESLint | 오류·경고 0 |
| 문서 민감정보 검사·git diff --check | PASS |

전체 회귀 합계 2,293 tests. 새 상호작용 테스트는 이름 trigger, 메뉴 안 Demo 안내, 기존 업무 링크, Escape focus 복구, 외부 클릭, 경로 이동, 로그아웃 1회를 확인한다. Neture host profile 5개와 대표 메인 회귀도 포함한다.

Chromium으로 실제 production build를 열고 API를 합성 fixture로 대체했다. 대표 홈·CarePharm·공급자·펀딩·커뮤니티·약국·강의·매장·분회 공용·개별 화면을 1440px/390px에서 총 20건 검증했다. 계정 진입 1개, PC 표시 이름, 메뉴 이름/이메일, 닫기, 가로 overflow 0, pageerror 0, API write 0을 확인했다. 외부 글꼴 요청은 차단했다. 분회의 /kpa/assets 별칭은 기존 Docker 서빙 계약에 맞춰 preview에서 재현했다.

약국 첫 fixture에 운영자 역할을 넣어 운영자 대시보드로 이동했으나 그 응답에 kpis가 없어 실패했다. 실제 오류는 fixture 누락이었다. 일반 회원의 공개 화면 fixture로 정합 후 브라우저 검증을 통과했다. 실계정 로그인·운영 데이터 write를 수행한 검증은 아니다.

## 반영 경계

이 변경은 wo/service-header-account-display에서 개발·검증 후 push한다. 이 CHECK는 새 헤더 변경의 PR CI·main 병합·운영 배포 성공을 주장하지 않는다.

앞선 운영자 조치 경계 PR #687은 별도 변경이다. main 48f84fb776d4c9123408f67cebb7d51c583f15e6의 CI와 [Promote](https://github.com/Renagang21/o4o-platform/actions/runs/39081352123)가 성공했으며 production 상태는 DEPLOYED(api,admin,neture,kpa-society,lecture,store)다. API readiness와 대표/Study/Funding/약국/Store 공개 URL HTTP 200을 재확인했다. 새 헤더 변경이 그 배포에 포함됐다고 보고하지 않는다.

## 통합 준비 (2026-10-18)

최신 main ee263cfd93a996ced1e9e009a463cd74ef6d32b1을 작업 branch에 merge했다. 강의 SiteShell의 충돌은 로그인 후 이름 계정 메뉴와 로그인 전 신규 회원가입 링크를 함께 보존하는 것으로 해결했다. 공통 헤더의 현재 메뉴 재선택 닫기와 CarePharm 홈 정비, 분회 가입 링크도 보존했다. 강의·분회 헤더 집중 회귀 5 tests가 통과했다. 배포 여부는 이 준비 기록이 아닌 대상 main SHA의 CI/Delivery/Promote 실제 결과로 판정한다.

### PR #695 접근성 리뷰 보완

ARIA menu의 화살표 키·menuitem 계약을 선언하는 대신 기본 링크/버튼을 쓰는 일반 펼침 영역으로 수정했다. trigger는 aria-expanded/aria-controls로 연결하고 panel은 이름 있는 region으로 제공한다. Tab은 기본 문서 순서를 사용하며 Escape focus 복구·외부 클릭 닫기는 유지한다. 관련 공통/Neture/분회 10 tests가 통과했다.

### SonarCloud 지적 보완

일반 컨테이너의 클릭 위임을 제거했다. 경로의 key 변경을 함께 감지하여 같은 목적지 재선택도 닫히도록 하고 해당 회귀를 추가했다. panel은 이름 있는 section, 상태 안내는 output으로 표현했다. props readonly와 중첩 삼항식도 정리했다. 집중 9 tests와 변경 lint가 통과했다. 비필수 검사라도 이번 변경에서 발견한 신뢰성 실패를 숨기지 않고 수정했다.
