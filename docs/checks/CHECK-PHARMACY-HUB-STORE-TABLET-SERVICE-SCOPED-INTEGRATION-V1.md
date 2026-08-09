# CHECK — WO-PHARMACY-HUB-STORE-TABLET-SERVICE-SCOPED-INTEGRATION-V1

| 항목 | 값 |
|------|------|
| 작업요청서 | `WO-PHARMACY-HUB-STORE-TABLET-SERVICE-SCOPED-INTEGRATION-V1` |
| 배경 | `WO-PHARMACY-HUB-STORE-EXECUTION-ASSETS-V1`(W9) 에서 병행 세션 충돌로 `TABLET_DEFERRED` 한 축 |
| 작업 방식 | **worktree 격리** — `C:\tmp\o4o-ph-tablet` / `feat/pharmacy-hub-store-tablet-service-scoped` |
| 기준 커밋 | `8d6ef7141` (origin/main) |
| 구현 커밋 | `2775be09b` (통합) · `688d984c1` (Dockerfile) · `082fba1e3` (계약 정합) |
| 검증일 | 2026-08-09 |
| 결과 | **PASS** |

---

## 0. 착수 전 — 충돌 해소 확인

W9 에서 HOLD 한 사유가 사라졌는지 먼저 확인했다(추측하지 않고 실측).

| 확인 | 결과 |
|---|---|
| 전 worktree 에서 태블릿 축 dirty 여부 | `o4o-platform` · `o4o-auth-commonize` · `o4o-drug-commerce-block` · `o4o-qr-scan-fix` **전부 0건** |
| 해당 축 마지막 커밋 | `48faea93e` (08-08 23:41) — 그 세션의 마지막 작업 |
| 병행 세션 worktree | `o4o-kpa-qr-e2e` **제거됨** |
| 선행 WO 상태 | `CHECK-O4O-KPA-STORE-QR-SCREENSET-STATE-ALIGNMENT-V1` = **완료** (M-1 포함 전 범위 LIVE + 프로덕션 E2E 통과) |

→ 충돌 해소 확인 후 착수했다.

---

## 1. 접근 — 공통 라우터 재사용 (신규 모델 0)

`routes/platform/store-tablet.routes.ts`(2,325줄, 40여 엔드포인트)를 조사한 결과
**모든 라우트가 같은 seam 하나**(`withStoreAuth`)를 통과해 `organizationId` 만 주입받는다.

> 따라서 조직 해석기 한 곳만 갈아 끼우면 전 라우트가 서비스 스코프로 동작한다.
> QR·POP 처럼 service 를 추출할 필요가 없었다 — **라우트를 다시 쓰거나 로직을 복제하지 않았다.**

### 1-1. 신설 옵션 (전부 선택 — 미지정 시 기존 동작 그대로)

```ts
export interface StoreTabletRoutesOptions {
  resolveOrganizationId?: (req, res) => Promise<string | null>;  // null = 이미 응답 전송
  qrServiceKey?: string;                 // screen_set QR 공개 URL·service_key (기본 kpa)
  operatorTemplateServiceKey?: string;   // 매장 HUB 가 읽는 운영자 원본 (기본 kpa)
}
```

- `/api/v1/store` 마운트는 **인자 무변경** → KPA·GlycoPharm·K-Cosmetics 동작 불변
- 모듈 상수(`TABLET_QR_SERVICE_KEY` · `OPERATOR_TEMPLATE_SERVICE_KEY`)를 기본값으로 유지
- 주입 경로는 인증을 하지 않는다 — 호출 측 라우터가 이미 `requireAuth` + scope guard 를 걸었다

### 1-2. Pharmacy-Hub adapter

`controllers/pharmacy-hub/pharmacy-hub-store-org.seam.ts` 신설 —
`resolvePharmacyHubStoreOrganization()` 기반. 클라이언트 `organizationId` 미신뢰,
미연결 `409 STORE_NOT_CONNECTED` / 모호 `409 AMBIGUOUS_STORE_CONNECTION` 으로
다른 PH 컨트롤러와 코드·상태코드를 통일했다.

`qrServiceKey = operatorTemplateServiceKey = 'pharmacy-hub'` 주입 →
QR 은 `pharmacyhub.co.kr` 로 발급되고, 운영자 HUB 는 PH 원본이 없어 **정상적으로 빈 목록**이다
(다른 서비스 원본을 끌어오지 않는다 — POP HUB 와 같은 판단).

### 1-3. 범위 밖 write 명시 차단

`POST /store-owner/products/register-by-barcode` 는 PH 에서 `404 NOT_AVAILABLE_IN_PHARMACY_HUB`.
매장 제품 등록 SSOT 는 W7(`handled-products` · `local-products`)이며 **두 번째 write 경로를 만들지 않는다.**

---

## 2. 프론트 — 공유 편집기 주입 (KPA 화면 복사 0)

`@o4o/tablet-screen-set-editor` 의 `TabletContentStepBuilder` 는 이미 완전 주입형이었다
(`ScreenSetBuilderApi` 6개 메서드 + `fetchProductPool`/`onToast`/… props). **그대로 주입해서 쓴다.**

| 파일 | 역할 |
|---|---|
| `lib/api/pharmacyHubTablet.ts` | 태블릿 CRUD · 현재 세트 적용/해제 · `ScreenSetBuilderApi` PH 구현 · product pool |
| `pages/store-owner/TabletsPage.tsx` | 태블릿 목록·등록·이름수정·내리기 / 화면 세트 목록·제작·수정·보관 / 적용·해제 |

`tailwind.config.js` 의 `content` 에 공유 패키지 소스를 추가했다 — 누락 시 클래스가 생성되지 않는다.

---

## 3. 검증

### 3-1. 로컬

| 항목 | 결과 |
|---|---|
| `api-server` tsc --noEmit | ✅ clean |
| `pharmacy-hub-web` type-check + build | ✅ PASS |
| `web-kpa-society` / `web-glycopharm` / `web-k-cosmetics` typecheck | ✅ 전부 clean |

### 3-2. 배포

| 워크플로 | 커밋 | 결과 |
|---|---|---|
| Deploy API Server | `2775be09b` | ✅ success |
| Deploy Web Services | `2775be09b` | ❌ **failure** → §4 에서 복구 |
| Deploy Web Services | `688d984c1` | ✅ success |

### 3-3. 프로덕션 실측 — PH ([E2E_TEST] 매장 한정 · 실운영 태블릿 무접촉)

| 검증 | 결과 |
|---|---|
| 태블릿 목록 (신규 매장) | ✅ 200 |
| 태블릿 등록 | ✅ 201 |
| 화면 세트 목록·생성 (`origin='store'` 서버 강제) | ✅ 200 / 201 |
| **screen_set QR 도메인** | ✅ `https://pharmacyhub.co.kr/qr/…` — 서비스 키 주입 실증 |
| 화면 세트 상세 | ✅ 200 |
| 상품 풀 (편집기 주입 원천) | ✅ 200 · `supplierProducts` 계약 일치 |
| draft 세트 적용 시도 | ✅ **409 `SCREEN_SET_NOT_ACTIVE`** (문서화된 정상 동작) |
| `status='active'` 전환 → 적용 | ✅ 200 · `currentScreenSetId` 반영 |
| 적용 해제 (세트 보존) | ✅ 200 |
| 바코드 등록 차단 | ✅ 404 `NOT_AVAILABLE_IN_PHARMACY_HUB` |
| 미연결 계정 | ✅ 409 `STORE_NOT_CONNECTED` |

### 3-4. 기존 서비스 회귀 (read-only — 실운영 태블릿 변경 0)

| 항목 | 결과 |
|---|---|
| KPA 태블릿 목록 | ✅ 200 · **4대** |
| KPA 화면 세트 목록 | ✅ 200 · **12개** |
| **KPA screen_set QR 도메인** | ✅ `https://kpa-society.co.kr/qr/tablet-corner-14` — **PH 주입이 KPA 에 새지 않음** |

### 3-5. 테스트 자산 원상 복구

검증용 화면 세트 2개 보관(archived), 태블릿 2대 내림(soft delete).
`store_tablets` 는 물리 삭제 경로가 없어 비활성 row 로 남는다(기존 계약) — `[E2E_TEST]` 매장에만 존재한다.

---

## 4. 배포 실패 1건 — 원인·복구 (숨기지 않고 기록)

`2775be09b` 의 **Deploy Web Services 가 실패**했다.

```
ERR_PNPM_WORKSPACE_PKG_NOT_FOUND  In services/web-pharmacy-hub:
"@o4o/screen-content-core@workspace:*" is in the dependencies but no package
named "@o4o/screen-content-core" is present in the workspace
```

원인: PH `Dockerfile` 은 필요한 `packages/*/package.json` 만 **선별 COPY** 한다.
이번에 추가한 `tablet-screen-set-editor` · `screen-content-core` · `tablet-kiosk-core` 가
COPY 목록에 없어 워크스페이스에서 사라진 채 install 됐다.

복구(`688d984c1`): **package.json 블록과 source 블록 양쪽**에 3종 추가.
한쪽만 넣으면 설치 단계 또는 빌드 단계에서 실패한다. 세 패키지 모두 workspace 전이 의존이 없어
추가 COPY 는 불필요함을 확인했다.

> 영향: API 서버는 정상 배포됐고 웹만 **이전 빌드로 유지**됐다 — 사용자 영향 0.
> 교훈: 서비스에 워크스페이스 패키지를 추가하면 `package.json`·`tailwind content`·**`Dockerfile` 2블록**
> 세 곳을 함께 갱신해야 한다. 로컬 build 는 통과하므로 **CI 에서만 드러난다.**

---

## 5. 실측으로 드러난 프론트 가정 오류 3건 (`082fba1e3`)

로컬 typecheck·build 는 통과했지만 **실제 응답과 어긋난** 부분을 프로덕션 실측이 잡아냈다.
서버는 무변경이고 프론트만 고쳤다.

| # | 가정 | 실제 | 조치 |
|:--:|---|---|---|
| 1 | `isActive` (camel) | `is_active`·`created_at` 은 **snake_case**, `currentScreenSetId` 만 alias | 타입을 실제 응답에 맞추고 `isTabletActive()` 로 내린 태블릿 제외 |
| 2 | 아무 세트나 적용 가능 | `status='active'` 만 허용 (409) | 드롭다운에 **active 만** 노출, draft 는 "작성 중 — 제작을 마치면 적용" 안내 |
| 3 | `currentScreenSetName` 제공 | API 가 주지 않음 | 세트 목록에서 이름 조회해 표시 |

보관 확인 문구에 "태블릿 연결을 먼저 해제해야 한다"를 추가했다(서버 409 와 같은 제약).

---

## 6. W9 부채 ① 해소 여부 — **부분 해소**

W9 §8-① 은 `/api/v1/store/tablets` 의 조직 해석이 serviceKey 없이 열려 있다는 것이었다.

| 축 | 상태 |
|---|---|
| **Pharmacy-Hub** | ✅ **해소** — PH 는 enrollment 기준 해석기만 사용한다 |
| `/api/v1/store` 기본 마운트 | ⚠️ **미해소** — 여전히 `createRequireStoreOwner(dataSource)`(serviceKey 미지정) |

기본 마운트를 service-aware 로 바꾸는 것은 KPA·GlycoPharm·K-Cosmetics 3서비스의 조직 해석을
동시에 바꾸는 변경이라 이번 범위 밖이다. **seam 은 이미 열려 있으므로** 각 서비스가
자기 해석기를 주입하는 방식으로 후속 처리할 수 있다.
→ 후속 WO 권장: `WO-O4O-STORE-TABLET-DEFAULT-MOUNT-SERVICE-SCOPED-V1`

---

## 7. 변경 파일

```
신규:
  apps/api-server/src/controllers/pharmacy-hub/pharmacy-hub-store-org.seam.ts
  services/web-pharmacy-hub/src/lib/api/pharmacyHubTablet.ts
  services/web-pharmacy-hub/src/pages/store-owner/TabletsPage.tsx
  docs/checks/CHECK-PHARMACY-HUB-STORE-TABLET-SERVICE-SCOPED-INTEGRATION-V1.md

수정:
  apps/api-server/src/routes/platform/store-tablet.routes.ts    (seam 옵션 — 기본 동작 무변경)
  apps/api-server/src/routes/pharmacy-hub/pharmacy-hub.routes.ts (+마운트, 바코드 차단)
  packages/store-ui-core/src/config/storeMenuConfig.ts           (PH '매장 실행' 에 태블릿 추가)
  services/web-pharmacy-hub/{package.json, tailwind.config.js, Dockerfile, src/App.tsx}
```

DB schema · migration · 신규 태블릿 모델/테이블 · 공통 가드(`createRequireStoreOwner`) ·
실운영 태블릿 · 다른 서비스 조직 — **전부 무접촉.**

---

## 8. Pharmacy-Hub 매장 경영 기능 현황

| WO | 상태 |
|---|---|
| W1 프로비저닝 / W2 가드 / W3 셸·메뉴 / W4 홈 / W5 정보·계정 | CLOSED |
| W6 B2B 셸 감사 | COMPLETE |
| W7 취급·자체 상품 / W8 콘텐츠·자료함·블로그 | PASS |
| W9 실행 자산 (QR · POP · 사이니지 · 설명서) | PASS with TABLET_DEFERRED |
| **본 WO — 태블릿 · Screen Set** | **PASS** → W9 의 deferred 축 해소 |

'매장 실행' 메뉴 = QR · POP · 디지털 사이니지 · 상품 설명서 · **태블릿** (5개 축 완비).
