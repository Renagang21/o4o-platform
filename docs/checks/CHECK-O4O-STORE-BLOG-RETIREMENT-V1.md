# Store 블로그 관리 기능 제거

> **상태**: COMPLETED — 개발·main 통합·Store 운영 배포 완료. 실계정 운영 화면 검증은 별도.
> **작성일**: 2026-10-26 (Asia/Seoul)
> **근거**: 사용자의 Store 블로그 기능 불필요 판정 및 제거 지시
> **기준**: origin/main `59abadb4b2e61e2a1a277a8162f6cdd4f7e5e297`

## 범위와 결과

`web-store blog-workflow` 안정화 대신 해당 Store 블로그 기능을 제거한다.

- 작성·편집·발행·설정 화면, 블로그 제공자료 가져오기 화면, Store 전용 API 클라이언트와 전용 테스트 삭제.
- Store 메뉴·업무 더보기·자료 출처·제작 카탈로그·블로그 템플릿 3종·CarePharm 제작 도구에서 진입 제거.
- QR 자료 선택기의 블로그 조회·선택·공개 URL 생성 제거. 다국어·일반 콘텐츠·기존 QR 공개 해석은 유지.
- `/store/content/blog`, `/store/library/blog`와 서비스 지정 관리 경로는 해당 문맥의 내 자료함으로 이동.
- 채널 관리에서 블로그 열기·복사를 제거하고 QR 안내로 대체. 태블릿의 주소 변경은 유지.
- 기존 제작자료의 알려진 블로그 분류를 비우는 편집 호환성은 유지. 임의의 기존 분류는 변경하지 않는다.
- 삭제 파일을 읽던 API 서버 소스 계약 테스트 3개를 현재 소비처에 맞춰 갱신.

## Shared Module Change Verification

### Changed shared module

공유 패키지 구현·계약은 변경하지 않는다. Store 로컬 메뉴·제작 카탈로그·자산 선택기는 Store 공통/서비스 지정 화면에서 공유하므로 모든 연결을 조사했다.

### Consumer impact matrix

| 소비처 | 영향 | 확인 |
|---|---|---|
| Store 공통 `/store` | 블로그 관리·제작·가져오기 제거 | 전체 Store 테스트·빌드, 데스크톱/모바일 브라우저 |
| Store 서비스 지정 `/work/kpa-society/store` | 같은 메뉴 및 제작 카탈로그 적용 | 기존 양쪽 문맥 테스트, 관리 URL 브라우저 |
| Store CarePharm 도구 | 블로그 제작 링크·설명 제거 | 기존 도구 테스트 |
| API 서버 소스 계약 | 삭제 파일을 읽는 목록 갱신 | Jest 3개 suite |
| Pharmacy/Mega 공개 블로그 및 서버 API | 변경 없음 | 역방향 코드 검색: 별도 소비처 확인 |
| Neture/Admin/Coop/Branch/Lecture, 공통 UI | 구현·권한·계약 변경 없음 | 수정 경로·리터럴 소비처 조사 |

### Route / role / capability check

- 블로그 실화면·API 클라이언트·새 QR 대상 생산 경로를 함께 제거. 메뉴만 숨기지 않았다.
- 예전 관리 URL은 redirect 호환만 유지한다. 기존 인증·매장 선택·계약 gate는 유지한다.
- 서버 API, 권한·가입 기준, 공유 ProductionTarget 타입, 게시판·공지·협업 자료는 변경하지 않았다.
- 블로그 데이터 테이블·엔티티·기존 migration·계정 삭제/보존 계약을 변경하지 않았다.

### Smoke result

격리된 localhost Vite와 합성 계정/API fixture만 사용했다. 실제 로그인·운영 DB·운영 업무 데이터 쓰기는 없다.

- 1440px / 390px 각각 관리 URL 3종의 자료함 이동 확인: 6개 PASS.
- 두 폭의 실제 업무 메뉴에서 블로그 없음·POP 유지, 블로그 API 호출 0·pageerror 0 확인: 2개 PASS.
- 실제 운영 브라우저 검증·배포는 미실행.

## 기능 제거와 데이터/공통 서버의 경계

이번 결과는 **Store 블로그 관리 기능 제거**다. 플랫폼 전체 블로그의 완전 폐기가 아니다.

Pharmacy 앱에는 `StoreBlogPage`·`StoreBlogPostPage` 공개 화면이 있고 서버 `blog.controller`·`operator-blog.controller`, `store-blog.service`, 공통 블로그 UI 및 저장 원장을 사용한다. 이 소비처를 임의로 제거하지 않는다. 기존 공개 링크와 이미 발급된 QR도 이번 변경으로 폐쇄하지 않는다. 공통 서버·공개 화면까지 폐기하려면 별도 소비처/데이터 보존 검토가 필요하며, DB 삭제는 이번 작업에 포함하지 않는다.

## 환경 확인

- 기존 격리 checkout에서 최신 origin/main 기반 새 branch 사용. cloud onboarding의 기존 checkout 사용 지침에 따라 추가 worktree는 만들지 않았다.
- Node 22.18.0 / pnpm 10.25.0 및 기존 의존성으로 코드 작업·테스트·빌드·localhost 브라우저 검증 가능.
- 환경 상태 조회: connected, observations_current=true이나 network_policy.state=unknown. 정책 적용 완료로 단정하지 않는다.
- Google Cloud outbound identity는 등록되어 있지 않다. 직접 GCP CLI 인증/운영 조회 가능 상태로 보고하지 않는다.
- 저장소 배포 workflow의 비밀이 아닌 대상 값은 project `netureyoutube`, region `asia-northeast3`. `GOOGLE_CLOUD_PROJECT`·`GOOGLE_CLOUD_REGION`은 대상 설정이며 인증이 아니다.
- 기존 배포는 GitHub Actions WIF를 사용한다. 코드 제거를 위해 GCP 키 파일·운영 DB 접속은 필요하지 않다.
- 직접 cloud 조회가 필요할 때만 환경 설정에서 해당 프로젝트의 GCP identity 및 필요한 Google API 네트워크를 연결하고 실제 read-only 명령으로 검증한다. 키 값을 채팅·공개 문서에 넣지 않는다.

## 문서 정합

과거 WO/CHECK의 당시 블로그 구현·배포 기록은 변경하지 않았다. 현재 Store 제거 범위와 잔존 공통 소비처를 이 기록에서 구분한다. 공통 정본의 플랫폼 블로그 계약 전체를 폐기했다고 표시하지 않는다.

## 개발 완료 당시 검증 및 Git 상태

- `pnpm --filter store-web exec vitest run --maxWorkers=1`: 76 files / 844 tests PASS.
- `pnpm --filter @o4o/api-server exec jest --runInBand --runTestsByPath ...`: 소스 계약 3 suites / 106 tests PASS.
- `pnpm --filter store-web build`: TypeScript·Vite build PASS.
- 변경된 존재하는 TS/TSX 파일 ESLint: 오류 0, 경고 2. 자산 선택기 useEffect dependency 경고 2개는 origin/main 원본을 stdin lint하여 동일함을 확인했다.
- 브라우저: localhost, 합성 응답만 사용한 1440px/390px 8개 관측 PASS. 운영 검증을 대신하지 않는다.
- 최초 전체 테스트는 블로그 카탈로그 제거로 알려진 과거 분류를 비우지 못하는 회귀 1건을 발견했다. 편집 호환성을 보완했고 최종 전체 844개에서 통과했다. 실패 assertion·timeout을 완화하지 않았다.
- 문서 민감정보 검사: 0건. `git diff --check`: PASS.
- Branch: `wo/store-blog-retirement-20261026`. 작업 변경만 commit/push 대상. PR CI·main 통합·배포는 미실행.

```text
WORKTREE_DISPOSITION
worktree: /workspace/o4o-platform
branch: wo/store-blog-retirement-20261026
base: origin/main 59abadb4b2e61e2a1a277a8162f6cdd4f7e5e297
main integration: NOT_RUN / CI: NOT_RUN / deployment: NOT_RUN
smoke: local synthetic desktop/mobile PASS; production NOT_RUN
other session usage: none observed in isolated environment
verdict: KEEP (main integration/deployment pending)
```

## main 병합 전 통합 준비 — 2026-10-26

사용자 지시: **main 병합 전까지** 진행. 병합·auto-merge·배포는 실행하지 않는다.

- 원 개발 commit `ecd36934ef`를 유지하고 최신 main `792b3d0f6e`를 작업 branch에 충돌 없이 병합했다(merge commit `2be1f4b80a`).
- upstream Partner 기능·기존 migration·배포 설정은 main의 기존 변경이며 이 PR의 추가 변경이 아니다. main 대비 이 작업의 범위는 Store 블로그 제거 및 관련 테스트·이 기록이다.
- [PR #831](https://github.com/Renagang21/o4o-platform/pull/831) 생성, Codex review 요청, PR CI 실행. 최종 CI·리뷰 상태는 PR의 해당 HEAD checks/review를 기준으로 확인한다.
- 작업 branch는 원격에 보존하며 최종 승인 전까지 KEEP. main 반영·운영 배포 상태는 계속 NOT_RUN이다.
- 위 초기 `CI: NOT_RUN`은 개발 완료 commit 당시 상태다. 이 절부터 PR CI가 실행되며 운영 검증을 뜻하지 않는다.

### 최종 통합 기준 갱신

검증 중 main에 PR #830 상품·상담 편집 작업이 병합되어 `68268d19f6`를 추가 반영했다(merge `68c7b523c4`). 편집 어댑터는 자동 병합됐고 main 대비 블로그 과거 분류 호환성 변경만 남는 것을 확인했다. 기존 상담 저장 검증·충돌 처리 로직은 보존한다.

첫 PR CI `40271537930`은 CI Gate·API 3분할·웹/관리자 빌드·코드 품질 모두 성공했고 CodeQL·SonarCloud도 통과했다. Sonar의 비차단 경고 1건(자료 선택기의 중첩 검색 안내 삼항식)은 소스별 문자열 매핑으로 정리했다. main 추가 반영과 이 보완 뒤의 최종 커밋에서 CI·리뷰를 다시 확인하며, 최종 상태는 PR #831에 기록한다. main 병합·배포는 계속 미실행이다.

## main 병합 및 Store 배포 완료 — 2026-10-26 (Asia/Seoul)

사용자가 앞선 병합 전 제한을 해제하고 main 병합·배포 진행을 승인했다. 이 절이 현재 통합·배포 상태이며, 위 NOT_RUN 표기는 각 기록 당시의 상태다.

### 최종 소스와 통합

- 최신 main `7166005df54231e00999673fecdf83e596e1bb3a`의 약국 앱 디렉터리 전환·공통 API 정리·외부 AI 연계를 작업 branch에 충돌 없이 반영했다. 이 upstream 변경은 이번 PR의 추가 변경이 아니다.
- 최종 개발 HEAD: `114bb777e16416672454765b5cd55472b5cd4cc6`.
- [PR #831](https://github.com/Renagang21/o4o-platform/pull/831): 정상 merge. merge SHA = `5f778c3a1893ddf2fe724cde1560c1e974a8466c`. bypass·직접 main push·force push 없음.
- 최종 HEAD Codex review 완료, finding 0, 미해결 thread 0. Sonar annotation 0.
- [PR CI 40285407657](https://github.com/Renagang21/o4o-platform/actions/runs/40285407657): CI Gate·API 3분할·코드 품질·웹/관리자 빌드 PASS.
- [main CI 40286566058](https://github.com/Renagang21/o4o-platform/actions/runs/40286566058): SUCCESS, CI Gate·API 3분할·코드 품질·웹/관리자 빌드 PASS.
- 최신 통합 소스 로컬 Store 전체 78 files / 861 tests PASS, TypeScript·Vite build PASS. 최종 빌드 합성 API desktop/mobile 8개 관측 PASS.

### 실제 운영 배포

- 배포 방식: LEVEL 2, 기존 Delivery 자동 verified rollout. promote 수동 실행 없음.
- [Delivery 40287730193](https://github.com/Renagang21/o4o-platform/actions/runs/40287730193): **SUCCESS**.
- 대상: **Store (`store-web`)만**. API·Admin·Partner·Neture·약국 협업체 앱·Lecture·Branch·Hospital Pharmacy는 SKIPPED.
- Store 배포 job `121455886913`: 이미지 build/push → 기존 트래픽 기록 → Cloud Run deploy → 새 revision smoke/트래픽 전환 → 배포 후 검증 모두 SUCCESS.
- 마지막 `Report (serving SHA · commit status)` SUCCESS. 실제 serving SHA가 배포 소스 `5f778c3a1893ddf2fe724cde1560c1e974a8466c`와 일치함을 정상 workflow가 검증했다.
- GitHub commit status `production`: **success**, `DEPLOYED · deploy: store`.
- 운영 DB migration·직접 DB write·실제 업무 데이터 생성·메일 발송 없음.

### 검증 한계와 환경 보완

- 운영 계정으로 메뉴·자료함을 직접 탐색하는 검증은 미실행이다. 앞의 브라우저 결과는 최종 빌드/localhost의 합성 계정·API 결과다.
- 이 cloud 세션에서 Store 공개 도메인 접속은 HTTP proxy CONNECT 403으로 차단됐다. revision 이름을 얻기 위한 Actions 로그 다운로드도 Forbidden으로 실패해, 별도 revision 이름/직접 도메인 HTTP·JS 성공 결과를 기록하지 않는다. job metadata·최종 live serving SHA report·production status의 성공과 구분한다.
- 기존 custom 허용 목록을 보존하고 `store.neture.co.kr`만 추가한 환경 설정 초안을 정상 저장했다. `requires_publish=true`이며, 저장은 현재 세션 적용/게시를 뜻하지 않는다. 환경 설정에서 저장·게시 후 직접 도메인 smoke를 수행할 수 있다. proxy 우회·IAM/인증/CI 설정 변경은 하지 않았다.

### 정리 및 판정

- 이번 검증의 localhost preview와 browser process는 종료했고, 작업 생성 운영 데이터는 없다.
- cloud의 기존 격리 checkout은 보존한다. main에 병합된 feature branch는 완료 상태이며, 배포 기록은 별도 docs-only branch에서 통합한다.
- 판정: **개발·main 통합·Store 배포 완료**. 직접 운영 계정/브라우저 검증은 미실행으로 유지한다. 공통 공개 블로그·서버·원장 전체 폐기를 완료한 것으로 해석하지 않는다.
