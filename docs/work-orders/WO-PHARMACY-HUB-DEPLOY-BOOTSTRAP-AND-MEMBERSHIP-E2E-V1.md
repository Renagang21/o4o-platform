# WO-PHARMACY-HUB-DEPLOY-BOOTSTRAP-AND-MEMBERSHIP-E2E-V1

> Pharmacy-Hub 앱을 배포하고, 최초 운영자를 부여한 뒤, 가입 신청 → 승인 → 역할별 진입을
> 실제 브라우저와 DB 에서 검증한다. **상품 · 주문 · 콘텐츠 기능은 구현하지 않는다.**

| 항목 | 값 |
|------|------|
| 선행 WO | `WO-PHARMACY-HUB-NEW-SERVICE-FOUNDATION-V1`, `WO-PHARMACY-HUB-MEMBERSHIP-JOIN-AND-APPROVAL-V1` |
| 상태 | 배포 완료 · E2E 검증 완료 (미검증 2건은 §4-3 차단 사유 참조) |
| 착수일 | 2026-07-30 |

---

## 1. 조사 — 착수 시점 실측 (2026-07-30)

선행 WO 의 **백엔드는 이미 프로덕션 LIVE** 였다. 배포 대상은 프론트엔드뿐이었다.

| 항목 | 실측 결과 | 근거 |
|------|-----------|------|
| `GET /api/v1/pharmacy-hub/join/status` | ✅ 401 (라우트 mount 확인) | curl |
| `GET /api/v1/pharmacy-hub/operator/memberships` | ✅ 401 | curl |
| seed migration `20270216000000` | ✅ 적용됨 | `/api/v1/platform-services` 응답에 `pharmacy-hub` 존재 |
| API 리비전 | `o4o-core-api-03029-r6k` | `gcloud run revisions list` |
| `pharmacy-hub-web` Cloud Run | ❌ 없음 | `gcloud run services list` |
| `deploy-web-services.yml` | ❌ pharmacy-hub 항목 0개 | grep |
| CORS allowed origins | ❌ pharmacy-hub 오리진 없음 | `setup-middlewares.ts` + Cloud Run `CORS_ORIGIN` env 부재 |
| `pharmacy-hub:operator` 보유자 | ❌ 0명 (roles 카탈로그에만 seed) | — |

## 2. 문제 확정

E2E 검증을 막는 요인은 3개였다.

1. **배포 파이프라인 미연결** — 선행 Foundation WO 가 의도적으로 배포를 보류했다
   (`services/web-pharmacy-hub/Dockerfile` 주석에 명시). Dockerfile 자체는 사용 가능한 상태.
2. **CORS 차단** — `getAllowedOrigins()` 하드코딩 목록에 pharmacy-hub 오리진이 없고
   Cloud Run 에 `CORS_ORIGIN` env 도 없다 → 신규 웹 URL 의 모든 API 호출이 차단된다.
3. **최초 운영자 부재** — 승인 콘솔을 쓸 `pharmacy-hub:operator` 가 0명. 그런데 operator 는
   자가 신청 경로가 없다 (`auth-register` 의 `PHARMACY_HUB_SIGNUP_ROLE_REQUIRED` 게이트가
   `store_owner|supplier` 만 허용). → admin grant flow 로만 부여 가능.

## 3. 최소 수정 (3 파일 + WO 문서)

### 3-1. 배포 파이프라인 연결

`.github/workflows/deploy-web-services.yml` — 기존 4개 서비스와 **동일 구조로 추가만** 했다.
기존 job 은 수정하지 않았다.

- `on.push.paths` += `services/web-pharmacy-hub/**`
- `workflow_dispatch` 설명에 `pharmacy-hub` 추가
- env: `VITE_API_URL_PHARMACY_HUB` / `VITE_SERVICE_URL_PHARMACY_HUB`
- `detect-changes`: outputs + dispatch 분기 + packages-changed 분기 + `decide "pharmacy-hub"`
- `deploy-pharmacy-hub` job (kpa-society job 구조 복제)
- `summary`: needs + 출력 1줄

**DNS 는 연결하지 않는다** — 임시 Cloud Run URL 로만 검증한다 (WO 범위).

### 3-2. CORS

`apps/api-server/src/bootstrap/setup-middlewares.ts` `prodOrigins` += 3개

- `https://pharmacyhub.co.kr`, `https://www.pharmacyhub.co.kr` — canonical 도메인.
  DNS 연결 전이라도 등록해 두면 이후 DNS 작업에서 API 재배포가 불필요하다.
- `https://pharmacy-hub-web-3e3aws7zqa-du.a.run.app` — 임시 Cloud Run URL.
  ⚠️ 실제 발급 URL 이 이 예측값과 다르면 배포 후 정정 필요.

### 3-3. 최초 운영자 부여 (프로덕션 DB write)

`apps/api-server/src/database/migrations/20270217000000-GrantPharmacyHubInitialOperator.ts`

수동 SQL 대신 **멱등 migration** 을 선택했다 — git 이력과 CI/CD 절차 안에 남고,
환경 재구성·감사에 유리하다.

부여 대상: `sohae2100@gmail.com` (TEST-ACCOUNTS SSOT 의 전 서비스 운영자 계정 축과 동일)

| 테이블 | 쓰는 값 |
|--------|---------|
| `service_memberships` | `service_key='pharmacy-hub'`, `status='active'`, `role='pharmacy-hub:operator'` |
| `role_assignments` | `role='pharmacy-hub:operator'`, `is_active=true`, `scope_type='global'` |

**명시적 비수행 (계약):**

- 대상 계정이 없으면 **아무 행도 쓰지 않고 warn 로그로 보고**한다 (배포는 막지 않는다)
- 타 서비스 membership · role 변경 없음
- 기존 역할 삭제 · 교체 없음 — `UPDATE`/`DELETE` 문 자체가 없고 전부 `INSERT ... DO NOTHING`
- 중복 실행 시 추가 행 0 (`ON CONFLICT (user_id, service_key)` / `ON CONSTRAINT unique_active_role_per_user`)
- `users` 테이블 미수정
- 상품 · 주문 · 콘텐츠 권한 부여 없음

`membership.role` 을 prefixed (`pharmacy-hub:operator`) 로 저장하는 것은 선행 WO §6-E 의
write-path 규약과 일치한다 — `MembershipApprovalService` 가 이 값을 그대로
`role_assignments` 에 부여하고, `PHARMACY_HUB_SCOPE_CONFIG.allowedRoles` 가 이를 기대한다.

## 4. 검증

### 4-1. 정적 검증 (완료)

| 검사 | 결과 |
|------|------|
| `tsc --noEmit -p tsconfig.build.json` (api-server) | ✅ 0 errors |
| `pnpm --filter pharmacy-hub-web run type-check` | ✅ 0 errors |
| `deploy-web-services.yml` YAML 파싱 · job/outputs/needs 정합 | ✅ |

착수 시 발견된 기존 type 오류 2건은 **본 WO 변경분이 아니며 배포를 막지 않는다**:

- `pharmacy-hub-scope.middleware.ts` — 로컬 `packages/security-core/dist` stale 만의 문제
  (`src/types.ts` 에는 `'pharmacy-hub'` 존재). CI 는 packages 를 먼저 빌드하므로 무영향.
- `src/scripts/audit-roles.ts` — `ServiceKey` union 확장(Foundation WO)의 미반영 잔재.
  `tsconfig.build.json` 이 `src/scripts/**/*` 를 exclude 하므로 빌드 · 배포 무영향.

### 4-2. E2E 검증 (프로덕션 실측 — 2026-07-30)

배포 결과

| 항목 | 결과 |
|------|------|
| `pharmacy-hub-web` Cloud Run | ✅ `https://pharmacy-hub-web-3e3aws7zqa-du.a.run.app` — 발급 URL 이 §3-2 예측값과 일치 (정정 불필요) |
| CORS preflight (신규 오리진) | ✅ 204 + `access-control-allow-origin` 정확 반영 |
| migration `20270217000000` | ✅ 실행 · `granted pharmacy-hub:operator to ... (idempotent)` 로그 (SKIP 분기 미진입 = 대상 계정 존재) |

⚠️ **detect-changes 함정**: 워크플로 파일만 변경된 push 는 `decide` 가 전 서비스를 false 로
판정해 배포가 skip 된다 (실측: 전 job skipped). 최초 연결 시에는
`gh workflow run deploy-web-services.yml -f service=pharmacy-hub` 로 dispatch 해야 한다.

기능 검증

| 검증 | 결과 |
|------|------|
| 최초 운영자 부여 | ✅ `sohae2100` roles 에 `pharmacy-hub:operator` |
| **기존 역할 보존** | ✅ cosmetics/glycopharm/kpa/neture admin·operator 9개 전부 유지 (삭제·교체 0) |
| 가입 신청 (store_owner / supplier) | ✅ 201 → `status=pending`, `role` 이 prefixed 로 저장 |
| 중복 신청 차단 | ✅ 409 `ALREADY_PENDING` |
| 승인 2건 | ✅ 200, `status=active`, `approvedBy`/`approvedAt` 기록 |
| 공급자 진입 | ✅ `/supplier/ping` 200 · `me/access.entryPoints.supplier=true` |
| 역할 격리 | ✅ 공급자 토큰으로 `/store-owner/ping` 403 |
| 비운영자 승인 API | ✅ 403 |
| 브라우저 (공급자 · 운영자) | ✅ 로그인 → 역할별 진입 성공, console error 0, API 전부 200, Tailwind 렌더 정상 |
| migration 재실행 | ✅ `typeorm_migrations` 기록으로 재실행 자체가 없음 + `ON CONFLICT DO NOTHING` |

⚠️ **승인 직후 stale JWT**: 승인 전에 발급된 access token 은 역할이 반영되지 않아 scope guard 가
403 을 준다. 승인 후 재로그인이 필요하다 (구조상 정상 — 프론트 CTA 안내 확인 권장).

### 4-3. 미검증 2건 (차단 사유 있음)

| 항목 | 차단 사유 |
|------|-----------|
| 약국 경영자 **브라우저** 진입 | `renagang21@gmail.com` 프로덕션 비밀번호가 `TEST-ACCOUNTS.local.md` 값과 불일치 → `401 INVALID_CREDENTIALS`. 문서 45행이 "서비스 시작 전 비번 변경 대상"으로 표기한 계정이며, 문서가 갱신되지 않은 것으로 보인다. 셸 개입 없이 파일 payload 로 재시도해도 동일. 계정 잠금 로직은 없고 `SERVICE_NOT_MEMBER` 와 구분된 코드이므로 bcrypt 불일치 확정. **서버 측 역할 부여(`pharmacy-hub:store_owner` active)는 확인됨** — 사용자 측 진입만 미검증. |
| 반려 사유 표시 | 두 신청을 모두 승인해 pending 이 없다. 반려 경로 검증에는 제3 신원이 필요하다. |

### 4-4. 검증 중 발생한 데이터 blemish

첫 `curl -d` payload 의 한글이 Windows 셸에서 깨져 `renagang21` 의
`businessInfo.businessName` 이 `테스트약국` → U+FFFD 문자열로 저장되었다.
나머지 프로필 필드(담당자명 · 사업자번호 · 주소)는 온전하다. 테스트 계정이므로 교정하지 않는다.
이후 payload 는 **UTF-8 파일 + `--data-binary`** 로 전송해 재발하지 않았다
(동일 방식으로 보낸 `쓰리라이프존` 은 정상 저장 확인).

## 5. 범위 밖 (후속)

- **DNS** `pharmacyhub.co.kr` → Cloud Run 도메인 매핑
- **CI 타입체크 커버리지** — `scripts/dev.mjs` 의 `webServices` 루프는 `npx tsc --noEmit` 를
  쓰는데, pharmacy-hub 의 `tsconfig.json` 은 solution-style (`files: []` + references) 이라
  아무것도 검사하지 않고 exit 0 이 된다. 커버하려면 `tsc -b` 로 바꿔야 하고, 이는 기존
  `web-kpa-society` 동작까지 바꾸는 공용 CI 변경이므로 별도 WO 로 분리한다.
- 상품 · 주문 · 콘텐츠 기능 (공급자의 Pharmacy-Hub 상품 제공)
- Market Trial 연결

---

*Created: 2026-07-30*
