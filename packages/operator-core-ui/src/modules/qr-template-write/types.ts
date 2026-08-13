/**
 * Operator QR Template Write Module — Types
 *
 * WO-O4O-OPERATOR-CROSSSERVICE-REMAINING-VIEW-DUPLICATION-FINAL-CLEANUP-V1
 *
 * KPA / K-Cosmetics 의 QR 템플릿 작성·수정 화면 중복 수렴.
 *
 * 유일한 실차이는 **대상 콘텐츠 선택 축**이다.
 *   - KPA  : Operator Content Hub 보유 → `content_hub` 종류 + 선택 모달(picker)
 *   - KCos : Content Hub 자체가 없음   → `blog/cms/pop` 자유 입력만
 * 따라서 콘텐츠 종류 목록(`contentKinds`)과 선택기(`renderContentPicker`)를 주입점으로 열고,
 * 주입하지 않은 서비스에는 **존재하지 않는 대상 종류가 노출되지 않는다**.
 *
 * API endpoint · payload · QR 발급 계약(운영자 단계 slug 미발급)은 변경하지 않는다.
 */

import type { ReactNode } from 'react';

export interface QrTemplateRecord {
  id: string;
  title: string;
  description?: string;
  status: 'draft' | 'published' | 'archived';
  targetType: string;
  targetUrl?: string;
  targetContentKind?: string;
  targetContentRef?: string;
  publishedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface QrTemplateWritePayload {
  title: string;
  description?: string;
  targetType: 'url' | 'content';
  targetUrl?: string;
  targetContentKind?: string;
  targetContentRef?: string;
}

/** 서비스별 API adapter (기존 `api/operatorQr` 모듈이 그대로 충족). */
export interface QrTemplateWriteClient {
  get(id: string): Promise<QrTemplateRecord>;
  create(payload: any): Promise<QrTemplateRecord>;
  update(id: string, payload: any): Promise<QrTemplateRecord>;
  publish(id: string): Promise<QrTemplateRecord>;
}

/** 콘텐츠 종류 옵션. 서비스가 실재하는 종류만 넘긴다. */
export interface QrContentKindOption {
  value: string;
  label: string;
  hint: string;
}

/** 선택기 렌더 인자 — 선택기를 가진 서비스(KPA)만 사용한다. */
export interface QrContentPickerArgs {
  /** 현재 선택된 콘텐츠 식별자 */
  value: string;
  /** 표시용 제목 (없으면 빈 문자열) */
  pickedTitle: string;
  disabled: boolean;
  /** 선택 완료 시 호출 (트리거가 모달을 닫는다) */
  onPicked: (next: { id: string; title: string }) => void;
  /** 선택 없이 닫을 때 호출 */
  onClose: () => void;
}

export interface OperatorQrTemplateWritePageProps {
  /** 수정 대상 id. 없으면 신규. */
  id: string | undefined;
  client: QrTemplateWriteClient;
  /** 목록으로 이동 */
  onBackToList: () => void;
  /** 신규 저장 직후 edit 경로로 replace 이동 */
  onCreated: (id: string) => void;

  /** 콘텐츠 종류 옵션 (서비스에 실재하는 것만) */
  contentKinds: QrContentKindOption[];
  /** 기본 선택 콘텐츠 종류 */
  defaultContentKind: string;
  /**
   * 선택기를 쓰는 콘텐츠 종류 값 (예: 'content_hub').
   * 미지정이면 모든 종류가 자유 입력(free-form) 이다.
   */
  pickerContentKind?: string;
  /** 선택기 렌더 슬롯 — `pickerContentKind` 와 함께 주입한다. */
  renderContentPicker?: (args: QrContentPickerArgs) => ReactNode;
  /**
   * edit 진입 시 선택된 콘텐츠의 표시 제목을 조회한다 (선택기 보유 서비스만).
   * 실패해도 ref(id)는 유지되어 선택 자체엔 영향이 없다.
   */
  resolvePickedTitle?: (ref: string) => Promise<string>;

  /** 헤더 부제의 노출 대상 표기 */
  audienceNote: string;
  /** 발행 확인 문구 */
  publishConfirmMessage: string;

  accent: {
    /** 발행 버튼 (예: 'bg-blue-600 hover:bg-blue-700') */
    publishButton: string;
    /** 입력 focus ring (예: 'focus:ring-blue-500') */
    focusRing: string;
    /** 링크 텍스트 (예: 'text-blue-600') */
    linkText: string;
    /** 선택된 토글 버튼 (예: 'bg-blue-50 border-blue-300 text-blue-700') */
    selectedToggle: string;
    /** 선택된 토글의 보조 텍스트 (예: 'text-blue-600') */
    selectedToggleSub: string;
  };
}
