/**
 * PharmacySellPage - 약국 상품 판매 관리
 *
 * WO-PHARMACY-PRODUCT-LISTING-APPROVAL-PHASE1-V1
 * WO-PHARMACY-PRODUCT-CHANNEL-MANAGEMENT-V1 (채널 설정, 필터)
 *
 * 두 개 탭:
 * 1. 판매 등록 신청 — 상품 판매 신청 및 신청 내역 확인
 * 2. 내 매장 진열 상품 — 승인된 상품의 매장 진열 관리 + 채널 설정
 */

import { useState, useEffect, useCallback } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  applyProduct,
  getApplications,
  getListings,
  updateListing,
  getListingChannels,
  updateListingChannels,
} from '../../api/pharmacyProducts';
import type { ProductApplication, ProductListing, ListingChannelSetting } from '../../api/pharmacyProducts';
import { fetchChannelOverview } from '../../api/storeHub';
import type { ChannelOverview, ChannelType } from '../../api/storeHub';

type TabId = 'applications' | 'listings';

const STATUS_LABELS: Record<string, { text: string; color: string; bg: string }> = {
  pending: { text: '심사 중', color: '#B45309', bg: '#FEF3C7' },
  approved: { text: '승인', color: '#047857', bg: '#D1FAE5' },
  rejected: { text: '거절', color: '#DC2626', bg: '#FEE2E2' },
};

const CHANNEL_LABELS: Record<string, string> = {
  B2C: '온라인 스토어',
  KIOSK: '키오스크',
  TABLET: '태블릿',
  SIGNAGE: '사이니지',
};

export function PharmacySellPage() {
  const [activeTab, setActiveTab] = useState<TabId>('applications');

  return (
    <div style={{ maxWidth: 960, margin: '0 auto', padding: '32px 16px' }}>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <Link to="/pharmacy/dashboard" style={{ color: '#6B7280', textDecoration: 'none', fontSize: '0.875rem' }}>
          &larr; 대시보드
        </Link>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 700, color: '#0F172A', margin: '8px 0 4px' }}>
          상품 판매 관리
        </h1>
        <p style={{ color: '#64748B', fontSize: '0.95rem' }}>
          매장에서 판매할 상품을 신청하고, 승인된 상품을 진열 관리합니다.
        </p>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 0, borderBottom: '2px solid #E5E7EB', marginBottom: 24 }}>
        {([
          { id: 'applications' as TabId, label: '판매 등록 신청' },
          { id: 'listings' as TabId, label: '내 매장 진열 상품' },
        ]).map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              padding: '12px 24px',
              fontSize: '0.95rem',
              fontWeight: activeTab === tab.id ? 600 : 400,
              color: activeTab === tab.id ? '#2563EB' : '#6B7280',
              background: 'none',
              border: 'none',
              borderBottom: activeTab === tab.id ? '2px solid #2563EB' : '2px solid transparent',
              marginBottom: -2,
              cursor: 'pointer',
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === 'applications' && <ApplicationsTab />}
      {activeTab === 'listings' && <ListingsTab />}
    </div>
  );
}

/**
 * Tab 1: 판매 등록 신청
 */
function ApplicationsTab() {
  const [applications, setApplications] = useState<ProductApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({ externalProductId: '', productName: '' });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadApplications = useCallback(async () => {
    try {
      setLoading(true);
      const result = await getApplications();
      setApplications(result.data || []);
    } catch (e: any) {
      console.error('Failed to load applications:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadApplications();
  }, [loadApplications]);

  const handleApply = async () => {
    if (!formData.externalProductId.trim() || !formData.productName.trim()) {
      setError('상품 ID와 상품명을 입력해주세요.');
      return;
    }

    try {
      setSubmitting(true);
      setError(null);
      await applyProduct({
        externalProductId: formData.externalProductId.trim(),
        productName: formData.productName.trim(),
      });
      setFormData({ externalProductId: '', productName: '' });
      setShowForm(false);
      await loadApplications();
    } catch (e: any) {
      setError(e.message || '신청에 실패했습니다.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      {/* New Application Button */}
      <div style={{ marginBottom: 20, display: 'flex', justifyContent: 'flex-end' }}>
        <button
          onClick={() => setShowForm(!showForm)}
          style={{
            padding: '10px 20px',
            backgroundColor: '#2563EB',
            color: '#fff',
            border: 'none',
            borderRadius: 6,
            fontSize: '0.9rem',
            fontWeight: 500,
            cursor: 'pointer',
          }}
        >
          {showForm ? '취소' : '+ 판매 신청'}
        </button>
      </div>

      {/* Application Form */}
      {showForm && (
        <div style={{
          padding: 20,
          border: '1px solid #E5E7EB',
          borderRadius: 8,
          backgroundColor: '#F9FAFB',
          marginBottom: 24,
        }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: 16, color: '#0F172A' }}>
            상품 판매 신청
          </h3>

          {error && (
            <div style={{ padding: '10px 14px', backgroundColor: '#FEE2E2', color: '#DC2626', borderRadius: 6, marginBottom: 12, fontSize: '0.875rem' }}>
              {error}
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, color: '#374151', marginBottom: 4 }}>
                상품 ID (외부 참조)
              </label>
              <input
                type="text"
                value={formData.externalProductId}
                onChange={e => setFormData(prev => ({ ...prev, externalProductId: e.target.value }))}
                placeholder="예: PROD-001"
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  border: '1px solid #D1D5DB',
                  borderRadius: 6,
                  fontSize: '0.9rem',
                  boxSizing: 'border-box',
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, color: '#374151', marginBottom: 4 }}>
                상품명
              </label>
              <input
                type="text"
                value={formData.productName}
                onChange={e => setFormData(prev => ({ ...prev, productName: e.target.value }))}
                placeholder="예: 타이레놀 500mg"
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  border: '1px solid #D1D5DB',
                  borderRadius: 6,
                  fontSize: '0.9rem',
                  boxSizing: 'border-box',
                }}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 4 }}>
              <button
                onClick={handleApply}
                disabled={submitting}
                style={{
                  padding: '10px 24px',
                  backgroundColor: submitting ? '#9CA3AF' : '#2563EB',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 6,
                  fontSize: '0.9rem',
                  fontWeight: 500,
                  cursor: submitting ? 'not-allowed' : 'pointer',
                }}
              >
                {submitting ? '신청 중...' : '신청하기'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Applications List */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: 40, color: '#9CA3AF' }}>불러오는 중...</div>
      ) : applications.length === 0 ? (
        <div style={{
          textAlign: 'center',
          padding: 60,
          color: '#9CA3AF',
          backgroundColor: '#F9FAFB',
          borderRadius: 8,
        }}>
          <p style={{ fontSize: '1.1rem', fontWeight: 500 }}>신청 내역이 없습니다</p>
          <p style={{ fontSize: '0.875rem', marginTop: 8 }}>상품 판매 신청을 시작해보세요.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {applications.map(app => {
            const statusInfo = STATUS_LABELS[app.status] || STATUS_LABELS.pending;
            return (
              <div
                key={app.id}
                style={{
                  padding: '16px 20px',
                  border: '1px solid #E5E7EB',
                  borderRadius: 8,
                  backgroundColor: '#fff',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <div>
                  <div style={{ fontWeight: 600, color: '#0F172A', marginBottom: 4 }}>
                    {app.product_name}
                  </div>
                  <div style={{ fontSize: '0.8rem', color: '#9CA3AF' }}>
                    ID: {app.external_product_id} &middot; {new Date(app.requested_at).toLocaleDateString('ko-KR')}
                  </div>
                  {app.status === 'rejected' && app.reject_reason && (
                    <div style={{ fontSize: '0.8rem', color: '#DC2626', marginTop: 4 }}>
                      거절 사유: {app.reject_reason}
                    </div>
                  )}
                </div>
                <span style={{
                  padding: '4px 12px',
                  borderRadius: 99,
                  fontSize: '0.8rem',
                  fontWeight: 500,
                  color: statusInfo.color,
                  backgroundColor: statusInfo.bg,
                }}>
                  {statusInfo.text}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/**
 * Tab 2: 내 매장 진열 상품
 */
function ListingsTab() {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialChannel = (searchParams.get('channel') as ChannelType | null) || 'ALL';

  const [listings, setListings] = useState<ProductListing[]>([]);
  const [channels, setChannels] = useState<ChannelOverview[]>([]);
  const [loading, setLoading] = useState(true);
  const [channelFilter, setChannelFilter] = useState<ChannelType | 'ALL'>(initialChannel);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const updateChannelFilter = useCallback((value: ChannelType | 'ALL') => {
    setChannelFilter(value);
    if (value === 'ALL') {
      setSearchParams(prev => { prev.delete('channel'); return prev; }, { replace: true });
    } else {
      setSearchParams(prev => { prev.set('channel', value); return prev; }, { replace: true });
    }
  }, [setSearchParams]);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [listingsResult, channelsResult] = await Promise.all([
        getListings(),
        fetchChannelOverview(),
      ]);
      setListings(listingsResult.data || []);
      setChannels(channelsResult || []);
    } catch (e: any) {
      console.error('Failed to load listings:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleToggleActive = async (listing: ProductListing) => {
    try {
      await updateListing(listing.id, { isActive: !listing.is_active });
      await loadData();
    } catch (e: any) {
      console.error('Failed to toggle listing:', e);
    }
  };

  const approvedChannels = channels.filter(ch => ch.status === 'APPROVED');

  return (
    <div>
      {/* Channel Filter */}
      {channels.length > 0 && (
        <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
          <FilterChip
            label="전체"
            active={channelFilter === 'ALL'}
            onClick={() => updateChannelFilter('ALL')}
          />
          {channels.map(ch => (
            <FilterChip
              key={ch.id}
              label={CHANNEL_LABELS[ch.channelType] || ch.channelType}
              active={channelFilter === ch.channelType}
              onClick={() => updateChannelFilter(ch.channelType)}
              disabled={ch.status !== 'APPROVED'}
            />
          ))}
        </div>
      )}

      {loading ? (
        <div style={{ textAlign: 'center', padding: 40, color: '#9CA3AF' }}>불러오는 중...</div>
      ) : listings.length === 0 ? (
        <div style={{
          textAlign: 'center',
          padding: 60,
          color: '#9CA3AF',
          backgroundColor: '#F9FAFB',
          borderRadius: 8,
        }}>
          <p style={{ fontSize: '1.1rem', fontWeight: 500 }}>진열 상품이 없습니다</p>
          <p style={{ fontSize: '0.875rem', marginTop: 8 }}>
            상품 판매가 승인되면 여기에 표시됩니다.
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {listings.map(listing => (
            <div key={listing.id}>
              <div
                style={{
                  padding: '16px 20px',
                  border: '1px solid #E5E7EB',
                  borderRadius: expandedId === listing.id ? '8px 8px 0 0' : 8,
                  backgroundColor: listing.is_active ? '#fff' : '#F9FAFB',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  opacity: listing.is_active ? 1 : 0.7,
                }}
              >
                <div>
                  <div style={{ fontWeight: 600, color: '#0F172A', marginBottom: 4 }}>
                    {listing.product_name}
                  </div>
                  <div style={{ fontSize: '0.8rem', color: '#9CA3AF' }}>
                    ID: {listing.external_product_id}
                    {listing.retail_price != null && ` · ${listing.retail_price.toLocaleString()}원`}
                    {` · 순서: ${listing.display_order}`}
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  {approvedChannels.length > 0 && (
                    <button
                      onClick={() => setExpandedId(expandedId === listing.id ? null : listing.id)}
                      style={{
                        padding: '6px 12px',
                        fontSize: '0.8rem',
                        border: '1px solid #D1D5DB',
                        borderRadius: 6,
                        backgroundColor: expandedId === listing.id ? '#EFF6FF' : '#fff',
                        color: '#2563EB',
                        cursor: 'pointer',
                        fontWeight: 500,
                      }}
                    >
                      {expandedId === listing.id ? '채널 설정 닫기' : '채널 설정'}
                    </button>
                  )}
                  <span style={{
                    fontSize: '0.8rem',
                    color: listing.is_active ? '#047857' : '#9CA3AF',
                    fontWeight: 500,
                  }}>
                    {listing.is_active ? '진열 중' : '비활성'}
                  </span>
                  <button
                    onClick={() => handleToggleActive(listing)}
                    style={{
                      padding: '6px 14px',
                      fontSize: '0.8rem',
                      border: '1px solid #D1D5DB',
                      borderRadius: 6,
                      backgroundColor: '#fff',
                      cursor: 'pointer',
                      color: '#374151',
                    }}
                  >
                    {listing.is_active ? '비활성화' : '활성화'}
                  </button>
                </div>
              </div>

              {/* Channel Settings Panel */}
              {expandedId === listing.id && (
                <ChannelSettingsPanel listingId={listing.id} onClose={() => setExpandedId(null)} />
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * Channel Settings Panel (per listing)
 */
function ChannelSettingsPanel({ listingId, onClose }: { listingId: string; onClose: () => void }) {
  const [settings, setSettings] = useState<ListingChannelSetting[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    getListingChannels(listingId)
      .then(result => {
        if (cancelled) return;
        setSettings(result.data || []);
        setLoading(false);
      })
      .catch(() => {
        if (cancelled) return;
        setLoading(false);
      });
    return () => { cancelled = true; };
  }, [listingId]);

  const handleToggleVisible = (idx: number) => {
    setSettings(prev => prev.map((s, i) =>
      i === idx ? { ...s, isVisible: !s.isVisible } : s
    ));
    setDirty(true);
  };

  const handleSalesLimitChange = (idx: number, value: string) => {
    const parsed = value === '' ? null : parseInt(value, 10);
    if (parsed !== null && (isNaN(parsed) || parsed <= 0)) return;
    setSettings(prev => prev.map((s, i) =>
      i === idx ? { ...s, salesLimit: parsed } : s
    ));
    setDirty(true);
  };

  const handleDisplayOrderChange = (idx: number, value: string) => {
    const parsed = parseInt(value, 10);
    if (isNaN(parsed) || parsed < 0) return;
    setSettings(prev => prev.map((s, i) =>
      i === idx ? { ...s, displayOrder: parsed } : s
    ));
    setDirty(true);
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      await updateListingChannels(
        listingId,
        settings.map(s => ({
          channelId: s.channelId,
          isVisible: s.isVisible,
          salesLimit: s.salesLimit,
          displayOrder: s.displayOrder ?? 0,
        }))
      );
      setDirty(false);
    } catch (e: any) {
      console.error('Failed to save channel settings:', e);
    } finally {
      setSaving(false);
    }
  };

  const CHANNEL_STATUS_STYLES: Record<string, { label: string; bg: string; color: string }> = {
    APPROVED:   { label: '승인됨',  bg: '#dcfce7', color: '#166534' },
    PENDING:    { label: '대기중',  bg: '#fef3c7', color: '#92400e' },
    REJECTED:   { label: '거부됨',  bg: '#fecaca', color: '#991b1b' },
    SUSPENDED:  { label: '정지됨',  bg: '#f1f5f9', color: '#64748b' },
    EXPIRED:    { label: '만료됨',  bg: '#f1f5f9', color: '#64748b' },
    TERMINATED: { label: '해지됨',  bg: '#f1f5f9', color: '#64748b' },
  };

  if (loading) {
    return (
      <div style={{
        padding: 20,
        border: '1px solid #E5E7EB',
        borderTop: 'none',
        borderRadius: '0 0 8px 8px',
        backgroundColor: '#F8FAFC',
        color: '#9CA3AF',
        fontSize: '0.875rem',
      }}>
        채널 설정을 불러오는 중...
      </div>
    );
  }

  if (settings.length === 0) {
    return (
      <div style={{
        padding: 20,
        border: '1px solid #E5E7EB',
        borderTop: 'none',
        borderRadius: '0 0 8px 8px',
        backgroundColor: '#F8FAFC',
        color: '#9CA3AF',
        fontSize: '0.875rem',
      }}>
        등록된 채널이 없습니다.
      </div>
    );
  }

  return (
    <div style={{
      padding: '16px 20px',
      border: '1px solid #E5E7EB',
      borderTop: 'none',
      borderRadius: '0 0 8px 8px',
      backgroundColor: '#F8FAFC',
    }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {settings.map((ch, idx) => {
          const isApproved = ch.status === 'APPROVED';
          const statusStyle = CHANNEL_STATUS_STYLES[ch.status] || CHANNEL_STATUS_STYLES.PENDING;

          return (
            <div
              key={ch.channelId}
              style={{
                padding: '12px 16px',
                backgroundColor: '#fff',
                border: '1px solid #E5E7EB',
                borderRadius: 8,
                opacity: isApproved ? 1 : 0.6,
              }}
            >
              {/* Channel Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                <span style={{ fontWeight: 600, fontSize: '0.9rem', color: '#0F172A' }}>
                  {CHANNEL_LABELS[ch.channelType] || ch.channelType}
                </span>
                <span style={{
                  padding: '2px 8px',
                  borderRadius: 4,
                  fontSize: '0.75rem',
                  fontWeight: 500,
                  backgroundColor: statusStyle.bg,
                  color: statusStyle.color,
                }}>
                  {statusStyle.label}
                </span>
              </div>

              {!isApproved ? (
                <p style={{ margin: 0, fontSize: '0.8rem', color: '#94a3b8' }}>
                  채널 승인 후 설정 가능합니다
                </p>
              ) : (
                <div style={{ display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap' }}>
                  {/* Visibility Toggle */}
                  <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.85rem', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={ch.isVisible}
                      onChange={() => handleToggleVisible(idx)}
                      style={{ width: 16, height: 16 }}
                    />
                    노출
                  </label>

                  {/* Sales Limit */}
                  <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.85rem' }}>
                    판매 한도:
                    <input
                      type="text"
                      value={ch.salesLimit ?? ''}
                      onChange={e => handleSalesLimitChange(idx, e.target.value)}
                      placeholder="제한 없음"
                      disabled={!ch.isVisible}
                      style={{
                        width: 80,
                        padding: '4px 8px',
                        border: '1px solid #D1D5DB',
                        borderRadius: 4,
                        fontSize: '0.85rem',
                        textAlign: 'center',
                        backgroundColor: ch.isVisible ? '#fff' : '#F1F5F9',
                      }}
                    />
                  </label>

                  {/* Display Order */}
                  <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.85rem' }}>
                    정렬:
                    <input
                      type="number"
                      value={ch.displayOrder ?? 0}
                      onChange={e => handleDisplayOrderChange(idx, e.target.value)}
                      disabled={!ch.isVisible}
                      min={0}
                      style={{
                        width: 60,
                        padding: '4px 8px',
                        border: '1px solid #D1D5DB',
                        borderRadius: 4,
                        fontSize: '0.85rem',
                        textAlign: 'center',
                        backgroundColor: ch.isVisible ? '#fff' : '#F1F5F9',
                      }}
                    />
                  </label>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Save Button */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 12, gap: 8 }}>
        <button
          onClick={onClose}
          style={{
            padding: '8px 16px',
            fontSize: '0.85rem',
            border: '1px solid #D1D5DB',
            borderRadius: 6,
            backgroundColor: '#fff',
            color: '#374151',
            cursor: 'pointer',
          }}
        >
          닫기
        </button>
        <button
          onClick={handleSave}
          disabled={!dirty || saving}
          style={{
            padding: '8px 16px',
            fontSize: '0.85rem',
            border: 'none',
            borderRadius: 6,
            backgroundColor: dirty ? '#2563EB' : '#9CA3AF',
            color: '#fff',
            fontWeight: 500,
            cursor: dirty && !saving ? 'pointer' : 'not-allowed',
          }}
        >
          {saving ? '저장 중...' : '채널 설정 저장'}
        </button>
      </div>
    </div>
  );
}

/**
 * Filter Chip component
 */
function FilterChip({
  label,
  active,
  onClick,
  disabled,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        padding: '6px 14px',
        fontSize: '0.8rem',
        fontWeight: 500,
        border: active ? '1px solid #2563EB' : '1px solid #D1D5DB',
        borderRadius: 20,
        backgroundColor: active ? '#EFF6FF' : '#fff',
        color: disabled ? '#9CA3AF' : active ? '#2563EB' : '#374151',
        cursor: disabled ? 'default' : 'pointer',
        opacity: disabled ? 0.5 : 1,
      }}
    >
      {label}
    </button>
  );
}
