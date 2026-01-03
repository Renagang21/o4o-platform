/**
 * 배송 주소 입력 화면
 * Phase H8-FE: Trial Observation Frontend (H8-2 연계)
 *
 * 노출 조건: rewardType === 'product'
 * 사용 API:
 *   - POST /api/trial-shipping/:participationId
 *   - GET /api/trial-shipping/:participationId
 */

import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { submitShippingAddress, getShippingAddress, ShippingAddress } from '../api/trial';

export function ShippingAddressPage() {
  const { participationId } = useParams<{ participationId: string }>();

  const [existingAddress, setExistingAddress] = useState<ShippingAddress | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Form state
  const [form, setForm] = useState({
    recipientName: '',
    phone: '',
    postalCode: '',
    address: '',
    addressDetail: '',
    deliveryNote: '',
  });

  useEffect(() => {
    if (participationId) {
      loadExistingAddress(participationId);
    }
  }, [participationId]);

  async function loadExistingAddress(id: string) {
    try {
      setLoading(true);
      const address = await getShippingAddress(id);
      if (address) {
        setExistingAddress(address);
      }
    } catch (err: any) {
      // 주소가 없을 수 있음 - 에러가 아님
    } finally {
      setLoading(false);
    }
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!participationId) return;

    try {
      setSubmitting(true);
      setError(null);
      const result = await submitShippingAddress(participationId, {
        recipientName: form.recipientName,
        phone: form.phone,
        postalCode: form.postalCode,
        address: form.address,
        addressDetail: form.addressDetail || undefined,
        deliveryNote: form.deliveryNote || undefined,
      });
      setExistingAddress(result);
      setSuccess(true);
    } catch (err: any) {
      setError(err.message || 'Failed to submit address');
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div style={styles.container}>
        <p>로딩 중...</p>
      </div>
    );
  }

  // 이미 등록된 주소가 있는 경우
  if (existingAddress) {
    return (
      <div style={styles.container}>
        <h1 style={styles.title}>배송 주소</h1>
        {success && <p style={styles.success}>주소가 등록되었습니다!</p>}

        <div style={styles.card}>
          <p><strong>수령인:</strong> {existingAddress.recipientName}</p>
          <p><strong>연락처:</strong> {existingAddress.phone}</p>
          <p><strong>우편번호:</strong> {existingAddress.postalCode}</p>
          <p><strong>주소:</strong> {existingAddress.address}</p>
          {existingAddress.addressDetail && (
            <p><strong>상세주소:</strong> {existingAddress.addressDetail}</p>
          )}
          {existingAddress.deliveryNote && (
            <p><strong>배송 메모:</strong> {existingAddress.deliveryNote}</p>
          )}
        </div>

        <div style={styles.actions}>
          <Link to={`/fulfillment/${participationId}`} style={styles.primaryButton}>
            Fulfillment 상태 확인
          </Link>
        </div>

        <Link to="/trials" style={styles.link}>목록으로 돌아가기</Link>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <h1 style={styles.title}>배송 주소 입력</h1>
      <p style={styles.subtitle}>Participation ID: {participationId}</p>

      <form onSubmit={handleSubmit}>
        <div style={styles.formGroup}>
          <label style={styles.label}>수령인 이름 *</label>
          <input
            type="text"
            name="recipientName"
            value={form.recipientName}
            onChange={handleChange}
            required
            style={styles.input}
          />
        </div>

        <div style={styles.formGroup}>
          <label style={styles.label}>연락처 *</label>
          <input
            type="tel"
            name="phone"
            value={form.phone}
            onChange={handleChange}
            required
            placeholder="010-0000-0000"
            style={styles.input}
          />
        </div>

        <div style={styles.formGroup}>
          <label style={styles.label}>우편번호 *</label>
          <input
            type="text"
            name="postalCode"
            value={form.postalCode}
            onChange={handleChange}
            required
            placeholder="12345"
            style={styles.input}
          />
        </div>

        <div style={styles.formGroup}>
          <label style={styles.label}>주소 *</label>
          <input
            type="text"
            name="address"
            value={form.address}
            onChange={handleChange}
            required
            style={styles.input}
          />
        </div>

        <div style={styles.formGroup}>
          <label style={styles.label}>상세주소</label>
          <input
            type="text"
            name="addressDetail"
            value={form.addressDetail}
            onChange={handleChange}
            style={styles.input}
          />
        </div>

        <div style={styles.formGroup}>
          <label style={styles.label}>배송 메모</label>
          <textarea
            name="deliveryNote"
            value={form.deliveryNote}
            onChange={handleChange}
            rows={3}
            style={styles.textarea}
          />
        </div>

        {error && <p style={styles.error}>{error}</p>}

        <div style={styles.actions}>
          <button type="submit" disabled={submitting} style={styles.primaryButton}>
            {submitting ? '등록 중...' : '주소 등록'}
          </button>
        </div>
      </form>

      <Link to="/trials" style={styles.link}>목록으로 돌아가기</Link>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    padding: '20px',
    maxWidth: '500px',
    margin: '0 auto',
  },
  title: {
    fontSize: '24px',
    marginBottom: '10px',
  },
  subtitle: {
    fontSize: '14px',
    color: '#666',
    marginBottom: '20px',
  },
  card: {
    padding: '15px',
    background: '#f5f5f5',
    borderRadius: '4px',
    marginBottom: '20px',
  },
  formGroup: {
    marginBottom: '15px',
  },
  label: {
    display: 'block',
    marginBottom: '5px',
    fontWeight: 'bold',
    fontSize: '14px',
  },
  input: {
    width: '100%',
    padding: '8px',
    border: '1px solid #ddd',
    borderRadius: '4px',
    fontSize: '14px',
    boxSizing: 'border-box',
  },
  textarea: {
    width: '100%',
    padding: '8px',
    border: '1px solid #ddd',
    borderRadius: '4px',
    fontSize: '14px',
    boxSizing: 'border-box',
    resize: 'vertical',
  },
  actions: {
    marginBottom: '15px',
  },
  primaryButton: {
    display: 'inline-block',
    padding: '10px 20px',
    background: '#0066cc',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '14px',
    textDecoration: 'none',
  },
  link: {
    color: '#0066cc',
    textDecoration: 'none',
  },
  error: {
    color: '#dc3545',
    marginBottom: '10px',
  },
  success: {
    color: '#28a745',
    marginBottom: '10px',
  },
};
