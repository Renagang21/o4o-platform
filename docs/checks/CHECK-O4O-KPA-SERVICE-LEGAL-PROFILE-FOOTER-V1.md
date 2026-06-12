# CHECK-O4O-KPA-SERVICE-LEGAL-PROFILE-FOOTER-V1

> `WO-O4O-KPA-SERVICE-LEGAL-PROFILE-FOOTER-V1` 결과.
> KPA Society 공개 푸터의 **더미 주소/전화/팩스 + 하드코딩 사업자번호 제거** → `service_legal_profiles` public
> API 기반 동적 표시(`PublicLegalFooterInfo`). footer **dead link 정리**(`/terms`→`/policy`, `/sitemap` 제거,
> `/service-guide` 추가). `/operator/legal`·`kpa_legal_documents`·backend·타 서비스 무변경.
> **결과: CODE PASS** (tsc 0 + build 0). 배포 후 브라우저 smoke 예정. — 2026-06-12

---

## 1. 작업 목적
KPA 푸터의 더미/하드코딩 법정정보를 제거하고 serviceKey 기반 동적 표시로 전환(값 있을 때만, 미설정→비표시).
정책문서 통합(localStorage/kpa_legal_documents)은 범위 외 — 푸터 안전성 + dead link 정리에 한정.

## 2. 선행 IR 반영
- `IR-O4O-KPA-LEGAL-DOCUMENTS-CROSSSERVICE-INTEGRATION-V1` Phase 1(저위험 footer + dead link) 실행.
- 동적 footer 공통 컴포넌트(`PublicLegalFooterInfo`, GP/KCos/Neture 검증) 재사용.

## 3. KPA Footer 컴포넌트 위치
- `services/web-kpa-society/src/components/Footer.tsx` (inline style). `components/Layout.tsx` 에서 렌더(공개 페이지 전반).

## 4. 제거한 더미/하드코딩 항목
| 항목 | 기존 값 | 판정 | 처리 |
|------|---------|------|------|
| 주소 | `서울특별시 OO구 OO로 123 약사회관` | 더미(OO) | 제거 |
| 전화 | `02-1234-5678` | 더미 | 제거 |
| 팩스 | `02-1234-5679` | 더미 | 제거 |
| 이메일 | `info@kpa-society.kr` | 미확인 하드코딩 | 제거 |
| 운영사·사업자번호 | `㈜쓰리라이프존 \| 사업자등록번호 108-86-02873` | 실값이나 **코드 하드코딩** | 제거 |
- Contact Info 섹션 전체 삭제 + copyright 의 operatorText(사업자번호) 삭제. 브랜드 copyright("© 2026 약사회…")는 유지.

## 5. 사용한 public legal profile API
- `GET /api/v1/public/services/kpa-society/footer-legal` (is_active 법정정보만, 미설정/비활성→`data:null`).
- loader: `services/web-kpa-society/src/lib/footerLegal.ts` — module-level stable, **public 이라 plain `fetch`**(KPA 의 public 호출 관례, env `VITE_API_BASE_URL` base). 404/오류 → null(silent).

## 6. serviceKey 확인 결과
- KPA canonical service_key = **`kpa-society`** (admin/public API path 기준). loader/컴포넌트 모두 `'kpa-society'`.

## 7. 법정정보 비표시 기준
- 공통 `PublicLegalFooterInfo`: profile null(미설정/비활성)→아무것도 렌더 안 함. 필드 null→해당 줄 미표시.
  API 오류→silent(법정정보만 비표시, 푸터 전체 정상). plain-text(dangerouslySetInnerHTML 미사용).
- 현재 KPA service_legal_profile 미설정 → 푸터에 법정정보 **비표시**(placeholder 0).

## 8. 푸터 링크 정리 결과
| 링크 | 기존 to | 변경 to | route |
|------|---------|---------|-------|
| 약사회 소개 | /about | (유지) | ✅ 존재 |
| 이용 가이드 | /guide/intro | (유지) | ✅ |
| **서비스 안내** | (없음) | **/service-guide 추가** | ✅ 존재 |
| 협업 문의 | /contact | (유지) | ✅ |
| 이용약관 | **/terms(dead)** | **/policy** | ✅ (PolicyPage=이용약관) |
| 개인정보처리방침 | /privacy | (유지) | ✅ |
| 사이트맵 | **/sitemap(dead)** | **제거** | ❌ route 부재 |

## 9. /terms·/sitemap dead link 처리 결과
- `/terms` route 부재 → footer "이용약관" 링크를 실재 `/policy`(PolicyPage=이용약관)로 교체.
- `/sitemap` route 부재 → footer "사이트맵" 링크 제거.
- **새 route 신설 없음** — 정책문서 route 전환은 후속 `WO-O4O-KPA-LEGAL-POLICY-ROUTES-ALIGNMENT-V1`.

## 10. Admin/Operator 경계 원칙 (CHECK 명시)
- **법정정보·약관 설정은 Admin 설정 기능**이다. 일반 Operator 운영 메뉴에 신규 노출하지 않는다.
- 기존 KPA `/operator/legal`(정책문서 관리)은 본 작업에서 **수정하지 않음** — 정책문서 관리 기능으로 유지.
- KPA 법정정보 입력 경로는 후속 통합 작업에서 **공통 Admin `/admin/settings/legal-terms`(service_legal_profiles)** 로
  수렴 권장. 이번 작업은 KPA Admin UI 를 새로 연결하지 않음(푸터 표시 측만 동적 전환).
- service_legal_profiles 에 KPA 값 없으면 공개 푸터에 법정정보 비표시(GP/KCos/Neture 와 동일 패턴).

## 11. /operator/legal 미수정 / 12. kpa_legal_documents 미수정 / 13. backend 미수정
- `/operator/legal`(LegalManagementPage), `kpa_legal_documents`(entity/migration/controller), apps/api-server **0건 수정**.

## 14. 타 서비스 미수정 확인
- web-neture / web-glycopharm / web-k-cosmetics **0건**. packages/shared-space-ui **0건**(기존 컴포넌트 재사용, 결함 없음).

## 15. 검증 결과
- tsc web-kpa-society **0** ✅ / build **0** ✅

## 16. 브라우저 smoke 결과 (프로덕션 kpa-society.co.kr/, 로그아웃)
- footer nav: 약사회 소개(/about) · 이용 가이드(/guide/intro) · **서비스 안내(/service-guide 추가)** · 협업 문의(/contact)
  · **이용약관(/policy — dead /terms 교체)** · 개인정보처리방침(/privacy). **/sitemap 제거 확인** ✅
- Copyright "© 2026 약사회. All Rights Reserved." 만 — **더미 주소(서울특별시 OO구)·전화 02-1234-5678·팩스·
  info@kpa-society.kr·㈜쓰리라이프존·사업자등록번호 108-86-02873 전부 미노출** ✅
- 동적 법정정보 영역: profile 비어있어 **비표시(placeholder 0)** ✅. footer 레이아웃 정상 ✅
- dead link 0: footer 의 모든 링크가 실재 route(/about·/guide/intro·/service-guide·/contact·/policy·/privacy) ✅

## 17. commit hash
- 구현 + CHECK: `8831279bf` (web deploy success)
- CHECK smoke 반영: (본 커밋)

---

## 후속 작업
1. `WO-O4O-KPA-LEGAL-POLICY-ROUTES-ALIGNMENT-V1` — `/policy`·`/privacy` 를 localStorage→DB/공통 viewer 로 정렬(공개 단절 해소).
2. `WO-O4O-KPA-LEGAL-ADMIN-UI-CONSOLIDATION-V1` — KPA 법정정보·약관 설정 Admin 수렴, `/operator/legal` 정리.
3. `WO-O4O-CONTACT-DELIVERY-AND-NOTIFICATION-V1`.

*Date: 2026-06-12 · Status: CODE PASS. KPA footer 동적 전환 + 더미/하드코딩 제거 + dead link 정리. 정책문서 통합은 후속.*
