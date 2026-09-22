# CHECK — WO-O4O-HOSPITAL-PHARMACY-SERVICE-FOUNDATION-V1

> 병원약국 전문 서비스 Foundation. O4O Main Automation Core 를 **소비만** 하는 얇은 Domain Core
> (`@o4o/hospital-pharmacy-core`) + web 서비스(`services/web-hospital-pharmacy` · 병동/약제부) +
> 공통 GFU 소비 HTTP 표면(`/api/ai/file-understanding`). 단방향 의존 Hospital → Core, Core 수정 0.

- **상태**: FOUNDATION COMPLETE · 브라우저 smoke PENDING(사용자측 DNS·cert·배포)
- **표기일**: 2026-09-22
- **결정론 검증**: jest 3 suites / 21 tests PASS · web tsc 0 · vite build PASS

---

## 1. 승인 범위 대비 결과

| WO 범위 | 결과 |
|---|---|
| census 판정 | 원내 Excel 파서(web-neture `localDataset.ts` HEADER_ALIASES) = **GFU 전면 전환(D1)** · 포팅 안 함 |
| `packages/hospital-pharmacy-core` | 얇은 Domain Core — 필드·TargetSchema·NL 파싱·원내 Local Context·adapter·surface plan. React/DOM/DB/네트워크/xlsx 의존 0 |
| `services/web-hospital-pharmacy` | Vite 서비스(병동 + 약제부 minimal + 홈). Core 소비 배선만 |
| Core 소비 배선(additive) | 서버 `/api/ai/file-understanding`(공통 GFU 소비 러너) — 이미 commit a4c870ad1 |
| 대표 업무 6종 E2E | 결정론 jest(`hospital-pharmacy-representative-tasks.spec.ts`) 6/6 |
| 브라우저 smoke | PENDING(사용자측) — signage-player·pharmacy-hub 선례(DNS·cert 는 Foundation 밖) |

**STOP 조건(O4O Main Core 수정 필요) 미발생.** 모든 병원 특수 요구는 hospital-pharmacy service/package 안에서 처리.

## 2. 확정 결정(D1~D3)

- **D1** 원내 Excel = 공통 Generic File Understanding 전면 전환. HEADER_ALIASES 파서 포팅 금지 —
  `decode → profile → inferFileStructure(Gemini) → normalize → confidence` 를 소비하고, 도메인 어휘는
  클라이언트가 주입한 `HOSPITAL_DRUG_TARGET_SCHEMA` 로만 온다(api-server 는 병원·약품 어휘 미보유).
- **D2** 원내 SSOT = 브라우저 `localStorage`(`HOSPITAL_DRUG_STORAGE_KEY`). Local-first V1 · 서버 미저장 ·
  환자정보 제외 · **DDL 0**. 서버 SQLite 경로 미사용. 병동 조회는 `localSource='client'` 로 서버 원내
  조회를 끄고 원내 결합은 브라우저가 자기 데이터로 수행.
- **D3** 대표 업무 = §1 예시 6종(원내 보유 / 동일성분 원내약 / 대체약 조사 / 성분·주의사항 조사 /
  주문 가능 확인 / 병원 프로그램 재고). §5·§6 은 후속.

## 3. 계약·경계 편차 보고

### 3-A. §4 (파일이 서버를 일시 경유) — 의도된 소비 경계
GFU Core 는 api-server 에 있으므로 약제부 파일은 base64 로 `/api/ai/file-understanding` 를 **일시 경유**한다.
그러나 (a) Gemini 에는 profile **표본(top-20)** 만 가고 전체 행 정규화는 서버 순수 함수가 하며,
(b) 파일 bytes·records 원문은 **저장하지 않고**(로그도 counts only) 응답으로만 돌려주며,
(c) 정규화 결과(원내 데이터셋)는 **브라우저 localStorage 에만** 남는다. 환자정보는 대상 밖(§7 첨부≠지식).
→ D2 "원내 SSOT=브라우저" 와 모순 없음. 서버는 구조 해석기일 뿐 원내 지식 저장소가 아니다.

### 3-B. 순수 패키지 확장자 없는 상대 import(§2 규칙 범위)
`@o4o/hospital-pharmacy-core` 의 상대 import 는 `./domain`(확장자 없음)을 쓴다. CLAUDE.md §2 의
`.js` 확장자 규칙은 **Node ESM api-server 런타임의 TypeORM 엔티티**에만 적용된다. 이 패키지는 jest(ts-jest)
와 Vite 만이 소비하고 Node ESM 로 로드되지 않으며, Vite 는 `.js`→`.ts` 를 자동 해석하지 않으므로
확장자 없는 형태가 두 소비자 모두에서 옳다. TypeORM 엔티티가 아니므로 §2 위반 아님.

## 4. 검증

| 항목 | 명령 | 결과 |
|---|---|---|
| Domain Core 결정론 | `jest hospital-pharmacy-core.spec.ts` | 12/12 PASS |
| 공통 GFU 소비 러너 | `jest structured-file-understanding.spec.ts` | 3/3 PASS |
| 대표 업무 6종 E2E | `jest hospital-pharmacy-representative-tasks.spec.ts` | 6/6 PASS |
| web 타입체크 | `tsc -b`(services/web-hospital-pharmacy) | EXIT 0 |
| web 번들 | `vite build` | 155 modules · PASS (hospital-pharmacy-core 소스 번들) |

**브라우저 smoke = PENDING.** 사용자측 준비 필요: `hospital.neture.co.kr` DNS·인증서·Cloud Run 배포
(deploy-web-services.yml 에 `hospital-pharmacy` job 등록 완료 — push/dispatch 로 배포). 배포 후 병동
자연어 조사·약제부 파일 연결을 실브라우저로 확인.

## 5. 배포 배선

- `deploy-web-services.yml`: path filter · detect-changes output · workflow_dispatch(all/개별) ·
  `decide "hospital-pharmacy"` · env `VITE_API_URL_HOSPITAL_PHARMACY`/`VITE_SERVICE_URL_HOSPITAL_PHARMACY` ·
  `deploy-hospital-pharmacy` job(Cloud Run `hospital-pharmacy-web`) 추가.
- `pnpm-lock.yaml`: `services/web-hospital-pharmacy` importer 항목 수기 삽입(전역 install 회피 —
  타 세션의 `action-log-core` 삭제 미추적 상태와 얽히지 않도록). `pnpm install --filter hospital-pharmacy-web...`
  = "Lockfile is up to date"(정합).

## 6. 미해결·후속(범위 밖 · 지시 대기)

- 브라우저 smoke(사용자측 DNS·cert·배포 후).
- §5·§6 심화(약제부 확장·주문/재고 화면 자동화 실배선).
- 병동 화면-국소 질의 파싱(`extractLocalNeedles`)은 서비스 표시용 최소 구현 — 향후 원내 needle 파싱을
  패키지로 승격할지는 별도 판단.

---

*문서 정합: 발견 0건 / SUPERSEDED 표기 0건 / 링크 수정 0건 / 별도 WO 제안 0건*
