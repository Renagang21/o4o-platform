# CHECK — KPA 매장 취급제품 콘텐츠 작업 기능 V1

> **WO:** WO-O4O-KPA-STORE-HANDLED-PRODUCTS-CONTENT-ACTIONS-V1
> **선행:** WO-O4O-KPA-STORE-HANDLED-PRODUCTS-CONTENT-LINK-V1 (연결 구조 + by-product API + linkedContentCount)
> **작성일:** 2026-06-27
> **범위:** services/web-kpa-society + 기존 by-product API 최소 보완 (신규 DB 변경 없음)

---

## 1. 선행 요약

CONTENT-LINK-V1 에서 연결 구조 / 콘텐츠 저장 optional productRef / 제품별 연결 콘텐츠 조회 /
linkedContentCount / 기본 상세설명서 미지정 정책이 완료됨. 본 WO 는 그 위에 **사용자 화면 동작**
(콘텐츠 만들기 · 연결 콘텐츠 보기 · 제품 연결 자동화)을 추가한다.

## 2. 변경 파일

| 파일 | 변경 |
|---|---|
| `apps/api-server/.../store-content.controller.ts` | by-product 응답에 `sourceType`(direct/snapshot_edit) + `snapshotId` 추가 (편집 경로 판별) |
| `services/web-kpa-society/src/api/assetSnapshot.ts` | `handledProductContentApi.byProduct` + `LinkedContentItem` 타입 |
| `.../pharmacy/CreateContentFromResourcesModal.tsx` | optional `product` prop + "관련 매장 취급제품" 배너 + 저장 시 top-level `productRef` |
| `.../pharmacy/LinkedContentsDrawer.tsx` (신규) | 연결 콘텐츠 보기 드로어 (by-product 호출, 열기/편집 분기, 빈 상태, 새 콘텐츠 만들기) |
| `.../pharmacy/StoreHandledProductsPage.tsx` | "연결 콘텐츠" N개 → 드로어 진입 / 관리 영역 "콘텐츠 만들기" |
| `.../pharmacy/StoreLibraryContentsPage.tsx` | `?create=1&pType=&pId=&pName=` URL 진입 시 작성 모달 자동 오픈(제품 컨텍스트) + 닫을 때 파라미터 정리 |

> 커밋 분리: `f162be9ca`(foundation: backend+client+modal, additive/dormant) → `be80f064a`(UI).
> 병렬 세션이 StoreLibraryContentsPage.tsx 등을 동시 리팩터(WO-...-AI-ENTRY-REMOVE-V1, 커밋 8b71a4ff8)
> 중이어서, 충돌 없는 foundation 을 먼저 분리 커밋해 보호하고 그들의 커밋 직후 UI 를 이어 작업.

## 3. 백엔드 by-product 판별필드 (최소 보완)

WO §7 허용 범위 — "콘텐츠 종류 또는 편집 경로 판별 필드만 최소 추가".
`SELECT ... c.source_type, c.snapshot_id` 추가 → 응답에 `sourceType` / `snapshotId`.
신규 컬럼/테이블/migration 없음. 기존 필드(contentId/title/status/linkType/updatedAt) 유지.

## 4. 콘텐츠 만들기 (제품 → 작성 화면)

- handled-products 행 관리 영역 "콘텐츠 만들기" → `navigate('/store/library/contents?create=1&pType=&pId=&pName=')`.
- **URL 기반 전달** → 새로고침 후에도 연결 대상 유실 없음(WO §6.1 우선 검토 반영).
- 라이브러리 페이지가 파라미터를 읽어 기존 `CreateContentFromResourcesModal` 을 제품 컨텍스트와 자동 오픈.
- 모달 상단 "관련 매장 취급제품" 배너: 제품명 + 구분(O4O 기반 제품 / 매장 경영활용 제품).
- 저장 시 top-level `productRef:{sourceType,sourceId}` 전달 → 생성 콘텐츠 자동 연결.
- 닫을 때 create 파라미터 정리(재오픈 방지). 일반 "콘텐츠 제작" 버튼은 product 없이 기존과 동일.

## 5. 연결 콘텐츠 보기 (드로어)

- "연결 콘텐츠" 셀의 `N개`(>0) 클릭 → `LinkedContentsDrawer` 오픈, `없음`(0)은 단순 표시.
- by-product 호출 → 항목: 제목 / 상태(workspace_status 한글 매핑) / 최근 수정일 / [열기].
- 열기 분기: `direct` → `/store/content/direct/:id` / `snapshot_edit` → `/store/content/:snapshotId/edit`.
- 빈 상태: "이 제품에 연결된 콘텐츠가 없습니다." + "새 콘텐츠 만들기"(= 콘텐츠 만들기 진입).
- 별도 페이지 없음(드로어), 연결 해제 UI 없음(비범위).

## 6. UI 원칙 준수 (WO §8)

- 신규 컬럼 추가 없음(기존 7컬럼 유지). 관리 영역에 버튼 1개(콘텐츠 만들기)만 추가 + 줄바꿈 허용.
- listing/local/UUID/productRef 화면 미노출(용어: O4O 기반 제품 / 매장 경영활용 제품).
- 기본·대표·별표 배지 없음.

## 7. 비범위 확인 (WO §9)

- 다중 제품 연결 UI / 연결 이동·해제 UI / 기본 상세설명 지정 / O4O B2C 복사 / 타블렛 선택 / 신규 테이블·migration — **없음**. ✅

## 8. typecheck 결과

| 패키지 | 결과 |
|---|---|
| `apps/api-server` (`tsc --noEmit`) | **PASS** |
| `services/web-kpa-society` (`tsc --noEmit`) | **PASS** |

## 9. API smoke 결과 — **ALL PASS** (2026-06-27, prod, renagang21=kpa:store_owner)

임시 local product 1건 생성 → 검증 → 삭제(정리 완료).

| 검증 | 결과 |
|---|---|
| 콘텐츠 생성 + top-level productRef(local) → 201, 연결 생성 (모달이 보내는 페이로드와 동일) | ✓ |
| `by-product` → 연결 콘텐츠 1건 반환 | ✓ |
| by-product `sourceType === 'direct'` (편집 경로 판별) | ✓ |
| by-product `snapshotId` 필드 존재 & direct 는 null | ✓ |
| `handled-products` `linkedContentCount === 1` | ✓ |
| 임시 데이터 DELETE 200 (정리 완료) | ✓ |

> listing(O4O 기반 제품) 경로는 CONTENT-LINK-V1 에서 정적 검증 — 분기 차이는 master_id 조회뿐(동일 코드 경로).

## 10~11. browser smoke 결과 — **보류(BLOCKED)**: 공유 브라우저 점유

- 검증 시점에 Playwright MCP 공유 프로필(`mcp-chrome-59d9d40`)을 **병렬 세션의 활성 chrome 프로세스**(7개, 13:23 기동)가
  점유 중이어서 브라우저 자동화 실행 불가(`Browser is already in use`). 병렬 세션 작업 방해 방지를 위해 강제 종료하지 않음.
  bounded wait(~3분) 후에도 STILL_LOCKED.
- **보완 근거(현재 확보된 검증):**
  - API smoke **ALL PASS** — 콘텐츠 생성+productRef 자동연결 / by-product sourceType·snapshotId / linkedContentCount (9절).
  - typecheck **PASS** (api-server + web-kpa-society).
  - 동일 화면(`/store/handled-products`)의 렌더링/레이아웃/콘솔 error 0 은 **선행 CONTENT-LINK-V1 browser smoke 에서 PASS** 확인됨.
    본 WO 추가분(콘텐츠 만들기 버튼 / count→드로어 / 모달 배너 / 라이브러리 URL 진입)은 정적·타입 검증 + API 백킹 완료.
- **잔여 항목:** 공유 브라우저 가용 시 아래 흐름 라이브 확인 후 본 절 갱신.
  1. handled-products "콘텐츠 만들기" → 라이브러리 작성 모달 자동 오픈 + "관련 매장 취급제품" 배너(제품명/구분)
  2. 저장 → handled-products 복귀 시 연결 콘텐츠 수 증가
  3. `N개` → 드로어 목록 → 열기(direct/snapshot 분기)
  4. 일반 콘텐츠 작성 흐름 무영향 / 모바일·데스크톱 레이아웃 / 콘솔 error 0
  5. smoke 데이터 정리

## 12. 데이터 정리

- API smoke 임시 product/content: **삭제 완료** (handled-products total 0 복귀).
- browser smoke seed product: 보류로 전환하며 **삭제 완료**.

## 13. 후속 후보

1. `WO-O4O-KPA-TABLET-DISPLAY-CONTENT-SELECTION-V1`
2. `WO-O4O-KPA-O4O-B2C-DESCRIPTION-COPY-TO-STORE-CONTENT-V1`

---

## 상태

- 구현 / typecheck: **완료**
- 배포: `f162be9ca` + `be80f064a` → Deploy API/Web 전부 success
- API smoke: **ALL PASS** (데이터 정리 완료)
- browser smoke: **보류** — 공유 브라우저를 병렬 세션이 점유. 가용 시 즉시 실행 예정.
- 잔여: browser smoke 1건 외 모든 완료 기준 충족.
