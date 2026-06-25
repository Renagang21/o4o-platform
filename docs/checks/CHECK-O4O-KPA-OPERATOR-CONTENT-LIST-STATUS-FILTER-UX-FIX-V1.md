# CHECK-O4O-KPA-OPERATOR-CONTENT-LIST-STATUS-FILTER-UX-FIX-V1

> WO: **WO-O4O-KPA-OPERATOR-CONTENT-LIST-STATUS-FILTER-UX-FIX-V1**
> 작업 제목: **KPA 운영자 콘텐츠 허브 — 기본 목록 상태 필터 UX 개선**
> 작업일: 2026-06-25 / 범위: KPA-Society / 상태: **코드 완료 · typecheck PASS · 운영 브라우저 smoke PASS** (배포본 `8cd1e4491`)

---

## 1. 결론

운영자 콘텐츠 허브 기본 목록이 **draft + ready 를 함께 표시**하도록 정합했다. 운영자가 초안을 완료(즉시 사용)로 전환해도 기본 목록에서 사라지지 않는다. 노출 정책(ready=QR·매장 허브 / draft=비노출)은 변경하지 않았다.

---

## 2. 근본 원인

| 계층 | 원인 |
|------|------|
| 프론트 | `OperatorContentHubPage` 기본 `statusFilter=''` → status 파라미터 미전송 |
| 백엔드 | `GET /contents` status 미지정 + 로그인 시 `(c.status='published' OR c.created_by=userId)` — published 또는 본인 작성분만. ready 로 전환한 콘텐츠가 이 조건에 안 맞으면 기본 뷰에서 누락 |

---

## 3. 수정 내역

| 파일 | 변경 |
|------|------|
| `apps/api-server/src/routes/kpa/kpa.routes.ts` | `GET /contents` 에 `status=all` 처리 추가. 운영자/관리자(`isKpaOperatorOrAdmin`)는 전체 상태 관리 목록(작성자 무관) 노출, 그 외 로그인 사용자는 기존 기본(`published OR 본인`)으로 폴백, 비로그인은 `published`. **status='' 기본 분기 / ready·draft 명시 필터는 무변경** |
| `services/web-kpa-society/src/pages/operator/OperatorContentHubPage.tsx` | 기본 `statusFilter` `''` → `'all'`. 필터 옵션 `전체` / `완료 (즉시 사용)` / `초안 (비노출)` |

**소비처 영향(§9)**: `GET /api/v1/kpa/contents` 리스트 호출은 `contentHub.ts`(status=ready 명시 — QR 피커/매장 허브/제작자료) 와 `OperatorContentHubPage`(본 변경) 뿐. `status=all` 만 신규 추가하고 `status=''`/`ready`/`draft` 경로는 무변경 → ready 소비처·무-status 커뮤니티 소비처 무영향.

노출 정책·매장 허브 탭 구조·QR 피커 필터·cms_contents 파이프라인 무변경. 데이터 일괄 보정 없음.

---

## 4. 수용 기준 점검 (운영 브라우저 smoke, 배포본 `8cd1e4491`)

| 기준 | 결과 |
|------|------|
| 7.1 기본 목록 = 전체(draft+ready) | ✅ 기본 필터 "전체", 콘텐츠 6건 표시 |
| 7.2 상태 전환 후 유지 | ✅ 자일리톨 draft→완료 저장 → **기본 "전체" 목록에 그대로**(배지 "완료"), 사라지지 않음 |
| 7.3 필터별 표시 | ✅ 전체→6 / 완료→1(자일리톨) / 초안→0 |
| 7.4 노출 정책 유지 | ✅ ready 자일리톨이 매장 허브 콘텐츠 허브 탭에 노출(총 1개), non-ready 5건 비노출 |

### smoke 절차

1. `/operator/docs` → 기본 필터 "전체" 확인, 콘텐츠 6건 표시 (7.1)
2. 자일리톨(초안) 수정 → 상태 "완료(즉시 사용)" 저장 → 기본 "전체" 목록 유지 + 배지 "완료" (7.2)
3. 필터 완료→자일리톨만 / 초안→0 (7.3)
4. `/store-hub/content` 콘텐츠 허브 탭 → ready 자일리톨 노출(총 1개) (7.4)
5. **원복**: 자일리톨을 다시 "초안" 저장 → 기본 "전체" 목록 유지(초안 배지), ready 0 복귀

> 참고: 기존 6건 중 자일리톨만 실제 status='draft'. 나머지 5건은 legacy 상태(badge는 "초안" 렌더, "초안" 필터에선 0건). `status=all` 운영자 관리 목록이 이를 모두 포함해 표시.

---

## 5. 검증

| 검증 | 결과 |
|------|------|
| `apps/api-server` `tsc` (kpa.routes) | ✅ 오류 0 |
| `services/web-kpa-society` `tsc` (OperatorContentHubPage) | ✅ 오류 0 |
| 운영 브라우저 smoke | ✅ PASS |
| 데이터 일괄 보정 | ❌ 미실행. smoke 전환분 원복(draft 6건/ready 0) |
| GP/KCos/Neture 영향 | 없음(KPA 라우트/페이지 한정) |

---

## 6. 최종 판정

> 운영자 콘텐츠 허브 기본 목록에서 초안과 완료 콘텐츠가 함께 보이며, 운영자가 초안을 완료 상태로 바꿔도 관리 목록에서 사라지지 않는다.

→ **충족.** 기본 필터 '전체'(status=all) 도입으로 draft+ready 동시 표시 + 전환 후 유지 실증. 노출 정책 무변경.
