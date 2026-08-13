/**
 * StorePopComposerView — 내 매장 POP 제작 화면 본체(공통)
 * WO-O4O-MY-STORE-POP-COMPOSER-KCOS-GP-COMMONIZATION-V1
 *
 * K-Cosmetics / GlycoPharm 의 `StorePopPage` 본체를 그대로 옮긴 것이다.
 * 서비스 차이(accent · 매장/약국 문구 · endpoint prefix · 템플릿 라벨)는 props 로만 들어온다.
 * route · router state 계약 · generate payload · PDF 처리 방식 · 사용자 동선은 변경하지 않는다.
 */

import type { ReactNode } from 'react';
import { ArrowLeft, Megaphone } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { GuideBackLink } from '../GuideBackLink';
import { PopAiContentPanel } from './PopAiContentPanel';
import { PopGenerateBar } from './PopGenerateBar';
import { PopLayoutTemplateSection } from './PopLayoutTemplateSection';
import { PopLocalProductSection } from './PopLocalProductSection';
import { PopQrSelector } from './PopQrSelector';
import { PopSupplierItemSelector } from './PopSupplierItemSelector';
import { popBackBtnStyle, popPageStyle } from './popStyles';
import { usePopComposer } from './usePopComposer';
import type {
  PopAccentTheme,
  PopComposerApi,
  PopComposerLabels,
  PopComposerNotify,
  PopTemplateOption,
} from './types';

export interface StorePopComposerViewProps {
  /** 서비스 accent(테마) */
  accent: PopAccentTheme;
  /** 서비스별 문구 (매장 ↔ 약국) */
  labels: PopComposerLabels;
  /** 서비스별 템플릿 목록 */
  templates: PopTemplateOption[];
  /** 서비스 API 어댑터 (endpoint · 인증 · prefix 소유) */
  api: PopComposerApi;
  /** 서비스 toast */
  notify: PopComposerNotify;
  /** 가이드 링크 (기본: /guide/features/pop) */
  guideTo?: string;
  guideLabel?: string;
  /** 서비스 전용 추가 영역 (헤더 하단 / 생성 버튼 상단) */
  headerExtra?: ReactNode;
  footerExtra?: ReactNode;
}

export function StorePopComposerView({
  accent,
  labels,
  templates,
  api,
  notify,
  guideTo = '/guide/features/pop',
  guideLabel = 'POP 제작 방법',
  headerExtra,
  footerExtra,
}: StorePopComposerViewProps) {
  const navigate = useNavigate();
  const composer = usePopComposer({
    api,
    labels,
    notify,
    defaultTemplateId: templates[0]?.id ?? 'basic',
  });

  return (
    <div style={popPageStyle}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
        <button onClick={() => navigate(-1)} style={popBackBtnStyle}><ArrowLeft size={16} /></button>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 700, color: '#1e293b', margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
            <Megaphone size={20} color={accent.color} />
            {labels.headerTitle}
          </h1>
          <p style={{ fontSize: 13, color: '#64748b', margin: '4px 0 0' }}>
            {labels.headerDescription}
          </p>
          <div style={{ marginTop: 8 }}><GuideBackLink to={guideTo} label={guideLabel} /></div>
        </div>
      </div>

      {headerExtra}

      {/* 매장 자체 상품(origin='local') */}
      <PopLocalProductSection
        accent={accent}
        items={composer.localItems}
        loading={composer.localLoading}
        error={composer.localError}
        onRetry={composer.retryLocalProducts}
        onRemove={composer.removeLocalItem}
      />

      {/* Step 1 공급자 자료 선택 */}
      <PopSupplierItemSelector
        accent={accent}
        items={composer.items}
        loading={composer.itemsLoading}
        error={composer.itemsError}
        selectedIds={composer.selectedIds}
        onToggle={composer.toggleItem}
        onReload={composer.loadItems}
      />

      {/* Step 2 가져온 POP 문구 */}
      {composer.popAiContent && (
        <PopAiContentPanel
          accent={accent}
          content={composer.popAiContent}
          saving={composer.savingContent}
          saveButtonTitle={labels.saveContentButtonTitle}
          onSave={composer.saveAsContent}
          onClear={composer.clearPopAiContent}
        />
      )}

      {/* Step 3 레이아웃 및 템플릿 */}
      <PopLayoutTemplateSection
        accent={accent}
        layout={composer.layout}
        onLayoutChange={composer.setLayout}
        templates={templates}
        templateId={composer.templateId}
        onTemplateChange={composer.setTemplateId}
      />

      {/* QR 연결 (선택) */}
      <PopQrSelector
        qrCodes={composer.qrCodes}
        value={composer.selectedQrId}
        onChange={composer.setSelectedQrId}
      />

      {footerExtra}

      <PopGenerateBar
        accent={accent}
        generating={composer.generating}
        canGenerate={composer.canGenerate}
        onGenerate={composer.generate}
      />
    </div>
  );
}
