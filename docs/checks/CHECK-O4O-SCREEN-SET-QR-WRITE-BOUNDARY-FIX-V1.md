# CHECK-O4O-SCREEN-SET-QR-WRITE-BOUNDARY-FIX-V1

> WO: `WO-O4O-SCREEN-SET-QR-WRITE-BOUNDARY-FIX-V1`
> 목표: 공개 Screen Set resolver 의 QR 생성 DB write 를 제거하고, Screen Set **저장 경로**에서 QR 생성을 확실히 보장한다.
> 신규 테이블·migration·신규 엔드포인트 **없음** → §중지 조건 미해당.

---

## 1. 문제 (직전 WO 의 결함)

`store-public-screen-set-resolve.ts` 가 공개 조회 중 `ensureScreenSetQr()` 를 호출 → **공개 GET 이 DB write 를 유발**했다.

- 공개 조회가 읽기 전용이 아님 / 최초 방문자가 QR 생성을 유발 / 동시 요청 시 생성 경쟁
- QR 생성 실패가 **저장 시점이 아니라 소비자 접근 시점**에 발견됨 → "저장 완료 시 QR 까지 준비" 미충족
- 저장 응답의 `qrLink:'failed'` 는 **부분 성공 안내**였다(요구 위반).

---

## 2. 변경 내용

### 2-1. 공개 resolver = read-only

`apps/api-server/src/routes/platform/store-public/store-public-screen-set-resolve.ts`

- `ensureScreenSetQr()` 호출 **제거**. import 도 `buildScreenSetQrUrl` 만 남김.
- 동작: `store_tablet_screen_sets.public_qr_slug` 조회 → 있으면 `buildScreenSetQrUrl()` 로 URL, 없으면 `null`.
- 반환 계약 불변: `set.publicQrSlug` / `set.publicQrUrl` / `set.qrStatus('ready'|'unavailable')`.
- `qr_guide` 블록도 동일한 도출값(`qrUrl`) 사용 — 없으면 `url=''`(임의 URL 미사용).
- 파일 내 `INSERT/UPDATE/DELETE` **0건**(grep 확인). 공개 태블릿 runtime 과 `/qr/{slug}` 랜딩 모두 이 경로를 공유하므로 두 공개 경로 모두 write 0.

### 2-2. `ensureScreenSetQr` 를 트랜잭션 안에서 호출 가능하게

`apps/api-server/src/routes/platform/store-screen-set-qr.service.ts`

- 시그니처: `(dataSource: DataSource, …)` → `(executor: QueryExecutor, …)`.
  `QueryExecutor` 는 이 파일이 이미 `setScreenSetQrActive` 용으로 갖고 있던 타입(= `EntityManager` 호환).
- 내부 로직·게이트(`origin='store' AND deleted_at IS NULL AND status <> 'archived'`)·멱등성·slug 생명주기 **불변**.

### 2-3. 저장 경로에서 QR 보장 + 응답 전 확인

`apps/api-server/src/routes/platform/store-tablet.routes.ts`

- `withQrLink(executor, …)` 는 이제 실패 시 **`ScreenSetQrFailure`(code `SCREEN_SET_QR_FAILED`) 를 throw** 한다(과거: `qrLink:'failed'` 병합).
- 모든 저장 경로가 **자기 트랜잭션의 EntityManager** 로 `withQrLink` 를 호출 → **QR 실패 = 저장 롤백**. 부분 성공 상태가 존재할 수 없다.
- 공통 실패 응답 `respondQrFailure(res)` → **503 `SCREEN_SET_QR_FAILED`**.

| 저장 경로 | 처리 |
|-----------|------|
| `POST /screen-sets` (생성) | INSERT 를 트랜잭션으로 감싸고 그 안에서 `withQrLink` → 성공 시에만 201 |
| `PATCH /screen-sets/:id` (수정) | 기존 트랜잭션 내 `setScreenSetQrActive` 뒤 `withQrLink` |
| `PUT /screen-sets/:id/blocks` (저장) | 기존 트랜잭션 내 블록 저장 뒤 `withQrLink` → 응답에 QR 필드 additive 병합 |
| `POST /screen-set-hub/templates/:id/import` (운영자 복사) | 사본 트랜잭션 내 `withQrLink` |
| `POST /screen-set-hub/supplier-templates/:id/import` (공급자 복사) | 사본 트랜잭션 내 `withQrLink` |

- 게이트 미해당(운영자·공급자 **원본**, 보관 세트)은 실패가 아니다 → `publicQrUrl=null` 로 정상 응답(오탐 오류 없음).
- `GET /screen-sets/:id` 의 과거 누락 보정(lazy backfill)은 `withQrLinkBestEffort()` 로 분리 — **조회는 QR 실패로 막지 않는다**(WO §권장 수정의 "QR 없는 기존 세트 관리자 보정" 경로, 소유자 인증 하).

### 2-4. 프론트 — 부분 성공 안내 제거

`packages/tablet-screen-set-editor/src/index.tsx`
- `ScreenSet.qrLink?: 'failed'` 필드 및 `qrFailed` 분기 **삭제**.
- 저장 성공 = QR 준비 완료 → 기존 성공 토스트만.
- catch 에서 `e.code === 'SCREEN_SET_QR_FAILED'` → **"QR 준비에 실패해 저장이 취소되었습니다. 잠시 후 다시 저장해 주세요."**
  (`tabletDisplays.ts` 의 `request()` 가 `error.code` 를 보존하므로 코드 매칭 가능.)

`services/web-kpa-society/src/api/tabletDisplays.ts` — `ScreenSet` 에서 `qrLink` 제거(주석도 새 계약으로 갱신).

**대기·메인 QR UI 는 변경 없음**(직전 WO 산출물 그대로).

---

## 3. DB · API 변경 여부

- **DB**: 테이블/컬럼/migration **0**. `store_qr_codes` row 생성 규칙(멱등·set 당 1개 partial unique)·slug 생명주기 불변.
- **API**: 신규 엔드포인트 **0**. 변경점은 저장 실패 시 **503 `SCREEN_SET_QR_FAILED`** 추가 1건 + 응답에서 `qrLink` 제거.
- archive → QR 비활성(공개 410 `SCREEN_SET_INACTIVE`), restore → **동일 slug** 재활성 — 기존 로직 미변경.

---

## 4. 검증

| §검증 항목 | 결과 |
|------|------|
| 공개 GET 요청 시 DB write 0 | ✅ resolver 에서 `ensureScreenSetQr` 제거 + 파일 내 `INSERT/UPDATE/DELETE` 0건(정적 확인) |
| 신규 Screen Set 저장 직후 QR 존재 | ✅ 생성 트랜잭션 내부 `withQrLink` — QR 없으면 201 자체가 반환되지 않음 |
| 재저장 시 중복 QR 생성 0 | ✅ `ensureScreenSetQr` 멱등(기존 row 재사용) — 로직 무변경 |
| 동시 저장 시 1 QR per set | ✅ partial unique + unique 위반 catch 후 재조회(기존) + 저장 트랜잭션 경계 |
| 공개 태블릿·QR 랜딩 정상 | ✅ 계약 필드 동일(정적). ⏸ 실 브라우저 스모크는 배포 후 §5 |
| archive 410 · restore 동일 slug | ✅ `setScreenSetQrActive` 경로 미변경 |
| typecheck | ✅ `apps/api-server` — `src/scripts/*`(타 세션 작업, build tsconfig 제외) 외 **0 error** (총 19건 전부 scripts) |
| | ✅ `services/web-kpa-society` **0 error** / `services/web-neture` **0 error** |
| 공유 패키지(`tablet-screen-set-editor`) | ✅ source-only — 소비 앱 typecheck 로 검증(자체 typecheck 스크립트 없음) |
| API smoke | ⏸ 미실시(배포 전) |

---

## 5. 후속 · 실 스모크 필요 항목

1. 신규 Screen Set 저장 → 즉시 목록 `QR 보기·출력` 에 QR 노출(저장 시점에 준비 완료).
2. 공개 태블릿 화면 최초 접속(해당 세트 QR 이 이미 있는 상태) → 응답 정상, `store_qr_codes` row 수 불변.
3. 운영자·공급자 HUB 가져오기 → 사본에 QR 즉시 부여.
4. archive 후 `/qr/{slug}` 410 → restore 후 동일 slug 재활성.
5. (이전 WO 잔여) 제작기 미리보기 선택 상품 미표시 · TABLET 노출 게이트 제외 상품 안내 문구.
