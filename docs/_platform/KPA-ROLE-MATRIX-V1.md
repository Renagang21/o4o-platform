# KPA-A/B/C 권한 매트릭스 v1.0

> 2026-02 기준 구조 고정 문서
> 이 문서는 KPA 서비스 전체의 역할/권한/격리 원칙을 고정한다.

---

## 1. 전제

- KPA-a, KPA-b, KPA-c는 **서로 독립 서비스**
- 각 서비스는 **자체 Operator 집합**
- organizationId는 **서비스 내부 범위**
- 플랫폼 전역 조직 개념 없음

---

## 2. Role Namespace (현행 유지)

```
kpa:admin
kpa:operator
kpa:branch_admin
kpa:branch_operator
```

- `platform:*`은 KPA 영역 접근 불가
- legacy `branch_admin` 차단 유지

---

## 3. 서비스별 역할 범위

### KPA-a (본 서비스)

| Role | 범위 | 설명 |
|------|------|------|
| kpa:admin | 전역 | 회원/콘텐츠/감사 로그 |
| kpa:operator | 전역 | 콘텐츠/포럼 관리 |
| kpa:branch_admin | ❌ | 접근 불가 |
| kpa:branch_operator | ❌ | 접근 불가 |

organizationId = null

### KPA-c (분회 서비스)

| Role | 범위 | 설명 |
|------|------|------|
| kpa:branch_admin | organizationId 범위 | CMS + 설정 |
| kpa:branch_operator | organizationId 범위 | CMS |
| kpa:admin | 전체 branch 접근 허용 (의도적 정책) | |
| kpa:operator | 전체 branch 접근 허용 (의도적 정책) | |

organizationId = 분회 ID

### KPA-b (데모/별도 서비스)

현재 CMS 없음.
추후 정의 시:
- organizationScoped 여부 결정
- branch 개념 적용 여부 별도 설계

---

## 4. CMS 권한 매트릭스

### KPA-a CMS (cms_contents)

| Role | CREATE | UPDATE | DELETE | LIST ADMIN |
|------|--------|--------|--------|------------|
| kpa:admin | ✔ | ✔ | ✔ | ✔ |
| kpa:operator | ✔ | ✔ | ✔ | ✔ |
| branch roles | ❌ | ❌ | ❌ | ❌ |

### KPA-c CMS (kpa_branch_news 등)

| Role | CREATE | UPDATE | DELETE | LIST ADMIN |
|------|--------|--------|--------|------------|
| kpa:branch_admin | ✔ | ✔ | ✔ | ✔ |
| kpa:branch_operator | ✔ | ✔ | ✔ | ✔ |
| kpa:admin | ✔ | ✔ | ✔ | ✔ |
| kpa:operator | ✔ | ✔ | ✔ | ✔ |
| 일반 회원 | ❌ | ❌ | ❌ | ❌ |

---

## 5. Guard 원칙

모든 보호 API는 다음 3단계 확인:

1. **Role 확인** — `requireKpaScope()` 또는 `isBranchOperator()`
2. **serviceKey 격리** — CMS는 serviceKey로 데이터 분리
3. **organizationId 범위 확인** — branch 서비스는 서버 측 org lookup

---

## 6. 감사 정책

| 서비스 | 감사 로그 |
|--------|----------|
| KPA-a | 전면 적용 |
| KPA-c | 전면 적용 |
| KPA-b | 미정 |

Audit 실패는 CUD를 차단하지 않는다 (non-blocking).

---

## 7. 삭제 정책

| 서비스 | 정책 |
|--------|------|
| KPA-a | soft delete (status='archived') |
| KPA-c | soft delete (is_deleted=true) |
| KPA-b | TBD |

Hard delete 금지.

---

## 8. 서비스 간 격리 원칙

- KPA-a는 branch 테이블 접근 불가
- KPA-c는 cms_contents 접근 불가
- serviceKey 없는 cross 조회 금지

---

## 9. 확장 원칙

신규 KPA 서비스 추가 시:
- serviceKey 필수
- organizationScoped 여부 명시
- Role 허용 범위 문서화 후 구현
- Core 수정 금지

---

## 10. 구조 확정 선언

이 문서는 다음을 고정한다:
- Role namespace 유지 (`kpa:*`)
- Owner 모델 유지 (organizationId)
- 서비스 독립 원칙 유지
- Core 동결 준수

---

*Created: 2026-02-14*
*Version: 1.0*
*Status: Frozen*
