/**
 * PaymentFailPage — Toss 결제 실패 페이지
 *
 * WO-O4O-KPA-CUSTOMER-COMMERCE-LOOP-V1
 *
 * 경로: /store/:slug/payment/fail
 */

import { useParams, Link } from 'react-router-dom';
import { XCircle } from 'lucide-react';

export function PaymentFailPage() {
  const { slug } = useParams<{ slug: string }>();

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
      <div style={{ textAlign: 'center', maxWidth: '400px' }}>
        <XCircle size={56} color="#dc2626" style={{ margin: '0 auto 16px' }} />
        <h2 style={{ fontSize: '24px', fontWeight: 700, color: '#0f172a', marginBottom: '8px' }}>결제에 실패했습니다</h2>
        <p style={{ fontSize: '14px', color: '#64748b', marginBottom: '32px' }}>
          결제가 취소되었거나 오류가 발생했습니다. 다시 시도해 주세요.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', alignItems: 'center' }}>
          <Link
            to={`/store/${slug}/checkout`}
            style={{ display: 'inline-block', padding: '14px 32px', backgroundColor: '#2563eb', color: '#fff', borderRadius: '10px', textDecoration: 'none', fontSize: '16px', fontWeight: 600 }}
          >
            다시 시도
          </Link>
          <Link
            to={`/store/${slug}`}
            style={{ color: '#64748b', fontSize: '14px', textDecoration: 'none' }}
          >
            매장 홈으로
          </Link>
        </div>
      </div>
    </div>
  );
}

export default PaymentFailPage;
