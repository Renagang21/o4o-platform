# 내 매장 업무 흐름 점검 및 후속 정비 TODO

> **상태**: COMPLETED
> **작성일**: 2026-10-09
> **범위**: store.neture.co.kr 제품 활용·자료 복사·사업별 조회·매장 경계
> **기준 commit**: 01a47e6d4

## 승인된 기준

내 매장 제품은 매장이 취급·활용하는 전체 제품이며 구매 이력은 전제 조건이 아니다. 공급 상품은 주문 가능한 상품이다. 직접 등록 제품은 등록 방식이다. 가져온 자료는 독립 사본으로 원본 변경을 자동 반영하지 않는다. 사업 탭은 조회 조건이며 서버의 매장·권한 검증을 대체하지 않는다.

## 초기 TODO

- [x] 코드와 정본에서 제품 등록 → 콘텐츠 제작 → QR·태블릿 활용 경로를 대조한다.
- [x] 외부 자료 복사 → 내 자료함 → 수정·게시 경로와 복사 독립성을 확인한다.
- [x] 사업별 공급·자료·주문 조회와 매장 전환의 데이터·권한 경계를 확인한다.
- [x] 조사 근거로 TODO의 구현 범위와 우선순위를 수정한다.
- [x] 발견한 업무 흐름 문제를 수정하고 회귀 검증한다.
- [x] 확정된 메뉴·용어·흐름의 설계 문서 정합을 보완한다.
- [x] 검증 결과를 기록하고 전용 브랜치 `wo/store-workflow-audit`를 commit·push한다.

## 작업 경계

`/work/kpa-society/store/*`와 PharmacyHub commerce 제거는 별도 legacy 담당 범위다. 운영 DB 변경·배포·main 병합은 이번 작업에 포함하지 않는다. 운영 계정이 필요한 실제 업무 검증은 코드·모의 API 검증과 구분한다.

## 조사 후 수정 TODO

- [x] P1 사업·검색·페이지 조건 변경 시 이전 응답/오류를 폐기하고 기존 목록을 비운다. 근거: `SupplyOptionsPage.load`, `PharmacyContentSourcesPage.load`의 완료 순서에 따른 무조건 상태 갱신.
- [x] P1 제품 API의 토큰 갱신 재시도에 최초 선택 매장 헤더를 보존한다. 근거: `handledProducts`·`localProducts`의 재시도 헤더에 매장 값이 없어 global fetch가 변경된 현재 매장을 다시 붙인다.
- [x] P2 역순 응답·이전 오류·실패 후 잔존 자료·재시도 중 매장 변경을 회귀 테스트한다.
- [x] P2 제품 선택의 콘텐츠 제작 인자와 자료 복사·편집·게시 경계를 검증한다.
- [x] P2 약국 매장 설계 문서에 제품 용어·메뉴·사업 필터·독립 사본 흐름을 정합한다.

확인: 세미프랜차이즈 사본은 `pharmacyCopy`가 본문 등을 `contentJson`으로 캡처해 새 snapshot을 만든다. 자료함은 사본 편집 경로를 제공하며 snapshot 자체의 바로 QR는 미지원이다. 원본을 연결해 자동 동기화하는 변경은 하지 않는다. 제품별 QR·태블릿 활용은 다국어 콘텐츠 경로를 제공한다. 서버는 선택 매장 힌트와 소유권·가입 상태를 별도로 검사한다.

## 검증 결과

- `pnpm --filter store-web test`: 화면/API 20개 PASS. 역순 응답·이전 실패·이전 자료 제거·제품 제작 문맥·사본 자료함 연결·4개 API 경로의 인증 재시도 매장 보존을 포함한다.
- Jest의 `store-owner-service-scoped-org.spec.ts`, `neture-pharmacy-rules.spec.ts`: 2개 파일 40개 PASS. DB를 연결하지 않는 기존 단위 검증이다.
- store-web TypeScript/Vite 빌드, 변경 파일 ESLint, `check-doc-sensitive.mjs`, `git diff --check`: PASS.
- 외부 요청 차단·합성 사용자·모의 API로 Chromium 데스크톱(1440)·모바일(390) 제품 목록/등록 창·이용 사업 직접 URL, 모바일 사업 전환의 역순 HTTP 응답을 확인했다. 콘솔 실행 오류 0건이다.
- 설치는 `pnpm install --frozen-lockfile`, 의존 패키지 사전 빌드는 `pnpm run build:packages`를 사용했다.
- 설계 정합은 [약국 매장 설계 §6-1](../design/DESIGN-NETURE-PHARMACY-STORE-COMMERCE-V1.md#6-1-내-매장-운영-화면과-업무-흐름-2026-10-09)에 반영했다. 정본 색인·공유 Core·서버 권한 정책·legacy route는 변경하지 않았다.

## 후속 운영 검증

다음은 실제 약국 계정·운영 데이터 쓰기 또는 실기기가 필요한 별도 검증이다. 위 모의 검증을 실제 운영 검증 완료로 해석하지 않는다.

- [ ] 실제 두 매장 계정에서 제품 등록·사본 수정·게시 후 매장 간 데이터 구분을 확인한다.
- [ ] 실제 자료 원본을 변경하고 기존 사본의 본문이 유지되는지 확인한다.
- [ ] QR 인쇄·스캔과 태블릿 진열/다국어 표시를 실기기에서 확인한다.

## legacy 담당 전달 사항

제거 범위는 `/work/kpa-society/store/*`와 PharmacyHub commerce다. 공통 `/store/*`의 제품·자료함·QR/태블릿 기능 및 선택 매장 헤더를 함께 제거하지 않는다. 주소 정리 후 제품 제작 문맥(`pType`, `pId`, `pName`), 자료함 편집·게시 경로, 매장 선택 복원에 영향을 주는지 확인해 결과를 공유해 달라. 실제 제거 구현은 별도 담당이 수행한다.

## PR #386 CI 후속 정리 (2026-10-10)

- 최초 커밋의 CI Gate는 통과했으나 SonarCloud 신규 코드 중복률 4.5%(기준 3% 이하)로 실패했다.
- store 서비스 내부 `storeProductFetch`에 제품 API의 인증 재시도·최초 매장 헤더 보존을 모았다. JSON/QR 응답 처리와 각 API 오류 계약은 기존 호출부에 유지한다. 공유 Core·서버 정책은 변경하지 않는다.
- 본문·메서드 보존과 인증 갱신 실패 시 재전송하지 않는 검증을 추가했다. store-web 22개 테스트, TypeScript/Vite 빌드, 변경 파일 ESLint, diff 검증 PASS.
- 같은 WO의 review finding 처리이므로 기존 `wo/store-workflow-audit` 브랜치를 유지한다. push 이후 SonarCloud 결과를 별도로 확인한다.
