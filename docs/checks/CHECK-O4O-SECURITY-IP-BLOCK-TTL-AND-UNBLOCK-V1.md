# CHECK-O4O-SECURITY-IP-BLOCK-TTL-AND-UNBLOCK-V1

> WO: `WO-O4O-SECURITY-IP-BLOCK-TTL-AND-UNBLOCK-V1`
> 작업일: 2026-08-01 · 브랜치: `main` · HEAD `d02d4dcfa`
> **판정: WO §10 중지 조건 ①② 해당 — TTL·해제 API 를 구현하지 않고 조사 결과만 보고한다.**

---

## 1. 기존 blockedIPs 구조

[`SecurityAuditService.ts`](../../apps/api-server/src/services/SecurityAuditService.ts)

```ts
private blockedIPs: Set<string> = new Set();     // L84

blockIP(ip)     { this.blockedIPs.add(ip); }     // L305
unblockIP(ip)   { this.blockedIPs.delete(ip); }  // L310  ← 라우트 미노출
isIPBlocked(ip) { return this.blockedIPs.has(ip); } // L315
```

| 항목 | 상태 |
|------|------|
| 저장 | 프로세스 in-memory `Set<string>` (모듈 싱글톤) |
| 차단 시각 · 만료 · 사유 · 출처 | **없음** |
| TTL | **없음** — 명시적 `unblockIP()` 호출 외 제거 경로 0 |
| 관리자 조회/해제 라우트 | **없음** (`unblockIP` 를 부르는 코드가 어디에도 없음) |
| 해제 이력 | 없음 |
| 범위 | Cloud Run 인스턴스별 (`minScale=1`, 인스턴스 교체 시 초기화) |

`rateLimiter.ts` 에도 별도 `unblockIP()` 가 있으나 **다른 하위 시스템**이며 본 WO 대상이 아니다.

## 2. 차단 호출부 (전수)

| 위치 | 트리거 | 임계값 |
|------|--------|--------|
| `SecurityAuditService.ts:229` `executeRuleAction('block')` | 규칙 매칭 | 규칙별 |
| └ `rule_failed_logins` | `auth.failed_login` | 15분 내 5회 |
| └ `rule_sql_injection` | `security.sql_injection` | **임계값 없음 — 1회로 즉시 차단** |
| `SecurityAuditService.ts:287` `trackFailedLogin()` | 로그인 실패 누적 | 15분 내 5회 |

이벤트 발생지는 전역 미들웨어 2개다 ([`setup-middlewares.ts:203-204`](../../apps/api-server/src/bootstrap/setup-middlewares.ts)):

```ts
app.use(securityMiddleware);        // 차단 판정 + 403
app.use(sqlInjectionDetection);     // query/body/params 패턴 → security.sql_injection
```

`securityMiddleware.ts:11` 이 유일한 `isIPBlocked` 소비처이며, 차단 시 403 `Access denied` /
`Your IP address has been blocked due to suspicious activity` 를 반환한다.

## 3. 실제 client IP 판정 방식 — **핵심 결함**

### 3-1. 차단 키의 출처

세 곳 모두 동일하다:

```ts
const ipAddress = req.ip || req.socket.remoteAddress || 'unknown';
//  securityMiddleware.ts:8 (차단 판정) · :49 (auth 실패) · :99 (injection 탐지)
```

### 3-2. trust proxy 설정

[`main.ts:49`](../../apps/api-server/src/main.ts)

```ts
app.set('trust proxy', true);     // 모든 프록시 무조건 신뢰
```

### 3-3. 로컬 재현 — `req.ip` 는 XFF **최좌측**(클라이언트 주입값)이다

동일 설정(`trust proxy: true`)으로 실측:

| 요청 헤더 | `req.ip` | `req.ips` |
|-----------|----------|-----------|
| (XFF 없음) | `::ffff:127.0.0.1` | `[]` |
| `X-Forwarded-For: 203.0.113.7, 112.153.205.95` | **`203.0.113.7`** | `["203.0.113.7","112.153.205.95"]` |
| `X-Forwarded-For: 203.0.113.7` | **`203.0.113.7`** | `["203.0.113.7"]` |

두 번째 행이 결정적이다 — **프록시가 실제 IP를 뒤에 덧붙여도 `req.ip` 는 클라이언트가 넣은 값을 고른다.**

### 3-4. 결론적 위험

차단 키가 **신뢰할 수 없는 헤더에서 파생**된다. 그 결과:

```
공격자가 X-Forwarded-For: <피해자 IP> 를 붙여 injection 패턴 1회 전송
  → rule_sql_injection 은 임계값이 없어 즉시 blockIP(<피해자 IP>)
  → 피해자(임의의 사용자·관리자)가 TTL 없이 무기한 403
반대로 공격자는 XFF 값을 바꾸며 자신의 차단을 무한 회피
```

즉 현재 구조에서 IP 차단은 **방어 수단이 아니라 임의 사용자 DoS 원시 도구**에 가깝다.
여기에 TTL·해제 API 를 얹으면 무기한 차단은 완화되지만 **잘못된 대상을 차단하는 근본 결함은 그대로**다.

### 3-5. 남은 불확실성 (정직하게 명시)

Cloud Run 이 **클라이언트가 보낸 XFF 를 컨테이너까지 전달하는지**는 직접 확인하지 못했다.

- 확인한 것: GFE 요청 로그 `httpRequest.remoteIp` 는 스푸핑 요청·정상 요청 모두 **실제 IP** 였다.
  다만 이 필드는 헤더와 무관한 Google 자체 관측값이라 컨테이너가 보는 XFF 를 증명하지 못한다.
- 컨테이너의 `req.ip` 를 되읽을 안전한 경로가 없었다: `logEvent` 는 severity high/critical 에서만
  IP 를 남기고(그 경로는 곧 차단을 뜻함), `deprecation.middleware` 는 어디에도 적용돼 있지 않으며,
  IP 를 echo 하는 엔드포인트도 없다.
- **프로덕션에서 실제 공격성 문자열을 재전송하지 않았다** (WO §10-9 · §12 준수).

검증하려면 스테이징 또는 임시 echo 엔드포인트가 필요하다 — 그 자체가 별도 작업이다.
다만 §3-1~§3-3 만으로도 "보안 키를 미검증 헤더에서 취한다"는 코드 결함은 확정이며,
Cloud Run 이 지금 우연히 걸러주더라도 인프라 설정 하나로 악용 가능해진다.

## 4. WO §10 중지 조건 판정

| # | 조건 | 판정 |
|:-:|------|------|
| ① | 실제 client IP 를 안전하게 판정할 수 없는 경우 | **해당** — §3-3 |
| ② | XFF 조작으로 임의 IP 차단이 가능한 경우 | **해당(코드 수준 확정)** — §3-4, 인프라 측 잔여 불확실성은 §3-5 |
| ③ | 차단 로직 SSOT 불명확 | 미해당 — `SecurityAuditService` 싱글톤 단일 |
| ④ | 관리자 보안 라우트 부재로 새 권한 구조 필요 | 부분 — `/admin/security/*` 라우트는 없으나 `requireRole(['platform:admin','platform:super_admin'])` 패턴이 이미 있어 신규 권한 구조는 불필요 |
| ⑤ | TTL 이 기존 rate-limit/IDS 정책과 충돌 | 미해당 |
| ⑥ | in-memory 만으로 요구사항 충족 불가 | 미해당 (현재 단계 요구사항 기준) |
| ⑦ | Redis/DB 없이는 안전한 해제 불가 | 미해당 |
| ⑧ | 병행 작업 파일 수정 필요 | 미해당 |
| ⑨ | 프로덕션에 공격성 문자열 재전송 필요 | 미해당 — 보내지 않았다 |

①② 해당 → **구현 확대 없이 보고**한다.

## 5. 권고 순서 (다음 WO 분리안)

TTL·해제만 먼저 넣으면 "잘못된 대상을 60분간 차단하고 관리자가 지워주는" 구조가 된다.
아래 순서를 권고한다.

### 5-1. 선행: 신뢰 가능한 client IP 판정 (별도 WO, 최우선)

- `app.set('trust proxy', true)` → Cloud Run 구조에 맞는 **hop 수 지정**(예: `1`) 또는
  신뢰 프록시 목록 지정으로 교체. 그러면 `req.ip` 가 클라이언트 주입값이 아닌 실제 IP 를 가리킨다.
- 보안 키로 쓰는 지점(차단 판정·injection 탐지·로그인 실패 추적)은 공통 `getClientIp(req)` 유틸로 통일.
- 회귀 범위가 넓다(로깅·rate-limit·감사 로그 등 `req.ip` 사용처 26곳) → 단독 WO 가 맞다.

### 5-2. 후행: 본 WO 의 TTL + 관리자 조회·해제

IP 판정이 신뢰 가능해진 뒤 그대로 진행하면 된다. 설계는 이미 §1~§2 조사로 확정 가능하다:
`Map<string, BlockedIpRecord>` · 기본 TTL 60분 · lazy 만료 · 재탐지 시 `max(기존, now+TTL)` 연장 ·
`GET /api/v1/admin/security/blocked-ips` · `POST .../unblock` (IPv6 때문에 path param 대신 body 권장) ·
`platform:admin`/`platform:super_admin` 한정 · `scope: "current-instance"` 명시.

### 5-3. 함께 검토할 부수 발견

**injection 탐지 로그가 요청 전문을 남긴다** — `securityMiddleware.ts:105-113` 의
`details: { query, body, params }`. 로그인 요청이 패턴에 걸리면 **비밀번호가 그대로 로그에 적재**된다.
WO §E "전체 요청 body·비밀번호를 로그에 남기지 않는다" 와 정면 충돌하므로 함께 정비 대상이다.

또한 `rule_sql_injection` 은 임계값이 없어 **오탐 1회로 즉시 영구 차단**된다.
TTL 도입 시 이 규칙만 임계값·경고 단계를 두는 것도 검토할 만하다.

## 6. 알려진 한계 (설계상, 후속 WO 에서도 유지)

```
차단 정보는 Cloud Run 인스턴스별로 분리 — 다중 인스턴스 간 일관성 없음
새 인스턴스가 뜨면 기존 차단 정보 없음 (재배포 시 초기화)
차단된 IP 에서는 관리자 해제 API 자체에 도달할 수 없다 (다른 회선 필요)
```

## 7. 데이터 변경

```
migration 0 · 신규 테이블 0 · Redis 0 · DB write 0 · 코드 변경 0
```

본 WO 는 **조사·판정만** 수행했다.

## 8. 검증

| 항목 | 결과 |
|------|------|
| 차단 SSOT · 호출부 전수 조사 | ✅ 완료 (§1·§2) |
| `trust proxy` · `req.ip` 의미 | ✅ 로컬 Express 실측으로 확정 (§3-3) |
| Cloud Run GFE 관측 IP | ✅ 요청 로그 `remoteIp` 확인 — 실제 IP |
| 관리자 보안 라우트 존재 여부 | ✅ 없음 확인 |
| 프로덕션 공격성 문자열 재전송 | ❌ **하지 않음** (금지 조항 준수) |

## 9. 미실행 항목과 사유

| 항목 | 사유 |
|------|------|
| TTL 저장 구조 · 자동 만료 · 재차단 구현 | §10 중지 조건 ①② 해당 |
| 관리자 목록·해제 API | 동일 |
| 단위/보안 테스트 · 배포 · 스모크 | 구현이 없어 대상 없음 |
| 컨테이너 측 XFF 수신 여부 확정 | 안전한 확인 경로 부재 (§3-5). 스테이징 검증 필요 |
