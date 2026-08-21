/**
 * OperatorPopWritePage — 운영자 약국 HUB POP 작성/수정 (GlycoPharm)
 *
 * WO-O4O-GLYCOPHARM-OPERATOR-STORE-HUB-WRITE-CAPABILITY-V1 (2026-05-27): KPA port (서비스 로컬 구현)
 * WO-O4O-OPERATOR-GP-VIEW-DEDUP-AND-CROSSSERVICE-TABLE-UX-ALIGN-V1:
 *   @o4o/operator-core-ui 의 OperatorHubContentWritePage 로 수렴.
 *
 * URL 패턴:
 *   /operator/pop/new          — 신규 작성 (draft 생성 후 edit 으로 redirect)
 *   /operator/pop/:id/edit     — 수정
 *
 * Backend 변경 없음: POST/PUT/PATCH /api/v1/glycopharm/operator/pop/posts
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
