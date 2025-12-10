# CMS Media Specification

> cms-core Media CPT 상세 스펙 문서

## 1. 개요 (Overview)

Media CPT는 O4O Platform의 미디어 파일을 중앙 관리하는 시스템이다.
이미지, 동영상, PDF 등 모든 파일 형식을 지원하며, 썸네일 자동 생성과 메타데이터 관리 기능을 제공한다.

---

## 2. Entity 구조

### 2.1 Media Entity

```typescript
interface Media {
  id: string;                    // UUID
  filename: string;              // 저장된 파일명 (UUID 기반)
  originalFilename: string;      // 원본 파일명
  mimeType: string;              // MIME 타입 (image/jpeg, video/mp4 등)
  size: number;                  // 파일 크기 (bytes)
  url: string;                   // 파일 접근 URL
  thumbnailUrl?: string;         // 썸네일 URL (이미지/동영상)
  width?: number;                // 이미지/동영상 너비
  height?: number;               // 이미지/동영상 높이
  duration?: number;             // 동영상/오디오 길이 (초)
  alt?: string;                  // 대체 텍스트 (이미지 접근성)
  caption?: string;              // 캡션/설명
  folderId?: string;             // 폴더 ID (분류용)
  metadata?: Record<string, any>; // 추가 메타데이터 (EXIF 등)
  createdAt: Date;
  updatedAt: Date;
  uploadedBy: string;            // 업로더 User ID
}
```

### 2.2 MediaFolder Entity

```typescript
interface MediaFolder {
  id: string;
  name: string;
  parentId?: string;             // 부모 폴더 (계층 구조)
  createdAt: Date;
  createdBy: string;
}
```

---

## 3. 지원 파일 형식

### 3.1 이미지

| MIME Type | 확장자 | 썸네일 생성 |
|-----------|--------|-------------|
| image/jpeg | .jpg, .jpeg | O |
| image/png | .png | O |
| image/gif | .gif | O |
| image/webp | .webp | O |
| image/svg+xml | .svg | X |

### 3.2 동영상

| MIME Type | 확장자 | 썸네일 생성 |
|-----------|--------|-------------|
| video/mp4 | .mp4 | O (프레임 추출) |
| video/webm | .webm | O |
| video/quicktime | .mov | O |

### 3.3 문서

| MIME Type | 확장자 | 썸네일 생성 |
|-----------|--------|-------------|
| application/pdf | .pdf | O (첫 페이지) |
| application/msword | .doc | X |
| application/vnd.openxmlformats-officedocument.* | .docx, .xlsx, .pptx | X |

### 3.4 오디오

| MIME Type | 확장자 |
|-----------|--------|
| audio/mpeg | .mp3 |
| audio/wav | .wav |
| audio/ogg | .ogg |

---

## 4. API Endpoints

### 4.1 미디어 CRUD

| Method | Endpoint | 설명 |
|--------|----------|------|
| GET | `/api/cms/media` | 미디어 목록 (페이지네이션, 필터) |
| GET | `/api/cms/media/:id` | 미디어 상세 |
| POST | `/api/cms/media/upload` | 파일 업로드 (multipart/form-data) |
| PUT | `/api/cms/media/:id` | 메타데이터 수정 (alt, caption 등) |
| DELETE | `/api/cms/media/:id` | 미디어 삭제 |

### 4.2 폴더 관리

| Method | Endpoint | 설명 |
|--------|----------|------|
| GET | `/api/cms/media/folders` | 폴더 목록 |
| POST | `/api/cms/media/folders` | 폴더 생성 |
| PUT | `/api/cms/media/folders/:id` | 폴더 이름 수정 |
| DELETE | `/api/cms/media/folders/:id` | 폴더 삭제 |

### 4.3 일괄 작업

| Method | Endpoint | 설명 |
|--------|----------|------|
| POST | `/api/cms/media/bulk-delete` | 일괄 삭제 |
| POST | `/api/cms/media/bulk-move` | 일괄 폴더 이동 |

---

## 5. 업로드 플로우

```
┌──────────────┐
│  클라이언트   │
│ (파일 선택)   │
└──────┬───────┘
       │ POST /api/cms/media/upload
       │ Content-Type: multipart/form-data
       ▼
┌──────────────────────────────────────────────────────────────┐
│                        API Server                            │
├──────────────────────────────────────────────────────────────┤
│  1. 파일 유효성 검증 (크기, MIME 타입)                        │
│  2. UUID 기반 파일명 생성                                     │
│  3. 저장소에 파일 저장 (로컬 또는 S3)                         │
│  4. 이미지/동영상인 경우 썸네일 생성                          │
│  5. EXIF 등 메타데이터 추출 (선택)                            │
│  6. Media Entity 저장                                        │
│  7. 응답 반환                                                │
└──────────────────────────────────────────────────────────────┘
       │
       ▼
┌──────────────┐
│  응답 반환    │
│  { id, url } │
└──────────────┘
```

---

## 6. 썸네일 생성 정책

### 6.1 이미지 썸네일

| 크기 | 용도 |
|------|------|
| 150x150 | 목록 미리보기 |
| 300x300 | 갤러리 미리보기 |
| 768xauto | 본문 삽입용 |
| 원본 | 전체 크기 |

### 6.2 생성 방식

- **Lazy Generation**: 요청 시 생성 (권장)
- **Eager Generation**: 업로드 시 모든 크기 생성

---

## 7. 저장소 설정

### 7.1 로컬 저장소 (기본)

```typescript
// config
{
  storage: {
    type: 'local',
    uploadDir: '/uploads',
    publicPath: '/uploads',
  }
}
```

### 7.2 S3 저장소 (권장 - 프로덕션)

```typescript
// config
{
  storage: {
    type: 's3',
    bucket: 'o4o-media',
    region: 'ap-northeast-2',
    cdnDomain: 'cdn.example.com',
  }
}
```

---

## 8. 보안 고려사항

### 8.1 파일 유효성 검증

1. **MIME 타입 검증**: magic bytes로 실제 파일 형식 확인
2. **파일 크기 제한**: 설정 기반 최대 크기 제한
3. **확장자 화이트리스트**: 허용된 확장자만 업로드 가능
4. **파일명 새니타이징**: 특수문자, 경로 순회 방지

### 8.2 접근 제어

1. **업로드 권한**: `media.upload` 권한 필요
2. **삭제 권한**: `media.delete` 또는 업로더 본인
3. **비공개 미디어**: 인증된 사용자만 접근 가능 옵션

---

## 9. 관련 문서

| 문서 | 설명 |
|------|------|
| [cms-cpt-overview.md](./cms-cpt-overview.md) | CPT 전체 개요 |
| [engine-spec.md](./engine-spec.md) | CMS Engine 아키텍처 |

---

*최종 업데이트: 2025-12-10*
*상태: Phase 14 신규 생성*
