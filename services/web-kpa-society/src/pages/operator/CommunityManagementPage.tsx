/**
 * CommunityManagementPage — Operator Community Ads/Sponsors 관리
 *
 * WO-KPA-A-COMMUNITY-HUB-IMPLEMENTATION-V1
 *
 * 3 tabs: Hero 광고 | 페이지 광고 | 스폰서
 * CRUD for community_ads and community_sponsors
 */

import { useState, useEffect, useCallback } from 'react';
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
} from 'lucide-react';
import { communityManageApi, type CommunityAdFull, type CommunitySponsorFull } from '../../api/community';

type Tab = 'hero' | 'page' | 'sponsors';

export default function CommunityManagementPage() {
  const [tab, setTab] = useState<Tab>('hero');
  const [ads, setAds] = useState<CommunityAdFull[]>([]);
  const [sponsors, setSponsors] = useState<CommunitySponsorFull[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem] = useState<any>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      if (tab === 'sponsors') {
        const res = await communityManageApi.listSponsors();
        setSponsors((res as any)?.data?.sponsors ?? (res as any)?.sponsors ?? []);
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

  const handleDelete = async (id: string) => {
    if (!confirm('정말 삭제하시겠습니까?')) return;
    try {
      if (tab === 'sponsors') {
        await communityManageApi.deleteSponsor(id);
      } else {
        await communityManageApi.deleteAd(id);
      }
      fetchData();
    } catch {
      alert('삭제에 실패했습니다.');
    }
  };

  const openCreate = () => {
    setEditItem(null);
    setShowModal(true);
  };

  const openEdit = (item: any) => {
    setEditItem(item);
    setShowModal(true);
  };

  return (
    <div style={{ padding: '24px 0' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
        <div style={{ width: 40, height: 40, borderRadius: 10, backgroundColor: '#dbeafe', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Monitor size={20} color="#2563eb" />
        </div>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 600, color: '#1e293b', margin: 0 }}>커뮤니티 관리</h1>
          <p style={{ fontSize: 13, color: '#64748b', margin: 0 }}>Community Hub 광고 및 스폰서 관리</p>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20, borderBottom: '1px solid #e2e8f0', paddingBottom: 0 }}>
        {([
          { key: 'hero' as Tab, label: 'Hero 광고', icon: Image },
          { key: 'page' as Tab, label: '페이지 광고', icon: Monitor },
          { key: 'sponsors' as Tab, label: '스폰서', icon: Users },
        ]).map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '10px 16px', fontSize: 13, fontWeight: tab === key ? 600 : 400,
              color: tab === key ? '#2563eb' : '#64748b',
              borderBottom: tab === key ? '2px solid #2563eb' : '2px solid transparent',
              background: 'none', border: 'none', cursor: 'pointer',
              marginBottom: -1,
            }}
          >
            <Icon size={14} /> {label}
          </button>
        ))}
      </div>

      {/* Action Bar */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
        <button
          onClick={openCreate}
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '8px 16px', fontSize: 13, fontWeight: 500,
            color: 'white', backgroundColor: '#2563eb',
            border: 'none', borderRadius: 8, cursor: 'pointer',
          }}
        >
          <Plus size={14} /> {tab === 'sponsors' ? '스폰서 추가' : '광고 추가'}
        </button>
      </div>

      {/* Content */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: 40, color: '#64748b' }}>
          <Loader2 size={24} className="animate-spin" style={{ margin: '0 auto 8px' }} />
          <p style={{ fontSize: 13 }}>불러오는 중...</p>
        </div>
      ) : error ? (
        <div style={{ textAlign: 'center', padding: 40, color: '#dc2626' }}>
          <AlertCircle size={24} style={{ margin: '0 auto 8px' }} />
          <p style={{ fontSize: 13 }}>{error}</p>
        </div>
      ) : tab === 'sponsors' ? (
        <SponsorTable sponsors={sponsors} onEdit={openEdit} onDelete={handleDelete} />
      ) : (
        <AdTable ads={ads} onEdit={openEdit} onDelete={handleDelete} />
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
    </div>
  );
}

// ─── Ad Table ───

function AdTable({ ads, onEdit, onDelete }: {
  ads: CommunityAdFull[];
  onEdit: (ad: CommunityAdFull) => void;
  onDelete: (id: string) => void;
}) {
  if (ads.length === 0) {
    return <p style={{ textAlign: 'center', color: '#94a3b8', padding: 32, fontSize: 14 }}>등록된 광고가 없습니다.</p>;
  }
  return (
    <div style={{ border: '1px solid #e2e8f0', borderRadius: 12, overflow: 'hidden' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
        <thead>
          <tr style={{ backgroundColor: '#f8fafc' }}>
            <th style={thStyle}>미리보기</th>
            <th style={thStyle}>제목</th>
            <th style={thStyle}>기간</th>
            <th style={thStyle}>순서</th>
            <th style={thStyle}>상태</th>
            <th style={thStyle}>액션</th>
          </tr>
        </thead>
        <tbody>
          {ads.map((ad) => (
            <tr key={ad.id} style={{ borderTop: '1px solid #e2e8f0' }}>
              <td style={tdStyle}>
                <img src={ad.imageUrl} alt="" style={{ width: 60, height: 36, objectFit: 'cover', borderRadius: 4 }} />
              </td>
              <td style={tdStyle}>{ad.title}</td>
              <td style={tdStyle}>
                {ad.startDate || ad.endDate
                  ? `${ad.startDate?.slice(0, 10) ?? '~'} ~ ${ad.endDate?.slice(0, 10) ?? ''}`
                  : '상시'}
              </td>
              <td style={tdStyle}>{ad.displayOrder}</td>
              <td style={tdStyle}>
                <span style={{
                  fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 4,
                  backgroundColor: ad.isActive ? '#dcfce7' : '#fee2e2',
                  color: ad.isActive ? '#16a34a' : '#dc2626',
                }}>
                  {ad.isActive ? '활성' : '비활성'}
                </span>
              </td>
              <td style={tdStyle}>
                <div style={{ display: 'flex', gap: 6 }}>
                  <button onClick={() => onEdit(ad)} style={iconBtn}><Edit3 size={14} /></button>
                  <button onClick={() => onDelete(ad.id)} style={{ ...iconBtn, color: '#dc2626' }}><Trash2 size={14} /></button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── Sponsor Table ───

function SponsorTable({ sponsors, onEdit, onDelete }: {
  sponsors: CommunitySponsorFull[];
  onEdit: (s: CommunitySponsorFull) => void;
  onDelete: (id: string) => void;
}) {
  if (sponsors.length === 0) {
    return <p style={{ textAlign: 'center', color: '#94a3b8', padding: 32, fontSize: 14 }}>등록된 스폰서가 없습니다.</p>;
  }
  return (
    <div style={{ border: '1px solid #e2e8f0', borderRadius: 12, overflow: 'hidden' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
        <thead>
          <tr style={{ backgroundColor: '#f8fafc' }}>
            <th style={thStyle}>로고</th>
            <th style={thStyle}>이름</th>
            <th style={thStyle}>링크</th>
            <th style={thStyle}>순서</th>
            <th style={thStyle}>상태</th>
            <th style={thStyle}>액션</th>
          </tr>
        </thead>
        <tbody>
          {sponsors.map((s) => (
            <tr key={s.id} style={{ borderTop: '1px solid #e2e8f0' }}>
              <td style={tdStyle}>
                <img src={s.logoUrl} alt={s.name} style={{ height: 28, maxWidth: 80, objectFit: 'contain' }} />
              </td>
              <td style={tdStyle}>{s.name}</td>
              <td style={tdStyle}>
                {s.linkUrl ? (
                  <a href={s.linkUrl} target="_blank" rel="noopener noreferrer" style={{ color: '#2563eb', fontSize: 12 }}>링크</a>
                ) : '-'}
              </td>
              <td style={tdStyle}>{s.displayOrder}</td>
              <td style={tdStyle}>
                <span style={{
                  fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 4,
                  backgroundColor: s.isActive ? '#dcfce7' : '#fee2e2',
                  color: s.isActive ? '#16a34a' : '#dc2626',
                }}>
                  {s.isActive ? '활성' : '비활성'}
                </span>
              </td>
              <td style={tdStyle}>
                <div style={{ display: 'flex', gap: 6 }}>
                  <button onClick={() => onEdit(s)} style={iconBtn}><Edit3 size={14} /></button>
                  <button onClick={() => onDelete(s.id)} style={{ ...iconBtn, color: '#dc2626' }}><Trash2 size={14} /></button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
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
  const isAd = tab !== 'sponsors';
  const isEdit = !!editItem;

  const [form, setForm] = useState({
    type: tab === 'sponsors' ? '' : tab,
    title: editItem?.title ?? '',
    name: editItem?.name ?? '',
    imageUrl: editItem?.imageUrl ?? '',
    logoUrl: editItem?.logoUrl ?? '',
    linkUrl: editItem?.linkUrl ?? '',
    startDate: editItem?.startDate?.slice(0, 10) ?? '',
    endDate: editItem?.endDate?.slice(0, 10) ?? '',
    displayOrder: editItem?.displayOrder ?? 0,
    isActive: editItem?.isActive ?? true,
  });
  const [saving, setSaving] = useState(false);

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
      } else {
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
      }
      onSaved();
    } catch {
      alert('저장에 실패했습니다.');
    }
    setSaving(false);
  };

  const update = (key: string, val: any) => setForm((prev) => ({ ...prev, [key]: val }));

  return (
    <div style={modalOverlay} onClick={onClose}>
      <div style={modalContent} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h3 style={{ fontSize: 16, fontWeight: 600, margin: 0 }}>
            {isEdit ? '수정' : '추가'} — {tab === 'sponsors' ? '스폰서' : tab === 'hero' ? 'Hero 광고' : '페이지 광고'}
          </h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={20} /></button>
        </div>

        <form onSubmit={handleSubmit}>
          {isAd ? (
            <>
              <Field label="제목" value={form.title} onChange={(v) => update('title', v)} required />
              <Field label="이미지 URL" value={form.imageUrl} onChange={(v) => update('imageUrl', v)} required />
              <Field label="링크 URL" value={form.linkUrl} onChange={(v) => update('linkUrl', v)} />
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <Field label="시작일" value={form.startDate} onChange={(v) => update('startDate', v)} type="date" />
                <Field label="종료일" value={form.endDate} onChange={(v) => update('endDate', v)} type="date" />
              </div>
            </>
          ) : (
            <>
              <Field label="이름" value={form.name} onChange={(v) => update('name', v)} required />
              <Field label="로고 URL" value={form.logoUrl} onChange={(v) => update('logoUrl', v)} required />
              <Field label="링크 URL" value={form.linkUrl} onChange={(v) => update('linkUrl', v)} />
            </>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Field label="표시 순서" value={String(form.displayOrder)} onChange={(v) => update('displayOrder', v)} type="number" />
            <div style={{ marginBottom: 16 }}>
              <label style={labelStyle}>활성 여부</label>
              <select
                value={form.isActive ? 'true' : 'false'}
                onChange={(e) => update('isActive', e.target.value === 'true')}
                style={inputStyle}
              >
                <option value="true">활성</option>
                <option value="false">비활성</option>
              </select>
            </div>
          </div>

          <button
            type="submit"
            disabled={saving}
            style={{
              width: '100%', padding: '10px 0', fontSize: 14, fontWeight: 500,
              color: 'white', backgroundColor: saving ? '#94a3b8' : '#2563eb',
              border: 'none', borderRadius: 8, cursor: saving ? 'default' : 'pointer',
              marginTop: 8,
            }}
          >
            {saving ? '저장 중...' : isEdit ? '수정' : '추가'}
          </button>
        </form>
      </div>
    </div>
  );
}

function Field({ label, value, onChange, required, type }: {
  label: string; value: string; onChange: (v: string) => void;
  required?: boolean; type?: string;
}) {
  return (
    <div style={{ marginBottom: 16 }}>
      <label style={labelStyle}>{label}</label>
      <input
        type={type ?? 'text'}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        style={inputStyle}
      />
    </div>
  );
}

// ─── Shared Styles ───

const thStyle: React.CSSProperties = {
  textAlign: 'left', padding: '10px 14px', fontSize: 12, fontWeight: 600, color: '#64748b',
};
const tdStyle: React.CSSProperties = {
  padding: '10px 14px', verticalAlign: 'middle',
};
const iconBtn: React.CSSProperties = {
  background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', padding: 4,
};
const modalOverlay: React.CSSProperties = {
  position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.4)',
  display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
};
const modalContent: React.CSSProperties = {
  backgroundColor: 'white', borderRadius: 16, padding: 28, width: '100%', maxWidth: 480,
  maxHeight: '90vh', overflowY: 'auto',
};
const labelStyle: React.CSSProperties = {
  display: 'block', fontSize: 12, fontWeight: 600, color: '#475569', marginBottom: 4,
};
const inputStyle: React.CSSProperties = {
  width: '100%', padding: '8px 12px', fontSize: 13, border: '1px solid #e2e8f0',
  borderRadius: 8, outline: 'none', boxSizing: 'border-box',
};
