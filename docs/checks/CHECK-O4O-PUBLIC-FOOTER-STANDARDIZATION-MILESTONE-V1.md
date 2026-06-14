# CHECK-O4O-PUBLIC-FOOTER-STANDARDIZATION-MILESTONE-V1

> **유형:** 마일스톤 고정 (운영 구조 완료 상태 기록 — 코드/DB/API 변경 없음)
> **선행 IR:** [IR-O4O-CROSSSERVICE-FOOTER-CORE-STANDARDIZATION-V1](../investigations/IR-O4O-CROSSSERVICE-FOOTER-CORE-STANDARDIZATION-V1.md)
> **완료 WO(3):** [LINK-GUARD](../work-orders/WO-O4O-PUBLIC-FOOTER-LINK-GUARD-V1.md) · [LEGAL-GUARD](../work-orders/WO-O4O-PUBLIC-FOOTER-LEGAL-GUARD-V1.md) · [LEGAL-LOADER-CONSOLIDATION](../work-orders/WO-O4O-PUBLIC-FOOTER-LEGAL-LOADER-CONSOLIDATION-V1.md)
> **작성일:** 2026-06-14
> **상태:** ✅ **마일스톤 — Footer 정비 핵심 영역 완료.** IR Phase 1(Option B) 전부 PASS. 남은 건 선택 과제(GP/KCos 한정 FooterCore)뿐.

## 0. 한 줄 결론
4서비스 공개 Footer의 **법정정보 drift·dead link·loader 중복**이라는 핵심 위험 3종이 모두 닫혔다. 전면 FooterCore(Option D)는 비권장 유지, GP/KCos 한정 FooterCore(Option C 부분)만 선택 과제로 남는다.

## 1. 고정 기준 (Standing Rules)
이 마일스톤 이후 Footer 관련 작업은 아래를 **기준선**으로 한다.

1. **4서비스 Footer legal block은 공통 `PublicLegalFooterInfo`(@o4o/shared-space-ui) 단일 기준.** 값 없으면 렌더 0(placeholder/더미 구조적 불가).
2. **법정정보 실값 출처는 `service_legal_profiles` 단일.** 코드 하드코딩·placeholder 금지(재등장 시 회귀로 간주).
3. **공개 화면에서 사업자 법정정보가 나오는 곳은 Footer 하나뿐.** (ContactPage 등 본문 카드에 법정정보 재기재 금지.)
4. **footer legal loader는 공통 factory `createFooterLegalLoader`(shared-space-ui) 기준.** 서비스별 어댑터는 transport(axios/fetch) unwrap만 담당, fallback/serviceKey 조건문 금지.
5. **footer 링크는 실제 route와 정합(dead link 0).** route 없는 링크 노출 금지.
6. **Neture footer 진입은 layout 임베드 단일화.** standalone dead footer 재도입 금지.

## 2. 완료 항목 (닫힌 위험)

| 위험 | 상태 | 닫은 WO | 근거 커밋 |
|------|:---:|--------|----------|
| 공개 화면 법정정보 하드코딩 | ✅ 해결 | LEGAL-GUARD | `47c08e51f` (Neture ContactPage `㈜쓰리라이프존`/`108-86-02873` 제거) |
| dead link / route drift | ✅ 해결 | LINK-GUARD | `58708e6e7` (GP `/education`→`/lms`, Neture `/about` 제거) |
| legal loader 4중 중복 / drift | ✅ 해결 | LOADER-CONSOLIDATION | `26c3db249` (공통 `createFooterLegalLoader` + 4서비스 어댑터) |
| Neture footer 3중 구현 | ✅ 해결 | LOADER-CONSOLIDATION | 동일 커밋 (standalone dead `components/Footer.tsx` 제거) |
| 법정정보 block service-neutral | ✅ 기확보 | (IR 이전 인프라) | `PublicLegalFooterInfo` + `service_legal_profiles` 기존 공통 |

> 4서비스 모두 `tsc 0` + 배포 success. 브라우저 시각 smoke는 Playwright 점유로 보류(각 CHECK §13~14에 route-level/grep/deploy 갈음 근거 기록).

## 3. 결정 사항 (Drift 아님 — 의도된 차이)

| 항목 | 결정 | 근거 |
|------|------|------|
| 약관 route 네이밍 (KPA `/policy` vs 나머지 `/terms`) | **KPA `/policy` 유지** | LINK-GUARD §6 — route 존재·legacy `kpa_legal_documents` 저장. 표준 `/terms` 강제 통일은 SEO/링크 리스크라 미채택. dead link 아님 |
| KPA loader transport | **`fetch` 유지** (GP/KCos/Neture는 axios) | LOADER-CONSOLIDATION §5 — 공통 factory 위에서 어댑터만 다름, 로직 동일 |
| Footer shape 4종 (dark 4컬럼 / dark 단일행 / 흰색 최소) | **현행 유지** | IR §9 — 전면 공통(D)은 조건문 폭발("Option D trap"). 비권장 |

## 4. 남은 선택 과제 (필수 아님)

| WO 후보 | 매핑 | 내용 | 판단 |
|--------|:---:|------|------|
| `WO-O4O-PUBLIC-FOOTER-CORE-GP-KCOS-V1` | C(부분) | GP/KCos 쌍 한정 `PublicFooterCore`+config 추출 (구조 동일: dark·컬럼형·brand+3컬럼) | **선택** — 내부 정리이지 운영 필수 아님. KPA/Neture는 shape 차이로 제외 |
| `WO-O4O-PUBLIC-FOOTER-DESIGN-ALIGNMENT-V1` | — | footer 디자인/모바일 정렬 | **보류** — 전면 디자인 통합은 비권장 유지 |

> **전면 FooterCore(Option D)는 후보 아님.** GP/KCos FooterCore도 "하면 좋은 정리"일 뿐, 착수 여부는 별도 판단.

## 5. 검증 (이 마일스톤 자체)
- [x] 문서 1개만 생성 (코드/UI/API/DB/route 변경 0)
- [x] 완료 WO 3건 CHECK PASS 확인 (LINK-GUARD·LEGAL-GUARD·LOADER-CONSOLIDATION)
- [x] IR 권고 Phase 1(Option B) 전 항목 매핑 (§2)
- [x] 의도된 차이를 Drift와 분리 기록 (§3)
- [x] 남은 선택 과제 명시 (§4)
- [x] 고정 기준 6개 명문화 (§1)

---

*End of CHECK-O4O-PUBLIC-FOOTER-STANDARDIZATION-MILESTONE-V1*
