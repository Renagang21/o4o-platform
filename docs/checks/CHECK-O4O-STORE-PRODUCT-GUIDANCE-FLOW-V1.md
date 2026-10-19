# CHECK-O4O-STORE-PRODUCT-GUIDANCE-FLOW-V1

> 상태: COMPLETED (로컬 개발 검증) · 작성일: 2026-10-18
> 착수 기준: `origin/main 716504eaf2924988f5a79aa709b0d02bfa0cb3ab`
> 최종 검증 기준: `origin/main c68f871feee2de6cbb474d4e5c2862cdd045e3f5`
> 작업: [WO-O4O-STORE-PRODUCT-GUIDANCE-FLOW-V1](../work-orders/WO-O4O-STORE-PRODUCT-GUIDANCE-FLOW-V1.md)
> branch: `wo/store-product-guidance-flow` · 종료점: 검증·commit·push 후 인계. PR·병합·배포 제외.

## 1. 문제와 변경

선행 운영 읽기 전용 조사에서 경영자·직원 모두 태블릿 이용 자격이 없는 매장인데도 운영 화면이 태블릿을 조회해 403을 표시했다. 모바일 상품 목록은 첫 상품이 첫 화면 아래에 있었고, 상품에서 안내 작성 후 취소하면 자료함에 남았다. 이 관찰을 이번 코드의 운영 배포 후 검증으로 간주하지 않는다.

- 운영 화면은 필터된 기능 목록을 조회에도 적용한다. 미제공 자원은 조회·재시도하지 않고 집계 제외를 알린다. 이용 가능한 자원의 실제 실패·빈 결과는 구분하며 정상 QR 결과를 유지한다. 서버 권한·서비스 가입·기능 이용 자격은 바꾸지 않았다.
- 상품 화면의 주요 등록 버튼은 유지하고 보조 등록·진열·전체 업무를 더보기로 모았다. 모바일 여백과 버튼 조작 영역을 정비했다. 기존 업무 URL과 기능 진입은 유지한다.
- 상품에서 작성할 때 매장/서비스 범위의 상품 목록 경로·검색·출처·페이지·건수·선택을 router state로 전달한다. 출발 history entry에도 보존해 브라우저 뒤로의 선택 유실을 고쳤다. 복귀 대상은 같은 mount의 정확한 상품 목록 경로만 허용한다.
- 상품 안내 준비에서 기존 연결 안내와 등록 정보를 확인한다. `byProduct`, `storeDescriptionApi.list`, `getLocalProduct`를 재사용하며, 직접 등록의 요약·기본 설명·상세 설명 필드를 구분한다. 표준 상품 설명은 언어당 최신 문서를 읽기 전용으로 표시하고 한국어 부재 시 대체 언어를 명시한다.
- 기존 direct/snapshot 안내는 기존 편집기로 연다. 새 안내 작성 버튼으로 편집기를 열고 참조 영역·선택 태그는 접어 둔다. 참조 영역을 접어도 조회 결과를 버리거나 같은 요청을 다시 보내지 않는다.
- 저장은 기존 `/store-contents`와 `productRef`를 유지한다. 상품 진입의 중간 작성 history entry를 교체하므로 저장 후 브라우저 뒤로가 빈 작성 모달을 다시 열지 않는다. 기존 저장 후 QR·매장 활용 경로는 유지한다.
- 취소·기존 안내로 전환·편집기의 명시적 복귀 시 미저장 내용을 확인한다. 정보 재시도는 이미 입력한 제목·본문을 덮어쓰지 않는다. 매장·서비스·상품 전환과 지연 응답은 현재 대상을 보호한다.

## 2. 변경 범위와 소비처

제품 목록·자료함·작성 모달·direct/snapshot 편집·운영 화면과 Store 로컬 조회/복귀 helper를 수정했다. `/store/*` 및 `/work/kpa-society/store/*`, 자료함 직접 작성, 경영자·직원 구성, Store 내부 `useStoreResource`·`useStoreLibraryRoute` 소비처를 대조했다. 공통 패키지·Core·권한·API 계약·DB·의존성·lockfile·배포 설정 변경은 없다. 소비자 commerce 금지와 공급자→매장 B2B 경계는 유지한다.

역방향 소비처의 raw-source 검사로 확인한 AI 우선 편집 경계·외부 LLM·내부 AI 은퇴·구 자료함 canonical·POP V2 전환의 기존 계약 검사도 실행했다. 오래된 구현 TODO나 은퇴한 내부 AI를 복구하지 않았다.

## 3. 환경과 실행 결과

고정 도구 Node `22.18.0`·pnpm `10.25.0`을 사용했다. 새 전용 worktree에서 `pnpm install --frozen-lockfile --verify-store-integrity=true --offline`을 실행했다. 체크섬/패키지 무결성·TLS 검증을 생략하지 않았다. Store 개발에 필요한 workspace 의존성만 의존 순서로 빌드했다.

| 검증 | 결과 |
| --- | --- |
| `pnpm --workspace-concurrency=2 --filter 'store-web^...' run build` | PASS |
| `pnpm --filter store-web test` | **58 files / 672 tests PASS** |
| 관련 API raw-source 계약 5개 suite | **119 tests PASS** |
| `pnpm --filter store-web build` (`tsc -b && vite build`) | PASS |
| 변경 TS/TSX 16개 집중 ESLint | PASS · 오류/경고 0 |
| 실제 화면 컴포넌트 + 합성 API 브라우저 | **168개 PASS** |

Store 테스트에는 disabled 자원의 초기 조회·재시도·지연 응답, 상품 정보와 연결 안내의 독립 실패/빈 결과/재시도, 상품·매장·서비스 전환, 언어별 최신 문서, 복귀 대상 검증, 참조 영역 접기 시 조회 재사용, 브라우저 뒤로 선택 복원의 회귀 검사를 포함했다. 브라우저 뒤로의 선택 유실은 신규 검사 실패로 재현한 후 수정하고 통과를 확인했다.

개발 중 main에 공급사업 약관 변경이 추가되어 같은 `store-management.test.tsx`를 대조했다. 변경 구간이 달라 전용 미공개 branch의 재정렬은 충돌 없이 완료됐다. main의 배송조건 검사 2개를 보존한 상태에서 Store 전체 672개와 build를 다시 통과했다. 이번 UI 변경은 동일하며, 새 main의 공통 패키지는 source export 방식임도 확인했다. dependency/lockfile 변경은 없었다.

API 계약 검사는 다음 기존 suite를 실행했다.

```text
store-ai-first-editor-boundary-contract.spec.ts
store-external-llm-content-authoring-contract.spec.ts
store-internal-ai-retirement-contract.spec.ts
kcos-library-content-bd-canonical.spec.ts
store-contents-selector-inline-pop-to-v2.spec.ts
```

브라우저 조합은 1440×1000·390×844 × 공통/서비스 mount × 경영자/직원 합성 구성의 8개이며, 조합마다 21개를 확인했다. 권한 판정 자체를 합성 브라우저의 로그인 검증으로 주장하지 않는다.

- 첫 화면 상품·검색·주요 작업, 보조 메뉴 조작과 전역 가로 넘침 없음
- 상품 정보·연결 안내 확인, 동일 AI 입력 보존, 새 작성 시 참조 접기와 제목 즉시 표시
- 취소·명시적 복귀·브라우저 뒤로/앞으로에서 검색·페이지·선택 복원
- 기존 저장 payload·상품 연결, 저장 후 빈 작성 모달 재개방 없음, 자동 게시/기기 변경 없음
- direct/snapshot 기존 편집 route와 명시적 복귀 취소 시 수정 보존
- O4O 설명의 언어 선택·한국어 부재 안내·읽기 전용 유지
- 정보/연결 안내 실패의 개별 재시도와 수동 입력 보존
- 매장 변경 시 대상 재선택 및 이전 응답 격리
- 태블릿 미제공 시 최초/새로고침 요청 없음, 제공 기능의 실제 실패와 정상 QR 결과 보존
- 기존 공통 AI 유지와 상품 정보 자동 첨부 없음

합성 브라우저의 첫 상품 행은 PC 532px, 모바일 624px에서 시작했다. 이는 현재 로컬 조합의 측정이며 선행 운영 화면과 같은 환경의 직접 비교 수치가 아니다. 모바일 상품·준비·작성 화면과 PC 준비 화면을 이미지로도 확인했다.

빌드의 기존 대형 청크·Browserslist 권고는 남아 있으며 이번 범위에서 의존성이나 bundling 설정을 바꾸지 않았다.

## 4. 실제 검증의 경계와 남은 AI 연결

이번 검증은 실제 화면 컴포넌트에 합성 API·합성 인증/매장 구성을 연결했다. 운영 로그인·업무 데이터 저장·실제 유료 AI 요청·QR 출력/스캔·기기 연결/재생·초대/승인/해제를 수행하지 않았다. 실제 매장 간 격리·미제공 기능에 대한 서버 권한의 운영 재검증도 완료로 간주하지 않는다. PR CI·main 통합·배포는 이번 개발 범위에서 실행하지 않는다.

현재 공통 AI는 화면 이름과 직접 입력·최근 대화를 사용한다. 이번에 상품 정보 자동 전송이나 응답의 편집기 자동 적용을 추가하지 않았다. 서버 `ai-query.service.ts`는 질문·응답·contextData를 저장하고 이력을 사용자 기준으로 조회한다. 매장 정보 자동 첨부 전에는 공통 AI 범위에서 공개/비공개 정보·매장 소유권·직원 접근 해제·이력 보존 기준을 확인해야 한다. 이를 우회하는 별도 Task/Memory/학습/AI API를 만들지 않는다.

공통 기준이 확인되면 다음 연결은 선택한 최소 사실 확인 → 기존 공통 AI로 짧은 초안 → 부족한 정보 하나 질문 → 사용자의 명시적 편집기 적용 → 기존 수동 저장 순서다. 요청 당시 매장/상품을 고정하고, 지연 응답을 다른 대상이나 사용자가 수정한 본문에 자동 적용하지 않는 기준을 유지한다.

## 5. 문서 정합과 통합 인계

정본 색인·My Home/Store 역할·소비자 commerce/B2B·상품 소유권·콘텐츠/산출물 분리·공통 AI 정본을 대조했다. 구 제작 흐름 정본의 `product_ai_contents` 및 구 POP/AI 표현 차이는 보고만 하며 정본 판정은 수정하지 않았다. 현재 작업 WO·로컬 코드 주석과 검증 기록을 갱신했다.

통합 담당자는 push된 개발 HEAD를 확인하고 현재 main과의 차이·필수 CI·리뷰를 확인한 뒤 PR·병합·배포를 진행한다. 개발 branch/worktree는 후속 수정용으로 보존한다. 이번 CHECK는 운영 배포 완료 증적이 아니다.

## 6. 후속 통합 착수 — 2026-10-19

사용자가 개발 완료 commit `d7d42b41b70ee63cc612db70803a7f9cb52ea45b`의 push·main 병합·운영 배포를 이 공간에 명시적으로 요청했다. 위의 PR·병합·배포 제외는 당시 개발 종료점의 기록이며, 이번에는 통합 담당으로 진행한다.

원격 개발 HEAD와 clean 상태를 확인하고 최신 `origin/main 491be1bb82c5b9788ff97020d0e0430939be11b6`을 동일 전용 branch에 merge했다. 기존 원격 이력을 재작성하지 않았고 충돌은 없었다. main 대비 실제 변경 범위는 기존 Store 화면·로컬 helper·회귀 테스트·WO/CHECK이며 공통 Core/API/DB/의존성/배포 설정을 추가 변경하지 않는다.

실제 main ruleset의 PR 필수·`CI Gate` 필수·human approval 0을 확인했다. 통합된 코드의 재검증과 PR CI·리뷰 확인 후 PR로 병합하고, post-merge CI와 현재 Delivery 정책의 `production` 상태·운영 공개 경로/자산을 확인한다. 실행별 결과는 통합 PR 및 연결된 Actions 기록으로 판정하며, 이 착수 기록 자체로 운영 배포나 실기기 검증 완료를 주장하지 않는다.

[통합 PR #709](https://github.com/Renagang21/o4o-platform/pull/709)의 Codex P2 지적에서 작성 취소가 상품 목록 history entry를 복제하는 문제를 확인했다. 공통·서비스 mount의 회귀 검사 2개가 기존 코드에서 실패하는 것을 재현한 후, 이미 검색·선택을 보존한 원래 entry로 돌아가도록 수정했다. 해당 route suite 16개와 수정 파일 집중 린트를 통과했다. PC/모바일 합성 브라우저에도 취소 후 뒤로 한 번의 이전 화면 이동·앞으로의 선택 복원 검사를 추가했다. 최종 HEAD의 전체 재검증·CI·배포 결과는 PR과 연결된 실행 기록을 따른다.
