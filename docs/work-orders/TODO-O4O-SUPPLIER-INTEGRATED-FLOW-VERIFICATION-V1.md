# 공급자 통합 업무 흐름 검수 TODO

> 상태: ACTIVE · 작성일: 2026-10-27 (KST)
> 사용자 지시: 정산 알림 배포 마무리 후 공급자→약국 업무 흐름 검수와 발견 오류 보완. AI 제외.
> 기준 main: bdfd9b5ff5415b30486e5ff2b2e8343de0b67653 · branch: wo/supplier-integrated-flow-verification

## TODO

- [x] 승인된 정산 알림 migration·API→Neture 배포의 실제 결과와 공개 상태를 확인한다.
- [x] 소비자 commerce·B2B·Supplier 정본과 기존 완료 기록, 계정 사전조건을 대조한다.
- [x] 통합 주문 21건 이상에서 오래된 주문 접근이 막히는 문제를 재현하고 기존 페이지 API로 보완한다.
- [x] 페이지/출처 전환·늦은 응답·조회 실패/재시도·처리 링크를 실제 화면으로 검증한다.
- [x] canonical PostgreSQL의 실제 주문·테스트 결제·배송·재고·정산/알림 경계와 fixture 정리를 확인한다.
- [x] 관련 회귀·타입/빌드·PC/mobile 검증 후 CHECK·이용 안내·문서 정합을 완료하고 commit/push로 인계한다.

## 실행 경계와 조사 결과

- 신규 검수/수정은 최신 main에서 별도 worktree로 진행한다. 동일 revision의 기존 의존성을 읽기 재사용하며 manifest·lockfile 변경은 없다.
- Neture 약국 매장 주문은 배송·재고에 연결되지만 기존 Neture 정산 대상에서는 제외한다. 기존 neture 대상 주문으로 정산 흐름을 별도로 검증한다. 테스트 결제를 실제 송금/PG 성공 근거로 쓰지 않는다.
- 통합 주문 hook은 page=1, limit=20으로 고정하며 화면에는 다음 페이지 동선이 없다. 기존 backend/API에는 페이지 인자가 있어 UI 동선만 보완한다. 새 주문 API·권한·DB·상태 전이를 추가하지 않는다.
- 기준 checkout과 새 worktree에 docs/local/TEST-ACCOUNTS.local.md가 없다. 과거 계정·Demo 계정을 대체 사용하지 않는다. 실계정 로그인·권한·실매장 검수는 미확인으로 남긴다.
- 운영 업무 주문/배송/재고/정산·알림 재처리 쓰기, 유료 AI·실제 PG/은행·택배사 호출은 하지 않는다. 합성 업무 데이터는 격리 DB에만 만들고 종료 후 DB 자체 제거·잔존0을 확인한다.
- 정산 알림 운영 배포는 앞서 안내한 migration 포함 실행의 진행 지시에 따른 기존 main 통합의 연속이다. 새 검수 코드의 main 병합·추가 배포는 별도 통합 단계다.

## 완료와 실계정 후속

[검증 기록](../checks/CHECK-O4O-SUPPLIER-INTEGRATED-FLOW-VERIFICATION-V1.md)에 결과와 한계를 정리했다. 정산 알림 기존 main 배포는 완료했고, 새 통합 주문 페이지 보완은 검증 후 작업 branch push까지 인계한다.

- [ ] 기준 계정 파일을 승인된 비공개 경로로 연결한 뒤 실제 공급자·약국 경영자·직원 권한과 매장/공급자 간 격리를 읽기 전용으로 검수한다.

이 후속은 계정 사전조건 부족으로 미실행이며 격리 테스트 통과로 대신 완료하지 않는다. WORKTREE_DISPOSITION=KEEP: 새 코드 main 병합 전 인계에 필요한 전용 worktree를 보존한다.
