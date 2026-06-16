# CHECK-O4O-KPA-ADMIN-SERVICE-LEGAL-SETTINGS-WIRING-V1

> WO: WO-O4O-KPA-ADMIN-SERVICE-LEGAL-SETTINGS-WIRING-V1
> 작업일: 2026-06-11
> 상태: PASS
> 선행: `IR-O4O-KPA-ADMIN-SCOPE-BASELINE-AUDIT-V1` (ffc22c6a3)

## 1. 작업 목적

KPA-Society admin 에서 footer 법정정보(`service_legal_profiles`, serviceKey='kpa-society')를 편집할 수 있게 한다. KPA footer 는 이미 `service_legal_profiles` 를 동적 소비하나, 이를 입력·수정할 admin UI 가 없어 footer 법정정보가 공백으로 남는 gap 을 해소한다.

**정책문서 트랙은 변경하지 않는다** — KPA `/policy`·`/privacy` 는 기존 legacy `kpa_legal_documents`(편집=`/operator/legal`) 유지.

## 2. 변경 파일 목록

| 파일 | 변경 | 비고 |
|---|---|---|
| `packages/operator-core-ui/src/modules/service-legal/types.ts` | `ServiceLegalTabKey` 타입 export + `enabledTabs?` prop 추가 | **공유 모듈**, backward-compatible(optional) |
| `packages/operator-core-ui/src/modules/service-legal/ServiceLegalSettingsPage.tsx` | `enabledTabs` 로 탭 노출 제어 + 숨긴 탭의 정책문서 조회 skip | **공유 모듈** |
| `services/web-kpa-society/src/pages/admin/ServiceLegalSettingsPage.tsx` | 신규 KPA wrapper (coreApiClient 어댑터, `enabledTabs={['profile']}`, 안내문구) | 신규 |
| `services/web-kpa-society/src/routes/AdminRoutes.tsx` | `/admin/settings/legal` route 추가 | |
| `services/web-kpa-society/src/components/admin/AdminSidebar.tsx` | 설정 그룹에 `법정정보 설정` 항목 추가 | |
| `docs/investigations/CHECK-O4O-KPA-ADMIN-SERVICE-LEGAL-SETTINGS-WIRING-V1.md` | 본 문서 | 신규 |

## 3. KPA admin 메뉴 추가 위치

- `AdminSidebar.tsx` `설정` 그룹 → 기존 `문의 설정` + 신규 `법정정보 설정`(2 항목 → collapsible 그룹으로 표시). admin 전용(`/admin/*` = AdminAuthGuard).

## 4. KPA admin route

- `/admin/settings/legal` (AdminRoutes.tsx, `AdminAuthGuard` + `AdminLayout` 하위). KPA admin 권한 접근.

## 5. 사용한 shared component / KPA wrapper 설명

- 공유 `@o4o/operator-core-ui/modules/service-legal` `ServiceLegalSettingsPage` 재사용.
- WO §5.3 우선순위 적용: 공유 컴포넌트에 **탭 제어 prop(`enabledTabs`)** 을 추가(option 2 실현). KPA wrapper 는 `enabledTabs={['profile']}` 로 **법정정보 탭만** 노출 → service_policy_documents 편집(정책 문서 탭)·공개상태 탭 숨김.
- `enabledTabs` 는 optional(미지정 시 전체 3탭) → GP/KCos/Neture 무영향(backward-compatible, 4 서비스 tsc 검증).
- 숨긴 탭은 `service_policy_documents` 조회 자체를 skip(loadPolicies 가드).
- KPA wrapper 상단에 안내문구: "이 화면은 footer 법정정보를 관리합니다. 약관·개인정보처리방침 문서는 운영자 → 법률 관리에서 관리됩니다." (WO §6.2)

## 6. serviceKey='kpa-society' 고정 확인

- wrapper `const SERVICE_KEY = 'kpa-society';` — api 호출 전부 `/admin/services/kpa-society/legal-profile`. 타 서비스 legal profile 미접근.

## 7. footer 법정정보 반영 흐름

- KPA Footer `PublicLegalFooterInfo serviceKey="kpa-society"` → `GET /api/v1/public/services/kpa-society/footer-legal`(`service_legal_profiles`).
- admin `PUT /api/v1/admin/services/kpa-society/legal-profile` 저장 → 동일 `service_legal_profiles` row → 공개 footer API 반영.
- 미입력 항목/비활성 → footer 비표시(placeholder 없음). 흐름 불변.

## 8. 정책문서 트랙 미변경 확인

- KPA `/policy`·`/privacy`(App.tsx) → `LegalDocumentView` → `GET /kpa/legal/documents/published/:type`(`kpa_legal_documents`) — **미변경**.
- `/operator/legal` LegalManagementPage(kpa_legal_documents 편집, kpa:admin) — **미변경**.
- `service_policy_documents` 를 KPA 공개 정책문서에 **연결하지 않음**(정책 문서 탭 숨김으로 KPA 운영자가 service_policy_documents 를 생성/편집하지 않음).

## 9. 보존 확인 (회귀 없음)

- `/policy`·`/privacy`·`/operator/legal`·문의 설정(`/admin/settings/contact`)·회원 관리(`/admin/members`) 코드 미변경.
- GP/KCos/Neture 소스 미수정(공유 모듈 optional prop 만 추가) — 4 서비스 tsc PASS 로 backward-compat 확인.

## 10. typecheck 결과

| 대상 | 명령 | 결과 |
|---|---|---|
| web-kpa-society (신규 wiring) | `tsc --noEmit` | PASS (EXIT 0) |
| web-glycopharm (공유 모듈 소비처) | `tsc -b --noEmit` | PASS |
| web-k-cosmetics (소비처) | `tsc --noEmit` | PASS |
| web-neture (소비처) | `tsc --noEmit` | PASS |
| web-kpa-society build | `vite build` | PASS (✓ built) |

## 11. browser smoke 결과 / 보류 사유

- **보류(정적 검증으로 대체)**: 화면 접근에 kpa:admin 인증 + 배포 환경 필요. typecheck(4 서비스) + build + 코드 경로 정적 분석으로 검증.
- 배포 후 권장 확인: KPA admin 로그인 → 설정 → 법정정보 설정 진입 → `serviceKey=kpa-society` legal-profile 조회/저장 → 공개 footer 반영. 정책 문서 탭이 노출되지 않는지 확인.

## 12. 후속 정책문서 트랙 결정 필요 여부

- **필요**: `IR/WO-O4O-KPA-POLICY-DOCUMENT-TRACK-DECISION-V1` — KPA 가 legacy `kpa_legal_documents` 유지 vs cross-service `service_policy_documents` 통합. 결정 시 본 wrapper 의 `enabledTabs` 를 `['profile','policies','status']` 로 확장 + `/policy`·`/privacy` 소스 교체 + 데이터 마이그레이션.
- 그 전까지 KPA 는 법정정보(admin) / 정책문서(operator legacy) 이원 운영.

## 13. commit hash

- (commit 후 기재)
