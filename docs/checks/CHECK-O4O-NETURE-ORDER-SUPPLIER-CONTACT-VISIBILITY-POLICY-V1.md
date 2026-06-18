# CHECK-O4O-NETURE-ORDER-SUPPLIER-CONTACT-VISIBILITY-POLICY-V1

> **작업명:** CHECK-O4O-NETURE-ORDER-SUPPLIER-CONTACT-VISIBILITY-POLICY-V1
> **유형:** 정책 명문화 (documentation only) — 코드/API/DB/route/권한/ContactVisibility 로직 변경 0.
> **결과: 확정 — 주문 상세의 공급자 연락처(phone/website) 노출을 "주문 당사자 한정 거래 연락처" 정책으로 명문화. 데이터 유출 아님, 코드 변경 불필요.**
> 선행: IR-O4O-NETURE-SUPPLIER-PUBLIC-PROFILE-STORE-VISIBILITY-AUDIT-V1 (F1) — 2026-06-18

---

## 핵심 원칙 (한 문장)

> **ContactVisibility 는 일반 탐색/공개 노출 기준이고, 주문 상세의 공급자 연락처는 주문 권한을 가진 거래 당사자에게 제공되는 거래 연락처로 별도 허용한다.**

---

## 1. 배경

IR-O4O-NETURE-SUPPLIER-PUBLIC-PROFILE-STORE-VISIBILITY-AUDIT-V1 조사 결과:

- Neture 공급자 디렉터리/상세 API(`/neture/suppliers`, `/neture/suppliers/:slug`)는 ContactVisibility 모델(PUBLIC / PARTNERS / PRIVATE)을 적용한다 (`supplier.service.filterContactInfo`).
- 그러나 **주문 상세 enrichOrderItems 경로**(`seller.service.enrichOrderItems`)는 `contact_phone` / `contact_website` 를 entity 에서 직접 SELECT 하여 ContactVisibility 필터와 **별도로** 주문 매장에 노출한다.

이 노출은 **비로그인 공개 노출이나 일반 탐색 노출이 아니라, 이미 주문이 발생한 거래 당사자 화면**에서 배송·반품·교환·주문 문의 처리를 위해 필요한 연락처 노출이다.

→ 본 CHECK 는 이 동작을 **코드 버그로 보지 않고**, "주문 당사자 한정 거래 연락처" 정책으로 명문화하는 **무코드 문서 작업**이다.

## 2. 조사 출처

- `IR-O4O-NETURE-SUPPLIER-PUBLIC-PROFILE-STORE-VISIBILITY-AUDIT-V1` (§3 ContactVisibility 모델 · §5 발견 F1).

## 3. 현재 동작 요약

| 경로 | ContactVisibility 적용 | 공급자 연락처 노출 |
|------|:--:|------|
| `/neture/suppliers/:slug` (디렉터리 상세, requireAuth) | ✅ 적용 | email/phone/website/kakao 를 visibility 별 필터 (기본 phone=PRIVATE) |
| 주문 상세 `enrichOrderItems` (매장, 주문 권한) | ❌ 미적용(직접 SELECT) | supplier_name, **supplier_phone, supplier_website** |

- ContactVisibility 기본값: email=PUBLIC, **phone=PRIVATE**, website=PUBLIC, kakao=PARTNERS.
- 즉 디렉터리에서 PRIVATE 로 가려지는 전화가, **주문이 성립한 매장**에는 주문 상세에서 노출된다.

## 4. ContactVisibility 적용 범위 (비거래/사전 탐색)

ContactVisibility(PUBLIC/PARTNERS/PRIVATE)는 다음 **비거래·사전 탐색** 맥락에 적용한다.

- 일반 공급자 디렉터리 조회
- 공개/파트너 공급자 프로필 열람
- 상품 탐색 단계의 공급자 연락처
- 파트너십 성립 전 사전 검토

이 맥락에서는 공급자가 설정한 visibility 가 그대로 존중된다.

## 5. 주문 상세 예외 정책 (거래 당사자)

1. ContactVisibility 는 일반 공급자 디렉터리·공개 프로필·상품 탐색 등 **비거래/사전 탐색 맥락**에 적용한다.
2. 주문 상세 화면은 **이미 주문이 성립한 거래 당사자 맥락**이다.
3. **주문 권한을 가진 매장 경영자**에게는 공급자 거래 연락처를 노출할 수 있다.
4. 이 노출은 **공개 노출이 아니며**, 주문 상세 접근 권한을 통과한 사용자에게만 허용된다.
5. phone / website 는 **주문 문의·배송 협의·반품/교환 처리** 목적의 거래 연락처로 본다.
6. 사업자등록증, 정산계좌, 세금계산서 이메일, 통장 사본, 품목군 증빙 파일, 내부 심사 메모, 운영자 메모 등 민감 정보는 **여전히 노출 금지**다.
7. 향후 공급자가 "주문 당사자에게도 연락처 비공개"를 선택할 필요가 생기면 **별도 설정/WO 로 분리**한다.

## 6. 노출 허용 정보 (주문 상세, 거래 당사자 한정)

- supplier name (공급자 표시명)
- phone (거래 연락처)
- website (거래 연락처)
- 필요 시 주문 처리용 기본 문의 정보

## 7. 노출 금지 정보 (주문 상세 포함, 어느 맥락에서도)

- 사업자등록번호
- 사업자등록증 파일
- 정산 계좌
- 통장 사본
- 세금계산서 이메일
- 품목군 증빙 파일
- 내부 심사 메모
- 운영자 전용 검토 이력

> (IR 확인) 위 민감필드는 현재 코드상 공개·매장·주문 응답 어디에도 포함되지 않는다. 본 정책은 그 상태를 유지한다.

## 8. 보안 / 권한 조건

- 공급자 거래 연락처(주문 상세)는 **주문 상세 접근 권한을 통과한 사용자에게만** 허용한다.
- **비로그인 / 일반 탐색 / 디렉터리 조회에는 적용하지 않는다**(해당 맥락은 §4 ContactVisibility 가 지배).
- 주문 상세 노출은 주문 당사자 한정이므로 **데이터 유출이 아니다**.

## 9. 후속 검토 가능 항목 (본 CHECK 범위 외)

- 연락처 3분리: **공개 연락처 / 거래 연락처 / 내부 연락처**.
- 주문 당사자 연락처 비공개 옵션(공급자 설정).
- ContactVisibility model 확장(거래 맥락 enum 추가).

→ 위 확장이 필요해지면 본 CHECK 의 "거래 연락처" 정의를 기준으로 별도 WO 로 분리한다.

## 10. 결론

- 현재 주문 상세의 공급자 연락처(phone/website) 노출은 **데이터 유출이 아니라 "주문 당사자 한정 거래 연락처" 정책으로 허용**한다.
- ContactVisibility(PUBLIC/PARTNERS/PRIVATE)는 비거래/사전 탐색 맥락의 기준으로 유지한다.
- **코드 변경 불필요.** IR-F1 은 버그가 아니라 정책으로 고정(closed).

## 11. 준수 확인

```
✅ documentation only — 코드/API/DB/migration/route/권한/ContactVisibility 로직 변경 0
✅ 산출물 = 본 문서 1개(path-specific)
```

---

*확정: 2026-06-18 · 정책 명문화 · ContactVisibility=비거래/사전탐색(PUBLIC/PARTNERS/PRIVATE) / 주문 상세 공급자 연락처(phone·website)=주문 권한 보유 거래 당사자 한정 거래 연락처로 별도 허용 · 민감필드(사업자번호/정산/세금계산서/증빙/내부메모) 노출 금지 유지 · 데이터 유출 아님 · 코드 변경 불필요 · IR-F1 closed · 후속=공개/거래/내부 연락처 3분리 시 본 정의 기준.*
