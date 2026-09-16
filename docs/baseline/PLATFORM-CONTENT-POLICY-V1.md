# IR-O4O-PLATFORM-CONTENT-POLICY-FINAL-V1

**Platform Content Policy -- Final Declaration**
Date: 2026-02-23
Status: Official Policy Baseline

---

## 1. 목적

O4O Platform 내 HUB에 노출되는 모든 콘텐츠는
도메인(CMS, Signage 등)에 관계없이
**공통 3축 모델**에 따라 관리/노출된다.

이 문서는 플랫폼 콘텐츠 정책의 공식 기준을 선언한다.

---

## 2. HUB 콘텐츠 통합 모델

HUB는 내부 도메인 구현과 무관하게
다음 3가지 축으로 콘텐츠를 판단한다.

```text
1. Producer (제작 주체)
2. Visibility (가시성 범위)
3. Service Scope (서비스 격리)
```

---

## 3. Producer 정의

### 3.1 HUB Producer Enum

```ts
type HubProducer = 'operator' | 'supplier' | 'community' | 'store';
```

> **Canonical 재정렬 (2026-09-16 · `WO-O4O-CONTENT-BOUNDARY-ALIGNMENT-V1`):**
> [`O4O-ROLE-WORKSPACE-ARCHITECTURE-V1`](O4O-ROLE-WORKSPACE-ARCHITECTURE-V1.md) §2-1 기준 **`Supplier → Store Hub` 는 공식 온라인 제공 경로**다. 따라서 `supplier` Producer 는 legacy 예외가 아니라 **Canonical 4종 중 하나**다 (`operator` / `supplier` / `community` / `store`).
> 2026-05-23 의 "supplier = legacy 예외 · 공급자 → 오프라인 전달 → Operator 등록" 정렬은 폐기한다 (`O4O-3-ROLE-FLOW-BASELINE-V1` §2 · §6 은 SUPERSEDED).
>
> HubProducer 는 **Store Hub 노출(발견) 축**이며 논리 콘텐츠 도메인(Community / Service / Supplier / Store — `@o4o/types` `ContentDomain`)과 별개다. 소비처별 이동 판정과 Hub 축 축소는 Store Hub 리팩터링 단계가 정한다 (`CHECK-O4O-CONTENT-BOUNDARY-ALIGNMENT-V1` §7).

### 3.2 도메인별 매핑

| HUB Producer | CMS (authorRole)   | Signage (source) | 상태 |
| ------------ | ------------------ | ---------------- | ---- |
| operator     | admin / service_admin | hq               | Canonical |
| supplier     | supplier           | supplier         | Canonical (2026-09-16, Supplier → Store Hub) |
| community    | community          | community        | Canonical |
| store        | (visibility=store) | store            | Canonical |

---

## 4. Visibility 정의

### 4.1 HUB Visibility Enum

```ts
type HubVisibility = 'global' | 'service' | 'store';
```

### 4.2 도메인 매핑

| HUB Visibility | CMS                       | Signage        |
| -------------- | ------------------------- | -------------- |
| global         | visibilityScope='platform'  | scope='global' |
| service        | visibilityScope='service' | (미지원)          |
| store          | visibilityScope='organization'   | scope='store'  |

Signage는 현재 service scope를 지원하지 않는다.

---

## 5. Service Scope 규칙

모든 HUB 노출 콘텐츠는 반드시:

```sql
WHERE serviceKey = currentService
```

를 만족해야 한다.

Cross-service 노출은 허용되지 않는다.

---

## 6. HUB 탭 정책

상단 탭:

```
전체 | 운영자 | 공급자 | 커뮤니티
```

### 6.1 전체

조건:

```
visibility = 'global'
producer IN ('operator','supplier','community')
serviceKey = current
```

### 6.2 운영자

```
producer = 'operator'
visibility IN ('global','service')
serviceKey = current
```

### 6.3 공급자

> **Canonical 재정렬 (2026-09-16):** `Supplier → Store Hub` 는 공식 경로다 (ROLE-WORKSPACE-ARCHITECTURE §2-1). 공급자 제출(`cms_contents.authorRole='supplier'`) → 운영자 승인 게시 흐름이 이 탭의 원천이며, "Operator 가 대신 등록" 으로 전환하지 않는다. Store Hub 에서 운영자 검수가 개입하는지는 서비스별 정책이 유지된다 (Architecture §2-1).

```
producer = 'supplier'
visibility = 'global'
serviceKey = current
```

### 6.4 커뮤니티

```
producer = 'community'
visibility = 'global'
serviceKey = current
```

`store` 콘텐츠는 HUB 탭에 포함되지 않는다.

---

## 7. 생성 정책

### 7.1 CMS

* authorRole 서버 강제 세팅
* visibilityScope 서버 강제 세팅
* serviceKey 서버 기준
* organizationId scope에 따라 세팅

### 7.2 Signage

* source 서버 강제 세팅
* scope 서버 강제 세팅
* organizationId 강제 세팅
* serviceKey URL param 기준

PATCH 시 producer/visibility 변경 불가.

---

## 8. 보안 원칙

1. 제작 주체 필드는 클라이언트 입력을 신뢰하지 않는다.
2. 가시성 필드는 서버에서 강제한다.
3. serviceKey는 URL 기준이며 body 값은 무시한다.
4. scope/service 격리는 항상 DB 쿼리 조건으로 적용한다.
5. RBAC 실패는 500이 아닌 403으로 처리한다.

---

## 9. 도메인 독립 원칙

CMS와 Signage는 내부 구조를 유지한다.

HUB는:

* 내부 필드명에 의존하지 않는다.
* Producer + Visibility + ServiceKey 3축 기준만 사용한다.
* 도메인 확장 시 매핑 레이어만 수정한다.

---

## 10. 향후 확장 포인트

1. Signage에 service scope 도입 여부 (Phase2 검토)
2. CMS/Signage 필드명 정규화 여부 (중기 과제)
3. HubContentQueryService 통합 레이어 도입
4. Store 콘텐츠 HUB 노출 정책 재검토
5. ~~`producer='supplier'` 정책의 단계적 전환~~ — **폐기 (2026-09-16)**. `Supplier → Store Hub` 가 공식 경로로 확정되어 전환 대상이 아니다. 대신 Store Hub 단계에서 Hub 를 공개 발견 축(`Platform/Public` · `Supplier/Public`)으로 재정의할 때 `community` / `store` producer 소비처의 이동을 판정한다 (`CHECK-O4O-CONTENT-BOUNDARY-ALIGNMENT-V1` §7).

---

## 11. 공식 선언

O4O Platform의 HUB 콘텐츠 노출 정책은
본 문서의 3축 모델을 기준으로 운영한다.

도메인 구현 변경이 발생하더라도
HUB 노출 정책은 이 기준을 따른다.

---

## 12. 정책 상태

* CMS Visibility Phase1 완료
* RBAC Foundation 정상화 완료
* Signage Supplier/Community 생성 완료
* HUB Producer 통합 완료

본 문서는 0.80 운영형 알파 기준의 공식 정책 문서이다.

---

*Generated: 2026-02-23*
*Status: Official Policy Baseline*
*WO: IR-O4O-PLATFORM-CONTENT-POLICY-FINAL-V1*
