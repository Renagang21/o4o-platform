# 공급자 통합 업무 흐름 검수

> 상태: ACTIVE · 작성일: 2026-10-27 (KST)
> [TODO](../work-orders/TODO-O4O-SUPPLIER-INTEGRATED-FLOW-VERIFICATION-V1.md) · 기준 main bdfd9b5ff5415b30486e5ff2b2e8343de0b67653
> branch: wo/supplier-integrated-flow-verification · worktree: /workspace/o4o-wt/supplier-integrated-flow-verification

개발·격리 검수와 기존 정산 알림 배포는 완료했다. 실제 계정의 공급자·경영자·직원 및 매장 간 권한 검수는 계정 사전조건 부족으로 미완료다. 이 차이를 유지하기 위해 트랙 상태는 ACTIVE로 둔다. 새 보완 코드는 아직 main/운영에 반영하지 않았다.

## 기준과 발견

[소비자 commerce 경계](../baseline/O4O-STORE-COMMERCE-BOUNDARY-V1.md), [B2B 계약](../baseline/O4O-B2B-SUPPLIER-TO-STORE-ORDER-CONTRACT-V1.md), [Supplier 경계](../baseline/O4O-SUPPLIER-DOMAIN-BOUNDARY-V1.md)를 대조했다. Neture 약국 매장 주문은 기존 공급자 배송·재고에 연결되지만 Neture 정산 필터에서는 제외된다. 격리 검수도 약국 주문과 정산 가능한 기존 neture 주문을 구분했다. 실제 PG·송금·택배사 실행이나 새 정산 정책을 도입하지 않았다.

통합 주문 API는 page/limit을 지원하지만 hook이 page=1, limit=20만 요청하고 화면에는 페이지 이동이 없었다. 주문21건의 실제 페이지 컴포넌트 테스트에서 다음 버튼 부재로 3건 실패를 재현했다. 이전/다음 페이지와 첫/마지막 경계, 로딩 중 비활성 표시를 연결했다. 출처 변경은 첫 페이지로 되돌리고 요청 세대를 즉시 갱신해 늦은 이전 페이지 응답을 무시한다. 실패는 정상 빈 목록과 구분하며 같은 페이지 재조회와 이전 페이지 복귀를 제공한다. 조회 사이 주문이 줄어 마지막 페이지가 사라져도 이전 페이지로 복귀할 수 있다.

기존 API·공급자 소유권·서버 페이지 정렬·주문 처리 링크·지급/배송/재고 전이는 변경하지 않았다. UnifiedOrdersSection의 실제 소비처는 SupplierOrdersPage 한 곳임을 확인했다. 바뀐 주문 조회는 읽기 전용이다.

## 검증 결과

| 검사 | 결과와 범위 |
|---|---|
| 수정 전 재현 | 새 실제 화면 테스트3건 FAIL: 21번째 주문으로 가는 페이지 버튼 없음 |
| 공급자 화면 전체 | 14 files / 159 PASS. 신규 페이지4건 포함 |
| 전체 Neture 웹 | 164 files / 1,409 PASS. 위 공급자·신규 검사를 포함하며 중복 합산하지 않음 |
| 최종 대상 검사 | 마지막 비활성 버튼 표시 보완 후 페이지4 + 기존 응답순서12 = 16 PASS |
| 실제 PostgreSQL | canonical baseline+47 migration prefix 지문 일치, 기존 주문/테스트 결제/배송/재고/정산10 + 알림 복구12 = 22 PASS. 테스트 후 schema 복구 지문 일치, 전용 DB 제거·잔존0 및 이번 전용 container 제거 |
| PC1440/mobile390 | 실제 SupplierOrdersPage+CSS production fixture, API만 합성. 21번째 주문과 처리 링크, page2 실패→같은 page 재시도, 첫 페이지 복귀, 출처 변경→page1 PASS. page errors0·가로 넘침0·업무 write0 |
| 타입·빌드 | Neture tsc+Vite production build PASS. 기존 큰 chunk 안내 유지 |
| lint·문서 | 수정4개 소스 lint 오류/경고0. 민감정보·상대 링크·diff 검사는 종료 기록 참조 |

초기 새 worktree에서 기존 의존성/패키지 dist 연결 일부가 누락돼 공급자 프로필 검사1개와 웹 빌드가 실패했다. 동일 revision의 기존 설치·빌드 결과를 읽기 연결해 정상화한 뒤 공급자159건과 전체1,409건·빌드를 재실행해 통과했다. 전용 브라우저 fixture의 Router 하위 export 경로도 보완했다. 제품 dependency·manifest·lockfile 또는 제품 route/인가는 바꾸지 않았다. 재사용용 untracked symlink는 최종 검증 뒤 제거하며 기존 checkout의 의존성과 산출물은 보존한다.

## 기존 정산 알림 배포 완료

사용자의 진행 지시로 앞서 검증·main 병합한 정산 알림의 운영 migration 포함 배포를 실행했다. [PR #854](https://github.com/Renagang21/o4o-platform/pull/854), main SHA bdfd9b5ff5415b30486e5ff2b2e8343de0b67653다. 배포 전 해당 SHA의 CI40490191604·CodeQL40490191566 SUCCESS와 main 불변·다른 활성 배포 없음·Renagang21 실행 계정을 확인했다.

[Promote 40493809035](https://github.com/Renagang21/o4o-platform/actions/runs/40493809035) SUCCESS: services=api,neture, dry_run=false. Run database migrations, API readiness/traffic switch, Neture verified smoke/traffic switch, Final serving SHA → DEPLOYED/FAILED 단계 모두 SUCCESS다. GCP 로컬 토큰 추가·freeze/인프라 변경·다른 서비스 승격은 없었다. 직접 GCP revision 명칭을 별도로 조회한 것으로 보고하지 않는다.

전역 production status는 NOT_SELECTED/pending이며 api,neture 배포와 미선택 hospital-pharmacy 등의 보류가 함께 표기된다. 이번 두 대상 배포 실패나 전체 서비스 배포 완료로 해석하지 않는다. 배포 후 공개 HTTP·JS/CSS·API readiness 및 인증 없는 조회401은 11/11 PASS다. 실계정 업무 API·정산 지급/알림 재처리를 호출하지 않았다. 상세 증적은 [정산 알림 CHECK](CHECK-O4O-SETTLEMENT-NOTIFICATION-RECOVERY-V1.md)에 후속 추가했다.

## 실계정 검수 후속

기준 checkout과 이번 worktree의 docs/local/TEST-ACCOUNTS.local.md가 없다. SETUP의 단일 계정 출처 규칙을 유지하고 예전 seed/Demo 또는 추측 계정을 쓰지 않았다. 계정값·토큰을 출력하거나 공개 문서에 복사하지 않았다.

파일을 승인된 비공개 경로로 연결한 뒤 실제 계정으로 공급자 주문 목록/이전 주문 접근, 공급자 전환과 소유권 차단, 경영자·직원의 허용/거부, 매장 간 격리를 읽기 전용으로 확인한다. 실제 업무 write가 필요하면 대상·생성 데이터·완전 정리 조건을 확정한 범위에서만 수행한다. 새 코드의 main 통합·추가 배포 및 이 실계정 검수는 이번 코드 인계의 다음 단계다.

문서 정합: 기존 정산 알림 CHECK의 과거 미배포 기록은 유지하고 이번 완료 결과를 후속으로 추가했다. canonical index·금융/보존/정산 정책·과거 완료 기록은 다시 쓰지 않았다. 코드/로그 증적은 작업 branch와 /tmp/o4o-supplier-integrated-*에 있고 최종 commit/push SHA는 종료 보고를 따른다. WORKTREE_DISPOSITION=KEEP.
