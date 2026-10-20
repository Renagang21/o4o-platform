# CarePharm 협업체 공간과 내 매장 업무 연결

> **상태**: COMPLETED · 개발·로컬 검증 완료, main 통합·배포는 후속
> **작성일**: 2026-10-20 · **최종 갱신**: 2026-10-20
> **근거 WO/IR**: 사용자 공간별 업무 구현·단일 공간 작업·push까지 지시

## 범위와 TODO

- [x] 최신 main `2ec31a4ba5`에서 전용 worktree/branch 생성, 문서·코드 조사.
- [x] 공간별 책임과 기존 기능을 대조해 작업안을 보완.
- [x] 협업체 메인에 공동공간과 내 매장의 역할·이용 순서 안내.
- [x] 내 매장 CarePharm 업무를 공급제품·회원자료·안내물 제작 중심으로 구성.
- [x] 실제 게시된 CarePharm 자료 미리보기, 새로고침·빈 상태·실패/재시도 제공.
- [x] 자료 사본·POP·정보 QR·블로그의 기존 화면 연결, 공개 소식·회원 문의는 협업체로 연결.
- [x] 선택 약국·계정·서비스 변경과 늦은 응답·가입 해제 시 이전 자료를 표시하지 않는지 확인.
- [x] 관련 회귀·build/type/lint·desktop/mobile 화면 검증 및 결과 기록.
- [x] 검증 결과와 명시 경로 commit·push 인계 정보를 정리 — 실제 push·정확한 HEAD·미커밋 0은 최종 보고로 확인.

이번 작업은 개별 에이전트에 위임하지 않는다. PR 생성·main 병합·배포는 수행하지 않는다. 운영 데이터 write·사업 등록·회원 승인·권한 부여·새 migration·의존성 변경도 없다.

## 문서·코드 조사 후 확정한 배치

| 업무 | 협업체 메인/회원 공간 | 내 매장 | 기존 구현과 보완 |
|---|---|---|---|
| 가입·승인 | 해당 서비스에서 신청, 담당 운영자 심사 | 상태 확인·해당 서비스 진입 | 기존 business 가입 원장·server gate 유지 |
| 소식·교류·업무 문의 | 공개 공지와 회원 전용 게시판 | 공개 소식 링크·승인 회원의 커뮤니티 진입 | 새 알림/문의 원장 없이 기존 화면 연결 |
| 공급제품 | 운영자가 대상별 공급 제안 심사 | 승인 조건 열람·발주·주문 확인 | 기존 `supply_proposals`·공급/주문 화면 재사용 |
| 회원자료 | 운영자 제작·공급자 요청 심사·회원 게시 | 자료 미리보기·독립 사본 가져오기·편집 | 기존 `semi_franchise_contents`·copy API·자료함 사용 |
| 안내물 | 배포용 원본 제공 | 회원자료의 POP·블로그 활용, 제품·매장 콘텐츠의 정보 QR 관리 | 공통 제작 화면 연결, 새 전용 제작기 없음 |

근거: [업무공간 정본](../baseline/O4O-ROLE-WORKSPACE-ARCHITECTURE-V1.md) §0·§3·§6, [서비스 탐색](../baseline/O4O-HOME-SERVICE-DISCOVERY-V1.md), [자료함/사본](../design/DESIGN-O4O-STORE-LIBRARY-AND-ASSET-CANONICAL-SOURCE-V1.md), [소비자 commerce 경계](../baseline/O4O-STORE-COMMERCE-BOUNDARY-V1.md), [B2B 주문](../baseline/O4O-B2B-SUPPLIER-TO-STORE-ORDER-CONTRACT-V1.md).

현재 `CarePharmToolsPage`는 공급·자료·주문 링크와 미확정 CGM/무료혈당기 안내만 제공한다. 기능이 없는 준비 중 패널을 제거하고 위의 실제 업무 진입과 게시 자료를 제공한다. 가입이 승인된 **선택 약국**을 기존 `store/context`로 확인한 뒤 기존 `store/contents?sf=carepharm`를 호출한다. 약국 A나 pharmacy 가입을 다른 약국/CarePharm 승인으로 대신하지 않는다. 계정·조직·서비스 문맥 전환 시 화면을 초기화하고 응답이 늦게 도착하면 폐기한다. 개별 자료·사본·발주·커뮤니티 API의 기존 서버 권한 검증은 유지한다.

최근 자료는 기존 서버 목록의 게시 순서에서 최대 3개를 보여준다. 공지/회원 게시글을 자동 복사하거나 새 알림·읽음 기록·통계를 만들지 않는다. 이미 가져온 사본은 가입 종료 이후에도 매장 소유이므로 공통 자료함은 그대로 사용한다. 안내물 제작 도구도 기존 공통 매장 권한을 따른다.

추가 대조: `StoreContentsSelector`는 snapshot의 POP·블로그 제작을 지원하지만 snapshot 직접 QR 대상은 지원하지 않는다. QR은 제품·매장 직접 콘텐츠·지원 실행 자산을 기존 선택기로 연결한다. UI도 이 범위를 명시하며 사본→QR 계약을 이번 작업에서 확대하지 않는다. 공통 QR 원장·resolver 변경 없이 업무 진입을 제공한다.

무료혈당기·CGM은 사업 확정 후 별도 기획한다. 교육은 Study에 실제 강좌가 개설됐을 때 공지·게시글로 안내한다. 환자 기록·상담·추적 관리·재방문·성과 보고는 구현하지 않는다.

## 소비처·계약 확인

- CarePharm 전용 페이지 두 곳을 수정하며 공통 cooperation 모델·메뉴·guard·API·DB 계약은 변경하지 않는다.
- Store의 공급·자료·주문 query는 기존 화면이 실제 처리하는 `source=sf:carepharm`, `business=carepharm`을 사용한다.
- POP `/store/marketing/pop-v2`, QR `/store/marketing/qr`, 블로그 `/store/content/blog`, 자료함 `/store/library/contents`는 기존 실제 route다.
- 회원 커뮤니티 이동은 기존 `cooperationDestination`·`requestServiceHandoff`를 사용하며 선택 조직을 전달한다. 직원은 기존 정책대로 매장 업무를 이용하되 경영자급 전용 회원 커뮤니티 진입은 제공하지 않는다.
- 과거 WO는 당시 기록으로 보존하고 정본 색인·정책을 변경하지 않는다.

## 검증·인계

### 실제 실행 (2026-10-20)

- Node 22.18.0 / pnpm 10.25.0, frozen lockfile·오프라인 무결성 설치·`pnpm run build:packages` PASS. 의존성·lockfile 변경 없음.
- Store 전체 Vitest **60 파일 / 713 PASS**. 최종 문구 정비 후 CarePharm 화면 focused **18 PASS**. 로그인 없음·약국 없음, pharmacy/다른 모델 가입으로 대체 불가, 선택 약국 불일치, 약국·계정·서비스 전환의 늦은 응답, 타 사업 자료 응답 거부, 자료 실패와 빈 상태 구분, 복귀/주기적 승인 재확인, 직원의 기존 이용 범위, 커뮤니티 중복 클릭·실패·가입 해제·늦은 응답을 확인했다.
- Neture CarePharm 홈·공지·회원 커뮤니티·운영 레이아웃·기존 destination 회귀 **5 파일 / 58 PASS**. 새 안내 링크가 선택 약국 query를 보존하고 미승인 약국에 Store 진입을 제공하지 않음도 확인했다.
- 서버 Jest **2 suite / 32 PASS**: `business-store-access.integration.spec.ts`, `carepharm-handoff.integration.spec.ts`. **격리 localhost PostgreSQL 15**에서 실제 조직 권한·사업 가입 SQL, 자료 list/get/copy gate, 발급 controller → 실제 client helper → exchange 계약을 실행했다. 다른 약국 승인 차용·pending/rejected/suspended/terminated·해제·다른 계정·조직 권한 제거·사업 폐쇄·다른 운영자 범위, 최신 게시 자료 3개 정렬·미게시/타 사업 제외, 정지 후 직접 상세/복사 거부 및 잘못된 handoff origin/path 거절을 확인했다.
- 위 테스트의 인증 세션·토큰 생성 경계와 성공 사본 생성기는 fixture다. 실제 서버 판정 SQL·자료 service·handoff controller/client는 mock으로 대체하지 않았다. **HTTP forum 전체 E2E 또는 성공 사본 저장 E2E로 표현하지 않는다.** 기존 테스트 fixture에 빠져 있던 현행 `cooperatives`·`cooperative_roles`, 역할 유효기간 열만 테스트 schema에 반영했다. 운영 스키마·권한 계약·migration 변경 없음.
- 테스트 schema 잔존 **0**을 DB에서 확인하고 이번 작업의 PostgreSQL 컨테이너를 제거했다. 운영 DB·실계정 가입/승인·권한 부여·업무 데이터 write는 하지 않았다.
- Store·Neture production build와 API `tsc --noEmit` PASS. 변경 TS/TSX ESLint error/warning **0**, `git diff --check`, 문서 민감정보 검사 PASS. 기존 번들 크기·Browserslist 안내, Store Vitest의 기존 Tailwind content 설정 안내는 남아 있다.
- 최종 production 번들을 Chromium에서 **1440px / 390px**, **7종 × 2 = 14 PASS**: 승인 약국 업무 화면·조직 헤더/사업 query, 제작 도구 anchor, 최근 자료→기존 상세/사본 화면, 자료 조회 실패→재시도→실제 빈 상태, 회원 커뮤니티 handoff 요청·실패 표시, 승인 해제 후 자료 제거, 협업체 홈의 약국 선택→업무 안내 이동. 가로 넘침·pageerror **0**, desktop/mobile 스크린샷을 직접 확인했다. API·로그인은 **합성 응답**이며 운영 권한 판정을 대신하지 않는다. 운영 사이트에 게시하거나 쓰기 요청을 보내지 않았다.
- 브라우저/로그 산출물은 `/tmp/carepharm-workspace-browser/`와 task별 `/tmp` 로그에 두고 저장소에 추가하지 않는다.

### 인계

- branch: `wo/carepharm-store-workspace`, base: `2ec31a4ba5347973d7abb40cabd2311035f600b8`.
- PR 생성·CI/리뷰 운영·main 병합·배포는 이번 지시 범위가 아니므로 수행하지 않았다. PR CI와 실제 운영 HTTPS의 새 화면은 미검증이다.
- 미해결 코드 blocker는 발견하지 않았다. 회원자료 snapshot의 직접 QR 연결은 기존 미지원이며 이번 범위에서 확대하지 않는다. 무료혈당기·CGM·Study 상설 메뉴·환자 관리 업무는 추가하지 않는다.
- `WORKTREE_DISPOSITION`: `/workspace/o4o-wt/carepharm-store-workspace`, 다른 세션에 위임/공유하지 않음, 개발·로컬 검증 완료, **KEEP**(push 후 통합 인계·후속 수정 필요). 정확한 HEAD·원격 일치·미커밋/미추적 0은 최종 보고에서 확인한다.

문서 정합: 현행 공간·가입·자료 소유 경계와 충돌 없음. QR의 실제 지원 범위를 조사해 이번 화면/WO 안내를 보완했다. 과거 WO 재작성·정본 색인 변경·SUPERSEDED 표기 없음.
