# CHECK-O4O-SERVICE-LEGAL-POLICY-SETTINGS-BACKEND-V1

> `WO-O4O-SERVICE-LEGAL-POLICY-SETTINGS-BACKEND-V1` 결과.
> O4O 4개 서비스의 **법정정보 + 약관/정책 문서**를 serviceKey 기반 backend 설정으로 관리할 수 있는
> 저장 구조와 API 기반을 마련. **실값/placeholder seed 없음** — Admin 운영자가 서비스 개시 전 입력하는
> "담을 그릇"만 생성. frontend service 파일 무수정.
> **결과: CODE PASS** (tsc api-server 0). 배포 후 migration 자동 + public API smoke 예정. — 2026-06-10

---

## 1. 작업 목적
법정정보/정책 문서를 코드 하드코딩이 아니라 serviceKey 기반 backend 로 관리. 이번 작업은 실값 입력이
아니라 **저장 구조 + API 기반** 마련(0단계의 placeholder 제거에 이은 그릇 생성 단계).

## 2. 선행 IR 반영
- `IR-O4O-CROSSSERVICE-FOOTER-LEGAL-DISPLAY-REQUIREMENTS-V1` / `IR-...-SETTINGS-MANAGEMENT-AUDIT-V1` /
  `WO-O4O-GP-KCOS-FOOTER-PLACEHOLDER-LEGAL-INFO-SUPPRESSION-V1` 결론 반영:
  법정정보 저장 구조 부재 → serviceKey 신규 구조 신설. 정책 문서는 CmsContent 재사용 우선 검토(§5 참조).
  placeholder 미반환 / 미설정 시 공개 비표시 원칙 코드화.

## 3. 추가/수정한 entity / table / API
**신규 entity (2):**
- `ServiceLegalProfile` (table `service_legal_profiles`) — serviceKey 당 1 row(unique), 법정정보 18개 필드 전부 nullable.
- `ServicePolicyDocument` (table `service_policy_documents`) — serviceKey + document_type 별 버전/게시.

**신규 파일 (api-server):**
| 파일 | 역할 |
|------|------|
| `modules/service-legal/entities/ServiceLegalProfile.entity.ts` | 법정정보 엔티티 (ESM 규칙 준수) |
| `modules/service-legal/entities/ServicePolicyDocument.entity.ts` | 정책 문서 엔티티 |
| `modules/service-legal/service-legal-scope.ts` | cross-service scope guard + serviceKey/documentType 화이트리스트 |
| `modules/service-legal/service-legal.mapper.ts` | snake_case→camelCase DTO (public/admin 분리) |
| `modules/service-legal/public-service-legal.controller.ts` | public read (no auth) |
| `modules/service-legal/admin-service-legal.controller.ts` | admin write (+audit) |
| `database/migrations/20261104000000-CreateServiceLegalTables.ts` | additive 테이블 2개 |

**수정:**
- `database/connection.ts` — 두 엔티티 import + entities 배열 등록 (additive).
- `bootstrap/register-routes.ts` — public/admin 라우터 mount (additive).

## 4. ServiceLegalProfile 구조
`id` / `service_key`(unique) / `company_name` / `representative_name` / `business_registration_number` /
`ecommerce_registration_number` / `ecommerce_registration_agency` / `business_address` /
`customer_service_phone` / `customer_service_email` / `privacy_officer_name|email|phone` /
`hosting_provider` / `business_info_verification_url` / `mail_order_broker_notice`(중개자 고지, §6.4) /
`purchase_safety_service_info` / `additional_legal_notice` / `is_active`(default true) / `updated_by` /
`created_at` / `updated_at`. **모든 법정정보 필드 nullable, 기본 문구 seed 없음.**

## 5. 정책 문서 — CmsContent 재사용 여부
**재사용 안 함. 신규 additive 테이블 `service_policy_documents` 채택.**
근거:
1. `CmsContent`(`@o4o/cms-core`)는 **FROZEN CORE**(CLAUDE.md §3 / F10). `ContentType` enum 에
   terms/privacy/refund 등 정책 유형이 없어 추가 시 frozen-core 구조 변경 — 별도 core WO 필요.
2. 본 WO 필수 필드 `version` / `effective_date` / `change_reason` 을 CmsContent 가 1급 필드로
   미보유(metadata jsonb 우회만 가능).
→ frozen core 를 건드리지 않는 신규 additive 테이블이 최소·안전한 선택. KPA-only 검증 패턴
`kpa_legal_documents`(document_type/title/content/status/published_*) 를 4개 서비스 공통으로
일반화(serviceKey + version + effective_date + change_reason 추가). `kpa_legal_documents` 자체는 무변경.

## 6. Public API 목록 (mount `/api/v1/public/services`, no auth)
- `GET /:serviceKey/legal-profile` — is_active 법정정보. 미설정/비활성 → `data: null` (placeholder 금지).
- `GET /:serviceKey/footer-legal` — 동일 데이터(푸터 소비용 alias).
- `GET /:serviceKey/policies/:documentType` — 최신 published 1건. 없으면 404. draft 미노출.
- 내부/audit 필드(updated_by, is_active, id 등) public 응답 제외. 미지원 serviceKey → 404.

## 7. Admin API 목록 (mount `/api/v1/admin/services`)
- `GET  /:serviceKey/legal-profile` (operator+) / `PUT /:serviceKey/legal-profile` (admin, upsert)
- `GET  /:serviceKey/policies` (operator+) / `GET /:serviceKey/policies/:id` (operator+)
- `POST /:serviceKey/policies` (admin, draft 생성) / `PUT /:serviceKey/policies/:id` (admin)
- `PATCH /:serviceKey/policies/:id/publish` (admin, publish/unpublish — 같은 유형 기존 published→draft 후 게시)

## 8. 권한 검증 방식
- `requireServiceLegalScope(level)` — `:serviceKey` path param → security-core scope config 적용.
  - neture/glycopharm/k-cosmetics: `platformBypass=true` (platform:super_admin 통과)
  - **kpa-society: `platformBypass=false` 그대로 사용 → platform:super_admin 도 차단(KPA 격리 자동 준수).**
  - `createMembershipScopeGuard` 재사용 → active membership + `${prefix}:${level}` scope 검사.
    service admin 은 자기 서비스 role/membership 만 보유하므로 cross-service 수정 불가.
- write=admin, read=operator(admin ⊃ operator). 비로그인은 public API 만.

## 9. Audit log 처리
- 범용 `@o4o/action-log-core` `ActionLogService.logSuccess(serviceKey, userId, actionKey, {source:'manual', meta})` 재사용.
  전용 audit 테이블 미생성.
- actionKey: `service_legal:profile_update` / `policy_create` / `policy_update` / `policy_publish` / `policy_unpublish`.
- **한계(기록)**: ActionLog 는 `entityType/entityId/before/after/changeReason` 를 1급 컬럼으로 갖지 않아
  `meta`(jsonb) 에 구조화 저장. before/after 스냅샷 포함. WO §10 항목은 meta 로 모두 표현.
- audit 는 best-effort(try/catch) — 실패해도 설정 저장은 성공.

## 10. Migration 여부
- `20261104000000-CreateServiceLegalTables.ts` — additive. `hasTable` 가드 + `IF NOT EXISTS` 인덱스,
  `down` 정의. 데이터 파괴 없음, seed 없음. 활성 디렉토리 `src/database/migrations/`(connection.ts 기준).
  배포 시 CI/CD 자동 실행.

## 11. placeholder / 실값 seed 없음 확인
- 엔티티/마이그레이션/컨트롤러 어디에도 상호·대표자·사업자번호 등 실값 또는 "준비중/미정/홍길동/000-..." 등
  placeholder 미작성. profile 필드 전부 nullable, policy content default `''`(빈 문자열). ✅

## 12. Public fallback 정책
- 법정정보 미설정 → `null` 반환(placeholder 금지). 정책 문서 미게시 → public 미반환(404).
- "준비 중" 류 문구 생성 금지. 동적 푸터는 후속 WO 에서 값 있는 항목만 렌더(이번 범위 외).

## 13. frontend 미수정 확인
- `services/web-*` 파일 **0건 수정**. staged 파일은 `apps/api-server/**` + CHECK 문서뿐(§15 가드 통과).
- GP/KCos/KPA/Neture 푸터 UI 무변경. `/terms`·`/privacy` route 미변경.

## 14. 검증 결과
- **tsc api-server: 0 errors** ✅
- migration: additive CREATE TABLE 정적 검토 ✅ (배포 시 CI/CD 자동 실행 — 실행 검증은 배포 후)
- public API smoke(배포 후): `GET /api/v1/public/services/neture/legal-profile` → `{success:true, data:null}` 기대(미설정).

## 15. commit hash
- (커밋 후 기재)

---

## 후속 작업
1. `WO-O4O-ADMIN-SERVICE-LEGAL-POLICY-SETTINGS-UI-V1` — Admin 입력 화면.
2. `WO-O4O-CROSSSERVICE-POLICY-ROUTES-V1` — `/terms`·`/privacy` public API 연동.
3. `WO-O4O-CROSSSERVICE-DYNAMIC-LEGAL-FOOTER-V1` — 푸터 동적 연동(값 있는 항목만 렌더).

*Date: 2026-06-10 · Status: CODE PASS (실값/placeholder seed 없음, frontend 무수정, backend 기반만).*
