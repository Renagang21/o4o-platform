# CHECK-O4O-SPD-REVISION-REQUEST-EXPIRY-SCHEDULER-V1

> 공급자 STORE 설명서 수정 요청 만료(revision_requested + due<now) 자동 삭제를 **매일 스케줄 실행**에 연결.

## 1. 최종 정책

```
운영자 수정 요청 → status=revision_requested, revision_due_at=now+30일
공급자 기한 내 재검수 요청 → needs_review 복귀
기한 내 재요청 없으면 → hard delete
알림 없음 · archived 없음
```

## 2. 스케줄러 방식

- **기존 프로덕션 job 표준(in-app setInterval job) 채택** — `jobs/market-trial-lifecycle.job.ts` + `services/startup.service.ts` 등록과 동일 패턴. **신규 GCP 인프라(Cloud Scheduler / Cloud Run Job) 도입 없음**(WO §6.2).
- **엔트리포인트 검증(중요)**: prod 엔트리는 `dist/main.js`(=`src/main.ts`) → `startupService.initialize()`. `src/server.ts` 는 **prod 미사용**(dead) — 최초 server.ts 에 등록했다가 배포 후 부팅 로그 부재로 발견, **`services/startup.service.ts` 로 이전**(marketTrialLifecycleJob 옆). shutdown() 에 `.stop()` 도 등록.
- 신규 `jobs/spd-revision-expiry.job.ts` (`SpdRevisionExpiryJob`, 싱글톤). node-cron/cron 패키지는 존재하나 등록된 스케줄 job 은 setInterval 표준.

## 3. 실행 주기

- **부팅 시 1회 즉시 실행 + 이후 24h 간격.** Cloud Run 특성상 콜드스타트/재시작마다 부팅 run 이 실질 트리거이며, 인스턴스가 24h 이상 생존 시 interval 도 발화. 30일 만료 창이므로 **일 단위 정밀도로 충분**(clock-aligned 03:30 은 미채택 — 기존 표준이 setInterval 이라 그 관례를 따름).

## 4. 실행 권한/인증

- 서버 프로세스 내부 실행(별도 HTTP 인증 불필요). `AppDataSource`(초기화 후) 직접 사용. 외부 노출 엔드포인트 아님.
- kill-switch: env `SPD_REVISION_EXPIRY_ENABLED='false'` 로 비활성화(기본 활성). delete job 안전 스위치.

## 5. 호출하는 서비스 메서드

- `SharedProductDescriptionService.expireRevisionRequested({ apply: true })` **재사용**(신규 DELETE SQL 중복 구현 없음). dry-run SELECT WHERE = apply DELETE WHERE 동일 조건(단일 소스).

## 6. 삭제 조건

```sql
description_type = 'STORE' AND source_type = 'supplier'
AND status = 'revision_requested'
AND created_by_supplier_id IS NOT NULL
AND revision_due_at IS NOT NULL AND revision_due_at < NOW()
AND deleted_at IS NULL
```

## 7. 삭제 guard

- 제외: canonical / needs_review / draft / hidden / description_type≠STORE / source_type≠supplier / created_by_supplier_id null / revision_due_at 미래. (service 조건 그대로 — 본 WO 는 조건 무변경)

## 8. dry-run 결과

- (배포 후 운영 API dry-run(GET /expiry/dry-run) count 기록.)

## 9. apply 검증 결과 / 보류 사유

- (무대상 apply(deleted:0) 또는 job 로그 확인 기록.)

## 10. positive apply 미수행 사유

- 운영 DB 에서 검증 목적의 `revision_due_at` backdate UPDATE / 만료 테스트 row 생성 **금지**(WO §9,§11). dry-run 조건 + guard 동일성(§5) + 무대상 apply + job 로그로 대체.

## 11. typecheck / build 결과

- api-server `tsconfig.build.json` typecheck **0 error**.

## 12. 배포 결과

- (main push → API Server 배포 결과 + 부팅 로그 `[spd-revision-expiry] starting scheduled job` 확인.)

## 13. 기존 기능 회귀 확인

- 만료 조건/guard·수동 `/expiry/dry-run`·`/expiry/apply`·수정 요청·재검수·canonical conflict 무변경(job 은 기존 service 호출만 추가). QR/landing/tablet/AUTO-CREDIT 무접촉. migration 없음.

## 14. 변경 파일 목록

- `apps/api-server/src/jobs/spd-revision-expiry.job.ts` — 신규 스케줄 job
- `apps/api-server/src/services/startup.service.ts` — initialize() `.start()` + shutdown() `.stop()` 등록(prod 경로)

## 15. commit SHA

- 구현: (기록)
- 배포/검증: (기록)

## 16. push 결과

- (기록)

## 완료 판정

- (구현·정적검증·배포·부팅로그/dry-run 검증 후 CLOSED/PASS)

## 후속 WO

- `WO-O4O-OPERATOR-SUPPLIER-STORE-DESCRIPTION-CANONICAL-REPLACE-V1` — 기존 canonical 교체 정책(매장 복사본/QR/landing 영향). 본 WO 범위 외.
