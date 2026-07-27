/**
 * CommunityManagementPage — Operator Home 편집 (광고/스폰서/하단 링크 관리)
 *
 * WO-KPA-A-COMMUNITY-HUB-IMPLEMENTATION-V1
 * WO-KPA-A-HOME-EXPOSURE-MENU-RELOCATION-AND-MEDIA-PICKER-V1:
 *   - 헤더: '커뮤니티 관리' → 'Home 편집'
 *   - 이미지 입력: URL 직접 입력 → 미디어 라이브러리 선택 + URL fallback
 * WO-KPA-A-HOME-FOOTER-LINKS-MANAGEMENT-V1:
 *   - 4th tab: 하단 링크 (community_quick_links CRUD)
 * WO-O4O-KPA-OPERATOR-LOAD-ERROR-AND-REMAINING-LISTS-CONSOLIDATED-V1:
 *   - 광고/스폰서/하단 링크 raw <table> → 공용 DataTable
 *   - 수정/삭제 액션 → RowActionMenu (추가 CTA는 상단에 직접 노출 유지)
 *   - 탭 전환 시 이전 탭의 데이터/오류가 잘못 남지 않도록 정리
 *   - 조회 실패 시 재시도 제공
 *   - 페이지 전체 inline style → Tailwind / O4O 토큰
 *   - API/CRUD/정렬/활성 상태 계약은 불변
 *
 * 4 tabs: Hero 광고 | 페이지 광고 | 스폰서 | 하단 링크
 * CRUD for community_ads, community_sponsors, community_quick_links
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { ConfirmActionDialog, RowActionMenu } from '@o4o/ui';
import { toast } from '@o4o/error-handling';
import { DataTable, defineActionPolicy, buildRowActions } from '@o4o/operator-ux-core';
import type { ListColumnDef } from '@o4o/operator-ux-core';
import {
  Image,
  Plus,
  Trash2,
  Edit3,
  Loader2,
  AlertCircle,
  X,
  Monitor,
  Users,
  ImageIcon,
  Link2,
  ExternalLink,
} from 'lucide-react';
import {
  communityManageApi,
  type CommunityAdFull,
  type CommunitySponsorFull,
  type CommunityQuickLinkFull,
} from '../../api/community';
import MediaPickerModal from '../../components/common/MediaPickerModal';

type Tab = 'hero' | 'page' | 'sponsors' | 'quickLinks';

// 수정/삭제 공용 행 액션 정책 (삭제 확인은 페이지 레벨 ConfirmActionDialog 유지)
const rowActionPolicy = defineActionPolicy<{ id: string }>('kpa:community', {
  inlineMax: 2,
  rules: [
    { key: 'edit', label: '수정' },
    { key: 'delete', label: '삭제', variant: 'danger' },
  ],
});

const rowActionIcons = {
  edit: <Edit3 size={14} />,
  delete: <Trash2 size={14} />,
};

function renderRowActions<T extends { id: string }>(
  row: T,
  onEdit: (item: T) => void,
  onDelete: (id: string) => void,
) {
  return (
    <RowActionMenu
      actions={buildRowActions(
        rowActionPolicy,
        row,
        { edit: () => onEdit(row), delete: () => onDelete(row.id) },
        { icons: rowActionIcons },
      )}
      inlineMax={rowActionPolicy.inlineMax}
    />
  );
}

function StatusBadge({ active }: { active: boolean }) {
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded text-[0.6875rem] font-semibold ${
        active ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-600'
      }`}
    >
      {active ? '활성' : '비활성'}
    </span>
  );
}

export default function CommunityManagementPage() {
  const [tab, setTab] = useState<Tab>('hero');
  const [ads, setAds] = useState<CommunityAdFull[]>([]);
  const [sponsors, setSponsors] = useState<CommunitySponsorFull[]>([]);
  const [quickLinks, setQuickLinks] = useState<CommunityQuickLinkFull[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem] = useState<any>(null);

  const fetchData = useCallback(async () => {
    // 탭 전환 시 이전 탭의 데이터/오류가 잘못 남지 않도록 정리
    setLoading(true);
    setError(null);
    setAds([]);
    setSponsors([]);
    setQuickLinks([]);
    try {
      if (tab === 'sponsors') {
        const res = await communityManageApi.listSponsors();
        setSponsors((res as any)?.data?.sponsors ?? (res as any)?.sponsors ?? []);
      } else if (tab === 'quickLinks') {
        const res = await communityManageApi.listQuickLinks();
        setQuickLinks((res as any)?.data?.quickLinks ?? (res as any)?.quickLinks ?? []);
      } else {
        const res = await communityManageApi.listAds(tab);
        setAds((res as any)?.data?.ads ?? (res as any)?.ads ?? []);
      }
    } catch {
      setError('데이터를 불러오지 못했습니다.');
    }
    setLoading(false);
  }, [tab]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);

  const executeDelete = async () => {
    if (!deleteTargetId) return;
    try {
      if (tab === 'sponsors') {
        await communityManageApi.deleteSponsor(deleteTargetId);
      } else if (tab === 'quickLinks') {
        await communityManageApi.deleteQuickLink(deleteTargetId);
      } else {
        await communityManageApi.deleteAd(deleteTargetId);
      }
      fetchData();
    } catch {
      toast.error('삭제에 실패했습니다.');
    } finally {
      setDeleteTargetId(null);
    }
  };

  const handleDelete = (id: string) => {
    setDeleteTargetId(id);
  };

  const openCreate = () => {
    setEditItem(null);
    setShowModal(true);
  };

  const openEdit = (item: any) => {
    setEditItem(item);
    setShowModal(true);
  };

  const addButtonLabel = tab === 'sponsors' ? '스폰서 추가' : tab === 'quickLinks' ? '링크 추가' : '광고 추가';

  // ─── Column defs ───

  const adColumns: ListColumnDef<CommunityAdFull>[] = useMemo(() => [
    {
      key: 'imageUrl', header: '미리보기', width: '90px',
      render: (_v, ad) => <img src={ad.imageUrl} alt="" className="w-[60px] h-9 object-cover rounded" />,
    },
    { key: 'title', header: '제목', render: (_v, ad) => <span className="text-slate-700">{ad.title}</span> },
    {
      key: 'period', header: '기간', width: '180px',
      render: (_v, ad) => (
        <span className="text-slate-600 text-xs">
          {ad.startDate || ad.endDate
            ? `${ad.startDate?.slice(0, 10) ?? '~'} ~ ${ad.endDate?.slice(0, 10) ?? ''}`
            : '상시'}
        </span>
      ),
    },
    { key: 'displayOrder', header: '순서', width: '70px', align: 'center', render: (_v, ad) => ad.displayOrder },
    { key: 'isActive', header: '상태', width: '80px', align: 'center', render: (_v, ad) => <StatusBadge active={ad.isActive} /> },
    {
      key: '_actions', header: '액션', width: '60px', align: 'center', system: true,
      render: (_v, ad) => renderRowActions(ad, openEdit, handleDelete),
    },
  ], []);

  const sponsorColumns: ListColumnDef<CommunitySponsorFull>[] = useMemo(() => [
    {
      key: 'logoUrl', header: '로고', width: '100px',
      render: (_v, s) => <img src={s.logoUrl} alt={s.name} className="h-7 max-w-[80px] object-contain" />,
    },
    { key: 'name', header: '이름', render: (_v, s) => <span className="text-slate-700">{s.name}</span> },
    {
      key: 'linkUrl', header: '링크', width: '90px',
      render: (_v, s) => s.linkUrl
        ? <a href={s.linkUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 text-xs">링크</a>
        : <span className="text-slate-400">-</span>,
    },
    { key: 'displayOrder', header: '순서', width: '70px', align: 'center', render: (_v, s) => s.displayOrder },
    { key: 'isActive', header: '상태', width: '80px', align: 'center', render: (_v, s) => <StatusBadge active={s.isActive} /> },
    {
      key: '_actions', header: '액션', width: '60px', align: 'center', system: true,
      render: (_v, s) => renderRowActions(s, openEdit, handleDelete),
    },
  ], []);

  const quickLinkColumns: ListColumnDef<CommunityQuickLinkFull>[] = useMemo(() => [
    {
      key: 'imageUrl', header: '아이콘', width: '70px',
      render: (_v, ql) => <img src={ql.imageUrl} alt="" className="w-9 h-9 object-cover rounded-md" />,
    },
    {
      key: 'title', header: '제목',
      render: (_v, ql) => (
        <div>
          <div className="text-slate-700">{ql.title}</div>
          {ql.description && <div className="text-[0.6875rem] text-slate-400 mt-0.5">{ql.description}</div>}
        </div>
      ),
    },
    {
      key: 'linkUrl', header: '링크', width: '90px',
      render: (_v, ql) => (
        <a href={ql.linkUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-blue-600 text-xs">
          <ExternalLink size={11} /> 링크
        </a>
      ),
    },
    { key: 'openInNewTab', header: '새 탭', width: '70px', align: 'center', render: (_v, ql) => ql.openInNewTab ? '예' : '아니오' },
    { key: 'displayOrder', header: '순서', width: '70px', align: 'center', render: (_v, ql) => ql.displayOrder },
    { key: 'isActive', header: '상태', width: '80px', align: 'center', render: (_v, ql) => <StatusBadge active={ql.isActive} /> },
    {
      key: '_actions', header: '액션', width: '60px', align: 'center', system: true,
      render: (_v, ql) => renderRowActions(ql, openEdit, handleDelete),
    },
  ], []);

  return (
    <div className="py-6">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-[10px] bg-blue-100 flex items-center justify-center">
          <Monitor size={20} className="text-blue-600" />
        </div>
        <div>
          <h1 className="text-xl font-semibold text-slate-800 m-0">Home 편집</h1>
          <p className="text-[0.8125rem] text-slate-500 m-0">Home 화면의 Hero 배너, 광고, 스폰서, 하단 링크를 관리합니다</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-5 border-b border-slate-200">
        {([
          { key: 'hero' as Tab, label: 'Hero 광고', icon: Image },
          { key: 'page' as Tab, label: '페이지 광고', icon: Monitor },
          { key: 'sponsors' as Tab, label: '스폰서', icon: Users },
          { key: 'quickLinks' as Tab, label: '하단 링크', icon: Link2 },
        ]).map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`flex items-center gap-1.5 px-4 py-2.5 text-[0.8125rem] -mb-px border-b-2 ${
              tab === key
                ? 'font-semibold text-blue-600 border-blue-600'
                : 'font-normal text-slate-500 border-transparent hover:text-slate-700'
            }`}
          >
            <Icon size={14} /> {label}
          </button>
        ))}
      </div>

      {/* Action Bar — 추가 CTA 상단 직접 노출 */}
      <div className="flex justify-end mb-4">
        <button
          onClick={openCreate}
          className="flex items-center gap-1.5 px-4 py-2 text-[0.8125rem] font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700"
        >
          <Plus size={14} /> {addButtonLabel}
        </button>
      </div>

      {/* Content */}
      {loading ? (
        <div className="text-center py-10 text-slate-500">
          <Loader2 size={24} className="animate-spin mx-auto mb-2" />
          <p className="text-[0.8125rem]">불러오는 중...</p>
        </div>
      ) : error ? (
        <div className="text-center py-10 text-red-600">
          <AlertCircle size={24} className="mx-auto mb-2" />
          <p className="text-[0.8125rem]">{error}</p>
          <button
            onClick={fetchData}
            className="mt-3 px-4 py-1.5 text-xs text-red-600 border border-red-300 rounded-lg hover:bg-red-50"
          >
            다시 시도
          </button>
        </div>
      ) : tab === 'sponsors' ? (
        <DataTable<CommunitySponsorFull>
          columns={sponsorColumns} data={sponsors} rowKey="id"
          emptyMessage="등록된 스폰서가 없습니다." tableId="kpa-community-sponsors"
        />
      ) : tab === 'quickLinks' ? (
        <DataTable<CommunityQuickLinkFull>
          columns={quickLinkColumns} data={quickLinks} rowKey="id"
          emptyMessage="등록된 하단 링크가 없습니다." tableId="kpa-community-quicklinks"
        />
      ) : (
        <DataTable<CommunityAdFull>
          columns={adColumns} data={ads} rowKey="id"
          emptyMessage="등록된 광고가 없습니다." tableId="kpa-community-ads"
        />
      )}

      {/* Modal */}
      {showModal && (
        <FormModal
          tab={tab}
          editItem={editItem}
          onClose={() => setShowModal(false)}
          onSaved={() => { setShowModal(false); fetchData(); }}
        />
      )}

      <ConfirmActionDialog
        open={!!deleteTargetId}
        title="삭제 확인"
        message="이 항목을 삭제하시겠습니까?"
        variant="danger"
        confirmText="삭제"
        onConfirm={executeDelete}
        onClose={() => setDeleteTargetId(null)}
      />
    </div>
  );
}

// ─── Form Modal ───

function FormModal({ tab, editItem, onClose, onSaved }: {
  tab: Tab;
  editItem: any;
  onClose: () => void;
  onSaved: () => void;
}) {
  const isAd = tab === 'hero' || tab === 'page';
  const isSponsor = tab === 'sponsors';
  const isQuickLink = tab === 'quickLinks';
  const isEdit = !!editItem;

  const [form, setForm] = useState({
    type: isAd ? tab : '',
    title: editItem?.title ?? '',
    name: editItem?.name ?? '',
    imageUrl: editItem?.imageUrl ?? '',
    logoUrl: editItem?.logoUrl ?? '',
    linkUrl: editItem?.linkUrl ?? '',
    description: editItem?.description ?? '',
    openInNewTab: editItem?.openInNewTab ?? true,
    startDate: editItem?.startDate?.slice(0, 10) ?? '',
    endDate: editItem?.endDate?.slice(0, 10) ?? '',
    displayOrder: editItem?.displayOrder ?? 0,
    isActive: editItem?.isActive ?? true,
  });
  const [saving, setSaving] = useState(false);
  const [showMediaPicker, setShowMediaPicker] = useState(false);

  const mediaPickerField = isQuickLink ? 'imageUrl' : isAd ? 'imageUrl' : 'logoUrl';
  const mediaPickerFolder = isQuickLink ? 'icon' : isAd ? 'banner' : 'brand';
  const mediaPickerTitle = isQuickLink ? '링크 아이콘 선택' : isAd ? '광고 이미지 선택' : '스폰서 로고 선택';

  const modalTitle = isQuickLink
    ? '하단 링크'
    : isSponsor
      ? '스폰서'
      : tab === 'hero' ? 'Hero 광고' : '페이지 광고';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (isAd) {
        const adData = {
          type: form.type || tab,
          title: form.title,
          imageUrl: form.imageUrl,
          linkUrl: form.linkUrl || undefined,
          startDate: form.startDate || undefined,
          endDate: form.endDate || undefined,
          displayOrder: Number(form.displayOrder),
          isActive: form.isActive,
        };
        if (isEdit) {
          await communityManageApi.updateAd(editItem.id, adData);
        } else {
          await communityManageApi.createAd(adData);
        }
      } else if (isSponsor) {
        const sponsorData = {
          name: form.name,
          logoUrl: form.logoUrl,
          linkUrl: form.linkUrl || undefined,
          displayOrder: Number(form.displayOrder),
          isActive: form.isActive,
        };
        if (isEdit) {
          await communityManageApi.updateSponsor(editItem.id, sponsorData);
        } else {
          await communityManageApi.createSponsor(sponsorData);
        }
      } else if (isQuickLink) {
        const qlData = {
          title: form.title,
          imageUrl: form.imageUrl,
          linkUrl: form.linkUrl,
          description: form.description || undefined,
          openInNewTab: form.openInNewTab,
          displayOrder: Number(form.displayOrder),
          isActive: form.isActive,
        };
        if (isEdit) {
          await communityManageApi.updateQuickLink(editItem.id, qlData);
        } else {
          await communityManageApi.createQuickLink(qlData);
        }
      }
      onSaved();
    } catch {
      toast.error('저장에 실패했습니다.');
    }
    setSaving(false);
  };

  const update = (key: string, val: any) => setForm((prev) => ({ ...prev, [key]: val }));

  return (
    <div
      className="fixed inset-0 bg-black/40 flex items-center justify-center z-[1000]"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl p-7 w-full max-w-[480px] max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-5">
          <h3 className="text-base font-semibold m-0">
            {isEdit ? '수정' : '추가'} — {modalTitle}
          </h3>
          <button onClick={onClose} className="bg-none border-none cursor-pointer text-slate-500"><X size={20} /></button>
        </div>

        <form onSubmit={handleSubmit}>
          {isAd ? (
            <>
              <Field label="제목" value={form.title} onChange={(v) => update('title', v)} required />
              <ImageField
                label="이미지"
                value={form.imageUrl}
                onChange={(v) => update('imageUrl', v)}
                onPickerOpen={() => setShowMediaPicker(true)}
              />
              <Field label="링크 URL" value={form.linkUrl} onChange={(v) => update('linkUrl', v)} />
              <div className="grid grid-cols-2 gap-3">
                <Field label="시작일" value={form.startDate} onChange={(v) => update('startDate', v)} type="date" />
                <Field label="종료일" value={form.endDate} onChange={(v) => update('endDate', v)} type="date" />
              </div>
            </>
          ) : isSponsor ? (
            <>
              <Field label="이름" value={form.name} onChange={(v) => update('name', v)} required />
              <ImageField
                label="로고"
                value={form.logoUrl}
                onChange={(v) => update('logoUrl', v)}
                onPickerOpen={() => setShowMediaPicker(true)}
              />
              <Field label="링크 URL" value={form.linkUrl} onChange={(v) => update('linkUrl', v)} />
            </>
          ) : (
            <>
              <Field label="제목" value={form.title} onChange={(v) => update('title', v)} required />
              <Field label="설명 (선택)" value={form.description} onChange={(v) => update('description', v)} />
              <ImageField
                label="아이콘/이미지"
                value={form.imageUrl}
                onChange={(v) => update('imageUrl', v)}
                onPickerOpen={() => setShowMediaPicker(true)}
              />
              <Field label="링크 URL" value={form.linkUrl} onChange={(v) => update('linkUrl', v)} required />
              <div className="mb-4">
                <label className="block text-xs font-semibold text-slate-600 mb-1">새 탭에서 열기</label>
                <select
                  value={form.openInNewTab ? 'true' : 'false'}
                  onChange={(e) => update('openInNewTab', e.target.value === 'true')}
                  className="w-full px-3 py-2 text-[0.8125rem] border border-slate-200 rounded-lg outline-none box-border"
                >
                  <option value="true">예</option>
                  <option value="false">아니오</option>
                </select>
              </div>
            </>
          )}

          <div className="grid grid-cols-2 gap-3">
            <Field label="표시 순서" value={String(form.displayOrder)} onChange={(v) => update('displayOrder', v)} type="number" />
            <div className="mb-4">
              <label className="block text-xs font-semibold text-slate-600 mb-1">활성 여부</label>
              <select
                value={form.isActive ? 'true' : 'false'}
                onChange={(e) => update('isActive', e.target.value === 'true')}
                className="w-full px-3 py-2 text-[0.8125rem] border border-slate-200 rounded-lg outline-none box-border"
              >
                <option value="true">활성</option>
                <option value="false">비활성</option>
              </select>
            </div>
          </div>

          <button
            type="submit"
            disabled={saving}
            className={`w-full py-2.5 text-sm font-medium text-white rounded-lg mt-2 ${
              saving ? 'bg-slate-400 cursor-default' : 'bg-blue-600 cursor-pointer hover:bg-blue-700'
            }`}
          >
            {saving ? '저장 중...' : isEdit ? '수정' : '추가'}
          </button>
        </form>

        <MediaPickerModal
          open={showMediaPicker}
          onClose={() => setShowMediaPicker(false)}
          onSelect={(asset) => {
            update(mediaPickerField, asset.url);
            setShowMediaPicker(false);
          }}
          title={mediaPickerTitle}
          defaultFolder={mediaPickerFolder}
        />
      </div>
    </div>
  );
}

// ─── ImageField: 미디어 라이브러리 선택 + URL 직접 입력 fallback ───

function ImageField({ label, value, onChange, onPickerOpen }: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  onPickerOpen: () => void;
}) {
  const [showUrlInput, setShowUrlInput] = useState(false);

  return (
    <div className="mb-4">
      <label className="block text-xs font-semibold text-slate-600 mb-1">{label}</label>
      {value && (
        <div className="mb-2 relative inline-block">
          <img
            src={value}
            alt="미리보기"
            className="max-h-20 max-w-full rounded-md border border-slate-200 object-contain"
          />
          <button
            type="button"
            onClick={() => onChange('')}
            className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-red-600 text-white border-none cursor-pointer text-[11px] flex items-center justify-center"
          >
            ×
          </button>
        </div>
      )}
      <div className="flex gap-1.5">
        <button
          type="button"
          onClick={onPickerOpen}
          className="flex items-center gap-1.5 px-3.5 py-[7px] text-xs font-medium text-blue-600 bg-blue-50 border border-blue-200 rounded-lg cursor-pointer hover:bg-blue-100"
        >
          <ImageIcon size={14} /> 미디어 라이브러리에서 선택
        </button>
        <button
          type="button"
          onClick={() => setShowUrlInput(!showUrlInput)}
          className="px-2.5 py-[7px] text-[11px] text-slate-500 bg-slate-50 border border-slate-200 rounded-lg cursor-pointer hover:bg-slate-100"
        >
          URL 직접 입력
        </button>
      </div>
      {showUrlInput && (
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="https://..."
          className="w-full px-3 py-2 text-[0.8125rem] border border-slate-200 rounded-lg outline-none box-border mt-2"
        />
      )}
    </div>
  );
}

function Field({ label, value, onChange, required, type }: {
  label: string; value: string; onChange: (v: string) => void;
  required?: boolean; type?: string;
}) {
  return (
    <div className="mb-4">
      <label className="block text-xs font-semibold text-slate-600 mb-1">{label}</label>
      <input
        type={type ?? 'text'}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        className="w-full px-3 py-2 text-[0.8125rem] border border-slate-200 rounded-lg outline-none box-border"
      />
    </div>
  );
}
