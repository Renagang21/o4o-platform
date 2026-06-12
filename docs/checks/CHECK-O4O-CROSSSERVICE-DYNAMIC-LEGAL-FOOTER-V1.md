# CHECK-O4O-CROSSSERVICE-DYNAMIC-LEGAL-FOOTER-V1

> `WO-O4O-CROSSSERVICE-DYNAMIC-LEGAL-FOOTER-V1` 결과.
> GlycoPharm·K-Cosmetics·**Neture** 공개 푸터를 정적 하드코딩 → serviceKey 기반 동적 법정정보(public
> footer-legal API)로 전환. **값이 있을 때만 표시, 미설정/비활성 → 비표시, placeholder 금지.**
> Neture 하드코딩 법정정보(사업자등록번호 등) 제거. KPA 는 정책 문서 이원화로 이번 제외.
> backend/API/DB/Admin UI 무변경.
> **결과: CODE PASS** (tsc GP/KCos/Neture 0 + build 0). 배포 후 브라우저 smoke 예정. — 2026-06-12

---

## 1. 작업 목적
공개 푸터의 법정정보를 코드 하드코딩에서 제거하고, public legal-profile API 값이 있을 때만 표시하는 동적 구조로 전환.

## 2. 선행 작업 반영
serviceKey 기반 `ServiceLegalProfile` + public `footer-legal`/`legal-profile` API + Admin 법정정보 설정 UI +
GP/KCos `/terms`·`/privacy` + Neture 기존 CMS `/terms`·`/privacy`. 모든 선행 WO 기반 위에 푸터만 연동.

## 3. 서비스별 Footer 컴포넌트 위치
| 서비스 | Footer 위치 | 스타일 |
|--------|-------------|--------|
| GlycoPharm | `services/web-glycopharm/src/components/common/Footer.tsx` (MainLayout) | Tailwind |
| K-Cosmetics | `services/web-k-cosmetics/src/components/common/Footer.tsx` (MainLayout) | inline |
| Neture | `components/Footer.tsx` + `components/layouts/NetureLayout.tsx`(홈) + `components/layouts/MainLayout.tsx` (3곳) | inline/Tailwind |
| KPA | `services/web-kpa-society/src/components/Footer.tsx` | inline (이번 미수정) |

## 4. 서비스별 적용 여부
- **GP / KCos**: 동적 법정정보 블록 추가(기존 법정정보 없음 — 순수 추가). + 푸터에 `/service-guide`·`/terms`·`/privacy` 링크 추가.
- **Neture**: 3개 푸터의 **하드코딩 법정정보(㈜쓰리라이프존 | 사업자등록번호 108-86-02873 | 고객센터 1577-2779 등) 제거** →
  copyright 는 브랜드("© 2026 Neture …")로 유지, 법정정보는 동적 컴포넌트로 전환. 기존 링크(Contact Us/About/포럼) 유지.
- **KPA**: 제외(§5).

## 5. KPA 처리 방식과 사유
- KPA 푸터는 더미 placeholder(주소 "서울특별시 OO구…", 전화 "02-1234-5678") + 실 운영사 정보 하드코딩.
  공개 정책 경로가 localStorage(`PolicyPage`) / `kpa_legal_documents` / 신규 `service_policy_documents` 로 이원/삼중화.
- 동적 footer 를 KPA 에 붙이면 정책/법정정보 입력 경로가 더 얽힘 → **이번 제외**.
- 후속 `IR-O4O-KPA-LEGAL-DOCUMENTS-CROSSSERVICE-INTEGRATION-V1` 에서 KPA legal 입력·표시 경로 통합 결정(푸터 더미 정리 포함).
- KPA 푸터는 **무수정** → 회귀 없음.

## 6. 사용한 public API
- `GET /api/v1/public/services/:serviceKey/footer-legal` (is_active 법정정보만, 미설정/비활성 → `data:null`).
- service 별 module-level stable loader `lib/footerLegal.ts` 가 `authClient.api` 로 호출(404/오류 → null, silent).

## 7. serviceKey 확인 결과
- GP `'glycopharm'` / KCos canonical `'k-cosmetics'` / Neture `'neture'`. (admin/policy WO 와 동일.)

## 8. 표시 항목과 비표시 기준 (공통 컴포넌트 `PublicLegalFooterInfo`)
- WO §10 순서: 사업자기본(상호·대표·사업자번호) → 주소 → 통신판매업신고(+기관) → 고객센터·이메일 →
  개인정보보호책임자 → 호스팅 → 구매안전 → 중개고지 → 추가고지 → 사업자정보확인 링크.
- **값(`null`/빈문자열) 없는 항목은 줄 자체 미렌더.** profile==null(미설정/비활성) → 컴포넌트가 아무것도 렌더 안 함(null 반환).
- 색상 `inherit` 으로 각 푸터(밝은 Neture / 어두운 GP·KCos)에 맞춰 상속.

## 9. 링크 연결 결과
- GP/KCos 푸터: `/service-guide`(서비스 안내) + `/terms`(이용약관) + `/privacy`(개인정보처리방침) + 기존 `/contact` 유지.
- Neture 푸터: 기존 Contact Us(`/contact`)·About(`/about`)·포럼(`/forum`) 유지(헤더에 /guide 존재 — 푸터 링크 구조 무변경).

## 10. placeholder 재노출 없음 확인
- 동적 컴포넌트는 "준비 중/미정/N/A/홍길동/000-…" 등 생성 안 함. 값 없으면 미표시.
- Neture 하드코딩 실값도 제거(코드 하드코딩 금지 원칙) — 실값은 Admin "법정정보·약관 설정"에서 입력 시 자동 표시.

## 11. backend 미수정 / 12. Admin UI 미수정 확인
- `apps/api-server/**` 0건, Admin 설정 UI 무변경. (이번은 frontend 푸터 연동 한정.)
- ContactPage 의 회사 정보(`㈜쓰리라이프존` 등)는 **푸터 아님 → 범위 외**(별도 정리 가능). 폼 라벨(사업자등록번호 입력칸)도 무관.

## 13. 검증 결과
- tsc: web-glycopharm 0 / web-k-cosmetics 0 / web-neture 0 ✅
- build: web-glycopharm 0 / web-k-cosmetics 0 / web-neture 0 ✅

## 14. 브라우저 smoke 결과 (프로덕션, 로그아웃 공개 접근)
| 서비스 | 결과 |
|--------|------|
| **GlycoPharm** (glycopharm.co.kr/) | 푸터 "서비스 안내"(/service-guide)·"이용약관"(/terms)·"개인정보처리방침"(/privacy) 링크 노출 + 기존 /contact. 하단 "© 2025 GlycoPharm" 만 — **법정정보 미표시(profile 비활성/미설정), placeholder 0** ✅ |
| **K-Cosmetics** (k-cosmetics.site/) | 동일 — /service-guide·/terms·/privacy 링크 + "© 2025 K-Cosmetics" 만, 법정정보 미표시 ✅ |
| **Neture** (neture.co.kr/) | **하드코딩 법정정보(㈜쓰리라이프존·사업자등록번호 108-86-02873·1577-2779) 완전 제거 확인** — "© 2026 Neture. 공급자·파트너 협업 플랫폼" + Contact Us/About 만, 동적 법정정보 미표시(profile 비어있음) ✅ |
- 미설정/비활성 상태라 3서비스 모두 법정정보 영역 비표시(가짜 약관/placeholder 0). 운영자가 Admin "법정정보·약관 설정"에서
  값 입력·활성화 시 동일 컴포넌트가 자동 표시. `/terms`·`/privacy` 링크는 선행 WO 의 viewer 페이지로 연결.

## 15. commit hash
- 푸터 구현: `6f7e0e22a` (web deploy success)
- **사고 복구**: `3bedc8cca` (§16 — 동시 세션 혼입 복구, api-server deploy success)
- CHECK smoke 반영: (본 커밋)

## 16. 동시 세션 index 혼입 및 복구 기록
- 푸터 커밋 시 path-specific staging 가드(11파일 정상) 통과 후 **commit 을 pathspec 없이 실행**한 사이,
  타 세션이 공유 git index 에 staged 한 **StoreContent 삭제 6건(apps/api-server backend + migration)** 이
  `6f7e0e22a` 에 함께 commit/push 됨. 해당 삭제의 importer 제거는 타 세션 working tree 에 미커밋이라
  커밋된 main 이 삭제 파일을 여전히 참조 → **api-server 컴파일 불가(빌드 깨짐)**.
- 즉시 parent(`6f7e0e22a^`) 기준으로 6파일을 복원하는 **path-specific 복구 커밋 `3bedc8cca`** (`git commit -- <6경로>`)
  를 별도 push → origin/main 일관(컴파일 가능) 회복. 타 세션 importer 수정 WIP 는 무접촉.
- 복구 후 **CI api-server deploy success + 푸터 web deploy success + 브라우저 smoke** 로 main 건강성 재확인.
- **재발 방지**: 이후 commit 은 무조건 `git commit -m "..." -- <명시 경로>` (가드 통과 여부와 무관하게 pathspec 강제).

---

## 안전성 (WO §12)
- 장문 필드(중개고지/구매안전/추가고지)는 plain text 렌더. `dangerouslySetInnerHTML` 미사용. businessInfoVerificationUrl 은 값 있을 때만 `target=_blank rel=noopener` 링크.

## 후속 작업
1. `IR-O4O-KPA-LEGAL-DOCUMENTS-CROSSSERVICE-INTEGRATION-V1` (KPA legal 경로 통합 — 푸터 더미 정리 포함).
2. `WO-O4O-CONTACT-DELIVERY-AND-NOTIFICATION-V1`.
3. `WO-O4O-SERVICE-LEGAL-POLICY-RICHTEXT-EDITOR-V1`.

*Date: 2026-06-12 · Status: CODE PASS. GP/KCos/Neture 동적 전환(Neture 하드코딩 제거), KPA 제외(후속 IR).*
