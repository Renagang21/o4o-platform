# IR-O4O-STORE-SETTINGS-FULL-AUDIT-V1

> 조사 대상: KPA 매장 설정 `/store/settings` 및 인접 운영 메뉴(채널/타블렛/온라인판매/QR·POP/상담·알림)
> 유형: **READ-ONLY 조사 (코드 변경·DB 변경·메뉴 삭제 없음)**
> 조사일: 2026-06-25 / 범위: KPA 우선 (GP/KCos parity 참고)
> 핵심 질문: "설정이 저장되는가"가 아니라 **"저장된 설정이 실제 기능에 반영되는가"**

---

## 0. 한 줄 결론

`/store/settings`는 일반 "매장 설정 허브"가 아니라 **공개 매장 홈(storefront) 레이아웃 편집기**(template/theme/blocks)이며, 실제로 반영되는 건 **theme·blocks 뿐**이고 template/components/customizations는 **미반영(LEGACY/SAVE_ONLY)**이다. 매장 기본정보는 별도 `/store/info`(약국 정보)에 있다. 채널/타블렛/온라인판매는 각각 살아있고 서로 중복은 아니나, **"채널 관리(B2C+KIOSK)" 메뉴가 사용자 정책("온라인 판매 매장당 1개, 매장 내 B2C 없음, KIOSK 미사용")과 어긋난다.** QR/POP는 매장명만 일부 반영(POP)되고 도메인은 service-catalog 고정(정상). 상담요청→알림은 수신 UI·이동은 이미 되어 있고 **요청 생성 시 알림 생성만 누락**이다.

---

## 1. 현재 설정 화면 구조 (`/store/settings`)

| 구분 | 값 |
|---|---|
| Route | `services/web-kpa-society/src/App.tsx:1033` → `<Route path="settings" element={<PharmacyStorePage />}>` |
| Page | `services/web-kpa-society/src/pages/pharmacy/PharmacyStorePage.tsx` |
| 조회 API | `GET /api/v1/kpa/stores/:slug/settings` (공개) |
| 저장 API | `PATCH /api/v1/kpa/stores/:slug/settings` (owner/admin/manager) |
| 컨트롤러 | `apps/api-server/src/routes/o4o-store/controllers/store-settings.controller.ts:232-341` (등록 `kpa.routes.ts:529-530`) |
| 저장 위치 | `organizations.storefront_config`(JSONB) + 레거시 `storefront_blocks`/`template_profile` (`modules/store-core/entities/organization-store.entity.ts:86-92`) |
| 반영 화면 | 공개 storefront `services/web-kpa-society/src/pages/store/StorefrontHomePage.tsx` |
| 권한 | 개설약사만 편집, 근무약사 접근 차단(`PharmacyStorePage.tsx:211-226`); 백엔드 PATCH는 organization_members role owner/admin/manager |

> **명칭 주의(확인됨):** 화면 라벨은 "매장 설정"이나 실제 기능은 **공개 매장 홈 레이아웃(블록 순서/표시·템플릿·테마) 편집**이다. 매장명/주소/전화 등 기본정보는 여기가 아니라 **설정 그룹의 "약국 정보" `/store/info`** (users.businessInfo)에 있다.

---

## 2. 설정 항목별 매핑표 (`/store/settings`)

| 설정 항목 | 화면 라벨 | 저장 위치 | 실제 사용처 | 판정 |
|---|---|---|---|---|
| theme | 테마·컬러 | storefront_config.theme | StorefrontHomePage:160,248 (`data-theme`) | **ACTIVE** |
| blocks[] | 블록 구성 | storefront_config.blocks (+ storefront_blocks 미러) | StorefrontHomePage:155-156,267 (renderBlock) | **ACTIVE** |
| blocks[].enabled | 블록 표시여부 | storefront_config.blocks[].enabled | StorefrontHomePage:236 (`!enabled→null`) | **ACTIVE** |
| blocks[].config.limit | 표시 개수 | storefront_config.blocks[].config | StorefrontHomePage:166,181 (PRODUCT_GRID/BLOG_LIST) | **ACTIVE** |
| template | 레이아웃 템플릿 | storefront_config.template (+ template_profile) | GET 후 setTemplate 없음 — 블록 기본값 폴백에만 사용 | **LEGACY** |
| components | (UI 없음) | storefront_config.components | 사용처 0 | **SAVE_ONLY** |
| customizations | (UI 없음) | storefront_config.customizations | 사용처 0 | **SAVE_ONLY** |

> 저장 UX: saving→"저장 완료"(2초)→idle, 실패 "저장 실패—다시 시도"(3초). 정상.

---

## 3. 관련 메뉴 기능 관계 (확인됨)

| 메뉴 | route | 데이터(테이블) | 역할 | 판정 |
|---|---|---|---|---|
| 매장 설정 | `/store/settings` | organizations.storefront_config | 공개 홈 레이아웃 편집(theme/blocks) | ACTIVE(일부) |
| 약국 정보 | `/store/info` | users.businessInfo | 매장 기본정보(명/주소/연락 등) | ACTIVE (별 화면) |
| 채널 관리 | `/store/channels` | organization_channels(B2C/KIOSK) + organization_product_channels | 판매 채널(온라인 스토어/키오스크) + 채널별 상품 진열 | ACTIVE(B2C) / **KIOSK=HOLD·MOCK** |
| 타블렛 | `/store/commerce/tablet-displays` | store_tablets / store_tablet_displays / store_local_products (+ idle_playlist) | 매장 내 디바이스 진열·유휴재생 | ACTIVE |
| 판매 채널 확장 | `/store/sales-channels/foreign-visitor` | foreign_visitor_partners / partner_qr / subscriptions(Toss) | 외국인 관광객 판매지원(유료) + 파트너 QR | ACTIVE(유료) |
| QR 코드 | `/store/marketing/qr` | store_qr_codes | QR 생성/출력 | ACTIVE |
| POP | `/store/marketing/pop` | (생성형) store_execution_assets | POP PDF 생성 | ACTIVE |
| 상담 요청 | `/store/requests` | tablet_interest_requests | 타블렛/QR 상담요청 처리 큐 | ACTIVE (별도 IR) |

**중복 판정(확인됨):**
- 채널 ↔ 타블렛: **중복 아님.** 채널=판매 인터페이스(온라인/키오스크), 타블렛=매장 내 디바이스 진열. (과거 채널 안 TABLET 탭은 dedup으로 제거됨 — `StoreChannelsPage.tsx:12-13` 주석)
- 채널 ↔ 판매 채널 확장: **중복 아님.** B2C=자체 온라인 스토어, 판매 채널 확장=제3자(외국인) 경로(유료).
- 설정 ↔ 약국 정보: **분리됨.** 다만 "설정"이라는 라벨이 레이아웃 편집기를 가리켜 사용자 혼동 소지.

---

## 4. 설정 → QR/POP 반영 (확인됨)

| 항목 | 결과 |
|---|---|
| POP PDF 매장명 | ✅ `organizations.name` 사용 (`pop-generator.service.ts:713-724` storeName) |
| POP/QR 도메인 | ✅ service-catalog 고정(`storePublicOrigin`/`qrPublicOrigin`) — **매장이 직접 변경 불가(정상)** |
| QR 공개 landing 매장명/주소/전화/로고 | ⚠️ **미반영** — QR landing 응답은 QR 메타(title/description/imageUrl/productDetails)만. 매장 기본정보 미포함 |
| 매장 설정이 도메인을 바꾸는 구조 | ❌ 없음(설계상 SSOT 고정) — 의도된 정상 |

→ 매장명/주소/전화 등을 QR landing 하단 등에 노출하려면 별도 보강 필요(현재 없음). 단 이는 정책 결정 후 진행.

---

## 5. 알림(상담요청 연계) — 직전 IR 대비 정정

| 항목 | 현황 | 비고 |
|---|---|---|
| 매장 측 알림 수신 UI(Bell/배지/목록) | ✅ 존재 | `KpaGlobalHeader.tsx:77-96`, `api/notifications.ts:49-112` |
| 알림 클릭 → `metadata.targetUrl` navigate | ✅ **구현됨** | `KpaGlobalHeader.tsx:82-96` (WO-...-CONSULTATION-REQUEST-NOTIFICATION-WIRING-V1) |
| 상담요청 생성 시 알림 생성 | ❌ 미연결 | `store-public-tablet.handler.ts:84-142` 알림 호출 없음 |

> **정정:** [IR-...-CONSULTATION-REQUESTS-NOTIFICATION-REPLACEMENT-AUDIT-V1](./IR-O4O-KPA-STORE-CONSULTATION-REQUESTS-NOTIFICATION-REPLACEMENT-AUDIT-V1.md) 은 "알림 클릭 navigate 미구현(admin-dashboard 기준)"으로 기술했으나, **KPA 매장(web-kpa-society) 측은 navigate 가 이미 구현**되어 있다. 남은 갭은 **요청 생성 시 알림 createNotification 호출 1건**뿐이다.

---

## 6. 콘텐츠 편집기 상담 CTA 삽입 가능성 (확인됨)

| 항목 | 결과 |
|---|---|
| 표준 리치 편집기(TipTap, `content-editor/RichTextEditor.tsx:58-94`) | Bold/Heading/List/Image/Youtube/Link 등만. **Button/CTA 블록 확장 없음** |
| QR landing page 본문 하단 CTA | ❌ 미구현 (`QrLandingPage.tsx:147-173`) |
| store_qr_codes CTA 설정 컬럼 | ❌ 없음 |

→ **편집기 HTML에 버튼을 직접 삽입하는 방식은 현 편집기로 불가**(확장 개발 필요)이고, 같은 콘텐츠가 자료실/태블릿/POP/블로그/QR로 재사용되므로 HTML 박기는 부적절. **설정값(QR별 CTA on/off) + landing 렌더러 조건부 버튼** 방식이 맞다(직전 상담 IR Phase 2 와 동일 결론).

---

## 7. 문제 유형 분류

- **죽은/미반영 설정**: `template`(LEGACY, 폴백만) / `components`·`customizations`(SAVE_ONLY) / `storefront_blocks`·`template_profile`(레거시 미러).
- **명칭·정보구조 혼동**: "매장 설정"(`/settings`)이 실제로는 storefront 레이아웃 편집기. 매장 기본정보는 "약국 정보"(`/info`)에 분리. 사용자가 "설정"에서 매장 정보/도메인/연락처를 기대하면 못 찾음.
- **정책 불일치(채널)**: "채널 관리"가 B2C+KIOSK 묶음. 사용자 정책은 "온라인 판매 매장당 1개 + 매장 내 B2C 없음 + KIOSK 미사용". KIOSK=HOLD/MOCK 상태 → 메뉴가 실제 정책보다 넓게 노출.
- **온라인 판매 의미 분산**: 자체 온라인 스토어(B2C 채널) vs 판매 채널 확장(외국인). "온라인 판매"라는 독립 의미 메뉴가 명확히 없음(채널 안에 B2C로 묻힘).
- **알림 갭(소)**: 수신·이동은 됨. 요청 생성 알림만 누락(별도 IR Phase1).
- **편집기 CTA 부재**: 상담 CTA를 콘텐츠에 넣을 표준 수단 없음 → 설정값 방식 필요.
- **QR landing 매장정보 부재**: 매장명/주소/연락처가 QR 공개 화면에 없음(정책 결정 사항).

---

## 8. 후속 WO 제안 (작게 분할)

> 모두 별도 WO. 본 문서는 조사로 종료.

**P0 (실제 오작동) — 없음.** 출력물 도메인 장애(QR/POP)는 직전 hotfix로 해소됨.

**P1 (정보구조·메뉴 정합)**
- WO-A: `/store/settings` 라벨/위치 재정의 — "매장 홈 디자인"(또는 storefront 편집)으로 명칭 정리, "약국 정보"와 관계 명문화. (라벨/문구·안내만, 기능 불변)
- WO-B: 채널 메뉴 정책 정렬 — KIOSK(HOLD/MOCK) 노출 여부 결정, "온라인 판매(B2C) 1개" 단일 의미로 정리. 타블렛은 현행 유지(분리 적절).

**P2 (설정 청소·UX)**
- WO-C: SAVE_ONLY/LEGACY 정리 — `components`/`customizations` 제거 또는 문서화, `template` 미반영 명시(또는 실제 반영 연결 결정). storefront_blocks/template_profile 레거시 정리 판단.
- WO-D: 상담요청 알림 생성 연결 — `POST /stores/:slug/tablet/interest` 에서 매장 사용자 `createNotification`(targetUrl=/store/requests). (수신·이동은 이미 구현 → 생성만 추가). 직전 상담 IR Phase1 과 동일.

**P3 (구조 개선·옵션)**
- WO-E: QR 콘텐츠 상담 CTA(설정값 방식) — store_qr_codes CTA 컬럼 + landing 조건부 렌더. (상담 IR Phase2)
- WO-F: QR landing 매장정보 노출 옵션(매장명/연락처) — 정책 결정 후.
- WO-G(저우선): `qrPublicOrigin`/`storePublicOrigin` 공용 util 추출(중복 정리).

---

## 9. 확인 vs 추정

**확인됨:** §1~§6 의 파일경로:라인 근거 항목 전부(route/컨트롤러/엔티티/사용처 grep). theme·blocks ACTIVE, template LEGACY, components/customizations SAVE_ONLY. 채널/타블렛/판매확장 ACTIVE 및 비중복. POP storeName 사용. 알림 navigate 구현 + 요청생성 알림 미연결. 편집기 CTA 미지원.

**추정/미확인:**
- KIOSK 채널의 실제 운영 연동(디바이스/출력)은 HOLD로 보이나 깊은 런타임 검증 미수행.
- K-Cosmetics 측 동등 화면/테이블은 본 조사 범위 밖(상담 IR 참고).
- QR landing 매장정보 노출 "필요 여부"는 정책 판단(코드상 현재 미반영만 확인).

---

## 10. 주의사항
- read-only 조사 종료. 코드/DB/메뉴 변경은 위 P1~P3 별도 WO에서.
- 요청 기록 테이블(tablet_interest_requests) 등 업무 기록은 삭제 금지.
- `/store/settings` 기능 자체는 정상(축소된 범위) — 삭제가 아니라 명칭·정합 정리 대상.
