# WO-O4O-NETURE-OPERATOR-PRODUCTION-DEFECT-CLOSURE-V1

> **상태**: 등록 (실행 미승인) · **작성일**: 2026-08-14
> **선행**: [WO-O4O-OPERATOR-COMMONIZATION-MAIN-INTEGRATION-AND-PRODUCTION-VALIDATION-V1](WO-O4O-OPERATOR-COMMONIZATION-MAIN-INTEGRATION-AND-PRODUCTION-VALIDATION-V1.md) (통합·배포 완료 / baseline 미확정)

---

## 1. 목표 · 배경

Operator 공통화는 최신 main 통합·배포까지 완료됐다(merge `fa62c8052`, 후속 결함 수정 `2afb5925a`).
그러나 **production baseline 확정 기준은 "이번 병합이 결함을 만들었는가"가 아니라
"공통화 대상 4서비스에서 실제 운영자 기능이 정상인가"** 이다.

프로덕션 실계정 브라우저 검증 결과 Neture 만 **19개 라우트 중 18개 정상**이며,
`dead link 0` · `표시 기능의 API 오류 0` 두 완료 기준이 불충족이다.
본 WO 는 그 3건을 닫아 Operator 공통화 baseline 확정을 가능하게 한다.

세 결함 모두 `api-server` 유래이며 공통화 병합(api-server 변경 0건)과 인과관계가 없다.
그럼에도 **사용자 기능 완료 판정에서는 제외하지 않는다.**

---

## 2. 승인 범위

### 결함 1 — `/operator/signage/hq-media` dead link

- 증상: Neture 운영자 대시보드 Quick Action "🖥️ 사이니지" 클릭 → `요청하신 페이지를 찾을 수 없습니다.`
- 원인: 프론트 route 는 `WO-O4O-NETURE-DIGITAL-SIGNAGE-REMOVAL-V1` 로 제거됐는데
  (`services/web-neture/src/App.tsx:1175`, 메뉴 config 에서도 제거됨)
  백엔드가 여전히 링크를 내려보낸다 —
  `apps/api-server/src/modules/neture/controllers/operator-dashboard.controller.ts:306`
  (`{ id: 'go-signage', label: '사이니지', link: '/operator/signage/hq-media' }`, `cd5d10017`)
- 판단: Neture 는 signage 미대상 서비스이므로 **quick action 제거**가 canonical.
  대체 route 가 실재한다면 그 route 로 정렬한다(먼저 조사로 확정).

### 결함 2 — `GET /api/v1/neture/operator/actions` 500

- 증상: `/operator/actions` 화면 본문 미렌더(`[Action Queue] Fetch failed`)
- 대상: `apps/api-server/src/modules/neture/controllers/operator-action-queue.controller.ts`
- 500 원인을 Cloud Run 로그로 확정한 뒤 최소 수정. 조회 실패를 빈 배열로 삼키지 않는다
  (Load-Error 계약: 실패는 고정 코드 throw, 정상 0건만 통과).

### 결함 3 — `GET /api/operator/settings/notifications` 403

- 증상: `/operator/settings/notifications` 화면은 뜨지만 설정 로드 실패
- 원인: `apps/api-server/src/routes/operator-notification.routes.ts` 가드가
  `['platform:super_admin', 'admin', 'operator', 'staff']` 로, **서비스 운영자
  (`neture:operator` 등)를 의도적으로 제외**한다. 해당 파일 주석에 이미
  "서비스 운영자에게 알림 설정을 열지 여부는 **정책 결정 사항**" 으로 명시돼 있다.
- 따라서 본 항목은 **두 선택지 중 하나를 사용자 판단으로 확정한 뒤** 실행한다:
  - **A안** — Neture 운영자 사이드바에서 '알림 설정' 메뉴를 제거(플랫폼 관리자 전용 유지)
  - **B안** — 가드에 서비스 operator scope 를 추가(권한 계약 변경 → §5 중지 조건 해당)
- 조사 후 권고안을 제시하고 승인받는다. 승인 전 가드 수정 금지.

---

## 3. 실행 순서

1. 최신 main 동기화(`git fetch` → clean 확인 → `pull --ff-only`)
2. 결함 1 조사 → quick action 제거 또는 route 정렬 (최소 수정)
3. 결함 2 — Cloud Run 로그(`gcloud logging read`)로 500 스택 확정 → 최소 수정
4. 결함 3 — 권한 계약 조사 → A/B 권고안 보고 → **승인 후** 실행
5. `pnpm type-check` + 영향 서비스 build
6. commit(path-specific) → push → CI 통과 확인 → 배포 리비전 확인
7. 프로덕션 실계정 브라우저 검증 (§6)
8. CHECK 문서 기록 후 완료 보고

---

## 4. 제외 범위

- Store Hub 검증 (별도 WO — 신규 병합이 아닌 **전 서비스 프로덕션 검증 WO**)
- Operator 공통화 구조 재변경 (병합·공통화 자체는 완료)
- production DB write (read-only 검증만)
- 본 3건과 무관한 lint/typecheck 부채
- GlycoPharm 기능 확장 (공통 모듈 회귀 확인만)

---

## 5. 중지 조건

- 결함 3 의 **B안(권한·role·guard 계약 변경)** 이 필요하다고 판단될 때 → 승인 전 중지
- 결함 2 의 원인이 DB schema · migration 변경을 요구할 때
- WO 범위 밖 파일 수정 필요 / 다른 세션의 dirty·미추적 파일 접촉 필요
- 현재 변경과 무관한 build · test 실패
- `package.json` · lockfile · CI · Docker 변경 필요

---

## 6. 검증 · Git

**검증 (완료 기준)**

- Neture 운영자 표시 메뉴 · quick action **dead link 0**
- `GET /api/v1/neture/operator/actions` **200** + `/operator/actions` 화면 정상 렌더
- 알림 설정 — 확정된 정책 기준으로 **정상 권한에서 200 + 화면 정상**(A안이면 메뉴 비노출로 dead 기능 0)
- KPA · K-Cosmetics · PharmacyHub Operator **회귀 0**
- desktop(1440) / mobile(390) **실계정 브라우저 검증** — JS exception 0 · white screen 0 · 가로 오버플로 0
- `pnpm type-check` PASS · 영향 서비스 build PASS · CI PASS

**Git**

- main 직접 작업, path-specific stage (`git add .` 금지)
- 완료 조건 = 본 WO 범위 미커밋 변경 0 + `HEAD == origin/main`

---

## 7. 완료 보고

7섹션 형식으로 보고한다. 다음을 반드시 포함한다.

- 결함 3건 각각의 **원인 · 수정 내용 · 실측 검증 결과**
- 결함 3 의 확정 정책(A안/B안)과 근거
- typecheck · build · CI 결과 (실패·건너뜀 은폐 금지)
- 실계정 브라우저 검증 결과 (desktop/mobile, 4서비스 회귀)
- production write 0건 확인
- commit hash · `HEAD == origin/main`
- `문서 정합: 발견 N건 / SUPERSEDED 표기 N건 / 링크 수정 N건 / 별도 WO 제안 N건`

**완료 후**: Operator 공통화를 **production baseline 으로 최종 확정**하고,
Store Hub 는 신규 병합이 아닌 **전 서비스 프로덕션 검증 WO** 로 진행한다.
