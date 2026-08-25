/**
 * Resources Console — lifecycle presets
 *
 * WO-O4O-PHARMACYHUB-COMMUNITY-AND-MY-STORE-FULL-PARITY-CLOSURE-V1 §3
 *
 * 원장별 상태·전이 차이를 **config 로만** 표현한다. 공통 콘솔에는 서비스 분기가 없다.
 *
 *   SERVICE_LEDGER_RESOURCES_LIFECYCLE — `{service}_contents` (KPA / GlycoPharm / K-Cosmetics)
 *     draft|published|private · delete 지원 · 등록/편집은 콘솔 밖(자료 등록 화면)
 *     → 기존 behavior 를 **한 픽셀도 바꾸지 않는 default** 다.
 *
 *   CMS_CONTENTS_RESOURCES_LIFECYCLE — 공통 `cms_contents` (serviceKey 컬럼으로 격리)
 *     draft|pending|published|archived · delete 미지원 · 콘솔 내 등록/편집
 *     전이는 서버 CMS_ALLOWED_TRANSITIONS 가 정본이며 여기서 그대로 반영한다.
 */

import type { ResourcesLifecycleConfig } from './types';

/** `{service}_contents` 계열 — 현행 KPA/GP/KCos behavior 의 정확한 재현. */
export const SERVICE_LEDGER_RESOURCES_LIFECYCLE: ResourcesLifecycleConfig = {
  statuses: [
    { value: 'published', label: '공개', className: 'bg-green-50 text-green-700' },
    { value: 'draft', label: '초안', className: 'bg-amber-50 text-amber-600' },
    { value: 'private', label: '숨김', className: 'bg-slate-200 text-slate-600' },
  ],
  // 기존 노출 규칙과 동일: published 가 아니면 '노출', published 면 '숨김'.
  allowedTransitions: {
    draft: ['published'],
    private: ['published'],
    published: ['private'],
  },
  supportsDelete: true,
  visibleActions: ['view', 'delete'],
  fieldCapabilities: {
    sourceType: true,
    usageType: true,
    sourceFileOrLink: true,
    viewCount: true,
    author: true,
    search: true,
  },
  transitionActions: [
    {
      to: 'published',
      label: '노출',
      icon: 'eye',
      variant: 'primary',
      bulkConfirm: { title: '선택 자료 노출', confirmText: '노출' },
      successMessage: (title) => `"${title}" 노출 처리되었습니다`,
    },
    {
      to: 'private',
      label: '숨김',
      icon: 'eye-off',
      variant: 'default',
      rowConfirm: { title: '자료 숨김', confirmText: '숨김', variant: 'default' },
      bulkConfirm: { title: '선택 자료 숨김', confirmText: '숨김' },
      successMessage: (title) => `"${title}" 숨김 처리되었습니다`,
    },
  ],
};

/** 기존 3 service 가 명시 없이 소비하는 default. */
export const DEFAULT_RESOURCES_LIFECYCLE = SERVICE_LEDGER_RESOURCES_LIFECYCLE;

/**
 * 공통 `cms_contents` 원장 lifecycle.
 *
 * 서버 계약(`apps/api-server/src/routes/cms-content/cms-content.service.ts`):
 *   draft → pending|archived · pending → published|draft · published → archived · archived → (terminal)
 * hard/soft delete API 가 없으므로 **삭제 CTA 를 만들지 않는다**(존재하지 않는 동작 금지).
 * 상태가 섞인 다중 선택에서 불가능한 전이가 발생하므로 bulk 전이도 열지 않는다.
 */
export const CMS_CONTENTS_RESOURCES_LIFECYCLE: ResourcesLifecycleConfig = {
  statuses: [
    { value: 'draft', label: '초안', className: 'bg-slate-100 text-slate-600' },
    { value: 'pending', label: '검토 대기', className: 'bg-amber-50 text-amber-600' },
    { value: 'published', label: '게시', className: 'bg-green-50 text-green-700' },
    { value: 'archived', label: '보관', className: 'bg-slate-200 text-slate-500' },
  ],
  allowedTransitions: {
    draft: ['pending', 'archived'],
    pending: ['published', 'draft'],
    published: ['archived'],
    archived: [],
  },
  supportsDelete: false,
  visibleActions: ['view', 'edit', 'create'],
  fieldCapabilities: {
    sourceType: false,
    usageType: false,
    sourceFileOrLink: true,
    viewCount: false,
    author: true,
    search: true,
  },
  transitionActions: [
    {
      to: 'pending',
      label: '검토 요청',
      icon: 'send',
      variant: 'default',
      successMessage: (title) => `"${title}" 검토 대기로 이동했습니다`,
    },
    {
      to: 'published',
      label: '게시',
      icon: 'eye',
      variant: 'primary',
      rowConfirm: { title: '자료 게시', confirmText: '게시', variant: 'default' },
      successMessage: (title) => `"${title}" 게시되었습니다`,
    },
    {
      to: 'draft',
      label: '초안으로 되돌리기',
      icon: 'undo',
      variant: 'default',
      successMessage: (title) => `"${title}" 초안으로 되돌렸습니다`,
    },
    {
      to: 'archived',
      label: '보관',
      icon: 'archive',
      variant: 'danger',
      rowConfirm: { title: '자료 보관', confirmText: '보관', variant: 'danger' },
      successMessage: (title) => `"${title}" 보관 처리되었습니다`,
    },
  ],
  // 콘솔 내 등록/편집. RichTextEditor 는 소비 service 가 주입한다(공통 패키지가 편집기를 고르지 않는다).
  form: {
    fields: { summary: true, body: true, link: true },
    createLabel: '자료 등록',
    createHint: '등록 직후 상태는 초안입니다. 검토 요청 → 게시 순으로 공개됩니다.',
  },
};
