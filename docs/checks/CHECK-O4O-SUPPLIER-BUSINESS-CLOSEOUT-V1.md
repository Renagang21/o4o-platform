# CHECK-O4O-SUPPLIER-BUSINESS-CLOSEOUT-V1

> **상태**: COMPLETED
> **작성일**: 2026-10-22 · **최종 갱신**: 2026-10-22
> **근거**: [공급자 업무 마감 WO](../work-orders/WO-O4O-SUPPLIER-BUSINESS-CLOSEOUT-V1.md)
> **기준**: main `7dc02646da`, branch `wo/supplier-business-closeout`

## 구현과 보존

| 영역 | 최종 처리 |
|---|---|
| 제안 재시도 | optional requestId(UUID)를 기존 제안 PK에 사용. transaction advisory lock으로 동시 호출을 직렬화하고 동일 공급자·요청자·정규화 조건이면 기존 id/현재 status 반환. 신규 201, 재사용 200, 같은 키의 다른 조건/주체 409. 키 생략은 기존 독립 생성 유지 |
| 재시도 후 상태 | 이미 승인·종료된 제안을 pending으로 되돌리지 않는다. 동일 조건의 새 제안은 별도 UUID로 가능. 변경 조건을 같은 재시도 키로 덮어쓰지 않는다 |
| 초안 | 계정+서버에서 확인한 공급자 범위의 탭 sessionStorage. 마지막 사용 후 24시간 이내 사본만 복원. 전송 직전 키·조건 기록, 중단된 sending은 접수 확인 상태. 복원은 자동 제출하지 않음 |
| 오류 복구 | 부분 성공은 재전송 제외. 불명 응답은 같은 키·조건으로 접수 확인. 조건 변경은 목록 확인 후 명시적 새 초안. 저장된 초안 삭제는 서버 제안 종료와 별개이며 확인 창으로 안내. 보관 실패 시 안내와 메모리 입력 유지 |
| 약국 지정 | 본인 제안 응답의 대상 ID/이름만 검색·선택. 신규 대상 ID 입력 유지. 다른 공급자·전 약국 명단 조회나 협업체 가입 추가 검증 없음 |
| 모바일 | 제안 목록에 최소 폭·내부 가로 스크롤·키보드 접근 가능한 region·모바일 안내 추가. 문서 전체 가로 넘침 없음 |
| 사업자·세금계산서 | 기존 개인/법인·사업자 정보·세금계산서 이메일 저장/조회 회귀. 발행 API·세무 판정·발행 상태 신설 없음 |
| 기존 업무 | 제품 등록/게시/특가, 협업체 독립 조건·승인, 콘텐츠 저장/커뮤니티/서비스 제공 분리, 주문 payment-first·배송·재고·정산 경계를 유지 |

schema/migration·dependency/lockfile·배포 설정·권한 정책·AI 수정 0. 새 서버 원장·초안 테이블·프레임워크 없음. 운영 DB·실제 계정·실결제·송금·운영자 승인 실행 0.

## 검증

| 검사 | 결과와 한계 |
|---|---|
| 공통 패키지 | pinned Node 22.18.0/pnpm 10.25.0, frozen install 및 `build:packages` PASS. 초기 API build:deps는 content-editor 선행 빌드 부재로 실패했으며 정본의 전체 의존 빌드 후 해소 |
| Neture 전체 | Vitest 143 files · 1,258 tests PASS. 이후 초안 삭제 확인 1건 추가와 모바일/안내 최종 보완은 관련 4 files · 39 tests로 검증(전체 결과에 중복 합산하지 않음) |
| 공급자 API·경계 | focused Jest 7 suites · 242 tests PASS. 제안 조건/이력 20건(신규 재시도 3건 포함), 콘텐츠 수신·사업자 정보·정산·Supplier/B2B 정본 경계 포함 |
| PostgreSQL 주문 쓰기/조회 | 별도 loopback DB의 쓰기 안정화·통합 조회 2 suites · 34 tests PASS. 재고 충돌·배송 효과·정산 중복/rollback·호환 조회 보존 |
| 실제 주문 왕복 | 표준 `run-supplier-store-fixture.ts`: canonical baseline+전체 incremental prefix 지문 일치, 단일 suite 7 tests PASS, `Fixture cleanup PASS: database count 0`. 실제 checkout/bridge·배송·정산 범위 확인. 합성 데이터이며 실제 PG·은행·운영 검증 아님 |
| HTTP 경계 | 신규/재사용 201/200, 인증/공급자 scope 선행, 기존 모집 종료 410·이력 조회: 2 suites · 7 tests PASS |
| 공통 화면 | pharmacy-management 7 files · 54 tests PASS |
| 타입/빌드 | API 전체 noEmit 및 API production tsc build PASS. Neture production build PASS. 기존 큰 chunk 경고 유지 |
| lint | 변경 runtime·신규 테스트 오류 0. 기존 neture-pharmacy.routes.ts의 미사용 `_next` 경고 1건 유지 |
| 브라우저 | 실제 production bundle, Chromium 1440px/390px. 두 협업체 중 첫 응답 유실 → 부분 성공 → reload → 동일 payload/UUID로 확인. HTTP 시도 3회·접수 2건, 성공분 재전송 0, 페이지 오류·문서 가로 넘침 0. 모바일 표 내부 가로 스크롤 확인 |
| 문서/차이 | 신규 문서 링크·민감정보·공백·명시적 staged scope 검사. 최종 실행/인계 결과는 아래 Git 절 참조 |

브라우저 인증·API·응답 유실은 격리 fixture다. 최초 로컬 main-host 진입은 기존 호스트 이전 게이트로 막혀, 공급자 host를 격리 라우팅으로 local bundle에 연결한 후 통과했다. 운영 host에 실제 요청·로그인·업무 쓰기는 하지 않았다. DB 검증은 합성 자료의 실제 PostgreSQL 트랜잭션이며 브라우저 fixture와 구분한다.

API 첫 회 실행에서 전용 URL/port 미지정인 3 suites·41 tests는 skip됐다. 이후 전용 DB를 준비해 쓰기/조회 34건과 표준 왕복 7건을 실제 실행했다. skip을 PASS로 합산하지 않는다. 최초 Neture 전체 실행의 경고 locator 1건 실패는 새 보관 경고와 상품 오류 경고가 함께 존재하기 때문이며, 검증하려던 상품 오류 문구를 특정한 뒤 전체 재통과했다.

## Consumer Impact Matrix

| 소비처/계약 | 영향 | 검증 |
|---|---|---|
| Neture SupplierProposalDrafts → shared createProposal | optional requestId를 전송 | 컴포넌트 39건 묶음, 실제 DB 동시 요청·HTTP 201/200, PC/mobile browser |
| Neture 공급 제안 목록 | 복원 scope 확인과 모바일 표 | 실제 페이지 회귀·목록 응답 순서·browser |
| Neture 약국 입력 선택지/이벤트 | 같은 API object의 다른 메서드, 계약 불변 | 전체 Neture 테스트·빌드 |
| 공통 Neture/KPA/Store/협동조합 운영자 제안 심사 | operator API·공통 컴포넌트 동작 불변 | 공통 pharmacy-management 54건·API 제안 승인/종료 이력 DB 테스트 |
| raw-source 정본 소비처 | 기존 Supplier/B2B 경계 유지 | supplier-domain-boundary 및 b2b-supplier-to-store-order-canonical-contract PASS |

수정한 shared 파일은 api.ts의 optional 입력 필드 2줄뿐이다. 다른 서비스 wrapper/route/메뉴·공용 editor는 수정하지 않았다. 전 서비스 production 배포·각 서비스 운영 smoke를 수행했다는 뜻은 아니다.

## 문서 정합

[현행 업무 안내](../guides/SUPPLIER-BUSINESS-WORKFLOW-CURRENT-V1.md)에 현재 메뉴·업무 순서·재시도·초안·세금계산서 범위를 정리했다. FROZEN의 과거 IA/프로그램 명칭 차이는 별도 개정 대상으로 남기고 본문·canonical index·과거 WO/CHECK는 수정하지 않았다. 특정 운영 Supplier owner 복구와 이후 테스트 계정 smoke를 같은 대상의 완료 증거로 합성하지 않는다.

## 정리·Git 인계

- 격리 review schema 잔존 0. 표준 왕복 DB 삭제 0건 잔존 확인. 이후 이번 전용 PostgreSQL을 정지하고 자체 cluster 디렉터리 전체를 제거해 나머지 합성 업무 자료도 남기지 않았다. 기존 공용 DB/서버는 변경하지 않았다.
- 브라우저 context 종료. production preview도 최종 검증 후 정지했다. 합성 스크린샷·요약/실행 로그는 저장소 밖 `/workspace/artifacts/supplier-business-closeout` 및 `/tmp/supplier-closeout-*`에 보관한다.
- 구현 `18e2bf82df28e71a36448f0e327d734eca028fd3` push 및 원격 일치를 확인했다. 기준 main과 push 직전 main은 `7dc02646da`로 동일하다. 마감 기록의 최종 SHA는 완료 보고에서 확인한다. PR·원격 CI/Sonar·main 통합·배포는 이번 사용자 범위 밖이다.
- 작업공간은 KEEP: main 미통합이며 검토·후속 수정 인계에 필요하다.

## 통합 후보 검증 — 2026-10-23

사용자의 main 병합·배포 지시로 같은 작업 브랜치를 통합 담당 공간에서 계속 사용한다. 최신 main `e20c00f453`를 merge했다. 공급 제안 서비스의 충돌은 재시도 UUID/동시성 보호와 최신 main의 협업체 상태·대상 회원 검증을 결합한 후보로 해결했다. main의 다른 서비스·공통 API·의존성/배포 변경은 유지했다.

정책 판정 대기: main PR #779와 commerce 설계 §17-3은 대상 약국의 협업체 active 가입 검사와 결제 직전 제안/가입 재검사를 추가했다. 이전 사용자 결정·이 WO의 개발 범위와 다르므로 두 항목을 사용자에게 확인했다. 현재 후보가 이 검사를 보존하는 것은 사용자 결정 확정을 뜻하지 않는다. 답변 전 main 병합·배포는 하지 않는다. 과거 개발 기록의 ‘추가 검사 없음’은 당시 기준 main에 대한 결과로 보존한다.

통합 후보의 실제 PostgreSQL 제안 조건/재시도 및 HTTP 2 suites·23 tests PASS. 공급자 화면 12 files·147 tests PASS. 첫 실행은 기존 프로필 저장 완료 타이머가 unmount 뒤 React 상태를 갱신해 `window is not defined` 오류가 발생했다. 마지막 알림 타이머 교체·unmount cleanup 및 늦은 응답의 UI 갱신 방어를 추가하고 타이머 해제 회귀를 포함해 오류 없이 재통과했다. 전체 타입·CI·리뷰의 최종 상태와 정책 판정은 이후 통합 결과로 구분한다.

검토 PR: #781 (draft). 운영 migration·운영 DB 쓰기·사용자 대신 승인 처리 없음.
