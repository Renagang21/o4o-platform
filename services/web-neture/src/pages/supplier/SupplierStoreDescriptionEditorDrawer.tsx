/**
 * SupplierStoreDescriptionEditorDrawer — 공급자 매장용(STORE) 설명서 작성/저장 Drawer
 *
 * WO-O4O-NETURE-SUPPLIER-STORE-DESCRIPTION-DRAFT-SAVE-AND-REVIEW-QUEUE-V1
 *
 * - 표준 RichTextEditor(@o4o/content-editor, templateCategory="product", product-detail-860) 재사용.
 * - 저장: 임시저장(draft, submitted_at=null) / 검수요청(needs_review, submitted_at=now).
 * - 공급자는 canonical 을 직접 생성하지 않는다(운영자 검수 큐 경유).
 *
 * WO-O4O-SUPPLIER-STORE-DESCRIPTION-LANGUAGE-EDITOR-V1: 언어별(ko/en/zh/ja) 작성·검수.
 * - 지원 언어는 백엔드 계약(ALLOWED_LANG)과 동일한 ko/en/zh/ja 로 한정.
 * - 각 언어는 **독립 작업행**(shared_product_descriptions STORE+language). listMine 은 master 의 전체
 *   언어 행을 반환하므로 한 번 조회해 캐시하고 언어별로 필터링한다(백엔드 API 변경 없음).
 * - 언어 전환 시: 미저장 변경 보호 + 해당 언어 초안 로드(없으면 빈 편집기). 한국어 내용을 다른 언어에
 *   자동 복사하지 않는다. 저장·검수 요청도 언어별 독립.
 */
import { useCallback, useEffect, useState } from 'react';
import { X, Loader2, AlertTriangle } from 'lucide-react';
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

// 지원 언어 = 백엔드 계약(ALLOWED_LANG)과 동일. 확대 시 백엔드 계약 변경 필요(본 WO 범위 밖).
// WO-O4O-NETURE-SUPPLIER-MATERIALS-STATUS-AND-REALDATA-CLOSEOUT-BATCH-V1:
//   목록 화면이 언어별 상태를 표기하려면 같은 언어 계약을 써야 한다 — 중복 정의 대신 export 한다.
export const SUPPORTED_LANGS = ['ko', 'en', 'zh', 'ja'] as const;
export type SupportedLang = (typeof SUPPORTED_LANGS)[number];
export const LANG_LABELS: Record<SupportedLang, string> = { ko: '한국어', en: 'English', zh: '中文', ja: '日本語' };
export const LANG_SHORT: Record<SupportedLang, string> = { ko: 'KO', en: 'EN', zh: 'ZH', ja: 'JA' };
const DEFAULT_LANG: SupportedLang = 'ko';
export const normLang = (v: string | null | undefined): SupportedLang => {
  const l = (v ?? DEFAULT_LANG) as SupportedLang;
  return SUPPORTED_LANGS.includes(l) ? l : DEFAULT_LANG;
};

// WO-O4O-SUPPLIER-STORE-DESCRIPTION-WITHDRAW-V1: 철회 가능한 작업본 상태(백엔드 계약과 동일).
//   canonical(매장 노출)·hidden·deprecated·candidate 는 철회 불가.
const WITHDRAWABLE_STATUSES = new Set(['draft', 'needs_review', 'revision_requested']);

const STATUS_LABEL: Record<string, { label: string; cls: string }> = {
  draft: { label: '임시저장', cls: 'bg-slate-100 text-slate-600' },
  needs_review: { label: '검수 대기', cls: 'bg-amber-50 text-amber-700' },
  revision_requested: { label: '수정 요청', cls: 'bg-orange-50 text-orange-700' },
  canonical: { label: '검수 완료(매장 노출)', cls: 'bg-emerald-50 text-emerald-700' },
  hidden: { label: '숨김', cls: 'bg-red-50 text-red-700' },
};

function fmtDay(v: string | null | undefined): string {
  if (!v) return '-';
  return new Date(v).toLocaleDateString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit' });
}

export default function SupplierStoreDescriptionEditorDrawer({ product, open, onClose, onSaved }: Props) {
  const { user } = useAuth();
  const tpl = useContentTemplates();
  const canCreatePublicTemplate =
    user?.roles?.some((r: string) => r.includes('admin') || r.includes('operator') || r.includes('super_admin')) ?? false;

  const [loading, setLoading] = useState(true);
  // 기존 작업행 조회 실패를 '신규 설명서(빈 편집기)'로 오인하지 않도록 분리. 실패 시 저장·제출 차단.
  const [loadError, setLoadError] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const [saving, setSaving] = useState(false);
  const [content, setContent] = useState('');
  const [existing, setExisting] = useState<SupplierStoreDescriptionDraft | null>(null);
  // 선택 언어 + master 전체 언어 행 캐시(언어 전환은 재조회 없이 캐시에서) + 미저장 변경 플래그.
  const [language, setLanguage] = useState<SupportedLang>(DEFAULT_LANG);
  const [rows, setRows] = useState<SupplierStoreDescriptionDraft[]>([]);
  const [dirty, setDirty] = useState(false);
  // WO-O4O-SUPPLIER-STORE-DESCRIPTION-WITHDRAW-V1: 철회 진행 상태.
  const [withdrawing, setWithdrawing] = useState(false);

  // 특정 언어의 작업행을 캐시에서 찾아 편집기에 로드(없으면 빈 편집기 — 자동 복사 금지).
  const loadLanguageFrom = useCallback((all: SupplierStoreDescriptionDraft[], lang: SupportedLang) => {
    const row = all.find((r) => normLang(r.language) === lang) ?? null;
    setExisting(row);
    setContent(row?.content || '');
    setDirty(false);
  }, []);

  // 열릴 때: master 전체 언어 행 1회 조회 → 캐시 → 기본 언어(ko) 로드.
  useEffect(() => {
    if (!open || !product?.masterId) return;
    let mounted = true;
    setLoading(true);
    setLoadError(false);
    setContent('');
    setExisting(null);
    setRows([]);
    setLanguage(DEFAULT_LANG);
    setDirty(false);
    supplierStoreDescriptionApi
      .listMine(product.masterId)
      .then((all) => {
        if (!mounted) return;
        setRows(all);
        loadLanguageFrom(all, DEFAULT_LANG);
      })
      .catch(() => {
        // 조회 실패를 '신규(빈 편집기)'로 오인시키지 않는다. 편집기 대신 오류+재시도 표시.
        if (mounted) setLoadError(true);
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, [open, product?.masterId, loadLanguageFrom, reloadKey]);

  // 언어 전환: 미저장 변경 보호 → 해당 언어 초안 로드(캐시).
  const selectLanguage = useCallback((lang: SupportedLang) => {
    if (lang === language) return;
    if (saving) return;
    if (dirty && !window.confirm(`저장하지 않은 변경사항이 있습니다.\n‘${LANG_LABELS[lang]}’ 로 전환하면 현재 편집 내용이 사라집니다. 계속하시겠습니까?`)) {
      return;
    }
    setLanguage(lang);
    loadLanguageFrom(rows, lang);
  }, [language, saving, dirty, rows, loadLanguageFrom]);

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
        language,
        submit,
      });
      toast.success(submit ? `검수요청이 접수되었습니다 (${LANG_LABELS[language]})` : `임시저장되었습니다 (${LANG_LABELS[language]})`);
      // 저장된 언어 행으로 existing + 캐시(rows) 갱신 — 다른 언어 행은 건드리지 않는다.
      const savedRow: SupplierStoreDescriptionDraft = {
        ...(existing ?? {} as SupplierStoreDescriptionDraft),
        id: saved.id,
        masterId: saved.masterId,
        descriptionType: saved.descriptionType,
        language: saved.language ?? language,
        status: saved.status,
        summary: existing?.summary ?? null,
        content: trimmed,
        submittedAt: saved.submittedAt,
        updatedAt: new Date().toISOString(),
      };
      setExisting(savedRow);
      setDirty(false);
      setRows((prev) => {
        const idx = prev.findIndex((r) => normLang(r.language) === language);
        if (idx >= 0) { const next = prev.slice(); next[idx] = savedRow; return next; }
        return [...prev, savedRow];
      });
      onSaved?.();
      if (submit) onClose();
    } catch (err) {
      const msg = err instanceof Error ? err.message : '저장 중 오류가 발생했습니다';
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  // WO-O4O-SUPPLIER-STORE-DESCRIPTION-WITHDRAW-V1: 현재 언어 작업본 철회(soft delete).
  //   본인 소유·허용 상태의 작업행이 로드돼 있을 때만 노출. 철회 시 해당 언어 행만 제거(다른 언어·offer·master 무변경).
  const doWithdraw = async () => {
    if (!existing || withdrawing || saving) return;
    if (!window.confirm(`‘${LANG_LABELS[language]}’ 매장용 설명서 작업본을 철회하시겠습니까?\n철회하면 이 작업본이 목록·검수 대기에서 제거됩니다. (매장에 노출 중인 검수 완료 설명서에는 영향이 없습니다.)`)) {
      return;
    }
    setWithdrawing(true);
    try {
      await supplierStoreDescriptionApi.withdraw(existing.id);
      toast.success(`철회되었습니다 (${LANG_LABELS[language]})`);
      // 캐시에서 해당 언어 행 제거 + 편집기 초기화(빈 상태). 다른 언어 행 무변경.
      setRows((prev) => prev.filter((r) => normLang(r.language) !== language));
      setExisting(null);
      setContent('');
      setDirty(false);
      onSaved?.();
    } catch (err) {
      const msg = err instanceof Error ? err.message : '철회 중 오류가 발생했습니다';
      toast.error(msg);
    } finally {
      setWithdrawing(false);
    }
  };

  if (!open) return null;

  const statusCfg = existing ? STATUS_LABEL[existing.status] : null;
  const isCanonical = existing?.status === 'canonical';
  const isRevision = existing?.status === 'revision_requested';
  const canWithdraw = !!existing && WITHDRAWABLE_STATUSES.has(existing.status);

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
              <span className="text-xs text-slate-400">매장용(STORE) 설명서 · {LANG_LABELS[language]}</span>
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
          ) : loadError ? (
            // 조회 실패 시 빈 편집기를 열지 않는다. 기존 작업본을 덮어쓸 수 있으므로 저장·제출도 차단.
            <div className="flex flex-col items-center justify-center py-16 text-center gap-3">
              <AlertTriangle className="w-8 h-8 text-red-400" />
              <div>
                <p className="text-sm font-medium text-slate-700">설명서를 불러오지 못했습니다</p>
                <p className="text-xs text-slate-400 mt-1">
                  기존 작업 내용을 덮어쓰지 않도록 편집기를 열지 않았습니다. 잠시 후 다시 시도해 주세요.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setReloadKey((k) => k + 1)}
                className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                다시 시도
              </button>
            </div>
          ) : (
            <>
              {/* WO-...-LANGUAGE-EDITOR-V1: 언어 탭 — 언어별 독립 작업행(자동 복사 없음). */}
              <div className="mb-3">
                <div className="flex items-center gap-1.5 flex-wrap">
                  {SUPPORTED_LANGS.map((l) => {
                    const row = rows.find((r) => normLang(r.language) === l);
                    const active = l === language;
                    const dot = !row ? null
                      : row.status === 'canonical' ? 'bg-emerald-500'
                      : (row.status === 'needs_review' || row.status === 'revision_requested') ? 'bg-amber-500'
                      : 'bg-slate-400';
                    return (
                      <button
                        key={l}
                        type="button"
                        onClick={() => selectLanguage(l)}
                        disabled={saving}
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors disabled:opacity-50 ${
                          active ? 'border-emerald-400 bg-emerald-50 text-emerald-700' : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        {LANG_LABELS[l]}
                        {dot && <span className={`w-1.5 h-1.5 rounded-full ${dot}`} title="작성된 설명서 있음" />}
                      </button>
                    );
                  })}
                </div>
                <p className="text-[11px] text-slate-400 mt-1.5">
                  언어별로 <b>독립된 설명서</b>입니다. 한 언어를 저장해도 다른 언어에는 영향이 없으며, 언어마다 따로 검수받습니다. (● = 작성됨)
                </p>
              </div>
              {isCanonical && (
                <div className="mb-3 px-3 py-2 rounded-lg bg-emerald-50 border border-emerald-200 text-xs text-emerald-800">
                  이 설명서는 운영자 검수를 통과해 매장에 노출 중입니다. 수정 후 다시 저장하면 새 초안으로 검수를 받습니다.
                </div>
              )}
              {isRevision && (
                <div className="mb-3 px-3 py-2 rounded-lg bg-orange-50 border border-orange-200 text-xs text-orange-800">
                  <div className="font-semibold">운영자가 수정을 요청했습니다 · {fmtDay(existing?.revisionDueAt)}까지 재요청</div>
                  {existing?.reviewNote && <div className="mt-1 whitespace-pre-wrap text-orange-900">사유: {existing.reviewNote}</div>}
                  <div className="mt-1 text-orange-700">수정 후 <strong>다시 검수 요청</strong>하세요. 기한이 지나면 이 설명서는 자동 삭제됩니다.</div>
                </div>
              )}
              <RichTextEditor
                value={content}
                onChange={(c) => { setContent(c.html); setDirty(true); }}
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
          <div className="flex items-center gap-3 min-w-0">
            {/* WO-O4O-SUPPLIER-STORE-DESCRIPTION-WITHDRAW-V1: 철회(작업본만, canonical/hidden 미노출). */}
            {canWithdraw && (
              <button
                onClick={doWithdraw}
                disabled={saving || loading || loadError || withdrawing}
                className="rounded-lg border border-red-200 bg-white px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-50 shrink-0"
              >
                {withdrawing ? '철회 중...' : '철회'}
              </button>
            )}
            <p className="text-[11px] text-slate-400 min-w-0">검수요청 후 운영자 검수를 통과하면 매장에 노출됩니다. 공급자가 직접 게시하지 않습니다.</p>
          </div>
          <div className="flex gap-2 shrink-0">
            <button
              onClick={() => doSave(false)}
              disabled={saving || loading || loadError || withdrawing}
              className="rounded-lg bg-slate-100 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-200 disabled:opacity-50"
            >
              {saving ? '저장 중...' : '임시저장'}
            </button>
            <button
              onClick={() => doSave(true)}
              disabled={saving || loading || loadError || withdrawing}
              className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
            >
              {saving ? '처리 중...' : isRevision ? '다시 검수 요청' : '검수요청'}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
