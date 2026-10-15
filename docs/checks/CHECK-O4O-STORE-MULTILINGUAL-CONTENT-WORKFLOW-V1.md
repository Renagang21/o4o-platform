# 내 매장 다국어 콘텐츠 흐름 검증

> **상태**: COMPLETED
> **작성일**: 2026-10-15 (한국시간)
> **범위**: 사용자 인계 — 제공 자료 탐색·가져오기·제품 연결·언어별 편집/보기·고객용 링크/QR 정비, 검증·commit·push·PR 생성
> **기준 main**: `d83b291cd61f479d36b68b36e8b4ad3daab80540`
> **branch**: `wo/store-multilingual-workflow`

## 조사와 경계

착수 시 `origin/main`을 fetch했다. 인계 SHA `caec7e2cbd` 이후 #600 병합과 auth 수정까지 포함한 위 HEAD에서 새 전용 worktree를 생성했다.
다른 worktree는 수정·삭제·재사용하지 않았다.

상위 기준은 [역할별 업무공간](../baseline/O4O-ROLE-WORKSPACE-ARCHITECTURE-V1.md) §6·§9,
[소비자 commerce 경계](../baseline/O4O-STORE-COMMERCE-BOUNDARY-V1.md),
[B2B 계약](../baseline/O4O-B2B-SUPPLIER-TO-STORE-ORDER-CONTRACT-V1.md),
[공통 모듈 변경 절차](../baseline/O4O-SHARED-MODULE-CHANGE-PROTOCOL-V1.md), [SETUP](../../SETUP.md)이다.

현재 route·호출·API 구현을 함께 확인했다.

- `/store/library/multilingual-product-contents`: 제공 자료 목록과 독립 사본 가져오기.
- `/store/library/multilingual-product-contents/my`: 가져오거나 직접 작성한 매장 콘텐츠.
- `/store/products/multilingual/:targetKind/:targetId`: 제품별 언어 편집. 서비스 지정 내 매장 child route에서도 같은 컴포넌트를 사용한다.
- 진입 소비처: `StoreHandledProductsPage`. 공통 액션 소비처: `StoreLocalProductsPage`, `PharmacyB2BPage`, 제품 편집기와 이번 내 콘텐츠 목록.
- API의 요약·목록 역방향 소비처는 제품 목록·태블릿 `StoreAssetSelectorModal`까지 확인했다. 선택기의 전체 구조 개선은 다음 태블릿 업무 묶음이며 이번 변경 대상이 아니다.
- 고객용 랜딩은 서비스 공개 호스트가 제공한다. 기존 URL 발급 계약과 서버의 언어 선택 순서를 유지했다.

API·route·권한 계약·DB·공통 Core·dependency·lockfile·배포 설정은 변경하지 않았다.
서비스 가입 조건을 추가하지 않았으며, 선택 매장 헤더와 현재 main의 서버 접근 판정을 사용한다.
QR·태블릿은 정보 제공용이고 소비자 주문·결제를 만들지 않았다. 공통화·새 AI 연결도 범위 밖이다.

## 문제와 변경

- 제공 자료 조회·제품 선택·저장·공개 동작은 선택 매장/서비스와 요청 세션에 귀속된다. 매장 전환·다른 제품 진입·언마운트 뒤의 응답으로 화면, toast, 이동, QR을 갱신하지 않는다.
- 가져오기 대상은 기존 매장 제품 API의 서버 검색·페이지 이동을 사용한다. 첫 100개 직접 제품과 별도 listing 조회만 사용하던 제한을 제거했다. 제품 종류 변경 시 이전 선택을 버리고 늦은 응답을 무시한다.
- 조회 실패와 정상 빈 결과를 분리하고 재시도를 제공한다. 가져오기 실패 시 선택 제품과 검색 입력을 유지하며, 중복 제출과 처리 중 닫기/입력 변경을 막는다. 덮어쓰기 정책을 제출 전에 안내한다.
- 가져온 그룹의 `groupId`를 내 목록에서 강조하고 정확한 제품 편집 링크로 전달한다. 명시한 그룹을 읽지 못하면 임의 default 그룹이나 신규 작성 화면으로 바꾸지 않는다.
- 내 목록에서 7개 언어를 선택해 실제 발행 내용과 요청/표시 언어를 확인한다. 서버의 English→기본 언어→한국어 fallback을 설명하고 미발행과 네트워크 오류를 구분한다. HTML은 기존 sanitizer를 사용한다.
- 기존 그룹은 이미 있는 PATCH API로 기본 정보를 갱신해 출처·공개 상태·metadata를 보존한다. 생성 POST를 기본 정보 수정에 재사용하지 않는다.
- 기본 정보 저장은 모든 언어의 미저장 내용을 유지하고, 언어 저장은 해당 언어만 갱신한다. 다른 언어·기본 정보 입력·현재 탭을 보존한다. 실패 후 재시도, 저장 작업 간 직렬화, 빈 요약의 명시적 저장을 지원한다.
- HTML 이외의 가져온 형식을 빈 HTML로 덮어쓰지 않도록 편집을 막고 기존 형식 유지 안내를 제공한다.
- 고객용 보기·URL 복사·QR 발급이 저장된 초안도 공개하는 기존 서버 계약을 안내한다. 편집 중 미저장 변경이 있으면 먼저 저장하도록 막는다. 공개 후 언어 상태를 다시 읽는다.
- 공개 액션은 그룹/매장별로 초기화하며 QR·복사 상태·타이머와 지연 완료를 격리한다. 새 창은 클릭 시 열고 opener를 끊으며, 미완료 탭은 화면 종료 시 닫는다. 차단된 팝업·실패 결과는 재시도 가능한 안내로 표시한다.
- 다국어 API는 기존 `storeScopedFetch`를 사용해 인증 갱신에도 최초 매장·URL·메서드·본문을 유지한다. HTTP 실패와 잘못된 목록 응답을 성공/빈 목록으로 바꾸지 않는다.

## 검증

Node `22.18.0` / pnpm `10.25.0`에서 실행했다. 새 worktree는 `pnpm install --frozen-lockfile --verify-store-integrity=true`로 설치하고 공통 패키지를 빌드했다.

- `pnpm exec vitest run --config services/web-store/vitest.config.mjs --maxWorkers=2`: **36개 파일 / 471개 테스트 PASS**. 기존 436개와 이번 35개를 포함한다.
- 새 API 테스트 10개: 인증 갱신 중 매장 전환, 메서드·본문 유지, 기존 그룹 PATCH, 실패/잘못된 응답, 오류 코드 보존.
- 새 화면 테스트 25개: 제품 종류/검색/선택, 실패와 빈 결과, 가져오기 재시도·중복 방지, 매장/제품/그룹 전환, 정확한 편집 진입, fallback, 언어별 초안 보존, 저장 실패, 비HTML 보호, QR·복사·팝업 수명, StrictMode.
- `pnpm --filter store-web build`: TypeScript와 production build PASS.
- 변경 TS/TSX 집중 ESLint: 오류 0 / 경고 0. `git diff --check` PASS.
- 기존 Browserslist 데이터와 번들 크기 경고는 남으며 의존성·빌드 설정을 바꾸지 않았다.

### 합성 브라우저 검증

실제 세 화면·에디터·Pagination·공개 액션을 앱 Tailwind와 함께 production build한 별도 호스트를 사용했다.
API·StoreContext·QR 데이터는 합성 fixture다. 외부 요청은 차단하고 실제 인증·운영 API·DB를 사용하지 않았다.

Chromium **1440×1000 / 390×844** 각각 다음 여섯 시나리오, 총 **12개 PASS**:

1. 제품 조회 실패를 빈 결과와 구분하고 재시도.
2. 제품 페이지 이동·검색·선택, 가져오기 실패 시 선택 유지, 중복 클릭 방지 후 재시도.
3. 가져온 콘텐츠에서 대체 언어 본문을 확인하고 연결 제품 편집으로 진입.
4. 실제 에디터에서 언어별 초안·탭·기본 정보 입력 보존, 저장 실패와 재시도.
5. 공개 계약 안내, QR 실패/복구, 클립보드 복사, 태블릿 팝업 URL/opener 확인.
6. 매장 전환 후 이전 매장의 편집 값·QR이 남지 않고 서버 조회 실패를 안내.

실제 화면 스크린샷을 확인했으며 모바일 페이지 가로 넘침 0, page error 0, 외부 요청 0이다.
화면·합성 API 검증이므로 실제 QR 출력/스캔·고객 랜딩의 실데이터·기기 연결/재생 완료를 뜻하지 않는다.

## 인계와 미검증

개발 담당의 종료점은 commit·push·PR 생성과 CI 상태 인계다. main 병합·auto-merge·배포는 통합 담당자의 범위다.
이번 작업에서 운영 배포나 실계정 로그인은 수행하지 않았다. 제공된 테스트 계정 변수는 사용하지 않았다.
직원 초대/승인/해제·직원 전체 업무·매장 간 실제 접근 격리·QR 실물·사이니지/태블릿 기기 검증은 별도 지시를 기다린다.
다음 권장 묶음은 태블릿 진열/화면 구성과 사이니지 미디어 편집/미리보기다.

문서 정합: 현행 사업·구조 정본의 변경 없음. 이번 검증 기록만 추가했다.
