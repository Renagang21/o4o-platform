# CHECK — 운영자 초대·수락 및 보존·파기

> **상태:** ACTIVE
> **작성일:** 2026-10-25 (한국시간)
> **WO:** [동일 #641 연속 Phase](../work-orders/WO-O4O-SERVICE-OPERATOR-EMAIL-CONFIRMATION-V1.md)
> **정본:** [확정 정책](../baseline/O4O-OPERATOR-INVITATION-CONSENT-AND-RETENTION-V1.md)

## 구현·격리 검증

- 영향 API Jest 20 suite **354 PASS**(격리 PostgreSQL15 opt-in 포함). 플랫폼35·서비스별72·실제 canonical lock/cache4건 포함. 잘못된 본인/범위, actor 권한 회수, 소속 이탈, 재발송 기한 고정, deadline/cleanup backlog, 취소·수락 경쟁, 계정 삭제, commit 실패 무발송, ephemeral 메일 무기록을 검증했다.
- 격리 canonical bootstrap·등록 migration의 모든 기존 prefix와 신규 fingerprint 일치. 새 migration은 빈 테이블만 down을 허용하며 실제 운영 DDL은 실행하지 않았다.
- API tsc PASS, 공통 packages build PASS. Admin·Neture·분회·조합 production build PASS. unsafe route guard 위반0, 문서 민감정보 패턴0. 최종 CI·Codex는 push HEAD로 별도 판정한다.
- UI focused: Admin16, Neture 수락/복귀18, 공통 위임8, 공통 pending3 PASS. 분회 전체25 PASS. 조합 전체85 중 변경 전 문구를 기대한1건 수정 후 관련15 PASS(나머지는 앞 실행에서 PASS; 중복 합산하지 않음).
- 실제 Chromium 1440×1000·390×844: 실제 수락/공통 pending component와 합성 auth/API로 명시 수락 전 활성화 요청0, URL fragment 제거, 재발송·취소 후 목록 갱신, 수평 넘침0, pageerror0. 실제 로그인·메일·계정 권한 변경을 검증했다고 주장하지 않는다.

## Consumer Impact Matrix

| 소비처 | 변경 영향·경계 | 검증 |
|---|---|---|
| Admin 운영자 관리 | 기존 계정 ID/미가입 이메일 초대, 기존 권한 유지 | build·UI16 |
| Neture 공통 수락 | 명시 수락·범위 이름·보존 안내·가입 복귀 | build·UI18·PC/mobile 합성 smoke |
| 서비스 Admin 공통 UI | KPA·강의·Neture·사업별 Operator 신규 초대 | 공통UI8·서버10범위PG72 |
| 분회 서비스 Admin/개설 승인 | active 분회 소속 대상만 초대, 승인 commit 후 발송 | build·전체UI25·PG/branch unit |
| 조합·연합 관리 | 현재 조합/역할 범위 보존, 마지막 관리자 회수 보호 | build·관련UI15·PG scope·route |
| shared-space-ui | 기존 의존 관계 안에서 pending 컴포넌트 추가 | 신규UI3·분회/조합 build·PC/mobile smoke |
| mail-core/API | ephemeral 전달만 audit 생략, 다른 업무 메일 유지 | package build·mail privacy3 |
| 퇴역 K-Cosmetics/PH runtime | 경로 복구·신규 지정 범위 확대 없음 | catalogue/retirement guards·main 비교 |

## 운영 미실행·남은 Gate

실제 DB migration·메일 전달·사용자 권한 변경·새 개인정보 처리방침 게시·main 병합/배포는 미실행이다. 새 table과 자동 파기 job을 운영에 적용하기 전 AGENTS §5의 명시 승인을 받는다. 최신 main 통합 뒤 CI·최신 HEAD Codex·미해결 finding을 확인해야 한다. 실제 메일/계정 smoke는 사용자가 승인한 대상과 안전한 검증 절차를 먼저 확정한다.

WORKTREE_DISPOSITION: 전용 `/workspace/o4o-wt/operator-invitations-policy-20261025`, 기존 `wo/operator-invitations-integration-20261016` 연속 Phase, main integration 없음, KEEP(후속 CI·review·운영 승인 전).

문서 정합: User Domain·개인정보 보존 정본에 새 승인 정책을 연결하고 canonical index에 등록했다. 과거 WO 결과는 보존하고 위 연속 Phase로 변경점을 명시했다. 게시된 개인정보 처리방침 원문은 변경하지 않았다.
