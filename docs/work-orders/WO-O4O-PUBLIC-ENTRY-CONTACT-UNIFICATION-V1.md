# 전체 서비스 공개 진입·문의·운영 알림 통합 정비

> **상태**: COMPLETED · 개발 검증·push 인계 완료; main 통합·배포 제외 · **작성일**: 2026-10-21
> **근거**: 사용자 승인 — TODO 작성 → 코드·문서 검증 → 개발·검증 → commit·push. PR·병합·배포·운영 데이터 변경 제외.
> **정본**: [서비스 탐색](../baseline/O4O-HOME-SERVICE-DISCOVERY-V1.md), [인증·서비스 가입](../baseline/O4O-NETURE-AUTH-AND-SERVICE-MEMBERSHIP-V1.md), [역할별 업무공간](../baseline/O4O-ROLE-WORKSPACE-ARCHITECTURE-V1.md), [공통 모듈 변경](../baseline/O4O-SHARED-MODULE-CHANGE-PROTOCOL-V1.md)

## TODO

- [x] 최신 main·서비스별 진입/문의/운영 역할/알림 소비처와 문서 대조
- [x] 공개 소개·문의와 보호된 개인/조직 업무의 공통 정책 문서화
- [x] 공통 공개 화면·문의 UI 구성, 비로그인 강제 로그인 제거
- [x] 모든 서비스 공개 진입과 가입 상태별 실제 업무 진입/운영 메뉴 정합
- [x] 서비스별 문의 원장·담당 운영자·문의함·알림 연결
- [x] 접수 확인과 운영자 답변 구분, 발송 실패·재처리·이력 처리
- [x] 비로그인·미가입·대기·활성·운영자·다른 서비스 권한 회귀 검증
- [x] 영향받은 앱 빌드·데스크톱/모바일 브라우저 검증
- [x] 문서 정합·민감정보·변경 범위 확인, commit·push 후 인계

## 구현 경계

공개 페이지는 서비스 소개·공개 콘텐츠·이용 절차·FAQ·Contact Us를 제공한다. 실제 회원 자료·매장·공급자 주문/매출은 기존 서버 권한 검사를 유지한다. 역할 지정으로 개인/사업자 소유권을 만들지 않는다. 서비스 가입과 로그인은 분리한다.
기존 문의 원장·알림·공통 UI를 우선 재사용한다. 기존 문의는 이동/삭제하지 않는다. 새 API·데이터 구조가 필요한 경우 코드/검증과 운영 적용을 구분한다. 운영 문의 제출·외부 메일 발송·운영 DB 변경은 이번 작업에서 하지 않는다.
원내 약품 도구의 무로그인/로컬 파일 사용 경계, 내 매장 보호 업무 공간, Partner 준비 중 정책을 보존한다. 개별 협동조합 업무는 담당 작업과 충돌 없이 공개 소개·문의 연결만 적용한다.

## 코드·문서 기준선

시작 SHA: `e09db6eb4b`.

| 서비스 | 확인된 진입/문의 문제 | 정비 방향 |
|---|---|---|
| 메인 | 공개 첫 화면·Neture 문의 있음 | 기존 공개 탐색·기존 문의 보존 |
| 공급자·펀딩 | root에서 로그인 강제, 문의가 Neture로 합쳐짐 | 공개 소개·서비스별 문의/운영함 |
| 약국 경영지원·MegaPharm | 사업 shell이 비로그인 root를 차단 | 공개 소개와 업무 진입 분리 |
| CarePharm | 공개 소개 있음, 문의 서비스 범위 확인 필요 | 기존 소개 재사용·문의 범위 보완 |
| Community | 공개 콘텐츠 있음, 문의 Neture로 합쳐짐 | 콘텐츠 유지·서비스별 문의/운영함 |
| Lecture | 공개 강의·문의·운영함 존재 | 공통 기능 회귀·답변/알림 정합 |
| 약사회 분회 | 공개 directory 있음 | 공개 문의·담당 서비스 운영 연결 |
| 협동조합 | 공개 directory 있음 | 조합 업무 유지·서비스 공통 문의 연결 |
| 내 매장 | 보호된 조직 업무 공간 | 비로그인 안내·공개 문의 진입, 보호 유지 |
| 원내 약품 | 무로그인 파일 도구 | 기존 사용 유지·문의 연결 |
| Partner | 준비 중 소개 | 기존 소개·문의 유지 |

## 구현 결과

- 공통 `PublicServiceEntry` / `PublicServiceContact` / `ServiceContactInboxLink`와 명시적 문의 서비스 목록을 사용한다. 공급자·펀딩·약국/MegaPharm의 비로그인 첫 화면에서 로그인 강제를 제거했다. 기존 커뮤니티·강의·CarePharm 공개 콘텐츠 및 다른 서비스의 공개 directory는 유지했다.
- 공급자 운영자에게 사업자 대시보드 메뉴를 제공하지 않는다. 공급자 역할을 함께 가진 계정은 기존 사업자 업무 진입을 유지한다. 공급자 운영자만 있는 계정은 운영 관리로 진입한다.
- 신규 문의는 기존 `contact_inquiries`를 서비스 키로 분리한다. 이전 Neture/KPA 문의는 원래 원장·권한·경로에 유지하고 이전 문의 링크로 연결한다. 새로운 migration, dependency, lockfile, workflow 변경은 없다.
- 운영자 본인·유효한 역할/기간·계정·membership을 확인한다. 협력사업의 기존 명시적 Neture 운영자 배정도 존중하고, 배정 해제·다른 사업은 차단한다. 조회·답변·알림에 동일한 서비스 범위를 적용한다.
- 약사회 분회 공통 directory의 서비스 안내 문의는 `kpa-branch:admin`이 처리한다. 개별 분회 운영자 전체에게 문의를 배포하지 않으며 분회별 tenant 계약은 바꾸지 않는다. 협동조합 문의는 연합회 서비스 안내 범위이며 개별 조합 역할/가입은 변경하지 않는다.
- 내 매장·원내 약품 일반 문의의 담당자는 Neture 운영자다. 원래 문의 서비스 키는 보존하고 알림은 담당자의 Neture 채널로 전달한다. 담당자 미설정 시 중앙 운영자에게 지정 필요 사실만 알리고 다른 서비스 문의 본문은 공유하지 않는다.
- 새 문의 수는 서비스별 보호 API에서 조회하고 30초·창 복귀 시 갱신한다. 실제 알림과 접수 건수는 구분한다. 계정·서비스 변경 시 이전 문의·건수·답변을 표시하지 않는다.
- 접수 확인 자동 회신과 실제 답변 발송은 별개다. 답변은 문의에 저장된 이메일로만 발송한다. 요청 식별자·원장 row lock으로 동일/동시 답변의 중복 발송을 방지한다. 실패/결과 미확인은 완료로 표시하지 않고 이력을 확인하게 한다. 성공한 이메일·접수 확인 채널은 접수 알림 재처리에서 재발송하지 않는다.
- 답변 시도·결과·본문은 기존 `action_logs`의 서비스 범위에 기록한다. 새 테이블은 만들지 않는다. 기존 감사기록 1년 보존 정책을 따르며 영구 보존을 약속하지 않는다. 메일 발송 뒤 기록 실패 시 자동 재발송하지 않고 결과 미확인 상태로 둔다.

## 검증 결과 (2026-10-21 UTC)

- 공통 공개 UI 17개, 공통 문의/담당 사업 workflow 20개, Neture 132개, 약국 22개, 분회 2개, 협동조합 15개, 강의 2개 = 프런트엔드 210개 통과.
- API 단위 4개·로컬 PostgreSQL 통합 9개 = 13개 통과. 13개 지원 문의 키의 저장, 운영자 유효기간/정지/다른 서비스 차단, 분회 tenant 분리, 기존 사업 배정, 중앙 알림의 개인정보 미노출, 답변 동시성·실패·이력을 검증했다.
- PostgreSQL 검사는 `/workspace` 로컬 socket·별도 임시 schema에서만 실행했다. 종료 후 schema를 완전히 삭제했고 잔존 0개를 확인했다. 메일·알림 외부 발송은 fixture로 대체했다.
- API 및 Neture·약국·내 매장·강의·분회·협동조합·원내 약품·계정·관리자 앱 빌드 통과. 실제 root package/filter 이름을 사용했다.
- Chromium 로컬 빌드 검사: 메인·공급자·펀딩·약국·MegaPharm·CarePharm·커뮤니티·강의·분회·협동조합·내 매장·원내 약품의 12개 진입을 1440px/390px에서 검사해 24개 통과했다. 첫 화면 강제 로그인 없음, 공개 문의 링크, 동의 후 올바른 서비스 API 접수·접수번호 표시, JavaScript 오류·가로 넘침 없음을 확인했다.
- 공급자 운영자 문의함은 1440px/390px에서 2개 통과했다. 사업자 대시보드 링크 미노출, 새 문의 건수, 문의 열기→답변→단일 발송→답변 완료 상태를 확인했다.
- 브라우저는 합성 계정·API 응답을 사용하고 모든 외부 요청을 차단했다. 실제 HTTP 권한·DB 저장·메일 실패/중복 처리는 별도 PostgreSQL 통합 테스트로 검증했다. 운영 배포·실계정 Google 인증·실제 SMTP 수신은 검사하지 않았다.
- 최종 합계: 테스트 223개, API+웹 앱 9개 빌드, 브라우저 26개 통과. `git diff --check`와 `node scripts/check-doc-sensitive.mjs` 통과. dependency·lockfile·workflow·migration 변경 0개.
- 마지막 `origin/main` 확인: `5c6150a6b0`. 시작 이후 main 변경 35개 파일과 이번 작업 경로의 중복 0개. 개발 branch에 main을 자동 병합하지 않았다.

### 재검증 진입점

의존성 설치·공통 패키지 선행 빌드는 [SETUP.md](../../SETUP.md)를 따른다. 프런트엔드 테스트는 repository root에서 `pnpm exec vitest run --config <앱 또는 패키지>/vitest.config.mjs <대상 테스트 경로>`로 실행한다. Neture의 서비스 문의 검사 경로는 `services/web-neture/src/pages/operator/__tests__/ServiceContactPage.test.tsx`다.

API 검사는 격리된 로컬 PostgreSQL socket을 `CONTACT_REVIEW_PG_SOCKET`에 지정하고 `pnpm --filter @o4o/api-server exec jest --runInBand --runTestsByPath src/modules/contact-inquiry/__tests__/contact-flow.postgres.spec.ts src/modules/contact-inquiry/__tests__/contact-reply.service.spec.ts`로 실행한다. socket 변수가 없으면 DB 통합 검사는 skip되므로 이를 통과로 보고하지 않는다.

## 통합 담당 인계

종료 범위는 commit·push다. PR·병합·CI 운영·배포·운영 DB 변경·운영 문의 제출·실제 메일 발송은 하지 않는다. 통합 담당은 현재 main과 충돌 여부, 서비스별 담당자와 메일 설정, 실제 Google 운영자 로그인·운영 문의 접수/수신/답변을 별도로 확인한다.

문서 정합: 사용자 승인에 따라 공개 진입·문의 기준을 두 canonical 문서에 반영했다. 서비스 탐색 §5의 이전 로그인 필수·소개 화면/문의 금지 표를 새 기준으로 교체하고 회원 초기화면의 소개 Home 금지와 비로그인 공개 안내를 구분했다. 기존 가입/승인·조직·역할·무로그인 도구 계약은 유지한다. 운영 배포 완료로 표시하지 않는다.


## Git·작업공간 상태

- 작업 branch: `wo/public-entry-contact-unification`
- 구현 commit: `eedb8556b8b3f67829f7e312aeedeedc82449adb`. 작업 branch push 후 `git ls-remote --heads`로 원격 SHA 일치를 확인했다. 이 완료 기록은 같은 branch의 후속 문서 commit으로 인계한다.
- 작업공간: `/workspace/o4o-wt/public-entry-contact-unification`
- 시작 main: `e09db6eb4b`; 현재 작업은 독립 worktree 안에서만 수행했다.
- main 통합·PR CI·배포: 미실행. 개발 범위는 commit·push 후 인계다.
- 작업공간 판정: **KEEP** — 아직 main에 병합되지 않은 개발 branch이며 후속 통합·수정에 필요하다. 기준 checkout과 다른 세션 작업공간은 변경·정리하지 않았다.


## 사용자 추가 승인 — main 통합·배포 (2026-10-21 KST)

사용자가 이 공간에 `main으로 통합 -> 배포`를 지시했다. 위 개발 종료 기록은 당시 범위로 보존하고, 같은 WO·branch의 후속 통합 단계로 PR·CI·리뷰·병합·현재 Delivery 정책에 따른 배포와 운영 공개 화면 검증을 수행한다. 신규 migration·DB backfill·계정/메일 설정 변경은 포함하지 않는다.

- [x] 원격 branch/HEAD·main ruleset·기존 PR·현재 배포 경로 확인
- [x] 최신 main `ac38af8df1`을 작업 branch에 병합 (공통 export 자동 병합, 충돌 0)
- [ ] 통합 후 focused 검증·PR CI·현재 HEAD Codex 리뷰 확인
- [ ] 기술 gate 충족 후 PR 병합·post-merge CI 확인
- [ ] Delivery/promote 배포·serving SHA·공개 화면·API 보호 경계 확인
- [ ] 검증 한계·문서 정합·작업공간 정리 기록 후 종료
