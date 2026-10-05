# O4O-NETURE-PHARMACY-SIGNUP-APPROVAL-CONTRACT-V1

> **상태**: ACTIVE
> **작성일**: 2026-10-05 · **최종 갱신**: 2026-10-05
> **근거 WO/IR**: WO-O4O-NETURE-PHARMACY-SIGNUP-APPROVAL-UX-AND-AUTH-CONTRACT-V1 · 입력 [`DESIGN-NETURE-PHARMACY-STORE-COMMERCE-V1`](../design/DESIGN-NETURE-PHARMACY-STORE-COMMERCE-V1.md) §3 · §5 (PR #308)

Neture 약국이 **로그인 이후 기본 가입 → 신청 → 대기 · 반려 · 승인 → 이용**, 그리고 **세미프랜차이즈 별도 신청 · 승인**을 거치는 경험과, 그 경험이 기대는 가입 · 승인 계약을 정한다.

- 데이터 원장 · API · 상태 전이 구현은 DESIGN §2 · §3 이 정본이다. 이 문서는 그것을 **사용자 · 운영자 화면 계약**과 **Auth 책임 경계**로 옮긴다. 둘이 다르면 구현(DESIGN)이 아니라 이 문서의 확정 · 미확정 구분을 먼저 확인한다.
- 사업적으로 정하지 않은 것은 §2 에 **미확정**으로 남긴다. 현재 구현이 어떻게 동작하는지와 사업이 그렇게 정했는지는 다른 질문이다.

---

## 1. 확정 사항

| # | 내용 |
|---|---|
| C1 | **Neture 기본 승인과 세미프랜차이즈 승인은 별개다.** 기본 승인은 어떤 세미프랜차이즈 가입도 만들지 않는다. `pharmacy` 세미프랜차이즈도 같은 신청 절차를 거친다(자동 가입 없음). |
| C2 | **기존 `kpa-society` 자격을 Neture 기본 자격으로 재해석하지 않는다.** `kpa-society` 가입 · `kpa_members` · `kpa_pharmacist_profiles` · `kpa:store_owner` 는 신청 판정 · 화면 안내 어디에도 근거로 쓰지 않고, 기존 가입자를 자동 전환하지 않는다. |
| C3 | **K-Cosmetics 는 이 흐름의 대상이 아니다.** 약국 가입 · 세미프랜차이즈 화면은 약국 문맥(web-store `effectiveServiceKey='kpa-society'`)에서만 열린다. 다른 업종 문맥은 안내만 한다. |
| C4 | **공급자 가입 승인과 제품 등록 승인은 분리된 두 단계다.** 공급자 가입 승인(`/operator/suppliers/:id/approve`)은 공급자 자격이고, 제품 등록 승인은 제품마다 따로 한다. 약국 기본 가입 · 세미프랜차이즈 가입과도 섞지 않는다. |
| C5 | **`organizations` 행 하나 = 약국 = 내 매장.** 기본 가입 원장은 약국 조직당 1행, 사용자당 owner 약국 1개(DESIGN R1 · R2). |
| C6 | 기본 가입 상태값은 원장 상태값 그대로다: `pending · active · rejected · suspended · terminated`. 화면이 상태를 새로 만들거나 합치지 않는다. |
| C7 | 자격 확인은 **운영자 검토**다. 자동 검증 · 점수 없음. |

## 2. 미확정 (임의 결정 금지)

| # | 항목 | 현재 구현(PR #308) | 처리 |
|---|---|---|---|
| U1 | **기본 승인 전 세미프랜차이즈 신청 허용 여부** | 세미프랜차이즈 신청 API 가 내 매장 게이트(기본 가입 active) 뒤에 있어 **기본 승인이 선행된다.** 운영자 승인 시에도 `BASIC_MEMBERSHIP_NOT_ACTIVE` 로 막는다 | 사업 판단 대기. 화면은 이것을 규칙으로 선언하지 않고 "현재는 기본 가입 승인 후 신청할 수 있습니다" 라는 **현재 동작 안내**로만 표시한다(문구는 계약 파일 한 곳). 결정되면 백엔드 게이트와 이 문구를 함께 바꾼다 |
| U2 | **제출 서류(대상 · 저장 · 보존 기간)** | 원장에 서류 컬럼 · 파일 저장 없음 | §4-3. 서류 종류 · 개인정보 보존 기간은 법률 · 규제 판단이고 저장은 schema 변경이라 이 WO 범위 밖. UI 는 업로드 칸을 만들지 않는다 |

## 3. 상태 모델과 화면

### 3-1. Neture 기본 가입

전이(DESIGN §3-1, 구현 `nextMembershipStatus`):

```text
(없음) ──신청──▶ pending ──승인──▶ active ──정지──▶ suspended ──재개──▶ active
                   │                 │                  │
                   └──반려──▶ rejected   └──종료──▶ terminated ◀──종료──┘
rejected | terminated ──재신청(같은 행)──▶ pending
```

| 상태 | 사용자에게 보이는 이름 | 사용자 화면 | 사용자가 할 수 있는 일 |
|---|---|---|---|
| (없음) | 미신청 | 신청 양식 + 진행 단계 + 승인 후 이용 안내 | 신청 |
| `pending` | 승인 대기 | 제출한 정보 요약 · "운영자 확인 중" · 진행 단계 2/3 | 기다림(수정 · 취소 API 없음 — 필요하면 별도 WO) |
| `active` | 이용 중 | 이용 가능한 기능 · 다음 단계(세미프랜차이즈 신청 — 별도 승인) | 내 매장 진입 |
| `rejected` | 반려 | **반려 사유** + 수정 후 재신청 양식(이전 값 채움) | 재신청 |
| `suspended` | 정지 | **정지 사유** · 운영자 문의 안내 · 이용 제한 설명 | 없음(운영자가 재개) |
| `terminated` | 종료 | 종료 사유 · 재신청 양식 | 재신청 |

- 재신청은 같은 원장 · 같은 조직을 `pending` 으로 되돌린다(약국 1 : 매장 1 유지).
- 진행 단계 표시는 `신청 → 운영자 확인 → 이용 시작` 3단계다. 반려 · 정지 · 종료는 단계가 아니라 상태 카드로 보여준다.

### 3-2. 세미프랜차이즈 가입

상태값 · 전이는 기본 가입과 같다(`semi_franchise_memberships`). 차이:

- 승인 주체 = 그 세미프랜차이즈 **담당 운영자**(`neture:operator` ∧ 활성 담당 행). Neture 기본 가입 운영자 권한만으로는 처리하지 않는다.
- 약국 본인은 **신청 취소(pending) · 탈퇴(active · suspended)** 를 할 수 있다(결과 `terminated`).
- 화면은 세미프랜차이즈별 행으로 상태 · 사유 · 신청/처리일 · 커뮤니티 이용 가능 여부를 보여준다. 기본 가입 상태와 **같은 카드에 합치지 않는다**(C1).

## 4. 신청 항목

### 4-1. 필수 (원장 저장)

| 항목 | 규칙 | 서버 오류 코드 |
|---|---|---|
| 약국 이름 | 1~255자 | `INVALID_PHARMACY_NAME` |
| 사업자등록번호 | 숫자 10자리(하이픈 허용 · 서버가 숫자만 남김). 진행 중(`pending · active · suspended`) 중복 불가 | `INVALID_BUSINESS_NUMBER` · `BUSINESS_NUMBER_IN_USE` |
| 약사 면허번호 | 1~30자 | `INVALID_LICENSE_NUMBER` |

화면은 같은 규칙을 제출 전에 검사해 즉시 알려준다. 판정은 서버가 한다.

### 4-2. 추가 정보 (선택 · 약국 조직에 저장)

| 항목 | 규칙 | 비고 |
|---|---|---|
| 주소 | ≤500자 | `organizations.address` |
| 전화번호 | ≤50자 | `organizations.phone` |

- 현재 `GET /pharmacy/membership` 은 이 두 값을 돌려주지 않는다. 재신청 때 비워 두면 서버가 기존 값을 유지한다(`COALESCE`) — 화면은 이를 안내한다. 조회 응답 확장은 PR #308 소유 API 변경이므로 통합 후 처리.

### 4-3. 제출 서류 (요구사항 모델 — 미구현, U2)

운영자 검토(C7)를 보조하는 증빙이다. 구현 시 아래 모델을 따른다.

```text
requirement = { key, label, required: boolean, accept: MIME[], maxBytes, retention }
submission  = { membershipId, key, fileRef, submittedAt, reviewedAt?, reviewNote? }
```

- 후보: 사업자등록증 사본 · 약사 면허증 사본. **어떤 서류를 필수로 할지, 보존 기간, 열람 권한은 사업 · 법률 판단(U2).**
- 저장은 원장 schema 변경(migration) — 별도 WO 와 사용자 승인.
- 서류는 **운영자 검토 자료**이지 자동 판정 입력이 아니다(C7). 서류 미제출을 이유로 원장 상태를 자동 변경하지 않는다.

## 5. 승인 후 이용 안내

| 조건 | 이용 가능 |
|---|---|
| 기본 가입 `active` | 내 매장 기본 기능(매장 정보 · 콘텐츠 자료함 · QR · 사이니지 · 태블릿 등 — DESIGN §5), 세미프랜차이즈 가입 신청 |
| + `pharmacy` 세미프랜차이즈 `active` | 기본 공급 상품 주문(DESIGN §4 `default`) |
| + 해당 세미프랜차이즈 `active` | 그 세미프랜차이즈의 공급 제안 · 이벤트 · 취급매장 모집 · 커뮤니티 |
| 기본 가입 `suspended · terminated` | 내 매장 · 세미프랜차이즈 공급 전부 이용 불가(서버 게이트) |

화면 안내는 이 표를 그대로 쓴다. 메뉴 숨김은 안내일 뿐 판정은 서버다.

## 6. 운영자 화면

### 6-1. 기본 가입 심사 (`/operator/pharmacy-memberships`, `neture:operator`)

| 상태 | 처리 |
|---|---|
| `pending` | 승인 · 반려 |
| `active` | 정지 · 종료 |
| `suspended` | 재개 · 종료 |
| `rejected` · `terminated` | 없음(약국 재신청 대기) |

- **반려 · 정지 · 종료는 사유 필수**(화면 규칙). 사유는 약국 화면에 그대로 보인다 — 약국이 고칠 수 있게 쓴다. 서버는 사유를 선택으로 받는다(API 계약 불변).
- 승인 · 재개 전에 확인 항목(사업자등록번호 · 약사 면허번호 확인, KPA 가입은 근거 아님)을 보여주고 확인을 받는다.
- 목록은 상태 필터 · 약국명/사업자번호 검색 · 신청일 · 처리일 · 사유를 보여준다.

### 6-2. 세미프랜차이즈 가입 처리 (`/operator/semi-franchises`, 담당 운영자)

- 신청 목록에 기본 가입 원장의 사업자번호 · 면허번호 · **기본 가입 상태**를 함께 보여준다(DESIGN §3-2). 같은 사유 필수 규칙을 쓴다.

## 7. Auth 책임 경계

소유 경계의 정본은 [`DESIGN-NETURE-PHARMACY-STORE-COMMERCE-V1` §13](../design/DESIGN-NETURE-PHARMACY-STORE-COMMERCE-V1.md) 이다(사용자 결정 2026-10-05). 여기에 복제하지 않고 이 문서와 관계만 적는다.

| 구분 | 소유 | 이 문서와의 관계 |
|---|---|---|
| 기본 가입 원장 · 상태 전이 · 신청/재신청 · 운영자 처리 · 승인 orchestration · role 발급/회수 | **인증 · 가입 트랙** | 이 문서가 그 트랙의 **화면 계약**이다(`/start-pharmacy` · `/operator/pharmacy-memberships` · §3 · §4 · §6). 공통 가입 · 추가정보 흐름에 편입할 때 기존 서비스를 확장하고 새로 만들지 않는다(§13) |
| 약국 조직 생성 · owner 관계 · enrollment · slug | **Store 트랙** (`pharmacy-store-link.ts` 계약 함수) | 인증 트랙은 계약 함수를 호출만 한다 |
| 세미프랜차이즈 가입 · 담당 운영자 | **Store/Commerce 트랙** | §3-2 · §6-2 는 그 화면의 표시 규칙만 정한다 |

- 이 WO 는 화면 · 화면 계약 · 이 문서만 바꾼다. 위 백엔드(원장 서비스 · 승인 API · provisioner · `pharmacy-store-link.ts` · migration)는 PR #308 소유라 수정하지 않는다.
- 서버 쪽 인계(파일 · 라우트 이관 · 추가정보 확장 · 서류 저장 U2)는 PR #308 main 통합 후 인증 · 가입 트랙의 별도 작업이다.

## 8. 프론트 계약 파일

| 앱 | 파일 | 내용 |
|---|---|---|
| web-store | `src/pages/neture-pharmacy/signupContract.ts` | 상태별 화면 모델(이름 · 설명 · 다음 행동) · 진행 단계 · 신청 항목 규칙(§4-1 · §4-2) · 승인 후 이용 안내(§5) · U1 현재 동작 문구 |
| web-neture | `src/lib/api/neturePharmacy.ts` 의 `MEMBERSHIP_ACTIONS_BY_STATUS` · `REASON_REQUIRED_ACTIONS` | 운영자 처리 가능 행동(§6-1) · 사유 필수 행동 |

API 는 DESIGN §3-1 · §3-2 그대로 소비한다(`/api/v1/neture/pharmacy/membership` · `/pharmacy/semi-franchises` · `/operator/pharmacy-memberships` · `/operator/semi-franchises/:key/memberships`). 가짜 백엔드 · 임시 API 를 만들지 않는다.
