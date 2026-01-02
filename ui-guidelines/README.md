# UI Guidelines

O4O Platform 프론트엔드 작업을 위한 참고 기준 자산

---

## 목적

이 디렉토리는 **프론트엔드 작업 시 판단 기준(anchor)으로 사용**하기 위한 참고 자산이다.

- 디자인 규칙을 강제하는 문서가 아니다
- 작업자가 "이 화면은 어떤 톤이어야 하는가?"를 판단할 때 참조한다
- Frontend Work Order의 Design Reference 섹션과 함께 사용한다

---

## 생성 정보

- **생성일**: 2026-01-02
- **버전**: 1.0
- **상태**: Active

---

## 사용 방법

### 1. Theme Profile 확인

화면의 성격에 따라 적절한 Theme Profile을 선택한다.

| Profile | 용도 | 파일 |
|---------|------|------|
| `Admin.Management` | 관리자/운영 화면 | [admin.management.md](theme-profiles/admin.management.md) |
| `Service.Professional` | 전문가 서비스 화면 | [service.professional.md](theme-profiles/service.professional.md) |
| `Consumer.Commerce` | 소비자 커머스 화면 | [consumer.commerce.md](theme-profiles/consumer.commerce.md) |

### 2. Frontend Work Order에서 참조

Work Order 작성 시 Design Reference 섹션에 Theme Profile 명칭을 기재한다.

```markdown
## Design Reference
- Theme Profile: `Service.Professional`
- 참고 화면: apps/glycopharm-web/src/pages/pharmacy/
```

### 3. 작업 중 판단 기준으로 활용

UI 구현 시 불확실한 상황이 발생하면:

1. 해당 Theme Profile 문서를 확인
2. "하지 말아야 할 것" 섹션과 대조
3. 대표 레퍼런스를 참고하여 일관성 유지

---

## 구조

```
ui-guidelines/
├── README.md                              # 이 파일
└── theme-profiles/
    ├── admin.management.md               # 관리자·운영형
    ├── service.professional.md           # 서비스·전문가형
    └── consumer.commerce.md              # 소비자·커머스형
```

---

## 주의사항

- 이 기준은 **확장 가능하지만 느슨하지 않다**
- 새로운 디자인 규칙을 창조하지 않는다
- 기존 프론트엔드 구현을 존중한다
- 의문이 있으면 기존 레퍼런스를 우선 참조한다

---

*이 자산은 정식 서비스 화면 기준을 따른다*
