# WO-O4O-CHATGPT-ISOLATED-REVIEW-DEMO-V1

> 상태: IN_PROGRESS · 작성일: 2026-10-28 · 범위: ChatGPT 앱 심사용 격리 환경 · 사용자 결정: 개발 단계로 실제 사용자/데이터가 없으며 실운영과 분리한 심사용 Demo 구성

## 목표와 경계

기존 공개 Demo 계정이 현행 약사 자격 승인 조건을 충족하지 않아 외부 AI 동의 목록에 약국이 표시되지 않았다. 운영 자격 조건을 완화하거나 실제 자격 승인을 조작하지 않고, 별도 DB의 합성 fixture로 실제 OAuth·작업공간·자료·비공개 초안 동작을 검증한다.

- 기준: `origin/main` `2f4da2e188e0995e21b34fac1e7f96d5637860f9`. 공개 GitHub commit 조회로 일치 확인.
- 기존 운영 DB/회원/Cloud 서비스/제출 상태는 변경하지 않는다. 신규 인프라나 운영 DB write는 일반 코드 변경 승인으로 대신하지 않는다.
- Public Git에는 secret 이름과 합성 식별자만 기록한다. 실제 credential과 포털의 reviewer 비밀값은 넣지 않는다.
- 심사 fixture의 합성 자격 행은 별도 DB marker/identity 검사 뒤에만 생성하며 실제 사람의 면허 승인이 아니다.

## TODO

- [x] 기존 동의 실패와 계정 자격 상태를 브라우저로 확인
- [x] 기존 운영 배포와 분리할 자원·secret 경계 확인
- [x] 전용 DB/role/marker 및 fail-closed provision CLI 구현
- [x] 표준 비밀번호 수단 서비스를 재사용하는 심사 계정·약국·자료 fixture 구현
- [x] 데모 편집기 origin을 설정할 수 있게 초안 열기 주소 분리
- [x] 빈 격리 DB bootstrap/migration, dry-run, 초기화, 재실행 검증
- [x] 실제 SDK 핵심 8개 도구 조회·비공개 저장·최신 revision 수정 및 조직 격리 검증
- [x] Neture/Store UI의 로그인·동의·편집기 검증(로컬 Chromium)
- [x] API/Neture/Store 이미지 build 및 전체 Compose 기능·브라우저 재검증
- [ ] 상품 콘텐츠 3개 도구 실행
- [x] 코드 검증·로컬 commit·작업 branch push
- [ ] PR/CI·review
- [ ] 별도 공개 HTTPS 배포 및 5+3 실제 사례 검증
- [ ] 시연 영상과 제출 ZIP/reviewer 안내 갱신

## 실행 상태

초기 GitHub native Git fetch와 gh 조회는 HTTP 401로 실패했으나 인증 복구 후 main fetch 및 작업 branch push가 성공했다. PR/CI와 공개 배포 상태는 별도로 추적한다. 별도 공개 HTTPS 인프라와 심사용 시연 URL도 아직 확보하지 않았다. 실제 실행 결과는 검증 후 CHECK에 기록한다.

상세 실행·공개 전환 절차: [격리 Demo README](../../deploy/chatgpt-review-demo/README.md). 실제 결과: [CHECK](../checks/CHECK-O4O-CHATGPT-ISOLATED-REVIEW-DEMO-V1.md).
