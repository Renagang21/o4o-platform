# Cloud SQL Admin API 활성화 가이드

## 현재 상황
로컬에서 `gcloud sql` 명령어 실행 시 다음 에러 발생:
```
API [sqladmin.googleapis.com] not enabled on project [o4o-platform]
```

## 해결 방법

### Option 1: 웹 콘솔에서 활성화 (권장)

1. **API 활성화 페이지 접속:**
   https://console.developers.google.com/apis/api/sqladmin.googleapis.com/overview?project=o4o-platform

2. **"API 사용 설정" 버튼 클릭**

3. **몇 분 대기** (API 활성화가 전파되는 시간)

4. **gcloud 명령어 재시도:**
   ```bash
   gcloud sql instances list --project=o4o-platform
   ```

### Option 2: gcloud CLI에서 활성화

```bash
gcloud services enable sqladmin.googleapis.com --project=o4o-platform
```

### Option 3: 이미 배포된 Admin API 사용 (가장 안전)

로컬에서 gcloud로 직접 DB를 조작하는 것보다, **이미 배포된 Admin API 엔드포인트를 사용하는 것이 더 안전합니다.**

#### 브라우저 콘솔에서 실행:

1. GlycoPharm에 관리자로 로그인
2. F12 → Console 탭
3. 다음 코드 실행:

```javascript
// 1. 마이그레이션 실행
await fetch('https://api.neture.co.kr/api/v1/glycopharm/admin/migrate/add-product-fields', {
  method: 'POST',
  credentials: 'include',
  headers: { 'Content-Type': 'application/json' }
}).then(r => r.json()).then(console.log);

// 2. 제품 활성화
await fetch('https://api.neture.co.kr/api/v1/glycopharm/admin/products/activate-all', {
  method: 'POST',
  credentials: 'include',
  headers: { 'Content-Type': 'application/json' }
}).then(r => r.json()).then(console.log);

// 3. 포럼 카테고리 생성 (기존 승인된 요청)
await fetch('https://api.neture.co.kr/api/v1/glycopharm/forum-requests/admin/create-missing-categories', {
  method: 'POST',
  credentials: 'include',
  headers: { 'Content-Type': 'application/json' }
}).then(r => r.json()).then(console.log);
```

## 필요한 IAM 권한

로컬에서 Cloud SQL에 접근하려면 다음 권한 필요:
- `roles/cloudsql.client` - Cloud SQL Client 역할
- `roles/cloudsql.admin` - Cloud SQL Admin 역할 (관리 작업용)

### 권한 확인:
```bash
gcloud projects get-iam-policy o4o-platform \
  --flatten="bindings[].members" \
  --filter="bindings.members:user:sohae2100@gmail.com"
```

### 권한 추가 (필요시):
```bash
gcloud projects add-iam-policy-binding o4o-platform \
  --member="user:sohae2100@gmail.com" \
  --role="roles/cloudsql.client"
```

## 권장사항

**운영 환경에서는 로컬 CLI보다 다음 방법 권장:**

1. ✅ **Admin API 엔드포인트** - 감사 로그, 권한 제어, 안전성
2. ✅ **Google Cloud Console SQL Editor** - 직접 확인 가능
3. ⚠️ **로컬 gcloud CLI** - 개발/테스트 환경에서만

## 현재 작업 관련

다음 3가지 마이그레이션이 필요:
1. 제품 테이블 스키마 추가 (subtitle, images 등 9개 컬럼)
2. 제품 활성화 (status='active' 설정)
3. 포럼 카테고리 생성 (승인된 요청)

**가장 빠른 실행 방법:**
위의 Option 3 (브라우저 콘솔) 사용
