# CHECK-O4O-MY-STORE-HANDLED-PRODUCTS-VIEW-COMMONIZATION-V1

- **WO**: WO-O4O-MY-STORE-HANDLED-PRODUCTS-VIEW-COMMONIZATION-V1 — 매장 경영활용 제품 화면 공통 목록 UI 추출
- **작업 브랜치**: `work/commonization-my-store-shell-parts` (main 병합 없음)
- **작성일**: 2026-08-13
- **상태**: 구현 완료 · typecheck/build 4 서비스 PASS

---

## 1. 선행 통합 (force-push 없음)

| 항목 | 결과 |
|---|---|
| 홈 공통화 기준 | `work/commonization-my-store-shell-parts` (StoreHomeShell + 4 파트) |
| `work/commonization-my-store` 의 handled-products 공통 계약 | **보존** — merge commit `c918bf20e` 로 통합, 삭제·재작성 없음 |
| force-push / history rewrite | **없음** |

보존된 계약(타 세션 산출물, 이번 WO 에서 수정하지 않음):
`packages/store-ui-core/src/types/handledProducts.ts` (`HandledProductListItem` · `HandledProductRef` ·
`HandledProductSource` · `HandledProductsPagination` meta · `handledProductKey()`) +
`@o4o/store-ui-core/handled-products` subpath export + 두 서비스 API 타입의 `extends`.

---

## 2. 공통화한 것 (`@o4o/store-ui-core`)

신규 파일: `packages/store-ui-core/src/components/handled-products/HandledProductsListParts.tsx`

| export | 역할 |
|---|---|
| `HandledProductsPageHeader` | breadcrumb / icon / title / description / actions 슬롯 |
| `HandledProductsToolbar` | 검색 입력. `onSearchSubmit` 있으면 form 제출형(PH), 없으면 즉시 반영형(KPA) |
| `HandledProductsCountRow` | 총 건수 배지 + `rightSlot` |
| `HandledProductsTable` | column-config 기반 table · loading/error/empty 상태행(colSpan 자동) · `handledProductKey` row key · 선택 체크박스 컬럼(옵션) |
| `HandledProductsPagination` | `@o4o/operator-ux-core` `Pagination` 래핑 |
| `HandledProductNameCell` | 썸네일(없으면 Package placeholder) + 제품명 + 보조 라벨 |
| `HandledProductBadge` | 6 tone 배지 |
| `formatHandledProductPrice` / `formatHandledProductDate` / `handledProductClassificationLabel` | 표시 포맷 (`—` / `-` / `미분류`) |

`index.ts` 에서 재export. 타입 `HandledProductsPagination`(meta)와 컴포넌트명 충돌을 피하려고
타입은 `HandledProductsPaginationMeta` 별칭으로 노출.

**Pagination 의존성 주의** — web-pharmacy-hub 는 `@o4o/operator-ux-core` 를 직접 의존하지 않는다.
store-ui-core 안에서 래핑했기 때문에 **package.json / lockfile 변경 없음**.

---

## 3. 서비스에 남긴 것 (합치지 않음)

| 서비스 | 유지 항목 |
|---|---|
| KPA | O4O 표준 상품에서 추가 · 신규 상품 등록 요청 · 내 등록 요청 · 상세설명서(STORE) 조회 · 콘텐츠 만들기 · 다국어 · QR · 다중선택 ActionBar · 제거(연결 해제) · 300ms 디바운스 + URL query 동기화 · 페이지당 건수 select · footnote |
| PharmacyHub | 매장 연결 상태 안내(`StoreConnectionNotice`) · 공급 상품에서 추가 모달 · 활성/비활성 토글 · 탭(전체/활성/비활성) · 관리 컬럼 |
| 공통 아님 | API endpoint · 권한 · route · 등록/제거 정책 — 전부 서비스 소유 |

업무 의미 변경 없음(주문 상품 자동 등록 등 없음). 신규 API·DB·migration 없음.
KPA 기능을 PharmacyHub 로 이식하지 않았고, 두 화면을 동일하게 만들지 않았다.

---

## 4. 제외 (WO 명시)

- **K-Cosmetics `StoreLocalProduct`** — 데이터 축이 다르므로 대상 제외. 코드 변경 0.
- **GlycoPharm** — 회귀 확인만.
- `StoreLocalProduct` ↔ handled-products 통합 **하지 않음**.

---

## 5. 검증

| 대상 | typecheck | vite build |
|---|:---:|:---:|
| `@o4o/store-ui-core` | PASS | — |
| web-kpa-society | PASS | PASS (25.5s) |
| web-pharmacy-hub | PASS | PASS (17.2s) |
| web-k-cosmetics (회귀) | PASS | PASS |
| web-glycopharm (회귀) | PASS | PASS |

전제: 루트에서 `pnpm run build:packages` 선행 필요(공통 패키지 dist 미빌드 시 `@o4o/ui`·`@o4o/auth-utils` 해석 실패).

정리 부수효과: KPA 화면에서 공통 파트로 대체되어 사용처가 사라진 inline style 26개 키와
미사용 import(`Package`, `Search`, `allSelected`) 제거. 남은 style 은 KPA 고유 버튼·ActionBar·footnote 뿐.

---

## 6. 변경 파일

```
packages/store-ui-core/src/components/handled-products/HandledProductsListParts.tsx  (신규)
packages/store-ui-core/src/index.ts                                                  (export 추가)
services/web-kpa-society/src/pages/pharmacy/StoreHandledProductsPage.tsx             (공통 파트 채택)
services/web-pharmacy-hub/src/pages/store-owner/HandledProductsPage.tsx              (공통 파트 채택)
docs/checks/CHECK-O4O-MY-STORE-HANDLED-PRODUCTS-VIEW-COMMONIZATION-V1.md             (본 문서)
```

## 7. 문서 정합

발견 0건 / SUPERSEDED 표기 0건 / 링크 수정 0건 / 별도 WO 제안 0건.
