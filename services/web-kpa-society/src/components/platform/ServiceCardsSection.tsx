/**
 * ServiceCardsSection - 서비스 카드 그리드 섹션
 *
 * WO-KPA-HOME-FOUNDATION-V1
 * WO-KPA-HOME-REFINE-V1: 상태 표기 통일 (Available/Planned/Demo)
 * WO-KPA-HOME-EMPHASIS-V1: 직능별 카드 순서 정렬
 */

import { useMemo } from 'react';
import { ServiceCard } from './ServiceCard';
import type { PharmacistFunction } from '../../contexts/AuthContext';

interface ServiceItem {
  id: string;
  icon: string;
  title: string;
  description: string;
  href: string;
  badge: string;
}

const services: ServiceItem[] = [
  {
    id: 'signage',
    icon: '📺',
    title: 'Digital Signage',
    description: '약국용 디지털 사이니지 콘텐츠 관리',
    href: '#',
    badge: 'Available',
  },
  {
    id: 'forum',
    icon: '💬',
    title: 'Forum',
    description: '약사 직능별 정보 공유 게시판',
    href: '#',
    badge: 'Available',
  },
  {
    id: 'lms',
    icon: '📚',
    title: 'LMS',
    description: '보수교육 및 학습 관리',
    href: '#',
    badge: 'Planned',
  },
  {
    id: 'demo',
    icon: '🏛️',
    title: '약사회 SaaS',
    description: '약사회 회원·운영 관리 시스템',
    href: '/demo',
    badge: 'Demo',
  },
];

/**
 * WO-KPA-HOME-EMPHASIS-V1: 직능별 카드 우선순위
 * Demo는 항상 최하위 유지
 */
const priorityByFunction: Record<PharmacistFunction, string[]> = {
  pharmacy: ['signage', 'forum', 'lms', 'demo'],
  hospital: ['forum', 'lms', 'signage', 'demo'],
  industry: ['lms', 'forum', 'signage', 'demo'],
  other: ['forum', 'lms', 'signage', 'demo'],
};

const defaultOrder = ['signage', 'forum', 'lms', 'demo'];

function getSortedServices(fn: PharmacistFunction | null): ServiceItem[] {
  const order = fn ? priorityByFunction[fn] : defaultOrder;
  return [...services].sort((a, b) => order.indexOf(a.id) - order.indexOf(b.id));
}

function getStoredFunction(): PharmacistFunction | null {
  // localStorage에서 직능 불러오기 (간단한 방식)
  const keys = Object.keys(localStorage);
  const fnKey = keys.find(k => k.startsWith('kpa_function_'));
  if (fnKey) {
    const value = localStorage.getItem(fnKey);
    if (value && ['pharmacy', 'hospital', 'industry', 'other'].includes(value)) {
      return value as PharmacistFunction;
    }
  }
  return null;
}

export function ServiceCardsSection() {
  const sortedServices = useMemo(() => {
    const fn = getStoredFunction();
    return getSortedServices(fn);
  }, []);

  return (
    <section id="services" style={styles.section}>
      <div style={styles.container}>
        <h2 style={styles.sectionTitle}>서비스</h2>
        <p style={styles.sectionSubtitle}>
          약사 직능을 위한 공동 플랫폼 서비스
        </p>
        <div style={styles.grid}>
          {sortedServices.map((service) => (
            <ServiceCard key={service.id} {...service} />
          ))}
        </div>
      </div>
    </section>
  );
}

const styles: Record<string, React.CSSProperties> = {
  section: {
    padding: '64px 24px',
    backgroundColor: '#f8fafc',
  },
  container: {
    maxWidth: '1000px',
    margin: '0 auto',
  },
  sectionTitle: {
    fontSize: '1.75rem',
    fontWeight: 700,
    color: '#0f172a',
    textAlign: 'center',
    margin: '0 0 8px 0',
  },
  sectionSubtitle: {
    fontSize: '1rem',
    color: '#64748b',
    textAlign: 'center',
    margin: '0 0 40px 0',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
    gap: '24px',
  },
};

export default ServiceCardsSection;
