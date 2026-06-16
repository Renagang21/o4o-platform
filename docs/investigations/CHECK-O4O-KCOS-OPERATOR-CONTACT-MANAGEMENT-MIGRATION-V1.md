# CHECK-O4O-KCOS-OPERATOR-CONTACT-MANAGEMENT-MIGRATION-V1

> **WO**: `WO-O4O-KCOS-OPERATOR-CONTACT-MANAGEMENT-MIGRATION-V1`
> **선행 기준 모델**: GlycoPharm (`IR-/WO-O4O-GLYCOPHARM-ADMIN-SCOPE-CLEANUP-*`)
> **목적**: K-Cosmetics operator 에 문의 관리(처리) 기능을 제공. KCos 의 엄격한 `scopeRoleMapping` 때문에 GlycoPharm 의 frontend-only 패턴을 그대로 복제할 수 없으므로, backend 가드를 최소 조정한다.
> **작성일**: 2026-06-16
> **상태**: 코드 완료 · app/api typecheck PASS · browser smoke 배포 후 대기

---

## 1. 결론 요약

- K-Cosmetics operator 에 `문의 관리`(`/operator/contacts`) 신설 완료.
- **backend 가드 1라인 조정 필요** (GlycoPharm 과의 결정적 차이). 문의 **관리** 컨트롤러 가드를 `admin` → `operator` 레벨로 변경.
- 문의 **설정** 컨트롤러는 손대지 않음 → admin 전용 유지.
- DB/모델/설정 구조 변경 없음.

---

## 2. K-Cosmetics scopeRoleMapping 조사 결과 & GlycoPharm 과의 차이

`packages/security-core/src/service-configs.ts`

| 서비스 | scopeRoleMapping | 문의 가드 `requireServiceLegalScope('admin')` 시 operator 접근 |
|--------|------------------|--------------------------------------------------------------|
| **GlycoPharm** | **없음** | scope=`glycopharm:admin` → 매핑 없어 fallback `allowedRoles`(admin+operator) → **operator 통과** (frontend-only로 충분했던 이유) |
| **K-Cosmetics** | `'cosmetics:admin': ['cosmetics:admin']` / `'cosmetics:operator': ['cosmetics:operator','cosmetics:admin']` | scope=`cosmetics:admin` → 매핑 `['cosmetics:admin']` 만 → **operator 403** ← GlycoPharm 패턴 복제 시 실패 지점 |

→ 가설(KCos operator 403) **코드로 확정**. GlycoPharm 처럼 frontend route 만 붙이면 KCos operator 는 문의 API 에서 403.

---

## 3. backend 가드 변경 (최소 조정)

**변경 파일**: `apps/api-server/src/modules/contact-inquiry/admin-contact-inquiry.controller.ts`

- 문의 **관리** 4개 라우트(list/detail/status/note)의 가드: `requireServiceLegalScope('admin')` → **`requireServiceLegalScope('operator')`** (변수 `adminGuard` → `manageGuard`).
- 효과:
  - KCos: scope=`cosmetics:operator` → `['cosmetics:operator','cosmetics:admin']` → **operator·admin 모두 통과** (403 해소).
  - GlycoPharm: scope=`glycopharm:operator` → 매핑 없어 fallback `allowedRoles`(admin+operator) → 그대로 통과 (**기존 동작 동일, 무회귀**).
  - `admin ⊃ operator` 이므로 admin 도 계속 통과.

### Shared Module 영향 분석 (이 컨트롤러는 GP/KCos 공통)
- 이 컨트롤러 소비처: `register-routes.ts` 단일 마운트 1곳. serviceKey 화이트리스트 = `glycopharm`, `k-cosmetics` 만.
- KPA/Neture 는 자체 contact 시스템 → 본 컨트롤러 미사용 → 영향 없음.
- membership guard(active membership 요구)·platformBypass(super_admin) 로직 불변.
- 문의 **설정** 컨트롤러(`admin-service-contact-settings.controller.ts`, `requireServiceLegalScope('admin')`)는 **미변경** → 설정은 admin 전용 유지.

---

## 4. 변경 파일 목록

| 파일 | 변경 |
|------|------|
| `apps/api-server/.../admin-contact-inquiry.controller.ts` | 가드 `admin` → `operator` (4 라우트 공통) + 주석 |
| `services/web-k-cosmetics/src/pages/operator/OperatorContactInquiriesPage.tsx` | **신규** — operator 전용 wrapper(admin 비의존, 자체 어댑터) |
| `services/web-k-cosmetics/src/config/operatorMenuGroups.ts` | `content` 그룹에 `{ '문의 관리', /operator/contacts }` 추가 |
| `services/web-k-cosmetics/src/App.tsx` | lazy import + `<Route path="contacts">` 추가 |

---

## 5. operator 메뉴 위치 / route / 재사용

- **메뉴 위치**: `content` 그룹(커뮤니티 운영 도메인) — 공지사항/뉴스·설문조사 관리 다음. GlycoPharm 과 동일한 배치.
- **route**: `/operator/contacts` (GlycoPharm 과 동일 canonical).
- **재사용 component**: `ContactInquiryAdminPage`(`@o4o/operator-core-ui/modules/contact-inquiry`) — admin wrapper 와 동일 컴포넌트. 신규 화면 로직 0.
- **API**(경로 불변): `GET/PATCH /api/v1/admin/services/k-cosmetics/contact-inquiries*`.
- **admin 비의존**: operator 페이지는 admin `ContactInquiriesPage` 를 import 하지 않고 자체 어댑터 보유 → 후속 admin 제거 시 안전.

---

## 6. 문의 설정 admin 유지 여부

- `admin-service-contact-settings.controller.ts` 미변경 → 문의 설정 API 는 `requireServiceLegalScope('admin')` 그대로.
- KCos admin `/admin/settings/contact`(`ServiceContactSettingsPage`) 미변경.
- ⇒ **문의 설정은 admin 전용 유지** (WO §5.2 충족).

---

## 7. admin 문의 관리 제거 가능 여부

- operator 문의 관리(`/operator/contacts`)가 정상 동작하면, 다음 WO(`WO-O4O-KCOS-ADMIN-SCOPE-CLEANUP-V1`)에서 admin 측 진입점 제거 가능.
- 본 WO 는 admin 문의 관리(`/admin/contact-inquiries` + `pages/admin/ContactInquiriesPage.tsx`)를 **건드리지 않음**(보존, 무회귀).

---

## 8. 검증 결과

| 항목 | 결과 |
|------|------|
| KCos scopeRoleMapping 조사 | ✅ 엄격 확인 (operator 403 확정) |
| backend 가드 operator 조정 | ✅ 문의 관리 4라우트만, 설정 미변경 |
| operator 메뉴 노출 (코드) | ✅ content 그룹 추가 |
| `/operator/contacts` route | ✅ 추가 |
| operator 페이지 admin 비의존 | ✅ 자체 어댑터 |
| 문의 설정 admin 전용 유지 | ✅ 미변경 |
| admin 문의 관리 무회귀 | ✅ 미변경 |
| GlycoPharm 무회귀 (가드 공통 변경) | ✅ fallback 동일 통과 — 동작 불변 |
| KCos app typecheck (`tsc`) | ✅ PASS (에러 0) |
| api-server typecheck (`tsc --noEmit`) | ✅ PASS (EXIT 0) |
| browser smoke | ⏳ 배포 후 |

### browser smoke 체크리스트 (배포 후)
```
KCos operator 로그인 → 사이드바 '커뮤니티 운영 > 문의 관리' 노출
/operator/contacts → 문의 목록 200 (403 아님 — 핵심 검증)
문의 상세 200 / 상태 변경·메모 200
KCos admin: /admin/settings/contact 기존 동작 유지
GlycoPharm operator: /operator/contacts 여전히 정상 (가드 공통 변경 무회귀 확인)
```

> ⚠️ 본 WO 의 핵심 리스크는 backend 가드 변경의 **cross-service 영향**(GP/KCos 공통)이다. 배포 후 smoke 에서 GlycoPharm operator 문의 관리가 여전히 정상인지 반드시 함께 확인할 것.

---

## 9. 후속 작업

```
WO-O4O-KCOS-ADMIN-SCOPE-CLEANUP-V1
  - admin 문의 관리 진입점 제거
  - 역할 관리 제거 여부 확인
  - 매장/네트워크성 admin 메뉴 제거 여부 확인
  - 회원 관리 → 회원 데이터 관리 라벨/범위 정리
  - Finance/정산성 현상 유지
  - 법정정보·약관 / 문의 설정 유지
```

이후: KPA-Society(보강 중심) → Neture(admin/platform 분리 IR).

---

*backend 1라인 가드 조정(GP/KCos 공통, 무회귀) + frontend operator 이관. DB/모델 무변경. app·api typecheck PASS.*
