import { PRODUCT_DESCRIPTION_PURPOSE_LABELS } from '@o4o/store-ui-core';
import { consultationLanguages, readProductConsultation } from './productConsultationDraft';
import { ContentRenderer } from '@o4o/content-editor';
export function ConsultationConflict({ saved, acknowledged, disabled, onAcknowledge }: {
  saved: { title?: string; contentJson: Record<string, unknown>; revision?: string }; acknowledged: boolean;
  disabled: boolean; onAcknowledge: () => void;
}) {
  const context = readProductConsultation(saved.contentJson.productConsultation);
  return <section aria-label="상담자료 수정 충돌" className="my-3 rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm">
    <p role="alert">다른 저장 내용이 확인됐습니다. 내 작성 내용은 유지했습니다. 최신 저장본을 비교한 뒤 다시 저장하세요.</p>
    <details className="mt-2"><summary className="min-h-11 cursor-pointer content-center">최신 저장본 비교</summary>
      <p className="font-medium">{saved.title}</p>
      {context && <div className="my-2 space-y-2">
        <p>{context.product.name} · {PRODUCT_DESCRIPTION_PURPOSE_LABELS[context.assist.purpose]} · {consultationLanguages[context.language]}</p>
        <p>상품 사실 근거 · {context.assist.factsReviewed ? '검수 표시 있음' : '검수 전'} · {context.assist.factSource}</p>
        <p className="whitespace-pre-wrap break-words">{context.assist.facts}</p>
        <p>전문 참고정보 · {context.assist.reviewed ? '검수 표시 있음' : '검수 전'} · {context.assist.referenceSource}</p>
        <p className="whitespace-pre-wrap break-words">{context.assist.reference}</p>
      </div>}
      <ContentRenderer html={typeof saved.contentJson.html === 'string' ? saved.contentJson.html : ''} />
    </details>
    <button type="button" disabled={disabled || acknowledged || !saved.revision} className="mt-2 min-h-11 rounded border bg-white px-3"
      onClick={onAcknowledge}>{acknowledged ? '확인한 저장본을 기준으로 다시 저장할 수 있습니다' : '저장본을 확인했습니다. 내 작성 내용 유지'}</button>
  </section>;
}
