import { useCallback, useState } from 'react';
import { ContentRenderer } from '@o4o/content-editor';
import { useStoreOperationScope } from '../../../hooks/useStoreOperationScope';
import { useStoreResource } from '../hooks/useStoreResource';
import type { ContentProductReference } from '../authoring/contentAuthoringAdapters';
import { loadProductGuidanceLinks, loadProductGuidanceMaterials } from './productGuidanceMaterials';
import type { LinkedContentItem } from '../../../api/assetSnapshot';

interface Props {
  product: ContentProductReference;
  disabled: boolean;
  compact?: boolean;
  onOpenContent: (item: LinkedContentItem) => void;
}
const buttonClass = 'min-h-11 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 disabled:opacity-50';

/** This context is read-only. It is never automatically attached to an AI request. */
export function ProductGuidanceContext(props: Props) {
  const { key } = useStoreOperationScope();
  return <ProductGuidanceContextSession key={`${key}:${props.product.sourceType}:${props.product.sourceId}`} {...props} />;
}
function ProductGuidanceContextSession({ product, disabled, compact = false, onOpenContent }: Props) {
  const { organizationId } = useStoreOperationScope();
  const { sourceType, sourceId } = product;
  const readMaterials = useCallback(() => loadProductGuidanceMaterials({ sourceType, sourceId }), [sourceType, sourceId]);
  const readLinks = useCallback(() => loadProductGuidanceLinks({ sourceType, sourceId }), [sourceType, sourceId]);
  const materials = useStoreResource(readMaterials, [], !!organizationId);
  const links = useStoreResource(readLinks, [], !!organizationId);
  const [language, setLanguage] = useState('ko');
  const languages = [...new Set(materials.data.map(item => item.language).filter((value): value is string => !!value))];
  const activeLanguage = languages.includes(language) ? language : languages.includes('ko') ? 'ko' : languages[0];
  const shown = materials.data.filter(item => !item.language || item.language === activeLanguage);
  // The description API returns latest first. Display one canonical description per language.
  const displayed = product.sourceType === 'listing' ? shown.slice(0, 1) : shown;

  return <details open={!compact} className="mb-4 rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm">
    <summary className="min-h-11 cursor-pointer content-center font-medium text-slate-700">{compact ? '상품 정보·기존 안내 다시 확인' : '상품 정보·기존 안내'}</summary>
    <section aria-label="상품 안내 준비" className="space-y-3">
    <div>
      <h3 className="font-semibold text-slate-800">이 상품에 연결된 안내</h3>
      {links.loading ? <p role="status" className="py-2">기존 안내 확인 중…</p> : links.error ? <div role="alert">
        <p>연결된 안내를 확인하지 못했습니다.</p>
        <button type="button" className={buttonClass} disabled={disabled} onClick={() => void links.reload()}>연결 안내 다시 확인</button>
      </div> : links.data.length === 0 ? <p className="mt-1 text-slate-600">아직 연결된 안내가 없습니다. 새 안내를 작성할 수 있습니다.</p> : <ul className="mt-2 max-h-48 space-y-2 overflow-y-auto">
        {links.data.map(item => <li key={item.contentId} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border bg-white p-2">
          <span className="min-w-0 break-words text-slate-800">{item.title}</span>
          <button type="button" className={buttonClass} disabled={disabled || (item.sourceType === 'snapshot_edit' && !item.snapshotId)} onClick={() => onOpenContent(item)}>기존 안내 수정</button>
        </li>)}
      </ul>}
    </div>
    <details>
      <summary className="min-h-11 cursor-pointer content-center font-medium text-slate-700">등록된 상품 정보 확인</summary>
      {materials.loading ? <p role="status">상품 정보 확인 중…</p> : materials.error ? <div role="alert">
        <p>상품 정보를 불러오지 못했습니다. 내용을 추측하지 말고 다시 확인해 주세요.</p>
        <button type="button" className={buttonClass} disabled={disabled} onClick={() => void materials.reload()}>상품 정보 다시 확인</button>
      </div> : displayed.length === 0 ? <p className="text-slate-600">등록된 설명이 없습니다. 확인한 내용을 직접 작성해 주세요.</p> : <>
        {languages.length > 0 && <label className="mb-2 flex items-center gap-2">설명 언어
          <select aria-label="상품 설명 언어" value={activeLanguage} onChange={event => setLanguage(event.target.value)} className="min-h-11 rounded-lg border bg-white px-2">
            {languages.map(value => <option key={value} value={value}>{value === 'ko' ? '한국어' : value.toUpperCase()}</option>)}
          </select>
        </label>}
        {languages.length > 0 && !languages.includes('ko') && <p className="mb-2 text-slate-600">한국어 설명이 없어 {activeLanguage?.toUpperCase()} 설명을 표시합니다.</p>}
        <div className="max-h-72 space-y-3 overflow-auto rounded-lg bg-white p-3">
          {displayed.map(item => <article key={item.id}>
            <h4 className="mb-1 font-medium">{item.label}</h4>
            {item.summary && <p className="whitespace-pre-wrap break-words">{item.summary}</p>}
            {item.html && <ContentRenderer html={item.html} />}
            {!item.summary?.trim() && !item.html?.trim() && <p>이 언어의 설명 본문이 없습니다.</p>}
          </article>)}
        </div>
      </>}
      <p className="mt-2 text-xs text-slate-500">원본 정보는 이 화면에서 수정하지 않습니다.</p>
    </details>
    </section>
  </details>;
}
