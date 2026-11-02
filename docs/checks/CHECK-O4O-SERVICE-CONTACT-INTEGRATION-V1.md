# CHECK-O4O-SERVICE-CONTACT-INTEGRATION-V1

- 작성일: 2026-11-02 (Asia/Seoul)
- 사용자 지시: push된 변경과 열린 PR의 main 통합·배포.
- 대상: [PR #929](https://github.com/Renagang21/o4o-platform/pull/929), 원래 인계 `e30a95d47d`.
- 전용 통합 공간의 최신 main에는 #925의 명시적 중앙 위임이 있다. #905 후속 검증 커밋도 통합 base에 포함되므로 #905를 먼저 병합하고 #929를 병합한다. 다른 세션의 원래 작업공간은 수정하지 않는다.

## 리뷰 보완

P1은 최초 알림과 문의함 재알림의 수신자 정책 불일치다. 공개 서비스의 재알림에도 `centralContactRecipients`를 사용해 정상 계정·유효 역할·중앙 위임·정확한 문의 메뉴를 다시 확인한다. 전체 Admin은 포함하고 일반 서비스 역할만 있거나 메뉴를 회수당한 운영자는 제외한다. 최초 알림과 재알림은 동일한 중앙 목적지·operationMenu·sourceServiceKey를 기록한다. 목적지 계산은 기존 중앙 문의 모듈의 순수 함수로 공유하며 메일 실행 의존성을 추가하지 않는다.

독립 사업·개별 조합의 수신자와 organization 범위·내부 목적지는 기존 경로를 유지한다. 새 권한·원장·DB migration은 없다. 기존 global/조직 역할에 #925의 명시적 위임이 있는 경우도 같은 중앙 메뉴 검사를 적용하며 역할 scope는 바꾸지 않는다.

## 검증

- CONTACT 전용 loopback fixture를 추가 지원하고 기존 socket 실행 경로도 유지했다. 테스트 테이블에 현행 `admin_operations boolean DEFAULT false`를 반영했다.
- 실제 PostgreSQL: 중앙 수신자·공개 접수·답변·권한·정지·알림·동의 3 suites / 46 tests PASS.
- 재알림 P1 및 global 위임·회수·Admin 수신·독립 사업/조합 내부 링크 보존: 2 suites / 9 tests PASS. 위 묶음과 일부 중복이며 합계로 더하지 않는다.
- Admin 문의함·중앙 탐색: 2 files / 24 tests PASS.
- API TypeScript noEmit PASS.
- 테스트의 메일/알림 제공자는 합성 경계이며 실제 사용자에게 알림·메일을 보내지 않았다. 실제 DB 쓰기는 전용 일회성 PostgreSQL에만 수행했다.

미해결 리뷰·전체 CI·운영 반영 상태는 인계 HEAD의 실행 기록에서 확인한다. 운영 배포·서빙·실계정 검증은 이 로컬 결과와 구분하며 전체 통합 최종 보고에 남긴다. 과거 WO/CHECK는 재작성하지 않는다.
