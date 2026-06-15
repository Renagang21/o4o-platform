# CHECK-O4O-QR-EDITOR-GP-KCOS-PARITY-V1

> **작업명:** WO-O4O-QR-EDITOR-GP-KCOS-PARITY-V1
> **유형:** GP/KCos QR 편집 폼 parity (frontend only). backend/DB **무변경**(PUT 기존).
> **결과: PASS — GP/KCos StoreQrPage 에 QR 편집(수정) 추가. row "수정" 액션 → 폼 prefill → `PUT /pharmacy/qr/:id`(기존 backend) → 목록 갱신. 생성/삭제 동작 유지. typecheck(GP/KCos) 0. backend/DB 무변경.**
> 선행: `IR-O4O-QR-CODE-PRODUCTION-FLOW-AUDIT-V1`(D — GP/KCos 편집 폼 부재) — 2026-06-15

---

## 1. 배경

IR(D): backend `PUT /pharmacy/qr/:id`(title/description/landingType/landingTargetId/slug 수정)은 3서비스 마운트되나, **GP/KCos StoreQrPage 는 생성·삭제만**(편집 폼 부재). KPA 는 편집 보유. 본 WO 가 GP/KCos frontend parity.

## 2. 변경 (2 파일, frontend only)

| 파일 | 변경 |
|------|------|
| `web-glycopharm/src/pages/store/StoreQrPage.tsx` | `editingId` state · `openEdit(qr)`(폼 prefill) · row "수정"(Edit3) 액션 · handleCreate → `editingId` 시 **PUT** `/pharmacy/qr/:id` 아니면 POST · 모달 제목/제출 라벨 조건화("QR 코드 수정"/"QR 수정") |
| `web-k-cosmetics/src/pages/store/StoreQrPage.tsx` | 동 |

- 기존 create 폼/모달 재사용(editing 시 prefill + PUT). `qrFetch` generic(method/body) 사용 — 신규 client 불요.
- KPA(StoreQRPage) 미변경(이미 편집 보유).

## 3. 검증

- **TypeScript 0 errors:** `web-glycopharm` · `web-k-cosmetics`.
- **정적:**
  - row "수정" → openEdit(prefill title/description/landingType/landingTargetId/slug) → 모달 → PUT `/pharmacy/qr/:id` → loadItems.
  - 생성(POST)/삭제(soft)/다운로드/복사/import/production-materials 표시 **동작 유지**.
  - **backend/DB/route/migration 변경 0.** PUT 엔드포인트 기존(store-qr-landing.controller). 동시 세션 WIP 미접촉.
- **무변경:** store_qr_codes 구조 · operator template · POP-QR selector(별도 WO #2) · AI/통계.
- **browser smoke:** 미수행 — dev 서버·인증 guard. 폼/PUT 은 typecheck + KPA 동형. **배포 후 권장:** GP/KCos `/store/marketing/qr` → 수정 → 저장 → 목록 반영 확인.

## 4. 완료 판정

**PASS.** GP/KCos QR 편집 폼 parity 확보(생성/편집/삭제 동등). backend PUT 재사용, DB/route 무변경, typecheck 통과.

## 5. 후속

1. (배포 후) GP/KCos QR 수정 smoke.
2. `WO-O4O-POP-QR-SELECTOR-GP-KCOS-PARITY-V1`(다음) — GP/KCos StorePopPage 에 QR selector(qrId) 추가.
3. (선택) cross-content linkage / AI·통계 parity / StoreQrPage dup 공통화.

---

*Date: 2026-06-15 · GP/KCos QR 편집 폼 parity PASS · openEdit+PUT(/pharmacy/qr/:id 기존) + row 수정 액션. 생성/삭제 유지. backend/DB 무변경. typecheck(GP/KCos) 0. 배포 후 smoke 권장.*
