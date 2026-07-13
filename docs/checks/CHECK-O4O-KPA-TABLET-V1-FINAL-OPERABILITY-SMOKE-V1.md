# CHECK-O4O-KPA-TABLET-V1-FINAL-OPERABILITY-SMOKE-V1

> WO: `WO-O4O-KPA-TABLET-V1-FINAL-OPERABILITY-SMOKE-V1`
> 성격: **최종 운영 smoke / V1 종료 판단** (신규 개발 아님)
> 정책: (b) public API/viewer read-only 우선 · 자동 로그인 금지 · 운영 샘플 보존 · DB write 0
> Date: 2026-07-13

---

## 0. 결론 요약

- **태블릿 V1 런타임 운영 흐름(screen_set → public `/screen` → viewer)은 두 운영 샘플 모두 정상 작동 → V1 종료(닫기) 가능.**
- public API 3종(`/screen`·`/idle`·`/products`)·viewer·network 전부 정상, tablet 관련 500/크래시 0. `product_list` 0건도 "표시할 상품이 없습니다"로 graceful.
- **관리 UI 파트(dirty guard · 저장/적용/해제 문구 UI 검증 · `product_focus` 전환)는 Deferred** — 관리 화면이 `/login` 리다이렉트(미인증)이고, 정책상 자동 로그인/체험계정 클릭을 하지 않음. 이들은 editor UX 확인 항목으로 **V1 런타임 운영성 판단을 막지 않는다.**
- **DB write 0 / 운영 샘플 2개 무변경 / 최종 상태 = 원본 유지.**

---

## 1. 대상 운영 샘플 (보존됨)

| 코너 | tabletId | screenSetId | set 상태 | template_key |
|------|----------|-------------|----------|--------------|
| 구강관리 | c86863d8-c792-476c-b4b1-3aa1169a4395 | 7280872e-00d1-4537-b4ef-ac2cef9cd7c1 | active | **NULL → 기본 `corner_information_basic_v1`** |
| 피부관리 | f8b78a16-2d8a-4b3a-9fa6-e03c0cbd96d9 | 8c6eb9fe-5ab5-4ca5-8800-db486ed8e510 | active | **`corner_information_basic_v1`** (명시) |

- 두 태블릿 모두 org `9c87f46b`(네뚜레-약국, slug service_key `kpa`).
- 두 세트 모두 blocks 4종 **idle_media(10) / corner_description(20) / product_list(30) / qr_guide(40)**, 전부 `is_visible=true` (DB 실측).
- smoke 후 삭제/수정 없음.

---

## 2. Public API read-only smoke (프로덕션)

API base = `https://o4o-core-api-...run.app` · slug `네뚜레-약국`(UTF-8) · 각 코너 `?tabletId=` 지정.

| 코너 | `/tablet/screen` | `/tablet/idle` | `/tablet/products` |
|------|:---:|:---:|:---:|
| 구강관리 | **200** | **200** | **200** |
| 피부관리 | **200** | **200** | **200** |

### `/tablet/screen` 응답 (양 코너 동일 구조)

```
mode: "screen_set"
templateKey: "corner_information_basic_v1"
screenSet: { id, name: "<코너> 기본 화면 세트" }
sections (4):
  - idle_media(10):        { items:[{type:image, url:placehold 1920x1080, durationMs:30000}], operatorCommonSource:null }
  - corner_description(20): { title:"<코너> 코너", body:"<안내문>" }
  - product_list(30):       { products:[], localProductsEndpoint:"/네뚜레-약국/tablet/products" }
  - qr_guide(40):           { label:"모바일로 더 보기", url:"https://kpa-society.co.kr" }
```

- **block 4종 전부 sections 로 정상 구성**. `product_list` products=[] 여도 섹션 정상 포함(무크래시).
- `/idle`: `{ items:[{type:image,...}] }` 정상.
- `/products`: `{ data:[], meta.total:0, localProducts:[], tabletDisplaySource:"legacy_fallback" }` — **0건 무크래시**.

---

## 3. 공개 viewer smoke (Playwright, 프로덕션)

viewer = `https://kpa-society-web-...run.app/tablet/네뚜레-약국?tabletId=<tid>`

| 코너 | 렌더 결과 | 스크린샷 |
|------|-----------|----------|
| 피부관리 | 제목 "피부관리 코너" + 설명 본문 + "📱 모바일로 더 보기 / https://kpa-society.co.kr" + **"표시할 상품이 없습니다."** | tablet-skin-basic.png |
| 구강관리 | 제목 "구강관리 코너" + 설명 + QR 가이드 + **"표시할 상품이 없습니다."** | tablet-oral-basic.png |

- 두 코너 모두 `corner_information_basic_v1` 레이아웃(상단 코너 설명 헤더 + QR 가이드 바 + 상품 영역)으로 정상 표시.
- **product_list 0건 → 크래시 없이 "표시할 상품이 없습니다." 안내** (완료 기준 충족).

### network (viewer 로드 시)

```
GET /tablet/screen?tabletId=…    → 200
GET /tablet/idle?tabletId=…      → 200
GET /tablet/products?…tabletId=… → 200
GET /tablet/settings             → 200
```

- 뷰어가 실제로 `/tablet/screen`을 소비함(KIOSK-CORE-SCREEN-CONSUMER 경로) 확인.

### console / network error

```
관측된 error: GET /api/v1/auth/me → 401, POST /api/v1/auth/refresh → 401,
             "Authentication failed. Tokens cleared.", "Auth check failed: AxiosError"
```

- **전부 auth-bootstrap 노이즈** — 비로그인 공개 viewer 가 앱 로드시 인증 상태를 확인하다 실패한 배경 호출. **태블릿 화면 렌더·screen/idle/products 경로와 무관** (해당 4개 tablet 엔드포인트는 전부 200). 태블릿 런타임 기능성 error = **0**.
- (참고) 공개 kiosk 진입 시 auth check 자체를 건너뛰면 이 노이즈를 없앨 수 있음 — V1 이후 개선 후보(운영성 무관).

---

## 4. templateKey 확인

| 코너 | DB template_key | /screen templateKey | viewer 레이아웃 |
|------|-----------------|---------------------|-----------------|
| 구강관리 | NULL | `corner_information_basic_v1`(default resolve) | 기본 |
| 피부관리 | `corner_information_basic_v1` | `corner_information_basic_v1` | 기본 |

- `resolveTemplateKey`(store-public-tablet-screen.ts): template_key NULL → 기본 `corner_information_basic_v1` 로 정상 resolve 확인.

---

## 5. product_focus 전환 smoke — **Deferred**

- WO §4 흐름은 **관리 UI(TabletScreenSetManager)에서 template_key 변경 → 저장**을 전제. 관리 화면(`/store/commerce/tablet-displays`)이 **`/login` 리다이렉트(미인증)**.
- 정책 (b)/#2/#5: 로그인 화면 → **중단·자동 로그인/체험계정 클릭 안 함**. raw DB write 로 template_key 변경도 **운영 샘플 무단 write 금지** 원칙상 미수행.
- 따라서 `product_focus` 전환·원복 smoke **Deferred**. **변경을 하지 않았으므로 원복 불필요, 피부관리 최종 상태 = 원본 `corner_information_basic_v1` 유지.**
- (코드 관측) `resolveTemplateKey` 는 임의 template_key 문자열을 그대로 반환하므로, template_key='product_focus' 설정 시 `/screen` 은 `templateKey:'product_focus'` 를 반환하게 됨. 다만 **실제 product_focus 레이아웃 구현/viewer 대응 여부는 이번 read-only 범위에서 미검증**(전환 자체가 Deferred). 후속 인증 세션에서 확인 필요.

---

## 6. dirty guard / 저장·적용·해제 문구 — **Deferred (UI 검증)**

- 관리 UI 미인증으로 in-memory 수정·배지·경고 배너·전환 confirm 을 화면에서 검증 불가 → **Deferred**.
- (코드 관측, UI 미검증) 관리 API/컴포넌트는 존재: `services/web-kpa-society/src/api/tabletDisplays.ts` 의
  `updateScreenSet`(name/status/templateKey) · `saveScreenSetBlocks` · `applyCurrentScreenSet`(POST `/tablets/:id/current-screen-set`) · `clearCurrentScreenSet`(DELETE) · `STATUS_LABEL`(draft 초안 / active 활성 / archived 보관 / operator_template 운영자 템플릿). "저장=세트 내용 / 적용=현재 공개 화면 / 해제=기본 복귀" 의미의 write API 가 코드상 분리되어 있음. **실제 문구·guard 동작은 인증 세션 필요**.

---

## 7. 검증 항목 대비표

| 항목 | 결과 |
|------|------|
| 구강관리 /screen·/idle·/products | ✅ 200 |
| 구강관리 viewer | ✅ 정상 |
| 피부관리 /screen·/idle·/products | ✅ 200 |
| 피부관리 viewer | ✅ 정상 |
| block 4종(idle_media/corner_description/product_list/qr_guide) | ✅ 양 코너 전부 |
| templateKey 확인 | ✅ corner_information_basic_v1 |
| product_list 0건 무크래시 | ✅ "표시할 상품이 없습니다." |
| console/network error(태블릿) | ✅ 0 (auth 401 노이즈만, 무관) |
| product_focus 전환/원복 | ⏸ Deferred (관리 UI 미인증) |
| dirty guard | ⏸ Deferred (관리 UI 미인증) |
| 저장/적용/해제 문구 UI | ⏸ Deferred (관리 UI 미인증) |
| 운영 샘플 보존 | ✅ 삭제·수정 0 |
| 최종 상태 원복 | ✅ 무변경(원본 유지) |

---

## 8. 최종 상태

```
DB write 0
운영 샘플 2개(구강관리/피부관리) 무변경
피부관리 template_key = corner_information_basic_v1 (원본)
구강관리 template_key = NULL (원본)
current_screen_set / blocks / is_visible 전부 원본
```

---

## 9. V1 완료 가능 여부

**가능 (런타임 운영성 기준).**

- 핵심 운영 흐름 **screen_set 적용 → public `/screen` → 공개 viewer 표시**가 두 운영 샘플에서 실제로 닫힘.
- 4 block 렌더, product 0건 graceful, template resolve, idle/products/settings 연동 모두 정상.
- 미검증 항목(product_focus 전환, dirty guard, 문구)은 **관리 editor UX 확인**으로, 인증 세션에서 별도 수행 가능하며 **런타임 종료 판단을 막지 않는다.**

→ **V1 런타임 close 권장.** 단, 관리 UI editor smoke 는 인증 세션에서 후속 확인(아래 후보 참조).

---

## 10. Deferred 항목 (인증 세션 필요)

```
1. product_focus 전환 → /screen·viewer 확인 → corner_information_basic_v1 원복
2. dirty guard (in-memory 수정 시 배지/경고/전환 confirm)
3. 저장/적용/해제/템플릿/블록 문구 UI 의미 검증
```

- 방법: 관리 화면 `/store/commerce/tablet-displays` 에 **경영자 계정 로그인 후**(체험용 약국 경영자 계정 버튼 존재) 수행. 자동 로그인/토큰 저장은 정책상 금지 → 사용자 세션 또는 명시 승인 하에 진행.

---

## 11. V1 이후 후속 후보

```
WO-O4O-KPA-TABLET-CORNER-SWITCH-GUARD-V1
WO-O4O-KPA-TABLET-SCREEN-SET-PREVIEW-PANEL-V1
WO-O4O-KPA-TABLET-TEMPLATE-IDLE-VIDEO-FIRST-V1
WO-O4O-KPA-TABLET-TEMPLATE-COMPARISON-V1
WO-O4O-KPA-TABLET-CORNER-SET-LIBRARY-V1
(+ 관리 editor smoke 인증 세션 수행 — 위 §10)
(+ 공개 kiosk 진입 시 auth check skip 으로 콘솔 401 노이즈 제거 — 운영성 무관 개선)
```

---

*태블릿 V1 최종 운영 smoke · 두 운영 샘플(구강/피부) public /screen·/idle·/products 전부 200 · viewer 정상(4 block, product 0건 graceful) · templateKey=corner_information_basic_v1 · 콘솔 error=auth 401 노이즈만(태블릿 무관) · product_focus/dirty guard/문구=Deferred(관리 UI 미인증) · DB write 0 · 샘플 보존 · V1 런타임 close 가능.*
