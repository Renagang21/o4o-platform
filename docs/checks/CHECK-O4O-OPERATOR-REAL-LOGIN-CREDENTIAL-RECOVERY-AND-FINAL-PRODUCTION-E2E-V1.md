# CHECK — O4O 운영자 실제 로그인 credential 복구 및 최종 production E2E V1

- **WO**: `WO-O4O-OPERATOR-REAL-LOGIN-CREDENTIAL-RECOVERY-AND-FINAL-PRODUCTION-E2E-V1`
- **작성일**: 2026-08-18
- **검증 환경**: production (실제 브라우저 · 토큰 주입 없음)
- **상태**: **PASS — 단, WO 전제(실제 운영자 로그인 차단)는 재현되지 않음**
- **production 변경**: **없음** (계정 생성 0 · credential 변경 0 · 데이터 write 0)

---

## 0. 결론 먼저 — 전제 불성립

WO 는 "KPA / K-Cosmetics / Neture 의 **실제 운영자 로그인이 차단**되어 있다"는 전제로 credential 복구를 지시했다.
**production 실측 결과 3개 서비스 모두 기존 Identity V2 service credential 로 정상 로그인된다.** 차단 사유가 존재하지 않으므로
복구 대상이 없었고, 비밀번호 재설정·계정 신규 생성·DB 변경을 **일절 수행하지 않았다.**

따라서 본 CHECK 는 "복구 기록"이 아니라 **"차단 없음을 실제 폼 로그인으로 입증한 기록"** 이다.
WO 의 "완료 선언하지 말고 차단 원인을 보고한다" 조항은 차단이 실재할 때의 조항이며, 여기서는 §2 의 증거로 대체한다.

### 전제가 틀린 원인 (추정)

이전 검증 중 **API 직접 호출 시 `serviceKey` 를 누락**한 사례가 있었다.
`AuthLoginService.handleEmailLogin` 은 `serviceKey` 가 있고 `service_credentials` row 가 존재하면 **해당 서비스 credential** 로,
없으면 `users.password` 로 검증한다. 즉 `serviceKey` 누락 시 정상 계정도 401 `INVALID_CREDENTIALS` 가 된다.
"UI 는 되는데 curl 만 401" 패턴이 이번 전제의 근원으로 보인다. (UI 는 항상 `serviceKey` 를 보낸다.)

---

## 1. 계정·credential 상태 조사 (WO 1단계)

- 운영자 계정: `sohae2100@gmail.com` / user id `cfd2a5e7-db28-4842-bd5c-4814cba49ca5` / status `active`
- credential SSOT: `docs/local/TEST-ACCOUNTS.local.md` (gitignored — 본 문서에 비밀번호를 기록하지 않는다)
- 보유 role (`/auth/status` 실측):

```
kpa:operator, kpa:admin, kpa:store_owner,
cosmetics:operator, cosmetics:admin,
neture:operator, neture:admin,
glycopharm:operator, glycopharm:admin,
pharmacy-hub:operator, pharmacy-hub:admin,
kpa-branch:operator
```

`permissions: []` (백엔드가 채우지 않음 — 기존 확인 사항과 일치), `scopes` 는 서비스별로 채워짐.

### 서비스별 credential 분리 확인

| serviceKey | 사용 credential | 결과 |
|---|---|---|
| `kpa-society` | KPA 계열 | **200 · 쿠키 정상 발급** |
| `k-cosmetics` | KPA 계열 | **200 · 쿠키 정상 발급** |
| `neture` | KPA 계열 | **200 · 쿠키 정상 발급** |
| `glycopharm` | KPA 계열 | **200 · 쿠키 정상 발급** |
| `pharmacy-hub` | PH 전용 | **200 · 쿠키 정상 발급** |
| `kpa-society` / `k-cosmetics` / `neture` 에 **PH 비밀번호** | (교차 시도) | **401 `INVALID_CREDENTIALS`** |

마지막 행이 중요하다 — **service credential 이 서비스별로 실제 분리되어 있음**을 반증으로 확인했다.
Identity V2 계약이 정상 동작 중이며, 이 때문에 "다른 서비스 credential 덮어쓰기" 금지 조항을 위반할 필요 자체가 없었다.

---

## 2. 실제 브라우저 폼 로그인 (WO 4~6단계 · 토큰 주입 없음)

검증 방식: Playwright 로 **로그인 화면 접속 → 이메일/비밀번호 input 실제 입력 → 제출 → 로그인 API 응답 status 수신**.
localStorage/쿠키 주입 없음. 각 서비스 desktop(1440×900) + mobile(390×844) 2 viewport.

| 서비스 | origin | 로그인 HTTP | 로그인 후 착지 |
|---|---|:---:|---|
| KPA-Society | `kpa-society.co.kr` | **200** | `/admin/kpa-dashboard` |
| K-Cosmetics | `k-cosmetics.site` | **200** | `/admin` |
| Neture | `neture.co.kr` | **200** | `/admin` |
| Pharmacy-Hub | `pharmacyhub.co.kr` | **200** | `/` |
| GlycoPharm (회귀) | `glycopharm.co.kr` | **200** | `/admin` |

> K-Cosmetics 의 production origin 은 `k-cosmetics.site` 다 (`.co.kr` 아님).

---

## 3. `/operator` 진입 · 대표 메뉴 · deep link · 새로고침

각 행: 실제 이동 → 렌더 텍스트 길이 → white screen 여부 → sidebar 링크 수 → "준비 중" 류 placeholder 검출 수.

### KPA-Society (desktop / mobile 동일 결과)

| route | len | white | sidebar | placeholder |
|---|---:|:---:|---:|:---:|
| `/operator` | 995 / 988 | 없음 | 10 | 0 |
| `/operator/members` | 렌더됨 | 없음 | 14 | 0 |
| `/operator/product-applications` | 834 | 없음 | 14 | 0 |
| `/operator/event-offers` | 429 / 421 | 없음 | 14 | 0 |

deep link(새 탭 직접 진입) · 새로고침 모두 동일 렌더.

### K-Cosmetics

| route | len | white | sidebar | placeholder |
|---|---:|:---:|---:|:---:|
| `/operator` | 617 | 없음 | 10 | 0 |
| `/operator/members` | 1430 | 없음 | 10 | 0 |
| `/operator/products` | 1395 | 없음 | 10 | 0 |
| `/operator/orders` | 384 | 없음 | 10 | 0 |

### Neture

| route | len | white | sidebar | placeholder |
|---|---:|:---:|---:|:---:|
| `/operator` | 987 | 없음 | 7 | 0 |
| `/operator/members` | 1576 | 없음 | 10 | 0 |
| `/operator/stores` | 2069 | 없음 | 10 | 0 |
| `/operator/orders` | 260 | 없음 | 10 | 0 |

### Pharmacy-Hub (회귀)

| route | len | white | sidebar | placeholder |
|---|---:|:---:|---:|:---:|
| `/operator` | 286 / 276 | 없음 | 2 | 0 |
| `/operator/memberships` | 808 / 798 | 없음 | 2 | 0 |

본문 실측: `Pharmacy-Hub 운영자 · 현재 운영자 영역의 업무는 가입 신청 승인·반려 입니다.` — 문서상 좁은 범위와 일치.

### GlycoPharm (공유 모듈 회귀만)

| route | len | white | sidebar | placeholder |
|---|---:|:---:|---:|:---:|
| `/operator` | 612 | 없음 | 9 | 0 |

deep link · 새로고침 · 재로그인 후 모두 612 동일. 공유 operator shell 회귀 없음.

**dead link 0 / white screen 0 / placeholder 0 / JS exception 0** (§6 의 리소스 404 제외 — 스크립트 예외 아님).

---

## 4. logout · 재로그인 (실제 UI 조작)

로그아웃 버튼은 `packages/account-ui` 의 `GlobalUserProfileDropdown` 내부에 있어 **계정 메뉴를 먼저 연 뒤** 클릭해야 한다
(PharmacyHub 만 shell 헤더에 직접 노출).

| 서비스 | logout HTTP | 로그아웃 후 `/operator` | 재로그인 | 재진입 |
|---|:---:|---|:---:|---|
| KPA | **200** | `/login` 으로 리다이렉트 | 200 | `/operator` 정상(995) |
| K-Cosmetics | **200** | `/login` 으로 리다이렉트 | 200 | `/operator` 정상(617) |
| Neture | **200** | **`/` (홈) 으로 착지** | 200 | `/operator` 정상(987) |
| Pharmacy-Hub | **200** | "로그인이 필요합니다" 게이트 | 200 | `/operator` 정상 |

세션 파기 자체는 4/4 정상. Neture 만 미인증 `/operator` 접근 시 `/login` 이 아니라 `/` 로 보낸다 (§6 R3).

---

## 5. production API 권한 경계 (WO 7단계)

| 호출 | 인증 상태 | 결과 |
|---|---|:---:|
| `GET /api/v1/kpa/operator/product-applications` | operator 쿠키 | **200** |
| `GET /api/v1/kpa/operator/contact-requests` | operator 쿠키 | **200** |
| `GET /api/v1/cosmetics/operator/product-applications` | operator 쿠키 | **200** |
| `GET /api/v1/pharmacy-hub/operator/memberships` | operator 쿠키 | **200** |
| `GET /api/v1/kpa/operator/product-applications` | **인증 없음** | **401 `AUTH_REQUIRED`** |
| `GET /api/v1/pharmacy-hub/operator/memberships` | **인증 없음** | **401 `AUTH_REQUIRED`** |

추가로 `/operator` 화면들이 실제로 발생시킨 `/api/v1/*` 호출을 전수 캡처했다 —
KPA 8건 / K-Cosmetics 4건 / Neture 6건 / PharmacyHub 2건, **전부 200**. 403·500 없음.
(Neture 실측 경로: `/neture/operator/dashboard`, `/neture/operator/suppliers`, `/operator/members`, `/operator/members/stats`.)

---

## 6. 잔여 관측 (본 WO 범위 밖 — 별도 WO 제안)

| # | 내용 | 영향 |
|---|---|---|
| R1 | PharmacyHub `GET /api/v1/public/services/pharmacy-hub/footer-legal` **404** | footer 약관 링크 데이터 부재. 화면 렌더는 정상 |
| R2 | KPA `public/services/kpa-society/policies/{terms,privacy}` 및 `kpa/legal/documents/published/{terms,privacy}` **404 ×4** | 약관·개인정보 문서 미발행. 콘솔 404 만 발생 |
| R3 | Neture 미인증 `/operator` 접근이 `/login` 이 아닌 `/` 로 착지 | 타 3서비스와 동선 불일치. 보안 결함 아님(접근은 차단됨) |
| R4 | 검증 harness 가 page context 에서 직접 호출한 `fetch('/api/v1/auth/logout')` 은 **401** | **harness 산출물이지 제품 결함 아님** — 실제 UI 로그아웃은 4/4 모두 200 |

R4 를 명시하는 이유: 결과 JSON 의 `netFail` 에 `401 /api/v1/auth/logout` 이 전 서비스에 남아 있어
후속 세션이 이를 제품 결함으로 오독할 수 있다.

---

## 7. WO 금지 조항 준수

| 금지 항목 | 준수 |
|---|:---:|
| DB 직접 password hash 수정 | 수행 안 함 |
| `users.password` 임의 변경 | 수행 안 함 |
| 다른 서비스 credential 덮어쓰기 | 수행 안 함 |
| 토큰 주입을 실제 로그인 PASS 로 판정 | 전 서비스 실제 폼 입력으로만 판정 |
| production 실사용자 데이터 훼손 | write 0건 |

**복구한 계정 0 / 새로 만든 계정 0 / 정리할 테스트 데이터 0** (생성한 것이 없으므로 정리 대상 없음).

---

## 8. 회귀

- **소스 코드 변경 없음** — 본 WO 는 검증 전용이며 문서 1건만 추가한다.
- 따라서 typecheck / build / CI 영향 없음 (변경 파일이 `docs/` 뿐).
- 작업 중 관측된 다른 세션 소유의 미커밋 변경(auth 에러메시지 계열)은 **접촉하지 않았다.**

---

## 9. 최종 판정

| 서비스 | 실제 폼 로그인 | `/operator` | 권한 판정 | 대표 메뉴·deep link | logout·재로그인 | 판정 |
|---|:---:|:---:|:---:|:---:|:---:|:---:|
| KPA-Society | 200 | PASS | PASS | PASS | PASS | **PASS** |
| K-Cosmetics | 200 | PASS | PASS | PASS | PASS | **PASS** |
| Neture | 200 | PASS | PASS | PASS | PASS(R3) | **PASS** |
| Pharmacy-Hub | 200 | PASS | PASS | PASS | PASS | **PASS(회귀)** |
| GlycoPharm | 200 | PASS | — | PASS | PASS | **PASS(회귀)** |

`/operator` 진입 5/5 · 권한 판정 4/4 · dead link 0 · white screen 0 · JS exception 0.

**남은 차단 요소: 없음.**

---

## 10. 문서 정합

발견 0건 / SUPERSEDED 표기 0건 / 링크 수정 0건 / 별도 WO 제안 3건 (R1 · R2 · R3).
