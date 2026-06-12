# CHECK-O4O-CROSSSERVICE-POLICY-ROUTES-V1

> `WO-O4O-CROSSSERVICE-POLICY-ROUTES-V1` 결과.
> GlycoPharm·K-Cosmetics 에 공개 `/terms`·`/privacy` 를 신규 `service_policy_documents` public API 기반으로
> 추가(공통 `PolicyDocumentViewer`). Neture 는 기존 CMS `/terms`·`/privacy` 현행 유지. KPA 는 기존 구조와
> 중복 방지 위해 이번 범위 제외. backend/API/DB/Admin UI/공개 푸터 무변경.
> **결과: CODE PASS** (tsc GP/KCos 0 + build GP/KCos 0). 배포 후 브라우저 smoke 예정. — 2026-06-12

---

## 1. 작업 목적
공개 사용자가 각 서비스에서 게시된 약관/개인정보처리방침을 조회할 수 있도록 `/terms`·`/privacy` 정비.
신규 `service_policy_documents` public API(published-only) 소비. frontend route/viewer 한정.

## 2. 선행 backend/Admin UI 상태
- public API `GET /api/v1/public/services/:serviceKey/policies/:documentType` (published 만, 없음→404) 존재.
- Neture/GP/KCos Admin 에서 정책 문서 입력·게시 가능(선행 UI WO). KPA 는 별도 `kpa_legal_documents` 구조.

## 3. 서비스별 기존 `/terms`·`/privacy` 조사 결과
| 서비스 | 기존 라우트 | 데이터 소스 | 처리 |
|--------|------------|-------------|------|
| **Neture** | `/terms`·`/privacy` 존재 (`LegalPage slug=terms-of-service/privacy-policy`) | 기존 **CMS**(cms_pages slug) | **현행 유지** |
| **GlycoPharm** | 없음 | — | **신규 추가**(service_policy_documents) |
| **K-Cosmetics** | 없음 | — | **신규 추가**(service_policy_documents) |
| **KPA Society** | `/policy`·`/privacy` 존재 (`PolicyPage`/`PrivacyPage`) | **localStorage**(`kpa_legal_policy`) + static fallback ("TODO: API 연동") | **이번 제외** |

## 4. Neture 현행 유지 사유
- Neture `/terms`·`/privacy` 는 기존 CMS(`LegalPage` + cms_pages slug)로 이미 동작. WO §6.1 권장(정상 동작 시 무리한 교체 금지)에 따라 **현행 유지**. 신규 API 로 교체할 명확한 이점 없음(오히려 CMS 콘텐츠 이전 리스크).
- 후속 동적 푸터에서 Neture 는 기존 `/terms`·`/privacy`(CMS) 를 그대로 링크하면 됨.

## 5. GlycoPharm route 추가 결과
- `services/web-glycopharm/src/pages/legal/PolicyDocumentPage.tsx` — `TermsPage`/`PrivacyPage`(serviceKey 'glycopharm', public API loader).
- `App.tsx` public layout 하위 `terms`·`privacy` route(= `/terms`·`/privacy`), lazy import.

## 6. K-Cosmetics route 추가 결과
- `services/web-k-cosmetics/src/pages/legal/PolicyDocumentPage.tsx` — `TermsPage`/`PrivacyPage`(serviceKey canonical 'k-cosmetics', public API loader).
- `App.tsx` public layout 하위 `terms`·`privacy` route, lazy import.

## 7. KPA 조사 결과와 처리 방식
- KPA `/policy`·`/privacy` 는 **localStorage 기반 PolicyPage/PrivacyPage**(자체 DB `kpa_legal_documents` 와도 미연결, static fallback). admin 입력은 `/operator/legal`(kpa_legal_documents) 로 별개.
- 신규 cross-service viewer 를 KPA 에 붙이면 **약관 입력 경로가 3중(localStorage / kpa_legal_documents / service_policy_documents)** 이 되어 혼선 → **이번 제외**.
- 후속 `IR-O4O-KPA-LEGAL-DOCUMENTS-CROSSSERVICE-INTEGRATION-V1` 에서 통합 방향 결정 필요(공개 페이지의 localStorage 의존 제거 포함).

## 8. policy viewer 구조
- 공통 `PolicyDocumentViewer` (`@o4o/shared-space-ui/legal/PolicyDocumentViewer`).
  props: `serviceKey` / `documentType` / `heading` / `loadPolicy`(service 주입 — public API 호출, 404→null).
  상태: loading / ok / empty / error. 표시: 제목 · 버전 · 시행일 · 게시일 · 본문.
- service wrapper 는 자기 `authClient.api` 로 public GET 을 구현해 주입(서비스 base 상이 대응).

## 9. published-only 표시 정책
- public API 가 published 만 반환(미게시→404→null). viewer 는 ok 일 때만 본문 표시. draft 미노출.

## 10. empty state 정책 / 11. placeholder 없음 확인
- 미게시/없음 → "현재 공개된 문서가 없습니다." 중립 문구. 오류 → "문서를 불러오지 못했습니다…".
- "준비 중/미정/표준 약관/가짜 본문" 등 placeholder **미사용**. 본문은 API content 만 렌더.

## 본문 렌더 안전성 (WO §8)
- 본문은 **plain text `whitespace-pre-wrap`** 으로 렌더 — `dangerouslySetInnerHTML` 미사용(XSS 회피). RichText/HTML 은 후속 sanitize 동반 시 검토.

## 12. backend 미수정 / 13. Admin UI 미수정 / 14. 공개 푸터 미수정
- `apps/api-server/**` 0건, Admin 설정 UI 무변경, 공개 푸터 무변경. (이번은 공개 route/viewer 한정.)

## 15. 검증 결과
- tsc: web-glycopharm 0 / web-k-cosmetics 0 ✅ (공통 viewer 소스 포함)
- build: web-glycopharm 0 / web-k-cosmetics 0 ✅

## 16. 브라우저 smoke 결과
- (배포 후 갱신)

## 17. commit hash
- (커밋 후 기재)

---

## 후속 링크 기록표 (동적 푸터용)
| 서비스 | terms route | privacy route | 사용 데이터 |
|--------|-------------|---------------|-------------|
| Neture | /terms | /privacy | 기존 CMS(cms_pages slug) |
| GlycoPharm | /terms | /privacy | service_policy_documents |
| K-Cosmetics | /terms | /privacy | service_policy_documents |
| KPA Society | /policy · /privacy(기존) | — | localStorage→후속 IR(kpa_legal_documents/service_policy_documents 통합) |

## 후속 작업
1. `WO-O4O-CROSSSERVICE-DYNAMIC-LEGAL-FOOTER-V1` — 푸터에서 위 route + public legal-profile 연동.
2. `IR-O4O-KPA-LEGAL-DOCUMENTS-CROSSSERVICE-INTEGRATION-V1` — KPA 정책 문서 3중 경로 통합.
3. `WO-O4O-CONTACT-DELIVERY-AND-NOTIFICATION-V1`.

*Date: 2026-06-12 · Status: CODE PASS. GP/KCos 신규 추가, Neture 현행 유지, KPA 제외(후속 IR).*
