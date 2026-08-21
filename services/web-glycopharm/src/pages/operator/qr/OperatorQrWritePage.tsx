/**
 * OperatorQrWritePage — 운영자 약국 HUB QR 템플릿 작성/수정 (GlycoPharm)
 *
 * WO-O4O-GLYCOPHARM-OPERATOR-QR-WRITE-FRONTEND-V1 (2026-05-27): KPA port (서비스 로컬 구현)
 * WO-O4O-OPERATOR-GP-VIEW-DEDUP-AND-CROSSSERVICE-TABLE-UX-ALIGN-V1:
 *   @o4o/operator-core-ui/modules/qr-template-write 로 수렴.
 *
 * KPA 와의 차이 — 콘텐츠 허브 선택기(ContentHubPickerModal)는 KPA 전용 서브시스템이다.
 *   GlycoPharm 로컬 화면도 content_kind 로 blog / cms / pop 3종만 갖고 있었으므로
 *   contentKinds 를 그대로 주입하고 picker 슬롯은 주입하지 않는다 (기존 동작 보존).
 *
 * URL 패턴:
 *   /operator/qr/new          — 신규 작성 (draft 생성 후 edit 으로 redirect)
 *   /operator/qr/:id/edit     — 수정
 *
 * Backend 변경 없음: POST/PUT/PATCH /api/v1/glycopharm/operator/qr/templates
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
      audienceNote="약국 HUB 노출 대상 (GlycoPharm)"
      publishConfirmMessage="지금 발행하시겠습니까? 발행 즉시 GlycoPharm 약국 HUB 에 노출됩니다."
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
