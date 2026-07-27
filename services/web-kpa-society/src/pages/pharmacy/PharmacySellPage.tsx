/**
 * PharmacySellPage - 약국 상품 진열 관리
 *
 * WO-PHARMACY-PRODUCT-LISTING-APPROVAL-PHASE1-V1
 * WO-PHARMACY-PRODUCT-CHANNEL-MANAGEMENT-V1 (채널 설정, 필터)
 * WO-O4O-KPA-LEGACY-MANUAL-PRODUCT-APPLICATION-REMOVE-AND-LISTING-MANAGEMENT-PRESERVE-V1:
 *   깨진 구형 수동 판매 신청(externalProductId 자유입력 → 항상 400) 탭 제거.
 *   진열 관리·채널 설정 편집기(탭2)만 보존해 단일 목적 화면으로 축소.
 *   새 상품 추가는 매장 HUB 카탈로그(/store-hub/b2b · applyBySupplyProductId)로 일원화.
 */

import { useState, useEffect, useCallback } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  getListings,
  updateListing,
  getListingChannels,
  updateListingChannels,
} from '../../api/pharmacyProducts';
import type { ProductListing, ListingChannelSetting } from '../../api/pharmacyProducts';
import { fetchChannelOverview } from '../../api/storeHub';
import type { ChannelOverview, ChannelType } from '../../api/storeHub';

const CHANNEL_LABELS: Record<string, string> = {
  B2C: '온라인 스토어',
  KIOSK: '키오스크',
  TABLET: '태블릿',
  SIGNAGE: '사이니지',
};

const SERVICE_KEY_LABELS: Record<string, { text: string; color: string; bg: string }> = {
  kpa: { text: 'B2B', color: '#2563EB', bg: '#DBEAFE' },
  'kpa-groupbuy': { text: '이벤트', color: '#7C3AED', bg: '#EDE9FE' },
  cosmetics: { text: '화장품', color: '#DB2777', bg: '#FCE7F3' },
  glycopharm: { text: '혈당관리', color: '#059669', bg: '#D1FAE5' },
};

// WO-O4O-KPA-STORE-SILENT-ERROR-UX-STANDARDIZATION-V1:
//   기존 actionError 배너와 같은 인라인 오류 스타일(신규 디자인 시스템 도입 없음).
const INLINE_ERROR_BOX: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: 12,
  marginBottom: 16,
  padding: '10px 14px',
  borderRadius: 8,
  border: '1px solid #FECACA',
  backgroundColor: '#FEF2F2',
  color: '#991B1B',
  fontSize: '0.85rem',
};

const INLINE_ERROR_BTN: React.CSSProperties = {
  flexShrink: 0,
  border: '1px solid #FCA5A5',
  borderRadius: 6,
  backgroundColor: '#fff',
  color: '#991B1B',
  fontSize: '0.8rem',
  padding: '4px 12px',
  cursor: 'pointer',
};

export function PharmacySellPage() {
  return (
    <div style={{ maxWidth: 960, margin: '0 auto', padding: '32px 16px' }}>
      {/* Header */}
      <div style={{ marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16, flexWrap: 'wrap' }}>
        <div>
          <Link to="/store/products" style={{ color: '#6B7280', textDecoration: 'none', fontSize: '0.875rem' }}>
            &larr; 상품 관리
          </Link>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 700, color: '#0F172A', margin: '8px 0 4px' }}>
            상품 진열 관리
          </h1>
          <p style={{ color: '#64748B', fontSize: '0.95rem' }}>
            취급 중인 상품의 매장 진열과 채널별 노출을 관리합니다. 새 상품은 매장 HUB 카탈로그에서 추가하세요.
          </p>
        </div>
        <Link
          to="/store-hub/b2b"
          style={{
            padding: '10px 20px',
            backgroundColor: '#2563EB',
            color: '#fff',
            borderRadius: 6,
            fontSize: '0.9rem',
            fontWeight: 500,
            textDecoration: 'none',
            whiteSpace: 'nowrap',
          }}
        >
          + HUB에서 상품 추가
        </Link>
      </div>

      <ListingsTab />
    </div>
  );
}

/**
 * 내 매장 진열 상품 — 승인된 상품의 매장 진열 관리 + 채널 설정
 */
function ListingsTab() {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialChannel = (searchParams.get('channel') as ChannelType | null) || 'ALL';

  const [listings, setListings] = useState<ProductListing[]>([]);
  const [channels, setChannels] = useState<ChannelOverview[]>([]);
  const [loading, setLoading] = useState(true);
  const [channelFilter, setChannelFilter] = useState<ChannelType | 'ALL'>(initialChannel);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  // WO-O4O-KPA-STORE-SILENT-ERROR-UX-STANDARDIZATION-V1:
  //   조회 실패가 console 에만 남고 "진열 상품이 없습니다" 빈 상태로 보이던 문제 수정.
  //   핵심(상품 목록) 실패 = 페이지 오류 상태 / 보조(채널 개요) 실패 = 인라인 안내로 분리한다.
  const [listingsError, setListingsError] = useState<string | null>(null);
  const [channelsError, setChannelsError] = useState<string | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const updateChannelFilter = useCallback((value: ChannelType | 'ALL') => {
    setChannelFilter(value);
    if (value === 'ALL') {
      setSearchParams(prev => { prev.delete('channel'); return prev; }, { replace: true });
    } else {
      setSearchParams(prev => { prev.set('channel', value); return prev; }, { replace: true });
    }
  }, [setSearchParams]);

  const loadData = useCallback(async () => {
    setLoading(true);
    setListingsError(null);
    setChannelsError(null);
    // Promise.all 은 한쪽 실패로 둘 다 버려지므로, 필수/보조 실패를 분리하기 위해 allSettled 사용.
    const [listingsResult, channelsResult] = await Promise.allSettled([
      getListings(),
      fetchChannelOverview(),
    ]);

    if (listingsResult.status === 'fulfilled') {
      setListings(listingsResult.value.data || []);
    } else {
      // 실패 시 기존 목록을 지우지 않는다(재조회 실패면 직전 목록 유지).
      console.error('Failed to load listings:', listingsResult.reason);
      setListingsError('판매 상품 정보를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.');
    }

    if (channelsResult.status === 'fulfilled') {
      setChannels(channelsResult.value || []);
    } else {
      console.error('Failed to load channel overview:', channelsResult.reason);
      setChannelsError('채널 정보를 불러오지 못했습니다. 채널 필터가 표시되지 않을 수 있습니다.');
    }

    setLoading(false);
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleToggleActive = async (listing: ProductListing) => {
    if (togglingId) return; // 중복 제출 방지
    setTogglingId(listing.id);
    try {
      setActionError(null);
      // WO-O4O-KPA-LISTING-CHANNEL-UPDATE-404-MINIMAL-FIX-V1:
      //   백엔드는 { id, organization_id, service_key } 로 row 를 지목하며 미전달 시 'kpa-society' 기본값.
      //   진열 row 는 한 매장 안에서도 service_key 가 복수(neture/kpa/kpa-groupbuy…)이므로 실제 값을 보낸다.
      await updateListing(listing.id, {
        isActive: !listing.is_active,
        service_key: listing.service_key,
      });
      await loadData();
    } catch (e: any) {
      // 실패 시 loadData 를 호출하지 않아 기존 진열 상태가 그대로 유지된다.
      console.error('Failed to toggle listing:', e);
      setActionError(e?.message || '진열 상태를 변경하지 못했습니다.');
    } finally {
      setTogglingId(null);
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

      {actionError && (
        <div style={{
          marginBottom: 16,
          padding: '10px 14px',
          borderRadius: 8,
          border: '1px solid #FECACA',
          backgroundColor: '#FEF2F2',
          color: '#991B1B',
          fontSize: '0.85rem',
        }}>
          {actionError}
        </div>
      )}

      {/* 재조회 실패인데 기존 목록이 남아 있는 경우 — 목록 유지 + 안내·재시도 */}
      {!loading && listingsError && listings.length > 0 && (
        <div style={INLINE_ERROR_BOX}>
          <span>최신 판매 상품 정보를 불러오지 못했습니다. 아래는 마지막으로 불러온 내용입니다.</span>
          <button type="button" onClick={() => void loadData()} style={INLINE_ERROR_BTN}>다시 시도</button>
        </div>
      )}

      {/* WO-O4O-KPA-STORE-SILENT-ERROR-UX-STANDARDIZATION-V1: 보조 데이터(채널) 실패 — 상품 목록은 유지 */}
      {!loading && channelsError && (
        <div style={INLINE_ERROR_BOX}>
          <span>{channelsError}</span>
          <button type="button" onClick={() => void loadData()} style={INLINE_ERROR_BTN}>다시 시도</button>
        </div>
      )}

      {loading ? (
        <div style={{ textAlign: 'center', padding: 40, color: '#9CA3AF' }}>불러오는 중...</div>
      ) : listingsError && listings.length === 0 ? (
        /* 핵심 데이터 실패 + 표시할 목록 없음 → 오류 상태. "진열 상품이 없습니다" 와 구분한다. */
        <div style={{
          textAlign: 'center',
          padding: 60,
          backgroundColor: '#FEF2F2',
          border: '1px solid #FECACA',
          borderRadius: 8,
        }}>
          <p style={{ fontSize: '1.05rem', fontWeight: 600, color: '#991B1B' }}>
            판매 상품 정보를 불러오지 못했습니다.
          </p>
          <p style={{ fontSize: '0.875rem', marginTop: 8, color: '#B91C1C' }}>잠시 후 다시 시도해 주세요.</p>
          <button
            type="button"
            onClick={() => void loadData()}
            style={{ ...INLINE_ERROR_BTN, marginTop: 16, padding: '8px 18px', fontSize: '0.875rem' }}
          >
            다시 시도
          </button>
        </div>
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
            매장 HUB 카탈로그에서 상품을 추가하면 여기에 표시됩니다.
          </p>
          <Link
            to="/store-hub/b2b"
            style={{
              display: 'inline-block',
              marginTop: 16,
              padding: '8px 18px',
              backgroundColor: '#2563EB',
              color: '#fff',
              borderRadius: 6,
              fontSize: '0.85rem',
              fontWeight: 500,
              textDecoration: 'none',
            }}
          >
            HUB에서 상품 추가
          </Link>
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
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                    <span style={{ fontWeight: 600, color: '#0F172A' }}>
                      {listing.product_name}
                    </span>
                    {listing.service_key && SERVICE_KEY_LABELS[listing.service_key] && (
                      <span style={{
                        padding: '2px 8px',
                        borderRadius: 4,
                        fontSize: '0.7rem',
                        fontWeight: 500,
                        color: SERVICE_KEY_LABELS[listing.service_key].color,
                        backgroundColor: SERVICE_KEY_LABELS[listing.service_key].bg,
                      }}>
                        {SERVICE_KEY_LABELS[listing.service_key].text}
                      </span>
                    )}
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
                    disabled={togglingId !== null}
                    style={{
                      padding: '6px 14px',
                      fontSize: '0.8rem',
                      border: '1px solid #D1D5DB',
                      borderRadius: 6,
                      backgroundColor: '#fff',
                      cursor: togglingId !== null ? 'not-allowed' : 'pointer',
                      opacity: togglingId !== null ? 0.6 : 1,
                      color: '#374151',
                    }}
                  >
                    {togglingId === listing.id
                      ? '변경 중...'
                      : listing.is_active ? '비활성화' : '활성화'}
                  </button>
                </div>
              </div>

              {/* Channel Settings Panel */}
              {expandedId === listing.id && (
                <ChannelSettingsPanel
                  listingId={listing.id}
                  serviceKey={listing.service_key}
                  onClose={() => setExpandedId(null)}
                />
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
function ChannelSettingsPanel({
  listingId,
  serviceKey,
  onClose,
}: {
  listingId: string;
  serviceKey?: string;
  onClose: () => void;
}) {
  const [settings, setSettings] = useState<ListingChannelSetting[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [saveResult, setSaveResult] = useState<{ ok: boolean; message: string } | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setLoadError(null);
    // WO-O4O-KPA-LISTING-CHANNEL-UPDATE-404-MINIMAL-FIX-V1: row 의 실제 service_key 로 지목
    getListingChannels(listingId, serviceKey)
      .then(result => {
        if (cancelled) return;
        setSettings(result.data || []);
        setLoading(false);
      })
      .catch((e: any) => {
        if (cancelled) return;
        console.error('Failed to load channel settings:', e);
        setLoadError(e?.message || '채널 설정을 불러오지 못했습니다.');
        setLoading(false);
      });
    return () => { cancelled = true; };
  }, [listingId, serviceKey]);

  const handleToggleVisible = (idx: number) => {
    setSettings(prev => prev.map((s, i) =>
      i === idx ? { ...s, isVisible: !s.isVisible } : s
    ));
    setDirty(true);
    setSaveResult(null);
  };

  const handleSalesLimitChange = (idx: number, value: string) => {
    const parsed = value === '' ? null : parseInt(value, 10);
    if (parsed !== null && (isNaN(parsed) || parsed <= 0)) return;
    setSettings(prev => prev.map((s, i) =>
      i === idx ? { ...s, salesLimit: parsed } : s
    ));
    setDirty(true);
    setSaveResult(null);
  };

  const handleDisplayOrderChange = (idx: number, value: string) => {
    const parsed = parseInt(value, 10);
    if (isNaN(parsed) || parsed < 0) return;
    setSettings(prev => prev.map((s, i) =>
      i === idx ? { ...s, displayOrder: parsed } : s
    ));
    setDirty(true);
    setSaveResult(null);
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setSaveResult(null);
      // WO-O4O-KPA-LISTING-CHANNEL-UPDATE-404-MINIMAL-FIX-V1: row 의 실제 service_key 로 지목
      await updateListingChannels(
        listingId,
        settings.map(s => ({
          channelId: s.channelId,
          isVisible: s.isVisible,
          salesLimit: s.salesLimit,
          displayOrder: s.displayOrder ?? 0,
        })),
        serviceKey
      );
      setDirty(false);
      setSaveResult({ ok: true, message: '채널 설정을 저장했습니다.' });
    } catch (e: any) {
      console.error('Failed to save channel settings:', e);
      setSaveResult({ ok: false, message: e?.message || '채널 설정을 저장하지 못했습니다.' });
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

  if (loadError) {
    return (
      <div style={{
        padding: 20,
        border: '1px solid #FECACA',
        borderTop: 'none',
        borderRadius: '0 0 8px 8px',
        backgroundColor: '#FEF2F2',
        color: '#991B1B',
        fontSize: '0.875rem',
      }}>
        {loadError}
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
                <>
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

                  {/* TABLET → 태블릿 진열 연결 안내 (WO-STORE-SELL-LISTINGS-TABLET-LINK-V1) */}
                  {ch.channelType === 'TABLET' && (
                    <div style={{
                      marginTop: 8,
                      fontSize: '0.78rem',
                      color: '#64748b',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 4,
                      flexWrap: 'wrap',
                    }}>
                      <span>노출 여부는 여기서 설정합니다. 디바이스별 배치는</span>
                      <Link
                        to="/store/commerce/tablet-displays"
                        style={{ color: '#4F46E5', fontWeight: 500, textDecoration: 'underline', whiteSpace: 'nowrap' }}
                      >
                        태블릿 진열
                      </Link>
                      <span>에서 관리합니다.</span>
                    </div>
                  )}
                </>
              )}
            </div>
          );
        })}
      </div>

      {/* Save Button */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', marginTop: 12, gap: 8 }}>
        {saveResult && (
          <span style={{
            marginRight: 'auto',
            fontSize: '0.82rem',
            fontWeight: 500,
            color: saveResult.ok ? '#047857' : '#991B1B',
          }}>
            {saveResult.message}
          </span>
        )}
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
