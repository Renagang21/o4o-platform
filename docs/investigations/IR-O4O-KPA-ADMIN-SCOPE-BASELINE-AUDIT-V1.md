# IR-O4O-KPA-ADMIN-SCOPE-BASELINE-AUDIT-V1

> **성격**: read-only 조사 IR — 코드/UI/API/DB/migration/guard/menu 수정 0. 문서 1개만 생성.
> **목적**: KPA-Society admin 이 "서비스 admin" 역할(서비스 설정 / 법정정보·약관 / 문의 설정 / 회원 데이터 관리 / 공개 상태 확인)을 수행하기에 충분한지 조사하고, 부족분 보강 + 제거 후보를 후속 WO 범위로 확정.
> **작성일**: 2026-06-11
> **조사 기준 commit**: `3ce37df29` (main, working tree clean)
> **조사 도구**: 3 병렬 Explore agent (admin/operator route·menu · KPA legal/contact/member backend·guard · 공개 정책 페이지·footer 흐름) + 직접 검증
> **선행/관련**: `IR-O4O-CROSSSERVICE-FOOTER-LEGAL-DISPLAY-REQUIREMENTS-V1` · `IR-O4O-SERVICE-LEGAL-POLICY-SETTINGS-MANAGEMENT-AUDIT-V1`(일부 결론 **갱신됨** — §3 참조)

---

## 0. 핵심 결론 (TL;DR)

> ⚠️ **KPA admin 의 핵심 gap = "서비스 법정정보(service_legal_profiles) 편집 UI 부재" 1종 + "정책문서 이중 트랙(kpa_legal_documents vs service_policy_documents) 결정" 1종.** 그 외 admin/operator 경계는 대체로 정상.
>
> 1. **중요 환경 변화**: 선행 IR(`...SETTINGS-MANAGEMENT-AUDIT-V1`) 작성 이후, **cross-service `service_legal_profiles` + `service_policy_documents` 가 이미 구현됨**(entity+public+admin controller). 선행 IR 의 "법정정보 entity/API 부재" 결론은 **갱신**한다.
> 2. **KPA Footer 는 이미 `service_legal_profiles` 를 동적 소비**(`/api/v1/public/services/kpa-society/footer-legal`, 값 없으면 비표시 — placeholder 없음). 하드코딩 아님.
> 3. **그러나 KPA admin 에 `service_legal_profiles` 편집 UI 가 없음.** GP/KCos/Neture 는 `pages/admin/ServiceLegalSettingsPage.tsx`(공유 모듈 `operator-core-ui/service-legal`) 보유 — **KPA 만 미도입.** → KPA 운영자는 자기 서비스 footer 법정정보를 채울 수 없음(현재 빈 표시). **primary gap.**
> 4. **정책문서 이중 트랙**: KPA 공개 `/policy`·`/privacy` 는 **legacy `kpa_legal_documents`** 를 읽음(편집 = `/operator/legal` LegalManagementPage, kpa:admin). cross-service `service_policy_documents` 는 KPA 미연결. → 공유 ServiceLegalSettingsPage 도입 시 정책문서가 **두 시스템 공존** 위험 → 결정 필요.
> 5. **admin/operator 경계는 대체로 정상**: 회원(admin=hard-delete / operator=soft) 분리 ✓, 문의(admin=문의 설정 / operator=문의 처리) 분리 ✓.
> 6. **정책 점검 항목**: `/operator/roles`(adminOnly, kpa:admin 이 kpa:operator/kpa:admin 부여) — WO 정책상 "운영자 지정=O4O 전체 관리자 영역" 과의 정합 결정 필요(즉시 제거 단정 금지 — KPA `platformBypass:false` 로 super_admin cross 불가하므로 service admin 의 within-service 부여가 필요할 수 있음).
> 7. **공개 상태(readiness) 점검 화면 없음** — 법정정보/약관/개인정보/문의설정/푸터 게시 상태를 한 화면에서 확인 불가. gap.

**권고**: ① KPA 에 공유 `ServiceLegalSettingsPage` 도입(footer 법정정보 편집) → ② 정책문서 트랙 결정(kpa_legal_documents 유지 vs service_policy_documents 이관) → ③ readiness 점검 화면 → ④ role 관리 정책 정합.

---

## 1. KPA admin 현재 메뉴표 (실측)

`services/web-kpa-society/src/routes/AdminRoutes.tsx` + `components/admin/AdminSidebar.tsx`.

| 메뉴 | route | component | API | 기능 | admin 적합 | operator 중복 |
|---|---|---|---|---|:--:|---|
| 관리자 홈 | `/admin/kpa-dashboard` | `pages/admin/KpaAdminDashboardPage.tsx` | KPA 구조 KPI + 최근 가입 신청 | 구조/거버넌스 KPI | ✅ | 없음 |
| 회원 관리 | `/admin/members` | `pages/admin/AdminMemberManagementPage.tsx` | `DELETE /kpa/members/:id?mode=hard` (kpa:admin) | **완전삭제 전용**(오등록/면허중복 정리, 단건) | ✅ | operator=soft(상태변경), 의도된 분리 |
| 문의 설정 | `/admin/settings/contact` | `pages/admin/ServiceContactSettingsPage.tsx` | ServiceContactSettings(수신자/자동응답) | 알림 수신자·자동응답 설정 | ✅ | 없음(문의 처리는 operator) |

→ admin 메뉴 3종. 모두 admin 성격에 적합. **단 "서비스 법정정보·약관 설정" 메뉴가 없음.**

## 2. KPA operator 대응 메뉴 (adminOnly 항목 포함)

`config/operatorMenuGroups.ts` SYSTEM 그룹의 **adminOnly** 항목(=kpa:admin 만 노출):

| 메뉴 | route | guard | 편집 대상 |
|---|---|---|---|
| 법률 관리 | `/operator/legal` | `RoleGuard[kpa:admin, platform:super_admin]` | **`kpa_legal_documents`** (terms/privacy draft·publish) |
| 감사 로그 | `/operator/audit-logs` | adminOnly | kpa audit |
| 역할 관리 | `/operator/roles` | adminOnly | kpa:operator/kpa:admin 부여 |

→ **법정 문서 관리는 `/admin` 이 아니라 `/operator/legal`(adminOnly)** 에 위치(아키텍처: 공유 OperatorAreaShell + role filter). 즉 KPA admin 은 "법정문서 관리 부재"가 아니라 **legacy 트랙(`kpa_legal_documents`)으로 보유**.

## 3. 법정정보·약관 데이터 흐름 (중요 — 선행 IR 갱신)

> 선행 IR `...SETTINGS-MANAGEMENT-AUDIT-V1` 은 "service_legal_profiles 부재, 신규 필요"로 기록했으나, **그 이후 cross-service 구현 완료**. 본 IR 이 최신.

| 트랙 | entity/table | KPA 사용 | 편집 UI(KPA) | 공개 표시(KPA) |
|---|---|:--:|---|---|
| **Footer 법정정보** | `service_legal_profiles` (cross-service) | ✅ READ | ❌ **없음** | Footer.tsx → `PublicLegalFooterInfo serviceKey="kpa-society"` → `GET /api/v1/public/services/kpa-society/footer-legal` (값 없으면 비표시) |
| **정책 문서(약관/개인정보)** | `kpa_legal_documents` (KPA legacy) | ✅ READ+WRITE | `/operator/legal` LegalManagementPage (kpa:admin) | `/policy`·`/privacy` → `LegalDocumentView` → `GET /kpa/legal/documents/published/:type` |
| **정책 문서(cross-service)** | `service_policy_documents` | ❌ 미연결 | (GP/KCos/Neture 는 ServiceLegalSettingsPage 로 사용) | — |

- cross-service entity 위치: `apps/api-server/src/modules/service-legal/entities/{ServiceLegalProfile,ServicePolicyDocument}.entity.ts`. public controller: `public-service-legal.controller.ts`(`/:serviceKey/legal-profile`·`/footer-legal`·`/policies/:type`). admin controller: `admin-service-legal.controller.ts`(`PUT /:serviceKey/legal-profile` 등, `requireServiceLegalScope('admin')`).
- 공유 admin UI: `packages/operator-core-ui/src/modules/service-legal/ServiceLegalSettingsPage.tsx`.

## 4. footer 법정정보 표시 흐름

`services/web-kpa-society/src/components/Footer.tsx`:
- 법정 링크: `<Link to="/policy">이용약관</Link>`, `<Link to="/privacy">개인정보처리방침</Link>` — **둘 다 실재 route(App.tsx:898-899), 데드링크 아님.**
- copyright: `Copyright © 2026 약사회. All Rights Reserved.` (하드코딩, 법정정보 아님)
- 법정정보 블록: `<PublicLegalFooterInfo serviceKey="kpa-society" loadProfile={loadFooterLegal} />` → `service_legal_profiles` 동적 조회, **값 없으면 비표시(placeholder 없음)**.
- → KPA footer 는 placeholder 위험 없음(GP/KCos 와 달리 이미 동적). 단 **service_legal_profiles 가 비어 있으면 footer 법정정보가 영구 공백** — 채울 admin UI 가 없는 것이 문제.

## 5. /policy · /privacy 공개 문서 흐름

| route | exists | component | 데이터 소스 | 상태 |
|---|:--:|---|---|---|
| `/policy` (이용약관) | ✅ App.tsx:898 | `pages/legal/PolicyPage.tsx` → `LegalDocumentView documentType="terms"` | `GET /kpa/legal/documents/published/terms` (`kpa_legal_documents`) | LIVE (미게시 시 "공개된 문서 없음") |
| `/privacy` (개인정보처리방침) | ✅ App.tsx:899 | `pages/legal/PrivacyPage.tsx` → `documentType="privacy"` | `.../published/privacy` | LIVE |
| `/terms` | ❌ | — | — | 미구현(legacy `/terms→/policy` 주석) |
| `/contact` | ✅ App.tsx:893 | `pages/contact/ContactPage.tsx` | 모달 폼 → `POST /kpa/contact-requests` | LIVE |

→ KPA 정책 페이지는 **legacy `kpa_legal_documents`** 기반으로 정상 동작. orphaned 아님(이전 IR 의 "orphaned PolicyPage" 는 현재 route 연결됨 — 갱신).

## 6. 문의 설정 / 문의 관리 역할 분리

| 영역 | 위치 | guard | 비고 |
|---|---|---|---|
| 문의 **설정**(수신자/자동응답) | `/admin/settings/contact` (ServiceContactSettingsPage) | admin | ✅ admin 적합 |
| 문의 **처리**(목록/상태변경) | `/operator/contact-requests` | `kpa:operator` | ✅ operator 적합 |
| 문의 접수(공개) | `POST /kpa/contact-requests` | public | privacyConsent 필수 |

→ **설정=admin / 처리=operator 분리 정상.** WO 정책과 정합.

## 7. 회원 관리 기능 성격 판단

| 구분 | 위치 | guard | delete 모델 |
|---|---|---|---|
| operator 회원 관리 | `/operator/members` (MemberManagementPage) | kpa:operator | **soft**: approve/reject/suspend/restore/withdraw (`PATCH /kpa/members/:id/status`), bulk 허용 |
| admin 회원 관리 | `/admin/members` (AdminMemberManagementPage) | kpa:admin | **hard**: 완전삭제(`DELETE ?mode=hard`, 단건, delete-risk 확인 + audit) — KPA 프로필/멤버십/role 삭제, user 레코드는 타 서비스 멤버십 없을 때만 비활성 |

→ **soft(operator) / hard-delete·개인정보 파기(admin) 분리 이미 구현.** WO §5.4 기준 충족. 라벨 변경(회원 데이터 관리)은 선택적 미세 정합 — 구조는 정상.

## 8. admin 에 필요한 보강 기능 (gap)

| # | gap | 현황 | 보강 방향 |
|:-:|---|---|---|
| G1 | **서비스 법정정보(service_legal_profiles) 편집 UI** | KPA 만 `ServiceLegalSettingsPage` 미도입(GP/KCos/Neture 보유) | 공유 모듈 `operator-core-ui/service-legal` 의 `ServiceLegalSettingsPage` 를 KPA admin 에 wire (serviceKey="kpa-society") |
| G2 | **정책문서 트랙 결정** | 공개 정책 = legacy `kpa_legal_documents`; cross-service `service_policy_documents` 미사용 | (A) legacy 유지 + 공유 UI 는 법정정보만 / (B) service_policy_documents 이관 + `/policy`·`/privacy` 소스 교체 + kpa_legal_documents 마이그레이션 — **결정 필요** |
| G3 | **공개 상태(readiness) 점검 화면** | 없음 | 법정정보 입력/약관 게시/개인정보 게시/문의 설정/footer 표시 상태를 admin 홈·설정에서 점검 |

## 9. admin 에서 제거/재배치 검토 항목

| # | 항목 | 현황 | 판단 |
|:-:|---|---|---|
| R1 | 역할 관리 `/operator/roles` (adminOnly) | kpa:admin 이 kpa:operator/kpa:admin 부여 | WO 정책("운영자 지정=O4O 전체 관리자")과 충돌 가능. **단 즉시 제거 금지** — KPA `platformBypass:false`(super_admin cross 불가)로 service admin 의 within-service 부여가 운영상 필요할 수 있음. **정책 결정 항목**(O4O 전체관리자 부여 모델 확정 후). |

→ G/KCos cleanup 처럼 "과대 admin 축소"가 아니라, KPA 는 **role 관리의 소속(서비스 admin vs 전체관리자) 정의**가 핵심 결정. 회원/문의/법정 경계는 이미 정상이므로 제거 대상 거의 없음.

## 10. 후속 WO 제안 (WO §8 기준 갱신)

| WO(가칭) | 목표 | 비고 |
|---|---|---|
| **WO-O4O-KPA-ADMIN-SERVICE-LEGAL-SETTINGS-WIRING-V1** | KPA admin 에 공유 `ServiceLegalSettingsPage` 도입 → footer 법정정보(service_legal_profiles) 편집 가능. (WO §8.1 구체화) | **primary**, 저위험(공유 모듈 재사용, GP/KCos/Neture 선례). 정책문서 탭은 G2 결정에 따름 |
| **IR/WO-O4O-KPA-POLICY-DOCUMENT-TRACK-DECISION-V1** | `kpa_legal_documents`(legacy) vs `service_policy_documents`(cross-service) 단일화 결정 + (이관 시) `/policy`·`/privacy` 소스 교체·데이터 마이그레이션 | **선행 결정 필요**. 이중 표시·중복 편집 방지 |
| WO-O4O-KPA-ADMIN-PUBLIC-READINESS-CHECK-V1 | 법정정보/약관/개인정보/문의설정/footer 게시 상태 점검 화면 | WO §8.4 |
| (정책) WO-O4O-KPA-ROLE-ASSIGNMENT-SCOPE-DECISION-V1 | `/operator/roles` 의 소속(service admin vs 전체관리자) 확정 | platformBypass 정책 고려 |
| (선택) WO-O4O-KPA-ADMIN-MEMBER-DATA-LABEL-ALIGNMENT-V1 | 회원 관리 라벨 "회원 데이터 관리" 정합 | 구조는 이미 정상 — 라벨만 |

> WO §8.2(회원 데이터 관리 정리)·§8.3(문의 역할 분리)는 **이미 구현 완료** 확인 → 신규 WO 불필요(라벨 정합만 선택). WO §8.1 은 위 wiring WO 로 구체화. G2(정책 트랙) 가 추가 발견된 선결 항목.

## 11. 위험 및 주의사항

- ⚠️ **정책문서 이중 트랙(G2) 미결정 상태에서 공유 ServiceLegalSettingsPage 의 정책문서 탭을 KPA 에 켜면, `/policy`·`/privacy`(kpa_legal_documents) 와 service_policy_documents 가 동시 존재** → 운영자 혼란·이중 게시 위험. wiring WO 는 **법정정보(service_legal_profiles) 먼저**, 정책문서는 G2 결정 후.
- ⚠️ KPA `platformBypass:false` — cross-service admin guard(`requireServiceLegalScope('admin')`)가 KPA 에서 `kpa:admin` 으로 해석되는지(super_admin 우회 불가) 도입 전 확인 필요.
- ⚠️ KPA footer 는 이미 동적(placeholder 없음) — GP/KCos 의 0단계 placeholder 제거 대상 아님(정상).
- 본 IR 은 read-only 조사이며 확정 법률 자문 아님. role 소속·정책 트랙은 정책 결정 동반.

---

## 부록 — 조사 산출/제약 + 핵심 파일

| 항목 | 값 |
|------|------|
| 수정 파일 | 없음 (read-only IR) |
| 생성 문서 | `docs/investigations/IR-O4O-KPA-ADMIN-SCOPE-BASELINE-AUDIT-V1.md` (유일) |
| 조사 기준 commit | `3ce37df29` |
| KPA admin 메뉴 | 관리자 홈 / 회원 관리(hard-delete) / 문의 설정 — 3종 |
| primary gap | service_legal_profiles 편집 UI 부재(KPA 만) |
| 결정 선결 | 정책문서 트랙(kpa_legal_documents vs service_policy_documents) |
| 경계 정상 | 회원(hard/soft) · 문의(설정/처리) 분리 |
| 정책 검토 | /operator/roles 소속 |
| git status | working tree clean |
| commit hash | (commit 후 기재) |

**핵심 참조 파일**:
`services/web-kpa-society/src/routes/AdminRoutes.tsx` · `routes/OperatorRoutes.tsx` · `config/operatorMenuGroups.ts` ·
`components/admin/AdminSidebar.tsx` · `pages/admin/{KpaAdminDashboardPage,AdminMemberManagementPage,ServiceContactSettingsPage}.tsx` ·
`pages/operator/{LegalManagementPage,RoleManagementPage}.tsx` · `pages/legal/{PolicyPage,PrivacyPage}.tsx` · `components/Footer.tsx` · `lib/footerLegal.ts` ·
`apps/api-server/src/routes/kpa/controllers/{legal-documents,contact-request,member}.controller.ts` (+ `kpa.routes.ts`) ·
`apps/api-server/src/modules/service-legal/{entities,public-service-legal.controller,admin-service-legal.controller}.ts` ·
`packages/operator-core-ui/src/modules/service-legal/ServiceLegalSettingsPage.tsx` · `services/web-{glycopharm,k-cosmetics,neture}/src/pages/admin/ServiceLegalSettingsPage.tsx` (선례)
