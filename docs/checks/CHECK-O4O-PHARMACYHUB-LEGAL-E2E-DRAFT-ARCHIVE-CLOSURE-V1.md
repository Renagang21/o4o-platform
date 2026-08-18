# CHECK — PharmacyHub `[E2E_TEST]` 법정문서 draft archive 마감

- **작성일**: 2026-08-18
- **선행 CHECK**: [`CHECK-O4O-CROSSSERVICE-LEGAL-POLICY-PRODUCTION-COMPLETION-V1.md`](CHECK-O4O-CROSSSERVICE-LEGAL-POLICY-PRODUCTION-COMPLETION-V1.md) §6-3 · §12-1 (잔여물 기록)
- **판정**: `PASS`

---

## 1. 배경

선행 WO 의 production E2E 검증 과정에서 PharmacyHub 정책 문서 1행이 미게시 draft 로 남았다.

- 문서 ID `f347af0e-bdf1-420e-9017-1f772da2a8d9` · `documentType=terms` · `status=draft`
- 당시 삭제/archive 엔드포인트가 없었고 WO 가 DB 직접 write 를 금지해 잔존시켰다.
- 이후 lifecycle 엔드포인트가 배포되었다:
  `PATCH /api/v1/admin/services/:serviceKey/policies/:id/lifecycle { action: 'archive' | 'restore' }`
  ([`admin-service-legal.controller.ts`](../../apps/api-server/src/modules/service-legal/admin-service-legal.controller.ts))
  — 법적 이력 보존을 위해 물리 DELETE 는 제공하지 않는다.

---

## 2. 수행 (정규 API 만 사용 · SQL 직접 write 0)

| 단계 | 요청 | 결과 |
|---|---|---|
| 사전 조회 | `GET /admin/services/pharmacy-hub/policies` | `200` · 1행 `status=draft` `version=1` |
| archive | `PATCH /admin/services/pharmacy-hub/policies/f347af0e…/lifecycle {action:'archive'}` | `200` · 응답 `status=archived` |
| 재조회 | `GET /admin/services/pharmacy-hub/policies` | `200` · 해당 행 `status=archived` |
| 공개 조회 | `GET /public/services/pharmacy-hub/policies/terms` | `404` (게시본 없음 — archive 전과 동일, 공개면 변화 없음) |

## 3. 관리자 화면 실측 (production, desktop 1440)

`https://pharmacyhub.co.kr/admin` — Structure Snapshot:

- **작성중(draft) 문서 `0`** (archive 전 `1`)
- 게시중 정책 문서 `0` · 전체 정책 문서 `1` (archived 행이 이력으로 보존됨)
- Policy Overview: 이용약관·개인정보처리방침 "미설정" · Governance Alerts 정상 표기
- JS exception 0 · API 403/404 0

---

## 4. 판정

**`PASS`** — 선행 CHECK §6-3 의 잔여물이 해소됐다.
draft 는 0, `[E2E_TEST]` 행은 `archived` 상태로 이력만 남으며 공개 화면 영향은 없다.

**남은 후속(본 마감 범위 밖, 그대로 유효)**

- 선행 CHECK §12-2 — 전 서비스 법정정보·약관 실데이터 미설정(법무 검토가 필요한 운영 과제).
- 선행 CHECK §12-3 — KPA legacy "법률 관리" 화면 병존.

---

## 5. 문서 정합

```text
문서 정합: 발견 0건 / SUPERSEDED 표기 0건 / 링크 수정 0건 / 별도 WO 제안 0건
```

선행 CHECK 는 과거 시점 기록물이므로 본문을 수정하지 않고, 해소 사실을 본 문서에 남긴다.
