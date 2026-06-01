# IR-O4O-KPA-QR-PRODUCTION-FLOW-STATE-AUDIT-V1

**조사 일자**: 2026-05-09
**조사 기준**: main (`745f555ba` 시점, sync 완료)
**조사 범위**: KPA 매장 QR Code 기능 — 메뉴/화면/생성 흐름/내 자료함 연계/공개 URL/POP 공통화/코드 구조
**조사자**: Claude Opus 4.7 (코드 수정 없음, 정적 분석 + 직전 커밋 영향 평가)

---

## 0. 핵심 결론 (TL;DR)

> **QR 기능은 이미 "내 자료함 → 제작 시작" canonical 진입 구조로 전환 완료되어 있다.**
> 직전 커밋 `745f555ba` (WO-O4O-KPA-STORE-MATERIALS-AND-PRODUCTIONS)에서 POP·QR·블로그·상품 상세설명 4개 제작 흐름이 동시에 정렬됨. 사용자가 우려한 "자료 추가 중심 구조"는 실제 코드상 이미 제거됨.

남은 정비 영역은 **표면 문구 잔재 + dead code + POP 대비 메타 입력 폼** 3가지로, **신규 entity·migration 불필요**한 소규모 정비 범위.

---

## 1. 현재 구조 요약

### 1.1 메뉴/Sidebar
- 라벨: **"QR 코드"** (`packages/store-ui-core/src/config/storeMenuConfig.ts:225`)
- 그룹: **"매장 실행"** (POP, 블로그, 상품 상세설명과 동일 그룹)
- Route: `/store/marketing/qr` ([App.tsx:836](services/web-kpa-society/src/App.tsx#L836))
- "내 제작물" 그룹은 745f555ba에서 제거됨 — 진입은 자료함으로만.

### 1.2 메인 페이지
[StoreQRPage.tsx](services/web-kpa-society/src/pages/pharmacy/StoreQRPage.tsx) (line 390 이하)

| 요소 | 현재 값 |
|------|---------|
| 페이지 제목 | "QR 코드 관리" |
| 서브 제목 | "Library 자료를 QR 코드로 연결하여 오프라인에서 온라인으로 유도합니다" |
| Header primary 버튼 | **없음** (line 393-394 주석으로 명시 제거: "제작 시작은 '내 자료함'에서만") |
| Create form 타이틀 | "새 QR 코드 설정" (자료 수신 후 자동 전개) |
| Save 버튼 | "QR 코드 생성" |
| Empty state | "등록된 QR 코드가 없습니다" + ❌가이드: "'QR 코드 생성' 버튼을 눌러..." (현존하지 않는 버튼 안내) |

### 1.3 진입 경로 (canonical)
```
내 자료함 (콘텐츠/자료) → 자료 선택 → "제작 시작" 버튼
   → StartProductionModal (POP/QR/블로그/상품 상세설명 4-choice)
   → "QR 코드" 선택 → 템플릿 선택
   → /store/marketing/qr 이동, location.state.production.source.items 전달
   → StoreQRPage가 location.state 수신 → "새 QR 코드 설정" 폼 자동 전개
   → 슬러그/landingType/landingTargetId 입력 → POST /pharmacy/qr
```

### 1.4 기능 구현 상태
모두 실제 동작 (placeholder 아님):

| 기능 | 위치 | 상태 |
|------|------|------|
| 생성 | [store-qr-landing.controller.ts:524-614](apps/api-server/src/routes/o4o-store/controllers/store-qr-landing.controller.ts#L524) | ✅ |
| 목록 (scanCount 포함) | controller:232-284 | ✅ |
| 수정 | controller:616-658 | ✅ |
| 삭제 (soft) | controller:660-683 | ✅ |
| PNG/SVG 다운로드 | controller:337-371 | ✅ (qrcode 라이브러리) |
| A4 8분할 일괄 PDF | controller:373-425 + qr-print.service.ts | ✅ (PDFKit) |
| Flyer 템플릿 PDF | controller:427-522 + qr-flyer.service.ts | ✅ |
| 스캔 통계 | controller:286-335 | ✅ |
| 공개 랜딩 | controller:65-172 (`GET /qr/public/:slug`) | ✅ |

---

## 2. 문제점 목록

### 2.1 표면 잔재 (Stale UI text)
1. **Empty state 가이드 부정확** — [StoreQRPage.tsx:554](services/web-kpa-society/src/pages/pharmacy/StoreQRPage.tsx#L554)
   - 현재: `"'QR 코드 생성' 버튼을 눌러 Library에서 자료를 선택하세요"`
   - 실제: 그 버튼은 745f555ba에서 제거됨. 진입은 자료함에서만.
   - 권장: `"내 자료함에서 자료를 선택한 뒤 '제작 시작 → QR 코드'로 진입하세요"`

2. **StoreQRCreateEntryModal 제목 부정확** — [StoreQRCreateEntryModal.tsx:689](services/web-kpa-society/src/components/store/StoreQRCreateEntryModal.tsx#L689)
   - 현재 타이틀: "QR 생성 방식 선택"
   - 실제 2-choice: "기존 자료 선택" / "새 자산 만들기" → 자료 선택 흐름이지 QR 방식 분기가 아님
   - 자료함 진입이 canonical이 된 지금, 이 모달의 의미가 모호해짐 (StoreQRPage 안에서 추가 자료 교체 시에만 호출되는 것으로 추정)

### 2.2 Dead code / 미사용 분기
3. **landingType 정의 vs API 검증 불일치** — [StoreQRPage.tsx:38-44](services/web-kpa-society/src/pages/pharmacy/StoreQRPage.tsx#L38) vs [controller:548](apps/api-server/src/routes/o4o-store/controllers/store-qr-landing.controller.ts#L548)
   - UI: `product | promotion | page | link | tablet`
   - API allowlist: `['product', 'promotion', 'page', 'link']` — `tablet` 제외
   - `tablet` 선택 시 서버 422 가능성. 실제 사용처 없음 → dead.

4. **promotion 타입 미완성** — UI 옵션은 있으나 StoreQRPage에 promotion 전용 입력 분기 없음 (텍스트 ID 입력으로 fallback).

5. **`selectedLibraryItem` 단건 레거시 경로** — [StoreQRPage.tsx:145-193](services/web-kpa-society/src/pages/pharmacy/StoreQRPage.tsx#L145)
   - 신규 `state.production.source.items`(다건)로 대체됨에도 단건 path 잔존.
   - 745f555ba 이후 단건 진입처는 코드상 없는 것으로 추정 → 검증 필요.

### 2.3 구조적 차이 (POP과 비대칭)
6. **메타 입력 폼 존재** — POP은 자료 선택 → 즉시 PDF 출력(영구 entity 없음)이지만, QR은 슬러그·landingType·landingTargetId를 사용자가 별도 입력해야 함. 자료 선택만으로 완결되지 않음 — POP과 같은 "선택→즉시 결과물" 흐름이 아님.

---

## 3. POP canonical과의 차이점

| 항목 | POP | QR |
|------|-----|----|
| 진입 | 자료함 → 제작 시작 → POP | 자료함 → 제작 시작 → QR ✅ 동일 |
| 자료 수신 | `location.state.production.source.items` | 동일 ✅ |
| 영구 저장 | ❌ 없음 (on-demand PDF) | ✅ `store_qr_codes` entity |
| 추가 입력 | ❌ 없음 (자료만으로 출력) | ✅ slug + landingType + landingTargetId |
| 결과물 관리 페이지 | 선택된 자료 리스트 (세션) | 영구 QR 목록 + 통계 + 다운로드 메뉴 |
| 출력 | A4/A5 PDF (QR 옵션) | PNG/SVG/A4 PDF/Flyer |
| QR 연결 | POP 생성 시 별도 qrId 선택(옵션) | QR 자체가 결과물 |

**해석**: POP은 "**일회성 인쇄물**", QR은 "**재사용 가능한 디지털-오프라인 브리지**" 성격이 본질적으로 다르므로 entity 보존은 정당. 다만 진입 UX는 정렬됨.

---

## 4. 공통화 가능한 영역

### 4.1 이미 공통화 완료 (745f555ba)
- ✅ [`StartProductionModal`](services/web-kpa-society/src/pages/pharmacy/StartProductionModal.tsx) — 자료 선택 후 제작 대상 선택 (POP/QR/블로그/상품 상세설명 통합 진입)
- ✅ `ProductionSource` 타입 (`{ fromLibrary: 'contents'|'resources', items: ProductionSourceItem[] }`) — `location.state.production.source` 전달 규약
- ✅ `StoreLibraryContentsPage` / `StoreLibraryResourcesPage` — 동일 toolbar(체크박스+제작 시작 버튼) 패턴
- ✅ `getStoreLibraryItems({ page, limit, search, category })` API — 자료함과 QR 재선택 모달이 공유

### 4.2 추가 공통화 검토 가능 (선택)
- `StoreAssetSelectorModal`(현재 QR 페이지 안에서만 자료 교체 시 호출)이 POP에서도 "자료 교체"용으로 쓰이는지 확인 필요. 분리되어 있다면 통합 후보.
- "Empty state 안내문" 4개 페이지(POP/QR/블로그/상품 상세설명)에 동일 카피 적용 (현재 QR만 stale).

---

## 5. 수정 필요 파일 목록 (정비 WO 후보 기준)

| # | 파일 | 변경 성격 | 라인 |
|---|------|----------|------|
| 1 | [services/web-kpa-society/src/pages/pharmacy/StoreQRPage.tsx](services/web-kpa-society/src/pages/pharmacy/StoreQRPage.tsx) | empty state 가이드 문구 교체 | 551-554 |
| 2 | StoreQRPage.tsx | landingType `tablet` 옵션 제거 (또는 server allowlist 추가) | 38-44 |
| 3 | StoreQRPage.tsx | `selectedLibraryItem` 단건 경로 잔재 검증·제거 | 145-193 |
| 4 | [services/web-kpa-society/src/components/store/StoreQRCreateEntryModal.tsx](services/web-kpa-society/src/components/store/StoreQRCreateEntryModal.tsx) | 모달 제목 "자료 선택" 류로 정정, 또는 사용처 검증 후 삭제 | 689 |
| 5 | (선택) [apps/api-server/src/routes/o4o-store/controllers/store-qr-landing.controller.ts](apps/api-server/src/routes/o4o-store/controllers/store-qr-landing.controller.ts) | landingType allowlist 정리 (UI와 일치) | 548 |

**신규 추가 불필요**: entity, migration, route, API endpoint 모두 추가 없음.

---

## 6. 예상 영향 범위

| 항목 | 평가 |
|------|------|
| **빌드** | TypeScript 영향 없음 (문구·dead 옵션 제거만) |
| **API 계약** | 변경 없음 (controller 4번 항목은 검증 강화일 뿐 양립) |
| **DB** | 변경 없음 |
| **공개 URL/모바일** | **이미 정상**. `/qr/{slug}` public route, `GET /qr/public/:slug` 무인증, mobile-first 설계(420px max-width) — 추가 작업 불필요 |
| **운영 데이터** | `store_qr_codes` row 영향 없음 |
| **다른 서비스** | KPA 단독 (web-kpa-society) — neture/glycopharm/k-cosmetics 영향 없음 |
| **테스트** | smoke 수준: 자료함 → 제작 시작 → QR → 생성 → /qr/{slug} 접근 |

---

## 7. 신규 entity / migration 필요 여부

**불필요.**

근거:
- `store_qr_codes`, `store_qr_scan_events` 두 테이블이 이미 존재하며 모든 시나리오 커버
- 745f555ba에서 "기존 active API/entity 최대 재사용 — 신규 entity·migration 없음"이 명시 원칙
- 본 IR이 식별한 정비 항목은 모두 클라이언트 표면(문구·UI 옵션)과 dead 분기 정리

---

## 8. 검증 매트릭스 (현재 상태)

| 검증 항목 | 결과 | 근거 |
|-----------|------|------|
| QR 메뉴 진입 (`/store/marketing/qr`) | ✅ | App.tsx:836, storeMenuConfig.ts:225 |
| QR 생성 진입 (자료함→제작 시작→QR) | ✅ | StartProductionModal:20-61 + StoreQRPage:145-193 |
| QR 생성 후 목록 반영 | ✅ | StoreQRPage:101-112 (`getStoreQrCodes`) |
| QR 출력 (PNG/SVG/PDF/Flyer) | ✅ | controller:337-522 + StoreQRPage:299-365 |
| QR 다운로드 | ✅ | 동일 |
| QR 스캔 후 접근 (`/qr/{slug}`) | ✅ | App.tsx:921 + QrLandingPage.tsx, controller:65-172 무인증 |
| 모바일 브라우저 접근 | ✅ | QrLandingPage 420px card, mobile-first |
| TypeScript/build 영향 | ⏸ 정비 시점에 재확인 | 본 IR 시점 변경 없음 |
| Empty state 문구 정확성 | ❌ | StoreQRPage:554 stale text |
| landingType 일관성 (UI vs API) | ❌ | tablet/promotion 불일치 |

---

## 9. 다음 WO 초안 제안

### WO-O4O-KPA-STORE-QR-CANONICAL-CLEANUP-V1 (권장 — 소규모 정비)

**범위**:
1. StoreQRPage empty state 가이드 문구 교체 → "내 자료함에서 자료를 선택한 뒤 '제작 시작 → QR 코드'로 진입하세요"
2. StoreQRCreateEntryModal — 사용처 grep 후 (a) 미사용이면 삭제, (b) 사용 중이면 모달 제목을 "자료 선택" 류로 정정
3. landingType 옵션 정합성: UI에서 `tablet` 제거 + (의도된 기능이면) server allowlist에 추가
4. `selectedLibraryItem` 레거시 단건 경로 — 호출처 grep 후 제거 가능 시 제거
5. `promotion` 타입의 입력 UX 개선 또는 옵션 제거

**비포함** (의도적):
- POP과의 entity 구조 동일화 (성격이 다르므로 보류)
- 신규 진입점 / 새 모달 / 새 API
- 신규 migration

**테스트**:
- 자료함→제작시작→QR 생성→/qr/{slug} 모바일 접근 smoke
- TypeScript build (`tsc -b --noEmit`, web-kpa-society)

**예상 diff 규모**: < 80 lines, 단일 서비스 (web-kpa-society) + 선택 시 controller 1개 라인 변경.

---

## Appendix: 핵심 파일 인덱스

| 영역 | 파일 |
|------|------|
| 페이지 | [services/web-kpa-society/src/pages/pharmacy/StoreQRPage.tsx](services/web-kpa-society/src/pages/pharmacy/StoreQRPage.tsx) |
| 페이지 (랜딩) | [services/web-kpa-society/src/pages/qr/QrLandingPage.tsx](services/web-kpa-society/src/pages/qr/QrLandingPage.tsx) |
| 진입 모달 | [services/web-kpa-society/src/pages/pharmacy/StartProductionModal.tsx](services/web-kpa-society/src/pages/pharmacy/StartProductionModal.tsx) |
| 자료 선택 모달 | [services/web-kpa-society/src/components/store/StoreQRCreateEntryModal.tsx](services/web-kpa-society/src/components/store/StoreQRCreateEntryModal.tsx), [StoreAssetSelectorModal](services/web-kpa-society/src/components/store/) |
| 자료함 | [StoreLibraryContentsPage.tsx](services/web-kpa-society/src/pages/pharmacy/StoreLibraryContentsPage.tsx), [StoreLibraryResourcesPage.tsx](services/web-kpa-society/src/pages/pharmacy/StoreLibraryResourcesPage.tsx) |
| Client API | [services/web-kpa-society/src/api/storeQr.ts](services/web-kpa-society/src/api/storeQr.ts), [storeLibrary.ts](services/web-kpa-society/src/api/storeLibrary.ts) |
| Backend Controller | [apps/api-server/src/routes/o4o-store/controllers/store-qr-landing.controller.ts](apps/api-server/src/routes/o4o-store/controllers/store-qr-landing.controller.ts) |
| Entity | [apps/api-server/src/routes/platform/entities/store-qr-code.entity.ts](apps/api-server/src/routes/platform/entities/store-qr-code.entity.ts), [store-qr-scan-event.entity.ts](apps/api-server/src/routes/platform/entities/store-qr-scan-event.entity.ts) |
| Service | `apps/api-server/src/routes/o4o-store/services/qr-print.service.ts`, `qr-flyer.service.ts` |
| Sidebar | [packages/store-ui-core/src/config/storeMenuConfig.ts](packages/store-ui-core/src/config/storeMenuConfig.ts) (line 209-225) |
| Routes | [services/web-kpa-society/src/App.tsx](services/web-kpa-society/src/App.tsx) (line 836, 921) |
| 직전 IR | [docs/investigations/IR-O4O-STORE-MATERIALS-AND-PRODUCTIONS-STATE-AUDIT-V1.md](docs/investigations/IR-O4O-STORE-MATERIALS-AND-PRODUCTIONS-STATE-AUDIT-V1.md) |
| 직전 커밋 | `745f555ba` — WO-O4O-KPA-STORE-MATERIALS-AND-PRODUCTIONS |

---

*조사 마감: 2026-05-09*
*상태: 조사 완료, 정비 WO 대기*
