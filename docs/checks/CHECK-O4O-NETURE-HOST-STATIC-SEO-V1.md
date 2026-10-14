# Neture 호스트별 정적 SEO 검증

> **상태**: COMPLETED · **작성일**: 2026-10-14 · **최종 갱신**: 2026-10-14
> **근거**: [WO](../work-orders/WO-O4O-NETURE-HOST-STATIC-SEO-V1.md) · 사용자 Docker/빌드/배포 변경 승인

## 구현과 로컬 검증

기존 runtime SEO export·객체 동일성·origin/routing/cutover를 유지하고 DOM 독립 데이터로 분리했다. Vite 최종 번들의 실제 index에서 네 호스트별 홈/SPA 문서를 생성한다. JS/CSS는 복제하지 않는다. nginx는 알려진 세 하위 호스트만 선택하며 미지 호스트/Cloud Run probe는 O4O 기본 문서를 사용한다.

| 검사 | 결과 |
|---|---|
| Neture 전체 Vitest | 최신 main 통합 후 98파일 · 883테스트 PASS (신규 정적 SEO 9 포함) |
| Neture 타입 포함 Vite build | PASS · 호스트별 8문서 및 동일 번들 참조 확인 |
| 빌드 플러그인 strict TypeScript · 변경 파일 lint | PASS |
| 전체 frontend type-check | 디스크 고갈로 KPA-branch/lecture의 산출물 쓰기만 실패; 공간 확보 후 해당 두 검사 재실행 PASS |
| nginx + 실제 local Vite dist HTTP | 반복 가능한 `tools/checkHostServing.mjs`: 140 assertions PASS |
| 별도 HTTP edge cases | 125 assertions PASS; 대소문자/port·위장 host·query·내부 HTML 직접 접근 포함 |
| Chromium | 네 호스트 × 1440/390/320px = 12화면 및 JS-disabled 4화면. Overflow 0 · pageerror 0 |
| 문서 민감정보 검사 | PASS |

HTTP 검사: host title/description/OG/canonical, 홈 `/`·`index.html`·query, 미등록/인증 심층 경로의 SPA fallback과 canonical·og:url 부재, 정적 자산 MIME/immutable 캐시/404, HTML no-cache/Vary Host, HEAD·Range·ETag·gzip. 내부 `__seo` 문서는 직접 접근 404. 존재하지 않는 자산은 HTML 성공 응답으로 바꾸지 않는다.

브라우저는 실제 nginx HTTP 응답을 각 호스트 origin으로 전달했고 외부 API·글꼴 호출을 차단했다. 최신 main의 공급자·펀딩 홈은 비로그인 시 `/login`으로 이동하므로 기존 이동과 로그인 CTA를 확인했다. 대표 홈 연락처와 커뮤니티 개설/운영 링크도 확인했다. 은퇴된 소개 Hero를 현행 홈으로 복원하지 않았다. 실제 인증·운영 쓰기 smoke나 외부 글꼴 가용성 검사로 취급하지 않는다. 기존 SEO 문구를 정적 HTML에 반영했으며 서비스 정책/가입 기능을 바꾸지 않았다.

Codex 초기 리뷰 P2: 심층 SPA의 og:url이 홈을 가리키는 문제를 수정했다. 빌드가 요청 경로를 모르므로 SPA 문서에서는 canonical과 og:url을 모두 제외하고, runtime SeoWatcher가 실제 경로 URL을 설정한다. 관련 3파일 21테스트와 수정 이미지의 각 PORT 140 HTTP assertions 재검증 PASS.

## 컨테이너와 운영

실제 Dockerfile 전체 빌드 PASS. 최종 이미지 `sha256:714d006b714cf0d8f881efd050a296a2d905596121fa9b521412037216bb8ab1`(66324968 bytes)의 8080 기본 PORT와 9090 변경 PORT에서 각각 140 assertions PASS. `nginx -t` PASS, UTF-8 Content-Type 및 runner에 임시 CA 파일 부재 확인. 원 Dockerfile의 버전 미지정 pnpm이 최신 12를 설치하여 저장소 지정 10.25.0으로 고정했다. optional BuildKit secret `proxy_ca`는 network RUN에만 마운트하고 TLS 검증을 유지한다. 이미지에 CA를 넣지 않는다. Sonar Docker 지적 후 기존 pnpm-lock.yaml을 COPY하고 frozen-lockfile·integrity 검증·lifecycle script 차단 및 별도 BuildKit package cache를 적용했다. dependency manifest와 lockfile 내용은 변경하지 않았다.

로컬 Docker `vfs` 및 기본 BuildKit `native`는 COPY마다 파일 복제로 디스크를 고갈시켜 해당 작업 캐시를 정리했다. daemon 저장 설정은 유지하고 전용 FUSE BuildKit에서 전체 빌드를 완료했다. FUSE 빌드로 COPY 시 과도한 파일 복제를 방지했다. 서빙 runner는 공식 nginx 1.28 Alpine의 UID 101, PORT 기본 8080이며 nginx 변수는 PORT만 envsubst한다.

운영 반영은 CI·리뷰 gate 이후 Neture 전용 Promote와 실제 serving/HTTP 결과까지 확인하여 완료했다. DB migration은 실행하지 않는다. 기존 verified rollout의 검사/traffic 전환·실패 시 기존 revision 유지 계약을 따른다.

## 저장소 도구 버전 정렬

사용자 요청에 따라 `.nvmrc`·root Volta·CI의 Node 22.18.0 및 pnpm 10.25.0 기준을 조사했다. 클라우드 기본 24.19.0/11.25.0 대신 정확한 Node 22.18.0·pnpm 10.25.0·npm 10.9.3을 checkout 밖에 설치하고 사용자 셸 시작 파일에서 활성화했다. 새 login·interactive·상속 non-login 셸의 버전 확인 및 실제 설치 스크립트 도구/활성화 부분 재실행 PASS, 기존 SEO 9테스트 PASS. 로컬 API ready·database healthy·공개 legal-profile 조회와 Neture home HTML·O4O 모듈 변환 PASS. 전체 재사용 설치·시작 지침을 환경 설정 초안에 저장했으며 새 snapshot 적용은 사용자 재게시가 필요하다. Neture Docker builder도 `node:22.18.0-alpine`으로 고정했다. 전체 실제 빌드 PASS, 최종 runner 이미지가 이전 검증 해시와 같으며 기본/변경 PORT 각 140 HTTP assertions·nginx -t PASS. 새 컨테이너 Chromium 16 cases PASS(overflow/pageerror 0). 저장소 manifest/lockfile 내용은 유지했다.

## 후속 보안 게이트 및 연결 상태

최초 통합 HEAD `59f327f0fa`의 CI Pipeline은 PASS, Codex 재검토는 새 finding 없이 완료(이전 P2 스레드 resolved). Sonar는 정규식의 선행 공백 반복 두 곳에 대한 super-linear backtracking 지적으로 신규 보안 등급 C를 반환했다. 해당 반복을 제거하고 관련 17테스트·strict plugin TypeScript·lint·Neture 타입/Vite 빌드를 재검증했다. HTTP smoke의 독립 요청은 Promise.all로 병렬화했다. 변경 이미지 전체 빌드 PASS. 수정하지 않은 최종 이미지의 UID 101 · nginx -t · 각 PORT 140 assertions PASS. 로컬 0600 원본과 COPY의 상위 디렉터리 권한 문제를 확인하여 파일 0644·templates 디렉터리 0755·conf.d 렌더링 권한을 명시했다. HEAD `d6b3079`의 CI Gate PASS, 보안 지적은 해소되었다. 다음 Sonar 검사는 smoke의 직접 map 콜백 전달 1건으로 신뢰성 C를 반환하여 명시적 `(host, index) => checkHost(host, index)` 전달로 수정하고 실제 HTTP 140 assertions·lint를 재검증했다. 최종 HEAD `42ad5145cc`의 Sonar Quality Gate PASS(신규 issues 0 · Security Hotspots 0), CI Gate PASS(run `38512087750`). Codex `42ad514` 검토는 새 finding 없이 완료했고 미해결 스레드 0이다. 비특권 nginx는 PID/temp를 /tmp에 두고 conf.d의 template 렌더링 권한만 준비한다. 신뢰된 로컬 pnpm store를 BuildKit cache에 준비했으며 frozen-lockfile·integrity 검증은 유지한다.

GitHub는 일시적 401 뒤 정상 사용자 응답이 확인됐으나 Git/API 및 registry의 간헐적 503으로 원격 상태 갱신이 불안정했다. 승인 재요청 사유가 아니라 연결 장애다. 보호된 gate를 우회하지 않고 정상 push·review·CI·병합·Neture-only Promote 및 운영 smoke까지 완료했다. 실행 중 artifact/log 저장소 다운로드는 network 403으로 제한됐으므로 최종 serving 증거는 정상 GitHub job/commit status와 운영 HTTPS 검증으로 확인했다.

## 재검증

저장소 루트에서 Neture Vitest config로 전체 테스트, `pnpm --filter @o4o/web-neture build`, Docker build/run을 수행한다. 컨테이너 port를 localhost에 연결한 후:

```sh
node services/web-neture/tools/checkHostServing.mjs http://127.0.0.1:8080
```

이미지와 동일한 dist가 필요하면 두 번째 인자로 dist 경로를 지정한다. 로컬 artifact는 `/workspace/o4o-seo-artifacts/`의 HTTP/browser 결과·12 PNG·browser harness, build log는 `/tmp/o4o-seo-*.log`이다. 최종 Node 22 이미지 build log는 `/tmp/o4o-seo-docker-node22.log`, 추출한 동일 dist는 `/workspace/o4o-seo-artifacts/node22-dist/`이다. production 응답 원문과 자격증명은 이 기록에 저장하지 않는다.

문서 정합: 새 WO/CHECK와 수정 index.html 주석으로 현재 구현/검증 상태를 기록했다. 기존 완료 접근성 기록은 당시 판정을 유지한다. canonical index·공통 디자인 정책은 변경하지 않았다.

## main 통합

Source PR [#571](https://github.com/Renagang21/o4o-platform/pull/571)은 필수 source CI·Sonar·Codex·미해결 스레드 0·최신 main 포함을 확인한 뒤 정상 squash merge했다. 병합 SHA `97035d93b7a6eb80b65a060fadb8356e0b45d401`, 작업 키 `WO-O4O-NETURE-HOST-STATIC-SEO-V1`. main과 작업 branch의 Neture 경로 diff 0. post-merge CI(run `38512939668`) PASS. 자동 Delivery `38513791454`는 Neture 단독 `HELD_LEVEL_3`로 보류, dry-run Promote `38513852152` PASS(실제 배포 0). 동일 main SHA·Neture만의 정상 Promote와 운영 검증까지 완료했다.

## 운영 배포와 완료

정상 Promote [38514041041](https://github.com/Renagang21/o4o-platform/actions/runs/38514041041) PASS. 실제 `deploy-neture`의 Docker build/push·traffic 사전 기록·Cloud Run 배포·새 revision smoke/traffic switch·public verify가 모두 PASS. 최종 Report의 `Final serving SHA → DEPLOYED / FAILED` PASS 및 source main SHA `97035d93b7a6eb80b65a060fadb8356e0b45d401`의 `production` commit status `success`, description `DEPLOYED · deploy: neture` 확인. 이 판정은 단일 revision 100%의 실제 serving SHA가 target과 일치할 때만 DEPLOYED로 확정한다. API·Admin·다른 웹 배포 및 migration은 실행하지 않았다.

운영 HTTPS read-only smoke 52 requests PASS: 네 호스트의 home·index·심층/로그인 경로 메타, 홈 canonical/og:url, 심층 경로 홈 canonical/og:url 부재, HTML no-cache/Vary Host, 내부 문서/누락 자산 404, 동일 JS/CSS 자산과 MIME·immutable 캐시 확인. 응답 원문이나 자격정보는 문서에 기록하지 않았다. 요약 artifact는 `/workspace/o4o-seo-artifacts/live-results.json`, 실행 로그는 `live-check.log`다. 실제 계정 로그인·운영 쓰기 smoke는 수행하지 않았다.

문서 closure의 배포 판정은 `NOT_APPLICABLE`이다. 앱 serving은 위 source SHA로 유지하며 종료 기록만 정상 docs PR로 통합한다.

WORKTREE_DISPOSITION: source `/workspace/o4o-wt/neture-host-static-seo` · branch `wo/neture-host-static-seo` · main integration PR #571 · source/main CI PASS · deployment PASS · smoke PASS · uncommitted/untracked 0 · foreign usage 없음 · squash 후 Neture runtime path diff 0. `KEEP`: 재검증 browser harness가 해당 worktree의 Playwright와 node_modules를 참조한다. closure worktree는 docs PR 통합·post-merge 검사 후 별도 보존 artifact/남은 작업이 없으면 `SAFE_TO_REMOVE`로 정리한다. 기존 접근성 worktree는 보존 판정을 유지한다.
