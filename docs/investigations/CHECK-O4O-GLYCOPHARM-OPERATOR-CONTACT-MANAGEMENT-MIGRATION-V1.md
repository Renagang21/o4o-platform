# CHECK-O4O-GLYCOPHARM-OPERATOR-CONTACT-MANAGEMENT-MIGRATION-V1

> **WO**: `WO-O4O-GLYCOPHARM-OPERATOR-CONTACT-MANAGEMENT-MIGRATION-V1`
> **선행 IR**: `IR-O4O-GLYCOPHARM-ADMIN-SCOPE-CLEANUP-BASELINE-V1`
> **목적**: GlycoPharm operator 에 문의 관리(처리) 기능을 신설하여, 후속 admin cleanup 에서 admin 문의 관리를 제거해도 기능 공백이 생기지 않게 한다.
> **작성일**: 2026-06-16
> **상태**: 코드 완료 · typecheck PASS · browser smoke 배포 후 대기

---

## 1. 결론 요약

- GlycoPharm operator 에 `문의 관리`(`/operator/contacts`) 신설 완료. **frontend-only**, backend/DB 변경 없음.
- 공통 컴포넌트 `@o4o/operator-core-ui/modules/contact-inquiry` 재사용 — 신규 화면 로직 없음.
- **backend 권한 변경 불필요**가 코드 분석으로 확정됨 (아래 §4).
- admin 문의 **설정**(`/admin/settings/contact`)은 그대로 유지. admin 문의 **관리**는 본 WO 에서 제거하지 않음(다음 WO 대상).

---

## 2. 변경 파일 목록

| 파일 | 변경 |
|------|------|
| `services/web-glycopharm/src/pages/operator/OperatorContactInquiriesPage.tsx` | **신규** — operator 전용 wrapper(자체 api 어댑터 보유, admin 페이지 비의존) |
| `services/web-glycopharm/src/config/operatorMenuGroups.ts` | `content` 그룹에 `{ label: '문의 관리', path: '/operator/contacts' }` 추가 |
| `services/web-glycopharm/src/App.tsx` | lazy import + `<Route path="contacts" …>` 추가 |

---

## 3. 재사용한 component / API

- **Component**: `ContactInquiryAdminPage` (`@o4o/operator-core-ui/modules/contact-inquiry`) — admin wrapper(`pages/admin/ContactInquiriesPage.tsx`)와 동일 컴포넌트.
- **API** (변경 없음, 기존 그대로):
  - `GET  /api/v1/admin/services/glycopharm/contact-inquiries`
  - `GET  /api/v1/admin/services/glycopharm/contact-inquiries/:id`
  - `PATCH …/:id/status`
  - `PATCH …/:id/note`

### admin 의존 제거

operator 페이지는 admin 의 `ContactInquiriesPage` 를 import 하지 않고 **자체 api 어댑터(~30줄)를 복제 보유**한다. 이유: 다음 WO 에서 admin 문의 관리 페이지를 삭제해도 operator 가 깨지지 않도록 결합을 끊기 위함. (향후 공통 어댑터로 합치는 것은 별도 정리 대상)

---

## 4. 권한 처리 방식 (핵심 — backend 무변경 근거)

backend 가드: `requireServiceLegalScope('admin')` → `createMembershipScopeGuard(GLYCOPHARM_SCOPE_CONFIG)` → `createServiceScopeGuard`.

- `GLYCOPHARM_SCOPE_CONFIG` 에는 **`scopeRoleMapping` 이 없다** (`packages/security-core/src/service-configs.ts:180-189`).
- `createServiceScopeGuard` 는 매핑이 없으면 `rolesToCheck = allowedRoles` 로 fallback 한다 (`service-scope-guard.ts:69-75`).
- GlycoPharm `allowedRoles = ['glycopharm:admin', 'glycopharm:operator']`.
- 따라서 **active membership 을 가진 `glycopharm:operator` 는 기존 admin contact API 가드를 그대로 통과**한다.

> 대조: K-Cosmetics 는 `scopeRoleMapping: { 'cosmetics:admin': ['cosmetics:admin'] }` 가 있어 admin scope 가 엄격하다. 따라서 **KCos 확장 시에는 backend 가드 조정(또는 operator scope 분리)이 별도로 필요**하다 — 본 GlycoPharm 패턴을 그대로 복제하면 KCos operator 는 403 이 난다. (후속 WO 주의)

membership guard 는 `glycopharm` membership(active) 도 요구한다. operator 계정은 canonical seed 상 active membership 보유 → 통과 예상.

---

## 5. admin 문의 설정 유지 여부

- `/admin/settings/contact`(`ServiceContactSettingsPage`) → **유지** (변경 없음). 설정은 서비스 admin 영역.
- 본 WO 는 문의 **설정** 관련 코드/API 를 일절 건드리지 않음.

---

## 6. admin 문의 관리 제거 가능 여부

- operator 문의 관리가 정상 동작하면, 다음 WO(`WO-O4O-GLYCOPHARM-ADMIN-SCOPE-CLEANUP-V1`)에서 admin 측을 제거 가능:
  - menu: `operatorMenuGroups.ts` 의 system 그룹에는 현재 문의 관리 메뉴 항목이 **없음**(admin 문의 관리는 라우트만 존재, sidebar 메뉴 미노출). → 제거 대상은 주로 `App.tsx` 의 `/admin/contact-inquiries` 라우트 + `pages/admin/ContactInquiriesPage.tsx`.
  - 단, admin `/admin/contact-inquiries` 라우트는 본 WO 에서 **그대로 둠**(깨지지 않음). 제거는 다음 WO.

---

## 7. 검증 결과

| 항목 | 결과 |
|------|------|
| GlycoPharm operator 메뉴에 문의 관리 노출 (코드) | ✅ `content` 그룹에 추가 (filterMenuByRole non-adminOnly → operator 노출) |
| `/operator/contacts` 라우트 등록 | ✅ App.tsx operator Route 추가 |
| operator 페이지 admin 비의존 | ✅ 자체 어댑터 보유 |
| backend operator 권한 통과 (코드 분석) | ✅ §4 — GlycoPharm scopeRoleMapping 부재로 operator allowedRoles 통과 |
| admin 문의 설정 동작 유지 | ✅ 무변경 |
| admin 문의 관리 동작 유지 | ✅ 무변경(라우트/페이지 보존) |
| typecheck (`tsc -b`) | ✅ PASS (exit 0) |
| browser smoke | ⏳ 배포 후 수행 (현재 미배포 — 프로덕션엔 미반영) |

### browser smoke 체크리스트 (배포 후)
```
operator 로그인 → 사이드바 '커뮤니티 운영 > 문의 관리' 노출 확인
/operator/contacts 접근 → 문의 목록 로드(200)
문의 상세 진입 → 본문 로드(200)
상태 변경 / 메모 저장 → 200
admin 계정에서 /admin/settings/contact 기존 동작 유지 확인
```

---

## 8. 후속 WO 제안

1. **`WO-O4O-GLYCOPHARM-ADMIN-SCOPE-CLEANUP-V1`** (IR baseline 의 본체):
   - admin 문의 관리(`/admin/contact-inquiries` route + `pages/admin/ContactInquiriesPage.tsx`) 제거
   - admin 역할 관리(`/admin/roles`) 제거 → O4O 전체 관리자 영역
   - admin 약국 네트워크(`/admin/pharmacies`, stub) 제거 → `/operator/stores` 일원화
   - 회원 관리 → "회원 데이터 관리"(삭제·파기 전용) 라벨/범위 정리
   - Finance 4종 현상 유지
2. **K-Cosmetics 확장 시 주의** (§4): KCos 는 `scopeRoleMapping` 으로 admin scope 가 엄격 → operator 문의 처리 허용하려면 backend 가드 조정 또는 operator scope 분리가 별도로 필요. GlycoPharm frontend 패턴만 복제하면 403.

---

*frontend-only. backend/DB 무변경. 코드 완료 + typecheck PASS. browser smoke 는 배포 후.*
