# WO-O4O-KPA-TABLET-INLINE-MULTILINGUAL-DESCRIPTION-BRIDGE-V1

> Claude Code 작업 요청서
>
> 작성일: 2026-07-03
>
> 선행: `WO-O4O-KPA-TABLET-PUBLIC-INFO-UX-PRIVACY-INPUT-REMOVAL-V1`, `WO-O4O-KPA-TABLET-CORNER-PRODUCT-GUIDE-UX-AND-CHROME-OPERABILITY-V1`
>
> 관련: `WO-O4O-KPA-CONTENT-MULTILINGUAL-TRANSLATION-V1`(콘텐츠 번역), `WO-O4O-MULTILINGUAL-PRODUCT-TABLET-CONTENT-V1`(별도 publicKey 랜딩)

---

## 1. 작업 제목

**O4O KPA 태블릿 본 화면 다국어 상품 설명 연결 (인라인 다국어 브리지)**

## 2. 배경

소규모 전문매장 + 다인종/다언어 고객 응대를 위해, 메인 태블릿 `/tablet/:slug` 상품 상세에서 선택 설명 콘텐츠의 **기존 번역**을 언어 선택으로 볼 수 있게 한다. 새 다국어 생성 기능은 만들지 않는다.

### 데이터 흐름 (조사 결과 — 두 메커니즘 분리 확인)

| 메커니즘 | 저장 | 화면 | 이번 작업 |
|---|---|---|---|
| 콘텐츠 번역 | `kpa_store_contents.content_json.translations[locale] = {title, html, status}` | (없음) | **← 이번 브리지 대상** |
| 다국어 상품 콘텐츠 파일럿 | `store_multilingual_product_content_group` + publicKey | `/multilingual-products/:publicKey?mode=tablet` | **유지·무변경** |

태블릿 상품 엔드포인트는 이미 선택 콘텐츠의 `content_json->>'html'`을 `selectedContentHtml`로 내보낸다. 같은 `content_json`의 `translations`를 함께 실어보내 상세에서 언어 전환을 제공한다.

## 3. 범위

### 포함
- 태블릿 상품 엔드포인트(supplier/local)에 선택 콘텐츠 **게시 가능(검수 완료) 번역** 전달
- 태블릿 상세: 언어 선택 버튼 + fallback (선택 언어 → 기본 선택콘텐츠 → 기존 설명)
- 편성 화면: "검수 완료 다국어 번역이 있으면 태블릿에서 언어 선택 가능" 안내

### 제외
- 새 다국어 번역 생성/편집 기능
- `/multilingual-products` publicKey 랜딩 변경
- QR Core, 소비자 계정/관리, 앱, 디지털 사이니지 통합
- 새 DB 모델/마이그레이션

## 4. 노출 기준 (확정)

- 노출 기준 = **검수 상태(status)**. 누가/무엇으로 번역했는지(매장 AI / 내부 자동 / 사람 입력)는 **구분하지 않는다**.
- 태블릿 고객 화면 노출 = **게시 가능(검수 완료) 번역만** — `status ∈ {ready, published}` 且 html 존재.
- `draft`/`pending`/미검수/자동생성 직후 번역은 **숨긴다**(고객 화면 유출 방지, status/model 등 내부 필드도 서버에서 제거).
- 노출 가능한 번역이 없으면 언어 버튼 미표시 → 기존 설명으로 자연 fallback.

## 5. 우선 확인 파일
- 백엔드: `store-public-utils.ts`(supplier tablet 쿼리), `store-public-tablet.handler.ts`(local 쿼리)
- 공통: `packages/tablet-kiosk-core/src/{TabletKioskPage.tsx,types.ts}`
- 편성: `services/web-kpa-society/src/pages/pharmacy/StoreTabletDisplaysPage.tsx`

## 6. 검증
- KPA/api-server/K-Cosmetics typecheck
- 공개 엔드포인트 응답에 `selectedContentTranslations`(게시가능만/없으면 null) 포함, 기존 필드·회귀 없음
- 상세 언어 버튼 전환 + fallback, translations 없는 상품/서비스(KCos) 무영향
- CHECK: `docs/checks/CHECK-O4O-KPA-TABLET-INLINE-MULTILINGUAL-DESCRIPTION-BRIDGE-V1.md`

## 7. 기준 문장
```text
태블릿 본 화면은 검수 완료된 다국어 상품 설명을 고객이 언어별로 볼 수 있게 하되,
번역 생성/검수는 이번 범위 밖이며 게시 가능한 번역만 노출한다.
```
