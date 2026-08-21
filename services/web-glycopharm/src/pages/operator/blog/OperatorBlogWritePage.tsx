/**
 * OperatorBlogWritePage — 운영자 약국 HUB 블로그 작성/수정 (GlycoPharm)
 *
 * WO-O4O-GLYCOPHARM-OPERATOR-STORE-HUB-WRITE-CAPABILITY-V1 (2026-05-27): KPA port (서비스 로컬 구현)
 * WO-O4O-OPERATOR-GP-VIEW-DEDUP-AND-CROSSSERVICE-TABLE-UX-ALIGN-V1:
 *   @o4o/operator-core-ui 의 OperatorHubContentWritePage 로 수렴.
 *
 * URL 패턴:
 *   /operator/blog/new          — 신규 작성 (draft 생성 후 edit 으로 redirect)
 *   /operator/blog/:id/edit     — 수정
 *
 * Backend 변경 없음:
 *   POST  /api/v1/glycopharm/operator/blog/posts
 *   PUT   /api/v1/glycopharm/operator/blog/posts/:id
 *   PATCH /api/v1/glycopharm/operator/blog/posts/:id/publish
 *
 * 프론트는 author_role / service_key / store_id 를 보내지 않는다 (backend 가 강제).
 */

import { useNavigate, useParams } from 'react-router-dom';
import { OperatorHubContentWritePage } from '@o4o/operator-core-ui/modules/hub-content-write';
import type { HubContentWriteClient } from '@o4o/operator-core-ui/modules/hub-content-write';
import {
  createOperatorBlogPost,
  getOperatorBlogPost,
  updateOperatorBlogPost,
  publishOperatorBlogPost,
} from '../../../api/operatorBlog';

const client: HubContentWriteClient = {
  get: getOperatorBlogPost,
  create: createOperatorBlogPost,
  update: updateOperatorBlogPost,
  publish: publishOperatorBlogPost,
};

export default function OperatorBlogWritePage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id?: string }>();

  return (
    <OperatorHubContentWritePage
      id={id}
      client={client}
      onBackToList={() => navigate('/operator/blog')}
      onCreated={(newId) => navigate(`/operator/blog/${newId}/edit`, { replace: true })}
      copy={{
        kindLabel: '블로그',
        titlePlaceholder: '블로그 제목을 입력하세요',
        slugPlaceholder: '예: spring-pharmacy-tips',
        excerptPlaceholder: '블로그를 한 줄로 요약하세요',
        contentPlaceholder: '블로그 본문을 작성하세요',
        audienceNote: '약국 HUB 노출 대상 (GlycoPharm)',
        publishConfirmMessage: '지금 발행하시겠습니까? 발행 즉시 GlycoPharm 약국 HUB 에 노출됩니다.',
      }}
      accent={{
        publishButton: 'bg-blue-600 hover:bg-blue-700',
        focusRing: 'focus:ring-blue-500',
        linkText: 'text-blue-600',
      }}
    />
  );
}
