/**
 * CommunityHomeConsole — 운영자 커뮤니티 Home 편집 공통 View
 *
 * WO-O4O-COMMUNITY-OPERATOR-CONSOLE-VIEW-CONVERGENCE-V1
 *
 * KPA `pages/operator/CommunityManagementPage` 구현을 canonical 로 승격.
 * GlycoPharm / Neture 의 동일 화면(VIEW_DUPLICATED)이 이 View 를 소비한다.
 *
 * 계약:
 *   - 이 View 는 fetch/axios 를 직접 호출하지 않는다 (client adapter 주입).
 *   - service 조건문(if service === ...)을 갖지 않는다 (config/slot 으로만 분기).
 *   - 상태 계약 보존: loading / error+retry / empty / populated.
 *   - 권한 해석을 하지 않는다 — 라우트 guard 가 이미 통과시킨 화면만 렌더한다.
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import type { FormEvent } from 'react';
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
import type {
  CommunityHomeConsoleProps,
  CommunityHomeTabKey,
  CommunityAdData,
  CommunitySponsorData,
  CommunityQuickLinkData,
  CommunityHomeImageFieldProps,
} from './types';

const ACCENT = {
  blue: {
    iconBg: 'bg-blue-100',
    iconText: 'text-blue-600',
    tabActive: 'font-semibold text-blue-600 border-blue-600',
    button: 'bg-blue-600 hover:bg-blue-700',
    link: 'text-blue-600',
    softButton: 'text-blue-600 bg-blue-50 border-blue-200 hover:bg-blue-100',
  },
  emerald: {
    iconBg: 'bg-emerald-100',
    iconText: 'text-emerald-600',
    tabActive: 'font-semibold text-emerald-600 border-emerald-600',
    button: 'bg-emerald-600 hover:bg-emerald-700',
    link: 'text-emerald-600',
    softButton: 'text-emerald-600 bg-emerald-50 border-emerald-200 hover:bg-emerald-100',
  },
} as const;

const rowActionPolicy = defineActionPolicy<{ id: string }>('o4o:community-home', {
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

/** 응답 unwrap — `{ data: { ads } }` / `{ ads }` 두 shape 을 모두 허용 (서비스별 backend 차이 흡수) */
function pickList<T>(res: any, key: string): T[] {
  return (res?.data?.[key] ?? res?.[key] ?? []) as T[];
}

export function CommunityHomeConsole({
  client,
  tableIdPrefix,
  title = 'Home 편집',
  subtitle = 'Home 화면의 Hero 배너, 광고, 스폰서를 관리합니다',
  accent = 'blue',
  enableQuickLinks = false,
  notice,
  renderImageField,
}: CommunityHomeConsoleProps) {
  const theme = ACCENT[accent];
  const [tab, setTab] = useState<CommunityHomeTabKey>('hero');
  const [ads, setAds] = useState<CommunityAdData[]>([]);
  const [sponsors, setSponsors] = useState<CommunitySponsorData[]>([]);
  const [quickLinks, setQuickLinks] = useState<CommunityQuickLinkData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem] = useState<any>(null);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    // 탭 전환 시 이전 탭의 데이터/오류가 잘못 남지 않도록 정리
    setLoading(true);
    setError(null);
    setAds([]);
    setSponsors([]);
    setQuickLinks([]);
    try {
      if (tab === 'sponsors') {
        const res = await client.listSponsors();
        setSponsors(pickList<CommunitySponsorData>(res, 'sponsors'));
      } else if (tab === 'quickLinks') {
        const res = await client.listQuickLinks?.();
        setQuickLinks(pickList<CommunityQuickLinkData>(res, 'quickLinks'));
      } else {
        const res = await client.listAds(tab);
        setAds(pickList<CommunityAdData>(res, 'ads'));
      }
    } catch {
      setError('데이터를 불러오지 못했습니다.');
    }
    setLoading(false);
  }, [client, tab]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const executeDelete = async () => {
    if (!deleteTargetId) return;
    try {
      if (tab === 'sponsors') {
        await client.deleteSponsor(deleteTargetId);
      } else if (tab === 'quickLinks') {
        await client.deleteQuickLink?.(deleteTargetId);
      } else {
        await client.deleteAd(deleteTargetId);
      }
      fetchData();
    } catch {
      toast.error('삭제에 실패했습니다.');
    } finally {
      setDeleteTargetId(null);
    }
  };

  const handleDelete = (id: string) => setDeleteTargetId(id);
  const openCreate = () => { setEditItem(null); setShowModal(true); };
  const openEdit = (item: any) => { setEditItem(item); setShowModal(true); };

  const addButtonLabel = tab === 'sponsors' ? '스폰서 추가' : tab === 'quickLinks' ? '링크 추가' : '광고 추가';

  const tabs = useMemo(() => {
    const base = [
      { key: 'hero' as CommunityHomeTabKey, label: 'Hero 광고', icon: Image },
      { key: 'page' as CommunityHomeTabKey, label: '페이지 광고', icon: Monitor },
      { key: 'sponsors' as CommunityHomeTabKey, label: '스폰서', icon: Users },
    ];
    if (enableQuickLinks) {
      base.push({ key: 'quickLinks' as CommunityHomeTabKey, label: '하단 링크', icon: Link2 });
    }
    return base;
  }, [enableQuickLinks]);

  const adColumns: ListColumnDef<CommunityAdData>[] = useMemo(() => [
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

  const sponsorColumns: ListColumnDef<CommunitySponsorData>[] = useMemo(() => [
    {
      key: 'logoUrl', header: '로고', width: '100px',
      render: (_v, s) => <img src={s.logoUrl} alt={s.name} className="h-7 max-w-[80px] object-contain" />,
    },
    { key: 'name', header: '이름', render: (_v, s) => <span className="text-slate-700">{s.name}</span> },
    {
      key: 'linkUrl', header: '링크', width: '90px',
      render: (_v, s) => s.linkUrl
        ? <a href={s.linkUrl} target="_blank" rel="noopener noreferrer" className={`${theme.link} text-xs`}>링크</a>
        : <span className="text-slate-400">-</span>,
    },
    { key: 'displayOrder', header: '순서', width: '70px', align: 'center', render: (_v, s) => s.displayOrder },
    { key: 'isActive', header: '상태', width: '80px', align: 'center', render: (_v, s) => <StatusBadge active={s.isActive} /> },
    {
      key: '_actions', header: '액션', width: '60px', align: 'center', system: true,
      render: (_v, s) => renderRowActions(s, openEdit, handleDelete),
    },
  ], [theme.link]);

  const quickLinkColumns: ListColumnDef<CommunityQuickLinkData>[] = useMemo(() => [
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
        <a href={ql.linkUrl} target="_blank" rel="noopener noreferrer" className={`inline-flex items-center gap-1 ${theme.link} text-xs`}>
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
  ], [theme.link]);

  return (
    <div className="py-6">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className={`w-10 h-10 rounded-[10px] ${theme.iconBg} flex items-center justify-center`}>
          <Monitor size={20} className={theme.iconText} />
        </div>
        <div>
          <h1 className="text-xl font-semibold text-slate-800 m-0">{title}</h1>
          <p className="text-[0.8125rem] text-slate-500 m-0">{subtitle}</p>
        </div>
      </div>

      {notice}

      {/* Tabs */}
      <div className="flex gap-2 mb-5 border-b border-slate-200">
        {tabs.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`flex items-center gap-1.5 px-4 py-2.5 text-[0.8125rem] -mb-px border-b-2 ${
              tab === key ? theme.tabActive : 'font-normal text-slate-500 border-transparent hover:text-slate-700'
            }`}
          >
            <Icon size={14} /> {label}
          </button>
        ))}
      </div>

      {/* Action Bar */}
      <div className="flex justify-end mb-4">
        <button
          onClick={openCreate}
          className={`flex items-center gap-1.5 px-4 py-2 text-[0.8125rem] font-medium text-white rounded-lg ${theme.button}`}
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
        <DataTable<CommunitySponsorData>
          columns={sponsorColumns} data={sponsors} rowKey="id"
          emptyMessage="등록된 스폰서가 없습니다." tableId={`${tableIdPrefix}-sponsors`}
        />
      ) : tab === 'quickLinks' ? (
        <DataTable<CommunityQuickLinkData>
          columns={quickLinkColumns} data={quickLinks} rowKey="id"
          emptyMessage="등록된 하단 링크가 없습니다." tableId={`${tableIdPrefix}-quicklinks`}
        />
      ) : (
        <DataTable<CommunityAdData>
          columns={adColumns} data={ads} rowKey="id"
          emptyMessage="등록된 광고가 없습니다." tableId={`${tableIdPrefix}-ads`}
        />
      )}

      {showModal && (
        <CommunityHomeFormModal
          client={client}
          tab={tab}
          editItem={editItem}
          accent={accent}
          renderImageField={renderImageField}
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

function CommunityHomeFormModal({
  client, tab, editItem, accent, renderImageField, onClose, onSaved,
}: {
  client: CommunityHomeConsoleProps['client'];
  tab: CommunityHomeTabKey;
  editItem: any;
  accent: NonNullable<CommunityHomeConsoleProps['accent']>;
  renderImageField?: CommunityHomeConsoleProps['renderImageField'];
  onClose: () => void;
  onSaved: () => void;
}) {
  const theme = ACCENT[accent];
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

  const modalTitle = isQuickLink
    ? '하단 링크'
    : isSponsor
      ? '스폰서'
      : tab === 'hero' ? 'Hero 광고' : '페이지 광고';

  const update = (key: string, val: any) => setForm((prev) => ({ ...prev, [key]: val }));

  const imageField = (label: string, field: 'imageUrl' | 'logoUrl', purpose: CommunityHomeImageFieldProps['purpose']) => {
    const props: CommunityHomeImageFieldProps = {
      label,
      value: form[field],
      onChange: (v) => update(field, v),
      purpose,
    };
    return renderImageField
      ? <>{renderImageField(props)}</>
      : <ImageFieldShell {...props} accent={accent} />;
  };

  const handleSubmit = async (e: FormEvent) => {
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
        if (isEdit) await client.updateAd(editItem.id, adData);
        else await client.createAd(adData);
      } else if (isSponsor) {
        const sponsorData = {
          name: form.name,
          logoUrl: form.logoUrl,
          linkUrl: form.linkUrl || undefined,
          displayOrder: Number(form.displayOrder),
          isActive: form.isActive,
        };
        if (isEdit) await client.updateSponsor(editItem.id, sponsorData);
        else await client.createSponsor(sponsorData);
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
        if (isEdit) await client.updateQuickLink?.(editItem.id, qlData);
        else await client.createQuickLink?.(qlData);
      }
      onSaved();
    } catch {
      toast.error('저장에 실패했습니다.');
    }
    setSaving(false);
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-[1000]" onClick={onClose}>
      <div
        className="bg-white rounded-2xl p-7 w-full max-w-[480px] max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-5">
          <h3 className="text-base font-semibold m-0">{isEdit ? '수정' : '추가'} — {modalTitle}</h3>
          <button onClick={onClose} className="bg-none border-none cursor-pointer text-slate-500"><X size={20} /></button>
        </div>

        <form onSubmit={handleSubmit}>
          {isAd ? (
            <>
              <Field label="제목" value={form.title} onChange={(v) => update('title', v)} required />
              {imageField('이미지', 'imageUrl', 'banner')}
              <Field label="링크 URL" value={form.linkUrl} onChange={(v) => update('linkUrl', v)} />
              <div className="grid grid-cols-2 gap-3">
                <Field label="시작일" value={form.startDate} onChange={(v) => update('startDate', v)} type="date" />
                <Field label="종료일" value={form.endDate} onChange={(v) => update('endDate', v)} type="date" />
              </div>
            </>
          ) : isSponsor ? (
            <>
              <Field label="이름" value={form.name} onChange={(v) => update('name', v)} required />
              {imageField('로고', 'logoUrl', 'brand')}
              <Field label="링크 URL" value={form.linkUrl} onChange={(v) => update('linkUrl', v)} />
            </>
          ) : (
            <>
              <Field label="제목" value={form.title} onChange={(v) => update('title', v)} required />
              <Field label="설명 (선택)" value={form.description} onChange={(v) => update('description', v)} />
              {imageField('아이콘/이미지', 'imageUrl', 'icon')}
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
              saving ? 'bg-slate-400 cursor-default' : `cursor-pointer ${theme.button}`
            }`}
          >
            {saving ? '저장 중...' : isEdit ? '수정' : '추가'}
          </button>
        </form>
      </div>
    </div>
  );
}

/**
 * 이미지 입력 shell — 미리보기 + (선택) 미디어 라이브러리 버튼 + URL 직접 입력 fallback.
 * 서비스가 picker 를 갖고 있으면 `onPickerOpen` 을 주입해 재사용한다 (KPA MediaPickerModal).
 */
export function ImageFieldShell({
  label, value, onChange, onPickerOpen, accent = 'blue', pickerLabel = '미디어 라이브러리에서 선택',
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  onPickerOpen?: () => void;
  accent?: 'blue' | 'emerald';
  pickerLabel?: string;
}) {
  const theme = ACCENT[accent];
  const [showUrlInput, setShowUrlInput] = useState(!onPickerOpen);

  return (
    <div className="mb-4">
      <label className="block text-xs font-semibold text-slate-600 mb-1">{label}</label>
      {value && (
        <div className="mb-2 relative inline-block">
          <img src={value} alt="미리보기" className="max-h-20 max-w-full rounded-md border border-slate-200 object-contain" />
          <button
            type="button"
            onClick={() => onChange('')}
            className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-red-600 text-white border-none cursor-pointer text-[11px] flex items-center justify-center"
          >
            ×
          </button>
        </div>
      )}
      {onPickerOpen && (
        <div className="flex gap-1.5">
          <button
            type="button"
            onClick={onPickerOpen}
            className={`flex items-center gap-1.5 px-3.5 py-[7px] text-xs font-medium border rounded-lg cursor-pointer ${theme.softButton}`}
          >
            <ImageIcon size={14} /> {pickerLabel}
          </button>
          <button
            type="button"
            onClick={() => setShowUrlInput(!showUrlInput)}
            className="px-2.5 py-[7px] text-[11px] text-slate-500 bg-slate-50 border border-slate-200 rounded-lg cursor-pointer hover:bg-slate-100"
          >
            URL 직접 입력
          </button>
        </div>
      )}
      {showUrlInput && (
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="https://..."
          className={`w-full px-3 py-2 text-[0.8125rem] border border-slate-200 rounded-lg outline-none box-border ${onPickerOpen ? 'mt-2' : ''}`}
        />
      )}
    </div>
  );
}

function Field({ label, value, onChange, required, type }: {
  label: string; value: string; onChange: (v: string) => void; required?: boolean; type?: string;
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
