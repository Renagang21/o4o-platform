# CHECK-O4O-KPA-TABLET-INLINE-MULTILINGUAL-DESCRIPTION-BRIDGE-V1

> 작업 완료 보고서
>
> 작업 제목: **O4O KPA 태블릿 본 화면 다국어 상품 설명 연결 (인라인 다국어 브리지)**
>
> 관련 WO: `docs/work-orders/WO-O4O-KPA-TABLET-INLINE-MULTILINGUAL-DESCRIPTION-BRIDGE-V1.md`
>
> 작성일: 2026-07-03

---

## 1. 요약

메인 태블릿 `/tablet/:slug` 상품 상세에서, 선택 설명 콘텐츠(`kpa_store_contents.content_json.translations`)의 **검수 완료(게시 가능) 번역**을 언어 버튼으로 전환해 볼 수 있게 했다. 번역 생성 기능은 만들지 않았고, `/multilingual-products` publicKey 파일럿은 건드리지 않았다.

- 노출 기준 = **검수 상태**. 게시 가능(`ready`/`published`)만 노출, `draft`/미검수는 숨김(서버에서 status/model 등 내부 필드 제거).
- 표시 우선순위 = **선택 언어 번역 → 기본 선택콘텐츠 → 기존 제품 설명/요약**.
- 번역 없으면 언어 버튼 미표시 → 기존 동작과 동일(회귀 0). translations 미전달 서비스(K-Cosmetics)도 무영향.

## 2. 변경 파일 목록

| 계층 | 파일 | 변경 |
|---|---|---|
| 백엔드(공개 유틸) | `apps/api-server/src/routes/platform/store-public/store-public-utils.ts` | supplier tablet 쿼리에 `content_json->'translations'` 추가 + `sanitizePublishableTranslations()` 헬퍼(export) + 결과 후처리 |
| 백엔드(공개 핸들러) | `apps/api-server/src/routes/platform/store-public/store-public-tablet.handler.ts` | local 쿼리에 `translations` 추가 + 헬퍼 적용 |
| 공통 타입 | `packages/tablet-kiosk-core/src/types.ts` | `TabletContentTranslation` + `selectedContentTranslations?` |
| 공통 런타임 | `packages/tablet-kiosk-core/src/TabletKioskPage.tsx` | locale 라벨맵, `detailLocale` state(상품 변경 시 리셋), 상세 언어 버튼 + fallback 렌더, `langSwitch/langBtn` 스타일, mapper 전달 |
| KPA 편성 | `services/web-kpa-society/src/pages/pharmacy/StoreTabletDisplaysPage.tsx` | 다국어 안내 한 줄 |
| 문서 | WO + 본 CHECK |

## 3. 노출/보안 처리

- 서버에서 `sanitizePublishableTranslations()`가 `status ∈ {ready, published}` 且 html 존재 locale만 통과시키고 `{locale:{title?,html}}`로 축약 → **draft html은 클라이언트로 전송되지 않음**.
- 게시 가능 번역이 0개면 `null` 반환 → 프론트 언어 버튼 미표시.
- 읽기 전용·additive. 새 테이블/마이그레이션/route/저장 API 없음.

## 4. 검증 결과

### 4.1 정적 (typecheck)
| 대상 | 결과 |
|---|---|
| `apps/api-server` | ✅ PASS (store-public/translation 관련 에러 0) |
| `services/web-kpa-society` | ✅ PASS |
| `services/web-k-cosmetics` (공통 패키지 소비처) | ✅ PASS |

### 4.2 화면/API 검증 (배포 후)

배포: Deploy API Server + Deploy Web Services (Cloud Run) 모두 success.

| # | 항목 | 결과 |
|---|---|---|
| 1 | 공개 `GET /stores/네뚜레-약국/tablet/products` | ✅ `success:true`, 200. 새 `content_json->'translations'` 컬럼 추가 후에도 SQL 정상 실행(회귀 0). 해당 매장은 태블릿 상품 0건이라 행 단위 값은 미관측 |
| 2 | 응답에 `selectedContentTranslations` 필드 | ✅ 코드상 모든 행에 무조건 set(게시가능 없으면 null), `selectedContentTranslationsRaw`는 삭제되어 draft html 유출 없음 (supplier·local 양쪽 후처리) |
| 3 | 번역 없는 상품/서비스 상세 | ✅ 언어 버튼 조건부(`localeKeys.length>0`)라 미표시 → 기존 상세와 동일. K-Cosmetics(translations 미전달) 무영향 |

> **검증 데이터 한계**: 접근 가능한 테스트/데모 매장에 **태블릿 진열 상품 + 검수 완료(ready) 번역이 연결된 데이터가 없어**, 언어 버튼이 실제로 뜨는 **positive-path(버튼 노출 → 언어 전환 → 해당 언어 본문)는 라이브로 재현하지 못했다.** SQL·엔드포인트 무회귀는 라이브 확인, UI 조건부 렌더/fallback/서버 필터는 코드 + 3개 서비스 typecheck로 커버. 실데이터 E2E(로컬 상품 + direct 콘텐츠 번역 ready + 링크 + 태블릿 진열) 셋업이 필요하면 별도로 수행 가능.

## 5. 미구현(범위 밖)
- 다국어 번역 생성/검수 기능 (기존 `WO-O4O-KPA-CONTENT-MULTILINGUAL-TRANSLATION-V1` 흐름 사용)
- `/multilingual-products` publicKey 랜딩 (무변경)
- QR Core / 소비자 관리 / 앱 / 디지털 사이니지 통합 / DB 마이그레이션
