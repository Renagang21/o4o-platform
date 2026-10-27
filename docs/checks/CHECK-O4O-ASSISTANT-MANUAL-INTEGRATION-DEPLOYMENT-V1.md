# O4O 업무 도우미 매뉴얼 main 통합·배포 검증

> 상태: ACTIVE · 작성일: 2026-10-27
> 사용자 지시: 개발 branch를 main에 병합하고 배포한다. 이번 공간에서 PR·필수 gate·리뷰·병합·배포 검증을 수행한다.
> 개발 인계: `a861223ea4` · branch: `wo/assistant-manual-knowledge`

## 1. 통합 준비

최신 main `d1031be969`를 자기 branch에 정상 merge했다. 기존 명칭 정비는 main에 이미 들어간 동일 commit이며 중복 구현하지 않는다. 실제 ruleset은 PR과 `CI Gate`를 요구하고 필수 human approval은 0이다. 우회 병합·workflow/secret 변경은 하지 않는다. 실행 GitHub identity의 login은 저장소 소유자로 확인했다. Actions 변수 조회는 현재 연결 권한에서 403이므로 freeze 상태를 추측하지 않고 Delivery의 실제 판정을 확인한다.

## 2. 배포 전 보완·검증

기존 PDF worker `?url`은 `.mjs` asset을 만들지만 운영 Nginx 1.28 기본 mime.types는 JavaScript 확장자로 `.js`만 선언한다. 이 경우 module worker의 strict MIME 검사로 PDF 등록이 실패할 수 있다. Nginx·배포 설정을 바꾸지 않고 Vite `?worker&url`로 worker를 번들링해 `.js`로 출력하도록 수정했다.

실제 Docker와 같은 `NETURE_OBFUSCATION=names` profile 빌드 PASS. 그 빌드의 정확한 worker asset을 JavaScript-only MIME 정책의 loopback 서버에서 Chromium으로 로드해 사용자 제공 유팜 24쪽·팜POS 11쪽을 모두 파싱하고 텍스트 존재를 확인했다. 원문 PDF·전문은 공개 Git에 넣지 않았다. 기존 일반 dev 서버만의 성공을 production 검증으로 확대하지 않았다.

신규 schema/migration·가격·credential·인증·운영 DB 변경은 없다. 기존 read/draft·최종 사용자 확정·매뉴얼 untrusted 경계는 유지한다. PR CI와 실제 배포/서빙 결과는 아래에 이어 기록한다.

## 3. 현재 결과

PR·CI·리뷰·병합·배포 진행 중. 개발/로컬 검증 기록은 [WO](../work-orders/WO-O4O-ASSISTANT-MANUAL-KNOWLEDGE-V1.md), 사용자 테스트 절차는 [guide](../guides/O4O-ASSISTANT-MANUAL-USER-TEST-V1.md)를 따른다. 실제 모델 품질·유료 비용·유팜/PMPLUS Windows 조작은 별도 범위다.


## 4. PR 리뷰 보완

PR #849의 Codex P2 두 건을 확인했다. (1) 탭별 snapshot 전체 덮어쓰기 대신, 최신 자료 읽기·수정·쓰기를 하나의 IndexedDB readwrite 트랜잭션으로 실행한다. PDF/JSON 해석은 트랜잭션 밖에서 준비하고, 저장 직전에는 최신 문서에 변경만 적용한다. 사용 횟수 갱신이 다른 탭의 추가·교정·삭제를 되돌리지 않는다. (2) 개별 PDF 12MB와 자료함 JSON 64MB 한도를 분리해 정상 허용된 10개 문서를 UTF-8/JSON escape 확장까지 포함해 다시 가져올 수 있게 했다.

실제 두 Chromium 탭의 IndexedDB에서 자료 추가·보완 후 다른 탭 사용 횟수 갱신, 동시 42회 증분, 삭제 비복원, 다른 계정 분리를 검증해 PASS했다. 재현 명령: `O4O_BROWSER_EXECUTABLE=/usr/bin/chromium node scripts/checks/assistant-manual-storage.browser.mjs`. 한글 70만 자 문서 6개의 12MB 초과 자료함을 내보낸 JSON으로 복원하는 회귀와 최악의 escape 크기 상한도 추가했다. 원문 매뉴얼이나 실제 사용자 자료를 회귀에 넣지 않았다.
