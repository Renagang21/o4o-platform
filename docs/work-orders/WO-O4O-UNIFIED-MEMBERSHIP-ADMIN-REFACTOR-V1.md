# WO-O4O-UNIFIED-MEMBERSHIP-ADMIN-REFACTOR-V1

> **상태**: COMPLETED · 개발·로컬 검증·commit/push 및 PR 인계 범위. main 미병합
> **작성일**: 2026-10-28 · **최종 갱신**: 2026-10-28 (Asia/Seoul)
> **기준**: [운영 책임 V2](../baseline/O4O-ROLE-WORKSPACE-ARCHITECTURE-V2.md) · 사용자 전체 구현 지시 및 수동 약사 자격 승인 결정
> **실행 경계**: 하나의 TODO·개발 브랜치. main 병합·운영 DB 변경·migration 운영 적용·배포 없음.
> **브랜치**: `wo/unified-membership-admin` · 최초 main `87f56e75b7b1a2ebb7bfe05ca9eabf4bf36700ad`

## 전체 TODO

- [x] WO-1 정책 문서 변경을 전용 개발 브랜치에 포함.
- [x] 일반·전문·조직·사업·수강 접근 조건을 대조하고 보호 조건을 선행.
- [x] 기존 개인 프로필로 공통 약사 자격 신청·수동 심사·반려·승인 취소 구현.
- [x] 자기 기입·약국/분회 승인만으로 약사 전용 기능 허용 금지.
- [x] 약국 경영에 공통 약사 자격과 해당 약국의 경영 권한 동시 검사.
- [x] 일반 커뮤니티·수강자의 중복 가입 축소. 명시적 정지·탈퇴·운영·강사·조직·사업·실제 수강 조건 유지.
- [x] 중앙 위임과 단순 서비스 역할 보유 구분. 기존 역할·초대·본인 수락·회수 원장 재사용.
- [x] 중앙 Google 전용 진입과 전체 관리자 전용 영역 분리.
- [x] 직영 운영 화면을 기존 UI/API로 연결. 독립 사업·사업자 자기 업무 보존.
- [x] 복수 위임·부분 회수·권한 만료·독립 조직 격리 및 자격 상태 전이 검증.
- [x] 관련 UI 소비처 테스트·빌드, PC/모바일 합성 browser 검증.
- [x] forward migration 2개 준비, 임시 DB 전체 적용·재실행·fingerprint·status 검증.
- [x] 정본·코드 정합, 미결 정책·운영 적용 영향 기록.
- [x] 범위 검사·commit·push, 최신 main을 작업 브랜치에 반영하고 PR #867 생성.
- [x] 자동 리뷰 지적 4건 수정 및 회귀 검증·스레드 정리. CI Gate의 현재 상태는 아래 PR에서 확인하고 main 병합 전 인계.

## 구현과 재사용

| 영역 | 구현·재사용 | 유지한 경계 |
| --- | --- | --- |
| 공통 계정 | 기존 `users`·Google/카카오/이메일 인증·명시적 계정 연결 그대로 사용 | 이메일만으로 자동 병합하지 않음. 일반 회원의 로그인 제공자 제한 추가 없음 |
| 일반 커뮤니티 | 정상·이메일 확인 공통 회원은 중복 서비스 가입 없이 참여 | 서비스 정지/탈퇴, 운영 역할+membership, 비공개 사업/조직 조건 유지 |
| 일반 강의 | learner 접근은 공통 회원+현재 제재 검사 | 강사·운영자는 기존 membership+역할. 비공개·미발행 강의, 유료·승인 수강·실제 enrollment 검사 유지 |
| 약사 자격 | 기존 `kpa_pharmacist_profiles`에 상태/사유, 기존 검증자·시각·`action_logs` 재사용 | 담당자의 별도 면허 근거 확인+사유 필수, 자기 승인 금지, 버전 충돌 거부, 동일 면허 중복 승인 금지 |
| 약국·직원 | 약국 승인/재활성화와 경영 가드에 개인 자격 연결 | 신청 면허와 승인 자격 일치, 조직 경영 권한·사업 증빙·계약 유지. 일반 직원은 개인 약사 자격 없이 기존 위임 업무 수행 |
| 약사 상담 | 개인의 승인된 약사 자격+현재 계정+선택 매장의 전문 기능 확인 | 경영자의 확인 표시, 다른 매장의 권한 또는 자기 기입 번호로 대체 불가 |
| 중앙 위임 | 기존 서비스별 역할과 초대의 `scope_key=o4o-direct`, 수락 후 역할 할당 `scope_type=o4o-direct` | 새 전역 Operator 없음. 독립 사업 역할 제외. 일반 서비스 역할 재부여는 중앙 표식을 승계하지 않음 |
| 중앙 진입 | `/operations`, `/api/v1/operator/central-access` | 서버의 현재 계정·유효기간·membership·명시적 위임과 Google 세션 확인. 기존 `/admin`과 중요 상품 DB는 전체 관리자 전용 |
| 운영자 관리 | 직영 Admin·Operator 초대·조회·해제, 중앙 위임 기록 표시 | 단순 역할과 중앙 위임 기록 구별. 독립 사업 Operator 자체 지정 유지. 운영자 재위임은 중앙 Admin만 수행 |
| 직영 업무 | 기존 회원 콘솔·약국 심사·공급자 심사·펀딩 심사·강의 심사·문의함 연결 | 각 API의 서비스 권한·사업 조건을 별도 검사. 중앙 메뉴가 API bypass가 아님 |
| 콘텐츠·Partner | Community 편집·뉴스 수집/검토·게시판, Partner 신고·게시물·댓글·게시판·회원 UI를 공유 모듈로 추출 | 기존 호스트는 얇은 adapter 유지. Partner 사업 승인이나 폐기된 제휴·수수료 기능 복구 아님 |
| 연합회 | 기존 `neture:pharmcoop_*` 업무와 API 연결 | 개별 조합 회원·사업·비공개 자료는 해당 조합 운영자 담당. 전체 관리자 역할만으로 연합회 업무 자동 허용하지 않음 |

중앙 주요 경로는 `/operations/{serviceKey}/{area}`이며 `neture/qualifications`, `neture/pharmacies`, `supplier/suppliers`, `funding/funding`, `lecture/courses`, `community/editorial`, `community/boards`, `pharmcoop/federation`을 제공한다. 남아 있는 특화 업무는 기존 호스트로 연결하며 소비처 검증 전 기존 화면을 일괄 삭제하지 않는다. 강의 hard-delete와 회원 파괴적 작업은 중앙 공통 화면에서 노출하지 않는다.

자격 API는 `/api/v1/qualifications/pharmacist/me`(본인 조회/신청)와 `/review`(검토 목록), `/review/:userId`(검토 결정)이다. 검토는 Google 세션+중앙 위임된 `neture:admin/operator` 또는 전체 관리자만 가능하다. 공급자 등 다른 중앙 업무 위임은 자격 심사 권한을 주지 않는다. 사유는 신청자에게 안내되는 내용이며 면허 근거는 담당자가 별도로 확인한다. 신분증 업로드나 외부 면허 자동 조회는 구현하지 않는다.

## Core·DB 변경 범위

`CORE_CHANGE_REQUIRED`: 사용자 승인 범위 안에서 RBAC의 정식 `RoleAssignmentService.assignRole`에 중앙 위임 출처 전달·검증과 일반 재부여 시 중앙 출처 초기화와 직영 Admin·Operator의 동일 잠금만 추가했다. 기존 organization scope는 global로 바꾸지 않으며 조직 ID가 있는 중앙 부여는 거부한다. F9의 역할 할당 단일 원장·정식 write-path·잠금·권한 캐시 무효화는 유지한다. F10의 Auth/Membership/Approval/RBAC 전체 Freeze 해제를 뜻하지 않는다. 조직 PermissionService의 전역·조직 권한을 중앙 위임으로 확장하지 않는다.

forward migration만 추가했다. 과거 migration·baseline·기존 fingerprint는 변경하지 않았다.

1. `1793164501481-AllowCentralOperatingDelegation`: 기존 `chk_org_scope`에 직영 역할 allowlist의 `o4o-direct`+빈 조직 ID만 허용. 기존 global/organization 조건 유지. 활성 중앙 기록이 있으면 rollback 거부.
2. `1793165158540-AddPharmacistQualificationDecisions`: 기존 프로필에 `qualification_status`, `qualification_reason`, 상태·승인 근거 제약과 승인 면허 unique index 추가. 결정 기록이 있으면 rollback 거부.

기존 프로필은 `unrequested`이며 과거 `license_verified=true`도 새 승인으로 자동 전환하지 않는다. 면허 변경 시 기존 프로필 writer도 승인·사유·검증자·시각을 무효화한다. 검토 상태 변경은 `users.status`, 일반 membership 또는 독립 사업 역할을 변경하지 않는다. 면허·자유 사유의 SQL 오류 직렬화는 가린다.

**운영 적용 영향**: 새 schema와 API를 함께 적용해야 한다. 기존 약국 경영자/전문 기능 이용자도 공통 자격 수동 승인 전에는 해당 업무가 차단된다. 운영 전 중앙 검토 담당자 위임, 기존 대상자 확인·안내, 수동 검토 순서를 준비해야 한다. 이 개발 작업은 운영 자격 승인·backfill·migration·배포를 실행하지 않는다. 임의의 구버전 rollback으로 승인 기록을 지우지 않는다.

## 검증 기록

전용 임시 PostgreSQL 15·무작위 schema와 합성 사용자만 사용했다. 운영 계정·운영 DB·실제 Google/Kakao 인증·실메일 발송은 사용하지 않았다.

- PostgreSQL 권한·자격 통합 검증 22 tests 통과(실제 TypeORM writer 포함): 일반 역할의 중앙 자동 승격 거부, 독립 역할 제외, 복수 위임·부분 회수·membership 제재·기간 만료, 약사 직원의 선택 매장 경계, 자격 신청·반려·재신청·승인·취소, 자기 승인·중복 면허·오래된 버전·정지 계정 승인 차단, 면허 변경 무효화.
- migration: 새 canonical bootstrap+49 incremental 전체 적용, 재실행 no-op, status-only `DB_WRITES=0`, 최종 fingerprint `0834c1f1d5911e4a12ef86b24997a4b3038685d46821edfcc99020802fd0a986`(7,344행) 일치. migration contract 21 pass / 0 fail. fingerprint 첫 수집 시 UNREGISTERED 거부를 확인하고 실제 값 등록 후 별도 빈 DB에서 재검증했다.
- API 관련 회귀 26 suites / 372 tests 통과(추가 fixture 미제공 조건부 4 suites / 132 tests 제외). 이후 약국 계약·관리자 조회·실DB 자격 검증 4 suites / 152 tests 통과. 정식 role writer 회귀 5 suites / 57 tests도 통과했다. 전체 API suite를 실행하면서 기존 owner fixture의 자격 누락과 관리자 guard 인벤토리를 발견해 보완했다. 최초 전체 실행은 599 suites 통과 / 12 실패 / 66 제외(개발 중 소스 변경 전 결과 포함)였고, 수정된 안정 소스에서 실패했던 12 suites / 280 tests를 모두 재실행해 통과했다. 단일 최신 HEAD 전체 실행의 최종 판정은 PR의 CI 3 shards를 따른다. 제외된 DB·실사용 fixture 시나리오를 통과로 계산하지 않았다.
- Admin 44 files / 525 tests 통과. Neture 167 files / 1,423 tests와 새 본인 자격 UI 3 tests 통과. shared operator UI 30 files / 217 tests, Partner 7 files / 92 tests, Lecture 20 files / 83 tests 통과.
- API·Admin typecheck, Admin·Neture·Partner·Lecture production build 통과. 기존 chunk 크기/Browserslist 경고는 유지한다.
- Chromium 합성 API browser: PC 1,440px·모바일 390px에서 중앙 진입·타 업무 직접 URL 차단·실시간 회수·전체 관리자 영역 차단·면허 근거/사유를 포함한 승인·강의 상세 진입 동작 8 tests 통과. 개발 서버 파일 갱신 중 navigation abort가 한 번 발생하여 갱신 종료 후 재실행했다. 실제 SSO·cookie cross-domain 왕복을 검증한 것은 아니다.

## PR·리뷰·인계

[PR #867](https://github.com/Renagang21/o4o-platform/pull/867) · 브랜치 `wo/unified-membership-admin`. `7322f3897dfbdfb57f49ce0d67b1bdfb02c071ee`까지 main의 독립 변경을 충돌 없이 이 개발 브랜치에 반영했다. main 브랜치 변경은 아니다.

- 최초 리뷰의 공급자 `activationReady` 오해는 수정했다. 이 값은 프로필 보완 안내로만 사용하고 실제 승인은 기존 서버의 사업자 정보·증빙 조건이 결정한다. 불완전 연락처 프로필의 승인 버튼/요청 회귀 검증을 추가했다.
- 60초/focus 중앙 위임 재검증 시 동일 사용자의 업무 폼을 유지하고, 실제 위임 거부·인증 실패·사용자 변경에만 해당 업무를 제거한다. 작성 중 사유 보존·회수 후 제거 테스트를 추가했다.
- 서비스 역할까지 true인 공유 `isAdmin` 표시 값을 중앙 진입에 쓰지 않고, 초기 `/`·로그인 복귀는 정확한 `platform:super_admin` 여부로 전체 관리자/중앙 작업공간을 구분한다. 실제 브라우저의 대표 진입도 검증했다.
- 관리자 중앙 진입 API는 별도 인가 미들웨어로 보호하여 앞으로 추가되는 endpoint도 같은 검사를 상속한다. 인벤토리 예외 추가·검사 완화는 하지 않았다.
- 추가 리뷰에서 고정 상세 경로의 `:area` 누락을 확인했다. 회원/강의 상세 ID가 있는 경로의 업무 영역을 명시적으로 해석하고, 상세 진입·타 서비스 위임 차단 단위 테스트 및 PC/모바일 강의 상세 브라우저 검증을 추가했다.
- 인박스 이동은 중앙에 대응 화면이 있는 정확한 목록 경로만 바꾼다. query/fragment 또는 상세·복구 경로는 기존 서비스 호스트와 조건을 보존하여 펀딩 입금·환급·포럼 예외 처리 기능을 잃지 않는다. 실제 task 주소 형태와 미지원 상세 경로 회귀 테스트를 추가했다.
- 수정 source의 ESLint 오류 0, 문서 민감정보·상대 링크·whitespace·stage 범위 검사 통과. 기존 무관한 경고 baseline은 변경하지 않았다.
- 현재 HEAD의 required `CI Gate`, CodeQL, Codex 최신 검토 상태는 PR의 Checks/Review를 정본으로 확인한다. 이 문서는 향후 바뀌는 CI 상태를 고정 성공으로 복제하지 않는다. 리뷰 보완은 같은 branch/PR에서만 수행한다.
- 격리 PostgreSQL fixture는 검증 종료 후 완전 제거한다. 운영 계정·데이터·credential에는 변경이 없다. 작업 worktree/branch는 main 미병합이므로 KEEP이다. 통합 담당의 별도 지시 없이 병합·auto-merge·배포·운영 migration을 하지 않는다.

## 미결 사업 정책·범위 밖

- `pharmacy` 독립 사업의 실제 운영 주체: 기존 사업 권한을 유지하며 중앙 직영으로 편입하지 않았다. 공통 약국 등록·자격 심사와 별개다.
- Partner 사업 승인 대상·조건: 기존 커뮤니티 운영만 연결하며 사업 승인으로 간주하지 않는다.
- 공통 상품 DB의 Operator 위임: 별도 결정까지 전체 관리자 경계 유지.
- 독립 사업 비공개 자료의 중앙 조회: 별도 목적·범위 결정 전 확대하지 않음.
- 실제 Google/Kakao 신규 로그인·기존 계정 명시적 연결·cross-domain SSO·운영 메일의 실사용 검증은 기존 인증 트랙에서 확인해야 한다. 이 작업은 기존 credential·자동 계정 병합 정책을 변경하지 않는다.
- B2C AI 규격 설명서는 별도 후속 과제로 유지하며 구현하지 않는다.

## 문서 정합

운영 책임 V2에 수동 자격 승인 확정·현재 위임 구현·운영 미반영 상태를 반영하고, 관리자 정책 및 인증/membership 정본의 적용 관계를 연결했다. 2026-10-27 중앙 Admin-only 지정 정책은 O4O 직영 범위에서 대체하고 독립 사업은 유지한다. 과거 IR·WO·CHECK 및 Frozen 본문은 다시 쓰지 않았다.
