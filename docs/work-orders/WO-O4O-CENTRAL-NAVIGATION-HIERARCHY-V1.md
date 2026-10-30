# WO-O4O-CENTRAL-NAVIGATION-HIERARCHY-V1

> 상태: ACTIVE · 작성일: 2026-10-30 (Asia/Seoul)

## 사용자 결정과 범위

3단계 접이식 메뉴 / 2단계+탭 / 사업 선택기 / 대형 메뉴를 비교한 후 사용자가 구현을 위임했다.
사업 → 업무 분류 → 화면을 기준으로 분류하고 본문 상단의 전체 나열을 없앤다.
약국·공통 운영 32개를 회원·자격 6 / 문의·알림 2 / 상품 7 / 매장·거래 3 / 콘텐츠·포럼 8 / 운영·설정 6으로 분류한다.
기존 메뉴 key·URL·최소 역할·중앙 위임·직접 API guard는 유지한다. 사업 책임을 재정의하지 않는다.
상품명·휴지통 개선 PR #898과 별도 변경이며 main 병합 전까지 수행한다.

## 조사·구현 판단

[역할 V2](../baseline/O4O-ROLE-WORKSPACE-ARCHITECTURE-V2.md),
[공유 모듈 절차](../baseline/O4O-SHARED-MODULE-CHANGE-PROTOCOL-V1.md)를 확인했다.
기존 `CentralOperationsPage`의 본문 nav가 서비스 전체 메뉴를 평면 나열한다.
공유 `STANDARD_GROUPS`는 고정 분류이므로 중앙의 여섯 분류를 넣기 위해 공통 라벨·계약을 바꾸지 않는다.
중앙 전용 표시 분류와 layout을 두고 기존 인증된 메뉴 목록만 받는다. 기존 dialog 접근성 동작을 재사용한다.
분류 함수 하나를 sidebar·홈 바로가기·현재 위치에서 사용한다. 새 메뉴도 분류 fallback으로 사라지지 않는다.

## TODO

- [x] 최신 main 전용 worktree, 정책·원인·전체 메뉴 조사
- [x] 중앙 분류와 누락·중복 census
- [x] 3단계 sidebar, 현재 위치 자동 펼침·현재 화면 강조
- [x] 본문 전체 메뉴 제거, breadcrumb와 관련 상태 탭 유지
- [x] 홈 바로가기 같은 분류, 적은 메뉴 단일 진입
- [x] 모바일 dialog·키보드·직접 URL·권한 회귀
- [x] 테스트·typecheck·build·합성 browser 검증
- [ ] commit·push·PR·CI·Codex 리뷰

## Consumer Impact Matrix

| 소비처 | 사용 여부·영향 | 검증 |
| --- | --- | --- |
| 중앙 admin 통합 운영 | 7개 사업, 표시 구조 변경 | 전체 메뉴 census, 위임·직접 URL·PC/모바일 |
| Neture/KPA/강의 등 기존 서비스 operator | 공통 sidebar·shell 수정 없음 | import/diff 확인 |
| 플랫폼 /admin, store / My Home | 미사용, 경로·메뉴 변경 없음 | 변경 경로 확인 |

운영 계정·데이터 변경 없음. 테스트 계정 기준 파일이 누락되면 합성 검증과 실제 로그인 미검증을 구분한다.

## 검증 결과

- 중앙 layout·전체 menu census·directory·실제 page 위임·현재 위치·대기 현황·알림 회귀 28건 통과.
- admin TypeScript·Vite build, 변경 소스 lint 통과.
- 합성 browser 1440/390px: 현재 사업·분류 자동 펼침, 다른 업무 이동, 모바일 Escape 닫기·포커스 복귀,
  메뉴 선택 후 닫기, desktop resize 시 dialog·scroll lock 정리, 단일 업무 직행, 미위임 사업 미노출,
  body 가로 넘침·pageerror 없음. 실제 로그인·운영 데이터 조작 없음.
- 테스트 계정 기준 파일은 전용·기준 worktree 모두 누락됐다. 실제 계정 로그인 검증은 미확인이다.
- main 병합·배포 없음. PR CI·리뷰 결과는 PR에서 확인한다.

문서 정합: 기존 menu SSOT의 권한 분류와 이번 중앙 화면의 표시 분류를 구분한다.
