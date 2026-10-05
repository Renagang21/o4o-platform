# HANDOFF

> 마지막 작업: 2026-10-05 09:45 (KST) · 작성 PC: DESKTOP-SS4Q2DK · 상태 조회 시각: 2026-10-05 09:43

## 요약

작업공간 이동을 위해 **WO-NETURE-PHARMACY-STORE-COMMERCE-REFACTOR-V1** 를 단계 1 조사 완료 지점에서 멈췄다. 진행 상황의 정본은 WO 문서의 TODO 체크리스트다 — [`docs/work-orders/WO-NETURE-PHARMACY-STORE-COMMERCE-REFACTOR-V1.md`](docs/work-orders/WO-NETURE-PHARMACY-STORE-COMMERCE-REFACTOR-V1.md).

## 완료된 것

- WO 원문 + TODO 체크리스트 기록 (`7f09a7a71`)
- 단계 1 조사 1-1 ~ 1-6 완료 → [`IR-NETURE-PHARMACY-STORE-COMMERCE-STEP1-CENSUS-V1`](docs/investigations/IR-NETURE-PHARMACY-STORE-COMMERCE-STEP1-CENSUS-V1.md) (`f64445ce7`, 4개 영역 A~D). 핵심 사실 요약은 WO 의 "단계 1 조사 핵심 사실" 절.
- 코드 · DB · migration 변경 0.

## 진행 중

| 항목 | 위치 | 상태 (2026-10-05 09:43 조회) |
|---|---|---|
| Neture 약국 commerce WO | branch `wo/neture-pharmacy-store-commerce-refactor-v1` (원격 존재) · 이 PC worktree `D:/o4o-wt/neture-pharmacy-store-commerce-refactor-v1` | 단계 1-7(설계 문서) 미착수. **draft PR #308** (OPEN) — merge 금지 |
| 정본 문서 최종 정렬 | PR #304 · branch `wo/canonical-doc-final-alignment-v1` · 이 PC worktree `D:/o4o-wt/canonical-doc-final-alignment-v1` | OPEN · CI 실패 0 · mergeStateStatus CLEAN · head `b57a92d1d`. 마지막 Codex 지적 수정 후 `@codex review` 재요청(00:40Z) — **재리뷰 결과 아직 없음** |

## 다음에 바로 이어서 할 일 (우선순위)

1. **새 PC 준비** — 기준 checkout 에서 `git fetch origin` 후 전용 worktree 생성:
   `git worktree add ../o4o-wt/neture-pharmacy-store-commerce-refactor-v1 wo/neture-pharmacy-store-commerce-refactor-v1`
   (디스크 여유 먼저 확인 — `df -h`). 구현 단계 전에 `VOLTA_FEATURE_PNPM=1 pnpm install --frozen-lockfile` → `pnpm run build:packages`.
2. **PR #304** — `gh pr view 304` 로 Codex 재리뷰 확인. blocker 없으면 사용자에게 보고하고 STOP → 사용자의 "main 통합 진행" 후에만 merge → 이 PC 의 worktree 는 이 PC 에서 표준 종료 정리(AGENTS.md §4-1(i), junction 해제 · 재스캔 0 후 remove). 다른 PC 에서 이 PC 의 worktree 를 건드리지 않는다.
3. **WO 단계 1-7 설계 문서** — IR 을 입력으로 설계 확정. 이미 정리된 설계 방향:
   - 세미프랜차이즈 = serviceKey 가 아니라 **데이터 행** (`semi_franchises` · 멤버십 · 운영자 담당 관계; 선례 `branch_memberships`)
   - 기본 가입 = Neture 신규 원장(kpa-society 재해석 금지) + 운영자 승인; 매장 판정 유틸을 kpa-society 의존에서 분리(공통 모듈 변경 프로토콜 적용)
   - 공급 제안 = SPO 하위 **복수 제안 테이블**(가격 · 대상 세미프랜차이즈 · 선택적 대상 조직 · 상태); 장바구니 `store_cart_items.supply_offer_id`
   - 이벤트는 OPL 유지(수량 로직 보존) + 재신청 차단 · visibility 토글 승인 우회 · 운영 조직 LIMIT 1 결함 수정
   - 모집 = 조직 단위 참여자 + 공급가
   - 공급자 주문 필터 `COALESCE(o.service_key,'neture')='neture'` → 서비스 키 배열
   - 결제 = `PAYMENT_MODE=test|live` · paymentGroupId 를 PG orderId 로 · payment↔group/소유자/금액 검증 · DB 멱등 handler · `receiver_key` 그룹핑
   - HUB 단계 제거는 web-store 내 매장 직접 사용으로; `/hub` 전면 삭제는 불가(KCos 링크 · spec)
   - 커뮤니티 = `community-access.middleware.ts` 에 세미프랜차이즈 정책 모드
4. 1-8 정본 반영 → 단계 2~6 구현 (WO TODO 순서).

## 주의 · 미해결 · 결정

- **사용자 판단 대기 (WO "보류" 절)**: D1 세미프랜차이즈별 결제 수취 주체 · D2 기존 B2B 수량 상한 1..1000 유지/제거 · D3 이벤트 매장 한도 기준(사용자→조직). 결정 전에는 기존 동작 유지 · 테스트 결제만.
- WO 금지 범위: 수량 상한 신설 · 자동 정산/청구 · 가격 비교 추가 금지. 정산 · 환불은 보고만(삭제 여부 미결).
- **운영 DB write(테스트 데이터 삭제 포함) · migration 수동 적용은 사용자 명시 승인 필요.** migration 추가 시 manifest · expected-schema-states · ledger spec 를 같은 커밋에.
- Frozen 접촉 가능 영역(F3 Store Layer · F8 Distribution · F9 RBAC · F10 Core · F11 · Supplier Domain FROZEN) — 구조 변경은 이 WO 가 명시한 범위만, 그 밖은 STOP 후 보고.
- main 반영은 PR merge 하나뿐. 직접 push · owner bypass 금지. 원격 branch 삭제는 사용자가 GitHub 에서.
- 저장소 Public — 실명 · 이메일 · 약국명 · 자격증명 값 기록 금지.
