# 공급자 보완 요청·이력 / 펀딩 입금·이행 예외 관리 TODO

> 상태: 개발·검증 완료 / push 인계 대상 · 작성일: 2026-10-16
> 사용자 요청: TODO 작성 → 코드·문서 점검 → 개발·검증 → push. PR 생성·병합·배포 제외.
> 시작 main: `daad0563c` · branch: `wo/supplier-funding-operator-exceptions`

## 최초 TODO — 구현 전 대조

- [x] 공급자 운영 scope·심사/서류·알림·이력 저장·본인 재제출 경로를 조사한다.
- [x] 보완 요청의 항목/사유·공급자 확인/재제출·운영자 재검토를 기존 상태/원장과 대조한다.
- [x] 펀딩 입금·이행·포럼 연계·단계·기한 및 처리 증빙을 조사한다.
- [x] 기존 데이터로 판정할 예외와 새로운 정책·저장이 필요한 항목을 구분해 이 TODO를 보완한다.
- [x] 필요한 서버·화면을 구현하고 실패 입력 보존·중복 실행·서비스 경계·이력 회귀를 검증한다.
- [x] 타입·빌드·PC/mobile 격리 화면 검증, CHECK/문서 정합 후 commit·push·인계한다.

## 경계

전체 관리자·약사회 분회 제외. 현행 서비스별 권한과 원장·공급자 5업무축을 유지한다.
새 자동 제재·자동 승인·임의 만료/SLA·실제 송금/환불 실행은 도입하지 않는다.
운영 DB write·migration 적용·운영 계정 변경은 수행하지 않는다.
필요한 기능 코드·테스트와 migration 정의는 검토하되 실제 적용과 배포는 통합 담당에게 인계한다.
환경 setup 스킬의 기존 checkout 재사용 지침에 따라 clean checkout에서 전용 branch를 사용한다.

## 코드·정본 대조 결과와 확정 TODO

대조 정본: 역할별 업무공간 §4/5, Supplier Domain §2/6/7/Business Profile,
Market Trial content-only 경계·오프라인 입금/감사 정책·초기 운영 모델, 개인정보 보유기간 기준.
실제 소비처: 공급자 운영 승인 Drawer, 공급자 본인 프로필, 펀딩 운영 목록/상세/참여자 표.
공통 UI·회원 원장·상품 승인 원장은 변경하지 않는다.

| 조사 결과 | 확정한 개발 범위 |
|---|---|
| SupplierStatus=PENDING/ACTIVE/REJECTED/INACTIVE, rejected_reason은 반려용. 보완 요청 저장/응답/확인 원장이 없음 | `neture_supplier_review_requests` 전용 보완 업무 테이블과 additive migration 정의. 요청 항목·사유 → 본인 보완 제출 → 운영자 검토 완료. 보완이 승인/정지 상태를 바꾸지 않음 |
| supplier operator는 requireSupplierScope, 본인은 requireLinkedSupplier의 조직 관계 판정 | 기존 guard 아래 API 연결. 요청 body의 supplierId/actorId를 신뢰하지 않음. 다른 공급자 요청 접근·비활성/Demo 변경·중복/늦은 제출 방어 |
| 승인/반려/기본정보 변경 action_logs 존재, 전용 대상 이력 화면 부재 | 현재 공급자 보완 요청 목록/이력과 허용된 기존 처리 로그만 표시. 신규 변경과 감사 insert는 같은 트랜잭션 |
| 입금은 FundingPaymentRecordService가 paidAt 보존·confirmedAt 갱신·원자적 감사 구현 | 기존 입금 API 재사용. 송금 참고값 원문을 예외 목록/감사에 노출하지 않음 |
| 이행은 rewardStatus UPDATE만 수행, 감사 이력 없음 | 같은 원장에 행 잠금+이행 변경 감사 원자성 보완. 권한·전환 가능 상태는 유지 |
| 모집 endDate는 송금/이행 마감일이 아님. 정산 mutation은 409 차단 | 기한 초과를 임의 판정하지 않음. 입금 확인 대기/실패, 확인 금액 누락/참여금 불일치, 결과 확정 이후 이행 미확인, 이행 완료·입금 미확인을 현재 값에서 조회 |
| 포럼 연계 실패 목록·복구 이미 존재 | 기존 탭 유지. 새 입금·이행 예외 탭에서 실제 참여자 상세로 연결하고 현재 기록 수정 후 재조회로 예외 해소 확인 |

### 확정 구현·검증 TODO

- [x] 공급자 요청 저장/동시성·전이·감사·허용 이력 조회·본인 scope, migration 정의 구현.
- [x] 운영자 요청/검토 UI와 공급자 응답 UI, 저장 성공/조회 실패·입력/대상 보존 구현.
- [x] 펀딩 예외 판정·페이지 조회 API와 운영자 목록 탭·대상 참여자 상세 연결 구현.
- [x] 펀딩 이행 기록 원자적 감사와 참여자 이력 확인 구현.
- [x] 단위/API·격리 SQL 검증과 UI 실패/중복/늦은 응답·권한 회귀 검증.
- [x] API/Neture 타입·빌드, PC/mobile 격리 화면 검증, 문서 정합·commit/push.

신규 API·migration 정의는 사용자가 요청한 기능 구현 범위다. migration 실행은 로컬 전용 임시 DB에서만 검증하고 운영 적용은 인계한다.
새 담당자/SLA/금융정책·신고·서버 간 공통 workflow는 추가하지 않는다. 보완 이력의 보존·계정 제거는 기존 개인정보 정책을 따르며 무기한 보존을 약속하지 않는다.

## 완료·인계 기록 (2026-10-16)

구현 전 위 대조표로 저장·권한·정책 경계를 확정한 뒤 개발했다. 운영자 보완 제출 대기 큐도 연결하여 제출 건을 찾을 수 있게 했다.
계정 제거 호환성을 위해 신규 테이블에 기존 `account_erasure_write_fence` 트리거를 연결했다.
자유 입력의 개인정보는 기존 계정 제거 잔존 검토 대상이며, 자동 삭제·영구 보존 정책은 추가하지 않았다.

검증: Neture 112개 파일/1,060개 테스트, 관련 API 83개·공급자 경계 45개·전용 PostgreSQL 통합 6개 통과.
API/웹 타입·빌드, migration 계약 21개·소스 계약 36개, PC/mobile 8개 흐름 통과.
상세 근거와 배포 전 migration 유의사항은 [CHECK](../checks/CHECK-O4O-SUPPLIER-FUNDING-OPERATOR-EXCEPTIONS-V1.md)를 따른다.
종료점은 branch push이며 PR·CI 운영·병합·배포·운영 DB 적용은 통합 담당 몫이다.

## PR #653 blocker 후속 (2026-10-16)

- [x] Codex P1: `fulfilled→closed` 이후에도 입금 확인·이행 미확인 의무 유지, 모집 실패 자동 종료 제외 (`statusHistory` 전환 기록 기준).
- [x] Codex P2: 보완 요청 검토 완료는 잠금 후 최신 상태 `submitted` 에서만 허용, UI 는 제출 전 완료 동작 차단.
- [x] Sonar Reliability: 미처리 Promise 1건(BUG)·async 반환 계약 3건 수정. 규칙·기준 완화 없음.
- [x] 단위·통합(PostgreSQL 격리)·타입·빌드·lint·PC/mobile 브라우저 재검증. 상세는 CHECK "PR #653 후속 수정".
- [ ] (통합 담당) #652 통합 순서에 맞춘 manifest·expected-schema fingerprint 재산출, 운영 migration 승인.
