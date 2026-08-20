# CHECK-O4O-NOTIFICATION-TARGET-LEGACY-ROW-REMEDIATION-AND-FINAL-CLOSURE-V1

> WO: `docs/work-orders/WO-O4O-NOTIFICATION-TARGET-LEGACY-ROW-REMEDIATION-AND-FINAL-CLOSURE-V1.md` (`d8bc794ff`)
> 판정: **PASS · MUST_FIX_BEFORE_CLOSE = 0**
> 작성일: 2026-08-20

---

## 1. 기준 commit / deployed revision

| 항목 | 값 |
|---|---|
| 착수 시점 origin/main | `31ec7bcd5` → 실행 중 `974daf451` 로 rebase |
| 본 WO 구현 commit | **`83b08f057`** (`fix(notification): MF-2 dead-route producer 제거 + 선행 WO §10 오기 정정 주석`) |
| CHECK commit | (본 문서 커밋) |
| 배포 워크플로 | `Deploy API Server (Cloud Run)` — `83b08f057` 기준 |
| 배포 revision | **`o4o-core-api-03396-clt`** (2026-08-20T04:17:26Z · traffic 100%) |

> **CI 정합 고지 (숨기지 않음)**: `83b08f057` 의 `CI Pipeline` 워크플로는 직후 다른 세션의 push(`0b7a01ec3`)로
> **concurrency 취소(`cancelled`)** 되었다. 같은 커밋의 `CodeQL Security Analysis` 는 `success`.
> 따라서 본 WO 의 정적 검증 근거는 **로컬 `tsc --noEmit`**(§18) 이며, CI 전체 통과 기록이 아니다.

---

## 2. 선행 §10 typo 정정

- 대상: `docs/work-orders/WO-O4O-CROSSSERVICE-NOTIFICATION-TARGET-ROUTE-CONTRACT-AUDIT-AND-CLOSURE-V1.md` §10 마지막 줄
  (`FOLLOWUP / BLOCKED 로 남기고 억지로 route를 만든다.`)
- 조치: 원문(`c9d80d2aa`)은 이미 push 되어 **history 재작성 없이** 해당 줄 아래에 정정 주석 블록을 추가했다.
  정본은 `…억지로 route를 만들지 않는다.`
- 부기 B 안의 두 번째 등장(825행)은 **원문 인용**이므로 손대지 않았다.
- 실행 영향: 선행 audit 은 이미 "만들지 않는다" 독법으로 수행됐으므로 결과 영향 0.

---

## 3. production legacy row census (실행 시점 재산출)

과거 숫자(7건)는 재사용하지 않고 2026-08-20 실측으로 재산출했다.

| 항목 | 값 |
|---|---|
| `notifications` 전체 | **101** |
| `metadata.targetUrl` 보유 | 60 |
| `metadata.deepLink` 보유 | 13 |
| `metadata.linkUrl` 보유 | **0** |
| `serviceKey IS NULL` | 22 |

> **선행 문서 사실 정정 ①**: 부기 E 는 `notifications.metadata` 를 "JSON 문자열 컬럼" 이라 적었으나
> 실제 타입은 **`jsonb`** 다(`\d notifications` 실측). 본 WO 의 UPDATE 는 `jsonb_set` / `-` 연산자를 사용했다.

---

## 4. row classification

| 그룹 | 건수 | 기존 target | 판정 | 조치 |
|---|---:|---|---|---|
| L1 GlycoPharm `contact.new` | 9 | `/admin/contact-inquiries` | A · ROLE_MISMATCH (admin 전용 경로, 수신자에 operator 포함) | → `/operator/contacts` |
| L2 K-Cosmetics `contact.new` | 2 | `/admin/contact-inquiries` | A · ROLE_MISMATCH | → `/operator/contacts` |
| L3 Neture `store.product_request_submitted` | 2 | `/admin/o4o-product-db/store-requests` | A · DEAD_ROUTE (선행 audit B-1 에서 404 실증) | → `/operator/product-candidates` |
| L4 Neture `store.product_request_{approved,rejected}` | 2 | `/store/handled-products` | B · 정보성 (web-neture 라우트 트리에 없음. 현행 producer 는 neture scope 에 target 미기록) | `targetUrl` 제거 |
| L5 KPA `store.consultation_requested` | 4 | `/store/requests` | **VALID** | 변경 없음 |
| **C(행동 필요+destination 없음)** | **0** | — | — | — |
| **D(의미 불명확)** | **0** | — | — | — |

**UPDATE 대상에서 의도적으로 제외한 row (근거 명시)**

- `deepLink` 전용 market-trial 13건 — `targetUrl` 자체가 없어 resolver 가 `null` 을 돌려주므로 **이동 없음(안전)**.
  MISSING_TARGET 이지 dead target 이 아니다. 더구나 참조된 `market_trials` 4건 중 **현존 1건**뿐이라
  `targetUrl` 을 새로 채우면 오히려 **새 dead link 를 만든다**(§15 정당화 하 잔존 허용).
- target 필드가 아예 없는 `contact.new` 6건(GP 3 · KCos 1 · KPA 2) — target 신규 부여는 dead target 교정이 아니라 범위 확장.
- `serviceKey NULL` legacy `custom` 1건 — target 없음, 5개 벨 어디에도 노출되지 않음.

---

## 5. before snapshot

- 15개 row **ID 열거** 기반 SELECT → `matched = 15` 확인.
- 스냅샷 2종 저장: (a) `id, serviceKey, type, targetUrl, isRead, updatedAt` (b) row별 `metadata` 전체 JSON.
- 대조군 지문: **UPDATE 대상 외 86 row** 의 `md5` 집계 = `4d3728570cb88406a0aced9e2d9482a4`.

---

## 6. UPDATE predicate

넓은 문자열 조건(`LIKE`) 단독 사용 없음. **ID 열거 + 기존 값 일치** 이중 가드.

```sql
UPDATE notifications SET metadata = jsonb_set(metadata,'{targetUrl}','"/operator/contacts"'::jsonb,false)
 WHERE id IN (<11개 ID>) AND metadata->>'targetUrl' = '/admin/contact-inquiries';

UPDATE notifications SET metadata = jsonb_set(metadata,'{targetUrl}','"/operator/product-candidates"'::jsonb,false)
 WHERE id IN (<2개 ID>) AND metadata->>'targetUrl' = '/admin/o4o-product-db/store-requests';

UPDATE notifications SET metadata = metadata - 'targetUrl'
 WHERE id IN (<2개 ID>) AND metadata->>'targetUrl' = '/store/handled-products';
```

---

## 7. affected row count

`BEGIN;` → `UPDATE 11` / `UPDATE 2` / `UPDATE 2` = **15** (예측치와 정확히 일치) → `COMMIT;`

---

## 8. after verification

- 재조회: 15건 모두 신규 값 반영.
- `isRead` · `updatedAt` **불변** (해당 테이블에 트리거 없음).
- 예상 외 변경 **0**: 대조군 86 row 지문 `4d3728570cb88406a0aced9e2d9482a4` **전후 동일**.
- 총 row 수 101 → 101 (INSERT/DELETE 0).

---

## 9. MF-2 producer

- 위치: `apps/api-server/src/controllers/market-trial/marketTrialOperatorController.ts`
  `dispatchConversionNotifications` (기존 1471–1528행).
- `metadata.linkUrl = /hub/products/{productId}` 를 기록하는 **저장소 내 유일한 producer**.
- **저장소 전역 호출부 = 0** (고아 함수).

## 10. MF-2 semantic analysis

- 전환(Trial → Product) 기능 자체가 `WO-O4O-MARKET-TRIAL-CONVERSION-COLUMNS-DROP-V1`(`7b7b0d1fa`) 에서
  content-only 모델로 은퇴하며 route·핸들러·컬럼이 제거됐고, 이 함수만 남았다.
  (`market-trial-operator.routes.ts:116` 에 route 제거가 명시돼 있고, 컨트롤러에는 빈 섹션 헤더만 남아 있었다.)
- 프로덕션 실측(2026-08-20): `metadata LIKE '%/hub/%'` = **0**, `metadata ? 'linkUrl'` = **0**,
  `metadata ? 'trialId' AND ? 'productId'` = **0**. → **실 알림 row 0건.**
- 부기 C 재확인: 공통 resolver 는 `metadata.targetUrl` **하나만** 읽는다. `linkUrl` 은 애초에 이동을 발생시키지 못했다
  → 클릭 시 **404 가 아니라 무반응**. §11·§13 에서 이 차이를 구분해 기록한다.

## 11. MF-2 destination decision

- §13-A/B/C/D 는 "살아있는 알림" 을 전제한 분기다. 본 건은 **은퇴 기능의 dead producer** 이므로
  유효 destination 을 새로 정할 대상 자체가 없다(§13-C 의 BLOCKED 조건에 해당하지 않는다 — 행동을 요구하는 수신자가 0명).
- 따라서 **새 화면·route 를 만들지 않았다**(§13·§14 준수).
- `targetUrl` 을 임의로 채우지 않았다(유효 destination 미확정 상태에서 기록 금지).

## 12. producer correction

- `dispatchConversionNotifications` **삭제** + 삭제 근거 주석 블록 대체.
- **resolver 에 `linkUrl` fallback 을 추가하지 않았다** — producer 결함 은폐(§17 위반) 이므로 채택하지 않았다.
- `DataSource` · `Repository` · `MarketTrial` import 는 파일 내 타 사용처가 있어 미사용 import 발생 없음.
- **frontend 무변경** 목표 달성.

---

## 13. final target census (UPDATE 후 실측)

| serviceKey | targetUrl | 건수 | route 존재 |
|---|---|---:|:---:|
| glycopharm | `/operator/contacts` | 9 | ✅ |
| glycopharm | `/mypage` | 1 | ✅ |
| glycopharm | (없음) | 3 | — |
| k-cosmetics | `/operator/contacts` | 2 | ✅ |
| k-cosmetics | `/operator/members?tab=status-pending` | 2 | ✅ |
| k-cosmetics | (없음) | 1 | — |
| kpa-society | `/mypage` | 15 | ✅ |
| kpa-society | `/operator/members?tab=status-pending` | 16 | ✅ |
| kpa-society | `/store/requests` | 4 | ✅ |
| kpa-society | (없음) | 2 | — |
| neture | `/operator/contact-messages?status=new` | 4 | ✅ |
| neture | `/operator/product-candidates` | 2 | ✅ |
| neture | `/supplier/products` | 3 | ✅ |
| neture | (없음) | 15 | — |
| (null) | (없음) | 22 | — |

**dead target = 0 · wrong-service target = 0 · admin-only target = 0 · unknown target = 0.**

---

## 14. resolver regression

- `packages/account-ui/src/notifications/resolveTarget.ts` **무변경** (`git diff origin/main` = 0).
- 계약 유지: `metadata.targetUrl` 만 1순위, `options.fallback` 2순위, 내부 절대 경로만 통과
  (`//host` · `/\host` · 외부 URL · 상대 경로 차단).

> **선행 문서 사실 정정 ②**: 선행 audit CHECK
> (`CHECK-O4O-CROSSSERVICE-NOTIFICATION-TARGET-ROUTE-CONTRACT-AUDIT-AND-CLOSURE-V1.md` §12) 의
> "5개 서비스 헤더 중 `fallback` 을 주입하는 곳은 없다" 는 **사실과 다르다.**
> `services/web-kpa-society/src/lib/notificationRouting.ts` 가 `kpaFallback` 을 주입하며
> `KpaGlobalHeader.tsx:21` · `MobileBottomNav.tsx:26` 이 이를 소비한다.
> 다만 **현재 은폐 효과는 없다** — target 없는 KPA row 는 `contact.new` 라 fallback 조건(`store.*`)에 걸리지 않고,
> `store.consultation_requested` 4건은 명시 `targetUrl` 을 갖는다.

---

## 15. production browser (실측 · Playwright MCP)

| # | 서비스 | 계정 | 동작 | 결과 |
|---|---|---|---|---|
| B-1 | GlycoPharm | `sohae2100@…` | 벨 → 교정된 `contact.new` 클릭 | **`/operator/contacts` 도달**, 문의 4건 렌더, 404 없음, console error 0 |
| B-2 | K-Cosmetics | `sohae2100@…` | 벨 → 교정된 `contact.new` 클릭 | **`/operator/contacts` 도달**, 문의 3건 렌더, `대상 서비스: k-cosmetics` |
| B-3 | Neture | `sohae2100@…` | 벨 → 교정된 `store.product_request_submitted` 클릭 | **`/operator/product-candidates` 도달**, `상품 후보 검토` 렌더 (선행 M-1 404 해소) |
| B-4 | Neture | `renagang21@…` | target 제거 row 2건 클릭 | **이동 없음(무반응)** · URL 불변 · 읽음 처리만 동작 (7→6) |
| B-5 | Neture | `renagang21@…` | `deepLink` 전용 market-trial row 클릭 | **이동 없음(무반응)** — MISSING_TARGET 안전 확인 (6→5) |
| B-6 | KPA-Society | `renagang21@…` | 벨 → `store.consultation_requested` 클릭 | **`/store/requests` 도달**, `상담 요청` 화면 렌더 (route 생존 확인) |
| B-7 | Pharmacy-Hub | `sohae2100@…` | 벨 열기 | `알림이 없습니다.` 정상 렌더 (PH row 0건), error 0 |

**MF-2 브라우저 확인(§19) — 대체 증거로 수행**: 프로덕션에 해당 row 가 **0건**이라 클릭 샘플이 존재하지 않고,
검증 목적의 알림 INSERT 는 §7 금지다. 따라서 3단 증거 체인으로 대체했다:
(a) producer 페이로드 키 = `linkUrl` (b) resolver 는 `targetUrl` 만 소비 (c) `/hub/products/:id` 는 web-neture route 트리 부재.
→ **클릭해도 404 가 발생할 수 없고 이동 자체가 없었다.** 이 항목은 클릭 실측이 아님을 명시한다.

## 16. 5서비스 회귀

| 기준 | KPA | GP | KCos | Neture | PH |
|---|:--:|:--:|:--:|:--:|:--:|
| dead entry | 0 | 0 | 0 | 0 | 0 |
| JS exception | 0 | 0 | 0 | 0 | 0 |
| white screen | 0 | 0 | 0 | 0 | 0 |
| 예상 외 401/403 | 0 | 0 | 0 | 0 | 0 |
| 404 | 0 | 0 | 0 | 0 | 0 |
| 5xx | 0 | 0 | 0 | 0 | 0 |
| 잘못된 서비스 이동 | 0 | 0 | 0 | 0 | 0 |
| dead notification link | 0 | 0 | 0 | 0 | 0 |
| 외부 유출 | 0 | 0 | 0 | 0 | 0 |

> Neture 에서 관측된 console error 2건은 **로그인 전 익명 부트스트랩**(`/auth/me`, `/auth/refresh` 401) 이며
> 로그인 이후 신규 오류 0건이다. 기존 동작이지 본 WO 로 생긴 회귀가 아니다.

---

## 17. production write

- 대상 테이블: `notifications` **1개**, 대상 컬럼: `metadata` 의 `targetUrl` 키 **1개**.
- 영향 row: **15** (§6 승인 범위 내).
- INSERT/DELETE 0 · schema 변경 0 · 타 테이블 write 0 · 타 컬럼 write 0.
- §9 안전 절차 전 단계 수행(스냅샷 → 이중 가드 predicate → 트랜잭션 → 건수 확인 → COMMIT → 재조회 → 지문 대조).

## 18. typecheck / test / build

| 항목 | 결과 |
|---|---|
| `tsc --noEmit` (`apps/api-server`) | **0 error** |
| workspace 패키지 빌드 | `1 fails, 46 passes` |
| CI Pipeline (`83b08f057`) | **cancelled** (후속 push 로 concurrency 취소) |
| CodeQL (`83b08f057`) | success |

> **숨기지 않는 고지**: 유일한 빌드 실패는 `packages/financial-core` 의 `tsup: No input files` 이며,
> 이는 선행 CHECK §13 에 이미 기록된 **본 WO 무관 기존 실패**다. 별도 테스트 스위트는 실행하지 않았다.

## 19. backend / DB / schema

- backend 코드 변경: `marketTrialOperatorController.ts` **1파일**(고아 함수 삭제 + 주석).
- DB schema / migration / entity 변경: **0**.
- API contract · route · guard · role 변경: **0**.
- frontend 변경: **0**.

---

## 20. 잔존 followup (전부 blocker 아님)

| # | 내용 | 성격 |
|---|---|---|
| FU-1 | `deepLink` 전용 market-trial 13건 = MISSING_TARGET 잔존. `market_trials` 4건 중 1건만 현존 | 정보성 · 채우면 새 dead link |
| FU-2 | target 필드 없는 `contact.new` 6건 | 정보성 |
| FU-3 | `serviceKey NULL` legacy row 22건 (5개 벨 어디에도 미노출) | 선행 CHECK 기록 사항 |
| FU-4 | producer/route drift — `store-public-tablet.handler.ts:279` 는 `/store/commerce/tablet-displays` 를 기록하고 주석은 `/store/requests` 를 "legacy" 라 칭하나 **`/store/requests` 는 생존 route**(B-6 실증) | 문서·주석 정합, 별도 WO |
| FU-5 | 선행 audit CHECK §12 의 "fallback 주입처 없음" 오기(§14 정정 ②) | 기록물 정정은 별도 WO |
| FU-6 | 부기 E 의 metadata 타입 오기(`jsonb`) | 기록물 정정은 별도 WO |
| FU-7 | `packages/financial-core` 빌드 실패 | 본 트랙 무관 · 선행 기록 |

§26 이 blocker 아님으로 명시한 항목(adapter 5벌 · 조회 실패 삼킴 · ForumNotification 소비 0 · SSE 미소비 ·
KPA dead service key constant · Neture unread-count 중복 · message mojibake · `deriveServiceKey` 정비)은 그대로 유지한다.

---

## 21. MUST_FIX_BEFORE_CLOSE

| 기준 | 결과 |
|---|---:|
| legacy production dead target row | **0** |
| `/hub/products/{id}` dead route | **0** |
| actual notification 404 | **0** |
| wrong-service target | **0** |
| admin-only wrong target | **0** |
| role mismatch | **0** |
| unknown target | **0** |
| §8-C / §8-D 분류 row | **0** |

```text
MUST_FIX_BEFORE_CLOSE = 0
```

## 22. Notifications FINAL CLOSE 판정

§25 조건 전부 충족 → `docs/checks/CHECK-O4O-CROSS-SERVICE-MYPAGE-NOTIFICATIONS-COMMONIZATION-V1.md` 의

```text
MYPAGE NOTIFICATIONS TRACK = CLOSED_WITH_FOLLOWUPS
```

를

```text
MYPAGE NOTIFICATIONS TRACK = FINAL CLOSED
```

로 전환한다. 그 문서 §21 의 **M-1(Neture 알림 404)** 이 본 WO 로 해소됐음을 해당 위치에 기록한다.
선행 target audit CHECK 의 `PASS_WITH_MUST_FIX` 판정은 **덮어쓰지 않고**(부기 A) 참조 줄만 최소 추가한다.

## 23. CHECK / commit / push

```text
83b08f057  fix(notification): MF-2 dead-route producer 제거 + 선행 WO §10 오기 정정 주석
(본 CHECK 커밋)
```

- stage 는 전부 path-specific (`git add .` 사용 0). 다른 세션의 dirty·미추적 파일 미접촉.
- 배포: `Deploy API Server (Cloud Run)` — revision **`o4o-core-api-03396-clt`** (`success` · traffic 100%).

---

## 24. 문서 정합

- SUPERSEDED 표기 대상 없음.
- 링크 수정 없음.
- 별도 WO 제안: FU-4 · FU-5 · FU-6 (기록물·주석 정합).
