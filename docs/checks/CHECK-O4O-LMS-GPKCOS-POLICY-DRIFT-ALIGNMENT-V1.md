# CHECK-O4O-LMS-GPKCOS-POLICY-DRIFT-ALIGNMENT-V1

> **작업명:** WO-O4O-LMS-GPKCOS-POLICY-DRIFT-ALIGNMENT-V1
> **유형:** LMS 공통 UI 추출 **선행 정합** — K-Cosmetics 잔존 정책 drift 를 KPA-Society 기준선에 맞춰 정렬 (frontend only)
> **중요 원칙:** 리워드는 무조건 지급 아님(설정 시에만). LIVE/YouTube 재도입 금지. 본 WO 는 공통 UI 추출이 아니라 **drift 정합만** 수행한다.
> **선행:** `IR-O4O-LMS-SERVICE-COMMONIZATION-BOUNDARY-V1` (commit `4f6dc1556`)
> **작성일:** 2026-06-13 · 기준 HEAD `46edaa55d`

---

## 1. 작업 목적

LMS 공통 UI(`@o4o/lms-ui`) 추출 전, K-Cosmetics 에 남은 정책 drift 2건을 KPA 기준선으로 먼저 정렬한다. drift 를 남긴 채 공통화하면 고정 리워드 문구·YouTube 임베드가 공통 컴포넌트 설계로 굳어질 위험이 있으므로 선행한다.

- **drift 1:** KCos `MyCreditsPage` 고정 리워드 스케줄(+10/+20/+50) 노출 → rewardPolicy 게이팅(설정 시에만 지급) 정책과 상충.

본 WO 는 정합만 수행한다. 공통 UI 패키지 추출·KPA 수정·backend 수정·rewardPolicy UI·reward budget/wallet 구현·KCos visibility 보강은 범위 외.

## 2. 선행 IR 요약

`IR-O4O-LMS-SERVICE-COMMONIZATION-BOUNDARY-V1`:
- KCos 는 이미 풀 LMS 구현 보유 → 공통화 = 3개 병렬 구현을 공통 UI 로 수렴(빈 서비스 이식 아님).
- backend 는 이미 service-neutral/serviceKey 기반 → 기본 공통화 frontend-only.

## 3. 변경 파일

| 파일 | 변경 |
|------|------|
| `services/web-k-cosmetics/src/pages/mypage/MyCreditsPage.tsx` | 동일 정렬 |
| `docs/checks/CHECK-O4O-LMS-GPKCOS-POLICY-DRIFT-ALIGNMENT-V1.md` | 본 문서(신규) |

**무변경:** KPA-Society LMS, Neture, backend, DB/migration, rewardPolicy UI, reward wallet/budget/ledger, 강사 충전/배정, KCos visibility, 강사/운영자 관리 화면 공통화, 결제/checkout, 공통 UI 패키지.

## 5. KCos MyCreditsPage 정렬 결과

- `SOURCE_LABELS`(lesson_complete/quiz_pass/course_complete/admin_grant/survey_complete)는 **유지** — 이는 실제 지급된 transaction 의 source 라벨이지 고정 스케줄 광고가 아님. (KPA 도 동일하게 실지급 내역 라벨 유지.)

## 7. rewardPolicy 게이팅 정책과의 정합성

- MyCreditsPage 는 더 이상 "레슨 완료=+10" 식 고정·무조건 지급 인상을 주지 않음. 안내 문구는 *"리워드가 설정된 강의에서… 정책에 따라 달라집니다"* 로 rewardPolicy 게이팅(미설정→미지급, 설정 시 default/지정 금액)과 일치.
- 실 적립 내역(transaction)은 backend 가 실제 지급한 값만 표시 → 정책과 모순 없음.

## 8. LIVE/YouTube 재도입 방지 확인

- **LMS 무관 YouTube 사용처는 미수정**(유지): signage(`store-management/signage/*`, `operator/signage/*`), `PharmacyBlogPage`, `services/api.ts`, `types/signage.ts` — 모두 사이니지/블로그 도메인. 본 WO 는 LMS(education/instructor) 경로만 정리.

## 9. Neture 제외 확인

- Neture 파일 **미수정**. Neture LMS route/menu 없음, `@o4o/lms*`/`@o4o/lms-ui` 소비처 없음, LMS reward UI 없음(IR §8). Neture 는 LMS 공통화 대상 아님.

## 10. KPA / backend 미수정 확인

- KPA-Society LMS 파일 **미수정**(비교 참조만). KPA 기준선이 정합의 기준.
- backend(`apps/api-server`) **미수정**. DB/migration 없음.

## 11. 검증 결과

- **TypeScript:**
  - `web-k-cosmetics` `tsc --noEmit` — 변경 파일(`MyCreditsPage`) **0 errors**. 잔존 12건은 전부 `packages/store-ui-core/src/components/supply-catalog/SupplyCatalogHub.tsx`(타 세션 rename 작업의 사전존재 stale-`@o4o`-dist TS2307 cascade) — 본 WO 무관·미접촉.
- **grep:**
  - KCos MyCreditsPage 에서 `+10`/`+20`/`+50` 고정 리워드 문구 **0**.
  - LMS 무관 signage/blog YouTube 사용처는 유지.
  - KPA/Neture/backend 파일 변경 **0**.
- **정적:** MyCreditsPage 문구가 rewardPolicy 게이팅과 정합. 공통 UI 추출 미포함(본 WO 범위 준수).
- **browser smoke:** 미수행 — 렌더 변경 중심, 실데이터 write 회피(WO §8). 배포 후 dev/staging 에서 KCos MyCreditsPage 렌더 강의 상세/레슨 화면 YouTube 미임베드 확인 권장.

## 12. 남은 후속 작업

1. **`WO-O4O-LMS-COMMON-UI-EXTRACTION-V1`** — KPA 기준 CourseCard/List/Detail/LessonPlayer/Progress 등 pure UI 를 `@o4o/lms-ui` 로 추출(client 주입, Neture export 금지).
3. **`WO-O4O-LMS-KCOSMETICS-ADOPTION-V1`** — K-Cosmetics 에 공통 UI 적용 + visibility 노출 보강.
4. **`CHECK-O4O-LMS-NETURE-EXCLUSION-GUARD-V1`** — Neture LMS route/menu/package 소비처 부재 확인.
5. **`IR-O4O-REWARD-BUDGET-FLOW-PLATFORM-SERVICE-INSTRUCTOR-V1`** — 별도 작업선. O4O 관리자 → 서비스 운영자 → 강사 reward budget/지갑/ledger/처리중 흐름.

## 13. 완료 판정

**PASS.** KCos `MyCreditsPage` 고정 리워드 스케줄 제거 → rewardPolicy 기반 안내로 정렬. KPA/Neture/backend/DB 무변경 typecheck 0, KCos 변경 파일 0. 공통 UI 추출은 후속 WO 로 분리.
