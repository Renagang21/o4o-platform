/**
 * OperatorPopWritePage — 운영자 매장 HUB POP 작성/수정 (KPA)
 *
 * WO-O4O-KPA-OPERATOR-POP-WRITE-PAGE-V1 (2026-05-24)
 * WO-O4O-OPERATOR-CROSSSERVICE-CORE-ONLY-AND-VIEW-DUPLICATION-CLEANUP-V1:
 *   KPA·K-Cosmetics × 블로그·POP 4중복을 @o4o/operator-core-ui 의
 *   OperatorHubContentWritePage 로 수렴. 서비스는 client + 문구 + accent 만 주입.
 *
 * URL 패턴:
 *   /operator/pop/new          — 신규 작성 (draft 생성 후 edit 으로 redirect)
 *   /operator/pop/:id/edit     — 수정
 *
 * Backend: WO-O4O-KPA-POP-PUBLISHING-PHASE2-BACKEND-V1
 *   POST   /api/v1/kpa/operator/pop/posts
 *   PUT    /api/v1/kpa/operator/pop/posts/:id
 *   PATCH  /api/v1/kpa/operator/pop/posts/:id/publish
 *
 * 프론트는 author_role / service_key / store_id 를 보내지 않는다.
 * Backend 가 author_role='operator', service_key='kpa', store_id=null 강제.
 *
 * 본 화면 범위: 매장 HUB 에 진열할 POP "원본 콘텐츠" 작성.
 *   - POP 디자인 캔버스, 템플릿 편집기, AI 작업 큐는 본 WO 범위 외 (후속 Phase).
 */

import { useNavigate, useParams } from 'react-router-dom';
import { OperatorHubContentWritePage } from '@o4o/operator-core-ui/modules/hub-content-write';
import type { HubContentWriteClient } from '@o4o/operator-core-ui/modules/hub-content-write';
import {
  createOperatorPopPost,
  getOperatorPopPost,
  updateOperatorPopPost,
  publishOperatorPopPost,
} from '../../../api/operatorPop';

const client: HubContentWriteClient = {
  get: getOperatorPopPost,
  create: createOperatorPopPost,
  update: updateOperatorPopPost,
  publish: publishOperatorPopPost,
};

export default function OperatorPopWritePage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id?: string }>();

  return (
    <OperatorHubContentWritePage
      id={id}
      client={client}
      onBackToList={() => navigate('/operator/pop')}
      onCreated={(newId) => navigate(`/operator/pop/${newId}/edit`, { replace: true })}
      copy={{
        kindLabel: 'POP',
        titlePlaceholder: 'POP 제목을 입력하세요',
        slugPlaceholder: '예: spring-promo-pop',
        excerptPlaceholder: 'POP 을 한 줄로 요약하세요',
        contentPlaceholder: 'POP 본문을 작성하세요',
        audienceNote: '매장 HUB 노출 대상 (KPA)',
        publishConfirmMessage: '지금 발행하시겠습니까? 발행 즉시 KPA 매장 HUB 에 노출됩니다.',
      }}
      accent={{
        publishButton: 'bg-blue-600 hover:bg-blue-700',
        focusRing: 'focus:ring-blue-500',
        linkText: 'text-blue-600',
      }}
    />
  );
}
