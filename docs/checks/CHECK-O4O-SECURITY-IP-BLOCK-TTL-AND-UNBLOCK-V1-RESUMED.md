# CHECK-O4O-SECURITY-IP-BLOCK-TTL-AND-UNBLOCK-V1 (재개 · 완료)

> WO: `WO-O4O-SECURITY-IP-BLOCK-TTL-AND-UNBLOCK-V1` (재개 범위)
> 작업일: 2026-08-01 · 브랜치: `main` · 작업 전 HEAD `68a06cbd6`
> 최초 조사·중지 기록: [`CHECK-O4O-SECURITY-IP-BLOCK-TTL-AND-UNBLOCK-V1.md`](CHECK-O4O-SECURITY-IP-BLOCK-TTL-AND-UNBLOCK-V1.md)

---

## 1. 재개 배경

최초 시도는 중지 조건 ①②(신뢰 가능한 client IP 판정 불가 / XFF 조작 가능)로 중단했다.
선행 WO 2건이 이를 해소했다.

| 선행 WO | 결과 |
|---------|------|
| `...-TRUSTED-CLIENT-IP-AND-SECURITY-LOG-REDACTION-V1` | `trust proxy = 2` 실측 확정 · `getTrustedClientIp` 통일 · 로그 redaction |
| `...-CLOUD-RUN-INGRESS-LOAD-BALANCER-ONLY-V1` | run.app 직접 우회 차단 → 프록시 체인 단일화 |

## 2. 중지 조건 판정 (재개 범위 3가지)

| 조건 | 판정 |
|------|------|
| 기존 다른 보안 규칙과 임계값 충돌 | **미해당** — `rule_failed_logins`(5회/15분) · `rule_rapid_requests`(100회/1분) 와 이벤트 타입이 달라 독립. `countRecentEvents` 가 이미 IP·eventType 별로 집계한다 |
| 관리자 보안 라우트 권한 구조 신설 필요 | **미해당** — 기존 `authenticate` + `requireRole(['platform:admin','platform:super_admin'])` 재사용 |
| 병행 세션 파일 수정 필요 | **미해당** |

## 3. 구현

### 3-1. TTL 저장 구조

`SecurityAuditService`

```ts
// 변경 전: private blockedIPs: Set<string>            ← 만료 없음, 해제 수단 없음
// 변경 후:
export interface BlockedIpRecord { ip; blockedAt; blockedUntil; reason?; source?; }
private blockedIPs: Map<string, BlockedIpRecord>
```

키는 `normalizeIp` 로 정규화한다 → `::ffff:10.0.0.1` 과 `10.0.0.1` 이 같은 레코드가 된다.

### 3-2. TTL · 만료 · 재차단

| 항목 | 정책 |
|------|------|
| 기본 TTL | **60분** (`DEFAULT_IP_BLOCK_TTL_MS`) |
| 설정 | `SECURITY_IP_BLOCK_TTL_MS`. **0 이하 · 비정수 · 24시간 초과는 기본값 폴백** — 잘못된 설정이 사실상 영구 차단이 되지 않게 한다 |
| 자동 만료 | `isIPBlocked` · `getBlockedIPs` 시점에 만료 레코드 제거 (**lazy expiration**, 별도 cron 없음) |
| 재차단 | `blockedUntil = max(기존, now + TTL)` 로 **연장**. 중복 레코드 없음, 최초 `blockedAt` 보존 |

### 3-3. `rule_sql_injection` 임계값

```diff
   condition: {
-    eventType: ['security.sql_injection']
+    eventType: ['security.sql_injection'],
+    threshold: { count: 3, minutes: 5 }
   },
```

기존에는 임계값이 없어 **오탐 1회로 즉시(그리고 영구) 차단**됐다.
탐지 패턴이 `(or|and).*=` · `--` · `;` 처럼 넓어 정상 요청도 걸릴 수 있다.

- **1회 탐지** → 해당 요청만 `400`(미들웨어가 처리). 차단 없음
- **5분 내 3회** → 60분 TTL 차단

`countRecentEvents(ip, eventType, minutes)` 가 이미 존재해 규칙 구조 변경 없이 적용됐다.

### 3-4. 관리자 API

`apps/api-server/src/routes/admin/security-blocked-ips.routes.ts` (신규)

| 엔드포인트 | 설명 |
|-----------|------|
| `GET /api/v1/admin/security/blocked-ips` | 현재 인스턴스 차단 목록 — `scope: "current-instance"` 명시. ip · blockedAt · blockedUntil · **remainingSeconds** · reason · source |
| `POST /api/v1/admin/security/blocked-ips/unblock` | IP 1건 해제. **멱등** (`changed` 플래그) |

- IPv6 는 `:` 때문에 path parameter 인코딩이 불안정하므로 **body 방식**을 선택했다
- 잘못된 IP 형식은 `400 INVALID_IP` — 임의 문자열을 해제 키로 받지 않는다
- 응답에 요청 payload 등 민감 정보를 담지 않는다
- 해제 시 actor userId · target IP · action · changed 를 감사 로그로 남긴다

**제공하지 않는 것**: 전체 해제 · CIDR · 일괄 해제 · 수동 차단 · allowlist (WO §5.6)

### 3-5. IP 축

차단·해제·조회 모두 기존 `getTrustedClientIp` / `normalizeIp` 헬퍼만 사용한다.
XFF 직접 파싱은 없다.

## 4. 검증

### 4-1. 단위 테스트 13건 (전부 통과, fake timer — 실제 sleep 없음)

| 그룹 | 검증 |
|------|------|
| TTL 설정 | 기본 60분 · 유효값 사용 · 0/음수/비정수/24h 초과 폴백 |
| 차단 TTL | 차단 직후 유지 · TTL 이내 유지 · **TTL 경과 후 자동 해제 + 목록에서 제거** |
| 재차단 | **TTL 연장** · 레코드 1건 유지(중복 없음) · 최초 `blockedAt` 보존 · 원래 만료시각 지나도 유지 |
| 격리 | 다른 IP 무영향 |
| 해제 | 해제 후 즉시 통과 · 없는 IP 멱등 · **만료된 IP 도 멱등** |
| 정규화 | IPv4-mapped IPv6 와 IPv4 동일 레코드 |
| 응답 | remainingSeconds·reason·source 포함, 그 외 키 없음(민감 payload 미포함) |

### 4-2. 프로덕션 API 스모크

| 항목 | 결과 |
|------|------|
| 미인증 목록 / 해제 | ✅ 401 / 401 |
| 비관리자 목록 / 해제 | ✅ 403 / 403 |
| 관리자 목록 | ✅ 200 · `scope=current-instance` · `count=0` |
| 개별 해제 (없는 IP, 2회) | ✅ 200 · `changed=false` — **멱등** |
| 잘못된 IP (`not-an-ip` · `999.1.1.1` · 빈 값) | ✅ 400 `INVALID_IP` |

### 4-3. 핵심 개선 — 오탐 1회 즉시 차단 해소 (프로덕션 실측)

| 단계 | 결과 |
|------|------|
| 탐지 패턴 1회 요청 | ✅ **400** (해당 요청만 거부) |
| 직후 정상 요청 2건 | ✅ **200** — 차단되지 않음 |
| 관리자 차단 목록 | ✅ **`count=0`** — 차단 레코드 자체가 생기지 않음 |

**변경 전이었다면 이 시점에 해당 IP 가 영구 차단되어 이후 모든 요청이 403 이 됐다**
(직전 WO 조사 중 실제로 발생했던 상황이다).

### 4-4. 회귀

| 항목 | 결과 |
|------|------|
| 공개 API 연속 8회 (rate-limit) | ✅ 전부 200 |
| `/platform-services` · 관리자 `/admin/users` | ✅ 200 |
| 로그 · 기존 보안 규칙 | 구조 변경 없음 (임계값 1개 추가 외) |

### 4-5. 미실행

| 항목 | 사유 |
|------|------|
| 프로덕션에서 임계값(3회) 도달 → 403 차단 확인 | **의도적으로 하지 않음.** 차단되면 해당 회선에서 해제 API 자체에 도달할 수 없다(§5 한계). 임계값·차단·TTL 만료는 §4-1 단위 테스트가 fake timer 로 고정한다 |
| TTL 60분 실시간 만료 확인 | 동일 — 단위 테스트로 대체 |

## 5. 알려진 한계

```
차단 상태는 in-memory / 현재 Cloud Run 인스턴스 범위 — 인스턴스 간 공유되지 않는다
새 인스턴스·재배포 시 차단 상태 초기화
차단된 IP 에서는 관리자 해제 API 에 도달할 수 없다 (다른 회선 필요)
```

공유 저장소(Redis/DB) 도입은 이번 범위 밖이다. 다만 TTL 도입으로 **무기한 차단은 사라졌고**,
최악의 경우에도 60분 뒤 자동 해제된다.

## 6. 데이터 변경

```
migration 0 · DB write 0 · Redis 0 · 신규 테이블 0 · 신규 role 0
```

환경변수 `SECURITY_IP_BLOCK_TTL_MS`(선택, 기본 60분)만 추가 가능하다.

## 7. 변경 파일

```
apps/api-server/src/services/SecurityAuditService.ts              (Map·TTL·연장·목록·임계값)
apps/api-server/src/routes/admin/security-blocked-ips.routes.ts   (신규)
apps/api-server/src/bootstrap/register-routes.ts                  (마운트 1줄)
apps/api-server/src/services/__tests__/security-ip-block-ttl.test.ts (신규, 13건)
```
