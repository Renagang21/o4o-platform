# CHECK — 알림 producer → consumer route 계약 전수감사

> **WO**: [`docs/work-orders/WO-O4O-CROSSSERVICE-NOTIFICATION-TARGET-ROUTE-CONTRACT-AUDIT-AND-CLOSURE-V1.md`](../work-orders/WO-O4O-CROSSSERVICE-NOTIFICATION-TARGET-ROUTE-CONTRACT-AUDIT-AND-CLOSURE-V1.md)
> **작성일**: 2026-08-20
> **판정**: `PASS_WITH_MUST_FIX` — **`MUST_FIX_BEFORE_CLOSE = 2` 이므로 Notifications 트랙 FINAL CLOSED 선언 없음**
>
> **[후속 참조 — 2026-08-20]** 본 문서의 판정(작성 시점 사실)은 그대로 둔다. 여기서 확정한 MUST_FIX 2건(MF-1 legacy row · MF-2 `/hub/products/{id}`)은
> `WO-O4O-NOTIFICATION-TARGET-LEGACY-ROW-REMEDIATION-AND-FINAL-CLOSURE-V1` 에서 해소되어 `MUST_FIX_BEFORE_CLOSE = 0` 이 됐다.
> 상세: [`CHECK-O4O-NOTIFICATION-TARGET-LEGACY-ROW-REMEDIATION-AND-FINAL-CLOSURE-V1`](CHECK-O4O-NOTIFICATION-TARGET-LEGACY-ROW-REMEDIATION-AND-FINAL-CLOSURE-V1.md)
> (본 문서 §12 의 "fallback 주입처 없음" 서술 정정도 그 CHECK §14 에 있다.)

---

## 1. 기준 commit / deployed revision

| 항목 | 값 |
|---|---|
| WO 기준 commit | `c9d80d2aa` |
| 착수 시 `origin/main` | `8318a5cfb` (다른 세션의 Forum Write Shell CHECK 커밋이 선행 반영됨) |
| 작업 브랜치 | `worktree-agent-a9c7c1b79e0389461` → `origin/main` 에 push |
| API 실 진입점 | `https://api.neture.co.kr` (Cloud Run `o4o-core-api`) |
| 프로덕션 payload 실측일 | 2026-08-20 (본 CHECK 작성 시점, read-only) |

---

## 2. Producer 모집단

### 2-1. 모집단 산출 방법 (WO §4 — 미조사 producer = 0)

부기 C 의 grep 목록을 출발점으로만 쓰고, 아래 4개 축으로 재교차하여 모집단을 확정했다.

| 교차 검색 | 결과 |
|---|---|
| `createNotification(` | 24 call site / 14 file (`NotificationService.ts` 정의부 제외) |
| `INSERT INTO notifications` | 2 call site / 2 file (raw SQL 우회 경로) |
| `new Notification` / `notify*` | 신규 producer 없음 — 전부 위 2축에 포함되거나 entity 생성/헬퍼 |
| `metadata:` + `targetUrl` | 알림 아닌 hit(핸드오프 SSO URL, QR 템플릿, degradation 파라미터)만 추가 검출 → 제외 |

**결론: producer call site = 26, producer 파일 = 16, 미조사 producer = 0.**

### 2-2. 제외 대상과 근거 (WO §4)

| 제외 | 근거 |
|---|---|
| `apps/api-server/src/entities/Notification.ts` | entity 정의 — 발화 지점 아님 |
| `packages/*/types`, `*.d.ts` | 타입 선언 — 발화 지점 아님 |
| `*.test.ts` / `*.spec.ts` | 테스트 fixture — 프로덕션 알림 아님 |
| `ForumNotification` 계열 | 별도 entity·별도 테이블. 통합은 WO §26 중지 조건 → 본 WO 범위 밖 (선행 followup) |

### 2-3. 쓰기 경로 SSOT

- canonical: `NotificationService.createNotification()` (TypeORM 저장 + `notificationEventHub` SSE emit)
- 우회 2건: `marketTrialOperatorController.ts:1521`, `offer-service-approval.service.ts:627` — raw `INSERT INTO notifications`
  → SSE emit 없음. `serviceKey` 컬럼 누락 위험이 구조적으로 존재 (실제 1건 누락 — §9 참조)

---

## 3. Target census

`metadata` 에 실린 목적지 키는 3종이며, **공통 resolver 는 `targetUrl` 만 읽는다.**

| metadata 키 | 사용 producer | resolver 인식 |
|---|---|---|
| `targetUrl` | 21 call site | ✅ |
| `deepLink` | `marketTrial.notification.ts` (13 메서드 공통 wrapper) | ❌ (본 WO 에서 `targetUrl` 병기로 교정) |
| `linkUrl` | `marketTrialOperatorController.ts` raw INSERT | ❌ (잔존 — §17) |
| (없음) | LMS ×3, KPA `contact.new` ×1 | — |

**distinct target 경로 = 18종.**

---

## 4. Consumer mapping

| consumer 앱 | 벨 mount | 필터 `serviceKey` | 근거 |
|---|---|---|---|
| `services/web-neture` | `NetureGlobalHeader.tsx:42` | `neture` | `NOTIFICATION_SERVICE_KEY` |
| `services/web-kpa-society` | `KpaGlobalHeader.tsx:58` | **`kpa-society`** (literal) | 로컬 `SERVICE_KEY='kpa'` 는 미사용 — backend 저장값과 정합 |
| `services/web-glycopharm` | `GlycoGlobalHeader.tsx:87` | `glycopharm` | literal |
| `services/web-k-cosmetics` | `KCosGlobalHeader.tsx:81` | `k-cosmetics` | literal |
| `services/web-pharmacy-hub` | `PharmacyHubGlobalHeader.tsx:79` | `pharmacy-hub` | `config/service.ts` |
| `apps/admin-dashboard` | `hooks/useNotifications.ts` | — | **`/api/v2/notifications` 미마운트 → dead consumer** (§9) |

**핵심 계약**: 5개 서비스 web 은 전부 `serviceKey` 필터를 건다. 따라서

- `serviceKey = NULL` 로 저장된 알림은 **5개 벨 전부에서 비노출**이다.
- 저장 시 canonical 화(`resolveCanonicalServiceKey`: `kpa`→`kpa-society`, `cosmetics`→`k-cosmetics`)를 거치지 않은 값은 문자열 정확 일치 실패로 비노출된다. `NotificationService`/`notifications.routes.ts` 어디에도 canonical 화가 없다 (정확 일치 비교).

---

## 5. Route tree 대조

| 앱 | catch-all | 결과 |
|---|---|---|
| `web-neture` | `App.tsx:1280` `path="*" → NotFoundPage` | 미존재 경로 = **실제 404 화면** |
| `web-kpa-society` | `App.tsx:1125` `path="*" → NotFoundPage` | 실제 404 |
| `web-kpa-society` `/admin/*` 하위 | `AdminRoutes.tsx` `path="*" → Navigate to kpa-dashboard` | **404 가 아니라 조용한 오이동** (WO §12 함정) |
| `web-glycopharm` / `web-k-cosmetics` | `NotFound` | 실제 404 |

Guard 축:
- `/admin` (GP): `ProtectedRoute allowedRoles=[glycopharm:admin, platform:super_admin]` — **operator 불가**
- `/admin` (KCos): `ProtectedRoute allowedRoles=['cosmetics:admin','platform:super_admin']` — **operator 불가**
- `/operator` (GP·KCos): `OperatorRoute` = `isOperatorOrAbove()` — operator + admin + super_admin **가능**

---

## 6. Target 판정 matrix (본 WO 핵심 산출물)

라벨: `VALID` / `WRONG_SERVICE` / `DEAD_ROUTE` / `ADMIN_ONLY` / `ROLE_MISMATCH` / `MISSING_TARGET` / `LEGACY_ROUTE` / `EXTERNAL_VALID` / `UNKNOWN`

| # | Producer (file:line) | event type | 수신자 계약 | 저장 `serviceKey` | target | 소비 앱 route | 접근 guard | 판정 |
|---|---|---|---|---|---|---|---|---|
| P1 | `auth-register.controller.ts:302` | `member.registration_pending` | `cosmetics:operator|admin` | `k-cosmetics` | `/operator/members?tab=status-pending` | KCos `App.tsx:743` ✅ | OperatorRoute ✅ | **VALID** |
| P2 | `auth-register.controller.ts:338` | `member.registration_pending` | `glycopharm:operator|admin` | `glycopharm` | `/operator/members?tab=status-pending` | GP `App.tsx:877` ✅ | OperatorRoute ✅ | **VALID** |
| P3 | `auth-register.controller.ts:375` | `member.registration_pending` | `neture:operator|admin` | `neture` | `/operator/applications` | Neture `App.tsx:1189` ✅ | operator ✅ | **VALID** |
| P4 | `auth-register.controller.ts:591` | `member.registration_pending` | `kpa:operator|admin` | `kpa-society` | `/operator/members?tab=status-pending` | KPA `OperatorRoutes.tsx:156` ✅ | operator ✅ | **VALID** |
| P5 | `auth-register.controller.ts:628` | `member.registration_pending` | `cosmetics:operator|admin` | `k-cosmetics` | `/operator/members?tab=status-pending` | ✅ | ✅ | **VALID** |
| P6 | `auth-register.controller.ts:664` | `member.registration_pending` | `glycopharm:operator|admin` | `glycopharm` | `/operator/members?tab=status-pending` | ✅ | ✅ | **VALID** |
| P7 | `auth-register.controller.ts:701` | `member.registration_pending` | `neture:operator|admin` | `neture` | `/operator/applications` | ✅ | ✅ | **VALID** |
| P8 | `public-contact-inquiry.controller.ts:187` | `contact.new` | `{glycopharm|cosmetics}:operator` **+** `:admin` | `glycopharm` / `k-cosmetics` | ~~`/admin/contact-inquiries`~~ → **`/operator/contacts`** | GP `App.tsx:916` · KCos `App.tsx:769` ✅ | OperatorRoute ✅ | **ROLE_MISMATCH → 교정 → VALID** |
| P9 | `lms/CourseService.ts:403` | `lms.course_submitted` | 강사 본인 | **NULL** | 없음 | — | — | **MISSING_TARGET** (+ serviceKey NULL → 전 벨 비노출) |
| P10 | `lms/CourseService.ts:457` | `lms.course_approved` | 강사 본인 | **NULL** | 없음 | — | — | **MISSING_TARGET** |
| P11 | `lms/CourseService.ts:517` | `lms.course_rejected` | 강사 본인 | **NULL** | 없음 | — | — | **MISSING_TARGET** |
| P12 | `neture/controllers/contact.controller.ts:120` | `contact.new` | `neture:operator|admin` | `neture` | `/operator/contact-messages?status=new` | Neture `App.tsx:1223` ✅ | operator ✅ | **VALID** |
| P13 | `neture-settlement.service.ts:471` | `custom` (정산완료) | 공급자 본인 | `neture` | `/supplier/settlements` | Neture `App.tsx:867` ✅ | supplier ✅ | **VALID** |
| P14 | `partner-contract.service.ts:894` | 모집·신청 계열 | 신청자 본인 | 모집의 `serviceId` | `resolveRecruitmentApplicationTargetUrl()` | KPA `1029` · GP `1024` · KCos `825` · Neture `955` ✅ | ✅ | **VALID** (serviceKey 별 resolver 선례) |
| P15 | `store-product-request-notify.ts:46` | `store.product_request_submitted` | `{sk}:operator|admin` | canonical(sk) | ~~`/admin/o4o-product-db/store-requests`~~ → **neture: `/operator/product-candidates`, 그 외 미지정** | admin-dashboard 전용(**타 origin**) ❌ | — | **DEAD_ROUTE → 교정(M-1)** |
| P16 | `store-product-request-notify.ts:100` | `store.product_request_{approved,rejected,revision_requested}` | 제출자 본인 | canonical(sk) | `/store/handled-products` → **kpa 일 때만 지정** | KPA `App.tsx:987` ✅ / Neture ❌ | PharmacyOwnerOnlyGuard ✅ | **WRONG_SERVICE(neture 스코프일 때) → 교정** |
| P17 | `supplier.service.ts:162` | `custom` (공급자 승인) | 공급자 본인 | `neture` | `/supplier/dashboard` | Neture `App.tsx:847` ✅ | supplier(승인으로 부여) ✅ | **VALID** |
| P18 | `supplier.service.ts:213` | `custom` (승인 반려) | 신청자 본인 | `neture` | `/mypage/business-profile` | Neture `App.tsx:744` ✅ | 일반 로그인 ✅ | **VALID** (반려로 supplier role 소멸 → guard-safe 선택이 옳음) |
| P19 | `supplier.service.ts:411` | `custom` (비활성화) | 공급자 본인 | `neture` | `/mypage/business-profile` | ✅ | ✅ | **VALID** |
| P20 | `supplier.service.ts:496` | `custom` (재활성화) | 공급자 본인 | `neture` | `/supplier/dashboard` | ✅ | ✅ | **VALID** |
| P21 | `glycopharm-member.service.ts:199` | `member.registration_approved` | 회원 본인 | `glycopharm` | `/mypage` | GP `App.tsx:734` ✅ | 로그인 ✅ | **VALID** |
| P22 | `glycopharm-member.service.ts:287` | `member.registration_rejected` | 회원 본인 | `glycopharm` | `/mypage` | ✅ | ✅ | **VALID** |
| P23 | `kpa/contact-request.controller.ts:99` | `contact.new` | `kpa:operator|admin` | `kpa-society` | **없음** | KPA 에 문의관리 화면 자체가 없음 (`settings/contact` 는 설정 화면) | — | **MISSING_TARGET** (destination 부재 → §10 대로 route 신설 안 함) |
| P24 | `kpa-checkout.controller.ts:556` | `store.online_sales_order_created` | 매장 `organization_members(owner/admin/manager)` | `kpa-society` | `/store/online-sales/orders/{id}` | KPA `App.tsx:1068` ✅ | store guard ✅ | **VALID** |
| P25 | `kpa/member.controller.ts:872` | `member.registration_{approved,rejected}` | 신청자 본인 | `kpa-society` | `/mypage` | KPA `App.tsx:879` ✅ | MyPageGuard ✅ | **VALID** |
| P26 | `store-public-tablet.handler.ts:266` | `store.consultation_requested` | 매장 `organization_members` | `kpa-society` | `/store/commerce/tablet-displays` | KPA `App.tsx:1023` ✅ | store guard ✅ | **VALID** |
| P27 | `marketTrial.notification.ts:45` (13 메서드 공통) | `market_trial.*` | 공급자 / 참여자 | `neture` | `deepLink` → **`targetUrl` 병기 교정**. `/supplier/market-trial/{id}` · `/market-trial/{id}` | Neture `App.tsx:889` · `776` ✅ | supplier / public ✅ | **MISSING_TARGET → 교정 → VALID** |
| P28 | `marketTrialOperatorController.ts:1521` (raw INSERT) | `custom` (Trial→정식등록) | 참여자 | **NULL** | `linkUrl: /hub/products/{id}` | Neture 에 `/hub/products/:id` **없음** (`/hub` 만 `/workspace/hub` 로 redirect) | — | **DEAD_ROUTE** (잔존 — §17·§18) |
| P29 | `offer-service-approval.service.ts:627` (raw INSERT) | `custom` (상품 승인/반려) | 공급자 | `neture` | `/supplier/products` | Neture `App.tsx:848` ✅ | supplier ✅ | **VALID** |

> P 번호는 call-site 기준이며 §2 의 26 call site 를 `supplier.service.ts` 헬퍼 4 호출로 펼친 결과 29 행이다.

### 판정 분포 (교정 후)

```text
VALID           = 24
MISSING_TARGET  =  4   (LMS ×3, KPA contact.new ×1 — destination 자체 부재)
DEAD_ROUTE      =  1   (P28 /hub/products/{id})
WRONG_SERVICE   =  0
ADMIN_ONLY 오류 =  0
ROLE_MISMATCH   =  0
LEGACY_ROUTE    =  0
EXTERNAL_VALID  =  0
UNKNOWN         =  0
미조사 producer =  0
```

---

## 7. M-1 root cause

WO §1 이 지목한 결함 — Neture 알림 "신규 상품 등록 요청 접수" 클릭 시 404.

**프로덕션 실측(2026-08-20, read-only)으로 재현 확인:**

```text
GET /api/v1/notifications?serviceKey=neture
  → store.product_request_submitted | serviceKey=neture
    | metadata.targetUrl = /admin/o4o-product-db/store-requests   (2건)
```

인과 사슬:

1. 제출 route `POST /api/v1/store/product-requests` 는 `createRequireStoreOwner(dataSource, 'kpa')` 로 **KPA 매장 소유자 전용**이다 (컨트롤러 주석: "소비처는 services/web-kpa-society 뿐").
2. 그런데 같은 컨트롤러의 `deriveServiceKey(req)` 는 `MULTI_MEMBERSHIP_PRIORITY = ['neture','kpa-society','glycopharm','k-cosmetics']` 로 **neture 를 최우선**한다. Neture 멤버십을 겸한 KPA 매장주가 제출하면 `candidate.service_key = 'neture'` 가 된다.
3. 알림 producer 는 그 값을 **수신자 role prefix + notification.serviceKey 양쪽에 그대로 재사용**한다 → `serviceKey='neture'` 로 저장 → **web-neture 벨에 노출**.
4. target `/admin/o4o-product-db/store-requests` 는 **`apps/admin-dashboard` 에만** 존재한다 (`routes/o4o-product-db.routes.tsx:53`). admin-dashboard 는 `admin.neture.co.kr` 로 **다른 origin** 이며, 공통 resolver 는 내부 절대 경로만 통과시키므로 cross-origin 목적지를 표현할 수 없다.
5. web-neture catch-all(`App.tsx:1280`)이 `NotFoundPage` → **실제 404**.

즉 **ADMIN_ONLY 가 아니라 DEAD_ROUTE** 다. 수신자는 플랫폼 관리자가 아니라 서비스 operator/admin 이고, 그들이 쓰는 앱(서비스 web)에 그 경로가 아예 없다. WO §9 의 지시대로 목적지를 추측해 `/mypage/...` 로 바꾸지 않았다.

---

## 8. M-1 correction

**변경 파일 1개**: `apps/api-server/src/modules/neture/services/store-product-request-notify.ts`

`partner-contract.service.ts` 의 `resolveRecruitmentApplicationTargetUrl()` 선례와 동일하게 **serviceKey 별 target 매핑**으로 교정했다.

```ts
const ADMIN_TARGET_URL_BY_SERVICE = { neture: '/operator/product-candidates' };
const STORE_TARGET_URL_BY_SERVICE = { kpa: '/store/handled-products' };
```

- `neture` 스코프 검토 알림 → `/operator/product-candidates` (`web-neture App.tsx:1217` `ProductCandidateReviewPage`). 이 화면은 **동일 데이터**(`ProductCandidate`, `sourceType='store_web'` = 라벨 '매장')를 검토하는 기존 화면이다. 신규 route 신설 아님.
- `kpa` / `glycopharm` / `cosmetics` 스코프 검토 알림 → **`targetUrl` 미지정**. 서비스 web 에 검토 화면이 없고 유일한 콘솔이 타 origin 이므로, WO §10(부기 B 판독) 대로 **억지로 route 를 만들지 않고 이동 없음으로 남겼다**. 서비스측 검토 화면 신설은 WO §26 중지 조건 → FOLLOWUP.
- 제출자 결정 알림의 `/store/handled-products` 도 **`kpa` 일 때만** 지정. neture 스코프로 저장된 건이 web-neture 벨에서 404 를 만드는 경로를 차단했다.

`deriveServiceKey` 자체(= `candidate.service_key` 데이터 축)는 **건드리지 않았다.** 수신자 집합 변경은 데이터 의미 변경을 동반해 본 WO 범위를 넘는다 → §17 FOLLOWUP 으로 분리.

---

## 9. 기타 발견 결함

| # | 결함 | 상태 |
|---|---|---|
| D-1 | `public-contact-inquiry.controller.ts` — 수신자에 `{prefix}:operator` 를 포함하면서 target 은 admin 전용 `/admin/contact-inquiries` → operator 는 열 수 없음 (**ROLE_MISMATCH**). 문의 관리 canonical 화면은 GP·KCos 모두 `/operator/contacts` 로 이관 완료 상태였음 | **교정** (`/operator/contacts`) |
| D-2 | `marketTrial.notification.ts` — 목적지를 `metadata.deepLink` 로만 실어 공통 resolver 가 무시 (13개 이벤트 전부 이동 불가) | **교정** (`targetUrl` 병기, 경로 동일) |
| D-3 | `marketTrialOperatorController.ts:1521` raw INSERT — `serviceKey` 컬럼 누락(전 벨 비노출) + `linkUrl` 키(resolver 무시) + `/hub/products/{id}` 미존재 route | **미교정 · FOLLOWUP** (유효한 상품 상세 목적지가 web-neture 에 없음 → §10) |
| D-4 | `lms/CourseService.ts` ×3 — `serviceKey` 없음 + `targetUrl` 없음 → 5개 벨 전부 비노출 | **미교정 · FOLLOWUP** (LMS 의 serviceKey 도출 계약이 이 계층에 없음) |
| D-5 | `apps/admin-dashboard/src/hooks/useNotifications.ts` 가 `/api/v2/notifications` 호출 — **해당 라우터 미마운트**(`/api/v2` 는 `roles` 만) → admin-dashboard 벨은 dead consumer | **미교정 · FOLLOWUP** (WO 범위 밖 앱) |
| D-6 | `store-product-request-admin.controller.ts:30` `OPERATOR_ROLES` 가 `kpa-society:admin|operator` 사용 — `role_assignments` 실제 값은 role-prefix `kpa:*` → KPA 운영자 매칭 불가 | **미교정 · FOLLOWUP** (권한 계약 변경 = 중지 조건) |
| D-7 | `services/web-kpa-society/src/routes/AdminRoutes.tsx` catch-all 이 `Navigate to kpa-dashboard` → dead admin target 이 404 대신 **조용한 오이동**으로 은폐됨 (WO §12 함정 실재) | **미교정 · 보고** (route 정책 변경) |
| D-8 | `web-pharmacy-hub` 벨은 `serviceKey='pharmacy-hub'` 로 필터하지만 **해당 serviceKey 를 발화하는 producer 가 0개** → PH 벨은 구조적으로 항상 빈 상태 | **미교정 · FOLLOWUP** |

---

## 10. Role accessibility

| target | 수신자 역할 | 접근 가능 | 판정 |
|---|---|---|---|
| `/operator/members?tab=status-pending` | `{svc}:operator` + `{svc}:admin` | OperatorRoute = operator+admin+super_admin | ✅ |
| `/operator/applications` · `/operator/contact-messages` · `/operator/product-candidates` | `neture:operator|admin` | operator 영역 | ✅ |
| `/operator/contacts` (교정 후) | `{svc}:operator` + `{svc}:admin` | `OperatorRoute` = `isOperatorOrAbove()` | ✅ |
| `/admin/contact-inquiries` (교정 전) | `{svc}:operator` 포함 | `ProtectedRoute allowedRoles=[admin, super_admin]` | ❌ ROLE_MISMATCH |
| `/supplier/dashboard` · `/supplier/products` · `/supplier/settlements` | 공급자 본인 | supplier guard | ✅ |
| `/mypage/business-profile` (반려·비활성 시) | supplier role 소멸 사용자 | 일반 로그인 | ✅ (guard-safe 선택이 정당) |
| `/store/*` (KPA) | 매장 `organization_members` | store owner guard | ✅ |

**ROLE_MISMATCH 잔존 = 0.**

---

## 11. Cross-service contamination

- **실재 확인**: KPA 매장이 제출한 상품 등록 요청이 `serviceKey='neture'` 로 저장되어 **Neture 운영자 벨**에 뜬다 (프로덕션 2건 실측). 이것은 target 결함이자 수신자 결함이다.
- 본 WO 는 target 축만 교정했다(§8). 수신자 축(`deriveServiceKey` neture 우선순위)은 `candidate.service_key` 데이터 의미와 얽혀 있어 FOLLOWUP 으로 분리했다.
- 그 밖의 producer 는 전부 단일 serviceKey 로 고정되어 있어 cross-service 오염 없음.
- **WRONG_SERVICE 잔존 = 0** (교정 후 neture 스코프 target 은 web-neture 실재 route 로만 향한다).

---

## 12. Frontend resolver 검증 (WO §12)

- `packages/account-ui/src/notifications/resolveTarget.ts` 는 **변경하지 않았다.**
- 계약 재확인: 1순위 `metadata.targetUrl`, 2순위 `options.fallback`. `toInternalPath()` 가 비문자열·빈문자열·`/` 미시작·`//`·`/\` 를 차단한다 → **외부 절대 URL(타 origin admin-dashboard)은 구조적으로 표현 불가.**
- 5개 서비스 헤더 중 `fallback` 을 주입하는 곳은 **없다.** 따라서 resolver fallback 이 dead producer target 을 가려 PASS 로 보이게 만드는 일은 발생하지 않았고, 본 CHECK 의 판정은 전부 **producer 계약 기준**이다 (WO §12 준수).

---

## 13. Static / typecheck / build / test

| 항목 | 결과 |
|---|---|
| `pnpm install --frozen-lockfile` | ✅ (worktree 초기화, lockfile 변경 0) |
| `pnpm -r --filter "./packages/**" run build` | ✅ (단, `packages/financial-core` 는 `tsup: No input files` 로 실패 — **본 변경과 무관한 기존 상태**) |
| `apps/api-server` `tsc --noEmit` | ✅ **오류 0** |
| frontend build | 미수행 — 본 WO 변경은 backend 3파일뿐, frontend 무변경 |
| 단위 테스트 | 미수행 — 알림 target 계약 커버 테스트 부재 |

---

## 14. Production browser

**수행함** (2026-08-20, Playwright MCP, 프로덕션 도메인 직접 접속).

> 최초 2회 시도는 Chrome persistent profile(`.playwright-o4o-profile`) 점유로 기동 실패했고,
> 이후 재시도에서 정상 기동되어 실브라우저 검증을 수행했다. (실패 사실을 숨기지 않고 기록한다.)

| # | URL | 결과 | 의미 |
|---|---|---|---|
| B-1 | `https://neture.co.kr/admin/o4o-product-db/store-requests` | **404 화면 렌더** ("요청하신 페이지를 찾을 수 없습니다.", 경로 표기 동일) | M-1 DEAD_ROUTE **실증** |
| B-2 | `https://neture.co.kr/operator/product-candidates` | 404 아님 — 로그인 모달 + 홈 렌더 (guard 인터셉트) | 교정 후 target **실재 route 확인** |
| B-3 | `https://neture.co.kr/hub/products/{uuid}` | **404 화면 렌더** | D-3 DEAD_ROUTE **실증** |
| B-4 | `https://www.glycopharm.co.kr/admin/contact-inquiries` | 빈 화면(미인증 `ProtectedRoute` null 렌더) — 진입 불가 | 교정 전 target 접근 불가 확인 |
| B-5 | `https://www.glycopharm.co.kr/operator/contacts` | 404 아님 — 로그인 모달 + 홈 렌더 (guard 인터셉트) | 교정 후 target **실재 route 확인** |

벨 클릭 동선 자체는 재현하지 못했다 — 4개 서비스 전부 `unread-count = 0` 이고, 알림을 새로 만드는 것은
WO §19·§20 위반이므로 하지 않았다. 따라서 **payload → target → route** 3단을 아래 증거로 연결했다.

| 증거 | 내용 |
|---|---|
| ① API payload (프로덕션 실측, read-only) | `GET /api/v1/notifications` 4개 serviceKey 전수. neture 2건이 `targetUrl=/admin/o4o-product-db/store-requests` 보유 확인. GP/KCos 가 `/admin/contact-inquiries` 보유 확인. KPA `contact.new` 는 `targetUrl` 부재 확인 |
| ② route resolver | `resolveTarget.ts` 계약 + 5개 헤더 fallback 미주입 확인 (§12) → payload 의 `targetUrl` 이 그대로 이동 경로가 된다 |
| ③ 실브라우저 | 위 B-1~B-5 로 해당 경로들의 실제 도달 결과 확인 |

---

## 15. Production write

```text
production write = 0
```

- DB 직접 notification insert: **없음**
- 실사용자 알림 생성: **없음**
- 실사용자 상태 변경: **없음**
- admin 운영 데이터 변경: **없음**
- 수행한 프로덕션 접근은 로그인 + `GET /api/v1/notifications` + `GET /unread-count` (**read-only**) 뿐

---

## 16. Backend / DB / schema

```text
schema 변경 = 0
migration = 0
entity 변경 = 0
route 신설 = 0
guard 변경 = 0
```

변경은 `metadata.targetUrl` 값을 만드는 **application 로직 3파일**에 한정된다.

---

## 17. 잔존 followup

| # | 항목 | 사유 |
|---|---|---|
| F-1 | KPA/GP/KCos 스코프 상품 등록 요청 검토 화면 부재 → 해당 알림 `targetUrl` 미지정 | 새 frontend route 필요 = WO §26 중지 조건 |
| F-2 | `deriveServiceKey` neture 우선순위로 KPA 매장 요청이 Neture 운영자에게 broadcast | 수신자 계약 + `candidate.service_key` 데이터 의미 변경 |
| F-3 | 프로덕션 기존 notification row 의 dead `targetUrl` 잔존 (neture 2건, GP/KCos `/admin/contact-inquiries` 5건) | metadata UPDATE = production write → §20 승인 필요 |
| F-4 | D-3 marketTrial raw INSERT (serviceKey NULL · linkUrl · dead route) | 유효 목적지 부재 |
| F-5 | D-4 LMS ×3 serviceKey/target 부재 | LMS serviceKey 도출 계약 설계 필요 |
| F-6 | D-5 admin-dashboard `/api/v2/notifications` 미마운트 | 별도 앱 범위 |
| F-7 | D-6 `OPERATOR_ROLES` role-prefix 불일치 | 권한 계약 변경 = 중지 조건 |
| F-8 | D-7 KPA AdminRoutes catch-all 오이동 | route 정책 변경 |
| F-9 | D-8 PH 벨 producer 0 | 서비스 설계 판단 필요 |
| F-10 | 선행 트랙 followup 7건 (adapter 5벌 / 조회 실패 삼킴 / ForumNotification 소비 0 / SSE 미소비 / KPA dead service key / Neture unread-count 중복 / mojibake) | WO §24 — 본 WO 에 섞지 않음 |

---

## 18. MUST_FIX_BEFORE_CLOSE

```text
MUST_FIX_BEFORE_CLOSE = 2
```

| # | blocker | WO §23 항목 |
|---|---|---|
| MF-1 | **프로덕션 기존 알림 row 가 여전히 dead `targetUrl` 을 보유**한다. 코드는 교정됐으나 이미 저장된 metadata 는 그대로다. `serviceKey=neture` 의 `store.product_request_submitted` 2건은 지금 클릭하면 여전히 404 다 | "실제 notification click 404" |
| MF-2 | **P28 `/hub/products/{id}` DEAD_ROUTE 잔존.** web-neture 에 대응 route 가 없고 유효 대체 목적지도 없어 본 WO 에서 교정하지 않았다 | "알림 action destination dead" |

> MF-1·MF-2 는 §14 B-1 · B-3 으로 **실브라우저 404 실증**했다(추정 아님).
>
> MF-1 해소에는 `notifications.metadata` UPDATE(프로덕션 write)가, MF-2 해소에는 새 목적지 화면 판단이 필요하다. 둘 다 WO §20·§26 에 걸려 **본 WO 안에서 처리할 수 없다.**

---

## 19. Notifications FINAL CLOSE 판정

```text
MYPAGE NOTIFICATIONS TRACK = CLOSED_WITH_FOLLOWUPS   (유지)
```

WO §24·§25 는 FINAL CLOSED 정합화를 **§22·§23 완전 충족 시에만** 허용한다. §18 대로 `MUST_FIX_BEFORE_CLOSE = 2` 이므로
`docs/checks/CHECK-O4O-CROSS-SERVICE-MYPAGE-NOTIFICATIONS-COMMONIZATION-V1.md` 는 **수정하지 않고 `CLOSED_WITH_FOLLOWUPS` 그대로 두었다.**

---

## 20. CHECK / commit / push

| 항목 | 값 |
|---|---|
| 변경 파일 | `apps/api-server/src/modules/neture/services/store-product-request-notify.ts` · `apps/api-server/src/modules/contact-inquiry/public-contact-inquiry.controller.ts` · `apps/api-server/src/services/marketTrial.notification.ts` · 본 CHECK 문서 |
| stage 방식 | path-specific (`git add <paths>`) — `git add .` 미사용 |
| 타 세션 파일 | `packages/shared-space-ui/**`, `services/web-{glycopharm,k-cosmetics}/src/pages/forum/ForumWritePage.tsx` **미접촉** |
| 문서 정합 | 본 CHECK 신규 1건. 기준 문서 SUPERSEDED 표기 0 / 링크 수정 0 |

---

*Generated under WO-O4O-CROSSSERVICE-NOTIFICATION-TARGET-ROUTE-CONTRACT-AUDIT-AND-CLOSURE-V1*
