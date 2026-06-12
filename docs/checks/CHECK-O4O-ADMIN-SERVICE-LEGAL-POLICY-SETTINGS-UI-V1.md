# CHECK-O4O-ADMIN-SERVICE-LEGAL-POLICY-SETTINGS-UI-V1

> `WO-O4O-ADMIN-SERVICE-LEGAL-POLICY-SETTINGS-UI-V1` 결과.
> serviceKey 기반 법정정보·약관 설정 Admin UI 를 **공통 컴포넌트(@o4o/operator-core-ui/modules/service-legal)**
> 로 1회 작성하고 **Neture Admin 에만 우선 연결**. backend/API/DB/migration·공개 푸터·`/terms`·`/privacy`
> 무변경. 실값/placeholder seed 없음.
> **결과: CODE PASS** (tsc web-neture 0 + build 0). 배포 후 브라우저 smoke 예정. — 2026-06-12

---

## 1. 작업 목적
운영자가 Admin 에서 서비스별 법정정보 + 약관/정책 문서를 직접 입력·수정할 수 있는 공통 UI 제공.
선행 backend(`WO-O4O-SERVICE-LEGAL-POLICY-SETTINGS-BACKEND-V1`)의 admin API 를 소비. 실값 입력은 운영자 몫.

## 2. 선행 backend API 반영
- `GET/PUT /api/v1/admin/services/:serviceKey/legal-profile`
- `GET/POST /api/v1/admin/services/:serviceKey/policies`, `PUT .../policies/:id`, `PATCH .../policies/:id/publish`
- 빈 값 저장 시 backend 가 ''→null 정규화 / 미설정 public null / 미게시 public 404 — UI 가 이 계약을 전제.

## 3. Admin UI 추가 위치 (Neture 우선 — 사용자 결정)
- **공통 컴포넌트**: `packages/operator-core-ui/src/modules/service-legal/` (기존 module/wrapper 주입 패턴 동일)
  - `types.ts` — `ServiceLegalApi` 어댑터 + DTO + `POLICY_DOCUMENT_TYPES`
  - `ServiceLegalSettingsPage.tsx` — 3탭 UI (inline style, 서비스 Tailwind 비의존)
  - `index.ts` + `package.json` export `./modules/service-legal`
- **Neture wrapper**: `services/web-neture/src/pages/admin/ServiceLegalSettingsPage.tsx`
  — authClient(`api`) 기반 어댑터 주입(serviceKey='neture'), 401/403/404/400 상태별 메시지 매핑.

## 4. 메뉴/라우트 추가
- 라우트: `services/web-neture/src/App.tsx` — `/admin/settings/legal-terms` (AdminRoute + AdminLayoutWrapper, lazy).
- 메뉴: `services/web-neture/src/config/operatorMenuGroups.ts` `getAdminMenu().system` 에 "법정정보·약관 설정".

## 5. 법정정보 탭
- 6 그룹(사업자 기본 / 고객문의 / 통신판매 / 개인정보보호 / 호스팅·거래안전 / 고지문구) 16 필드 + isActive 토글.
- 빈 값 저장 가능(placeholder 자동 입력 없음). 안내: "입력되지 않은 항목은 공개 푸터에서 표시되지 않습니다."
- 저장=PUT, 성공/실패/권한 메시지 배너.

## 6. 정책 문서 탭
- 목록(유형/제목/버전/상태/시행일/게시일/수정일) + 새 문서/편집(본문 textarea) + 게시/게시해제.
- documentType 화이트리스트 select(terms/privacy/refund/…/custom). draft 저장 ↔ publish 분리.
- 안내: "게시된 정책 문서만 공개 화면에서 조회됩니다."
- 본문은 V1 textarea(KPA LegalManagementPage 동일 관례). RichTextEditor 전환은 후속 개선 여지.

## 7. 공개 상태 확인 탭
- 법정정보 활성/입력 존재, terms·privacy 게시 여부 표시. "확인 필요"=미입력/미게시.
- **금지 표현(법적 준수 완료/충족/법무 검토 완료) 미사용** — "참고용, 법적 준수 판정 아님" 명시.

## 8. 사용한 API client
어댑터 `ServiceLegalApi`: `getLegalProfile / updateLegalProfile / listPolicies / createPolicy / updatePolicy / publishPolicy`.
Neture wrapper 가 `@o4o/auth-client` 의 `api`(axios)로 구현. publish 는 `PATCH .../publish {action}`.

## 9. 권한 처리 방식
- 메뉴/라우트는 기존 `AdminRoute` 게이트 하위(admin 영역). 공통 컴포넌트는 권한 우회 로직 없음.
- API 권한 결과를 그대로 표시: 403 → "이 서비스 설정을 수정할 권한이 없습니다." (우회 없음). serviceKey 는 wrapper 고정('neture').
- 저장/게시는 admin API 만 사용. public API 로 편집 시도 없음.

## 10. KPA platformBypass:false 고려
- 본 작업은 Neture wrapper 만 연결(serviceKey 고정 'neture'). KPA 미연결이라 직접 영향 없음.
- 공통 컴포넌트는 serviceKey 를 주입받을 뿐 권한을 판단하지 않으며, 권한은 backend `requireServiceLegalScope`
  (serviceKey 별 config — KPA 는 platformBypass=false) 가 결정. UI 는 그 결과만 표시 → KPA 정책 우회 불가.

## 11. placeholder 자동 입력 없음 확인
- 빈 필드는 빈 문자열로 표시/전송, backend 가 null 정규화. UI 가 "준비중/미정/N/A/홍길동/000-…" 류 생성 안 함. ✅

## 12. 공개 푸터 미수정 확인 / 13. /terms·/privacy route 미생성 확인
- 공개 푸터 컴포넌트, `/terms`·`/privacy` route 무변경. 본 작업은 Admin 입력 UI 한정. ✅

## 14. 검증 결과
- **tsc web-neture: 0** (공유 컴포넌트 소스 포함) ✅
- **web-neture build: 0** (lazy import + 공유 모듈 번들 정상) ✅
- 브라우저 smoke(배포 후): (갱신 예정)

## 15. commit hash
- (커밋 후 기재)

---

## 후속 과제 (CHECK 기록)
- **GP / K-Cosmetics wrapper 연결** — 동일 공통 컴포넌트에 serviceKey + authClient 어댑터만 주입(후속 WO).
- **KPA 통합** — KPA 는 기존 `/operator/legal` + `kpa_legal_documents` 유지(이번 제외). KPA 는 **법정정보(ServiceLegalProfile) 저장소가 없고**, KPA 약관이 `kpa_legal_documents`(별도) vs 신규 `service_policy_documents` 로 이원화됨 → **두 정책 문서 모델 일원화 + KPA 법정정보 도입**은 별도 통합 IR/WO 필요.
- **정책 문서 본문 RichTextEditor** 전환(현재 textarea), **공개 라우트/동적 푸터 연동**(WO-O4O-CROSSSERVICE-POLICY-ROUTES-V1 / DYNAMIC-LEGAL-FOOTER-V1).

*Date: 2026-06-12 · Status: CODE PASS. Neture 우선 연결, KPA 제외, GP/KCos 후속.*
