/**
 * Operator HUB Content Write Module — Types
 *
 * WO-O4O-OPERATOR-CROSSSERVICE-CORE-ONLY-AND-VIEW-DUPLICATION-CLEANUP-V1
 *
 * 매장 HUB 게시 콘텐츠(블로그 / POP)의 운영자 작성·수정 화면은
 * KPA · K-Cosmetics × 블로그 · POP = 4개 파일에 사실상 동일한 본체로 복제돼 있었다
 * (POP 은 주석에 "OperatorBlogWritePage mirror" 라고 명시돼 있다).
 *
 * 데이터 모델(`title/slug/excerpt/content/status`)과 흐름
 * (초안 저장 → edit redirect → 저장 후 발행)이 완전히 같아 단일 모듈로 수렴한다.
 *
 * 정본: docs/baseline/O4O-OPERATOR-HUB-CONTENT-PUBLISHING-STANDARD-V1.md
 *   (RichTextEditor 기반 항목별 게시)
 *
 * API endpoint 는 서비스 × 콘텐츠 종류별로 다르므로 client adapter 가 그대로 소유한다.
 */

export interface HubContentPost {
  id: string;
  title: string;
  slug: string;
  excerpt?: string;
  content: string;
  status: 'draft' | 'published' | 'archived';
  serviceKey: string;
  authorRole: 'operator';
  storeId: string | null;
  publishedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface HubContentWriteInput {
  title: string;
  content: string;
  excerpt?: string;
  slug?: string;
}

/** 서비스 × 콘텐츠 종류별 API adapter (기존 `operatorBlog` / `operatorPop` 모듈이 그대로 충족). */
export interface HubContentWriteClient {
  get(id: string): Promise<HubContentPost>;
  create(input: HubContentWriteInput): Promise<HubContentPost>;
  update(id: string, input: HubContentWriteInput): Promise<HubContentPost>;
  publish(id: string): Promise<HubContentPost>;
}

/** 콘텐츠 종류별 화면 문구 (블로그 / POP). */
export interface HubContentWriteCopy {
  /** 예: '블로그' / 'POP' */
  kindLabel: string;
  /** 제목 입력 placeholder */
  titlePlaceholder: string;
  /** 슬러그 입력 placeholder */
  slugPlaceholder: string;
  /** 요약 입력 placeholder */
  excerptPlaceholder: string;
  /** 본문 에디터 placeholder */
  contentPlaceholder: string;
  /** 헤더 부제의 노출 대상 표기 — 예: '매장 HUB 노출 대상 (KPA)' */
  audienceNote: string;
  /** 발행 확인 문구 — 예: '지금 발행하시겠습니까? 발행 즉시 KPA 매장 HUB 에 노출됩니다.' */
  publishConfirmMessage: string;
}

export interface OperatorHubContentWritePageProps {
  /** 수정 대상 id. 없으면 신규 작성 모드. */
  id: string | undefined;
  client: HubContentWriteClient;
  copy: HubContentWriteCopy;
  /** 목록으로 이동 (react-router navigate 주입 — 하드 내비게이션 금지) */
  onBackToList: () => void;
  /** 신규 저장 직후 edit 경로로 replace 이동 */
  onCreated: (id: string) => void;
  /**
   * 발행 버튼 / focus ring accent.
   * 서비스 소스에 리터럴로 존재해야 Tailwind content 스캔에 포함된다.
   */
  accent: {
    /** 발행 버튼 배경 (e.g. 'bg-blue-600 hover:bg-blue-700') */
    publishButton: string;
    /** 입력 focus ring (e.g. 'focus:ring-blue-500') */
    focusRing: string;
    /** 오류 화면의 '목록으로 돌아가기' 링크 색 (e.g. 'text-blue-600') */
    linkText: string;
  };
}
