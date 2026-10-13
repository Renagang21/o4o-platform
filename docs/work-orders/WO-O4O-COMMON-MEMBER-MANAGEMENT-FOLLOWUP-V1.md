# 공통 회원관리 일상 업무·민감 업무 후속 정비

> **상태**: COMPLETED
> **작성일**: 2026-10-13 · **최종 갱신**: 2026-10-13
> **근거 WO/IR**: 사용자 지시 — 공통 회원관리부터 정리하고 push까지만 수행 · [일상 권한 완료 WO](WO-O4O-OPERATOR-MEMBER-DAILY-AUTHORITY-V1.md)

## 조사와 범위

기준 main `e4c48811b`, branch `wo/common-member-management-followup`.
서비스 operator는 조회·승인·반려·사용중지·정지 복구·일반 역할 변경을 수행한다.
서비스 admin은 같은 일상 업무와 서비스 탈퇴/삭제·탈퇴 가입 복구를 담당한다.
전체 관리자는 서비스 admin/operator 지정·회수를 담당한다. 전체 계정 완전 제거는 별도 Core 작업으로 유지한다.
단계별 강제 처리 순서나 운영 DB 변경·계정 완전 제거 구현·신규 역할/API/props 계약을 추가하지 않는다.

| 서비스/소비처 | 현재 연결과 영향 |
|---|---|
| Neture | 전용 목록·일괄 작업, 공통 상세의 서비스 탈퇴 안내·탈퇴 복구·반려 취소 |
| 약국 사업자 `kpa-society` | 전용 목록·일괄 작업, 공통 상세 및 전체 관리자 상세 권한 표시 누락 정비 |
| 강의 | ServiceMembersWorkspace → 공통 상세, lecture scope 유지 |
| 커뮤니티·공급자·펀딩 | Neture의 ServiceMembersPage → ServiceMembersWorkspace → 공통 상세, 각각 scope 유지 |
| Admin | 현재 UserDetailPage 직접 소비 없음. UI 타입·번들 소비는 검사 대상 |
| Store·My Home·Forum·분회 | 공통 서비스 회원 상세 직접 소비 없음. 개별 회원 원장·사업 관계에 정책 자동 적용하지 않음 |
| PH/KCos | 현행 UI 직접 소비 없음, 퇴역 기능 복구 없음. 기존 역사적 serviceKey 회귀 유지 |

## 문제와 수정

- [x] 상세의 서비스 범위 soft delete가 되돌릴 수 없는 사용자 삭제로 안내되던 문구를 서비스 탈퇴로 정리하고 공통 계정·다른 서비스 보존 범위를 명시.
- [x] 이미 API에서 허용하는 admin의 탈퇴 가입 복구를 상세에 연결. operator에게는 정지 복구만 제공.
- [x] 반려 사유 prompt 취소 시 mutation 요청 중단. 빈 사유 제출은 기존 선택사항 계약 유지.
- [x] KPA 상세의 전체 관리자 판정을 목록과 동일하게 정렬. 서비스 admin/operator 권한 범위는 유지.
- [x] 공통 계정 상태와 서비스 가입 상태를 구분해 표시하고 withdrawn을 탈퇴로 표시. 서비스 탈퇴를 공통 계정 비활성으로 오해하지 않게 함.
- [x] 현행 정책 표를 canonical 표준 본문에 반영. 과거 admin 전용 정지 서술과 일상 권한 완료 기록의 차이 해소.
- [x] 모든 직접 소비처의 관련 자동 회귀·타입/빌드·합성 PC/mobile 검증.
- [x] 작업 범위 commit·push. PR 생성·main 병합·배포는 사용자 지시에 따라 제외.

## 검증 결과와 종료 경계

- 공통 UI 2파일 29개, 회원 콘솔 6파일 50개, KPA 17파일 135개, Neture 72파일 622개 테스트 통과.
- API 기존 일상 권한·서비스 범위·삭제 범위·정지/탈퇴 복구 4개 Jest suite 91개 통과. PostgreSQL 실계정 write 없이 기존 모의 회귀를 실행했다.
- 공통 packages build, 최종 UI build, 전체 frontend 타입 검사, Neture/KPA/Lecture 최종 production build 통과. Admin·Store·My Home·분회는 frontend 타입 검사와 직접 소비처 census로 확인했다.
- Chromium 1440px/390px × 6개 서비스 × 일상 정지/복구·반려 취소/승인·admin 탈퇴 복구/서비스 탈퇴 = 36개 합성 시나리오 통과. scoped 요청과 operator 민감 작업 비노출, 문서 가로 넘침·page error 없음 확인. 실제 앱 CSS 사용.
- 변경 소스·테스트 4파일 ESLint 및 diff 공백·문서 민감정보 검사 통과.

COMPLETED는 요청한 코드·문서 정합·자동 검증·push 범위의 완료다. main 통합·배포·실계정 직접 검증의 완료를 의미하지 않는다.
미통합 worktree/branch는 KEEP하며, 로그·합성 화면은 `/tmp/common-members-*`에 보관한다. 기존 펀딩 push branch와 용어 정비 작업은 변경하지 않는다.

## 사용자 직접 테스트

여섯 서비스 각각 operator/admin 계정으로 다음 항목을 확인한다.

1. 조회·상세·일반 역할 변경·가입 승인/반려·사용중지·정지 복구와 처리 후 목록 반영.
2. 반려 사유 입력 취소 시 변경 없음, 빈 사유로 제출 시 정상 반려.
3. operator는 서비스 탈퇴/삭제·탈퇴 회원 복구 불가, admin은 해당 서비스 범위로 처리 가능.
4. 서비스 탈퇴 후 공통 계정과 다른 서비스 가입·별도 운영 권한이 보존되고 admin 복구가 그 서비스만 대상으로 하는지 확인.
5. 전체 관리자 Google 세션에서 KPA 목록과 상세의 권한 표시가 일치하는지 확인.

실계정 검증은 사용자가 직접 수행하며 자동 검증/개발 완료의 차단 조건으로 두지 않는다.
문서 정합: 공통 회원관리 표준만 현재 정책으로 정합하며 다른 ACTIVE 로드맵·기존 COMPLETED WO·별도 Core 작업은 재작성하지 않는다.
