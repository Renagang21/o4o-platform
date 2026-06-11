# CHECK-O4O-GP-KCOS-FOOTER-PLACEHOLDER-LEGAL-INFO-SUPPRESSION-V1

> WO: WO-O4O-GP-KCOS-FOOTER-PLACEHOLDER-LEGAL-INFO-SUPPRESSION-V1 (0단계 긴급 안전 조치)
> 작업일: 2026-06-11
> 상태: PASS

## 1. 작업 목적

GlycoPharm / K-Cosmetics 공개 화면에 노출 중인 **placeholder(가짜) 법정정보**를 제거한다. 실값이 확정되지 않았으므로 **법정정보를 임의 작성하지 않고**, 미확인 항목은 **렌더링하지 않는 방식(빈 공간 허용)**으로 처리한다. "준비 중" 같은 대체 문구도 공개 표시하지 않는다.

## 2. 선행 IR 근거

- `IR-O4O-CROSSSERVICE-FOOTER-LEGAL-DISPLAY-REQUIREMENTS-V1` (b55530d62) — GP/KCos 푸터 placeholder 법정정보 노출 위험
- `IR-O4O-SERVICE-LEGAL-POLICY-SETTINGS-MANAGEMENT-AUDIT-V1` (dfbadbd7a) — 법정정보 serviceKey 기반 저장·Admin 수정 구조 부재, 실값 미확정 → 임의작성 금지하고 placeholder만 우선 차단

## 3. 수정한 서비스

- `services/web-glycopharm`
- `services/web-k-cosmetics`

## 4. 수정한 파일

| 파일 | 변경 |
|---|---|
| `services/web-glycopharm/src/components/common/Footer.tsx` | placeholder 전화/주소/사업자정보 블록 제거, 미사용 아이콘 import(Phone, MapPin) 정리 |
| `services/web-glycopharm/src/pages/ContactPage.tsx` | 공개 `/contact` 의 placeholder 대표전화/주소 + 사업자 정보 블록 제거, 미사용 import(Phone, MapPin) 정리 (사용자 승인으로 footer 외 추가 포함) |
| `services/web-k-cosmetics/src/components/common/Footer.tsx` | placeholder 전화/주소/사업자정보 블록 제거 |

> ContactPage 포함 사유: 검증 중 GP 공개 `/contact` 에 동일 가짜 법정정보 블록(상호/대표/사업자등록번호/통신판매업/전화/주소)이 노출됨을 발견. WO 명시 범위(Footer) 밖이나 "가짜 정보 노출 금지" 원칙과 동일 위험·동일 path(`web-glycopharm/**`)이므로 **사용자 승인 후** 함께 제거.

## 5. 제거한 placeholder 항목

| 항목 | GlycoPharm Footer | GlycoPharm ContactPage | K-Cosmetics Footer |
|---|:---:|:---:|:---:|
| 대표자 `홍길동` | ✅ 제거 | ✅ 제거 | ✅ 제거 |
| 사업자등록번호 `000-00-00000` | ✅ 제거 | ✅ 제거 | ✅ 제거 |
| 통신판매업 신고번호 `2025-서울서초-0000` | ✅ 제거 | ✅ 제거 | (없었음) |
| 주소 `서울특별시 서초구 강남대로 000, 0층` | ✅ 제거 | ✅ 제거 | ✅ 제거 |
| 전화 `02-0000-0000` | ✅ 제거 | ✅ 제거 | ✅ 제거 |
| 상호 `(주)글라이코팜` / `(주)케이코스메틱스` | ✅ 제거 | ✅ 제거 | ✅ 제거 |

- 검증 grep 결과: 표시 경로에서 위 문자열 **0건** 잔존 (form input `placeholder="..."` 힌트만 잔존 — 입력 예시이며 법정 표시 아님, 의도적 유지).

## 6. 임의 법정정보 미추가 확인

- 새 사업자등록번호/통신판매업 신고번호/대표자명/주소/개인정보보호책임자/호스팅 제공자 **추가 0건**.
- "준비 중"/"미정" 등 대체 문구 **추가 0건** (grep 확인).
- KPA/Neture 실값(㈜쓰리라이프존 108-86-02873) 복사 **없음**.
- 제거 위치에는 후속 WO 식별용 주석(WO ID + 동적 푸터 재도입 예정)만 남김 — 가짜 정보 주석 없음.

## 7. 유지한 링크/요소

- 서비스명(GlycoPharm / K-Cosmetics), copyright, 브랜드 설명
- 서비스 링크(포럼/교육/사업/홈/문의하기), 참여하기(입점 신청/제휴 문의)
- 지원 이메일(support@glycopharm.co.kr / support@k-cosmetics.site) — placeholder 아님, 유지
- 운영시간(평일 09:00-18:00) — 법정정보·placeholder 아님, 유지
- 기존 route 동작 유지: GP/KCos `/service-guide`, `/contact` 정상

## 8. 제외 서비스와 제외 사유

- `services/web-kpa-society` / `services/web-neture` — 이번 긴급 placeholder 제거 대상 아님(KPA/Neture 푸터는 실값 `㈜쓰리라이프존 108-86-02873`). 미수정.
- backend/API/DB/migration, Admin 설정 UI, 법정정보 저장 모델, 약관/개인정보 CMS, 동적 푸터, 문의 폼 — 범위 외, 미수정.

## 9. 후속 작업으로 남긴 항목

- GP/KCos 약관(`/terms`)·개인정보처리방침(`/privacy`) route 부재 — 이번에 신규 생성 안 함(WO §8). 후속 `WO-O4O-CROSSSERVICE-POLICY-ROUTES-V1`.
- 법정정보 실값 확정(운영주체/사업자등록번호/통신판매업/대표자/주소/개인정보보호책임자/호스팅) — 서비스 개시 전 사용자/법무.
- 실값 기반 동적 푸터: `WO-O4O-SERVICE-LEGAL-POLICY-SETTINGS-BACKEND-V1` → `...ADMIN-...UI-V1` → `...DYNAMIC-LEGAL-FOOTER-V1`.
- (참고) K-Cos Footer styles 객체에 미사용 prop(phone/address/businessInfo) 잔존 — 렌더 영향 없음(객체 리터럴 속성, TS 오류 없음). 동적 푸터 WO 에서 정리 가능.

## 10. 검증 결과

- 표시 경로 placeholder 법정정보: **0건** (grep, form input placeholder 제외)
- 대체 문구("준비 중"/"미정"): **0건**
- TypeScript: GP `tsc -b --noEmit` EXIT 0 / KCos `tsc --noEmit` EXIT 0
- Build: GP `vite build` ✓ / KCos `vite build` ✓
- 기존 `/service-guide` · `/contact` 링크 동작 유지
- KPA Society / Neture 파일 미수정 / backend 미수정
- staged 가드: `web-glycopharm/**` + `web-k-cosmetics/**` + 본 CHECK 문서만

## 11. commit hash

- (commit 후 기재)
