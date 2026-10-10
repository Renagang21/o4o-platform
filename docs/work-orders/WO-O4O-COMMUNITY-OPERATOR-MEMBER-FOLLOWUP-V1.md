# 개별 커뮤니티 운영자·회원 관리 후속 TODO

> **상태**: IMPLEMENTED (운영 적용·배포 미수행)
> **작성일**: 2026-10-10 · **최종 갱신**: 2026-10-10
> **근거 WO/IR**: 사용자 TODO → 문서·코드 조사 → TODO 수정 → 개발·push 지시

## 초기 TODO (조사 전 초안)

- [x] 정본의 서비스 역할과 개별 커뮤니티 역할·회원 관리 정책 확인
- [x] 화면 → API → 권한 판정 → 데이터 저장 흐름 조사
- [x] 조회·승인·반려 및 정지·해제·탈퇴의 현재 제공 범위 확인
- [x] 개별 admin/operator 분리 필요성·기존 operator/member 계약 확인
- [x] 운영자 공백의 복구 경로와 지정 후보의 실제 이용 자격 확인
- [x] 지정·해제·가입 심사의 이력 구조 확인
- [x] 정상·결함·레거시·정책 미정으로 판정하고 TODO 수정
- [x] 수정 TODO에 따라 승인된 정책의 구현 결함과 관련 문서 정비
- [x] 역할·커뮤니티·서비스 경계 및 회귀 검증
- [x] 범위 점검·커밋·push
- [x] PR CI/review 최종 확인

## 경계

서비스 역할 정책과 개별 커뮤니티 역할 정책을 혼합하지 않는다.
새 역할·가입 상태·이력 원장을 조사 전에 결정하지 않는다.
운영 DB 변경·main 병합·배포는 이번 push 작업에 포함하지 않는다.

## 조사 결과와 수정 TODO

조사 기준: `origin/main` 847ee5d6bd. [역할 정본](../baseline/O4O-ROLE-WORKSPACE-ARCHITECTURE-V1.md) §5와 [회원 관리 표준](../platform/operator/O4O-OPERATOR-USER-MANAGEMENT-STANDARD-V1.md) §1.1을 확인했다.

| 항목 | 판정·근거 | 처리 |
|---|---|---|
| 서비스/개체 역할 분리 | 정상. 중앙 role_assignments와 community_memberships 분리 | 유지 |
| 중앙 서비스 운영자 가입 심사 | 정상. community-service-operator-access와 scope guard가 현재 역할·메인·서비스 자격을 확인 | 유지·회귀 검증 |
| 개별 지정·해제 | 정상. 서비스 admin만, active 개체 회원·메인·서비스 자격 및 마지막 운영자 보호 | 유지·회귀 검증 |
| 운영자 공백 | 서비스 admin/operator가 개별 가입 없이 심사 가능. admin은 자격 있는 active 회원을 후임으로 지정 가능 | 기존 복구 경로 문서화. 적격 회원이 없으면 중앙 계정/서비스 관리 후 심사 |
| 신청자 메인 자격 | 결함. 신청 시 확인하지만 개설/가입 승인 시 재확인 누락 | 승인 트랜잭션에서 쓰기 전에 재확인 |
| 자격 오류 응답 | 결함. 메인 자격 전용 오류를 lifecycle 응답 변환기가 처리하지 않음 | 기존 오류 코드와 403/409를 API에 전달 |
| 이력 | 개설 신청은 심사자·시각·사유, 개체 가입은 승인자·시각만 저장. 반려 사유와 지정 변경 이력 원장 없음 | 새 저장 계약이 필요한 후속 정책·설계 항목 |
| 개별 admin/operator·정지·해제·탈퇴 | 정책 미정. 현재 개체 role은 operator/member, status에는 suspended 없음 | 임의 확장하지 않고 후속 결정 |
| 서비스와 개별 가입 경계 | 정상. ensureServiceMembership는 최초 생성만 허용, 기존 비활성 상태 복구 금지 | 유지·회귀 검증 |

### 구현 TODO (수정본)

- [x] 개설/가입 승인 시 신청자의 현재 메인 자격 재검증
- [x] 메인 자격 오류를 403/409와 NETURE_MEMBERSHIP_REQUIRED로 응답
- [x] 신청 후 정지·해지·이메일 미확인·계정 누락·조회 실패 회귀 및 쓰기 없음 검증
- [x] 현행 권한·운영자 공백 복구 절차와 정책 미정 사항 문서 정합
- [x] 기존 역할·커뮤니티·서비스 경계 테스트 및 API 타입 검사
- [x] 정적 guard·민감정보·diff·staged 범위 점검
- [x] 커밋·push
- [x] PR CI/review 최종 확인

새 DB 구조나 역할 추가 없이 확정된 정책의 승인 시점 결함을 수정한다.
실제 운영 DB·계정 변경 및 main 병합·배포는 수행하지 않는다.

## 후속 결정 항목 (이번 구현과 구분)

- 개별 admin/operator 분리와 커뮤니티 단위 정지·해제·탈퇴: 권한 주체·마지막 운영자 보호·기존 가입 상태 전이를 먼저 확정해야 한다.
- 반려 사유 보존·운영자 지정/해제 이력: 신규 저장 계약·보존 범위·이력 열람 주체를 먼저 확정해야 한다.
- 후보 목록의 메인 자격 표시: 현재 서버 지정 API는 차단하지만 화면은 서비스 상태만 표시한다. 판정 정보를 노출하는 응답 계약과 표시 방식을 후속으로 정한다.

확정 전에는 기존 operator/member와 조회·승인·반려 범위를 유지한다. 새 기능을 완료 처리하지 않는다.

## 로컬 검증

- 권한·역할 지정·서비스 운영자·lifecycle·HTTP 응답 Jest: 5 suites / 127 tests PASS.
- 승인 검증 위치를 모든 개설 write보다 앞으로 옮긴 최종 변경 후 관련 2 suites / 79 tests PASS (위 집합과 중복).
- 공통 패키지 빌드 및 빌드 완료 후 API 타입 검사 PASS.
- unsafe route 1144 files / 위반 0, 문서 민감정보 3816 files / 위반 0, diff 공백 검사 PASS.
- UI 파일·DB 구조 변경 없음. 모의 저장소·HTTP 요청 검증이며 실제 DB 동시 변경 및 실계정 E2E는 실행하지 않았다.
- 최초 타입 검사는 공통 패키지 빌드 완료 전 실행되어 모듈 누락으로 실패했고, 빌드 완료 후 재실행에서 통과했다.

작업 branch는 `wo/community-operator-next`이며 push 후 PR CI/review 상태를 별도로 확인한다.
main 통합·배포 없이 작업 checkout을 KEEP한다.

코드 커밋 `6df45c5939`를 최신 main `0f66555b4f` 위에 충돌 없이 올려 원격 작업 branch에 push했다. PR 검증 결과는 PR 최신 HEAD의 실제 checks와 review를 기준으로 한다.

## 사용자 범위 추가와 2차 TODO

사용자가 개별 admin/operator와 회원 제재 기능도 이번에 설계하도록 지정했다.
앞선 결함 수정은 유지하고 [개별 회원 관리 설계안](../design/DESIGN-O4O-INDIVIDUAL-COMMUNITY-MEMBER-ADMIN-V1.md)을 추가한다.
새 기능은 설계와 런타임 구현을 구분한다.

- [x] 현재 entity·DB CHECK 제약·scope 조기 통과·workspace canManage 및 UI 타입 조사
- [x] 개별 admin/operator·중앙 서비스 역할 권한표 설계
- [x] 정지·해제·탈퇴 상태 전이와 다른 원장 불변 경계 설계
- [x] 마지막 유효 admin 보호·중앙 복구·동시 처리 설계
- [x] 변경 이력·migration·기존 역할 전환안 및 영향 소비처 정리
- [x] 권한표와 기존 operator 전환 정책 사용자 확인
- [x] 설계 문서 검증·커밋
- [x] 설계 문서 원격 push 확인

### 설계 이후 별도 구현 TODO

- [ ] 자기 탈퇴 범위·이력 보존/열람 정책 확정
- [x] 새 역할·상태·이력 migration 및 테스트 DB 전환 검증
- [x] guard·지정 API·제재 lifecycle·이력 원자성 구현
- [x] 운영자 지정·회원 관리 화면 정비와 desktop/mobile 검증
- [x] 역할별 API·기존 로그인·다른 원장 불변·동시성 검증
- [ ] 운영 migration 적용 승인·main 병합·배포·실계정 검증

이 후속 구현을 이번 승인 자격 수정의 완료로 간주하지 않는다.

## PR 리뷰 보완 TODO

- [x] P2: 자격 SELECT와 승인 쓰기 사이 동시 정지 간격 제거 — 승인 트랜잭션에서 users → neture service_memberships 순서로 FOR UPDATE 후 판정. users FK 참조 삽입도 사용자 잠금 동안 대기한다.
- [x] 보완 후 자격·승인·권한 회귀 및 API 타입 검사 재실행
- [x] 리뷰 보완 코드 push
- [x] PR 최신 HEAD 검증

잠금 대기 후 먼저 커밋된 정지를 읽는 모의 회귀를 추가한다. 실제 PostgreSQL 잠금 스케줄링은 이 환경에 로컬 서버가 없어 검증하지 않았다.

리뷰 보완 후 Jest 5 suites / 129 tests 및 API 타입 검사 PASS. 정적 검사도 재실행했다. 설계 문서는 `b4c73611fd`에 push되어 있으며 권한표·기존 역할 전환은 후속 사용자 답변으로 확정했다. PR 최신 HEAD CI/review 결과는 PR을 기준으로 확인한다.

## 설계 정책 확정

사용자가 개별 operator 조회·승인·반려 / admin 정지·해제·탈퇴,
기존 개별 operator → admin 전환, 지정·회수는 community 서비스 admin 전용으로 확정했다.
설계 상태를 DESIGNED로 갱신하고 역할 정본과 회원 관리 표준에는 런타임 구현 대기로 반영했다.
새 기능 런타임 개발·migration은 아직 수행하지 않았으며 위 설계 이후 구현 TODO로 추적한다.
권한 유효기간 SQL 회귀 1 suite / 18 tests도 추가 실행하여 PASS했다.

## 확정 정책에 따른 런타임 구현 결과

초기 설계 대기 기록 이후 사용자가 권한·기존 역할 전환을 확정하여 원래 개발·push 요청에 이어 구현했다.
개별 admin/operator, admin 전용 제재, 역할·심사·제재 이력, UI 상태 필터·역할 선택·이력 조회를 구현했다.
운영자 공백은 중앙 서비스 admin의 적격 후임 지정과 기존 중앙 심사 경로로 복구한다.
신규 migration은 기준 bootstrap + 21 기존 incremental 이후 적용하며 지문은 6218행 / `30be348978adb3aa0b5b0c378517b232ee36038c6bdbbdac70780d3c8f86f4bb`다.

- [x] 확정 개별 역할·제재 정책의 코드·문서 구현
- [x] 실제 PostgreSQL 역할 전환·원장 불변·이력 rollback·동시 보호 검증
- [x] API 타입 검사 및 Neture production build
- [x] 회원 관리 UI Vitest 및 desktop/mobile mock API browser smoke
- [x] 최신 main 통합 후 최종 로컬 회귀
- [x] 구현 커밋 push·PR latest HEAD CI 확인

자기 탈퇴와 이력 보존 기간/자동 삭제는 이번 admin 관리 탈퇴 구현과 별도 정책으로 남긴다.
운영 migration·main 병합·배포는 push 완료 이후의 별도 승인 범위다.

최신 main `2a8b80cf24`를 충돌 없이 통합했다. 플랫폼 전역 bypass만으로 개별 역할 지정 권한을 얻지 않도록 명시 community 서비스 admin 판정을 추가했다.
최종 검증은 [CHECK](../checks/CHECK-O4O-INDIVIDUAL-COMMUNITY-MEMBER-ADMIN-V1.md)에 기록했다. 이전 단계의 정책/구현 대기 기록은 단계 이력이며 현재 구현 상태는 이 절과 CHECK를 따른다.

구현 HEAD `b898a354488894f1ceeb41cde4c22f21057d0668`의 GitHub API Jest 3개 shard, 화면 빌드, Code Quality, CodeQL, CI Gate, SonarCloud Code Analysis가 모두 SUCCESS였다. 승인 잠금 리뷰 스레드도 해결되었다. 이 완료 기록 이후 문서만 변경된 최종 HEAD의 checks는 [PR #412](https://github.com/Renagang21/o4o-platform/pull/412)에서 확인한다.
