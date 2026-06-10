# CHECK-O4O-NETURE-CONTACT-INQUIRY-OPERATOR-NOTIFICATION-V1

> `WO-O4O-NETURE-CONTACT-INQUIRY-OPERATOR-NOTIFICATION-V1` 결과.
> Neture 공개 Contact us 문의가 DB 저장만 되고 운영자가 즉시 인지하기 어려웠던 업무 동선 미완성을
> `문의 저장 → 운영자 in-app 알림 → 운영자 문의함(전체 유형 기본 노출)` 으로 닫음.
> **판정: PASS** — CODE PASS(tsc 0) + 프로덕션 배포 후 브라우저 E2E smoke 전 단계 통과.
> 커밋: `b1c1d353f` · Date: 2026-06-10

---

## 1. 작업 성격
업무 동선 완성(버그 아님). 기존 알림 인프라(`notificationService.createNotification()` + `contact.new`
NotificationType + 프론트 `NotificationBell` targetUrl 라우팅) **재사용** — 신규 시스템 미제작.
주문/결제/배송/정산 무관. 알림 생성은 best-effort 로 격리(문의 접수 실패와 분리).

## 2. 변경 파일 (3)

| 파일 | 변경 |
|------|------|
| `apps/api-server/src/modules/neture/controllers/contact.controller.ts` | POST /contact `repo.save` 직후 `neture:operator`+`neture:admin` 에게 `contact.new` 알림 broadcast. `metadata.targetUrl=/operator/contact-messages?status=new`. try/catch 격리 |
| `apps/api-server/src/modules/neture/controllers/operator-contact.controller.ts` | 기본 조회 범위 `supplier+partner` → **전체 유형**(supplier/partner/service/other). `OPERATOR_DEFAULT_TYPES` 제거. supplier/partner 는 selectable 필터로 유지 |
| `services/web-neture/src/pages/operator/OperatorContactMessagesPage.tsx` | 기본 라벨 `전체 문의 (기본)`, 안내 문구 "Contact us 모든 문의" 중심 정리 |

## 3. 정책 결정
- Contact us 는 공개 문의 창구 → **모든 contactType(supplier/partner/service/other) 을 운영자 업무로 본다.**
- 문의 저장 직후 운영자 in-app 알림 생성(대상 neture:operator+neture:admin, 링크 status=new).
- **일괄 mark-read 는 기존 supplier/partner 범위 유지**(선행 WO-...-OPERATOR-CONTACT-MESSAGES-OPERATOR-SCOPE-V1
  결정: operator 가 admin 영역 문의를 의도치 않게 처리하는 위험 방지). 즉 *조회는 전체, 일괄 처리는 supplier/partner*.
- 이메일 사본 발송은 canonical 범위 외 — 보조 수단으로 후속 WO 분리.

## 4. 검증

### 4.1 CODE
- tsc: api-server **0** · web-neture **0** ✅
- 잔존 `OPERATOR_DEFAULT_TYPES`/`defaultTypes` 참조 0건 ✅

### 4.2 배포
- 커밋 `b1c1d353f` — Deploy API Server (Cloud Run) success · Deploy Web Services (Cloud Run) success ✅

### 4.3 브라우저 E2E smoke (프로덕션 neture.co.kr)
1. `/contact` 에서 **서비스** 유형 테스트 문의 제출 → "문의가 접수되었습니다" 성공 ✅
2. 운영자(neture admin/operator) 로그인 → 헤더 알림벨 **읽지 않은 알림 1건** ✅
3. 알림 내용: 제목 "새 문의가 접수되었습니다" / 본문 "[서비스] [SMOKE] …" / "방금 전" ✅
4. 알림 클릭 → `/operator/contact-messages?status=new` 정확히 이동 ✅
5. 문의함 기본 필터 **"전체 문의 (기본)"** 선택 상태 ✅
6. 목록에 방금 제출한 **service** 문의 + 기존 **other(기타)** 문의 동시 노출
   → service/other 가 기본 목록에서 보임(이전 supplier/partner 제한이었다면 미노출) ✅
7. **일괄 확인** 버튼 실행 후 service/other 문의 모두 `신규` 유지 → 범위 가드 정상 ✅

## 5. 보류 / 후속
- **이메일 사본 발송**(`NETURE_CONTACT_NOTIFY_EMAIL`): canonical(DB+in-app+문의함) 외 보조 기능.
  메일 디스패처/실패처리/수신자 env 검증 필요 → 별도 WO 분리.
- smoke 로 생성된 테스트 문의(`smoke-test@example.com`, `[SMOKE]…`)는 운영 데이터에 잔존 — 필요 시 admin 화면에서 정리.

---

*Date: 2026-06-10 · Status: PASS (CODE + DEPLOY SMOKE). 이메일 사본은 후속 보조 WO.*
