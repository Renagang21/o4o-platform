# CHECK-O4O-KPA-TABLET-CONTENT-DRAFT-PREVIEW-V1

> 목적: 태블릿 콘텐츠 제작 중 **저장 전 draft**를 실제 화면(태블릿 / QR 모바일)으로 미리보기. 제작 5단계 모달로 제공.
> 선행: [`CHECK-...-STEP-BUILDER-SHELL-V1`](CHECK-O4O-KPA-TABLET-CONTENT-STEP-BUILDER-SHELL-V1.md)(WO-2) · [`IR-...-CURRENT-STATE-AUDIT-V1`](../investigations/IR-O4O-KPA-TABLET-CONTENT-CREATION-CURRENT-STATE-AUDIT-V1.md)
> Work Order: `WO-O4O-KPA-TABLET-CONTENT-DRAFT-PREVIEW-V1`
> 원칙: DB migration / QR landing / screen_set slug / store_qr_codes / 코너 적용 / 템플릿별 제작 단계 / 운영 샘플 — **무변경**. 저장 전 DB write 없음.

---

## 1. 실제 원인 / 설계 판단

- 제작 5단계 셸(WO-2)의 마지막 단계 미리보기가 placeholder였다. 각 `template_key`의 실제 레이아웃을 저장 전 확인할 방법이 없었다.
- 뷰어(`TabletKioskPage`)는 `screen.sections`를 소비하며, **`content_list` 블록은 서버가 resolve한 카드**(title/summary/thumbnail/detail.html — SPD `shared_product_descriptions` / `kpa_store_contents` SELECT)를 소비한다.
- **프론트 순수 주입만으로는 content_list를 안전하게 재현할 수 없다**(원본 title/summary/detail은 DB에만 존재). WO가 명시한 fallback — "최소 read-only preview API로 분리하여 보고" — 에 해당.

### ➡️ 채택: read-only preview API + 프론트 주입 (하이브리드)

- **백엔드**: 공개 `/tablet/screen`과 **동일한 resolve 함수**(SELECT only)를 재사용하는 `POST /store/screen-sets/preview`. 저장 없이 draft blocks → sections. → 정확한 content_list 카드 확보.
- **프론트**: 그 sections를 `TabletKioskPage`(embedded)에 **주입**해 렌더. 공개 runtime(`/tablet/screen`)·kiosk 저장 모델 무변경.

---

## 2. 변경 파일 (5개)

| 파일 | 변경 |
|---|---|
| `apps/api-server/.../store-tablet.routes.ts` | **신규** `POST /store/screen-sets/preview` (withStoreAuth, read-only). draft blocks → sections. 기존 resolve 함수 재사용: `resolveContentListItems`(org 스코프) / `parseIdleMediaConfig`+`resolveIdleMediaItems`(custom_media) / `shapeStaticBlock` / `resolveTemplateKey`. product_list는 생략(뷰어가 fetchProducts로 표시). **DB write 없음.** |
| `packages/tablet-kiosk-core/.../TabletKioskPage.tsx` | **additive props** `previewScreen?`(주입 시 fetchScreen 생략) + `embedded?`(root/모달 `position:fixed`→`absolute`). 미주입 서비스(K-Cosmetics 등) 무영향. |
| `services/web-kpa-society/.../api/tabletDisplays.ts` | `previewScreenSet({templateKey, blocks})` → preview 엔드포인트 호출, `TabletScreenResponse` 반환. |
| `services/web-kpa-society/.../TabletScreenSetManager.tsx` | 빌더 5단계에 **미리보기 모달**([태블릿]/[QR 모바일] 탭 + 저장). `TabletKioskPage` embedded 재사용. `previewApi`/`storeSlug` props 수신·전달. |
| `services/web-kpa-society/.../StoreTabletDisplaysPage.tsx` | library 매니저에 `previewApi`+`storeSlug` 전달(기존 자산 재사용). |

> 새 npm 패키지 없음 → `package.production.json` 동기화 불필요. 새 테이블/컬럼/slug 없음.

---

## 3. 변경 내용

### 3.1 백엔드 preview 엔드포인트 (read-only)

`POST /api/v1/store/screen-sets/preview` (요청: `{templateKey?, blocks:[{blockType,sortOrder?,isEnabled?,config}]}`)
- `is_visible!==false` 블록만 `sort_order`로 정렬 → blockType별 resolve(각 try/catch, 실패 섹션 생략).
- `content_list` → `resolveContentListItems(ds, organizationId, config)` (공개 핸들러와 **동일 org 게이트**).
- `idle_media` → `parseIdleMediaConfig` → `resolveIdleMediaItems`(draft라 legacy/operator 소스 빈 배열, `custom_media`만 완전 resolve), viewer 형태 `{type,url,durationMs}`로 매핑.
- 정적(`corner_description`/`health_info`/`staff_inquiry`/`qr_guide`) → `shapeStaticBlock`.
- `product_list` → 생략(뷰어가 `/tablet/products`로 별도 표시).
- 응답: `{mode:'screen_set', templateKey, screenSet:{id:'preview'}, sections, tabletId:null}`.
- **SELECT only, DB write 0.** screen_set 소유 검증 불필요(저장 안 함, org 스코프만).

### 3.2 kiosk-core (additive)

- `previewScreen` 주입 시 `api.fetchScreen` 호출 생략, 주입 sections로 렌더(`screen = previewScreen(mode='screen_set') ?? fetchedScreen`). 상품은 여전히 `api.fetchProducts(slug)`.
- `embedded` → `rootStyle`(4개 view root) + content 상세 모달을 `position:absolute`로. 부모(모달 프레임)가 `position:relative; overflow:hidden` 제공.
- `template_key`별 레이아웃 분기(`:440-450`)는 주입 sections에도 그대로 적용 → **실제 template_key 반영**.

### 3.3 미리보기 모달 (제작 5단계)

- [태블릿 미리보기] / [QR 모바일 미리보기] 버튼 → `previewScreenSet(draft)` 호출 → 모달 오픈. 모달 상단 탭으로 태블릿↔모바일 전환(재조회 없음).
- 태블릿 = 가로 프레임(`aspectRatio 16/10`), QR 모바일 = **세로 프레임(390px, 세로 반응형)** — 동일 `TabletKioskPage` embedded 재사용(뷰어 flex-column이 좁은 폭에 적응).
- 대기 영상형(`idle_touch_video`) 템플릿은 상단 hero 영상 + "화면을 터치하세요/Touch to start" + QR chip 반영.
- **모달은 오버레이** — 닫아도 빌더 state(name/status/templateKey/blocks/step) 손대지 않음 → **편집 상태 유지**.

---

## 4. QR 모바일 preview 해석 (보고)

- WO: "QR 모바일 = 현재 draft sections를 세로형 반응형 화면으로. 실제 QR 발급·공통 원본 저장은 후속 WO."
- 구현: **QR landing·slug·store_qr_codes 무변경**. 별도 세로 렌더러를 신설하지 않고, 완료기준 "기존 kiosk viewer 재사용"을 우선해 `TabletKioskPage`를 **세로(390px) 프레임**에 embedded로 렌더. 동일 draft sections를 세로로 표시.
- 즉 이번 WO의 QR 모바일 미리보기는 "같은 콘텐츠의 모바일 폭 레이아웃 확인"이며, 실제 QR→모바일 전용 페이지(공통 원본)는 후속 WO(WO-5) 범위.

---

## 5. read-only preview API 도입 보고 (WO fallback 조항)

- WO: "가능하면 프론트 주입으로 해결. 단 resolver를 프론트에서 안전하게 재현할 수 없다면 최소 read-only preview API로 분리하여 **보고**한다."
- **content_list resolve는 프론트 재현 불가**(원본 SPD/kpa_store_contents의 title/summary/detail.html은 서버 SELECT 필요). 따라서 최소 read-only 엔드포인트를 신설했다.
- 이 엔드포인트는 **저장·복사·생성 없이 SELECT만** 수행하며, 공개 핸들러의 resolve 함수를 그대로 재사용(중복 로직 없음). 정적/idle(custom_media) 블록은 프론트만으로도 가능하나, 일관성을 위해 동일 경로로 처리.

---

## 6. 보존 사항 / 금지선 준수

| 항목 | 상태 |
|---|---|
| DB migration / screen_set slug / store_qr_codes / QR landing 생성 | ✅ 없음 |
| 코너 적용 / 템플릿별 제작 단계 / 복제 API / 코너×콘텐츠 배정 / 운영 샘플 | ✅ 무변경 |
| public runtime(`/tablet/screen`) / kiosk 저장 모델 | ✅ 무변경(preview는 별도 엔드포인트, kiosk props는 additive) |
| K-Cosmetics(kiosk-core 소비) | ✅ 무영향(previewScreen/embedded 미주입 → 기존 동작) |
| 저장 전 DB write | ✅ 없음(preview = SELECT only) |

---

## 7. 정적 검증

| 항목 | 결과 |
|---|---|
| `@o4o/web-kpa-society` build (`tsc && vite`, kiosk-core 소스 포함) | ✅ **✓ built in 22.16s** |
| `@o4o/api-server` build (`tsc -p tsconfig.build.json`) | ✅ **BUILD_EXIT=0** (error 0) |
| `@o4o/tablet-kiosk-core` | build script 없음(소스 소비) → web 빌드에서 타입 검증됨 |

---

## 8. 배포 / Browser Smoke

| 항목 | 값 |
|---|---|
| commit | (본 커밋) |
| 배포 | Deploy Web Services(kpa-society-web ± kiosk-core 소비 서비스) + Deploy API Server(o4o-core-api) |
| Browser smoke | **Deferred** — 인증 세션 미보유 시 자동 로그인 금지(WO). |

> 후속 smoke 항목: 신규 draft 미리보기 / 기존 콘텐츠 수정 draft 미리보기 / template_key별 레이아웃 차이(기본·상품집중·코너소개·대기영상) / 대기 영상 터치 안내 / embedded overflow 없음 / 모달 닫은 뒤 편집 상태 유지 / 저장 전 DB write 없음(네트워크 로그) / 성공·실패 toast.

---

## 9. 완료 기준 대조

| 완료 기준 | 결과 |
|---|---|
| 제작 중 draft를 저장 전 미리보기 | ✅ 5단계 미리보기 모달 |
| 태블릿·모바일 두 모드 | ✅ 태블릿(가로) / QR 모바일(세로 390px) 탭 |
| 실제 template_key 반영 | ✅ kiosk-core 분기 그대로(주입 sections) |
| 기존 kiosk viewer 재사용 | ✅ TabletKioskPage embedded |
| DB·QR 저장 구조 변경 없음 | ✅ preview = read-only, slug/qr_codes 무변경 |
| commit/push | 본 커밋 |
| build | ✅ web + api |
| Browser smoke | Deferred(인증 세션 없음) |

---

*작성: 2026-07-14 · Status: 구현 완료(web+api 빌드 통과) · Browser smoke Deferred*
