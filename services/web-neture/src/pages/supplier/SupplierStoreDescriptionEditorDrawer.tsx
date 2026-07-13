/**
 * SupplierStoreDescriptionEditorDrawer — 공급자 매장용(STORE) 설명서 작성/저장 Drawer
 *
 * WO-O4O-NETURE-SUPPLIER-STORE-DESCRIPTION-DRAFT-SAVE-AND-REVIEW-QUEUE-V1
 *
 * - 표준 RichTextEditor(@o4o/content-editor, templateCategory="product", product-detail-860) 재사용.
 * - 저장: 임시저장(draft, submitted_at=null) / 검수요청(needs_review, submitted_at=now).
 * - 공급자는 canonical 을 직접 생성하지 않는다(운영자 검수 큐 경유).
 * - 언어 V1: 한국어(ko) 우선.
 */
import { useCallback, useEffect, useState } from 'react';
import { X, Loader2 } from 'lucide-react';
import { RichTextEditor } from '@o4o/content-editor';
import { toast } from '@o4o/error-handling';
import {
  productApi,
  supplierStoreDescriptionApi,
  type SupplierProduct,
  type SupplierStoreDescriptionDraft,
} from '../../lib/api';
import { useContentTemplates } from '../../hooks/useContentTemplates';
import { useAuth } from '../../contexts';

interface Props {
  product: SupplierProduct;
  open: boolean;
  onClose: () => void;
  onSaved?: () => void;
}

const LANGUAGE = 'ko';

const STATUS_LABEL: Record<string, { label: string; cls: string }> = {
  draft: { label: '임시저장', cls: 'bg-slate-100 text-slate-600' },
  needs_review: { label: '검수 대기', cls: 'bg-amber-50 text-amber-700' },
  canonical: { label: '검수 완료(매장 노출)', cls: 'bg-emerald-50 text-emerald-700' },
  hidden: { label: '반려/보류', cls: 'bg-red-50 text-red-700' },
};

export default function SupplierStoreDescriptionEditorDrawer({ product, open, onClose, onSaved }: Props) {
  const { user } = useAuth();
  const tpl = useContentTemplates();
  const canCreatePublicTemplate =
    user?.roles?.some((r: string) => r.includes('admin') || r.includes('operator') || r.includes('super_admin')) ?? false;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [content, setContent] = useState('');
  const [existing, setExisting] = useState<SupplierStoreDescriptionDraft | null>(null);

  // 기존 작업행(draft/needs_review/canonical) 로드 — 한국어 우선.
  useEffect(() => {
    if (!open || !product?.masterId) return;
    let mounted = true;
    setLoading(true);
    setContent('');
    setExisting(null);
    supplierStoreDescriptionApi
      .listMine(product.masterId)
      .then((rows) => {
        if (!mounted) return;
        const ko = rows.find((r) => (r.language ?? 'ko') === LANGUAGE) ?? rows[0] ?? null;
        if (ko) {
          setExisting(ko);
          setContent(ko.content || '');
        }
      })
      .catch(() => {})
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, [open, product?.masterId]);

  const editorImageUpload = useCallback(
    async (file: File): Promise<string> => {
      if (!product?.masterId) throw new Error('No product');
      const res = await productApi.uploadProductImage(product.masterId, file, 'content');
      if (res.success && res.data) return res.data.imageUrl;
      throw new Error(res.error || 'Upload failed');
    },
    [product?.masterId],
  );

  const doSave = async (submit: boolean) => {
    const trimmed = content.trim();
    if (!trimmed || trimmed === '<p></p>') {
      toast.error('설명서 본문을 입력하세요');
      return;
    }
    setSaving(true);
    try {
      const saved = await supplierStoreDescriptionApi.save({
        offerId: product.id,
        content: trimmed,
        language: LANGUAGE,
        submit,
      });
      toast.success(submit ? '검수요청이 접수되었습니다' : '임시저장되었습니다');
      setExisting((prev) =>
        prev
          ? { ...prev, id: saved.id, status: saved.status, submittedAt: saved.submittedAt }
          : {
              id: saved.id,
              masterId: saved.masterId,
              descriptionType: saved.descriptionType,
              language: saved.language,
              status: saved.status,
              summary: null,
              content: trimmed,
              submittedAt: saved.submittedAt,
              updatedAt: new Date().toISOString(),
            },
      );
      onSaved?.();
      if (submit) onClose();
    } catch (err) {
      const msg = err instanceof Error ? err.message : '저장 중 오류가 발생했습니다';
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  if (!open) return null;

  const statusCfg = existing ? STATUS_LABEL[existing.status] : null;
  const isCanonical = existing?.status === 'canonical';

  return (
    <>
      <div className="fixed inset-0 bg-black/30 z-40" onClick={saving ? undefined : onClose} />
      <div className="fixed top-0 right-0 h-full w-full max-w-[720px] bg-white shadow-2xl z-50 flex flex-col">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 px-6 py-4 border-b border-slate-200">
          <div className="min-w-0">
            <h3 className="text-lg font-bold text-slate-900 truncate">{product.name || product.masterName || '(이름 없음)'}</h3>
            <p className="text-xs text-slate-500 font-mono mt-0.5">{product.barcode}</p>
            <div className="mt-1 flex items-center gap-2">
              <span className="text-xs text-slate-400">매장용(STORE) 설명서 · 한국어</span>
              {statusCfg && (
                <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${statusCfg.cls}`}>{statusCfg.label}</span>
              )}
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-slate-100 rounded-lg" aria-label="닫기" disabled={saving}>
            <X size={18} className="text-slate-500" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="animate-spin text-emerald-600" />
            </div>
          ) : (
            <>
              {isCanonical && (
                <div className="mb-3 px-3 py-2 rounded-lg bg-emerald-50 border border-emerald-200 text-xs text-emerald-800">
                  이 설명서는 운영자 검수를 통과해 매장에 노출 중입니다. 수정 후 다시 저장하면 새 초안으로 검수를 받습니다.
                </div>
              )}
              <RichTextEditor
                value={content}
                onChange={(c) => setContent(c.html)}
                editable={!saving}
                placeholder="매장 경영자가 고객 응대·QR·태블릿에 활용할 매장용 설명서를 작성하세요"
                minHeight="360px"
                onImageUpload={editorImageUpload}
                showTemplateActions
                templateCategory="product"
                templates={tpl.templates}
                templatesLoading={tpl.loading}
                templatesSaving={tpl.saving}
                onLoadTemplates={tpl.loadTemplates}
                onSaveAsTemplate={(name, category, isPublic) => tpl.saveTemplate(content, name, category, isPublic)}
                onUseTemplate={tpl.recordUse}
                canCreatePublicTemplate={canCreatePublicTemplate}
              />
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between gap-2 px-6 py-4 border-t border-slate-200">
          <p className="text-[11px] text-slate-400">검수요청 후 운영자 검수를 통과하면 매장에 노출됩니다. 공급자가 직접 게시하지 않습니다.</p>
          <div className="flex gap-2 shrink-0">
            <button
              onClick={() => doSave(false)}
              disabled={saving || loading}
              className="rounded-lg bg-slate-100 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-200 disabled:opacity-50"
            >
              {saving ? '저장 중...' : '임시저장'}
            </button>
            <button
              onClick={() => doSave(true)}
              disabled={saving || loading}
              className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
            >
              {saving ? '처리 중...' : '검수요청'}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
