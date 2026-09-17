# CHECK-O4O-GP-KCOS-SERVICE-LEGAL-POLICY-SETTINGS-UI-ROLLOUT-V1

> `WO-O4O-GP-KCOS-SERVICE-LEGAL-POLICY-SETTINGS-UI-ROLLOUT-V1` 결과.
> Neture 에서 검증된 공통 컴포넌트 `@o4o/operator-core-ui/modules/service-legal` 를 K-Cosmetics
> Admin 에 wrapper/route/menu 만으로 연결(공통 컴포넌트·backend·Neture·KPA 무변경).
> 배포 후 브라우저 smoke 예정. — 2026-06-12

---

## 1. 작업 목적
선행 Neture 적용(`WO-O4O-ADMIN-SERVICE-LEGAL-POLICY-SETTINGS-UI-V1`)의 공통 UI 를 KCos 운영자도
쓸 수 있도록 롤아웃. 새 UI 제작 없이 각 서비스 wrapper + route + menu + api 어댑터만 추가.

## 2. 선행 Neture reference 반영
- 공통 컴포넌트 `ServiceLegalSettingsPage`(3탭) + `ServiceLegalApi` 어댑터 인터페이스 재사용.
- Neture wrapper 의 `toError`(401/403/404/400 매핑) + `api.get/put/post/patch('/admin/services/:serviceKey/...')`
  어댑터 패턴을 그대로 복제(serviceKey 만 변경).

## 4. K-Cosmetics wrapper/route/menu
- wrapper: `services/web-k-cosmetics/src/pages/admin/ServiceLegalSettingsPage.tsx` (serviceKey `'k-cosmetics'`).
- route: `services/web-k-cosmetics/src/App.tsx` — admin 부모 `<Route path="admin">` 하위 `settings/legal-terms`,
  lazy import. ProtectedRoute(`cosmetics:admin` / `platform:super_admin`) 게이트 하위.
- menu: `services/web-k-cosmetics/src/components/layouts/DashboardLayout.tsx` admin roleConfig `System` 그룹에
  `{ '법정정보·약관 설정', '/admin/settings/legal-terms' }`.

## 5. serviceKey 확인 결과
- KCos: **canonical `'k-cosmetics'`** 사용 (role prefix 는 `'cosmetics'` 이나 backend admin API path 는 canonical).
  KCos 코드(AuthContext 로그인 등)도 `'k-cosmetics'` 사용 — 일관. admin API path `/admin/services/k-cosmetics/*`.

## 6. 사용한 API adapter 패턴
- 두 서비스 모두 `@o4o/auth-client` `api`(axios, base `${API_BASE_URL}/api/v1`) → `/admin/services/:serviceKey/...`.
- 메서드: getLegalProfile / updateLegalProfile / listPolicies / createPolicy / updatePolicy / publishPolicy(PATCH).

## 7. 공통 컴포넌트 수정 여부
- **수정 없음.** `packages/operator-core-ui/**` 무변경(Neture smoke 에서 검증됨). wrapper 연결만 수행.

## 8. backend 미수정 확인
- `apps/api-server/**` 0건 (staged 가드 통과). API/DB/migration 무변경.

## 9. Neture / KPA 미수정 확인
- `services/web-neture/**`, `services/web-kpa-society/**` 0건. KPA 는 기존 `/operator/legal` 유지.

## 10. 공개 푸터 미수정 / 11. /terms·/privacy route 미생성
- 공개 푸터·`/terms`·`/privacy` 무변경. 본 작업은 Admin 입력 wrapper 연결 한정.

## 12. placeholder 자동 입력 없음
- 공통 컴포넌트 정책 그대로 — 빈 값 저장 가능, placeholder 자동 생성 없음.

## 13. 검증 결과
- 배포: Deploy Web Services (Cloud Run) success (47e913959 메뉴 fix f95d90bdb)

## 14. 브라우저 smoke 결과 (프로덕션, 각 서비스 admin 로그인)
- `/admin/settings/legal-terms` 진입 → 페이지 렌더, 3탭, 법정정보 16필드 빈값(data:null read) ✅

**K-Cosmetics** (k-cosmetics.site):
- admin 사이드바 System 그룹에 "법정정보·약관 설정" 노출 → 클릭 진입 ✅
- 페이지 렌더, **대상 서비스 'k-cosmetics'**(canonical), 3탭, 법정정보 16필드 빈값(read), 정책 문서 빈 목록 + "새 문서" ✅

- 두 서비스 모두 실값/테스트 데이터 미입력(프로덕션 오염 없음). 권한: 세션 만료 시 로그인 redirect.

## 15. commit hash
- 롤아웃 + CHECK: `47e913959`
- CHECK smoke 반영: (본 커밋)

---

## 후속 (WO §15)
1. `WO-O4O-CROSSSERVICE-POLICY-ROUTES-V1` — 공개 `/terms`·`/privacy` 정비(KPA 이원화는 통합 방향 확인 후).
2. `WO-O4O-CROSSSERVICE-DYNAMIC-LEGAL-FOOTER-V1` — 푸터 동적 연동.
3. `IR-O4O-KPA-LEGAL-DOCUMENTS-CROSSSERVICE-INTEGRATION-V1` — KPA `kpa_legal_documents` ↔ `service_policy_documents` 통합 조사.

*Date: 2026-06-12 · Status: CODE PASS. KCos 롤아웃, 공통 컴포넌트·backend·Neture·KPA 무변경.*
