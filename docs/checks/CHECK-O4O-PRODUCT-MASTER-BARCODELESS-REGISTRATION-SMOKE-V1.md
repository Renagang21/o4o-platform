# CHECK-O4O-PRODUCT-MASTER-BARCODELESS-REGISTRATION-SMOKE-V1

> **한 줄 요약**: 바코드리스 ProductMaster 등록(`WO-...-BARCODELESS-REGISTRATION-INTERNAL-CODE-V1`)을 **프로덕션 admin API로 실제 등록 검증(PASS)**. 제품 = 건강기능식품 "맨 파워 포텐". 내부코드(GS1 200 대역) 자동생성 확인. 진행 중 **한글 인코딩 함정**을 발견·교정.

- 날짜: 2026-07-10
- 성격: 프로덕션 write **1건 검증(등록)** — 사용자 승인 하에 수행
- 연관: [WO-O4O-PRODUCT-MASTER-BARCODELESS-REGISTRATION-INTERNAL-CODE-V1](../work-orders/WO-O4O-PRODUCT-MASTER-BARCODELESS-REGISTRATION-INTERNAL-CODE-V1.md) · [general-food R5](../guides/products/general-food/README.md)

---

## 0. 권한 기록 (사용자 승인 — 이번 작업 한정)

- 사용자가 **이번 작업 경우에 한해** admin API(curl) 등록 실행을 허용함(2026-07-10).
- 실행 채널: 배포 API `https://api.neture.co.kr` — `POST /api/v1/auth/login`(Neture admin, TEST-ACCOUNTS SSOT) → httpOnly 쿠키 인증 → `POST /api/v1/neture/admin/masters/resolve`.
- **자격증명·토큰은 문서/커밋/출력에 남기지 않음**(쿠키 자만 사용 후 삭제). 이 승인은 **일회성**이며 상시 권한이 아니다.

---

## 1. 검증 결과 (PASS)

| 항목 | 결과 |
|------|------|
| 바코드 미제공 등록 | ✅ 성공 (`success:true`) |
| 내부코드 자동생성 | ✅ `200` 접두 EAN-13 (`generateInternalBarcode`) |
| 카테고리 | 건강기능식품 — 카테고리 무관 등록 확인 |
| 최종 레코드 | id `f5f88abb-17d6-405c-9450-cc8cb9d0b066`, barcode `2001254563059`, name "맨 파워 포텐" ✓, regulatoryType "건강기능식품" ✓ |

→ `WO-...-BARCODELESS-REGISTRATION-INTERNAL-CODE-V1`의 미완 항목(런타임 E2E 실 DB write)이 **프로덕션에서 충족됨**.

---

## 2. 발견한 함정 — 한글 인코딩 (재발 방지)

**증상**: Windows 셸(Git Bash)에서 curl `--data`에 한글을 **인라인 문자열**로 넘기면 UTF-8이 깨져 **mojibake(치환문자 U+FFFD)로 저장**됨. 첫 등록 레코드(`0b5502e5-...`)의 `name`·`regulatoryType`이 깨짐.

**교정(표준)**: 한글이 포함된 요청 body는 **UTF-8 파일로 저장한 뒤 `curl --data-binary @file`**로 전송한다. (읽기 검증도 값을 직접 출력하지 말고 `node`로 파싱해 기대값과 비교 → 터미널 CP949 표시 왜곡과 분리.) 재등록 레코드(`f5f88abb-...`)는 정상 저장 확인.

> 메모리의 "Korean CLI 인코딩 / 한글정규식=UTF8파일" 함정과 동일 계열. **API 등록·POST에도 적용**.

---

## 3. 남은 처리 (미완 — 사용자 결정 필요)

- **깨진 레코드 `0b5502e5-7b33-4ed8-9295-c63c35b0e9bf`**(mojibake name/regType, barcode `2002210015520`)가 프로덕션 `product_masters`에 잔존.
- `regulatoryType`은 **immutable**이라 PATCH로 교정 불가. admin API에 **master DELETE 엔드포인트 없음**.
- → 정리하려면 **DB DELETE(cloud-sql-proxy)** 필요 = 별도 승인 사안(read-only 아님). 또는 잔존 허용.
- follow-up 후보: WO-...-BARCODELESS §5의 "내부코드↔실바코드 사후 정합"과 함께 **mojibake/오등록 master 정리(soft-delete) 정책** 검토.

---

*프로덕션 등록 write 2건(1 오등록 + 1 정상). read-back 검증 완료. 자격증명 미기록.*
