/**
 * ResourcesHubPage — 공동자료실 Hub
 * WO-KPA-RESOURCE-SYSTEM-RESET-V1
 *
 * 개인 자료실 시스템 제거 후 공동자료실 재설계를 위한 진입 허브.
 * 실제 기능은 WO-KPA-COMMON-RESOURCE-MINIMAL-V1 에서 구현 예정.
 */

import { BookOpen, Users, Cpu } from 'lucide-react';

const s = {
  page: {
    maxWidth: '840px',
    margin: '0 auto',
    padding: '48px 20px',
  } as React.CSSProperties,
  header: {
    marginBottom: '40px',
  } as React.CSSProperties,
  title: {
    fontSize: '26px',
    fontWeight: 700,
    color: '#111827',
    margin: '0 0 8px',
  } as React.CSSProperties,
  subtitle: {
    fontSize: '15px',
    color: '#6b7280',
    margin: 0,
  } as React.CSSProperties,
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
    gap: '16px',
  } as React.CSSProperties,
  card: {
    padding: '28px 22px',
    background: '#fff',
    border: '1px solid #e5e7eb',
    borderRadius: '12px',
    cursor: 'default',
  } as React.CSSProperties,
  iconWrap: {
    width: '44px',
    height: '44px',
    borderRadius: '10px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: '14px',
  } as React.CSSProperties,
  cardTitle: {
    fontSize: '15px',
    fontWeight: 600,
    color: '#111827',
    margin: '0 0 6px',
  } as React.CSSProperties,
  cardDesc: {
    fontSize: '13px',
    color: '#6b7280',
    margin: 0,
    lineHeight: 1.5,
  } as React.CSSProperties,
  badge: {
    display: 'inline-block',
    marginTop: '10px',
    fontSize: '11px',
    color: '#9ca3af',
    background: '#f3f4f6',
    borderRadius: '4px',
    padding: '2px 7px',
  } as React.CSSProperties,
  notice: {
    marginTop: '32px',
    padding: '16px 20px',
    background: '#f0f9ff',
    border: '1px solid #bae6fd',
    borderRadius: '10px',
    fontSize: '13px',
    color: '#0369a1',
    lineHeight: 1.6,
  } as React.CSSProperties,
};

export function ResourcesHubPage() {
  return (
    <div style={s.page}>
      <div style={s.header}>
        <h1 style={s.title}>자료실</h1>
        <p style={s.subtitle}>
          회원들이 함께 이용하는 공동자료실입니다.
        </p>
      </div>

      <div style={s.grid}>
        <div style={s.card}>
          <div style={{ ...s.iconWrap, background: '#d1fae5' }}>
            <BookOpen size={22} color="#059669" />
          </div>
          <p style={s.cardTitle}>공동자료실</p>
          <p style={s.cardDesc}>카테고리별로 분류된 공개 자료를 열람합니다</p>
          <span style={s.badge}>준비 중</span>
        </div>

        <div style={s.card}>
          <div style={{ ...s.iconWrap, background: '#dbeafe' }}>
            <Users size={22} color="#2563eb" />
          </div>
          <p style={s.cardTitle}>자료 등록</p>
          <p style={s.cardDesc}>새 자료를 등록하고 공유합니다</p>
          <span style={s.badge}>준비 중</span>
        </div>

        <div style={s.card}>
          <div style={{ ...s.iconWrap, background: '#ede9fe' }}>
            <Cpu size={22} color="#7c3aed" />
          </div>
          <p style={s.cardTitle}>AI 활용</p>
          <p style={s.cardDesc}>자료를 AI로 정리하고 가공합니다</p>
          <span style={s.badge}>준비 중</span>
        </div>
      </div>

      <div style={s.notice}>
        공동자료실 기능이 준비되고 있습니다. 곧 이용하실 수 있습니다.
      </div>
    </div>
  );
}
