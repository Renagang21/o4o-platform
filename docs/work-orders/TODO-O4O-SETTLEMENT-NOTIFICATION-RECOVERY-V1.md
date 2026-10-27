# 정산 알림 실패 확인·재처리 보완 TODO

> 상태: COMPLETED (개발·검증 완료, push 인계) · 작성일: 2026-10-27 (KST)
> 사용자 지시: 개발·검증·push, main 병합 전 종료. AI·실제 송금·운영 쓰기·배포 제외.
> 기준 main: e96c4a7934 · branch: wo/settlement-notification-recovery

## 최초 TODO

- [x] 정산 paid 전이·알림 저장/SSE·관리자 권한·사용자 삭제·보존 경계를 조사한다.
- [x] 정산 결과와 독립적인 최소 처리 상태·실패 코드·시도 횟수, 과거 기록 불명 상태를 확정한다.
- [x] 지급→처리 대기의 원자성, 알림함 저장→완료의 원자성·동시 재시도 멱등성과 SSE 분리를 구현한다.
- [x] 기존 관리자 정산 상세에 상태 확인·명시적 재처리·실패/결과 불명 재조회 동선을 연결한다.
- [x] migration 정의·기존 prefix 보존·새 지문·empty down/up, 실제 PostgreSQL·HTTP·화면/PC/mobile·타입/빌드 검증.
- [x] CHECK·이용 안내·문서 정합 후 한 작업 묶음으로 commit/push·원격 HEAD 확인. main merge/배포는 하지 않는다.

## 조사 후 구현 계약

- 기존 settlement.paid/in_app 알림만 보완한다. 지급 표시는 기존 업무 상태이며 은행 송금 확인이 아니다. 계산/승인/지급 금액과 전이는 유지한다.
- 새 domain 처리 원장은 settlement_id·pending/failed/delivered·시도 횟수·고정 오류 코드·시각/저장 건수만 기록한다. 금액·계좌·본문·수신자/관리자 ID는 복제하지 않는다. 정산 삭제 시 종속 삭제하며 독립 개인정보 보존기간/금융 정책은 신설하지 않는다.
- 새 지급 전이와 pending 생성은 한 SQL/트랜잭션이다. 이후 알림 저장 실패는 지급을 되돌리지 않고 failed로 남긴다. 프로세스 중단 시 pending이 남아 명시적 재처리가 가능하다. schema 미적용이면 지급 전이도 함께 실패하며 메모리 fallback은 없다.
- 실행 시점의 기존 canonical 공급자 owner/fallback resolver를 재사용한다. 수신자가 없으면 명시적 실패다. 모든 수신자 알림과 delivered 상태를 같은 DB 트랜잭션으로 저장한다. 부분 INSERT 실패는 savepoint로 전체 알림을 취소하고 실패 상태를 남긴다.
- 같은 정산의 동시 실행은 행 잠금으로 직렬화한다. delivered 재요청은 알림을 만들지 않는다. 사용자가 알림을 읽거나 삭제해도 완료 상태를 되돌리지 않는다. SSE는 commit 뒤 best effort이며, delivered는 알림함 저장 완료일 뿐 실제 열람/기기 수신 증거가 아니다.
- 과거 paid인데 원장이 없는 행은 legacy_unknown이다. 실패로 추정하거나 자동 backfill/재발송하지 않는다. 재처리는 추적 가능한 새 pending/failed와 paid 상태에서만 허용한다.
- 기존 neture:admin 정산 권한 아래 상태 조회/수동 재처리를 제공한다. 공급자/일반 직원에게 관리 쓰기를 열지 않는다. 자동 scheduler·이메일/외부 발송 채널·재송금·일괄 재처리는 추가하지 않는다.
- migration 정의는 사용자 요청 개발 범위이며 실제 적용은 task 전용 PostgreSQL뿐이다. 운영 적용/배포는 별도 통합 단계다. 새 표에는 기존 계정 제거 writer fence를 연결하며 전체 파기 capability 준비 완료를 주장하지 않는다.

## 완료·통합 인계

[CHECK](../checks/CHECK-O4O-SETTLEMENT-NOTIFICATION-RECOVERY-V1.md)와 [이용 안내](../guides/O4O-SETTLEMENT-NOTIFICATION-RECOVERY-V1.md)에 구현·검증·운영 적용 전제와 한계를 기록했다. 실제 DB 22건, 기존 단위 121건, HTTP 16건, 전체 Neture 1,392건과 타입·빌드·PC/mobile 확인을 완료했다.

종료 시 원격 main은 60bec2ef4f(PR #851)로 이동했다. 기준 e96c4a7934 이후 변경은 funding/cooperation 영역으로 이 작업의 수정 경로 및 migration registry와 겹치지 않는다. 개발 담당 범위에서 자동 main 통합은 하지 않았으며 최신 main 통합 후 필요한 재검증은 통합 담당에게 인계한다. commit/push 원격 일치는 종료 보고를 따른다.
