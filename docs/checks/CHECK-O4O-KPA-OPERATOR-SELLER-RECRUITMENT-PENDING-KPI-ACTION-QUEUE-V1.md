# CHECK-O4O-KPA-OPERATOR-SELLER-RECRUITMENT-PENDING-KPI-ACTION-QUEUE-V1

> WO: `WO-O4O-KPA-OPERATOR-SELLER-RECRUITMENT-PENDING-KPI-ACTION-QUEUE-V1`
> 성격: 운영자 대시보드에 판매자 모집 노출 승인 **대기 건수 KPI·Action Queue·AI 요약** 연결.
> **신규 테이블·상태·승인 API·migration 0.** 승인 기능 자체 무변경.
> Date: 2026-07-24 · commit `87061f706`(backend 1파일) · Deploy API success · 라이브+브라우저 smoke PASS

## 0. 결론 — ✅ PASS

기존 KPA 운영자 대시보드 backend(`operator-dashboard.service.ts`, pass-through 렌더)에 read-only count 1개와
KPI/AI요약/Action Queue 항목을 **추가만** 했다. 프론트 무변경(backend config pass-through). 기존 KPI 8종·
Action Queue·Quick Action 무회귀. 프로덕션 pending 0건 → KPI 0 정상 표시, Queue·AI 미노출.

## 1. 재사용한 count / 집계 조건

- **재사용 패턴**: `fetchSecondaryCounts`(read-only Promise.all count 묶음) + `buildConfig`(KPI/AiSummary/
  ActionQueue 조립) — event-offers·product-applications KPI 와 동일 구조에 1항목 추가.
- **집계 조건(신규 read-only count 1개)**:
  ```sql
  SELECT COUNT(*) FROM neture_partner_recruitments
  WHERE service_id = 'kpa-society' AND exposure_status = 'pending'
  ```
- 이 조건은 운영자 승인 큐 목록(`getRecruitmentsForExposureReview`: `serviceId=serviceKey AND
  exposureStatus=pending`, status·삭제 조건 없음)과 **완전 동일** → KPI 값 = 목록 건수 보장. 테이블에
  soft-delete 컬럼 없음(별도 제외 불필요).

## 2. KPI

- `{ key:'recruitment-exposure', label:'판매자 모집 승인 대기', value:pending, status: pending>0?'warning':'neutral',
  link:'/operator/recruitment-exposure' }` — product-applications 뒤에 추가.
- link=canonical route. `RecruitmentExposureApprovalPage` 기본 탭이 `pending`(DEFAULT_STATUS)이라 param 없이
  노출 대기 목록 진입 → 별도 query 불필요.
- 기존 KPI(pending/forum/content/signage/event-offers/product-applications + admin total-members/service-apps) 무변경.

## 3. Action Queue

- `{ id:'aq-recruitment-exposure', label:'판매자 모집 노출 승인 검토', count:pending, link:'/operator/recruitment-exposure' }`
  — **pending>0일 때만 push**(0건 미노출). 승인/반려 후 새로고침 시 count 반영(count 쿼리 매 호출).

## 4. AI Summary / Quick Action

- **AI Summary**: 기존 rule-based 패턴에 조건부 1항목(`ai-recruitment-exposure`, pending>3=warning else info,
  severity sort+splice(3) 그대로). 신규 LLM 호출 0.
- **Quick Action**: 미추가 — 사이드바에 이미 '판매자 모집 노출 승인' 메뉴 존재(직전 WO 복원), 중복 링크 회피(WO §5.E).

## 5. 권한·서비스 경계

- 집계는 대시보드 endpoint `GET /api/v1/kpa/operator/dashboard`(operator-summary.controller) 안 —
  기존 operator 가드 유지, 비로그인 **401** 실측.
- count 조건 `service_id='kpa-society'` 고정 → 타 서비스 모집 미포함. 공급자 소유권·모집 데이터 무변경.
- `operator-dashboard.service.ts`/`buildKpaOperatorDashboardConfig`는 **KPA operator-summary.controller 에서만
  소비**(GP/KCos/Neture 대시보드는 자체 service, 미참조) → 타 서비스 대시보드 영향 0.

## 6. 중지 조건 — 전부 미해당

| # | 조건 | 판정 |
|---|---|---|
| 1 | 공통 스키마 변경 필요 | ❌ read-only count만, 컬럼 기존 존재 |
| 2 | KPA scope 구분 불가 | ❌ service_id='kpa-society' |
| 3 | 기존 대시보드 계약 파손 | ❌ 추가만(KPI 배열 append), 응답 shape 불변 |
| 4 | GP/KCos/Neture 동시 영향 | ❌ KPA 전용 service |
| 5 | 동시 작업 파일 충돌 | ❌ recruitment/dashboard 미커밋 0 |
| 6 | 승인 목록 기본 pending 아님·필터 미지원 | ❌ 기본 탭 pending(DEFAULT_STATUS), URL 필터도 지원 |

## 7. 검증

### 정적
- count 조건 `exposure_status='pending'` + `service_id='kpa-society'` scope · 타 서비스 미포함 · KPI key 중복 0 ·
  Action Queue route 유효 · legacy route 0 · 신규 DB/migration 0 · typecheck(api-server 변경 파일) 0.

### 라이브 smoke (프로덕션, 배포 후)
- `GET /kpa/operator/dashboard` 200 · KPI `recruitment-exposure`={value:0, status:neutral, link:/operator/
  recruitment-exposure} 노출 · KPI keys 9종(기존 8 + 신규 1) · **KPI value(0) == 승인 큐 pending 목록 length(0)** 일치.
- 0건 → ActionQueue/AiSummary recruitment 항목 미노출(undefined) · 기존 KPI 6종(+admin 2) 전부 존재 · 비로그인 401.

### 브라우저 smoke (kpa-society, 운영자)
- 대시보드 정상 렌더 · **'판매자 모집 승인 대기' KPI 표시(값 0)** · KPI 클릭 → `/operator/recruitment-exposure` →
  승인 콘솔 '노출 대기' 탭 진입 · 콘솔 4xx/5xx 기능 오류 0(로그인 초기 무관 리소스 404는 페이지 API와 무관).

## 8. 프로덕션 pending 건수 / 데이터

- `neture_partner_recruitments` 총 0행, kpa-society pending 0. **인위적 모집 생성 없음**(WO §12 준수) — 0건 계약·링크
  동작으로 검증 종료. 프로덕션 write 0.

## 9. 후속

- 실제 pending 데이터 발생 시 KPI/Queue/AI가 warning·항목으로 노출됨(코드 경로 확인, 데이터 부재로 라이브 미실증).
- 판매자·매장 소비 UI(browse API 완비, 화면 위임)는 별도 WO — 이번 범위 밖.

## 10. 커밋

- 코드 `87061f706`(operator-dashboard.service.ts) · 본 CHECK.
