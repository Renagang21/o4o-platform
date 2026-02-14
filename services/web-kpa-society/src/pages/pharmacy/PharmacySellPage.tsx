/**
 * PharmacySellPage - 약국 상품 판매 관리
 *
 * WO-PHARMACY-PRODUCT-LISTING-APPROVAL-PHASE1-V1
 *
 * 두 개 탭:
 * 1. 판매 등록 신청 — 상품 판매 신청 및 신청 내역 확인
 * 2. 내 매장 진열 상품 — 승인된 상품의 매장 진열 관리
 */

import { useState, useEffect, useCallback } from 'react';
import {
  applyProduct,
  getApplications,
  getListings,
  updateListing,
} from '../../api/pharmacyProducts';
import type { ProductApplication, ProductListing } from '../../api/pharmacyProducts';

type TabId = 'applications' | 'listings';

const STATUS_LABELS: Record<string, { text: string; color: string; bg: string }> = {
  pending: { text: '심사 중', color: '#B45309', bg: '#FEF3C7' },
  approved: { text: '승인', color: '#047857', bg: '#D1FAE5' },
  rejected: { text: '거절', color: '#DC2626', bg: '#FEE2E2' },
};

export function PharmacySellPage() {
  const [activeTab, setActiveTab] = useState<TabId>('applications');

  return (
    <div style={{ maxWidth: 960, margin: '0 auto', padding: '32px 16px' }}>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <a href="/pharmacy/hub" style={{ color: '#6B7280', textDecoration: 'none', fontSize: '0.875rem' }}>
          ← 약국 운영 허브
        </a>
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
                    ID: {app.external_product_id} · {new Date(app.requested_at).toLocaleDateString('ko-KR')}
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
  const [listings, setListings] = useState<ProductListing[]>([]);
  const [loading, setLoading] = useState(true);

  const loadListings = useCallback(async () => {
    try {
      setLoading(true);
      const result = await getListings();
      setListings(result.data || []);
    } catch (e: any) {
      console.error('Failed to load listings:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadListings();
  }, [loadListings]);

  const handleToggleActive = async (listing: ProductListing) => {
    try {
      await updateListing(listing.id, { isActive: !listing.is_active });
      await loadListings();
    } catch (e: any) {
      console.error('Failed to toggle listing:', e);
    }
  };

  return (
    <div>
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
            <div
              key={listing.id}
              style={{
                padding: '16px 20px',
                border: '1px solid #E5E7EB',
                borderRadius: 8,
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
          ))}
        </div>
      )}
    </div>
  );
}
