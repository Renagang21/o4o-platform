# WO-O4O-CORE-API-COLD-START-READINESS-AND-BURST-SAFETY-V1 — CHECK

> **결과**: **코드를 변경하지 않았다.** 조사 결과 **WO 의 전제(cold-start 경쟁으로 인한 burst 500)가
> 사실이 아니었다.** 500 의 실제 원인은 **CORS 거부**였다.
> 아울러 `minScale=0` 이 **CI 배포로 이미 1 로 되돌아가 있음**을 발견했다.
> **판정**: `PREMISE_NOT_SUPPORTED — ROOT_CAUSE_REATTRIBUTED_TO_CORS` + `MIN_SCALE_REVERTED_BY_CI`
> **작성일**: 2026-09-05

---

## 0. 선행 CHECK 정정 (중요)

직전 CHECK `WO-O4O-CLOUD-SQL-PRELAUNCH-STOP-OPERATION-TRANSITION-V1-CHECK.md` §4 에서
500 발생을 **`minScale=0` cold start 부작용**으로 귀인했다. **이 귀인은 틀렸다.**

당시 근거는 *"인스턴스 기동(23:59:45) 직후 500 이 몰렸다"* 는 **시간적 인접성**뿐이었고,
요청의 `referer` 를 확인하지 않았다. 아래 §3 의 전수 대조로 원인이 CORS 임이 확정되었다.
해당 CHECK 상단에 정정 표기를 추가했다.

---

## 1. 기준선

| 항목 | 값 |
|---|---|
| START_HEAD / origin/main | `89332f865849e6461c0f8aeba4629bdeeee08ce8` |
| branch | `main` (작업트리 clean) |
| 대상 | `o4o-core-api` (Cloud Run · asia-northeast3) |

---

## 2. Bootstrap 순서 조사 (WO 범위 1~2) — **이미 올바르다**

엔트리는 `apps/api-server/src/main.ts` (`Dockerfile CMD: node dist/main.js`).

`startServer()` 의 실제 순서:

```text
Phase 1  비-DB 초기화 (payment config · CPT registry)
Phase 2  await startupService.initialize()      ← DB / DataSource
         await initializePassport()
Phase 3  await registerDomainRoutes(app, AppDataSource)
         app.use(globalErrorHandler)
Phase 4  httpServer.listen(port, host)          ← DB 초기화 "뒤"
Phase 5  post-listen (non-critical)
```

**`listen()` 은 이미 `DataSource` 초기화와 라우트 등록이 끝난 뒤에 호출된다.**
WO 가 제안한 구조(`initialize → listen`)가 **이미 구현되어 있다.**

> 참고: 과거 WO 흔적이 주석으로 남아 있다 — 라우트를 listen 전에 등록해 404 구간을 없앤
> `WO-O4O-CARE-AI-CHAT-STABILITY-FIX-V1`, 에러 핸들러를 라우트 뒤·listen 전에 두는
> `WO-O4O-GLOBAL-ERROR-HANDLER-ENABLEMENT-V1`. 즉 이 부분은 이미 한 번 정리된 영역이다.

### 2-1. 유일한 이론적 구멍 — `GRACEFUL_STARTUP`

```ts
try { await startupService.initialize(); }
catch (error) {
  if (!gracefulStartup) process.exit(1);
  logger.warn('GRACEFUL_STARTUP=true: Continuing with degraded functionality');
}
```

기본값이 `true` 이므로 **DB 초기화가 실패해도 서버가 그대로 listen** 한다.
이 경우 DB 의존 엔드포인트가 500 을 낼 수 있다 — **이번 사건의 원인은 아니었지만**
(로그에 해당 경고가 없다) 구조적으로는 남아 있는 위험이다. §7 에 후속 제안으로 남긴다.

---

## 3. 근본 원인 확정 — CORS 거부 (WO 범위 3)

### 3-1. 결정적 증거 — 전수 대조

최근 6시간 `o4o-core-api` 요청 로그 전수 조사:

| 질의 | 결과 |
|---|---|
| referer 가 `http://localhost:4321/` 인 요청의 상태코드 | **38건 전부 500** (성공 **0건**) |
| 500 을 낸 요청의 referer | **38건 전부 `http://localhost:4321/`** (다른 출처 **0건**) |

**완전한 1:1 대응이다.** 그 origin 은 항상 실패하고, 그 외에는 한 건도 실패하지 않았다.
`warm` / `cold` 여부와 무관하다.

문제 구간의 앱 로그에도 대응 항목이 그대로 남아 있다:

```text
[CORS] Blocked origin: http://localhost:4321
Not allowed by CORS
```

### 3-2. 메커니즘

`apps/api-server/src/bootstrap/setup-middlewares.ts`

```ts
if (allowedOrigins.includes(origin)) {
  callback(null, true);
} else {
  logger.warn(`[CORS] Blocked origin: ${origin}`);
  callback(new Error('Not allowed by CORS'));   // ← Error → globalErrorHandler → HTTP 500
}
```

**CORS 거부가 403 이 아니라 500 으로 나간다.** 정상적인 정책 거부가 서버 장애처럼 보이며,
바로 이 점이 선행 CHECK 의 오귀인을 유발했다.

`if (!origin) callback(null, true)` 이므로 **Origin 헤더 없는 curl 은 항상 200** 이다 —
조사 초기에 "직접 호출하면 200" 이었던 이유가 이것이다.

### 3-3. 허용 목록에 4321 이 없다

`getAllowedOrigins()` 의 `devOrigins` (production 에서도 항상 포함됨):

```text
FRONTEND_URL(기본 3011) · 3000 · 3001 · 3002 · 3003
5173 · 5174 · 5175 · 5176 · 5177
```

**4321 포트는 없다.** 다른 세션이 로컬 dev 서버(4321)에서 production API 를 호출해
전량 차단된 것이다.

### 3-4. 결론

```text
500 = CORS 정책 거부 (의도된 차단)
     ≠ cold start
     ≠ DB readiness race
     ≠ minScale=0 부작용
```

WO 의 전제인 *"cold-start 중 burst 에서 실패한다"* 는 **관측 사실이 아니었다.**

---

## 4. ⚠️ `minScale=0` 이 CI 배포로 되돌아갔다 (별건 발견)

조사 중 확인한 revision 이력:

| revision | 생성 | minScale | 비고 |
|---|---|:---:|---|
| `o4o-core-api-03533-7vv` | 09-04 14:43 | **1** | 변경 전 |
| `o4o-core-api-03534-2r5` | 09-04 14:55 | **(없음 = 0)** | **내가 적용한 변경** |
| `o4o-core-api-03535-rwl` | **09-05 00:12** | **1** | **되돌아감** |
| `o4o-core-api-03536-9vm` | 09-05 00:32 | **1** | 현재 |

`lastModifier = github-actions@netureyoutube.iam.gserviceaccount.com`

원인은 배포 워크플로의 하드코딩이다.

```text
.github/workflows/deploy-api.yml:286    --min-instances=1
```

**즉 `gcloud run services update --min-instances=0` 같은 수동 변경은 지속되지 않는다.**
api-server 가 배포될 때마다 워크플로 값(1)으로 덮어써진다. 실제로 약 9시간 만에 되돌아갔다.

**비용 영향**: 직전 WO 가 보고한 `minScale=0` 절감(월 $8.6 · 약 1.2만원)은
**2026-09-05 00:12 부로 이미 소멸**했다. 현재 월 비용은 약 $104.7 이 아니라 **약 $113.3** 이다.

> 참고로 web 서비스·admin 워크플로는 `--min-instances=0` 이다.
> **`deploy-api.yml` 만 1** 이며, 이는 API 의 cold start 를 피하려는 의도적 설정으로 보인다.

---

## 5. Burst smoke 실측 (WO 범위 6~9)

### 5-1. 실행

약 17분 무요청 후 동일 DB 의존 엔드포인트로 30 동시 요청 → 이어서 warm 30 동시 요청.

| 구분 | 요청 | 결과 | latency |
|---|---:|---|---|
| 1차 (idle 후) | 30 동시 | **200 × 30 · 5xx 0** | min 0.087s / **max 0.292s** |
| 2차 (즉시, warm) | 30 동시 | **200 × 30 · 5xx 0** | — |

### 5-2. ⚠️ 그러나 이 테스트는 cold 가 아니었다 — 정직하게 기록

latency 최대 0.29초는 **warm 응답**이다. 기동 로그를 확인한 결과:

```text
00:32:54  Starting new instance.
          Reason: MANUAL_OR_CUSTOMER_MIN_INSTANCE —
                  "customer-configured min-instances or manual scaling"
```

`minScale=1` 이 이미 복원돼 있었으므로 **인스턴스가 0 으로 내려가지 않았다.**
따라서 **cold burst 는 측정되지 못했다.**

| WO 완료 기준 | 결과 |
|---|:---:|
| cold single request → 200 | 선행 WO 실측 **200 / 15.78s** |
| **cold burst → 5xx 0** | **미측정** (minScale=1 로 cold 상태 재현 불가) |
| DB initialization race → 0 | **재현 안 됨** (§3 에서 원인이 CORS 로 확정) |
| warm request → 정상 | **PASS (30/30 200)** |
| minScale = 0 유지 | **미달성** — CI 가 1 로 복원 (§4) |

---

## 6. 변경 내역

| 항목 | 값 |
|---|:---:|
| **코드 변경** | **0** — bootstrap 순서가 이미 올바르므로 수정할 대상이 없었다 |
| Cloud Run 설정 변경 | **0** |
| CI 워크플로 변경 | **0** (CLAUDE.md 중지 조건 — 아래 §7-1) |
| CORS 허용 목록 변경 | **0** |
| Cloud SQL / DB write | **0** |
| 다른 세션 파일 접촉 | **0** |
| 산출물 | 본 CHECK 1개 + 선행 CHECK 정정 표기 1줄 |

수행한 것은 **로그 조회 · 소스 정독 · read-only smoke** 뿐이다.

---

## 7. 판단이 필요한 사항 (전부 이 WO 범위 밖 — 실행하지 않았다)

### 7-1. `minScale` 정책을 어디서 정할 것인가 — **선행 결정 필요**

`deploy-api.yml` 수정은 CLAUDE.md 중지 조건(**"Docker · CI · build 인프라 변경 필요"**)에 해당하므로
승인 없이 진행하지 않았다.

| 선택 | 내용 | 월 비용 |
|---|---|---|
| **A (권고)** | **`minScale=1` 유지를 공식화** — 워크플로가 이미 그렇게 되어 있고, cold start 15.8초를 피한다. 직전 WO 의 절감 항목에서 이 건을 제외하고 재계산 | 현행 (**+$8.6** vs 잘못 보고된 값) |
| B | `deploy-api.yml` 을 `--min-instances=0` 으로 변경해 절감을 지속시킨다 | −$8.6 |

> **A 를 권고하는 이유**: 애초에 워크플로가 API 만 1 로 둔 것은 의도적 판단으로 보이고,
> cold start 15.8초는 실사용에서 체감이 크다. 무엇보다 **이번 조사로 "cold start 가 500 을
> 유발한다" 는 근거는 사라졌지만, "cold start 가 느리다" 는 사실은 그대로다.**
> 다만 어느 쪽이든 **수동 변경이 아니라 워크플로에서 정해야 지속된다** 는 점이 핵심이다.

### 7-2. CORS 거부가 500 으로 나가는 문제

정상적인 정책 거부는 **403** 이어야 한다. 현재는 500 이라 다음 문제가 있다.

- 모니터링·알림에서 **실제 서버 장애와 구분되지 않는다** (이번 오귀인이 그 실례다)
- 5xx 지표를 오염시킨다

`setup-middlewares.ts` 는 **공통 미들웨어**이므로 CLAUDE.md 의
`Shared Module Change Rule` 에 따라 소비처 전수 확인이 필요하다 → **별도 WO 권고.**

### 7-3. `localhost:4321` 을 허용 목록에 넣을 것인가

다른 세션의 로컬 dev 환경이 4321(Astro 기본 포트)을 쓴다.
`devOrigins` 는 production 에서도 항상 포함되므로 추가 시 보안 영향을 함께 판단해야 한다.
**해당 세션의 작업 맥락을 모르므로 임의로 추가하지 않았다.**

### 7-4. `GRACEFUL_STARTUP=true` 의 잠재 위험

DB 초기화 실패 시에도 listen 하여 degraded 상태로 트래픽을 받는다.
이번 사건의 원인은 아니지만, **진짜 DB 초기화 실패가 발생하면 정확히 WO 가 우려한 증상**이 된다.
startup probe 를 실제 readiness 와 연결하는 작업은 이 시나리오에 한해 여전히 유효하다.

---

## 8. Cloud SQL STOP 진행 순서에 대한 영향

사용자가 제시한 순서는 다음이었다.

```text
1. Core API cold-start/readiness 수정
2. minScale=0 burst 500 제거 확인
3. 개발 없는 시간 확인
4. Cloud SQL STOP → START 왕복 검증
5. 최종 STOP 운영 적용
```

**1·2 는 대상이 존재하지 않는 것으로 확인되었다** (500 은 CORS, bootstrap 순서는 이미 정상).
따라서 §7-1 의 `minScale` 정책만 정하면 **3 으로 바로 넘어갈 수 있다.**

`CLOUD_SQL_STOP_READY` 판정은 여전히 유효하다.

---

## 9. 최종 판정

```text
PREMISE_NOT_SUPPORTED — ROOT_CAUSE_REATTRIBUTED_TO_CORS
MIN_SCALE_REVERTED_BY_CI
```

- WO 가 고치려던 **cold-start readiness 문제는 코드상 이미 해결되어 있었다.**
- 관측된 500 은 **CORS 정책 거부**였고 서버 결함이 아니었다.
- **고칠 것이 없어 아무것도 고치지 않았다.** 없는 문제에 공통 bootstrap 을 손대지 않는 것이 옳다.
- 대신 **예상하지 못한 사실 1건**을 확보했다 — `minScale=0` 은 CI 때문에 지속되지 않으며
  직전 WO 가 보고한 절감액은 이미 소멸했다.

**UNKNOWN = 0.**

---

## 10. 문서 정합 (CLAUDE.md §16-5)

```text
문서 정합: 발견 1건 / SUPERSEDED 표기 0건 / 정정 표기 1건 / 링크 수정 0건 / 별도 WO 제안 3건
```

정정 표기 1건 = 선행 STOP-TRANSITION CHECK §4 의 원인 귀인 오류에 대한 상단 정정 링크.
