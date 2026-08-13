/**
 * OperatorQrWritePage — 운영자 매장 HUB QR 템플릿 작성/수정 (K-Cosmetics)
 *
 * WO-O4O-KCOSMETICS-OPERATOR-BLOG-POP-QR-BOOTSTRAP-V1
 * WO-O4O-OPERATOR-CROSSSERVICE-REMAINING-VIEW-DUPLICATION-FINAL-CLEANUP-V1:
 *   KPA 와 중복이던 화면 본체를 @o4o/operator-core-ui/modules/qr-template-write 로 수렴.
 *   K-Cosmetics 는 Operator Content Hub 서브시스템이 없으므로 `content_hub` 종류와
 *   선택기 슬롯을 주입하지 않는다 — 존재하지 않는 대상 종류가 노출되지 않는다.
 *   발행 확인은 window.confirm → 공통 ConfirmActionDialog 로 정합된다(게이트 자체는 동일).
 *
 * Backend: POST/PUT /api/v1/cosmetics/operator/qr/templates
 */

import { useNavigate, useParams } from 'react-router-dom';
import { OperatorQrTemplateWritePage } from '@o4o/operator-core-ui/modules/qr-template-write';
import type { QrTemplateWriteClient } from '@o4o/operator-core-ui/modules/qr-template-write';
import {
  createOperatorQrTemplate,
  getOperatorQrTemplate,
  updateOperatorQrTemplate,
  publishOperatorQrTemplate,
} from '../../../api/operatorQr';

const client: QrTemplateWriteClient = {
  get: getOperatorQrTemplate,
  create: createOperatorQrTemplate as QrTemplateWriteClient['create'],
  update: updateOperatorQrTemplate as QrTemplateWriteClient['update'],
  publish: publishOperatorQrTemplate,
};

export default function OperatorQrWritePage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id?: string }>();

  return (
    <OperatorQrTemplateWritePage
      id={id}
      client={client}
      onBackToList={() => navigate('/operator/qr')}
      onCreated={(newId) => navigate(`/operator/qr/${newId}/edit`, { replace: true })}
      contentKinds={[
        { value: 'blog', label: '블로그', hint: '운영자 게시 블로그 slug 또는 id' },
        { value: 'cms', label: 'CMS', hint: 'CMS 콘텐츠 id' },
        { value: 'pop', label: 'POP', hint: '운영자 게시 POP slug 또는 id' },
      ]}
      defaultContentKind="blog"
      audienceNote="매장 HUB 노출 대상 (K-Cosmetics)"
      publishConfirmMessage="지금 발행하시겠습니까? 발행 즉시 K-Cosmetics 매장 HUB 에 노출됩니다."
      accent={{
        publishButton: 'bg-pink-600 hover:bg-pink-700',
        focusRing: 'focus:ring-pink-500',
        linkText: 'text-pink-600',
        selectedToggle: 'bg-pink-50 border-pink-300 text-pink-700',
        selectedToggleSub: 'text-pink-600',
      }}
    />
  );
}
