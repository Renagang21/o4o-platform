/**
 * StoreLibraryPlaceholderPage — "내 자료함" 그룹 임시 페이지
 *
 * WO-O4O-KPA-STORE-SIDEBAR-MENU-RESTRUCTURE-V1
 *
 * 사이드바 "내 자료함" 그룹의 콘텐츠/강좌/자료 메뉴는 우선 메뉴만 배치하고,
 * 실제 페이지는 후속 WO(콘텐츠 기획 확정 후)에서 연결한다.
 * 본 컴포넌트는 메뉴 클릭 시 빈 화면 대신 의도가 보이도록 표시.
 */

import { Link, useParams } from 'react-router-dom';
import { Library, BookOpen, GraduationCap } from 'lucide-react';
import { colors } from '../../styles/theme';

type LibraryKind = 'contents' | 'courses' | 'resources';

const KIND_META: Record<LibraryKind, { title: string; description: string; Icon: typeof Library }> = {
  contents:  { title: '콘텐츠', description: '커뮤니티에서 가져온 문서·코스형 자료 보관함', Icon: BookOpen },
  courses:   { title: '강좌',   description: '커뮤니티에서 가져온 강좌 보관함',                Icon: GraduationCap },
  resources: { title: '자료',   description: '커뮤니티 자료실에서 가져온 자료 보관함',         Icon: Library },
};

export function StoreLibraryPlaceholderPage() {
  const { kind } = useParams<{ kind: LibraryKind }>();
  const meta = (kind && KIND_META[kind]) ?? KIND_META.contents;
  const { title, description, Icon } = meta;

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <div style={styles.iconWrap}>
          <Icon size={32} style={{ color: colors.primary }} />
        </div>
        <h1 style={styles.title}>내 자료함 · {title}</h1>
        <p style={styles.subtitle}>{description}</p>
        <div style={styles.notice}>
          <strong>준비중</strong>
          <p style={styles.noticeText}>
            매장이 커뮤니티에서 가져온 {title}을(를) 한 곳에서 관리할 수 있도록 준비하고 있습니다.
            기획 확정 후 본 페이지가 활성화됩니다.
          </p>
        </div>
        <Link to="/store" style={styles.backLink}>← 내 약국 홈으로</Link>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    padding: '40px 24px',
    display: 'flex',
    justifyContent: 'center',
  },
  card: {
    maxWidth: '520px',
    width: '100%',
    background: colors.white,
    border: `1px solid ${colors.neutral200}`,
    borderRadius: '12px',
    padding: '32px',
    textAlign: 'center',
  },
  iconWrap: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '64px',
    height: '64px',
    background: '#eef2ff',
    borderRadius: '50%',
    marginBottom: '16px',
  },
  title: {
    fontSize: '20px',
    fontWeight: 600,
    color: colors.neutral800,
    margin: '0 0 6px',
  },
  subtitle: {
    fontSize: '13px',
    color: colors.neutral500,
    margin: '0 0 20px',
  },
  notice: {
    background: '#fffbeb',
    border: '1px solid #fde68a',
    borderRadius: '8px',
    padding: '14px 16px',
    fontSize: '13px',
    color: '#92400e',
    textAlign: 'left',
  },
  noticeText: {
    margin: '6px 0 0',
    lineHeight: 1.6,
    fontSize: '12px',
  },
  backLink: {
    display: 'inline-block',
    marginTop: '20px',
    fontSize: '13px',
    color: colors.primary,
    textDecoration: 'none',
  },
};
