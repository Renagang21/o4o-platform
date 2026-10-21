# 내 매장 협업체별 상품·주문·컨텐츠 연결 검증

> **상태**: ACTIVE (로컬 개발 검증 완료; 추가 승인된 통합·배포 진행)
> **작성일**: 2026-10-21 · **최종 갱신**: 2026-10-21 (한국시간)
> **승인 범위**: TODO·문서/코드 대조 → 개발·검증·commit·push. PR·main 병합·배포 제외.
> **추가 승인**: 2026-10-21 사용자 `main 으로 병합-> 배포`. 아래 최초 개발 검증 기록은 당시 범위를 보존한다.
> **기준**: `ac38af8df1` · branch `wo/store-cooperation-workflows`
> **작업 계획**: [TODO](../work-orders/TODO-O4O-STORE-COOPERATION-WORKFLOWS-V1.md) · **현행 계약**: [약국 commerce 설계 §4·6-2](../design/DESIGN-NETURE-PHARMACY-STORE-COMMERCE-V1.md)

## 원인과 변경

가입 탭이 자료 개수에서 만들어진 것은 아니었다. 상품·거래의 첫 화면은 취급상품이었고, 공급·주문·모집은 접힌 전체 업무 안에 있었다. 매장 컨텐츠도 첫 화면의 별도 navigation이 제공 자료 입구를 대체했다. 상세 화면은 가입 조회 실패를 빈 배열로 바꾸고, 공급 화면은 사업과 공급 종류를 하나의 `source`로 표현했다. 저장한 사본은 사업별 조회 조건이 없었다.

- 상품·거래 첫 화면을 기존 상품 주문 목록으로 연결하고 상품 주문·내 취급상품·주문 내역·판매처 모집 버튼을 노출했다. 공급 메뉴 없는 매장은 취급상품 시작점을 보존했다. 컨텐츠 첫 화면에도 제공 자료·내 컨텐츠 입구를 표시한다. 기존 route·capability를 재사용한다.
- Store 로컬 가입 조회 훅과 탭을 사용한다. 선택 약국의 승인된 협업체는 자료가 없어도 남고, 로딩·조회 실패/재시도·미가입·사업별 0건·검색 0건을 구분한다. 계정·약국 전환 뒤 늦은 가입/목록 결과를 버린다. 서비스 미가입 매장 소유 컨텐츠의 접근을 약국 가입 조회와 결합하지 않는다.
- 공급 종류와 사업 필터를 분리하고 기존 `source=sf:<key>` URL을 유지했다. 공급 종류는 보조 펼침 영역에 둔다. 일반 공개 모집은 별도 탭으로 표시하고 같은 공급 SQL에서 판정된 `orderable`로 상품 주문 링크를 제공한다.
- 일반 공개 모집은 기존 공개 분류, 유효한 제품/공급자, 선택 약국의 참여 승인, 명시된 양의 모집 공급가를 확인한다. 기본가·소비자가로 대체하지 않고 미확정 receiver는 공급자별 미확정 그룹으로 유지한다. 담기와 주문 확정도 같은 판정을 재사용한다. legacy pharmacy 미지정 모집의 기존 사업 승인 조건을 공개 모집으로 우회하지 않는다.
- 소유 컨텐츠 목록은 불변 snapshot 출처로 사업별 조회한다. 편집 본문이 출처 키를 바꾸거나 가입이 종료돼도 사본/출처와 과거 주문은 보존한다. 사업 선택과 출처 종류의 URL 갱신을 한 곳으로 모아 선택 유실을 고쳤다.
- 담기·참여 신청·주문 취소 오류가 조회 성공 목록을 숨기지 않게 분리했다. 동기 잠금으로 중복 실행을 막고 재시도 입력/사업 선택을 유지한다.

새 Core·DB schema·migration·의존성·권한/로그인 정책·background batch는 추가하지 않았다. 로컬 API는 선택적 `business`/`recruitment` 조회 조건, `orderable` 및 사본의 `sourceBusinessKey`를 보완했다. 별도 원장 복제나 자료 자동 동기화를 만들지 않았다.

## 실행 검증

환경은 repository 버전 기준 Node/pnpm을 활성화했고 `pnpm install --frozen-lockfile --verify-store-integrity=true --offline`를 통과했다. Store/API workspace 의존성을 각각 의존 순서로 빌드했다. 자격정보는 출력하지 않았다.

| 검사 | 실제 실행과 결과 |
|---|---|
| Store 회귀 | `pnpm --filter store-web test` — 최종 62 files / 753 tests PASS |
| API 관련 회귀 | `pnpm --filter @o4o/api-server exec jest --runInBand --no-coverage`에 아래 6개 파일 지정 — 49 PASS / 7 SKIP |
| 신규 실제 PostgreSQL | `store-cooperation-workflows.integration.spec.ts` 9 PASS. 실제 공급 CTE·담기·장바구니·주문 확정 서비스·사본 feed SQL 실행 |
| 기존 실제 PostgreSQL | `business-store-access.integration.spec.ts` PASS. 선택 약국 가입·직원/담당자/사업 경계와 게시 자료 접근 회귀 |
| Store production | `pnpm --filter store-web build` PASS (TypeScript 포함) |
| API 타입/컴파일 | `pnpm --filter @o4o/api-server run type-check` 및 `run build` PASS |
| 집중 lint | 변경 TS/TSX 전부 루트 `pnpm exec eslint --no-cache` — 오류 0, 기존 `_next` 미사용 경고 1 |
| 브라우저 | 아래 실제 화면 컴포넌트 + 합성 API, Chromium 1440×1000 / 390×844 PASS |

API 파일: `store-cooperation-workflows.integration.spec.ts`, `business-store-access.integration.spec.ts`, `pharmacy-store-access.test.ts`, `neture-pharmacy-rules.spec.ts`, `pharmacy-order-read.integration.spec.ts`, `supplier-recruitment-retirement.routes.test.ts` (모두 `apps/api-server/src/modules/neture-pharmacy/__tests__/`). 마지막에서 두 번째 파일의 7건은 전체 migration 적용 DB를 요구하므로 SKIP했다. 그 환경 변수를 임의로 연결하지 않았다.

신규 DB 검사는 이 작업 전용 loopback PostgreSQL의 무작위 schema에 합성 fixture만 생성한다. 공급가 대체 금지, 다른 약국 차단, 참여 승인 취소/반려 뒤 주문 차단, 공급자/제품 비활성·모집 종료 차단, legacy pharmacy 모집 우회 금지, 사본 편집·가입 종료 후 불변 출처와 데이터/count 정합을 확인했다. **인증 actor/선택 조직 해석과 order creator는 fixture**다. 실제 로그인·checkout 저장·PG·공급자 배송 E2E 검증으로 해석하지 않는다. 모든 fixture schema를 DROP한 뒤 잔존 schema **0**을 확인하고 전용 PostgreSQL을 종료하고 이번에 생성한 임시 data directory도 제거했다.

중간 전체 회귀에서 변경하지 않은 `blog-workflow.test.tsx`의 매장 변경 직후 목록 호출 수 검사 1건이 실패했다. 해당 파일 단독 재검사는 6건 PASS였고 최종 전체 검사 결과를 위 표에 기록했다. 그 테스트/제품 코드는 변경하지 않았다. 초기 개발 중 mock·fixture 보완 및 타입 수정 전 실패 기록을 최종 PASS로 대체 주장하지 않는다. 기존 Browserslist 데이터와 대형 chunk 경고는 남아 있다.

## PC·모바일 화면 검증

실제 `StoreWorkspaceShell`, `StoreWorkspacePage`, `SupplyOptionsPage`, `PharmacyRecruitmentsPage`, `PharmacyCartPage`, `PharmacyOrdersPage`, `PharmacyContentSourcesPage`, `StoreLibraryContentsPage`를 전용 로컬 Vite에서 렌더했다. Auth/Store context와 모든 API 응답만 합성으로 연결했다. 외부 요청을 차단하고 알 수 없는 API를 실패시키며 화면 성공 문구·입력·요청 필터·선택 매장 헤더·페이지 가로 넘침을 검사했다.

두 화면 크기에서 각각:

1. 공통 상품·거래 목적지의 2개 가입 협업체, 자료 0건에도 유지되는 탭과 해당 사업 빈 상태.
2. 사업+공급 종류+검색 동시 적용, 브라우저 뒤로 복원, 목록/가입 조회 실패와 재시도.
3. 서비스 지정 route의 일반 공개 모집, 공급가 없는 모집의 조건 미정 표시, 주문 가능 모집→같은 상품 주문 화면.
4. 담기 실패 후 수량 3 유지·재시도→기존 장바구니→합성 주문 확정, 수취 주체 미확정 표시. 결제는 실행하지 않음.
5. 컨텐츠 첫 화면의 제공 자료 입구→사업별 빈/유효 자료→독립 사본 만들기→해당 협업체의 내 컨텐츠→같은 사업 제공 자료 복귀.
6. 매장 전환 중 늦은 가입 응답 차단, 기존 주문 읽기, 페이지 가로 넘침 없음. 표 내부 가로 스크롤과 담기 조작 확인.

`pageerror`·외부 요청·미처리 합성 API는 0건이었다. 스크린샷을 직접 확인했다. 검증 artifact는 작업 환경의 `.o4o-cooperation-browser-20261021` / `.o4o-cooperation-20261021`에 두며 실계정·운영 데이터는 포함하지 않는다. 검사 후 전용 Vite 서버와 브라우저 context도 종료했다.

## 남은 경계와 통합 인계

- 현재 일반 모집 생성 UI/API에는 공급가 입력이 없다. 가격 없는 모집은 승인만으로 주문 가능해지지 않는다. **공급자 측 공급가 입력·확정 계약은 후속 작업**이다. 소비자가나 기본가로 가격을 추정하지 않았다.
- 협동조합의 개인 회원 가입을 약국 조직의 사업 가입으로 변환하지 않았다. 해당 정책/연결이 없으면 그 개인 가입을 주문·원본 자료 자격으로 취급하지 않는다.
- 실 PG 연결·정산/수취 주체 확정·공급자 실제 수신/배송, 운영 계정별 전체 업무, 실제 QR·태블릿·사이니지 검증은 미실행이다. AI Core 이력/직원 접근 해제 계약도 별도다.
- 최종 fetch에서 main은 `249f065731`로 이동했다(#750 공개 진입/문의 통합). 본 작업과 변경 파일 겹침은 없으며 StoreGate/RootShell과 현행 공개 진입 정본 차이를 읽었다. 이 branch에 자동 병합/rebase하지 않았다. 검증은 시작 기준 `ac38af8df1`에 대한 것이며 최신 main과의 결합 검증은 통합 담당 범위다.
- PR 미생성이므로 PR CI/Codex·main 통합·배포는 미실행이다. 기존 push-only 개발 branch도 포함시키지 않았다.

```text
WORKTREE_DISPOSITION
worktree: /workspace/o4o-wt/store-cooperation-workflows
branch: wo/store-cooperation-workflows / base: ac38af8df1
main integration: 미실행 / CI: PR 미생성으로 미실행 / deployment: 통합 담당 후속
smoke: 실제 컴포넌트 + 합성 API PC/모바일 PASS; 운영 검증 미실행
other session usage: 없음(이번 세션 전용) / verdict: KEEP
reason: push 후 통합 검토·수정 재현용. 기준 checkout·다른 작업 트리 보존.
```

문서 정합: 약국 commerce 설계 §4·6-2의 공급 필터·공개 모집 조건·업무 배치를 이번 범위에 맞춰 갱신. 과거 WO/CHECK·canonical index는 변경하지 않음.

## 추가 통합 회차 — 2026-10-21

개발 HEAD `7b44671ae2`의 원격 일치와 clean 상태를 확인했다. 해당 branch의 기존 PR은 없었다. 실제 main ruleset은 PR과 `CI Gate` 통과를 요구하며 human approval 수는 0이다. admin bypass는 사용하지 않는다.

현재 main `1adf577e38`의 새 공개 진입/문의·관리자·AI 관리 변경을 자기 branch에 일반 merge(`aec75fe3af`)했다. 이번 업무 변경과 파일 충돌이 없고 migration·의존성·workflow 변경도 없다. 다른 개발 branch를 포함시키지 않는다. 직전 main의 production 상태는 `DEPLOYED · deploy: api,admin`, Delivery `39601258231` 성공으로 확인했다.

최신 결합 상태의 로컬 검사·PR CI·Codex, 병합 및 배포 결과는 이 절에 이어 기록한다. 실제 계정 업무·공급자 가격 확정·실 PG·QR/기기 검증의 기존 경계는 유지한다.
