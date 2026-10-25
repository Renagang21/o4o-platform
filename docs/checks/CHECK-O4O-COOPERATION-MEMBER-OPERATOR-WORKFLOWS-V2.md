# 약국 협업체 회원·운영자 통합 업무 검증

> **상태**: COMPLETED — 개발·격리 검증 기록. main 통합·운영 DB 적용·배포 완료를 뜻하지 않음
> **작성일**: 2026-10-25 · **최종 갱신**: 2026-10-25 (Asia/Seoul)
> **근거 WO**: [WO-O4O-COOPERATION-MEMBER-OPERATOR-WORKFLOWS-V2](../work-orders/WO-O4O-COOPERATION-MEMBER-OPERATOR-WORKFLOWS-V2.md)

## 결과

공지·자료·비거래 협업 활동·지원과 양쪽 홈을 하나의 작업으로 구현했다. 아래 결과는 로컬 build·합성 UI와 격리 PostgreSQL의 실제 SQL/transaction 검증이다. 운영 계정이나 운영 데이터를 사용하지 않았다.

| 검증 | 결과 |
|---|---|
| 신규 API 계약·실제 SQL 통합 | 24건 PASS: 공간·역할·가입 단위 차단, 게시 대상 snapshot·버전별 확인 보존, 중복 확인·문의 접수 방지, 동시 승인 충돌, 반려 후 재신청, 활동 전체 상태 흐름, 기존 자료 편집/승인 개정 충돌·사본 독립성, 대기 필터·private 응답, 대상 0건 게시 rollback, 대상 회원 정지 후 활동 진행·종료·보관 가능 및 대상 변경 금지, 기록 보유 시 down 거절 |
| 기존 자료·선택 약국·진열 실제 SQL 회귀 | 3파일·33건 PASS. 격리된 별도 DB와 suite별 schema 사용. 기존 테스트 fixture에 신규 optional metadata 열을 trailing column으로 추가해 기존 positional INSERT 계약 유지 |
| shared-space-ui 전체 | 22파일·196건 PASS. 신규 14건은 공지 확인/활동 신청/문의 실패 입력 보존·중복 방지·scope 전환의 늦은 응답 차단·안전한 교육 링크·쓰기 성공과 조회 실패 구분 |
| operator-core-ui 전체 | 30파일·213건 PASS. 신규 5건은 개인 대상의 초안 저장·배정 충돌 재시도·실패한 초안 보존. 기존 자료 작성·심사 회귀도 포함 |
| web-kpa-society 전체 | 19파일·140건 PASS |
| web-neture 전체 | 151파일·1,313건 PASS |
| web-pharmacy-coop 전체 | 11파일·85건 PASS |
| 제품 build | API `tsc -p tsconfig.build.json`, Pharmacy/MegaPharm·Neture/CarePharm·Pharmcoop 및 Store·Lecture·KPA Branch·Admin 소비 앱 build PASS. 직접 영향 3개 웹은 최종 UI 변경 후 재빌드 |
| 품질·구조 | 신규 모듈 집중 ESLint 오류/경고 0, migration contract 21 PASS / 0 FAIL, diff·문서 민감정보 검사 PASS |

테스트 수는 중복 실행을 합산하지 않은 2,004건이다. 일부 기존 Neture 펀딩 테스트는 실패 응답 시나리오에서 jsdom network stderr를 출력하지만 assertion은 PASS다. 기존 bundle 크기·Browserslist 경고와 API Jest의 기존 forceExit 안내는 이번 기능 실패로 계산하지 않는다.

## Migration 검증

- PostgreSQL 15 전용 Docker container를 새로 만들고 loopback에만 바인딩했다. production proxy·Cloud SQL·운영 자격정보는 사용하지 않았다.
- canonical baseline과 기존 incremental prefix 전체가 해당 expected fingerprint와 일치함을 확인했다.
- 신규 migration 적용 결과: `8d4bf317abee4d69567d0c6ad9c2f26c5b806ecb5f415b8eb46dbb9d4b41ea11`, 7,019 lines.
- 빈 상태 down 결과는 직전 schema `b893538bce103e0d46f90610f739cb62a39dc8a5d3afeef40babe796e5fd7aea`, 6,901 lines로 복원됐다. 재적용은 같은 신규 fingerprint를 반환했다.
- 실제 배포용으로 빌드한 `dist/migrate.js`를 별도의 새 로컬 DB에 실행했다. bootstrap·40개 incremental·post-migration assertion PASS. 재실행도 schema assertion PASS이며 중복 migration은 없었다.
- 기존 account-erasure writer fence를 새 테이블 5개 모두에 적용했다. 공유 업무·개인 식별정보의 제거/보존 분류를 자동 승인하거나 새 법정 보존기간을 만들지 않는다. 기존 수동 검토·fail-closed 원칙을 유지한다.
- API 통합 fixture는 `afterAll`에서 자기 scope·계정·조직·문의·알림·감사/버전 기록을 삭제하고 해당 계정 잔존 0건을 검사한다. 별도 기존 회귀 suite의 schema도 자체 종료 절차로 제거한다. 전용 container/volume은 최종 검증 후 종료·제거한다.

## 브라우저 검증

실제 build preview에 합성 계정·API 응답을 붙여 네 호스트 × PC 1440px / 모바일 390px의 8개 조합에서 다음을 연결했다.

1. 운영자가 공지 초안을 게시 → 회원이 해당 버전을 확인 → 운영자의 미확인 집계 갱신.
2. 회원이 협업 활동 신청 → 운영자가 승인 → 활동 진행 시작·완료 기록 → 회원의 완료 상태 확인.
3. 회원 지원 메뉴가 선택 약국/개인 조합 공간을 유지한 내 문의로 진입 → 문의 접수 → 운영자가 담당자·기한 배정.
4. 운영자가 자료 분류·교육 링크를 저장 → 회원에게 새 개정 번호와 HTTPS 교육 진입 표시.
5. 두 역할의 화면에서 페이지 오류·가로 넘침 0건 확인. 계정/가입 권한은 별도 실제 SQL 통합 검증과 조합했다.

초기 브라우저 harness의 상대 locator와 select의 exact-label 지정 및 sticky header 아래 자동 스크롤 때문에 대기가 만료됐고 locator를 수정했다. 합성 HTTP 도메인에서는 `crypto.randomUUID`가 secure-context API이므로 해당 loopback preview 호스트만 secure-origin으로 취급하도록 Chromium test flag를 적용했다. production HTTPS·인증을 우회하거나 제품의 인증/암호 설정을 바꾸지 않았다.

스크립트·결과 JSON·캡처는 클라우드 로컬 `.onboarding/cooperation-v2-*`에 둔다. 합성 API 브라우저 결과를 실계정·운영 API·실기기 검증으로 표현하지 않는다.

## 최신 main 반영과 리뷰

- 검증 중 병합된 main `4ee5a8ecda`의 운영자 초대 변경을 보존했다. 이번 migration은 아직 운영 미적용이므로 `1792886400001`로 변경해 초대 migration 다음에 append했다. 위 fingerprint·40개 runner 검증은 이 순서의 실제 결과다.
- 리뷰에서 발견한 모집 대상 회원 정지 후 활동 상태 변경 차단을 수정했다. 약국 단위와 개인 조합원 각각의 실제 SQL 회귀 2건을 추가했고 신규 대상 선택·모집 후 대상 변경의 차단은 유지했다.
- 재리뷰 지적도 수정했다. CarePharm 지원 메뉴는 선택 약국의 실제 활성 승인 확인 후에만 회원 문의로 연결한다(약국 없음·승인 대기·조회 실패는 공개 문의). 종료된 활동은 immutable 개정 이력에 진행 상태가 있어야 완료 기록을 허용하며 API·운영자 UI 양쪽에 적용했다. 실제 SQL 2건·회원 공간 4건·운영 화면 2건의 회귀를 추가했다.
- SonarCloud의 명시적 정렬 비교 함수·저장 함수 복잡도 지적은 UUID 정렬 비교 함수 지정과 기존 상태 검증 함수 분리로 정리했다. 동작·schema 변경 없이 관련 모델·SQL 회귀와 API build를 재검증했다.
- 최신 main 반영 후 공통 UI 2개·직접 소비 앱 3개의 전체 suite와 API 통합, 직접 영향 웹·API build를 다시 확인했다.

## 소비처와 인계

- 실제 UI 소비처: web-kpa-society·web-neture·web-pharmacy-coop·web-store·web-lecture·web-kpa-branch·admin-dashboard. API-server의 관련 import는 테스트 소비이며 API 자체 build도 검증했다.
- 공통 UI는 새 전용 CSS class와 명시적 account/scope/선택 약국 key를 사용한다. 기존 공개 소식·게시판 공지·공급 제안·상품 모집·매장 사본과 legal profile은 별도 의미로 유지한다.
- 새 원장 없이 존재하던 1단계의 링크 정리 완료와 이번 2단계의 실제 업무 기록 개발을 구분한다. 자료의 공개 범위는 기존 활성 회원 전용을 유지하며 세부 대상 확대·교육 수료 원장·실결제·ERP/POS는 추가하지 않았다.
- 작업 branch에 검증한 변경만 commit·push하고 PR HEAD의 CI·리뷰를 확인한다. **운영 migration은 미적용**이다. 적용 승인 전 main merge·production dispatch를 완료했다고 보고하지 않는다.
- `WORKTREE_DISPOSITION`: `/workspace/o4o-platform`, branch `wo/cooperation-member-operator-workflows-v2`, base `b7d2cfd86e`, verdict `KEEP` — 운영 적용 판단과 후속 수정에 필요. 이전 완료 branch나 다른 세션의 작업공간은 변경하지 않는다.

문서 정합: 이 CHECK의 COMPLETED는 명시한 개발 검증에 한정한다. WO는 운영 적용 대기 상태를 유지하며, 운영 migration·API·웹·Pharmcoop 배포와 실계정 검증은 각각 실제 결과를 확인한 뒤 갱신한다.
