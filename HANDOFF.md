# HANDOFF

## 2026-11-13 · 내 매장 개선 이어서 — P1 일부 · P2 일부 (branch `claude/wizardly-bardeen-ldq332`)

- **PR 묶음:** 바로 아래 P0 보안 보강과 같은 PR 로 묶어도 되고, 화면 정리(`f0271f00` 이후)만 별도 PR 로 나눠도 된다. P0 보안 커밋은 먼저 병합 · 배포 권장.
- **한 일(사용자 「너가 결정해서 진행」):** 로컬 확인 지시서 [`WO-O4O-STORE-BOUNDARY-READONLY-CHECK-V1`](docs/work-orders/WO-O4O-STORE-BOUNDARY-READONLY-CHECK-V1.md)(개수만 세는 read-only 6개). 태블릿 화면 세트 상세 GET 을 읽기 전용으로. 상품 마케팅 연결의 매장 경계 + 조회 매개변수 오류. 상담 메뉴 용어 · 예전 경로를 매장 화면 안으로 · 방향 버튼 태블릿 종류별. 쓰지 않는 페이지 3개 삭제. 관리자 일반/대형 배치 설정(화면 · API · 서비스 · 매장 클라이언트) 제거.
- **결정 사항(§9):** 「상담 요청」 이름은 QR · 태블릿 고객 상담 요청 기능으로 일관돼 바꾸지 않음. 콘텐츠 공개 설정 권한(P1-3) · 상담 짝짓기 잔재는 운영 데이터 확인 뒤(위 지시서). 오류 문구 정리(약 100곳) · serviceKey 경로 이동은 범위가 넓어 다음 묶음으로.
- **검증:** API 약국 모듈 40 suites / 322 · 이전 단계 전체 3 shard 687 suites 통과. web-store 103 files / 1004 통과(상담 자동 언어 테스트 1건은 전체 실행 부하에서만 1초 대기 초과 — 단독 3회 통과, 기존 불안정 테스트 지시서와 같은 유형). admin 플랫폼 테스트 통과. api · admin · store-web type-check 통과, store-web build 통과.
- **확인하지 못한 것 / 배포 후:** 메뉴 「상담 태블릿」이 매장 화면 안 상담 목록으로 가는지, 예전 태블릿 주소(`?mode=` 등)는 상담 화면으로 가는지, 관리자 「약국 서비스 설정」에서 배치 설정이 사라졌는지, 태블릿 화면 세트 상세에 QR 이 그대로 보이는지.
- **문서 정합:** 해당 없음.

## 2026-11-13 · 내 매장 전반 조사 · 보안 경계 보강 P0 (branch `claude/wizardly-bardeen-ldq332`)

- **branch 상태:** #1049 · #1055 병합 뒤 원격 branch 가 자동 삭제됐고, 이 세션은 병합된 이력 위에 merge 로 이어 붙여 같은 이름으로 다시 push 했다(force push 금지라 main 에서 새로 만들지 못함). main 대비 차이는 아래 커밋뿐이다 — squash 병합이면 결과는 같다.
- **PR 묶음:** P0 보안 보강 3건(`d687f21c` · `5ae8dbb9` · 그다음 커밋)을 한 PR 로. 조사 기록 [`IR-O4O-STORE-WORKSPACE-IMPROVEMENT-SURVEY-V1`](docs/investigations/IR-O4O-STORE-WORKSPACE-IMPROVEMENT-SURVEY-V1.md)은 같은 PR 또는 문서 PR.
- **한 일:** 내 매장 전반 4갈래 조사(화면 구조 · 리스트 표준 · API 규칙 · 잔재) → 우선순위 P0~P3 정리(조사 기록). P0 진행: ① 공개 게시 자산 API 입력값 바인딩 · 검사 ② 매장의 공용 상품 이미지 쓰기 범위를 본인 업로드로 제한(+ 이미지 관리 창은 공용 이미지 표시 · 버튼 숨김) ③ 플레이리스트 항목 같은 매장 자료만.
- **결정 사항(§9):** P0-2 는 기능을 없애지 않고 범위만 좁혔다 — 매장별 이미지를 따로 둘지 같은 장기 방향은 사용자 결정. 공개 저장소라 커밋 · 문서에 공격 방법을 적지 않았다. 이미 매장이 올렸던 이미지(작성자 기록 없음)는 매장에서 더 이상 지울 수 없다 — 필요하면 운영자 화면에서.
- **검증:** 새 테스트 — 게시 자산 5 · 이미지 경계 4 · 플레이리스트 3 통과, 관련 기존 spec(게시 자산 · 플레이리스트 · 매장 소유 등) 통과. api · store-web · web-neture · admin type-check 통과. 변경 파일 ESLint 오류 0(기존 경고 1).
- **확인하지 못한 것 / 배포 후:** 실제 이미지 관리 창(경영자 계정 — 공용 이미지에 「공용」 표시 · 버튼 없음, 본인 업로드는 정렬 · 삭제), 공개 게시 자산 화면 정상 표시. 운영 DB 확인 항목은 조사 기록 §2.
- **다음:** 조사 기록 P1(GET 부수효과 · 마케팅 연결 경계 · 공개 설정 권한 재확인 …) → P2 → P3.
- **문서 정합:** 해당 없음.

## 2026-11-13 · 참고 · 기준 문서 정비 — 상담 매장 단위 판단 반영 (branch `claude/wizardly-bardeen-ldq332` · 문서 전용 커밋)

- **PR 묶음:** 문서 전용 커밋이다. §4-3 R6(기준 문서는 문서 전용 PR)에 따라 통합 세션이 이 커밋을 별도 PR 로 분리할 수 있다 — 같은 branch 의 코드 변경(상담 매장 단위 판단 · My Home 약사 확인 정리)과 내용이 맞물려 있어 코드 PR 병합 뒤에 병합한다.
- **한 일(사용자 지시 「이번 작업이 끝나면 정비」):** `O4O-ROLE-WORKSPACE-ARCHITECTURE-V2` §2 에 매장 상담 태블릿 예외 1줄(원칙 문장 불변), `O4O-STORE-ACCESS-AND-MEMBERSHIP-V1` 상담 문단 교체, `O4O-AI-CORE-EXTENSION-FOUNDATION-V1` 1문장, `DESIGN-NETURE-PHARMACY-STORE-COMMERCE-V1` §15-8 갱신 요약 · 대체 표기.
- **결정 사항(§9):** 조사 중 4번째 문서(`O4O-ROLE-WORKSPACE-ARCHITECTURE-V2` §2 — 약사 전용 기능은 개인 약사 자격 필요)를 발견했다. 사용자 결정과 충돌하는 상위 정책이라 원칙은 그대로 두고 상담 태블릿 예외만 날짜와 근거를 붙여 추가했다. 통합 담당이 예외 문구를 확인해 주면 좋다.
- **검증:** 문서 민감정보 검사 0건. 남은 「약사 사용 확인」 언급은 모두 2026-11-13 갱신 · 대체 표기 문장이다.
- **문서 정합:** 발견 4건 / SUPERSEDED 표기 0건 / 링크 수정 0건 / 별도 WO 제안 0건 — 사용자 지시로 인라인 정비.

## 2026-11-13 · My Home 약사 확인 체크 정리 (branch `claude/wizardly-bardeen-ldq332`)

- **PR 묶음:** 같은 branch 의 상담 매장 단위 판단과 같은 PR(함께 봐야 하는 변경). 지시서 [`WO-O4O-STORE-CONSULTATION-TABLET-ROLES-V1`](docs/work-orders/WO-O4O-STORE-CONSULTATION-TABLET-ROLES-V1.md) §3 2-4단계.
- **한 일(사용자 지시):** My Home 의 경영자 본인 약사 확인 화면 · 근무자 「이 근무자가 약사임을 확인」 체크 삭제. API `PUT /neture/pharmacy/pharmacist-confirmation` 삭제, 근무자 기능 저장 · 직원 승인의 약사 확인 요구 · `pharmacistConfirmed` 입력 · 직원 목록 응답 필드 삭제, `requiresProfessional` · `consultationProfessionalConfirmed` · `confirmOwnerPharmacist` 삭제, 운영자 화면의 약사 사용 확인 문구 삭제.
- **결정 사항(§9):** schema 변경 · 일괄 데이터 삭제 없음 — 남은 `pharmacyPharmacistConfirmed` 값은 읽지 않고, 근무자 기능을 다음에 저장할 때 지운다. 직원 승인 기본 기능은 매장이 쓸 수 있는 기능 전체(이전에는 약사 기능 제외). 면허 승인 규칙(`hasApprovedPharmacist`)은 유지하고 DB 테스트의 면허 검증을 이 함수로 옮겼다. 매장별 약사 확인 DB 테스트 1건 삭제.
- **검증:** API 전체 3 shard 681 suites 통과(84 skip). DB 테스트 `central-operation-access` 를 로컬 임시 PostgreSQL 로 실행 — 고친 4건 통과, 실패 5건은 모두 `column u.businessInfo does not exist`(테스트 fixture 의 users 표가 #968 이후 코드보다 낡음 · 이번 변경과 무관 · 수정하지 않음). `business-operations` · `collaboration-application` DB 테스트는 전체 migrate 된 schema 가 필요해 실행하지 못함(컴파일만 확인). web-neture 185 files / 1578, operator-core-ui 36 / 242, web-store 1003 통과. web-neture · admin · store-web · api type-check 통과. ESLint 오류 0(기존 `_next` 경고 2).
- **확인하지 못한 것 / 배포 후 Demo:** My Home 「매장 직원 및 초대」에서 약사 확인 체크가 사라지고 상담 기능도 일반 체크로 저장 · 승인되는지(경영자 계정). 운영 DB 에 남은 확인 값 개수.
- **문서 정합:** 이어지는 「참고 문서 정비」 커밋에서 처리(사용자 지시).

## 2026-11-13 · 상담은 매장 단위로 판단 · 「매대」 용어 정리 · 이용 안내 문구 (branch `claude/wizardly-bardeen-ldq332`)

- **PR 묶음:** 같은 branch 의 키오스크 위치 · 한국어 병기와 같은 PR. 지시서 [`WO-O4O-STORE-CONSULTATION-TABLET-ROLES-V1`](docs/work-orders/WO-O4O-STORE-CONSULTATION-TABLET-ROLES-V1.md) §3 2-4단계.
- **사용자 결정(통합 담당 · 2026-11-13):** 약국 경영자 = 약사 → 승인된 약국은 약사 상담 가능. 직원 초대는 매장 관리(주문 등)용, 상담은 지정 사용자로 묶지 않는다. 태블릿 지정은 경영자가 오프라인에서.
- **한 일:** 상담 4개 방식 · 상담 안 상품 안내 · 키오스크 상품 검색을 매장 단위 이용 기능(`requireStore`)으로 판단(계정별 약사 확인 · 근무자별 허용 제거, 매장 소속 · 회원 · 약국 승인 확인 유지). 「매대」 용어를 약사 상담 · 근무자 상담 · 소비자 상담으로. 이용 안내 문구를 쉬운 말로.
- **결정 사항(§9):** 권한 범위 변경(§5)은 사용자 직접 지시로 진행. `consultationProfessionalConfirmed` 함수 · My Home 약사 확인 UI · 근무자별 약사 기능 제한은 지우지 않았다 — 다른 사용처 확인 후 3단계에서 정리. DB 기반 통합 spec 의 기대값(근무자 계정 약사 상담 403 → 200)을 새 규칙으로 고쳤다(이 환경에는 PostgreSQL 이 없어 실행하지 못함).
- **검증:** API neture-pharmacy 40 suites / 322 통과(15 suites · 218 skip — PostgreSQL 미설정). web-store 102 files / 1003 통과. web-neture MyHomeStoreMembers 13 통과. store-web `tsc -b` · admin · api type-check 통과. 변경 파일 ESLint 오류 0(기존 `_next` 경고 1).
- **확인하지 못한 것:** 운영 화면(사용자 캡처는 #1049 배포 전 화면으로 보인다 — 부제목이 예전 문구). DB 통합 spec 실행. 지시서 §4.
- **문서 정합:** 설계 문서 [`DESIGN-O4O-STORE-CONSULTATION-DATA-SCOPE-V1`](docs/design/DESIGN-O4O-STORE-CONSULTATION-DATA-SCOPE-V1.md) 3곳(약사 확인 계정 · 개별 허용 · 개인 약사 자격 재확인)을 새 결정으로 갱신.

## 2026-11-13 · 키오스크를 소비자 다국어 정책(#1052)에 맞춤 — 한국어 병기 · 위치 번역 재사용 (branch `claude/wizardly-bardeen-ldq332`)

- **PR 묶음:** 바로 아래 「검색 결과 위치」(`2ee3c63f`)와 같은 PR. 지시서 [`WO-O4O-STORE-CONSULTATION-TABLET-ROLES-V1`](docs/work-orders/WO-O4O-STORE-CONSULTATION-TABLET-ROLES-V1.md) §3 2-3단계. #1052(정책 문서) · #1038 은 다른 세션 branch — 통합 담당이 통합 세션에 병합 · 배포를 맡겼다(이 세션은 손대지 않음).
- **한 일:** 키오스크 외국어 화면에 한국어 원문 병기(검색 결과 위치 · 선택 상품 · 답변 카드), 소비자 태블릿마다 끌 수 있음(`showKorean`, 기본 켜짐). 위치 일괄 번역에 재사용 키.
- **결정 사항(§9):** 제품 설명의 한국어 원문은 이미 고른 게시 문단을 한국어로 다시 읽어 얻는다(추가 AI 호출 없음). 원문을 못 읽으면 병기 없이 번역문만(실패로 처리하지 않음). 켜짐은 기본값이라 저장하지 않는다(필드 없음 = 켜짐). 직원에게는 상태 텍스트만.
- **검증:** API neture-pharmacy 40 suites / 322 통과(15 suites · 218 skip — 전용 PostgreSQL 미설정). web-store 전체 102 files / 1003 통과. `pnpm --filter store-web run type-check`(`tsc -b`) · api type-check 통과. 변경 파일 ESLint 오류 · 경고 0.
- **확인하지 못한 것:** 실제 번역 · 게시 자료 · 기기 화면(지시서 §4). 정책 §2-3 의 「번역 저장 · 재사용」은 메모리 캐시 수준까지만 — 영속 저장은 별도 WO.
- **겹치는 PR / 문서 정합:** #1052 가 병합되면 지시서의 정책 링크가 유효해진다(병합 전에는 main 에 그 파일이 없다). 문서 정합: 해당 없음.

## 2026-11-13 · 키오스크 검색 결과에 위치 바로 표시 (branch `claude/wizardly-bardeen-ldq332` — #1049 병합 후 최신 main 에서 다시 시작)

- **PR 묶음:** 이 branch 단독 1 PR(서비스 · API, lane 아님). 지시서 [`WO-O4O-STORE-CONSULTATION-TABLET-ROLES-V1`](docs/work-orders/WO-O4O-STORE-CONSULTATION-TABLET-ROLES-V1.md) §3 2-2단계. 이전 #1049 는 병합됨(`9647760b`) — 그 branch 를 main 에서 새로 시작했다(force push 없음 · 원격 head 는 병합 때 자동 삭제).
- **한 일:** 키오스크 상품 검색 결과마다 위치(고객 언어) 또는 위치 미등록 안내를 바로 표시. 「위치 보기」 버튼 제거, 선택한 상품에 위치 · 읽어 주기.
- **결정 사항(§9):** 위치 번역은 결과의 서로 다른 위치만 번호 붙여 1회 번역(상품마다 호출하지 않음). 번호 · 줄 수가 어긋나거나 실패하면 한국어 원문(오배정 방지). 권한 오류는 그대로 올림. 원문 · 번역 검색어 결과 합칠 때 위치를 빈 값으로 덮어쓰던 문제 수정.
- **검증:** API neture-pharmacy 40 suites / 318 통과(15 suites · 218 skip — 전용 PostgreSQL 미설정; 키오스크 18 포함). web-store 전체 102 files / 1000 통과. CI 와 같은 `pnpm --filter store-web run type-check`(`tsc -b`) · api type-check 통과. 변경 파일 ESLint 오류 · 경고 0.
- **확인하지 못한 것 / 배포 후 Demo:** 실제 번역 모델이 번호 줄을 유지하는지(유지 못 하면 한국어 원문으로 표시됨) · 실제 매장 위치 데이터. 지시서 §4.
- **로컬 참고:** 대체된 이전 로컬 커밋은 로컬 branch `backup/1049-local-superseded` 에만 있다(push 하지 않음).
- **겹치는 PR / 문서 정합:** 열린 PR 대조는 통합 세션. 문서 정합: 해당 없음.

## 2026-11-13 · 계정 삭제 「약국 경영자」 보류 안내 · 운영자 화면 → 관리자 화면 연결 (branch `claude/ecstatic-mendel-2ohu27`)

- **배경(조사):** Admin 「계정 삭제」가 `PHARMACY_TRANSFER_OR_CLOSURE_REQUIRED` 로 멈춤. 코드 · 배포 문제 아님(#1048 배포 확인, 미병합 branch 없음) — 서버의 의도된 보류(`account-business-data.ts` 현재 경영자 검사). 사용자는 Admin 「이용·약국 관리」 → 완전폐업 처리 후 삭제 완료. 운영자 화면(`/operations/neture/members`)에는 그 버튼이 없어 처리 위치를 찾지 못한 것이 원인.
- **한 일 (admin-dashboard 화면만):**
  - `AccountErasureControls.tsx`: `PHARMACY_TRANSFER_OR_CLOSURE_REQUIRED` · `PHARMACY_CLOSURE_INCOMPLETE` 문구에 실제 처리 순서(체크 → 「이용·약국 관리」 → 이전 / 완전폐업 → 「계정 삭제」 재실행).
  - `CentralMemberWorkspace.tsx`: Admin 계정 삭제가 끝나지 않으면 초록 안내가 아니라 빨간 오류 안내로 표시. 원인 코드가 있으면 「삭제 처리 내역에서 재시도」 일반 문구 대신 그 원인의 처리 방법만 표시.
  - 운영자 화면에서 삭제 미완료(`review_required` · `retry_required`) 회원 1명을 고르면 「관리자 화면에서 처리」 링크(`/admin/platform/users?userId=…` · 전체 관리자 권한 필요) 표시. Admin 화면에는 표시하지 않음.
- **추가 (같은 날 · 사용자 보고 「리스트 맨 끝 행이 무엇인지 보이지 않는다」):**
  - 원인: 운영 역할이 많은 관리자 계정은 「가입 유형」 칸에 역할 배지가 모두 쌓여 행이 화면보다 길어지고, 이름 · 이메일이 아래로 밀려 보이지 않았다. Admin 「O4O 플랫폼 관리」 영역의 폭도 `max-w-5xl`(1024px)로 좁았다.
  - `CentralMemberWorkspace.tsx`: 역할 3개까지는 모두 표시하고, 그보다 많으면 「전체 관리자」를 앞에 둔 2개 + 「외 N개」(마우스를 올리면 전체 목록 표시). 운영자 · Admin 회원 목록 공용.
  - `PlatformSectionLayout.tsx`: 폭을 운영자 레이아웃과 같은 `max-w-[1400px]` 로 넓힘. 소비처는 `/admin/platform/*` 탭 전체(플랫폼 홈 · 관리자 계정 · 전체 회원 · 공급자 · 내 매장 · 삭제 화면들) — 폭만 넓어지고 동작은 같다.
  - 검증: admin-dashboard vitest `src/pages/platform` · `src/pages/operators` · `platform-menu-cleanup` 172 통과(신규 1건). `tsc --noEmit` · 변경 파일 ESLint 통과. 실제 브라우저 확인 안 함 — 배포 후 `/admin/platform/users` PC · mobile 에서 마지막 행 이름 표시와 표 폭 확인.
- **결정 사항(§9):** 링크는 권한과 무관하게 보이되 「전체 관리자 권한 필요」를 함께 적는다(Admin route guard 가 막는다). API · 권한 · 서버 판정은 바꾸지 않음.
- **알려진 남은 위험(미수정):** 삭제 차단은 `organization_members` owner 도 보지만, 회원 상세의 약국 목록(이전 · 폐업 버튼 근거)은 `neture_pharmacy_memberships` 만 읽는다(`central-member-workspace.service.ts:117`). 약국 가입 기록 없이 매장 경영자만인 회원은 화면에서 해결 경로가 없을 수 있다 — 실제 사례 확인 시 별도 작업.
- **검증:** admin-dashboard vitest `src/pages/operators` · `src/pages/platform/account-governance` 21 files / 168 통과(신규 3건). admin-dashboard `tsc --noEmit` 통과. 변경 파일 ESLint 오류 0.
- **PR 묶음:** 이 branch 단독 1 PR(서비스 화면 · lane 해당 없음). 겹칠 수 있는 PR 미대조(통합 세션 확인).
- **배포 후 Demo 확인:** Demo 계정은 운영자 · 관리자 화면 권한이 없음 — 통합 담당이 운영자 화면에서 삭제 미완료 회원 선택 시 링크 · Admin 삭제 보류 시 빨간 안내를 확인.
- **문서 정합:** 해당 없음.

## 2026-11-13 · 소비자 다국어 기준 문서 초안 (branch `claude/intelligent-cray-o2p4u3-multilingual-docs` · 문서 전용)

> **2026-11-13 통합 담당 확정(DRAFT → Active).** 다음 실행자: **통합 세션** — 문서 PR 은 코드 branch `claude/intelligent-cray-o2p4u3-multilingual` 다음에 병합한다(그 branch 의 WO 를 링크한다 · AGENTS.md §4-3 R7).

- **새 문서:** [`docs/baseline/O4O-CONSUMER-MULTILINGUAL-POLICY-V1.md`](docs/baseline/O4O-CONSUMER-MULTILINGUAL-POLICY-V1.md) — 상태 DRAFT. 내용:
  - 원본은 한국어 하나, 번역은 AI, 번역본은 재사용, 원본이 바뀌면 다시 번역한다.
  - 외국어 화면에는 한국어를 병기한다(기본 켜짐 · 약사가 끌 수 있음).
  - 「다국어 제품 콘텐츠」는 새로 만들지 않는다(이미 발급된 링크는 계속 열린다).
  - OTC 는 표본 비교 결과로 정한다.
- **결정 사항(2026-11-13 사용자):** 위 내용 그대로다. 한국어 병기를 기본 켜짐으로 둔 것은 이 세션의 판단이다 — 근거는 매장 안에서 약사가 함께 보는 화면이라는 점이다.
- **확정 후 반영(같은 branch · 통합 담당 승인):**
  - `CANONICAL-INDEX` §6 에 ACTIVE 로 등재했다.
  - 기준 문서 4건과 OTC 번역 지침에 이 정책을 가리키는 표기 한 줄을 넣었다. 본문 판정은 바꾸지 않았다.
    - `O4O-STORE-MENU-CANONICAL-TREE-V1`
    - `PRODUCT-RESOURCE-ARCHITECTURE-BASELINE-V3-AMENDMENT`(F12 개정 문서 · 구독 경계 그대로)
    - `O4O-QR-ENTITLEMENT-TWO-TIER-POLICY-V1`
    - `OTC-DESCRIPTION-DESIGN-GUIDE` · `OTC-EN-TRANSLATION-GUIDE`
  - OTC 영문 사전 번역은 정책 §4 판정 전까지 멈춘다.
- **검증:** `check-doc-sensitive` 통과. WO 링크는 코드 branch 병합 전까지 깨진 상태다(병합 순서로 해결).
## 2026-11-13 · 매장 콘텐츠 QR · 태블릿 분리 지시서 (branch `claude/intelligent-cray-o2p4u3-qr-tablet` · 문서만)

> 다음 실행자: **통합 세션** — 지시서 PR. 이후 **CLOUD** 가 [`WO-O4O-STORE-QR-TABLET-CHANNEL-SEPARATION-V1`](docs/work-orders/WO-O4O-STORE-QR-TABLET-CHANNEL-SEPARATION-V1.md) T1~T5 를 순서대로 진행한다(T2 · T5 는 #1049 병합 뒤 · T4 는 DB 구조 변경 승인 뒤).

- **결정 사항:** 지시서 §2 D1~D7.
  - 사용자 결정:
    - 채널은 QR · 태블릿 · 사이니지로 나누고, QR · 태블릿은 각자 탭으로 둔다.
    - 사이니지는 화면 크기와 무관한 재생 목록이다.
    - 콘텐츠를 만들면 QR 이 함께 준비된다.
    - 코너의 제품 · 영상 연결은 근무자가 불편하지 않아야 한다.
  - 세션 판단:
    - QR 목록 기본값에서 코너 QR 을 뺀다. 필터로 볼 수 있다.
    - 코너 QR 은 태블릿 코너 화면에서 출력한다.
    - 콘텐츠 QR 은 출력하거나 담은 것만 목록에 올린다.
    - 제품 ↔ 영상은 `signage_media` 에 제품 열 하나를 둔다(설명서 본문에는 넣지 않는다).
- **검증:** 문서만(`check-doc-sensitive` 통과).
- **겹칠 수 있는 PR:** #1049(태블릿 구조 1단계) — 이 지시서는 코드를 바꾸지 않는다. T2 · T5 구현은 그 병합 뒤에 시작한다.

## 2026-11-13 · 상담 태블릿별 음성 자동 감지 언어 (branch `claude/wizardly-bardeen-ldq332`)

- **통합 세션 수정(2026-11-13 · 통합 담당 지시로 이번 건만 통합 세션이 직접 수정):** 키오스크는 분리하지 않고 1 · 2단계를 한 PR(#1049)로 병합한다(통합 담당 결정 — 앞선 분리 판정 철회). 태블릿 목록 응답에 `configured` 를 더해 저장된 빈 목록과 최초 미등록을 구분(Codex P2) · 태블릿 관리에 행 체크 · 전체 선택 · 상단 ActionBar 선택 삭제(§3-1, Codex P1) · 키오스크 버튼 type · 언어 문구 `kioskLocale.json` 분리(SonarCloud) · 테스트 `Array.at` 제거(TS2550). 검증: 매장 상담 13개 파일 129건 · API 태블릿 · 키오스크 25건 통과, web-store `tsc -b` · api `tsc --noEmit` · 선언 빌드 · ESLint 통과.
- **PR 묶음:** 태블릿 1 · 2단계와 같은 PR. 지시서 [`WO-O4O-STORE-CONSULTATION-TABLET-ROLES-V1`](docs/work-orders/WO-O4O-STORE-CONSULTATION-TABLET-ROLES-V1.md) §3 2-1단계.
- **조사 결과:** 관리자 「음성 자동 감지 후보 · 최대 3개」는 Google 음성 자동 감지에만 쓰인다(직접 고른 언어 · 문자 번역 · 브라우저 음성과 무관). 3개 상한은 Google Speech-to-Text 제약(요청당 후보 최대 3개 · 적을수록 정확 — Google 공식 문서로 확인).
- **한 일:** 태블릿마다 후보 최대 3개(`consultationTablets[].speechLanguages`, 경영자 편집). 직원 음성 인식 · 키오스크가 서버 저장 목록에서 태블릿 후보를 읽고, 없으면 관리자 기본 후보. 키오스크 언어 버튼은 후보를 앞에. 관리자 화면 문구 「기본 후보」. 설계 문서 §1 · 음성 후보 문단 갱신.
- **결정 사항(§9):** 화면이 보낸 언어 목록은 쓰지 않고 서버가 `tabletId` 로 저장 목록에서 읽는다. 후보를 비우면 관리자 기본으로 돌아간다. schema 변경 없음.
- **검증:** API neture-pharmacy 40 suites / 315 통과(15 suites · 218 skip — 전용 PostgreSQL 미설정; 후보 검증 · 저장 목록 읽기 · 키오스크 context 포함). web-store pages/pharmacy + pages/__tests__ 74 files / 852 통과. api · web-store · admin `tsc --noEmit` 통과. 변경 파일 ESLint 오류 · 경고 0.
- **확인하지 못한 것:** 운영 실행 수단이 현재 브라우저 음성이라 Google 후보 효과는 Google 설정 전환 후에만 확인된다(지시서 §4).
- **문서 정합:** 설계 문서 1건 갱신(사용자 지시) · 그 밖 해당 없음.

## 2026-11-13 · 매장 상담 태블릿 구조 2단계 — 소비자 태블릿(키오스크) · 다국어 · 안내 수준 AI (branch `claude/wizardly-bardeen-ldq332`)

- **PR 묶음:** 1단계와 같은 PR(이 branch). 지시서 [`WO-O4O-STORE-CONSULTATION-TABLET-ROLES-V1`](docs/work-orders/WO-O4O-STORE-CONSULTATION-TABLET-ROLES-V1.md) §3 2단계.
- **한 일:** 소비자 태블릿 등록 · 연결 코드(경영자) → 로그인 없는 `/consultation/kiosk`(7개 언어 화면 · 자동 감지 · 음성 · 읽어 주기). 상품 찾기 · 위치 · 게시 제품 설명(질문 시 AI 문단 선택) · 약사 연결 안내. 2분 무조작 초기화.
- **API:** `POST /neture/pharmacy/consultation-tablets/:tabletId/pairing`(store · owner), `POST /neture/pharmacy/consultation-kiosk/*`(기기 자격 · 로그인 없음 · rate limit). 기존 `store_consultation_stations` 행 재사용(`mode='consumer-kiosk'`) — schema 변경 없음. 상담 정리 job 에서 키오스크 행 제외.
- **결정 사항(§9):** 키오스크 권한은 연결 코드를 만든 경영자의 근무자 상담 방식 이용 자격을 매 요청 다시 확인(이용권 · 결제 구조 그대로). 소비자 노출은 근무자 안내 경로만 재사용 — 약사 판단 지원 경로는 연결하지 않음. 약 선택 · 복용 질문 판정은 기존 서버 정규식(`consultationIntent`)을 원문 · 번역 둘 다에 적용(모델 출력에 의존하지 않음). 게시 자료가 길어 번역 불가면 원문 언어로 표시. 질문 비저장.
- **검증:** API jest neture-pharmacy 40 suites / 313 통과(15 suites · 218 skip — 전용 PostgreSQL 미설정), 키오스크 14건 포함. web-store vitest 전체 102 files / 994 통과(키오스크 화면 4 · 목록 2 신규). api-server · web-store `tsc --noEmit` 통과. 변경 파일 ESLint 오류 0(기존 `_next` 경고 1).
- **확인하지 못한 것 / 배포 후 Demo:** 실제 키오스크 기기 · 브라우저 음성 · Google 음성 · 운영 상품 자료 · 실제 AI 호출 비용. 지시서 §4 순서로 확인. 정규식 판정이 놓치는 의료 질문 표현이 있을 수 있다 — 운영 표본으로 보강 필요.
- **다음:** 3단계 정리(고객 화면 짝짓기 · 관리자 배치 설정 제거) · 가격 표시(준비 조건만 기록) — 지시서 §3.
- **겹치는 PR / 문서 정합:** 열린 PR 대조 못 함(통합 세션 확인). 문서 정합: 해당 없음.

## 2026-11-13 · 매장 상담 태블릿 구조 1단계 — 약사 · 근무자 태블릿 목록 · 단일 화면 (branch `claude/wizardly-bardeen-ldq332`)

- **PR 묶음:** 이 branch 단독 1 PR(서비스 + API 소비 · core-hub/migration lane 아님). 지시서 [`WO-O4O-STORE-CONSULTATION-TABLET-ROLES-V1`](docs/work-orders/WO-O4O-STORE-CONSULTATION-TABLET-ROLES-V1.md).
- **한 일:** 내 매장 → 상담을 「약사 태블릿 · 근무자 태블릿」 목록으로 교체(경영자가 이름 붙여 추가 · 삭제, 직원은 조회). 태블릿 한 대에서 문의 · 답변을 끝내고 고객 화면 2대 연결 UI 는 쓰지 않는다. 근무자 화면은 자유 문장 · 음성 입력 + 안내 문구 빠른 입력. 관리자 일반/대형 배치 화면에 「반영되지 않음 · 정리 예정」 안내.
- **API:** `GET/PUT /neture/pharmacy/consultation-tablets`(organizations.metadata.consultationTablets · owner 재확인 UPDATE · schema 변경 없음). `floor-staff` 고객 방향 자유 문장 허용(이용 자격 검사 유지). mode key · 이용 자격 key 는 그대로.
- **결정 사항(§9):** 사용자 결정 — 3종(약사 · 근무자 · 소비자) 복수, 기존 연결 방식 교체, 근무자 자유 입력, 키오스크 안내 수준 AI, 다국어 기본, 가격은 준비만. 세션 판단 — 결제 · 이용권을 건드리지 않으려고 태블릿 종류를 기존 mode(`floor-*` 우선, 없으면 `counter-*`)로 매핑. 소비자 키오스크는 기기 인증 · 소비자용 AI 가 새로 필요해 2단계로 분리(지금은 목록에 노출하지 않음 — route 없는 메뉴 금지). 고객 연결 서버 API · `/consultation/customer` 는 3단계 정리까지 남김.
- **검증:** API jest — consultation-tablets 9 · multilingual-consultation 15 통과, neture-pharmacy 전체 39 suites / 299 통과(15 suites · 218 skip — 전용 PostgreSQL 통합 연결 미설정). web-store vitest pages/pharmacy + pages/__tests__ 72 files / 844 통과. admin platform 18 통과. web-store · api-server · admin-dashboard `tsc --noEmit` 통과. 변경 TS ESLint 오류 0. 문서 민감정보 0.
- **삭제한 테스트:** 매대 연결(heartbeat · 연결 시작) 화면 테스트 2건 — 해당 UI 를 화면에서 뺐기 때문. station 서버 · hook 테스트는 유지.
- **확인하지 못한 것 / 배포 후 Demo:** 실제 브라우저 확인 안 함. 경영자 태블릿 추가 · 삭제(PC/mobile), 직원 조회 전용, 근무자 화면 자유 입력 · 음성 · 판단 지원 없음, 약사 화면 판단 지원 — 지시서 §4.
- **다음:** 2단계(소비자 키오스크 · 다국어 · 안내 수준 AI) · 가격 표시 준비 조건 · 3단계 정리 — 지시서 §3.
- **겹치는 PR / 문서 정합:** 열린 PR 대조 못 함(통합 세션 확인). 문서 정합: 해당 없음.
## 2026-11-13 · TinyFish 운영자 연결·상담 번역 비용 집계 대조

- **branch / 묶음:** `wo/consultation-live-cost-comparison`, main `35703c665`(#1050)에서 시작한 문서 후속. [운영 비용 대조 CHECK](docs/checks/CHECK-O4O-CONSULTATION-LIVE-COST-COMPARISON-2026-11-13.md).
- **연결:** 사용자 직접 TinyFish 설치·운영자 로그인·프로필 저장 후 실제 admin 설정/AI 운영의 사용량·비용 조회 성공. 기존 “관리자·조회 연결 없음”은 해소. 이후 같은 프로필로 반복 조회 가능하되 대상 사이트의 실제 인증 재확인. 비밀번호/토큰/프로필 접근 링크는 저장소에 기록하지 않음. 약사 최종 품질 검수는 사용자 결정으로 **별도 세션**이며 현재 작업의 차단 조건으로 재요청하지 않음.
- **실제 표본:** 같은 공개 인사말 4회 추가 시험. 기준 2회 3,655/4,503ms, 새 동일 세션 2회 2,950/488ms. 모두200/private-no-store. 각 그룹 안의 출력은 같고 그룹 사이는 다름. 번역 집계 3→5→6건, 추정 USD 0.00062100→0.00152550→0.00171750. 기준 증가2건/$0.00090450, 재사용 증가1건/$0.00019200. 다른 scope는 그대로. 7일 scope 합계 차이이며 actor별·실제 provider attempt/청구 대조가 아니고 고정 절감률을 확정하지 않음.
- **관리자 준비:** 설명서 접수/공통 자료 준비 패널 로드·상담자료/QR 구분·오류 없음 확인. 검토/요청/검수 표시는 각0이나 전체 상품 자료 완비로 해석하지 않음. 생성·승인·게시·일정 활성화 안 함.
- **미완료:** 실제 권한 철회·근거 변경·두 허용 매장 격리·원시 로그/가격 버전/청구·대표 부하/지연. 기존 QR 무손실 전체 대조도 새로 완료한 것이 아님. **7차 전체 운영 완료 선언 아님.**
- **겹치는 PR:** 종료 조회 시 #1052·#1051·#1049와 HANDOFF.md만 겹침. main은 시작 기준 `35703c665` 그대로. 기존 절을 보존해 통합하며 PR 생성·병합·배포는 통합 세션 담당.
- **검증/데이터:** TinyFish 실제 운영 화면 3회 관측·인증된 Demo의 번역 HTTP 4회·집계 차이 검산·문서 민감정보/diff 검사. 문서만 변경해 unit/typecheck 재실행 불필요. 업무 데이터/station/권한/설정/DB write·배포 없음. 정상 AI/보안 메타데이터는 기존 보존 정책. 기존 비용·전문 권한 정본과 문서 정합 유지. worktree KEEP(미병합 인계용).

## 2026-11-13 · 소비자 다국어 정리 1단계 — QR 다국어 탭 숨김 · OTC 번역 비교 표본 (branch `claude/intelligent-cray-o2p4u3-multilingual`)

> 다음 실행자: **통합 세션**(PR 생성 · 병합) → **LOCAL** — [`WO-O4O-OTC-TRANSLATION-QUALITY-SAMPLE-V1`](docs/work-orders/WO-O4O-OTC-TRANSLATION-QUALITY-SAMPLE-V1.md) T1~T3 → **CLOUD** T4 판정.
> **T2(운영 번역 경로 호출 · AI 사용 기록 쓰기)는 2026-11-13 통합 담당 승인 완료** — 표본 30건 1회 실행에 한한다.
> 기준 문서 초안은 문서 전용 branch `claude/intelligent-cray-o2p4u3-multilingual-docs` 에 따로 냈다(AGENTS.md §4-3 R6).

- **결정 사항(2026-11-13 사용자):**
  - 소비자 대상 다국어는 한국어 원본 + AI 번역으로 보인다. 외국어 화면에는 한국어를 병기한다(약사가 함께 보며 설명).
  - 「다국어 제품 콘텐츠」(언어별 페이지 별도 작성)는 쓰지 않는다.
  - OTC 는 허가 정보라 원문이 같고 확인할 것은 번역 품질뿐이다 — 표본 비교 뒤 통일 여부를 정한다.
- **한 일:**
  - `services/web-store/src/pages/pharmacy/StoreQRPage.tsx`: QR 자산 선택 창에 `enableMlcSource` 를 넘기지 않는다. 「다국어 제품 콘텐츠」 탭이 사라진다.
  - 이미 발급된 다국어 QR · 공개 링크는 그대로 열린다. 다국어 화면에서 QR 로 넘어오는 기존 진입(`MultilingualQrEntry`)도 그대로다 — 다국어 기능 자체의 정리는 기준 문서 확정 뒤 별도 작업이다.
  - OTC 번역 비교 CLI `apps/api-server/src/scripts/otc-translation-sample.ts`:
    - `extract` — 읽기 전용, 층별 30건.
    - `translate` — 운영 번역 경로, 설명 표 미저장.
    - `compare` — 파일만.
  - 시험 `src/scripts/__tests__/otc-translation-sample.test.ts`. 실행 WO 를 함께 넣었다.
- **검증:**
  - web-store QR 관련 vitest 19/19 · `tsc` 오류 0.
  - api `otc-translation-sample.test.ts` 5/5. 그중 표본 SQL 은 격리 PostgreSQL 의 실제 migration schema 에서 확인했다.
  - api `tsc` 의 오류 2건(`partner-support-scope.middleware.ts` · `product-correction/preview.ts`)은 이 변경과 무관하다.
- **확인하지 못한 것:**
  - 운영 데이터에서 표본이 층별 10건씩 나오는지(T1).
  - 운영 번역 경로 호출(T2) — 클라우드에는 DB · AI 키가 없다.
  - 배포 후 Demo(매장 경영자)로 `/store/marketing/qr?workspace=studio` 「자산 선택」에 탭이 두 개(내 매장 자료 · 운영자 콘텐츠)만 보이는지.
- **겹칠 수 있는 PR:** 확인하지 못했다(통합 세션이 대조).

## 2026-11-13 · AI 비용 절감 운영 검증 — 실제 번역 표본·접근 차단

- **branch / 묶음:** `wo/consultation-operational-verification`, 시작 main `bb5d2134c`. #1042·#1044·#1045 병합과 `25e7f8016 production=DEPLOYED` 확인. 문서만 변경하며 재배포 불필요.
- **실제 실행:** 운영 테스트 로그인 버튼으로 경영자/직원 context·표현 권한 조회. 비로그인 401, 두 역할의 약사 초안/허용되지 않은 임의 매장 403 확인. 경영자만 허용된 floor-staff 인사말 번역 4회: 기준 3,124/2,456ms, 같은 세션 첫 4,003ms/반복 453ms, 모두 200·동일 출력·private/no-store. 측정 2026-11-13 08:53:05~15 KST. [운영 CHECK](docs/checks/CHECK-O4O-AI-COST-REDUCTION-OPERATIONAL-2026-11-13.md).
- **판정/미확인:** 서버 로그 대조가 없어 공급자 호출 수·token·추정/청구 비용은 미확인. 4개 표본의 왕복 시간은 proxy 포함으로 p50/p95나 전체 비용 절감 근거 아님. 경영자는 약사 미확인, 직원은 현재 모든 상담 mode 미승인. 현재 차단과 실제 상태 철회 시험을 구분하며 약사 품질·원천 변경·두 허용 매장 격리·관리자 준비는 미완료. **운영 검증 PENDING 유지**.
- **다음 조건:** 이 환경에 읽기 전용 운영 DB/로그 연결 및 적법한 약사 계정/매장·검수 담당이 필요해 사용자에게 요청했다. 계정 값/비밀번호는 기록하지 않았다. 운영 자료·직원/약사 승인·설정 변경 없이 가능한 검증을 수행했다.
- **겹치는 PR / main 이동:** 조회 시 두 문서와 겹치는 열린 PR 없음. 종료 fetch에서 main `913656ec7` 이동(#1037 법적 문서 범위)을 확인했으며 두 문서와 경로 충돌 없음. 배포 시점/서버별 버전을 요청마다 확인한 것으로 해석하지 않음.
- **데이터/검증:** 업무 데이터 생성·삭제, station 저장, 운영 DB write, 배포 없음. 정상 보안/AI 비용 메타데이터는 기존 보존 정책 적용. 브라우저/API 실제 응답과 GitHub production 상태를 확인했으며 문서 민감정보·diff 검사 수행. 원래 CHECK를 운영 완료로 바꾸지 않음. 문서 정합 유지; branch/worktree는 미병합 인계용 KEEP.


## 2026-11-13 · 계정 삭제 「확인 필요」 원인 표시 (branch `claude/intelligent-cray-o2p4u3-erasure-reason`)

> 다음 실행자: **통합 세션** — PR 생성 · 병합 → 배포 후 Admin 확인. 원인을 배포 전에 알아야 하면 **LOCAL** 이 아래 read-only SQL 을 먼저 실행한다.

- **증상(2026-11-12 사용자 보고):**
  - Admin 「전체 회원 › 해지 회원」에서 한 회원(약국경영자 · 카카오 로그인 · 이메일 없음)의 삭제가 「삭제 미완료 — 확인 필요」로 멈춘다.
  - 「계정 삭제」를 다시 눌러도 결과가 같다.
  - 화면에는 「삭제를 완료하지 못했습니다. 다시 시도해 주시기 바랍니다.」라는 일반 문구만 보였다.
- **원인(코드 확인):**
  - 삭제 전 검토(`reviewManifest`)에서 멈추면 서버는 `error_code` 를 비우고, 실제 원인은 `review_codes` 에 넣는다. 예: `REVIEW:public.<표>` · `COMMUNITY_MANAGEMENT_TRANSFER_REQUIRED`.
  - 회원 목록 · 상세 · 삭제 직후 알림 · 「삭제 처리 내역」은 모두 `error_code` 만 읽었다. 그래서 진짜 원인이 화면에 나오지 않았다.
  - 검토 코드는 데이터가 바뀌기 전에는 매번 같으므로, 다시 눌러도 같은 결과가 반복된다.
  - **어느 표가 막는지는 운영 DB 없이 확정하지 못했다**(클라우드 세션).
- **수정:**
  - 서버: 회원 목록 · 상세의 `erasureErrorCode` 는 `error_code` 가 비면 첫 검토 코드를 쓴다. 전체 검토 코드는 `erasureReviewCodes` 로 함께 준다.
  - 화면: 「삭제 처리 내역」의 실패 원인 칸이 검토 코드를 보인다. 삭제 직후 알림도 `reviewCodes` 를 쓴다.
  - 문구: `REVIEW:<schema>.<table>` 은 「다른 기록(<표>)에 이 회원 정보가 남아 있어 자동 삭제를 멈췄습니다. 다시 눌러도 같은 결과입니다 — 개발 담당에게 이 표 이름을 전달」로 번역한다. 미번역이던 코드 7종에도 문구를 넣었다.
  - 삭제 규칙(무엇을 지우고 남기는지)은 바꾸지 않았다.
- **검증:**
  - `central-member-workspace.postgres.spec.ts` 17/17 — 격리 PostgreSQL, 검토 코드만 있는 경우를 추가했다.
  - admin `member-workspace-erasure.test.ts` 3/3.
  - admin `tsc` 에서 변경 파일 오류 0. `content-editor` 의 `@o4o/ui/ai` 해석 오류는 기존 것으로, 이 변경과 무관하다.
- **원인 표 확인(LOCAL · read-only · `o4o_readonly`):** 식별자 · 개인정보 없이 코드만 나온다.

  ```sql
  SELECT state, error_code, review_codes, updated_at FROM account_erasure_operations WHERE state IN ('review_required','retry_required') ORDER BY updated_at DESC;
  ```

  결과의 표 이름을 CLOUD 로 넘기면, 그 표를 삭제 · 치환 규칙에 등록하는 후속 수정을 한다(그때까지 이 회원 삭제는 멈춘 상태로 안전하게 남는다).
- **배포 후 확인:** Admin 「해지 회원」의 그 회원 행 · 상세에 표 이름이 들어간 문구가 보인다. 「삭제 처리 내역」 실패 원인 칸에 검토 코드가 보인다.
- **겹칠 수 있는 PR:** 확인하지 못했다(통합 세션이 `gh pr diff --name-only` 로 대조).

## 2026-11-12 · 상시 통합 세션 운영 기록 · 후속 작업 요청서 (branch `claude/epic-rubin-5g04vm`)

- **병합(squash)**: #1043 · #1042 · #1044 · #1045 · #1046. 배포: main `25e7f801` → `production` `DEPLOYED`(api + 웹 7개, 23:30 UTC).
- **배포 차단 2건과 조치**
  - #1044 병합 후 api 배포 빌드 `TS4053` 실패 → hotfix #1046(반환 타입 명시) 병합으로 해소.
  - main CI 의 매장 음성 요청 테스트 불안정 → 재실행 1회로 통과.
- **배포 후 Demo 확인**(#1044 댓글에 기록)
  - 매장 경영자 · 직원 PC/mobile 로그인 · 상담 화면 · 표현 설정 권한(경영자 편집, 직원 조회만) · QR 화면 진입 확인. api 4xx/5xx 0.
  - 저장과 AI 호출은 하지 않았다.
- **새 작업 요청서**(다음 실행자 CLOUD 개발 세션)
  - [`WO-O4O-STORE-CONSULTATION-SPEECH-TEST-STABILITY-V1`](docs/work-orders/WO-O4O-STORE-CONSULTATION-SPEECH-TEST-STABILITY-V1.md) — 음성 요청 테스트 불안정 수정
  - [`WO-O4O-CI-API-DECLARATION-BUILD-GATE-V1`](docs/work-orders/WO-O4O-CI-API-DECLARATION-BUILD-GATE-V1.md) — PR CI 에 api 배포 빌드 검사 추가(CI 변경, 통합 담당 병합 판단)
- **남은 일**
  - #1037(partner-support 법적 문서)은 Ready 로 돌렸다. CI 결과를 보고 병합한다.
  - 병합 후 삭제 가능 branch: `wo/product-consultation-resource-separation` · `wo/consultation-structured-product-search` · `wo/shared-product-material-preparation`(통합 담당이 GitHub 에서 삭제)

## 2026-11-12 · AI 비용 절감 7차 사전 검증·운영 인계

- **branch / 통합 단위:** `wo/consultation-cost-verification`. 시작 main `2271a2f59` + 자체 3~6차 검증 의존(`668e0c79f`·`d08bbbf6b`·`9aaac766b`·`d563407be`). 작업 중 기존 3~6차 **PR #1044**를 확인했다. **3~7차 중복 PR 생성 금지**. 이 branch의 `test(consultation): verify reuse savings and customer isolation` commit만 #1044 후속으로 가져오거나 #1044 병합 뒤 7차 차이만 반영한다. 기존 PR·원래 branch를 변경/삭제하지 않았다. 아래 과거 절의 3~6차 통합 안내는 그때의 기록이며 현재 통합 단위는 이 절을 따른다.
- **한 일 / 결정:** 실제 서비스·Extension·policy runtime을 연결한 합성 전체 상담 비교, 동시 상담·60초 만료·다음 고객·자료/표현 변경·권한 거부, 잘못된 번역 후 정상 재시도·정책 중지, 화면의 다음 고객 세션 교체 검증. runtime·schema·비용/권한 정책은 변경하지 않음.
- **실측 범위:** 합성 동일 상담 2회에서 policy 실행 **8→4**, 검증된 출력 동일. fixture DB 조회 **50→86**으로 증가해 운영 부하·전체 비용 개선은 미판정. 실제 공급자 attempt/청구/응답 품질·운영 지연을 측정한 것이 아니다. [7차 CHECK와 운영 절차](docs/checks/CHECK-O4O-AI-COST-REDUCTION-PHASE7-V1.md).
- **검증:** API 상담 15 suites / 148 pass, 매장 화면 5 files / 66 pass. API·매장 typecheck 및 이번 변경 lint/diff/문서 민감정보 검사 통과. Node 24.22.1(안내 22.23.4와 차이)·pnpm 10.25.0. provider/DB는 fixture이며 운영 연결·DB write·유료 호출·배포 없음.
- **확인하지 못한 것 / 다음 실행자:** 통합 세션이 #1044·후속 7차·별도 #1042를 통합하고 배포 버전을 확인한 후 운영 계정/자료로 CHECK §3~4 실행. 약사 검수·PC/mobile Demo·기존 QR·직접 등록 보존·실제 비용/지연 확인 전 **7차 운영 완료 아님**. neture 초기화면 SIWC는 실제 참여 후 별도 범위. 약사 지정 인계 전체 신규 구현도 별도.
- **겹치는 PR / 문서 정합:** #1044와 선행 3~6차 전체 및 이번 번역 테스트, #1042·#1043과 HANDOFF가 겹침. 기존 정본 경계 유지, 앞서 기록한 B2B 전용 안내 2건은 별도 정비 대상. worktree `KEEP` — 미병합 인계용, 미완료 운영 검증 포함.


## 2026-11-12 · 상담 반복 생성 감소·매장 표현 설정 (6차)

- **branch / PR 묶음:** `wo/consultation-reuse-expression` — main `31be41b49` + 자체 3차 `017f9dac3`·4차 `b60710778`·5차 `5a67ed453` + 6차. **3~6차 통합 묶음**이다. 이전 `wo/product-consultation-resource-separation`·`wo/consultation-structured-product-search`·`wo/shared-product-material-preparation`는 이 묶음 **병합 후 삭제 가능**. 원래 branch를 수정·삭제하지 않았고 별도로 중복 통합하지 않는다.
- **한 일:** 동일 actor/store/session/mode/epoch·질문·근거·설정의 검색 계획/문단 선택/약사 초안/번역을 프로세스 메모리에서 60초 재사용·동시 요청 합류. 단계당 완료 결과 64개·1MB 및 합류 대상 64개 제한. 현재 권한·원천을 매번 확인하고 후보 DB 조회는 계속 수행한다. 다음 고객은 새 세션이며 이전 메모리 값은 최대 TTL까지 남을 수 있다. 실패는 미보관. 실제 절감액을 측정한 것은 아니다.
- **표현 설정:** 현재 매장 경영자만 고정 말투·경어·길이를 기존 organizations.metadata에 저장. 직원 조회 가능. 약사 검토용 고객 초안에만 적용하고 전문 자료 권한·수치/출처 검증 유지. 설정·모델 변경 시 이전 초안 사용 검증 실패→재준비. schema·운영 DB·일정·SIWC 변경 없음.
- **검증:** 상담 API 138건 통과 후 표현/초안 2건 추가 및 해당 suite 재검증. 화면 65건 통과, 마지막 설정 화면 수정 후 4건 재검증. API·매장 typecheck, 변경 TS/TSX lint 오류 0(기존 routes 미사용 변수 경고 1). 격리 PGlite 실제 저장 SQL·metadata 보존·직원/다른 매장/퇴사/미인증/비활성 거부 확인. [상세 기록](docs/investigations/IR-O4O-CONSULTATION-REUSE-AND-EXPRESSION-V1.md).
- **배포 후 / 7차:** 실제 공급자 호출·비용·지연·설명 품질, 권한 철회·자료/설정 변경·다음 고객·두 매장 격리·기존 QR 보존을 확인한다. 배포·실제 API 호출·운영 DB write·약사 지정 인계 신규 구현은 하지 않았다. 다중 인스턴스/재시작/만료는 다시 호출될 수 있다. 구형 클라이언트는 기존 비재사용 동작. 배포 전 열린 초안은 다시 준비한다.
- **겹치는 PR / 문서 정합:** 조회 시 #1042·#1039·#1043과 HANDOFF.md만 겹침. #1042(2차)는 별도. PR 생성·병합·배포는 통합 세션 담당. 기존 비용·전문 자료·Display 경계 유지. 이전 B2B 전용 안내 2건은 별도 정비 대상으로 유지.

## 2026-11-12 · 공통 상품 자료 준비·정기 검토·재사용

- **branch / PR 묶음:** `wo/shared-product-material-preparation` — 최신 main `31be41b49` + 3차 `5702b2de6`(원본 `1b2ab0813`/`f56c1b3ed`) + 4차 `95049f85b`(원본 `ec4704ede`) + 5차. 3~5차를 포함한다. 원래 `wo/product-consultation-resource-separation`·`wo/consultation-structured-product-search`는 이 묶음 **병합 후 삭제 가능**이며 원래 branch를 수정·삭제하지 않았다. 중복 통합에 주의한다.
- **한 일:** 공통 상품 등록/없는 제품 등록 요청을 주 진입점으로, 기존 직접 상품의 공통 상품 대조를 추가. 관리자 공통 자료 준비 목록(상품당 한 행, 상담/QR 분리), 현재 상태를 재확인해 준비된 자료를 제외하는 읽기 전용 조사 요청문, 기존 정기 검토의 CONSULTATION 유형·handledOnly 선택 범위·사용 꺼짐 초안 및 화면 왕복 동선.
- **결정 사항:** 신규 저장소·DB schema·자동 생성·추가 AI 호출·운영 일정 활성화 없음. 기존 접수·승인·정기 worker·취급 등록 API를 재사용. handledOnly 미지정이면 기존 전체 상품 범위 유지. 조회는 최대 250개를 확인하고 sparse continuation 제공. 요청문은 최대 25개 공통 상품 식별 정보만 추려 매장/가격/고객 데이터 제외. 실제 생성/검수는 사용자의 외부 AI 및 관리자 기존 승인 절차.
- **직접 등록 보존:** 태블릿/공개 진열·매장 상담/기여·다국어·POP·QR에 local ID 소비처가 남아 있어 일괄 이관/삭제/비활성화하지 않음. 공통 상품 대조는 이름 초깃값을 넣고 사용자가 상품·규격을 선택하는 절차이며 기존 자료 참조를 자동 바꾸지 않음. 운영 이관 완료로 보고하지 않는다.
- **검증:** API 관련 161 pass / 11 skip(전용 PostgreSQL 통합 연결 미설정), 변경 후 준비·권한 12건 재검증. 관리자 30건·매장 57건 통과. API·관리자·매장 typecheck 통과. 변경 19개 TS 파일 ESLint 오류 0(기존 접수 화면 hook 경고 2건). 격리 PGlite에서 실제 SQL·중복 제거·stale/빈 QR·준비 자료 제외·미취급/삭제·두 매장의 동일 상담자료 ID 재사용·정기 범위 검증. [상세 기록](docs/investigations/IR-O4O-SHARED-PRODUCT-MATERIAL-PREPARATION-V1.md).
- **확인하지 못한 것 / 배포 후:** 운영 자료·부하·일정/worker 활성화·실제 자료 이관·실제 관리자/매장 화면·절감액. 관리자 준비 조회→선택→요청문→접수/대조/승인, 두 매장 공통 자료 참조, 기존 QR 보존, 점검 기준 검토·사용 설정·저장 후 일정 설정을 확인한다. 운영 DB 및 배포는 실행하지 않음.
- **겹치는 PR:** 조회 시 #1042·#1039와 HANDOFF.md만 겹침. #1037의 shared types는 다른 파일. PR 생성·병합·배포는 통합 세션 담당. 원래 3·4차 커밋을 따로 중복 적용하지 않는다.
- **문서 정합:** 기존 비용·전문 자료·Display 경계 유지. 앞서 기록한 B2B 전용 안내 2건은 별도 정비 묶음으로 인계. 자동 데이터 이관과 직접 등록 도메인 폐기는 별도 범위.

## 2026-11-12 · 구조화 상담자료의 상품 후보 검색 반영

- **branch / PR 묶음:** `wo/consultation-structured-product-search` — 3차 선행 커밋 `f56c1b3ed`를 최신 main `31be41b49`에 cherry-pick한 `1b2ab0813` + 4차 검색 변경. 원래 `wo/product-consultation-resource-separation`는 이 묶음 **병합 후 삭제 가능**. 원래 branch는 수정·삭제하지 않음. 이미 3차를 따로 통합할 경우 같은 diff를 중복 반영하지 않도록 확인한다.
- **한 일:** 현재 매장의 활성 취급 상품에서 구조화 상담자료 제목·내용으로 후보 검색. 자료 선택 SQL·Zod 검증을 최종 상담자료 읽기와 공유. 일반 B2B HTML 의존 제거. 50건씩 검증 후 상위 12개 정렬, 1,000개 초과는 422 조건 구체화 안내. 늦은 유효 후보/높은 점수를 버리지 않고 원문·내부 점수는 응답에 넣지 않음.
- **결정 사항:** 기존 맥락 계획 1회 유지, 추가 AI 호출 없음. DB schema·운영 데이터·권한·화면·SIWC 변경 없음. 직접 등록 상품의 이름 검색은 유지하고 중앙 자료를 임의 연결하지 않음. 공통 상품 연결·관리자 준비·자료 재사용은 5차. broad 검색은 조용한 부분 결과/빈 결과 대신 명시적 실패.
- **검증:** API 관련 178 pass / 11 skip(전용 PostgreSQL 통합 연결 미설정). 실제 승인→검색→stale 무효화 시나리오를 기존 DB suite에 보강했으나 이 suite는 미실행. 별도 PGlite 격리 PostgreSQL에서 실제 검색 SQL·유형/언어 partial unique index·구조화 전용 용어·scope/status/언어/출처/JSON/stale·중복 listing·pagination·정렬·접근 철회 검증. API typecheck, 변경 6개 TS 파일 ESLint 오류 0. 세부 [조사 기록](docs/investigations/IR-O4O-STRUCTURED-CONSULTATION-PRODUCT-SEARCH-V1.md).
- **확인하지 못한 것 / 배포 후:** 운영 데이터 부하·실제 비용·실제 약사 화면. 성분·용도·주의사항으로 후보→상품 선택→근거 확인→판단 지원, 타 매장/자격 거부, 검색 중 권한 철회, 원천 변경 후 재준비를 확인한다. 실제 운영 DB·공급자 호출·배포는 실행하지 않음. 롤백 시 상담자료를 삭제하거나 B2B로 덮어쓰지 않는다.
- **겹치는 PR:** 조회 시 #1042·#1039와 HANDOFF.md만 겹침. 3차 branch와 새 묶음의 중복 통합에 유의. PR 생성·병합·배포는 통합 세션 담당.
- **문서 정합:** 누적 발견 2건 / 별도 문서 정비 1묶음 — 매장 Excel·AI 자료 흐름 및 상담 맥락 운영 안내의 B2B 전용 설명. 정본 수정은 별도 인계.

## 2026-11-12 · 상품 상담자료 논리 분리

- **branch / PR 묶음:** `wo/product-consultation-resource-separation` — CONSULTATION 유형·공통 조회·관리자 접수·매장 표시·회귀 검증의 한 기능 묶음. 공통 snapshot union은 값 하나만 추가. 기존 소비처 호환을 유지하기 위해 API와 최소 화면 변경을 함께 검증한다. PR 생성·병합·배포는 통합 세션에 인계한다.
- **한 일:** 상품 상담자료 CONSULTATION 추가, QR은 STORE 유지. 새 유형 정본을 우선하고 이전 B2B는 원천·언어·본문·aiSections 근거가 유효한 구조화 자료만 호환 읽기. 일반 B2B 본문 대체 제거. 조회·자료 현황·Excel 공통 리더 사용. 외부 ChatGPT 일반 조회에 새 전문 자료 자동 노출 방지.
- **결정 사항:** 기존 B2B·QR 행은 이동/수정/삭제하지 않음. DB schema·migration 없음. API의 기존 purpose=B2B는 구형 클라이언트용 deprecated 전송 필드로만 보존하고 resourcePurpose=CONSULTATION 추가. 조회/준비 상태의 실제 선택은 새 공통 리더에서 수행. 약사/직원 권한·SIWC·생성 비용 정책 변경 없음.
- **검증:** API 관련 154 pass / 11 skip(전용 PostgreSQL 통합 연결 미설정), 이후 변경한 리더·현황 16건 재통과. 관리자 10건·매장 10건. API·관리자·매장 typecheck, 공통 types 빌드. 격리 PGlite에서 실제 SQL 및 canonical partial unique index 실행 검증. 전체 어댑터/접수의 실제 PostgreSQL 통합·운영 smoke·실제 절감액 검증은 미실행. 세부는 [조사 기록](docs/investigations/IR-O4O-PRODUCT-CONSULTATION-RESOURCE-SEPARATION-V1.md).
- **후속:** 4차는 상담자료 성분·용도·주의사항의 후보 검색 반영. 현재 자연어 검색의 B2B 본문 참조는 남음. 5차는 공통 상품 연결/정기 관리자 준비/재사용. 배포 전 구형 API가 CONSULTATION을 처리하지 못하는 점을 확인하고, 배포 후 관리자·매장·약사 화면·기존 QR을 검증한다. 롤백 시 새 자료를 B2B로 덮어쓰거나 삭제하지 않음.
- **겹치는 PR:** #1042(2차)·#1039와 HANDOFF.md만 겹침. 공통 types 소비처 관련 #1037은 다른 파일. 새 인계 절을 보존해 순차 통합한다. 이 branch는 최신 origin/main에서 시작했으며 미병합 2차 branch를 합치지 않았다.
- **문서 정합:** 발견 1건 / 별도 정비 1건 — 기존 매장 Excel·AI 자료 흐름의 B2B 전용·자유 본문 표시 안내. 정본 변경은 별도 문서 작업으로 인계.



## 2026-11-12 · ChatGPT 콘텐츠 비용 경계 검증

- **branch / PR 묶음:** `wo/chatgpt-content-no-inference` — 외부 콘텐츠 도구 회귀 테스트와 후속 계약 차이 기록 1개 묶음. PR 생성·병합은 통합 세션. 런타임·API·권한·DB·배포 변경 없음.
- **한 일:** 콘텐츠 11종의 실제 dispatcher에서 권한·분기·멱등·실패 검증, 어댑터/직접 저장 서비스 14개 파일의 AST 추론 의존성 검사, MCP HTTP의 Bearer 연결 ID 전달과 위조 인자 제거 검증. 추가 45개 테스트, 기존 포함 7 suites / 85 tests 통과.
- **결정 사항:** 제거할 유료 호출은 발견하지 않아 임의 런타임 가드를 추가하지 않음. 구조화 상담자료 전체 노출은 약사/근무자 접근 및 B2B 논리 분리 전에 하지 않음. 기존 소비자 다국어 초안 저장을 중앙 상담자료/QR 표준설명서 저장으로 취급하지 않음. SIWC 유보.
- **후속 명세:** [IR-O4O-CHATGPT-CONTENT-COST-BOUNDARY-V1](docs/investigations/IR-O4O-CHATGPT-CONTENT-COST-BOUNDARY-V1.md). 다음 3차는 자료 논리 유형·공개 대상·기존 연결 보존, 4차는 구조화 상담자료 검색 반영.
- **검증:** `pnpm@10.25.0 install --frozen-lockfile` 성공(호스트 Node 24.22.1, 저장소 안내 정확 버전 22.23.4와 다름). Jest external-ai 전체 85/85, lint 수정 후 영향받은 26건 재통과. 변경 테스트 3개 ESLint 오류 0(기존 eslintignore 경고 있음), `git diff --check`, docs 민감정보 검사 통과. 앱 전체 build/typecheck·실제 DB/공급자 호출·ChatGPT OAuth 왕복 미실행. 단위 테스트는 어댑터 mock, AST 검사는 전체 전이 분석이 아님.
- **확인하지 못한 것 / 배포 후:** 운영 청구액, 관리자 설정, 실제 ChatGPT 연결 및 기존 화면 재열기. 배포를 요구하는 런타임 변경 없음. 운영 측정은 1차 수집 명세대로 로컬 `o4o_readonly` 경로에서 별도 수행.
- **겹치는 PR:** 조회 시 #1039의 `HANDOFF.md`만 겹침. #1038·#1037·#1028과 이 변경의 코드 경로 겹침 없음. 통합 시 새 인계 절을 보존.
- **문서 정합:** 기존 비용 정책·외부 연결 설계 유지. canonical 변경 없음.

> 저장소: `Renagang21/o4o-platform` · 작업 branch: `claude/clever-bohr-g532hw` · 코드 기준: `main` `c5da5631`(merge 반영) · 작성: 2026-11-11 (클라우드 작업 세션)

> 저장소: `Renagang21/o4o-platform` · 작업 branch: `claude/epic-rubin-5g04vm`(맨 위 절) · 이전 절 branch: `claude/clever-bohr-g532hw` · 코드 기준: `main` `c5da5631`(merge 반영) · 작성: 2026-11-11 (클라우드 작업 세션)
> 다음 실행자: **통합 담당(이 branch 의 PR 생성 · CI · 병합) → Businnect(체크리스트 실행 · 첫 과제)**
> 이전 인계 전문: `git show 0c812623:HANDOFF.md`

## 2026-11-12 · Windows 설치본 실행 테스트 불안정 수정 (branch `claude/intelligent-cray-o2p4u3-pc-installer-test`)

> 다음 실행자: **통합 세션** — 이 branch 로 PR 생성 → `PC installer Windows` 결과 확인 → 병합. main 배포 차단 해소 대상.
> 변경 파일: `tools/o4o-local-agent/test/release-install.test.mjs` 하나(workflow 변경 없음).

- **증상:** 테스트 「Windows packaged runtime starts and health proves its release and data readiness」가 `installed runtime must serve health` 로 간헐 실패.
  - main `31be41b4` run 43209177440: GitHub-hosted `windows-latest` 에서 실패했고, 같은 run 의 재실행(attempt 2)은 통과했다.
  - #1028 branch run 43173519086: 같은 실행기에서 같은 메시지로 실패했다(테스트 21.6s).
- **원인:**
  - 테스트는 설치본 실행 뒤 health 를 약 10초만 기다렸다(250ms × 40회, 연결 거부가 즉시 돌아옴).
  - 그런데 설치본 시작 경로가 무겁다: Start.cmd → PowerShell → `launch.mjs` → 숨긴 PowerShell 창(`pc-window.ps1`: WPF · `Add-Type` C# 컴파일) → `launch.mjs --worker` → `index.mjs run`. 여기에 node.exe 무결성 해시와 Defender 검사가 더해진다.
  - 새 VM 에서 이 경로가 10초를 넘기면 실패한다. 제품 설치기(`install.mjs --window`)는 30초를 기다린다.
  - 실패 뒤의 정리 단계(worker 종료)도 실패하면, `finally` 의 정리 오류가 원래 health 실패를 덮어썼다(`FIXTURE_WORKER_NOT_UNIQUE` 류 메시지). 같은 원인이 다른 증상처럼 보이게 했다.
- **수정(재시도 · skip 없음 · 기다림을 실제 준비 신호 기준으로):**
  - `waitForReadyHealth`: health 의 `releaseId` 가 설치한 release 와 같고 `localData.ready === true` 일 때까지 최대 60초 기다린다(요청당 1초 timeout). 시간이 지나면 남은 시간이 아니라 진단을 담아 실패한다: 마지막 응답 · launcher 종료 코드 · `pc-program.log` 끝부분 · 시험 경로 아래 프로세스 목록.
  - `withRuntime`: 본문이 실패하면 그 실패를 그대로 던지고, 정리 오류는 뒤에 덧붙인다(원래 실패를 덮지 않음).
  - `stopFixtureRuntime`:
    - worker 프로세스가 나타날 때까지 최대 30초 기다리고, 종료 대기를 20초로 늘렸다.
    - 실패 시 단계 코드와 프로세스 목록을 보인다.
    - 포트 해제 확인은 10초 기한이다.
  - 테스트 전체 timeout 을 120s → 300s 로 늘렸다(job timeout 10분 안).
- **검증:**
  - Linux: `node --check` 통과. `node --test tools/o4o-local-agent/test/release-install.test.mjs` 는 13 pass · 2 skipped(Windows 전용) · 0 fail.
  - `withRuntime` 의 오류 보존 동작은 단독으로 확인했다.
  - **Windows 실행은 이 클라우드 세션에서 하지 못했다**(Linux 환경). 반복 실행(10회) 결과도 없다.
- **확인하지 못한 것 — 통합 세션이 PR CI 로 확인:**
  - PR CI 의 `PC installer Windows` 가 통과하는지. 가능하면 `workflow_dispatch` 나 re-run 으로 여러 번 돌려 연속 통과를 확인한다.
  - 실패하면 새 진단 출력(`pc-program.log` · 프로세스 목록)으로 원인을 다시 판정한다.
  - 자체 실행기(self-hosted)는 확인하지 못했다. 이번 실패는 모두 `windows-latest` 였다.
  - 자체 실행기에서는 기존 47821 포트 guard step 이 따로 돈다.
- **겹칠 수 있는 PR:** 없음(이 테스트 파일을 바꾸는 열린 PR 은 확인하지 못함 — 통합 세션이 `gh pr diff --name-only` 로 대조).

## 2026-11-12 · 상시 통합 세션 환경 정비 (branch `claude/epic-rubin-5g04vm`)

> 이 절만 이 branch 의 인계다. 아래 절들은 다른 세션의 인계로 그대로 둔다.
> 다음 실행자: **통합 담당(로컬)** — 이 PR 은 `.claude/hooks/` · `.claude/settings.json` · 등록 파일을 바꾸므로 상시 통합 세션이 병합할 수 없다(새 훅이 거부). 로컬에서 검토 · 병합하면 이 세션의 클라우드 병합이 열린다.

- **결정 사항**
  - 통합 담당이 이 클라우드 세션을 **상시 통합 세션**으로 지정(2026-11-12). 등록은 main 의 `.claude/integration-sessions.json`(세션 `cse_013JvDHnRfTd2t74jmcLH726`) — 등록 파일을 main 에서 읽어야 위조가 안 되므로, 병합 전에는 클라우드 병합이 계속 거부된다(의도).
  - 상시 통합 세션의 범위: 묶음 PR 생성 · CI · 리뷰 확인 · squash 병합 · 자동 Delivery 결과 확인 · 배포 후 Demo 확인. 배포 · promote · CI/배포 인프라 · 에이전트 안전 설정 PR 의 병합은 로컬(통합 담당).
  - 통합 담당이 병합 대상 · 순서 · 시점 판단을 상시 통합 세션에 위임(2026-11-12 통합 담당 지시 — `AGENTS.md` 기록도 통합 담당 지시). 사람 승인이 필요한 병합 · 배포 · promote 는 위임 밖.
  - 병합 방식은 훅에서 squash 로 고정 · `expectedHeadSha` 필수. 다른 방식이 필요하면 로컬.
  - `CLAUDE.md` 의 「setup script 에 의존성 설치 금지」를 실제 환경에 맞춰 「setup script 는 미리 데우기 · 정확한 설치는 SessionStart 훅」으로 고쳤다(환경을 바꾸는 대신 문서를 맞춤 — SessionStart 훅이 매번 `--frozen-lockfile` 을 돌려 lockfile 누락 위험이 없다). 환경 이름 `o4o-dev` → 실제 `o4o-platform`.
- **바꾼 것**
  - 새 `.claude/hooks/guard-mcp-github.mjs`(matcher `mcp__github__.*`) + 테스트 14개. 조사에서 확인한 빈틈: MCP 도구는 Bash 훅을 거치지 않고, 클라우드 MCP 토큰이 소유자 계정이라 `actions_run_trigger` 로 deploy · promote 를 실행하면 workflow 소유자 게이트도 통과했다. 판정:
    - auto-merge 거부 · main 에 직접 쓰는 파일 도구(`push_files` 등) 거부(모든 세션)
    - 클라우드: 검사 전용 workflow(CI Pipeline · CodeQL · AppStore Guard · PR 라벨 · 겹침 알림) 밖의 실행 · 재실행 · 취소 거부. 숫자 ID 조회 실패도 거부. 로컬은 승인 창/대화상자
    - 병합: squash + `expectedHeadSha` 필수. 클라우드는 main 등록 확인 + PR 이 보호 경로(`.github/` · `.claude/hooks/` · `.claude/settings.json` · 등록 파일 · `scripts/ci/` · workflow 가 운영에 실행하는 `scripts/deployment/` · `scripts/privacy/account-erasure-*` · `scripts/db/` · `scripts/ci-build-app.sh` · `infra/` · `deploy/` · `Dockerfile*` · `cloudbuild*`)를 바꾸거나 거기서 옮기지 않을 것(rename 이전 경로 포함 — Codex #1039 P1 2건 반영). 조회 실패는 거부
  - `.claude/settings.json` 에 훅 등록 · 새 `.claude/integration-sessions.json`(`.gitignore` 의 `.claude/*` 에 걸려 예외 한 줄 추가)
  - `AGENTS.md` §4 역할(상시 통합 세션) · 작업 위치 분담(PR 생성 · 병합은 상시 통합 세션, 배포 · 로컬 작업은 VS Code, 병합은 한 시점에 한 곳) · §9(MCP 훅)
  - `CLAUDE.md` 훅 목록 · 세션 표(상시 통합 세션 행) · 환경 이름 · setup script 문구 · branch/PR 문구(작업 세션은 PR 을 만들지 않는다 — §4-1(e) 와 어긋나 있던 것) · 클라우드 GitHub 도구 제약
  - `/integrate` 스킬: 클라우드 명령 대응표(GraphQL 대신 REST · MCP) · 병합 후 Delivery 확인 절차 · HOLD/FAILED/FREEZE 시 로컬 인계
- **검증**
  - `node scripts/ci/check-agent-config.mjs` PASS(훅 테스트 3파일 37개 통과)
  - 변이 검사: 보호 경로 · 등록 확인 · CI 목록 · main 쓰기 · squash 조건을 하나씩 빼면 매번 테스트 실패
  - 실제 GitHub 대상: PR #1036 병합 판정 → 등록 파일이 main 에 없어 거부(fail closed). 이 세션에서 MCP `enable_pr_auto_merge` 호출 → 훅이 거부(훅 작동 확인)
  - 스킬의 REST 명령(`pulls?head=…`) 실제 실행 확인
- **확인하지 못한 것**
  - 병합 후 이 세션에서 실제 MCP 병합이 통과하는지(등록이 main 에 들어간 뒤 첫 병합 때 확인)
  - Windows 로컬에서 새 훅의 승인 대화상자(로컬 `mcp__github__merge_pull_request` 는 approvalFor 경로) — 가짜 gh 테스트는 Windows 에서 skip 된다
  - Bash 훅 `block-cloud-deploy.mjs` 는 `deploy|delivery|promote` 이름만 보므로 `account-erasure-activation.yml` · `pharmacyhub-qr-cutover.yml` 같은 운영 workflow 의 클라우드 `gh workflow run` 은 막지 않는다(새 MCP 훅은 허용 목록 방식이라 막는다). 별도 정비 후보
- **PR 로 묶을 단위:** 한 PR(에이전트 안전 설정 · 문서). DEPLOYMENT = NOT_APPLICABLE(`.claude/` · 문서만)
- **겹칠 수 있는 열린 PR:** 없음 — 열린 PR #1028 · #1031 · #1034 · #1035 · #1036 · #1037 · #1038 은 `AGENTS.md` · `CLAUDE.md` · `HANDOFF.md` · `.claude/` 를 바꾸지 않는다(2026-11-12 `gh pr diff --name-only` 대조)

## 2026-11-12 · migration 전 백업 보관 정리 (branch `wo/premigration-backup-retention`)

> 다음 실행자: **CLOUD** — PR #1028 병합 후 [`WO-O4O-PREMIGRATION-BACKUP-RETENTION-V1`](docs/work-orders/WO-O4O-PREMIGRATION-BACKUP-RETENTION-V1.md) T1 ~ T4.

- **결정 사항(통합 담당 2026-11-12):** 보관 30일 + 최근 5개 유지. 정리는 `deploy-api.yml` 의 migration 성공 뒤에 하고, 실패해도 배포는 막지 않는다. `pre-migration-` on-demand 백업만 대상이다.
- **완료(LOCAL):** 커스텀 역할 `o4oCloudSqlPreMigrationBackup` 에 `cloudsql.backupRuns.delete` 추가.
- **겹칠 수 있는 PR:** #1028(`deploy-api.yml` · `ci-pipeline.yml` 테스트 목록) — 병합 뒤에 시작한다.

## 2026-11-11 · Promote · Delivery 짧은 job 통합 (비용 절감 · branch `claude/peaceful-lamport-sjwtri-promote-cost`)

> 이 절만 이 branch 의 인계다. 아래 절들은 다른 세션의 인계로 그대로 둔다.
> 다음 실행자: **LOCAL** — [`WO-O4O-PROMOTE-SHORT-JOB-CONSOLIDATION-V1`](docs/work-orders/WO-O4O-PROMOTE-SHORT-JOB-CONSOLIDATION-V1.md) §5-A actionlint(병합 전 조건) → **통합 담당** PR 검토 · 병합(배포 workflow 변경 · AGENTS.md §5) → 같은 WO §5-B 병합 후 첫 실행 확인.

- **바꾼 것:** `deploy-api.yml` · `deploy-admin.yml` · `deploy-web-services.yml` 의 `ci-gate` job 을 detect job 의 step(`ci_gate`)으로 옮겼다. 배포 job 은 `needs.<detect>.outputs.ci_gate == 'passed'` 를 요구한다(게이트 조건식 · `ci-gate.mjs --enforce` · 30분 대기 · 권한 그대로). Web `summary` 는 직접 dispatch 에서만 돈다(`github.workflow_ref` 로 판별 — Delivery · Promote 호출 시 skip).
- **절감(실측 2026-10-27~11-10, Promote 62 · Delivery 183 run):** 1분 청구 job 약 665개/15일 제거 → 월 약 1,300분(약 $7.7, private Linux 요금) · 배포 workflow 사용량의 약 22%.
- **위험 판정:** `deploy-risk.mjs --base origin/main --head <이 branch>` = LEVEL_1 · deploy_required=false(세 파일 모두 control 변경). 병합만으로 서비스 재배포 없음.
- **테스트:** 새 `scripts/ci/__tests__/promote-short-job-consolidation.test.mjs`(실제 조건식을 평가해 freeze · dry_run · 소유자 · 대상 · migrate_only · force_deploy · CI 결과 전 조합에서 배포 여부가 종전과 같음 · 결함 6종 주입 시 모두 실패 확인) · `deploy-workflow-gates.test.mjs` 를 새 구조로 갱신 · CI node:test 목록 추가. `scripts/ci/__tests__/*.test.mjs` 520 pass.
- **병합 후 확인(미검증 — 실제 실행 필요):** ① 다음 Delivery 배포 run 에서 각 deploy 호출이 `Detect …`(CI gate step 포함) → 배포 순서로 돌고 `ci-gate` job 이 없음 ② CI gate step 로그에 `ci-gate.mjs` 통과 ③ web 호출에 `summary` 가 skip ④ detect job 시간이 60초 안(넘으면 2분 청구 — 절감 축소). 문제가 있으면 이 PR 을 되돌리는 revert PR 하나로 원상 복구된다(데이터 · 설정 변경 없음).
- **하지 않은 것:** Promote 실행 · 운영 배포 · GitHub 설정 변경. `Same-SHA guard` · `Classify` · `Report` 는 GCP 인증 · 승격 판정 경계라 합치지 않았다.

## 한 일 3 — WO-O4O-REMOTE-COLLABORATOR-ONBOARDING-V1 (2026-11-11 사용자 지시)

신규 원격 공동개발자 `Businnect` 합류 준비를 조사하고 문서를 보완했다. 저장소 공개 상태 · 권한 · ruleset · CI · Runner · secret · 배포는 바꾸지 않았다.

- `1e200899` + 이 commit
  - 새 [`docs/investigations/IR-O4O-REMOTE-COLLABORATOR-READINESS-V1.md`](docs/investigations/IR-O4O-REMOTE-COLLABORATOR-READINESS-V1.md) — 준비도 보고서. 다룬 것:
    - GitHub 접근
    - Private 전환 영향
    - 개발환경 실측
    - 테스트 계정 공백
    - CI · 자체 실행기 경계
    - 준비 항목 총괄(READY / NEEDS_PREPARATION / VERIFY_WITH_BUSINNECT)
    - 첫 시험 과제 후보 3개 · 추천 1개 · 성공 기준
  - 새 [`docs/development/COLLABORATOR-ONBOARDING-CHECKLIST.md`](docs/development/COLLABORATOR-ONBOARDING-CHECKLIST.md) — Businnect 가 순서대로 실행할 시작 체크리스트(정본 링크만, 규칙 복제 없음).
  - `SETUP.md` §3-1 5단계 · §4: 로컬 DB bootstrap 명령 정정. 기존 `pnpm --filter @o4o/api-server migration:run` 은 `migrate.ts` 가 `.env` 를 읽지 않아 `DB_HOST: MISSING` 으로 실패한다(실측). `npx tsx --env-file=.env src/migrate.ts` 로 바꿨다.
  - `docs/development/COLLABORATOR-START-HERE.md`: 체크리스트 링크 한 줄.

### 핵심 발견

1. **운영 정보 없이 개발은 된다**(새 clone 상태 실측). 설치 · `build:packages`(1분) · 빈 DB bootstrap(baseline + 60 · fingerprint PASS) · API `/health` 200 이 모두 통과했다.
2. **로컬 로그인 계정 공백.**
   - Demo 「테스트 로그인」은 운영 DB 에만 있다.
   - 로컬 이메일 가입은 출처 제한(`SIGNUP_ORIGIN_NOT_ALLOWED`)과 메일 인증에 막힌다.
   - 합성 계정은 격리 심사 환경의 매장 경영자 1개뿐이다.
   - → 로컬 합성 계정 CLI 를 별도 WO 로 제안한다(IR §5-3).
3. **GitHub 경계는 준비돼 있다.**
   - `main` 은 PR + `CI Gate` 필수이고 bypass 가 없다.
   - `deploy/*` 태그는 소유자만 만든다.
   - 배포 job 은 `triggering_actor == owner` 일 때만 열린다.
   - production secret 은 Environment 에만 있다.
4. **Private + 자체 실행기 결정 필요.**
   - Write 협업자의 PR 과 자기 branch 의 새 workflow 가 fork 가 아니어서 집 PC 실행기에서 돈다.
   - 자기 branch 의 새 workflow 는 push 만으로도 돈다.
   - 선택지 ①~③ 은 IR §6-2 에 있다.
5. **Private 전환 시 확인할 것:**
   - 개인 Free 플랜에서 ruleset · Environment 보호가 유지되는지(유지되지 않으면 write 협업자가 main 에 직접 push 할 수 있다)
   - secret scanning · push protection 이 꺼지는지

## PR 로 묶을 단위 (이 branch 전체)

- **묶음 ① 문서**
  - `d388157e`(Core IR) · `7c55c4ff`(Core registry · 문서 정합) · `1e200899` 와 이 commit(합류 준비 IR · 체크리스트 · SETUP 정정) · HANDOFF.md
- **묶음 ② CI · 설정**(§5 · `.github/` · 병합은 통합 담당 판단)
  - `cd6aebf1`(core-paths · `core-change` 라벨 · CODEOWNERS · workflow 3개)
- 순서: ① → ②, 또는 한 PR. ②의 테스트가 ①의 registry 문서 존재를 확인한다.
- 같은 branch 에 두 묶음이 있는 이유: 세션 지정 branch 외 push 금지. 분리 여부는 통합 세션이 정한다.

## 결정 사항 (§9) — 한 일 3

- 시작 체크리스트는 새 문서 1개로 만들었다. 규칙은 복제하지 않고 정본 링크와 「확인」 기준만 둔다. 이름은 계정과 무관하게 다음 합류자에게도 재사용할 수 있도록 `COLLABORATOR-ONBOARDING-CHECKLIST` 로 했다.
- SETUP 명령 정정은 온보딩 문서 보완 범위로 보고 이번에 했다(동작 · 판정 변경 없음, 실측 근거).
  - `migrate.ts` 가 `.env` 를 읽게 고치는 코드 변경은 하지 않았다. migration 도구는 Core(schema) 영역이라 별도 판단으로 넘긴다.
- 첫 과제 추천: 후보 1(Neture 카탈로그 일괄등록 카드 2개 404). 근거가 명확하고 판단할 거리가 없으며, 파일 1개와 테스트 1개다.
  - 관리자 화면이라 로컬 로그인 확인은 테스트로 대신하고, 배포 후 통합 담당이 확인한다.
- 로컬 실측에 PostgreSQL 16(이 컨테이너 설치본)을 썼다. 기준 15 재현은 Businnect 몫으로 남겼다.

## 검증 결과 — 한 일 3

- 실측(이 클라우드 컨테이너 · 운영 정보 0):
  - `pnpm install --frozen-lockfile` 통과
  - `build:packages` exit 0(1분 1초)
  - 빈 DB `npx tsx --env-file=.env src/migrate.ts` → `Migration Job - SUCCESS`
  - 기존 SETUP 명령 실패 재현
  - api `build` 29초
  - `node dist/main.js` → `/health` 200
- 정리: 실측 뒤 API 종료 · 임시 DB 중지 · 로컬 `.env` 삭제. 임시 DB 데이터 폴더(저장소 밖)는 권한상 재귀 삭제가 막혀 컨테이너 회수에 맡겼다.
- `node scripts/check-doc-sensitive.mjs` — 0건.
- GitHub 조회(read-only): 저장소 설정 · ruleset 2개 · 협업자 · CODEOWNERS 오류.

## 확인하지 못한 것 — 한 일 3

- `production` Environment 의 ref 제한 · reviewer, Actions `GITHUB_TOKEN` 기본 권한(이 세션 proxy 가 해당 API 를 막음) → 통합 담당이 설정 화면에서 확인.
- 신규 개발자 PC 의 clone · 설치 · 빌드 · 로컬 API · 서비스 dev server · PostgreSQL 15 · Windows → Businnect 가 체크리스트 §1~§5 로 확인하고 결과를 HANDOFF 로 보고.
- web-neture dev server 기동(이 세션에서는 하지 않음).
- `require_extra_approval_for_unattributed_changes=true` ruleset 항목의 정확한 동작.

## 확정 사항 (2026-11-11 사용자 결정 — 결과 수용) — 한 일 3

1. Businnect 는 신규 원격 공동개발자이며 기존 Write 권한을 유지한다.
2. 초기에는 Businnect 의 PR · branch 코드를 집 PC 자체 실행기에서 실행하지 않는다(IR §6-2 ①).
3. 저장소 Private 전환을 추진한다. 실행 전에 다음을 확인한다.
   - ruleset
   - `production` Environment
   - secret 검사(secret scanning · push protection)
   - Actions 비용
4. 로컬 합성 계정 CLI 는 별도 WO 로 준비한다(IR §5-3). 운영 DB · 실제 개인정보는 쓰지 않는다.
5. Businnect 첫 시험 과제는 IR §7-2 후보 1(Neture 카탈로그 일괄등록 카드 404 수정)로 확정한다. 성공 기준은 IR §7-3 이다.
6. `delivery.yml` 비소유자 수동 실행 시 GCP 인증 진입 문제는 별도 CI 보완 작업으로 분리한다.

**이 결정만으로 실행하지 않는 것:** Private 전환 · 자체 실행기 활성화(`CI_RUNNER_LINUX` 설정 포함) · GitHub 권한 변경 · 운영 배포. 각각 별도 지시와 사전 확인 후에 한다.

### 후속 작업 (각각 별도 WO · 별도 branch)

| # | 작업 | 실행 위치 · 주체 | 비고 |
|---|---|---|---|
| F1 | Private 전환 사전 확인 — 플랜 · ruleset · `production` Environment(ref 제한 · reviewer) · secret scanning · push protection · Actions 비용/예산 차단 · `GITHUB_TOKEN` 기본 권한 | 통합 담당(설정 화면 · read-only) | IR §2 · §1 표의 VERIFY 항목. 전환 실행은 그 뒤 별도 결정 |
| F2 | 자체 실행기 기준 문서에 「Write 협업자 코드는 초기 미실행」 반영 · 선택식 보완 검토 | CI 정비 트랙 | `O4O-SELF-HOSTED-CI-RUNNER-V1`(DRAFT) §6 · §9. 이번에 문서 · workflow 는 바꾸지 않았다 |
| F3 | 로컬 합성 계정 provision CLI | 클라우드 작업 세션 | IR §5-3. loopback · 표식 DB 전용, 기본 dry-run, 3역할 |
| F4 | `delivery.yml` classify 소유자 조건 | CI 정비 트랙(§5 위험 변경 · 통합 담당 병합 판단) | IR §1-1 |
| F5 | Businnect 첫 과제 | Businnect 작업 branch → 통합 세션 PR | IR §7-3 성공 기준. 배포 후 관리자 화면 클릭 확인은 통합 담당 |

## 겹칠 수 있는 열린 PR — 한 일 3

이 commit 직전 조회에서 겹치는 열린 PR 은 없다. `SETUP.md` 는 여러 작업이 자주 바꾸는 파일이다.

## 문서 정합 — 한 일 3

`발견 2건 / SUPERSEDED 표기 0건 / 링크 수정 0건 / 별도 WO 제안 2건`

- 발견 1: AGENTS.md §4-1(e) ruleset 기록값 「admin bypass 가능」 ↔ 현재 bypass_actors 없음. 보고만 한다.
- 발견 2: SETUP migration 명령 오류. 정정했다.
- WO 제안: 로컬 합성 계정 CLI, 자체 실행기 × 협업자 결정.

---

## 한 일 2 — WO-O4O-CORE-OWNERSHIP-AND-CHANGE-BOUNDARY-V1 (2026-11-11 사용자 지시)

IR(아래 「한 일 1」)을 바탕으로 Core 소유권 · 변경 경계를 정비했다. 실행 코드 · DB · 배포 · ruleset 변경은 없다.

1. `7c55c4ff` docs(core) — 문서
   - 새 정본 [`docs/baseline/O4O-CORE-REGISTRY-V1.md`](docs/baseline/O4O-CORE-REGISTRY-V1.md):
     - Core 의 현행 정의 · 실제 위치
     - A/B/C 등급(파일 · 모듈 단위)
     - `core-change` 라벨 · CODEOWNERS 표시 방법
     - 과거 Freeze 결정은 보존
   - 상충 정비:
     - `CLAUDE.md` §3 · `docs/baseline/core-boundary.md` 의 패키지 4개 「동결 Core」 목록을 registry 로 대체했다. `auth-core` 는 소비처 0 이다. 네 패키지는 B 등급이고 WO 규칙도 유지한다.
     - `O4O-CORE-FREEZE-V1` 상단에 현행 위치 안내 한 줄을 넣었다(본문 보존).
     - `CANONICAL-INDEX` §2 에 행을 추가했다.
     - `AGENTS.md` §5 · §7 에 registry 링크를 넣었다.
   - `docs/development/COLLABORATOR-START-HERE.md`:
     - §5-1 「일반 개발과 Core 계약 변경」을 추가했다.
     - 작업 흐름을 AGENTS.md §4-1(e)(push · 인계까지, PR 은 통합 세션)에 맞췄다.
2. `cd6aebf1` ci(core) — 자동화 · CODEOWNERS
   - `scripts/ci/core-paths.mjs`: B 경로 단일 목록(64개, 모두 실제 존재) + 판정 함수.
   - 기존 `automation-pr-overlap.yml` · `scripts/ci/pr-overlap.mjs` 를 재사용했다.
     - Ready PR 의 파일을 B 목록과 대조해 `core-change` 라벨을 달고 뗀다.
     - 표시만 하고 `CI Gate` needs 에 없다. 라벨 API 실패는 로그만 남긴다.
     - workflow 변경은 sparse-checkout 1줄 · 주석뿐이고 권한은 그대로다.
   - `.github/CODEOWNERS`:
     - 존재하지 않는 조직 팀(`@o4o-platform/*-team`)을 지정하던 내용을 걷어 냈다(GitHub 판정 Unknown owner 15건).
     - 확인된 계정(통합 담당 `@Renagang21`)만 B 경로 · `/.github/workflows/` · CODEOWNERS 자체에 지정했다.
     - 전체(`*`) 기본 소유자는 두지 않는다.
   - 회귀 테스트:
     - `scripts/ci/__tests__/core-paths.test.mjs`(신규): 형식 · 경로 존재 · CODEOWNERS 일치 · 판정.
     - `pr-overlap.test.mjs`: 라벨 추가 · 유지 · 제거 · API 실패 시 계속.
     - CI node:test 목록에 추가했다(`ci-pipeline.yml` 1줄).
   - `automation-repo-setup.yml` 라벨 목록에 `core-change` 를 추가했다(색 · 설명. 수동 실행용).

## PR 로 묶을 단위 (한 일 2 시점 — 위 「이 branch 전체」 표가 최신)

AGENTS.md §4-1(e) 「묶음 단위」는 CI · workflow 변경을 별도 PR 로 분리한다. 이 branch 하나에 두 묶음이 있으므로, 통합 세션이 분리 여부를 정한다. 별도 branch 를 만들지 않은 이유: 세션 지정 branch 외 push 금지.

- **묶음 ① 문서**
  - `d388157e`(IR) + `7c55c4ff`(registry · 문서 정합) + 이 HANDOFF.md
- **묶음 ② CI · 설정** — §5 위험 변경 · `.github/` 라 병합은 통합 담당이 판단
  - `cd6aebf1`(core-paths · pr-overlap 라벨 · CODEOWNERS · workflow 3개)
  - ②의 테스트(`core-paths.test.mjs`)는 ①의 registry 문서 존재를 확인한다. 따라서 ①을 먼저 병합하거나 둘을 한 PR 로 낸다.

## 결정 사항 (§9)

- **CODEOWNERS 소유자:** GitHub 협업자는 `Renagang21`(admin) · `Businnect`(write) 두 계정이다. 역할 정의가 확인된 계정은 통합 담당뿐이라 `@Renagang21` 만 지정했다. `Businnect` 는 지정하지 않았다(WO: 확인되지 않은 계정 임의 등록 금지 — 소유 범위는 사용자 결정).
- **라벨 위치:** 새 workflow 를 만들지 않고 기존 PR 겹침 자동화에 붙였다.
  - 그 자동화가 이미 PR 파일 목록 · `issues: write` 권한을 가지고 있다.
  - 실행 정책(Ready 만 · fork 제외 · gate 아님)도 같다.
  - `.github/labeler.yml` 은 이를 읽는 workflow 가 없는 죽은 설정이라 쓰지 않았다(정리는 범위 밖).
- **목록 일치 강제:** `core-paths.mjs` · CODEOWNERS · registry 표가 어긋나지 않도록 테스트가 경로 존재와 CODEOWNERS 일치를 확인한다. 파일을 옮기면 테스트가 실패해 목록 갱신을 강제한다.
- **C 등급:** 분리하지 않고 B 로 관리한다(registry §3-4).

## 검증 결과

- CI 와 같은 node:test 목록 25개 파일 — 492 pass / 0 fail(신규 `core-paths.test.mjs` 5 · `pr-overlap.test.mjs` 10 포함).
- `node scripts/check-doc-sensitive.mjs` — 0건.
- `node scripts/ci/check-agent-config.mjs` — PASS.
- 바꾼 workflow 3개 YAML 파싱 — 통과.
- **GitHub CODEOWNERS 판정**(`repos/Renagang21/o4o-platform/codeowners/errors`, read-only): main **15건** → 이 branch **0건**.

## 확인하지 못한 것

- **실제 PR 에서 `core-change` 라벨이 붙는지(라이브):** 작업 세션은 PR 을 만들지 않아 확인하지 못했다.
  - 이 묶음의 PR 이 Ready 가 되면 그 PR 의 `PR Overlap Notice` 로그에 `core-change: absent` 가 나와야 한다. 이 PR 은 B 경로를 바꾸지 않는다.
  - 이후 B 경로를 바꾸는 첫 PR 에서 라벨이 붙는지 통합 세션이 확인한다.
- **라벨 자동 생성:** 저장소에 `core-change` 라벨이 아직 없다(조회 확인). 첫 부착 때 GitHub 가 만든다는 동작에 기대고 있다. 실패하면 로그에 `core-change: error` 가 남고 겹침 알림은 계속된다. 그때는 `automation-repo-setup.yml` 을 수동 실행해 라벨을 먼저 만든다(라벨 생성은 GitHub 설정 변경이라 실행하지 않았다).
- **CODEOWNERS 리뷰 요청:** PR 작성자 본인에게는 요청이 가지 않는다. 통합 세션이 통합 담당 계정으로 PR 을 만들면 리뷰 요청은 사실상 생기지 않고 라벨이 주 표시가 된다.
- **ruleset code owner review 필수화:** 변경하지 않았다(WO 제외 범위). 개인 소유 Private 저장소에서의 플랜 조건도 미확인이다.

## 결정 필요 (통합 담당 · 사용자)

1. ~~`Businnect` 계정을 CODEOWNERS 의 어느 경로 소유자로 둘지~~ — 2026-11-11 WO-O4O-REMOTE-COLLABORATOR-ONBOARDING-V1 에서 「지정하지 않음 · 필수 리뷰 강제 없음」으로 확정
2. B 변경에 ruleset code owner review 를 필수로 켤지
3. IR §11 의 나머지 항목: 공동개발자 전체 읽기 허용 · `organizations` 이중 매핑 · 원장 정리 · Skill 설계 위치

## 겹칠 수 있는 열린 PR

- 조회 시점에 확인한 결과 겹치는 PR 은 없다. 통합 세션이 PR 을 만들 때 다시 확인한다.
- `scripts/ci/pr-overlap.mjs` 와 `ci-pipeline.yml` 은 CI 작업이 자주 바꾸는 파일이다.

## 문서 정합

`발견 12건 / SUPERSEDED 표기 0건 / 링크 수정 0건 / 별도 WO 제안 1건`
- 발견은 IR §5 와 같다.
- 이번 WO 에서 그중 「동결 Core」 정의 상충(CLAUDE.md §3 · core-boundary ↔ CORE-FREEZE)을 정비했다. 대체가 아니라 현행 안내를 추가했으므로 SUPERSEDED 표기는 하지 않았다.
- 나머지 11건(RBAC-FREEZE · USER-OPERATOR · NETURE-DISTRIBUTION · CHECKOUT-V2 · STORE-LAYER · APP-LMS · CONTENT-STABLE 등 경로 · 서술 drift, `.github/labeler.yml` 죽은 설정 포함)은 범위 밖이라 보고만 한다. 별도 문서 정합 WO 를 제안한다.

---

## 한 일 1 — O4O Core 중앙화 · 원격 공동개발 접근 경계 조사 (2026-11-11 사용자 지시)

이 branch 의 이전 PR Renagang21/o4o-platform#1002(배포 차단 훅 로컬 ask)는 병합됐다. 그래서 같은 branch 이름을 최신 `origin/main` 에서 다시 시작했다. 이 branch 의 PR 은 **미생성**이다(PR 은 통합 세션이 만든다 — AGENTS.md §4-1(e)).

- 새 문서 [`docs/investigations/IR-O4O-CORE-CONSOLIDATION-V1.md`](docs/investigations/IR-O4O-CORE-CONSOLIDATION-V1.md) 하나를 추가했다.
- 조사 전용이다. 코드 · DB · CI · 배포 · GitHub 설정과 기준 문서는 바꾸지 않았다.
- 핵심 결론:
  - 실제 Core 는 api-server 안에 있다. `packages/*-core` 는 이름과 실제가 다르고, 소비처 0 패키지가 9개다.
  - 최상위 `core/` 이동은 비권장이다.
  - Core registry 문서 + CODEOWNERS · `core-change` 라벨로 경계를 표시하는 것을 권한다. 그다음 잔재 제거와 중복 일원화를 하고, api-server `src/core/` 이동은 선택으로 둔다.
  - C(소스 분리)는 지금 하지 않고, 필요하면 프롬프트 · 정책 값의 외부화를 먼저 검토한다.

