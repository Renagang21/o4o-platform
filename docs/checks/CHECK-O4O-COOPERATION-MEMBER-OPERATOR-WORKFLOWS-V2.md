# 약국 협업체 회원·운영자 통합 업무 검증

> 명칭 정합(2026-10-31): 사용자 지시에 따라 협업체 표시명·기술 키·문서 링크를 현행 이름으로 정규화했다. 과거 검증·배포 기록은 당시 관측이며 새 도메인의 재검증을 뜻하지 않는다.

> **상태**: COMPLETED — 개발·통합·운영 배포 검증 기록. 실계정·실매장 검증은 미실행
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
| web-kpa-society 전체 | 20파일·148건 PASS |
| web-neture 전체 | 151파일·1,313건 PASS |
| web-pharmacy-coop 전체 | 11파일·85건 PASS |
| 제품 build | API `tsc -p tsconfig.build.json`, Pharmacy/드럭스토어형 약국·Neture/CarePharm·Pharmcoop 및 Store·Lecture·KPA Branch·Admin 소비 앱 build PASS. 직접 영향 3개 웹은 최종 UI 변경 후 재빌드 |
| 품질·구조 | 신규 모듈 집중 ESLint 오류/경고 0, migration contract 21 PASS / 0 FAIL, diff·문서 민감정보 검사 PASS |

테스트 수는 중복 실행을 합산하지 않은 2,012건이다. 일부 기존 Neture 펀딩 테스트는 실패 응답 시나리오에서 jsdom network stderr를 출력하지만 assertion은 PASS다. 기존 bundle 크기·Browserslist 경고와 API Jest의 기존 forceExit 안내는 이번 기능 실패로 계산하지 않는다.

## Migration 검증

- PostgreSQL 15 전용 Docker container를 새로 만들고 loopback에만 바인딩했다. production proxy·Cloud SQL·운영 자격정보는 사용하지 않았다.
- canonical baseline과 기존 incremental prefix 전체가 해당 expected fingerprint와 일치함을 확인했다.
- 신규 migration 적용 결과: `54230274de3a1c420410f8e634196fc10edbe2e317a06b7647bf12fe6f8e118b`, 7,021 lines.
- 빈 상태 down 결과는 직전 schema `ab9f0d3b25e6d170043a5cf0b00ef137d08f2856c3805c43115e20f1b8859ebb`, 6,903 lines로 복원됐다. 재적용은 같은 신규 fingerprint를 반환했다.
- 실제 배포용으로 빌드한 `dist/migrate.js`를 별도의 새 로컬 DB에 실행했다. bootstrap·41개 incremental·post-migration assertion PASS. 재실행도 schema assertion PASS이며 중복 migration은 없었다.
- 기존 account-erasure writer fence를 새 테이블 5개 모두에 적용했다. 공유 업무·개인 식별정보의 제거/보존 분류를 자동 승인하거나 새 법정 보존기간을 만들지 않는다. 기존 수동 검토·fail-closed 원칙을 유지한다.
- API 통합 fixture는 `afterAll`에서 자기 scope·계정·조직·문의·알림·감사/버전 기록을 삭제하고 해당 계정 잔존 0건을 검사한다. 별도 기존 회귀 suite의 schema도 자체 종료 절차로 제거한다. 전용 container/volume은 최종 검증 후 종료·제거했다.

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

- 검증 중 병합된 main `4ee5a8ecda`의 운영자 초대 변경을 보존했다. 이번 migration은 아직 운영 미적용이므로 `1792886400001`로 변경해 초대 migration 다음에 append했다. 이후 통합 요청 시점의 main `c63e370594`에 강의 profile migration이 먼저 반영되어, 이번 migration을 `1792886400002`로 조정했다. 위 fingerprint·41개 runner 검증은 강의 migration 이후 순서의 실제 결과다.
- 리뷰에서 발견한 모집 대상 회원 정지 후 활동 상태 변경 차단을 수정했다. 약국 단위와 개인 조합원 각각의 실제 SQL 회귀 2건을 추가했고 신규 대상 선택·모집 후 대상 변경의 차단은 유지했다.
- 재리뷰 지적도 수정했다. CarePharm 지원 메뉴는 선택 약국의 실제 활성 승인 확인 후에만 회원 문의로 연결한다(약국 없음·승인 대기·조회 실패는 공개 문의). 종료된 활동은 immutable 개정 이력에 진행 상태가 있어야 완료 기록을 허용하며 API·운영자 UI 양쪽에 적용했다. 실제 SQL 2건·회원 공간 4건·운영 화면 2건의 회귀를 추가했다.
- SonarCloud의 명시적 정렬 비교 함수·저장 함수 복잡도 지적은 UUID 정렬 비교 함수 지정과 기존 상태 검증 함수 분리로 정리했다. 동작·schema 변경 없이 관련 모델·SQL 회귀와 API build를 재검증했다.
- Pharmacy·드럭스토어형 약국도 계정 단위 승인과 선택 약국을 구분한다. 기존 활성 가입 약국 선택 hook을 재사용해 다중 약국 미선택·잘못된 명시 선택은 공개 문의로 연결하고, 단일 자동 선택·유효한 선택은 해당 약국의 회원 문의로 연결했다. 두 사업의 8개 회귀를 추가했다. 상품 정정 main `bcb89b863c`의 별도 변경도 보존했다.
- 최신 main 반영 후 공통 UI 2개·직접 소비 앱 3개의 전체 suite와 API 통합, 직접 영향 웹·API build를 다시 확인했다.

## 소비처와 인계

- 실제 UI 소비처: web-kpa-society·web-neture·web-pharmacy-coop·web-store·web-lecture·web-kpa-branch·admin-dashboard. API-server의 관련 import는 테스트 소비이며 API 자체 build도 검증했다.
- 공통 UI는 새 전용 CSS class와 명시적 account/scope/선택 약국 key를 사용한다. 기존 공개 소식·게시판 공지·공급 제안·상품 모집·매장 사본과 legal profile은 별도 의미로 유지한다.
- 새 원장 없이 존재하던 1단계의 링크 정리 완료와 이번 2단계의 실제 업무 기록 개발을 구분한다. 자료의 공개 범위는 기존 활성 회원 전용을 유지하며 세부 대상 확대·교육 수료 원장·실결제·ERP/POS는 추가하지 않았다.
- 개발 인계 당시에는 운영 migration 미적용 상태였다. 이후 사용자의 명시적인 통합·배포 지시로 아래 운영 반영 결과를 확인했다.
- `WORKTREE_DISPOSITION`: `/workspace/o4o-platform`, 기능 branch `wo/cooperation-member-operator-workflows-v2`는 main 병합 완료. 현재 기록 branch `wo/cooperation-workflows-deployment-record-20261025`, base `7a75dcf666`, verdict `KEEP` — 배포 기록과 운영 검증 후속 인계용. 이전 완료 branch나 다른 세션의 작업공간은 변경하지 않는다.

문서 정합: 앞의 로컬 검증과 아래 운영 반영 결과를 구분한다. 개발·통합·배포 완료가 실계정·실매장 검증 완료를 뜻하지 않는다.


## 2026-10-25 운영 반영 검증

| 단계 | 실제 결과 |
|---|---|
| 기능 PR | [#808](https://github.com/Renagang21/o4o-platform/pull/808) MERGED. HEAD `0bfcaad868`의 CI Gate·API 3분할·Code Quality·Web/Admin build·CodeQL·Sonar PASS, Codex completed·finding0·미해결0 |
| main | `7a75dcf6664b6b538846b117fbf355676d1a0f3a`. [main CI 40193561845](https://github.com/Renagang21/o4o-platform/actions/runs/40193561845)의 CI Gate·전체 테스트/빌드 PASS |
| 통제 배포 | 자동 Delivery의 LEVEL_3 보류를 확인한 뒤 승인 범위로 [Promote 40194525136](https://github.com/Renagang21/o4o-platform/actions/runs/40194525136) 실행, SUCCESS |
| Migration·API | 단일 migration Job의 `Run database migrations` SUCCESS. API revision readiness·traffic switch·post-switch 검증 SUCCESS. 별도 DB 접속·seed·이력 수정·rollback 강행 없음 |
| 공유 소비처 | API·Admin·Neture·KPA Society·Lecture·Store·KPA Branch 배포와 최종 serving SHA 검사 SUCCESS. `production`: `DEPLOYED` |
| Pharmcoop | [40195429634](https://github.com/Renagang21/o4o-platform/actions/runs/40195429634), 같은 SHA·`frontend_only=true`·`apply=false`, SUCCESS. API 호환성·private smoke·트래픽 전환 SUCCESS, fixture provision skipped |
| 공개 smoke | Pharmacy·드럭스토어형 약국·CarePharm·Pharmcoop 홈 HTTP 200. 준비 상태 JSON HTTP 200. 새 business/cooperative 회원 API의 비로그인 요청 HTTP 401 `AUTH_REQUIRED` |

추가 통합 검증에서 Pharmacy/드럭스토어형 약국 지원 메뉴의 다중 약국 미선택·잘못된 선택·단일 자동 선택·유효 선택을 8건 검증했다. 전체 Pharmacy 20파일148 PASS와 production build PASS. 로컬 병렬 실행 중 기존 UI 대기 1건이 만료됐지만 같은 assertion의 집중30건·전체 순차148건이 재통과했고 CI에서도 통과했다. assertion이나 timeout을 완화하지 않았다.

실제 production bundle과 합성 API로 두 호스트 × PC/390px의 4개 추가 브라우저 흐름이 PASS다. 공지 게시/확인·활동 신청/승인/진행/완료·지원 메뉴/문의/배정·자료 개정/교육과 pageerror/수평 넘침0을 재확인했다. 앞의 4호스트8개 결과와 별도 기록이며 실계정 결과가 아니다.

격리 PG container/volume과 preview 서버는 제거했고 운영 DB에 테스트 fixture를 넣지 않았다. 배포 검증에서 실제 계정 가입·운영자 권한 부여·공지/신청/문의 생성·메일 발송·실결제/배송·음성/기기 연결은 수행하지 않았다. CarePharm 법정정보 빈칸·약관 미게시·신규 가입 차단은 유지했다.

현재 잔여는 WO의 **운영 개통과 추가 개발 구분** 표를 따른다. 과거 #772·#765는 MERGED이며 해당 merge commit이 main의 ancestor임을 확인했다. 자료별 세부 공개 범위·교육 수료·ERP/POS 등 별도 범위와 실제 운영 입력을 이번 배포 누락으로 표시하지 않는다.
