/**
 * OperatorBlogWritePage — 운영자 매장 HUB 블로그 작성/수정 (K-Cosmetics)
 *
 * WO-O4O-KCOSMETICS-OPERATOR-BLOG-POP-QR-BOOTSTRAP-V1
 * WO-O4O-OPERATOR-CROSSSERVICE-CORE-ONLY-AND-VIEW-DUPLICATION-CLEANUP-V1:
 *   KPA·K-Cosmetics × 블로그·POP 4중복을 @o4o/operator-core-ui 의
 *   OperatorHubContentWritePage 로 수렴. 서비스는 client + 문구 + accent 만 주입.
 *   발행 확인이 window.confirm → 공통 ConfirmActionDialog 로 바뀐다 (게이트 자체는 동일).
 *
 * Backend: POST/PUT /api/v1/cosmetics/operator/blog/posts
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
        slugPlaceholder: '예: spring-beauty-tips',
        excerptPlaceholder: '블로그를 한 줄로 요약하세요',
        contentPlaceholder: '블로그 본문을 작성하세요',
        audienceNote: '매장 HUB 노출 대상 (K-Cosmetics)',
        publishConfirmMessage: '지금 발행하시겠습니까? 발행 즉시 K-Cosmetics 매장 HUB 에 노출됩니다.',
      }}
      accent={{
        publishButton: 'bg-pink-600 hover:bg-pink-700',
        focusRing: 'focus:ring-pink-500',
        linkText: 'text-pink-600',
      }}
    />
  );
}
