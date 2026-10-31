# 약국 협업체 회원·운영자 업무 통합 — 2단계

> 명칭 정합(2026-10-31): 사용자 지시에 따라 협업체 표시명·기술 키·문서 링크를 현행 이름으로 정규화했다. 과거 검증·배포 기록은 당시 관측이며 새 도메인의 재검증을 뜻하지 않는다.

> **상태**: COMPLETED — 개발·main 통합·운영 migration·네 공간 배포 완료. 실계정·실매장 검증은 별도
> **작성일**: 2026-10-25 · **최종 갱신**: 2026-10-25 (Asia/Seoul)
> **근거**: 사용자 `작업을 너무 작게 나누지 말고 진행하라`

## 범위

공지·자료·협업 활동·지원과 양쪽 홈을 한 작업으로 구현한다. 회원에게는 자신의 확인·참여·문의 상태, 운영자에게는 처리 대상과 실제 실행 수단을 제공한다. 1단계의 배치·기존 업무 링크를 재사용하며 회원 가입 원장·공급 계약·권한 발급은 통합하지 않는다.

시작 main은 `b7d2cfd86edf4d26d19d1e954fa754f74faf8f7d`, 전용 branch는 `wo/cooperation-member-operator-workflows-v2`다. 준비된 격리 클라우드 checkout을 사용한다. 신규 dependency·lockfile·CI·배포 설정은 변경하지 않는다.

## 구현 결과

| 업무 | 운영자 | 회원·연결 |
|---|---|---|
| 공지 | 초안·게시·보관, 중요도·필수 여부·확인 기한·대상 선택. 게시 버전별 대상 snapshot과 본문·확인 집계 보존 | 해당 버전의 대상에게만 조회. 약국은 선택 약국의 현행 owner/admin/manager가 해당 약국을 기준으로 확인하고 수행자를 기록. 조합은 본인이 확인. 재게시 시 새 버전에서 다시 확인하며 이전 기록은 보존 |
| 자료 | 기존 `semi_franchise_contents`의 작성·검수·게시 경로 재사용. 분류·교육 HTTPS 링크 편집, 본문·첨부·상태·개정 이력 조회 | 활성 회원 전용 범위 유지. 자료의 개정 번호·분류·교육 진입 제공. 기존 매장 사본은 갱신하지 않으며 새로 복사할 때 원본 개정 번호를 함께 보존 |
| 협업 활동 | 비거래 공동 업무·교육 참여의 초안→모집→진행→종료, 신청 검토·승인·반려 사유·완료 기록 | 가입 단위에 맞는 신청·승인 전 철회·반려 후 재신청·처리 결과 확인. 모집 개시 후 대상 변경 금지. 실제 진행을 시작한 활동만 완료 기록 가능 |
| 지원 | 기존 문의함의 답변·상태 처리 유지, 문의별 현행 운영자 배정·처리 기한·미배정/기한 초과 목록 추가 | 로그인 계정과 가입 단위를 서버에서 확정해 문의 접수·내 문의·발송 완료 답변 조회. 요청 UUID로 중복 접수 방지. 과거 익명 문의를 이메일 일치만으로 연결하지 않음 |
| 홈·동선 | 미확인 필수 공지·신청 검토·문의 배정/기한 초과를 실제 전체 기록으로 집계하고 관련 대기 목록으로 바로 연결 | 내 확인 필요·신청 상태·문의 기록 표시. 회원 지원 메뉴에서 내 문의로 이동하며 선택 약국과 URL hash를 유지. 공개 문의·게시판 공지·공개 홈 소식은 유지 |

공지 대상은 게시 당시의 활성 가입 단위다. 개별 선택을 비우면 그 시점의 전체 활성 회원을 server-side INSERT SELECT로 확정한다. 조회 페이지의 대상 수로 전체 회원을 잘라 게시하지 않는다. 신규 가입자가 과거 게시 버전의 필수 확인 대상으로 자동 편입되는 정책은 추가하지 않는다. 필요하면 새 버전으로 다시 게시한다. 공지 확인은 약관 동의·전체 직원의 숙지 확인으로 취급하지 않는다.

자료 개정은 DB trigger가 기존 작성·수정·승인 경로까지 포괄한다. 기존 자료는 migration 시 본문을 복제하지 않으며 첫 변경 시 변경 전 내용을 보존한다. 최신 편집 화면은 개정 번호를 보내 오래된 본문 수정·상태 승인을 409로 거절한다. 배포 순서 호환성을 위해 기존 client의 개정 번호 없는 요청은 유지하고 그 변경도 이력에 남긴다.

## Core·adapter·권한 경계

- `cooperation-workflows` API는 기존 `resolveInboxScope`, `scopeGuard`, `assertInboxWriter`, 선택 약국 접근 판정을 재사용한다. business/cooperative 두 공간만 받으며 service 전체 관리 공간은 추가하지 않는다.
- Pharmacy·드럭스토어형 약국·CarePharm은 선택 약국의 현재 가입과 경영 권한을 확인한다. 개인 조합원 자격으로 약국 업무를 수행할 수 없다.
- Pharmcoop은 조합 slug→기존 cooperative/business의 연결과 개인 가입·현행 조합 운영 관계를 사용한다. business alias 진입은 기존 resolver가 차단한다.
- 읽기는 현재 scope·계정·가입 단위에 한정하고 `private, no-store`를 적용한다. 쓰기는 transaction 안에서 현재 권한·사업·가입 단위를 다시 확인하고 버전 충돌을 검사한다. 계정·사업·선택 약국 변경 시 이전 요청 응답을 화면에 반영하지 않는다.
- 공통 회원 UI와 운영자 UI는 host가 제공한 인증 transport와 scope를 받는다. 신규 role·자동 가입·운영자 seed·서비스 간 자격 변환을 만들지 않는다.
- 공지·활동·지원·자료와 처리 명단을 페이지 조회하며, 대기 수는 전체 기록에서 별도로 계산한다. 실패를 0건·완료로 표시하지 않는다. 쓰기 성공과 후속 조회 실패도 구분한다.

## Migration과 배포 판정

`CreateCooperationMemberWorkflows1792886400002` 한 개를 incremental manifest와 expected schema state에 append한다.

- 새 테이블 5개: `cooperation_work_items`, `cooperation_work_revisions`, `cooperation_notice_recipients`, `cooperation_activity_applications`, `cooperation_material_revisions`.
- 기존 자료 테이블에 개정 번호·분류·교육 링크 추가. 자료 변경 전후 snapshot trigger 적용.
- 기존 문의 테이블에 인증 소유자·가입 단위·요청 UUID·배정 담당자·처리 기한 추가. 익명 문의 소유권 backfill은 없다.
- 기존 회원·계정·사업 데이터를 삭제하거나 가입·권한·동의를 seed하지 않는다. 새 테이블에도 기존 account-erasure writer fence를 붙인다. 개인정보 완전 제거는 기존 분류·수동 검토 경계를 유지하며 공유 업무 증적을 임의로 삭제하지 않는다.
- 빈 로컬 DB에서 down/up을 검증했다. 업무 기록이나 소유권/배정 기록이 있으면 down은 거절하며 forward repair를 요구한다.
- 격리 PostgreSQL 15에서 기존 prefix 전체와 신규 state를 검증했다. 최종 fingerprint는 `54230274de3a1c420410f8e634196fc10edbe2e317a06b7647bf12fe6f8e118b`, 7,021 lines다. 실제 배포용 `dist/migrate.js`로 새 로컬 DB bootstrap·41개 incremental 적용 및 재실행 PASS.

**DEPLOYMENT=MANUAL/GATED**: migration 포함 LEVEL 3다. API migration·API revision을 먼저 검증한 후 웹을 배포해야 한다. 기존 AGENTS §5에 따라 운영 DB DDL/migration 적용은 별도 명시 승인 대상이며, 개발 단계에서는 운영 DB에 접속하거나 적용하지 않았다. 이후 사용자의 명시적인 main 통합·배포 지시로 운영 적용을 승인받아 아래 후속 결과까지 완료했다. Pharmcoop은 API 호환성이 확보된 뒤 기존 frontend_only 경로를 사용한다.

## 검증과 완료 구분

상세 증적은 [CHECK](../checks/CHECK-O4O-COOPERATION-MEMBER-OPERATOR-WORKFLOWS-V2.md)를 따른다.

| 단계 | 판정 |
|---|---|
| 다섯 업무 영역의 회원·운영자 구현 | 완료 |
| 격리 SQL·권한·상태 전이·UI 실패 복구·PC/모바일 흐름 | 완료 |
| migration 계약·격리 canonical runner·원복·재적용 검증 | 완료 |
| commit·push·PR CI/리뷰 | 완료 — PR #808, 최종 HEAD CI·리뷰 지적 0건 |
| main 통합·운영 migration·배포 | 완료 — main `7a75dcf666`, Promote 및 Pharmcoop frontend_only 성공 |
| 실계정·실매장 운영 검증 | 미실행 |

자료별 임의 공개/세부 대상 확대, LMS 수료 원장·자동 진도 동기화, 실결제·공급가 확정·배송·ERP/POS 분석은 구현 범위에 포함하지 않는다. 관련 교육 링크와 비거래 활동 완료 기록을 교육 수료 증명이나 공급 계약 승인으로 해석하지 않는다. CarePharm 사업자 정보 빈칸·법적 문서 미게시·신규 가입 차단도 그대로 유지한다.

문서 정합: 1단계의 COMPLETED 기록을 다시 쓰지 않는다. 본 문서는 후속 통합 업무의 개발과 운영 적용 상태를 별도로 기록하며 실제 배포가 끝나기 전 운영 완료로 표시하지 않는다.


## 2026-10-25 통합·운영 배포 결과

- [PR #808](https://github.com/Renagang21/o4o-platform/pull/808)을 정상 PR 경로로 병합했다. 실행 코드·운영 배포 SHA는 `7a75dcf6664b6b538846b117fbf355676d1a0f3a`다. [main CI 40193561845](https://github.com/Renagang21/o4o-platform/actions/runs/40193561845) 전체 PASS. 최종 기능 HEAD `0bfcaad868`의 Codex completed·finding0·미해결0을 확인했다.
- [Promote 40194525136](https://github.com/Renagang21/o4o-platform/actions/runs/40194525136)에서 운영 migration·API 준비 상태 검증·트래픽 전환·전환 후 검증이 성공했다. API·Admin·Neture·Pharmacy/드럭스토어형 약국·강의·Store·분회의 serving SHA 검증이 성공했고 해당 commit의 `production`은 `DEPLOYED`다.
- [Pharmcoop 40195429634](https://github.com/Renagang21/o4o-platform/actions/runs/40195429634)는 같은 SHA의 `frontend_only=true`, `apply=false`로 성공했다. API 호환성·인증된 private HTML smoke·트래픽 전환 검증 PASS. 조합/회원 fixture provision은 skipped이며 계정·가입·권한 seed와 IAM/DNS 변경은 없다.
- 네 도메인의 공개 홈 200, 운영 API ready JSON 200, 새 business/cooperative 회원 API의 비로그인 요청 401을 확인했다. 실계정 로그인·실제 공지/신청/문의 생성·메일 발송·실매장 기기 검증은 수행하지 않았다.
- 문서 기록용 후속 변경은 runtime 무영향이며 실행 코드 재배포 대상이 아니다. 상세 증적은 연결된 CHECK를 따른다.

## 현재 남은 작업 — 운영 개통과 추가 개발 구분

| 묶음 | 현재 남은 일 | 구분 |
|---|---|---|
| 네 공간 운영 개통·현장 검증 | 실제 운영자·회원으로 가입/선택 약국·공지 확인·활동 신청/승인/완료·문의/답변·자료 개정을 연결해 확인. 약사/일반 직원의 실제 허용 범위, PC/모바일/태블릿·음성 입력/읽어주기도 실매장 한 곳에서 확인 | 우선 수행할 검증·보완 |
| 협업체별 운영 설정·약관 게시 | 운영자·문의 담당자, 사업 제공 기능·직원 허용, 초기 공지/자료/참여 활동과 응대 기준 설정. 각 사업의 실제 약관·개인정보처리방침·법정정보 게시 상태 확인. CarePharm은 회사 정보 빈칸인 초안 상태이므로 게시 전 운영 주체 정보가 필요하며 신규 가입 차단은 유지 | 운영 입력·사업자 결정 |
| 자료·교육의 세부 운영 | 현재 자료는 해당 협업체 활성 회원 전용이다. 특정 약국/직군/사업 참여자별 자료 범위와 교육 이수/수료 원장·진도 연결은 추가 개발. 현재 교육 링크와 활동 완료는 수료 증명이 아님 | 범위 확정 후 개발 |
| 업무 이력·탈퇴 처리 | 기존 개인정보 보존 정책에 따라 신규 원장의 개인 정보와 공동 업무 증적 분류·탈퇴 처리를 점검. 기존 writer fence·수동 검토를 자동 제거 완료로 취급하지 않음 | 운영 점검·필요한 adapter 보완 |
| 상품·공급 사업 확장 | 일반 상품 모집의 공급가 입력/확정 연결과 실제 계약·정산/배송 검증. 약사 비교/추천 자료→직원 안내→고객 화면 활용 보강은 사업 범위 선택. 기존 상담 유지·사용처 표시·QR/태블릿 기본 동선을 미구현으로 되돌려 적지 않음 | 사업 범위 결정·별도 개발/실증 |
| ERP Assistant | 실제 확보 가능한 POS·발주 자료와 지원할 분석/대조/초안 업무부터 확인 | 자료 확보 후 별도 검토 |

Pharmcoop 개인 조합원과 다른 공간의 약국 단위 자격/권한은 위 후속에서도 유지한다. [#772](https://github.com/Renagang21/o4o-platform/pull/772)와 [#765](https://github.com/Renagang21/o4o-platform/pull/765)는 이미 main에 병합되어 이번 배포 코드에 포함된 과거 작업이며 현재 미병합 backlog가 아니다.

다음 실행은 첫 두 행을 **네 공간 운영 개통·실계정/실매장 검증 한 묶음**으로 진행하고, 확인된 결함을 함께 보완하는 것이 우선이다. 나머지 확장 범위를 이번 V2의 미완료 개발로 섞지 않는다.
