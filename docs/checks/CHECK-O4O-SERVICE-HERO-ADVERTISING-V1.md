# 서비스별 Hero · 광고 · 운영자 관리 검증

> **작성일**: 2026-10-15 · **상태**: 개발 검증 완료, 통합·운영 검증 대기
> WO: [WO-O4O-SERVICE-HERO-ADVERTISING-V1](../work-orders/WO-O4O-SERVICE-HERO-ADVERTISING-V1.md)

## 결과

8개 표현 영역에 서비스별 초기 안내, 수동 슬라이드 Hero, 주요 콘텐츠 다음 홍보 영역을 연결했다. 실제 광고가 등록되기 전에는 `서비스 안내`를 표시한다. 운영자는 자기 서비스·담당 사업·분회 안에서 초안/공개본을 관리한다. 저장 공간은 기존 CMS metadata이며 DB migration은 없다. 현행 정본·CMS Core·기존 인증/업무 처리는 변경하지 않았다.

기존 서비스 루트가 로그인·가입 상태를 처리하는 경계이면 그대로 유지했다. 공급자 신청/상태 진입은 기존 승인 후 업무 공간 이동을 보존한다. 대표 Neture의 AI·개인 업무 진입 순서도 보존했다. 내 매장·주문·계정·관리자·원내 업무에는 광고를 삽입하지 않았다. 기존 홈페이지 CMS 편집기는 유지하며 새 구성은 별도 section으로 분리했다.

## 자동 검증

| 검사 | 결과 |
|---|---|
| Node / pnpm / npm | 22.18.0 / 10.25.0 / 10.9.3 |
| frozen offline install / `build:packages` | PASS |
| Neture 전체 | 104 files / 987 tests PASS |
| 약국 전체 | 19 files / 150 tests PASS |
| 분회 전체 | 5 files / 39 tests PASS |
| 강의 전체 | 10 files / 40 tests PASS |
| 공통 UI 전체 | 11 files / 118 tests PASS (신규 계약·편집·조회 25개 포함) |
| API 신규 라우트 + 기존 scope/lecture/crossservice 보안 회귀 | 4 suites / 57 tests PASS |
| PostgreSQL 15 실제 저장 통합 | 1 suite / 10 tests PASS |
| 네 프론트엔드 production build | PASS |
| API type-check / production build | PASS |
| 변경 TS/TSX lint | error 0; 기존 소비 파일의 경고 4개 유지 |
| unsafe-routes / TypeORM entity 검사 | PASS |
| diff whitespace | PASS |

신규 공통 테스트는 기존 shared-space-ui Vitest CI include에 포함된다. PostgreSQL 검증은 별도 옵트인이다. `O4O_HOME_PRESENTATION_PG_TEST=1`과 `O4O_HOME_PRESENTATION_PG_PASSWORD`를 설정한 격리된 로컬 테스트 DB에서 `home-presentation.postgres.spec.ts`를 실행한다. 테스트가 임의 이름의 전용 schema를 만들고 자기 schema만 제거한다. 환경을 명시하지 않은 일반 CI에서는 이 10개만 skip되며 UI/라우트 검증은 실행된다. 비밀번호는 기록하지 않는다.

PG 검증 항목: 초안 비공개, 공개 snapshot과 이후 초안 분리, 서비스·조직 격리, 비활성/미래/종료 필터, revision 충돌, 최초 동시 저장 직렬화, 잘못된 링크/광고주 누락 거부, 숨김 공개. API 라우트 검증은 기존 인증·권한 guard를 테스트 adapter로 대체해 어떤 guard와 scope가 연결되는지 검증하고, 기존 실제 guard 회귀 suite를 함께 실행했다.

## 브라우저

Chromium에서 실제 공통 컴포넌트·편집기와 실제 저장 서비스를 사용했다. 전용 로컬 PostgreSQL 15 DB만 쓰고 운영 DB·실계정은 사용하지 않았다. 서비스 로그인/기존 게시물/업무 데이터는 합성 경계이며, 전체 운영 앱의 인증부터 배포까지 검증했다는 뜻이 아니다.

- 8개 서비스 표현 × 1440/390/320px = 24개 화면: 이전/다음·키보드 전환·가로 넘침 없음.
- 실제 강의·분회·커뮤니티 홈 소스 3개를 합성 데이터 경계에서 390px로 추가 표시: 기존 콘텐츠와 새 Hero/홍보 확인.
- 8개 scope: 편집 → 초안 저장 → 방문자 비공개 확인 → 공개 반영 → 방문자 표시 → 편집기 재접속 후 영속성 확인.
- 운영자 두 탭의 stale revision 409와 입력 보존.
- 광고주 누락 거부, 광고/광고주 표시, 미래 게시 비노출, 전체 홍보 숨김, 다른 분회 설정 격리.
- 편집기 1440/390/320px 가로 넘침 없음, 터치 pointer의 수평 스와이프 전환.
- 최종 시나리오의 브라우저 page error 0. 기간 재조회/종료 재평가는 fake timer 단위 테스트와 서버 실제 기간 필터로 보강했다.

원본 브라우저 증거는 이 환경의 `/tmp/o4o-hero-browser`에 있다. 이 임시 fixture는 제품 코드나 배포 설정이 아니며 PR에 포함하지 않는다. 실제 운영 로그인·광고 계약·이미지 파일 업로드·CDN 전파·운영 배포 검증은 미수행이다.

## Consumer Impact Matrix

| 소비처 | 사용 여부 / 변경 영향 | route/role/capability 영향 | 검증 방식 | 결과 |
|---|---|---|---|---|
| Neture 대표 홈 | 사용 / AI·업무 진입 뒤 Hero, 콘텐츠 뒤 홍보 | 기존 Neture guard 안 관리 메뉴 | 전체 테스트·빌드·공통 브라우저 | PASS |
| 공급자 | 사용 / 신청·상태 홈에 추가 | supplier operator + active membership 유지 | 역할/진입 회귀·빌드·공통 브라우저 | PASS |
| 펀딩 | 사용 / 현행 사업 목록 진입 보존 | funding operator + membership 유지 | 역할/진입 회귀·빌드·공통 브라우저 | PASS |
| 커뮤니티 | 사용 / 회원 커뮤니티 목록 유지 | community operator + membership 유지 | 회귀·빌드·실제 홈 브라우저 | PASS |
| CarePharm | 사용 / 첫 제목·참여 경계 유지 | Neture 사업 관리 경계 유지 | 조회/재시도 회귀·빌드·공통 브라우저 | PASS |
| 약국 협력사업 | 사용 / 기존 회원 홈·업무 바로가기 유지 | 조직 ID·사업 지정 operator; 사용자 제공 조직 ID 불신 | 전체 테스트·빌드·API/PG·공통 브라우저 | PASS |
| 강의 | 사용 / 기존 강의·내 학습 CTA 유지 | 기존 lecture guard 안 관리 메뉴 | 전체 테스트·빌드·실제 홈 브라우저 | PASS |
| 분회 | 사용 / 실제 분회 제목과 목록 유지 | 기존 branch service·branch membership guard + 공개 홈페이지 확인 | 전체 테스트·빌드·PG 격리·실제 홈 브라우저 | PASS |
| 내 매장 / 계정 / admin / 원내 | 새 표현 미사용 / 기존 화면 변경 없음 | 신규 관리 역할·광고 진입 없음 | import/route 소비처 조사 | 영향 없음 |
| 은퇴 서비스 | 미사용 | 복구·확장 없음 | 현행 정본/라우트 조사 | 영향 없음 |
| 공통 types / shared-space-ui | 추가 export / 기존 API 제거 없음 | 타입·순수 검증·표현 및 편집기 추가 | 패키지 빌드·118 tests·소비 앱 빌드 | PASS |
| CMS Core / extension | 직접 수정 없음 | 기존 CMS metadata section만 사용; 일반 feed 비공개 | 실제 PG 저장 및 scope 테스트 | PASS |

공통 운영자 registry는 기존 항목 뒤에 새 경로를 추가해 첫 항목으로 계산하는 기본 업무 진입이 바뀌지 않도록 했다. 기존 메뉴 기대값은 실제 새 메뉴를 포함하도록 갱신하고, 기존 권한 거부·주요 업무 링크 검증은 유지했다.

## 통합 인계

전용 worktree `/workspace/o4o-wt/service-hero-advertising`, branch `wo/service-hero-advertising`, 시작 main `7c53af8ca3`. 다른 세션의 작업은 수정하지 않았다. push 전 origin/main은 `e6202355af`로 7 commit 진행됐고, 변경 경로가 이번 작업과 겹치지 않음을 확인했다. 자동 rebase/merge는 수행하지 않았다. 통합 담당은 PR의 최신 CI/리뷰를 확인한 뒤 순차 병합·배포하고, 실제 각 운영자 계정으로 메뉴 접근, 잘못된 서비스/분회 접근 거부, 초안 비노출, 공개/기간/숨김, 이미지·링크, 모바일 및 주요 업무 진입을 운영에서 확인한다.

문서 정합: 이 작업의 WO·CHECK 추가. 현행 canonical과 index 판정은 변경하지 않았다. 운영 반영 후의 결과 기록은 통합 담당 후속 작업이다.

```text
WORKTREE_DISPOSITION
worktree: /workspace/o4o-wt/service-hero-advertising
branch: wo/service-hero-advertising
base: 7c53af8ca3
main integration: 미수행 / deployment: 미수행 / production smoke: 미수행
other session usage: 없음 / verdict: KEEP (PR 후속 검토·수정용)
```


## 통합 리뷰 후속 (2026-10-16 KST)

최신 main df5f28a와 #631 전체 이력을 통합한 전용 branch에서 P1 두 건을 보완했다. home-presentation metadata section은 revision-checked 전용 API가 소유한다. 옛 Neture 홈페이지 목록·수정·상태·삭제 SQL은 reserved row를 제외하고, 예약 section의 신규/변경 입력을 거절한다. 일반 CMS 목록·집계·상세에서도 제외하며 일반 생성·수정·상태 변경과 중앙 transition 서비스로 우회하지 못한다. Frozen Core·schema는 바꾸지 않았다. 실제 PG 검사에서 확인한 TypeORM UPDATE/DELETE의 [rows,affected] 결과도 정규화해 미변경을 정확한 404로 반환한다.

대표 홈의 비로그인 Hero를 AI 입력 다음에 배치해 canonical AI 우선 순서를 유지했다. 기존 권한·가입·업무 실행 조건은 바꾸지 않았다.

- CMS 관련5 suite143 PASS, 홈 표현 route 포함 focused3 suite84 PASS(서로 중복 포함하므로 합산하지 않음). API 타입·production build PASS.
- 격리 PostgreSQL15 실제 저장11 PASS: reserved row의 목록 제외·publish/delete 무변경, ordinary row의 기존 publish/delete 유지, draft/public revision 유지. 테스트 schema0 확인, 컨테이너 제거 완료.
- Neture 전체1020 PASS(실제 Hero 앞에 AI composer가 오는 회귀 포함), shared-space-ui 전체118 PASS, Neture production build PASS.
- 실제 대표 홈·빌드 CSS와 합성 인증/공개 응답으로 Chromium PC1440x900/mobile390x844/짧은390x480의3 viewport에서 AI 입력이 첫 viewport에 보이고 Hero보다 앞에 있는지 확인했다. pageerror0·외부 write0·문서 가로 overflow0. 소식은 합성 빈 응답에 대한 실패 안내이며 실제 소식 API 성공 검증이 아니다. screenshot3장·측정 JSON은 /tmp에 보관했다. 임시 서버·symlink 정리 완료.
- 원개발의 다른 소비 앱 build·30 browser 기록은 앞 절에 보존하며 이번에 전체 재실행한 것으로 보고하지 않는다. 실제 계정·운영 DB write·메일·배포는 미실행이다. 최종 CI·Sonar·Codex·최신 main 정렬은 후속 판정이다.
