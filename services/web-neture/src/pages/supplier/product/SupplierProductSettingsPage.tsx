/**
 * SupplierProductSettingsPage - 공급자 제품 설정
 *
 * 유통 채널 설정:
 * - 서비스 유통 (기존)
 * - B2B 조달 유통 (신규)
 *
 * 원칙:
 * - 서비스 유통 ≠ B2B 유통 (가격/노출/주문 분리)
 * - B2B 조달은 서비스 참여 여부와 무관
 */

import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import type { Product, B2BDistributionSettings } from '../../../types';

// Mock 상품 데이터
const mockProduct: Product = {
  id: 'prod-1',
  name: '기초 보습 크림 (업소용)',
  description: '대용량 보습 크림 500ml',
  categoryId: 'cosmetics',
  supplierId: 'sup-1',
  supplierName: '코스메틱팜',
  requiredBuyerTypes: ['general', 'pharmacy', 'medical'],
  taxType: 'taxable',
  minOrderQty: 10,
  unit: '개',
  contentIds: ['content-1'],
  serviceDistribution: true,
  b2bDistribution: {
    enabled: false,
  },
};

export function SupplierProductSettingsPage() {
  const { productId } = useParams<{ productId: string }>();

  // TODO: productId로 실제 상품 조회
  const product = productId ? mockProduct : mockProduct;

  // 서비스 유통 설정 (기존)
  const [serviceDistribution, setServiceDistribution] = useState(product.serviceDistribution);

  // B2B 유통 설정
  const [b2bEnabled, setB2bEnabled] = useState(product.b2bDistribution?.enabled ?? false);
  const [b2bPrice, setB2bPrice] = useState<string>(
    product.b2bDistribution?.b2bPrice?.toString() ?? ''
  );
  const [b2bMinOrderQty, setB2bMinOrderQty] = useState<string>(
    product.b2bDistribution?.b2bMinOrderQty?.toString() ?? product.minOrderQty.toString()
  );

  const handleSave = () => {
    const settings: B2BDistributionSettings = {
      enabled: b2bEnabled,
      b2bPrice: b2bEnabled && b2bPrice ? Number(b2bPrice) : undefined,
      b2bMinOrderQty: b2bEnabled && b2bMinOrderQty ? Number(b2bMinOrderQty) : undefined,
    };

    console.log('저장:', { serviceDistribution, b2bDistribution: settings });
    alert('설정이 저장되었습니다.');
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <Link to="/supplier/products" style={styles.backLink}>
          ← 상품 목록
        </Link>
        <h1 style={styles.title}>{product.name}</h1>
        <p style={styles.subtitle}>유통 채널 설정</p>
      </div>

      {/* 서비스 유통 설정 (기존) */}
      <div style={styles.section}>
        <h2 style={styles.sectionTitle}>서비스 유통</h2>
        <p style={styles.sectionDesc}>
          Neture 서비스 내 Trial 및 콘텐츠 연동에 사용됩니다.
        </p>
        <label style={styles.checkboxLabel}>
          <input
            type="checkbox"
            checked={serviceDistribution}
            onChange={(e) => setServiceDistribution(e.target.checked)}
            style={styles.checkbox}
          />
          <span>서비스 유통 활성화</span>
        </label>
      </div>

      {/* B2B 조달 유통 설정 */}
      <div style={styles.section}>
        <h2 style={styles.sectionTitle}>B2B 조달 유통</h2>
        <div style={styles.infoBox}>
          <span style={styles.infoIcon}>ℹ️</span>
          <span style={styles.infoText}>
            B2B 조달은 서비스 참여 여부와 무관한 사업자 대상 공급입니다.
          </span>
        </div>

        <label style={styles.checkboxLabel}>
          <input
            type="checkbox"
            checked={b2bEnabled}
            onChange={(e) => setB2bEnabled(e.target.checked)}
            style={styles.checkbox}
          />
          <span>B2B에 공급함</span>
        </label>

        {b2bEnabled && (
          <div style={styles.b2bSettings}>
            <div style={styles.inputGroup}>
              <label style={styles.inputLabel}>B2B 공급가 (원)</label>
              <input
                type="number"
                value={b2bPrice}
                onChange={(e) => setB2bPrice(e.target.value)}
                placeholder="B2B 전용 공급가를 입력하세요"
                style={styles.input}
              />
              <span style={styles.inputHint}>
                서비스 유통 가격과 별도로 설정됩니다.
              </span>
            </div>

            <div style={styles.inputGroup}>
              <label style={styles.inputLabel}>B2B 최소 주문 수량 ({product.unit})</label>
              <input
                type="number"
                value={b2bMinOrderQty}
                onChange={(e) => setB2bMinOrderQty(e.target.value)}
                placeholder={`기본값: ${product.minOrderQty}`}
                style={styles.input}
              />
            </div>
          </div>
        )}
      </div>

      {/* 저장 버튼 */}
      <div style={styles.actions}>
        <button style={styles.saveButton} onClick={handleSave}>
          설정 저장
        </button>
      </div>
    </div>
  );
}

const PRIMARY_COLOR = '#2563EB';

const styles: Record<string, React.CSSProperties> = {
  container: {
    maxWidth: '600px',
    margin: '0 auto',
    padding: '40px 20px',
  },
  header: {
    marginBottom: '32px',
  },
  backLink: {
    fontSize: '14px',
    color: '#64748b',
    textDecoration: 'none',
    display: 'inline-block',
    marginBottom: '12px',
  },
  title: {
    fontSize: '24px',
    fontWeight: 700,
    color: '#0f172a',
    margin: '0 0 8px 0',
  },
  subtitle: {
    fontSize: '15px',
    color: '#64748b',
    margin: 0,
  },
  section: {
    marginBottom: '32px',
    padding: '24px',
    backgroundColor: '#fff',
    borderRadius: '12px',
    border: '1px solid #e2e8f0',
  },
  sectionTitle: {
    fontSize: '16px',
    fontWeight: 600,
    color: '#0f172a',
    margin: '0 0 8px 0',
  },
  sectionDesc: {
    fontSize: '14px',
    color: '#64748b',
    margin: '0 0 16px 0',
  },
  infoBox: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '8px',
    padding: '12px 16px',
    backgroundColor: '#f0f9ff',
    borderRadius: '8px',
    marginBottom: '16px',
  },
  infoIcon: {
    fontSize: '16px',
  },
  infoText: {
    fontSize: '13px',
    color: '#0369a1',
    lineHeight: 1.5,
  },
  checkboxLabel: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    fontSize: '14px',
    color: '#0f172a',
    cursor: 'pointer',
  },
  checkbox: {
    width: '18px',
    height: '18px',
    cursor: 'pointer',
  },
  b2bSettings: {
    marginTop: '20px',
    paddingTop: '20px',
    borderTop: '1px solid #e2e8f0',
  },
  inputGroup: {
    marginBottom: '16px',
  },
  inputLabel: {
    display: 'block',
    fontSize: '14px',
    fontWeight: 500,
    color: '#374151',
    marginBottom: '6px',
  },
  input: {
    width: '100%',
    padding: '12px 14px',
    fontSize: '14px',
    border: '1px solid #d1d5db',
    borderRadius: '8px',
    outline: 'none',
    boxSizing: 'border-box',
  },
  inputHint: {
    display: 'block',
    fontSize: '12px',
    color: '#94a3b8',
    marginTop: '4px',
  },
  actions: {
    marginTop: '24px',
  },
  saveButton: {
    width: '100%',
    padding: '14px',
    backgroundColor: PRIMARY_COLOR,
    color: '#fff',
    fontSize: '15px',
    fontWeight: 600,
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
  },
};
