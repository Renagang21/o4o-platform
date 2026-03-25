# IR-O4O-MAIN-TS-BOOTSTRAP-SPLIT-POST-CHECK-V1

> **조사 전용** — 코드 수정 없음
> 기준 브랜치: `feature/main-ts-bootstrap-split`
> 기준 커밋: `cae7a3efa`

---

## 1. 전체 판정

| 항목 | 판정 |
|------|------|
| **bootstrap split 최종 상태** | **SAFE** — 구조 분해 성공 |
| **oversized 정비 1차 완료 여부** | **YES** — main.ts 1,621→254줄 축소 달성 |
| **push 가능 상태** | **YES** — 신규 오류 0건, 동작 변경 없음 |
| **발견된 이슈** | 모두 **pre-existing** (원본에서 이미 존재하던 문제) |

---

## 2. 파일별 상세 표

| 파일 | 줄 수 | 역할 | 판정 | 책임 혼합 | 비고 |
|------|------:|------|:----:|:---------:|------|
| `main.ts` | 254 | Bootstrap orchestrator | **SAFE** | 없음 | app 생성, setup 호출, listen, Redis 초기화 |
| `bootstrap/setup-middlewares.ts` | 255 | Middleware chain | **SAFE** | 없음 | 16개 middleware 정확한 순서 보존 |
| `bootstrap/register-routes.ts` | 955 | Route registry | **SAFE** | 없음 | 121 route mount + module loader, 순수 등록부 |
| `bootstrap/setup-shutdown.ts` | 63 | Graceful shutdown | **SAFE** | 없음 | signal/process handler 4종 |

---

## 3. 검증 결과 상세

### 3.1 Middleware 순서 검증

16개 middleware 등록을 원본과 1:1 대조. **모두 동일 순서 확인.**

| # | Middleware | 순서 유지 |
|---|-----------|:---------:|
| 1 | helmet | ✅ |
| 2 | compression | ✅ |
| 3 | cors | ✅ |
| 4 | /uploads static (3개) | ✅ |
| 5 | performanceMonitor | ✅ |
| 6 | securityMiddleware + sqlInjection | ✅ |
| 7 | tenantContextEnhanced | ✅ |
| 8 | cookieParser + json + urlencoded | ✅ |
| 9 | session | ✅ |
| 10 | passport.initialize | ✅ |
| 11 | httpMetrics | ✅ |
| 12 | slowThresholdMiddleware | ✅ |

유일한 변경: `setHeaders` callback 파라미터명 `path` → `filePath` (변수명만 변경, 동작 동일. shadowing 방지 개선)

### 3.2 Route 등록 순서 검증

121개 route mount를 원본과 대조. **모두 동일 순서 확인.**

Critical shadowing 경로 보존:
- `/api/signage/:serviceKey/public` → `/api/signage/:serviceKey` (public 선행 유지)
- `/api/v1/stores` (UnifiedPublic) → `/api/v1/stores` (StorePolicy) (순서 유지)
- `/api/v1/store` (LocalProduct) → `/api/v1/store` (Tablet) (순서 유지)

### 3.3 Shutdown handler 검증

4개 process handler: SIGTERM, SIGINT, uncaughtException, unhandledRejection — 모두 `setup-shutdown.ts`에만 존재. **중복 없음.**

### 3.4 Phase 분리 검증

- `registerCoreRoutes()`: main.ts line 126 — server listen **전**에 호출 ✅
- `registerDomainRoutes()`: main.ts line 193 — DB init **후**에 호출 ✅
- 원본과 동일한 2-phase 구조 유지 ✅

---

## 4. 잔존 이슈

### 모두 PRE-EXISTING (원본에서 이미 존재)

| # | 위치 | 이슈 | 심각도 | 원본에 있었나 | 권장 조치 |
|---|------|------|:------:|:------------:|-----------|
| 1 | `register-routes.ts:107-113` | SiteGuide entity 4개 미사용 import | 중 | ✅ | 별도 cleanup에서 제거 |
| 2a | `register-routes.ts:292` | `/api/auth` 중복 등록 | 중 | ✅ (원본 578+837) | 별도 cleanup에서 제거 |
| 2b | `register-routes.ts:296` | `/api/v1/admin/apps` 중복 등록 | 중 | ✅ (원본 604+841) | 별도 cleanup에서 제거 |
| 3 | `main.ts:18` | `telemetrySDK` 미사용 변수 | 하 | ✅ | — |
| 4 | `main.ts:196,222` | `webSocketSessionSync` 미사용 변수 | 하 | ✅ | — |
| 5 | `main.ts:171,239` | `gracefulStartup` 중복 계산 | 하 | ✅ | — |
| 6 | `register-routes.ts:945-949` | `moduleEntities` 수집 후 미사용 | 하 | ✅ | — |
| 7 | `register-routes.ts:299-300` | 주석 처리된 forum route | 사소 | ✅ | — |

**이번 split에서 새로 도입된 이슈: 0건**

### 중복 route 등록 (2a, 2b) 상세

원본 main.ts에서:
- `/api/auth`는 line 578 (pre-startup) + line 837 (post-startup) 에서 2회 등록
- `/api/v1/admin/apps`는 line 604 (pre-startup) + line 841 (post-startup) 에서 2회 등록

이 중복은 원본에서 pre-startup과 post-startup 영역에 각각 한 번씩 등록된 것이 그대로 split된 결과.
Express에서 같은 router를 같은 path에 2회 mount하면 2회 실행되지만, 실제 응답은 첫 번째 handler에서 처리.
**현재 프로덕션에서 정상 동작 중이므로 이번 split과 무관.** 별도 cleanup WO에서 처리 가능.

---

## 5. `register-routes.ts` 별도 판단

| 항목 | 판정 |
|------|------|
| 현재 상태 유지 가능 여부 | **YES** |
| 순수 등록부로 볼 수 있는지 | **YES** |
| 후속 분해 필요 여부 | **NO** |

**근거:**

1. 955줄 중 **로직 코드 0%** — 모든 줄이 import, app.use(), try/catch wrapper, logger.info()
2. 책임이 단일 (route 등록)이며 혼합 없음
3. 분해 시 실익 없음:
   - "core routes" vs "domain routes"로 이미 2함수 분리됨
   - 더 쪼개면 파일만 늘고 이점 없음 (개별 route 파일은 이미 분리 완료)
4. 등록 순서가 중요하므로 한 파일에서 확인 가능한 것이 오히려 유리

---

## 6. 다음 oversized 정비 추천

| 순위 | 대상 | 이유 | 작업 방식 |
|:----:|------|------|:---------:|
| **1** | `auth.middleware.ts` (1,019줄) | auth split 3부작 완결편. 13개 함수→4개 파일+barrel | 단독 WO |
| **2** | `dashboard-assets.routes.ts` (1,010줄) | 10개 inline handler 분리. 기존 패턴 동일 | 단독 WO |
| **3** | 중복 route cleanup | pre-existing 중복 등록 2건 + 미사용 import 정리 | 경량 WO |

`auth.middleware.ts`가 1순위인 이유:
- auth service split → auth controller split → **auth middleware split**으로 자연스러운 연속성
- 72개 importer가 barrel re-export로 호환 유지 가능
- 리스크 중간 (main.ts split보다 약간 높지만 패턴은 확립됨)

---

## 7. 최종 결론

**`WO-O4O-MAIN-TS-BOOTSTRAP-SPLIT-V1`은 안전하게 완료되었다.**

- Middleware 순서: 16/16 일치
- Route 등록 순서: 121/121 일치
- Shutdown handler: 중복 없음
- 신규 도입 이슈: 0건
- 발견된 이슈: 모두 pre-existing

**Push 승인 가능.**

---

*조사 완료: 2026-03-23*
*다음 단계: ChatGPT 점검 후 push → 다음 WO 착수*
