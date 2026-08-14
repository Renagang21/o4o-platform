/**
 * OperatorQrWritePage — 운영자 매장 HUB QR 템플릿 작성/수정 (KPA)
 *
 * WO-O4O-KPA-OPERATOR-QR-WRITE-PAGE-V1 (2026-05-24)
 * WO-O4O-KPA-QR-CONTENT-PICKER-V1: 콘텐츠 허브 선택기 (KPA 전용)
 * WO-O4O-OPERATOR-CROSSSERVICE-REMAINING-VIEW-DUPLICATION-FINAL-CLEANUP-V1:
 *   K-Cosmetics 와 중복이던 화면 본체를 @o4o/operator-core-ui/modules/qr-template-write 로 수렴.
 *   KPA 고유의 Content Hub 축은 contentKinds + renderContentPicker 슬롯으로 주입한다
 *   (공통 패키지는 KPA 전용 ContentHubPickerModal 을 알지 못한다).
 *
 * URL 패턴:
 *   /operator/qr/new          — 신규 작성 (draft 생성 후 edit 으로 redirect)
 *   /operator/qr/:id/edit     — 수정
 *
 * Backend: WO-O4O-KPA-OPERATOR-QR-PUBLISHING-PHASE2-BACKEND-V1
 *   POST/PUT/PATCH /api/v1/kpa/operator/qr/templates
 * 프론트는 authorRole / serviceKey / slug / organizationId 를 보내지 않는다.
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
// WO-O4O-KPA-QR-CONTENT-PICKER-V1: 콘텐츠 허브 선택기 (KPA 전용 서브시스템)
import ContentHubPickerModal from './ContentHubPickerModal';
import { getContentHubItem } from '../../../api/contentHub';

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
      // WO-O4O-KPA-QR-CONTENT-PICKER-V1: 콘텐츠 허브를 기본 1순위로
      contentKinds={[
        { value: 'content_hub', label: '콘텐츠 허브', hint: '운영자 콘텐츠 허브에서 선택' },
        { value: 'blog', label: '블로그', hint: '운영자 게시 블로그 slug 또는 id' },
        { value: 'cms', label: 'CMS', hint: 'CMS 콘텐츠 id' },
        { value: 'pop', label: 'POP', hint: '운영자 게시 POP slug 또는 id' },
      ]}
      defaultContentKind="content_hub"
      pickerContentKind="content_hub"
      renderContentPicker={({ onPicked, onClose }) => (
        <ContentHubPickerModal
          onSelect={({ id: pickedId, title }) => onPicked({ id: pickedId, title })}
          onClose={onClose}
        />
      )}
      resolvePickedTitle={async (ref) => (await getContentHubItem(ref)).title}
      audienceNote="매장 HUB 노출 대상 (KPA)"
      publishConfirmMessage="지금 발행하시겠습니까? 발행 즉시 KPA 매장 HUB 에 노출됩니다."
      accent={{
        publishButton: 'bg-blue-600 hover:bg-blue-700',
        focusRing: 'focus:ring-blue-500',
        linkText: 'text-blue-600',
        selectedToggle: 'bg-blue-50 border-blue-300 text-blue-700',
        selectedToggleSub: 'text-blue-600',
      }}
    />
  );
}
