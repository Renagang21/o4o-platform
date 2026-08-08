/**
 * OperatorTabletScreenSetsPage — 운영자 Screen Set 원본 제작기
 *
 * WO-O4O-OPERATOR-SCREEN-SET-AUTHORING-FOUNDATION-V1
 *
 * 운영자가 매장 배포용 Screen Set 원본(operator_template)을 제작·수정·미리보기·제거한다.
 * 매장 제작기(StoreTabletDisplaysPage)와 **동일한 단계형 제작 셸**(TabletContentStepBuilder)을 재사용하되,
 * 저장/미리보기/검색은 운영자 API(operatorScreenSetBuilderApi)로 라우팅하고 콘텐츠 출처는 O4O 표준 설명서만 노출한다.
 *
 * 매장/코너 적용·current 지정·공개 타블렛 URL·Screen Set QR·매장 콘텐츠 조회는 제공하지 않는다(WO 차단 조건).
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertCircle, Plus, Layers, Pencil, Trash2 } from 'lucide-react';
import type { TabletKioskApi } from '@o4o/tablet-kiosk-core';
import { TabletContentStepBuilder, templateLabel } from '@o4o/tablet-screen-set-editor';
import { RowActionMenu } from '@o4o/ui';
import { DataTable, Pagination } from '@o4o/operator-ux-core';
import type { ListColumnDef } from '@o4o/operator-ux-core';
import type { ScreenSet, ScreenSetDetail } from '../../../api/tabletDisplays';
import { fetchOperatorScreenSets, fetchOperatorScreenSet, removeOperatorScreenSet, operatorScreenSetBuilderApi } from '../../../api/operatorTabletScreenSets';
// WO-O4O-SCREEN-SET-CORNER-CONTENT-FREE-AUTHORING-AND-LLM-ASSIST-V1: 코너 내용 편집기 이미지 업로드/라이브러리.
//   운영자 원본은 매장 상품 문맥이 없으므로 fetchProductPool 은 주입하지 않는다(상품 영역 비노출 = 기존 동작).
import { mediaApi } from '../../../api/media';
import MediaPickerModal from '../../../components/common/MediaPickerModal';
import type { MediaInsert } from '@o4o/content-editor';

type Toast = { type: 'success' | 'error'; message: string };
const PAGE_LIMIT = 20;

// 운영자 원본은 매장 상품·공개 slug 가 없다. 미리보기(previewLayoutOnly)는 previewScreen(sections)만 렌더하고
//   fetchProducts/fetchScreen 을 호출하지 않으므로, 빈 응답 stub + placeholder slug 로 충분하다.
const OPERATOR_PREVIEW_SLUG = 'operator-preview';
const operatorPreviewApi: TabletKioskApi = {
  fetchProducts: async () => ({ products: [], storeName: null }) as any,
  submitInterest: async () => {
    throw new Error('운영자 미리보기에서는 상담 요청을 보낼 수 없습니다.');
  },
  checkStatus: async () => {
    throw new Error('not-supported');
  },
  // fetchScreen 미주입 — previewScreen 주입 시 호출되지 않음.
};

export default function OperatorTabletScreenSetsPage() {
  const [sets, setSets] = useState<ScreenSet[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<Toast | null>(null);
  // builder=null → 리스트. builder.detail=null → 신규. builder.detail=존재 → 수정(hydrate).
  const [builder, setBuilder] = useState<{
    detail: ScreenSetDetail | null;
  } | null>(null);

  // WO-O4O-SCREEN-SET-CORNER-CONTENT-FREE-AUTHORING-AND-LLM-ASSIST-V1
  const [mediaPickerTarget, setMediaPickerTarget] = useState<((media: MediaInsert) => void) | null>(null);
  const handleImageUpload = useCallback(async (file: File): Promise<string> => {
    const res = await mediaApi.upload(file, true, 'kpa-society', 'tablet-screen-set');
    if (res.success && res.data) return res.data.url;
    throw new Error(res.error || '이미지 업로드에 실패했습니다.');
  }, []);

  const previewApi = useMemo(() => operatorPreviewApi, []);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await fetchOperatorScreenSets({ page, limit: PAGE_LIMIT });
      setSets(result.data);
      setTotal(result.total);
      setTotalPages(result.totalPages);
      if (result.totalPages > 0 && page > result.totalPages) {
        setPage(result.totalPages);
      }
    } catch (e: any) {
      setError(e?.message || '화면 세트를 불러오지 못했습니다.');
      setSets([]);
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => {
    reload();
  }, [reload]);
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(t);
  }, [toast]);

  const openCreate = useCallback(() => setBuilder({ detail: null }), []);
  const openEdit = useCallback(async (id: string) => {
    try {
      const detail = await fetchOperatorScreenSet(id);
      setBuilder({ detail });
    } catch (e: any) {
      setToast({
        type: 'error',
        message: e?.message || '원본 상세를 불러오지 못했습니다.',
      });
    }
  }, []);

  const handleRemove = useCallback(
    async (set: ScreenSet) => {
      if (busy) return;
      setBusy(true);
      try {
        await removeOperatorScreenSet(set.id);
        setToast({ type: 'success', message: '목록에서 제거했습니다.' });
        await reload();
      } catch (e: any) {
        setToast({
          type: 'error',
          message: e?.message || '제거하지 못했습니다.',
        });
      } finally {
        setBusy(false);
      }
    },
    [busy, reload],
  );

  const columns = useMemo(
    (): ListColumnDef<ScreenSet>[] => [
      {
        key: 'name',
        header: '이름',
        render: (_value, row) => <span className="font-medium text-slate-800">{row.name}</span>,
      },
      {
        key: 'templateKey',
        header: '템플릿',
        render: (_value, row) => <span className="text-slate-600">{templateLabel(row.templateKey)}</span>,
      },
      {
        key: 'blockCount',
        header: '블록',
        align: 'center',
        width: '100px',
        render: (_value, row) => <span className="text-slate-500">{row.blockCount ?? 0}</span>,
      },
      {
        key: '_actions',
        header: '',
        align: 'center',
        width: '60px',
        system: true,
        onCellClick: () => {},
        render: (_value, row) => (
          <RowActionMenu
            disabled={busy}
            actions={[
              {
                key: 'edit',
                label: '수정',
                icon: <Pencil className="w-4 h-4" />,
                onClick: () => openEdit(row.id),
              },
              {
                key: 'remove',
                label: '목록에서 제거',
                icon: <Trash2 className="w-4 h-4" />,
                variant: 'danger',
                loading: busy,
                confirm: {
                  title: '원본 제거',
                  message: `“${row.name}” 을(를) 목록에서 제거하시겠습니까?`,
                  confirmText: '제거',
                  variant: 'danger',
                },
                onClick: () => handleRemove(row),
              },
            ]}
          />
        ),
      },
    ],
    [busy, handleRemove, openEdit],
  );

  if (builder) {
    return (
      <div className="p-4 lg:p-6">
        <TabletContentStepBuilder
          initialDetail={builder.detail}
          onCancel={() => setBuilder(null)}
          onSaved={() => {
            setBuilder(null);
            reload();
          }}
          onToast={setToast}
          previewApi={previewApi}
          storeSlug={OPERATOR_PREVIEW_SLUG}
          api={operatorScreenSetBuilderApi}
          contentSources={['spd']}
          onImageUpload={handleImageUpload}
          onMediaLibraryPick={(insertMedia) => setMediaPickerTarget(() => insertMedia)}
        />
        <MediaPickerModal
          open={!!mediaPickerTarget}
          onClose={() => setMediaPickerTarget(null)}
          onSelect={(asset) => {
            mediaPickerTarget?.({ type: 'image', url: asset.url, title: asset.originalName });
            setMediaPickerTarget(null);
          }}
          title="코너 내용 이미지"
          defaultFolder="tablet-screen-set"
        />
        {toast && <ToastView toast={toast} />}
      </div>
    );
  }

  return (
    <div className="p-4 lg:p-6 space-y-4">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div>
          {/* WO-O4O-KPA-OPERATOR-MENU-NAME-AND-FUNCTION-ALIGNMENT-V1:
              사이드바 메뉴('매장 HUB 태블릿 화면')와 정렬 — '매장 HUB' prefix 일관(다른 5개 HUB 자료 페이지와 동일).
              기능·route 불변, '세트 원본' 성격은 부제로 보존.
              WO-O4O-KPA-STORE-QR-SCREENSET-STATE-ALIGNMENT-V1 §6: 표기는 '태블릿'으로 통일(이전 '태블렛' 표기 폐기). */}
          <h1 className="text-lg font-bold text-slate-800 flex items-center gap-2">
            <Layers className="w-5 h-5 text-indigo-600" /> 매장 HUB 태블릿 화면 세트 원본
          </h1>
          <p className="text-[12px] text-slate-500 mt-0.5 leading-relaxed">매장에 배포할 태블릿 화면 세트 원본을 제작합니다. 여기서 만든 원본은 운영자 소유이며, 매장·코너에 직접 적용되지 않습니다.</p>
        </div>
        <button onClick={openCreate} className="min-h-[44px] px-4 py-2 text-sm font-semibold text-white bg-indigo-600 rounded-xl hover:bg-indigo-700 inline-flex items-center gap-1.5">
          <Plus className="w-4 h-4" /> 원본 만들기
        </button>
      </div>

      {error && (
        <div className="flex items-center justify-between gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <span className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            {error}
          </span>
          <button type="button" onClick={reload} className="font-semibold hover:underline">
            다시 시도
          </button>
        </div>
      )}

      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <DataTable<ScreenSet> columns={columns} data={sets} rowKey="id" loading={loading} emptyMessage={error ? '목록을 불러오지 못했습니다.' : '아직 만든 원본이 없습니다. ‘원본 만들기’로 매장 배포용 화면 세트를 제작해 주세요.'} tableId="kpa-operator-tablet-screen-sets" />
        {!loading && !error && <Pagination page={page} totalPages={totalPages} total={total} onPageChange={setPage} />}
      </div>

      {toast && <ToastView toast={toast} />}
    </div>
  );
}

function ToastView({ toast }: { toast: Toast }) {
  return <div className={`fixed bottom-6 right-6 z-[1000] px-4 py-3 rounded-xl shadow-lg text-sm font-medium ${toast.type === 'success' ? 'bg-emerald-600 text-white' : 'bg-red-600 text-white'}`}>{toast.message}</div>;
}
