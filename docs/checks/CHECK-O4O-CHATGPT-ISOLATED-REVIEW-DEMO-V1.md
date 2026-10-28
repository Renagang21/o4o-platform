# CHECK-O4O-CHATGPT-ISOLATED-REVIEW-DEMO-V1

> 작성일: 2026-10-28 · 상태: LOCAL_VERIFIED / PUBLIC_DEPLOYMENT_PENDING · 대상: 합성 fixture를 가진 전용 DB 및 로컬 API/Neture/Store

## 실제 검증 결과

| 항목                                 | 결과                                                                         |
| ------------------------------------ | ---------------------------------------------------------------------------- |
| frozen lockfile 설치, build:packages | PASS                                                                         |
| API TypeScript build / tsup bundle   | PASS                                                                         |
| provision/smoke 별도 TypeScript 검사 | PASS, 브라우저 helper 포함 최종 검사 완료                                    |
| 환경/DB/marker/origin 검사           | 7 tests PASS                                                                 |
| 기존 external-ai focused Jest        | 5 suites / 40 tests PASS                                                     |
| root flat ESLint 변경 TS 검사        | PASS, 브라우저 helper 포함 최종 검사 완료                                    |
| 빈 DB 정본 bootstrap/incremental     | 49개 적용, 최종 schema fingerprint PASS                                      |
| provision dry-run/apply/재실행       | write 0 / prepared / already-prepared(write 0)                               |
| API readiness                        | HTTP 200, ready                                                              |
| Neture/Store demo API 지정 build     | 두 웹 PASS                                                                   |
| 실제 로그인/DCR/PKCE/동의/토큰 교환  | PASS                                                                         |
| 도구 발견                            | 11개. 핵심 8개 실제 실행                                                     |
| P1~P5 API 기능                       | 작업공간/상품/자료/비공개 저장/조회/최신 revision 수정 PASS                  |
| 추가 권한 거부                       | 읽기 전용 저장/다른 공간/이전 revision 거부 PASS                             |
| 로컬 Chromium UI                     | 이메일 로그인/합성 자격 상태/실제 약국·쓰기 동의/데모 Store 편집기 열기 PASS |
| 브라우저 격리                        | loopback 세 포트만 허용. 운영 API/웹 요청 없이 완료                          |
| 임시 데이터 정리                     | 생성 초안·테스트 OAuth client/connection/credential 삭제. 초안 잔존 0 확인   |
| Compose config / ui profile          | PASS                                                                         |
| 전체 컨테이너 이미지/Compose 실행    | API/Neture/Store 이미지 build 및 Compose healthy PASS                        |
| 문서 민감정보 / diff check           | PASS                                                                         |

전체 Compose에서도 동일 smoke를 재실행해 API 10개 검사와 브라우저 3개 동선이 통과했다. migrate/provision job은 exit 0이고 API와 전용 DB health가 정상이다.

기준 합성 계정·자료와 로그인/보안 로그는 유지했다. 실제 사용자·면허·운영 자료를 복사하거나 기존 운영 자격을 승인하지 않았다. 비밀값은 private env에만 보관하며 로그·Public Git에 넣지 않는다. 브라우저 증거 PNG는 로컬 artifact에 보관한다.

## 실패 원인과 수정

- 별도 schema marker가 FRESH_EMPTY 판정을 방해했다. 기존 검사를 완화하지 않고 DB 설명 metadata로 옮긴 후 정본 초기화와 49개 incremental/fingerprint가 통과했다.
- bundler가 NODE_ENV를 고정한다. localhost 검증은 development bundle로 분리했으며 공개 배포에는 별도 production build가 필요하다.
- 브라우저 테스트는 상단 로그인 버튼과 form submit을 구분하고, Store 로그인 안내 링크를 통해 원래 편집기로 복귀하는 실제 동선을 사용했다.
- 오래된 eslintrc 호출은 현행 설정과 맞지 않았다. 규칙 변경 없이 root flat config의 scoped lint로 확인했다.

## 남은 작업과 외부 조건

- 상품 콘텐츠 신규 3개 도구 실행은 이 검증에 포함하지 않았다.
- API 권한 거부 3개와 제출용 모델 비호출 negative prompt 3개는 다르다. 실제 ChatGPT 호출 선택은 아직 검증하지 않았다.
- 공개 HTTPS API/Neture/Store, 별도 공개 DB/runtime identity, 시연 영상 URL은 아직 준비하지 않았다. 운영 DB/Cloud 서비스/포털 제출 상태는 변경하지 않았다. localhost/placeholder를 제출하지 않는다.
- GitHub native fetch/gh는 HTTP 401로 실패했다. 공개 main 조회 성공은 쓰기·PR·CI·배포 권한 복구를 의미하지 않는다.
- 공통 My Home handoff의 운영 origin 고정은 변경하지 않았다. 검증된 reviewer 동선은 데모 로그인→동의→도구가 반환한 데모 편집기이며, 다른 이동까지 검증됐다고 보고하지 않는다.

문서 정합: [WO](../work-orders/WO-O4O-CHATGPT-ISOLATED-REVIEW-DEMO-V1.md)와 [README](../../deploy/chatgpt-review-demo/README.md)에 구현/실행/미완료 경계를 기록했다. 운영 자격 정책은 변경하지 않았다.
