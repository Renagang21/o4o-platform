# 내 매장 전반 재조사 (2차)

> **상태**: ACTIVE
> **작성일**: 2026-11-14
> **실행 위치**: CLOUD (코드 읽기 · 운영 Demo 화면 조회만. 운영 DB 없음 · 저장 · 추가 · 삭제 없음)
> **인계**: claude/wizardly-bardeen-ldq332
> **근거**: 사용자 지시 「내 매장 전반에서 조사를 다시 해서 보완이 필요한 부분을 정리」(2026-11-14). 1차: [`IR-O4O-STORE-WORKSPACE-IMPROVEMENT-SURVEY-V1`](IR-O4O-STORE-WORKSPACE-IMPROVEMENT-SURVEY-V1.md)

## 0. 방법

1. 운영 화면 전수 조회 — store.neture.co.kr 에 Demo 매장 경영자 · 매장 직원 · 모바일(iPhone 13)로 로그인해 메뉴 링크를 열어 보기만 했다(버튼 클릭 없음).
2. 코드 조사 세 갈래 — 화면 · 경로 / 매장 API 경계 / 리스트 · 용어 · 모바일.
3. 큰 주장(아래 「확인」)은 이 세션에서 코드를 다시 읽어 확인했다. 「추정」은 실행해 보지 않은 것이다.

## 1. 우선순위

### A — 데이터 · 권한 (먼저)

| # | 내용 | 근거 | 방향 |
|---|---|---|---|
| A1 | **매장 직원이 매장 정보(상호 · 연락처 · 주소 · 대표자명 · 세금계산서 메일 등)를 바꿀 수 있다** — 가드 이름은 `requireStoreOwner` 지만 실제는 직원도 통과하는 `createRequireStoreWorkspaceAccess`. 같은 오해 이름이 상품 자료 · 외부 판매 · HUB · POP 컨트롤러에도 있다 (확인) | `routes/o4o-store/controllers/pharmacy-info.controller.ts:78` · `utils/store-workspace-access.ts:24` | 쓰기 경로를 경영자 전용 가드로. 이름 정정. 같은 핸들러가 사업자 정보를 편집자 본인 `users.businessInfo` 에 쓰는 것 · `organizations.metadata` 통째 저장(태블릿 목록 · 상품 위치 동시 수정 덮어쓰기)도 함께 |
| A2 | **소비자 키오스크 상품 검색이 의약품 · 태블릿 공개 조건을 거치지 않는다** — 매장의 모든 활성 상품 이름과 진열 위치를 돌려준다. 공개 태블릿은 의약품 차단 · 서비스 · 공급자 · TABLET 채널 승인 4가지를 본다. 검색어의 `%` `_` 미처리 (확인) | `modules/neture-pharmacy/services/consultation-kiosk.ts:176` → `store-staff-support.ts:27` | 키오스크 전용 검색에 `store-tablet-medication-guard` · `store-tablet-product-visibility` 적용, LIKE 문자 escape |
| A3 | 키오스크가 연결한 경영자의 현재 자격을 다시 보지 않는다(주석은 본다고 적음) — 경영자가 직원으로 바뀌어도 AI 사용이 그 계정으로 계속 | `consultation-kiosk.ts:17,114-119` | `authorizeRow` 에서 경영자 역할 재확인 |
| A4 | 키오스크 끊기가 「목록에서 삭제」뿐 — 새 연결 코드를 만들어도 예전 기기 자격 유지, 기기 자격 만료 없음, 예전 목록을 다시 저장하면(낡은 탭) 되살아남 | `consultation-kiosk.ts:80-82` · `consultation-tablets.ts:82` | 삭제 · 새 코드 때 `device_hash` 비우기, 목록 저장에 버전 확인 |
| A5 | 기기 엔드포인트 속도 제한이 「IP + 보낸 토큰」 기준이라 가짜 토큰마다 새 계수 · 인스턴스별 메모리 (확인) | `consultation-workspace.routes.ts:74-79` | IP 단독 계수 추가 |
| A6 | 1차 미해결 그대로 — serviceKey 를 query/body 에서 받음(P1-4) · 500 응답에 내부 오류 문구 약 117곳(P1-5) · UUID 단독 후속 조회(P1-6) · 콘텐츠 공개 설정 넘김 규칙(P1-3, 로컬 DB 확인 대기) | 1차 IR | 1차 계획 그대로 |
| A7 | 낮음 — 진열 태블릿 6자리 연결 코드 조회가 매장 이름 · 위치 목록을 돌려줌 · 공개 관심 요청 상태가 고객 이름 · 메모를 돌려줌(ID 는 무작위) · 상담 짝짓기 조회에 `mode` 조건 없음(추정) · 대표 이미지 교체 비원자(추정) · QR 랜딩 GET 이 스캔 기록(§8-4 예외 기록 필요) | `store-tablet-device.routes.ts:504` · `store-public-tablet.handler.ts:340` · `consultation-stations.ts:419,470` · `store-product-library.controller.ts:590` · `store-qr-landing.controller.ts:182` | 개별 정리 |

### B — 화면이 조용히 실패 (사용자가 바로 느끼는 것)

| # | 내용 | 근거 | 방향 |
|---|---|---|---|
| B1 | **알림 메시지(toast) 표시 장치가 앱에 없다** — 26개 파일이 성공 · 실패를 toast 로만 알리는데 web-store 에 `Toaster` 가 한 번도 달린 적이 없다. 저장 실패가 아무 표시 없이 지나간다(제품 진열 설정 가격 · 설명 저장, QR, 태블릿 콘텐츠, 발주 담기, 사이니지 복사 등) (확인) | `App.tsx` · `main.tsx` 에 없음, 다른 앱은 있음(`web-neture/src/App.tsx:679`) | 앱 루트에 한 번 장착 |
| B2 | **오류 경계가 없다** — 화면 하나의 렌더 오류나 배포 직후 조각 파일 로딩 실패가 앱 전체를 흰 화면으로 (확인) | 소스에 ErrorBoundary · errorElement 없음 | 경로 묶음을 오류 경계로 감싸고 「새로고침」 안내 |
| B3 | **약국 기능 화면이 창으로 돌아올 때마다 다시 그려져 입력 중인 내용이 사라진다** — 창 focus 마다 기능 권한을 다시 묻고 그동안 화면을 안내문으로 바꾼다. 파일 선택 창을 닫아도 focus 가 생긴다. 대상: 제품 다국어 콘텐츠 편집 · 태블릿 진열 · 상담 요청 · 근무자 현장 지원 · 다국어 콘텐츠 자료함 (확인) | `components/store/PharmacyFeatureAccess.tsx:91,108` → `UnifiedStoreLayout.tsx:80-87` | 다시 묻는 동안 직전 결과 유지 |
| B4 | 끊긴 링크 4개 — 매장 직접 상품의 「마케팅 자료」(`/store/commerce/products/:id/marketing` 경로 없음) · 서비스 경로에서 「다국어 콘텐츠 자료함」 · 다국어 콘텐츠의 「매장 제품 확인」(`/products` → 엉뚱한 화면) · 퇴역 주문 화면의 「외부 판매채널 연동 관리」 (확인) | `StoreLocalProductsPage.tsx:96,118` · `StoreMultilingualContentsMyPage.tsx:78` · `OnlineSalesOrdersRetiredPage.tsx:39` | 실제 경로로 |
| B5 | 매장 구성원 — 목록 조회 실패 때 「구성원이 없습니다」와 오류가 함께 보이고 다시 조회 버튼 없음, 「해제」 확인 없음, 메뉴 표시 조건과 화면 가드 조건이 달라 메뉴를 눌러도 「경영자만」 화면이 나오는 경우 | `StoreMembersPage.tsx:39-45,120-141` · `UnifiedStoreLayout.tsx:82,196` | 실패 상태 분리 · 확인 단계 · 같은 판정 함수 |

### C — 일관성 · 표준

- **리스트 표준:** 표준 · 거의 표준 8(1차 6) · 일부 6 · 없음 약 20. 1차 우선 대상(매장 구성원 · 주문 목록 2개 · neture-pharmacy 목록 6개)은 그대로 미적용.
- **모바일:** 외부 판매채널 표 2개가 `overflow-hidden` 안이라 좁은 화면에서 잘린다(`StoreChannelsPage.tsx:793,830,1008`). 나머지 넓은 표는 가로 스크롤 처리됨.
- **용어:** 「내 약국」 잔재 6곳(HUB QR · POP · 영상 자료실 「내 약국에 가져가기」, B2B 「← 내 약국」 등), 같은 곳(`/workspace/use`)을 가리키는 이름 7개, 같은 작업 막대 안 제품/상품 혼용. 「매대」 · 「직원 현장 지원」 잔재 0.
- **1차 남은 항목 상태:** 메뉴에 없는 실기능 · 메뉴 체계 둘 · `/store/` 고정 링크 40곳 · 예전 이동 경로 약 20 · 같은 화면 두 경로 · 800줄 넘는 페이지 7 — 그대로. 쓰지 않는 페이지 3개 삭제 · 상담 메뉴 매장 안으로 — 완료.
- 경영자 판정 규칙이 화면마다 3가지(`memberRole==='owner'` / owner·admin·manager / 역할+비직원).

## 2. 운영 화면 전수 조회

메뉴 · 화면 안 링크를 따라 경영자 102 · 직원 100 · 모바일 102 화면을 열었다(1366px · iPhone 13). 샌드박스 망에서 막힌 외부 리소스 오류는 제외했다.

- 빈 화면 · 「찾을 수 없습니다」 · 화면 오류 · API 4xx/5xx · 가로 넘침: 경영자 0 · 모바일 0.
- **직원 1건:** 외국인 방문 협력처(`/work/kpa-society/sales-channels/foreign-visitor/partners`)가 `403 GET /api/v1/foreign-visitor/partners` 로 「불러오지 못했습니다」 — 메뉴는 직원에게 보이는데 API 는 경영자 전용. 메뉴를 숨기거나 직원 안내 화면으로(C 묶음의 경영자 판정 통일과 함께).
- 조회만으로는 보이지 않는 것: 저장 실패 알림 없음(B1) · 창 전환 시 화면 다시 그림(B3) · 버튼 뒤 끊긴 링크(B4) — 코드로 확인했다.

## 3. 진행 제안

1. **A1 · A2 · B1 · B3** — 영향이 크고 수정 범위가 작다. 바로 진행 가능.
2. A3 · A4 · A5 · B2 · B4 · B5.
3. C 묶음은 리스트 표준(매장 구성원 → 주문) · 용어 · 메뉴 체계 순으로 별도 묶음.

## 4. 확인하지 못한 것

- 운영 DB(1차 지시서 Q1~Q6) — 로컬 세션 결과 대기.
- 직원 쓰기(A1)를 실제 운영에서 시도하지 않았다(운영 데이터 변경).
- 관리자 화면 · 운영자 화면(Demo 권한 없음).

## 5. 문서 정합

해당 없음(기록물).
