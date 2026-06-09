/**
 * GuideBackLink — Workspace → Guide 백링크 (WO-O4O-STORE-WORKSPACE-GUIDE-BACKLINK-V2)
 *
 * 매장 작업 화면에서 해당 기능의 이용 방법 Guide(/guide/features/*)로 바로 이동하는
 * 경량 텍스트 링크. 신규 Guide·route 추가가 아니라 기존 Guide 로의 동선만 제공한다.
 * 주요 작업 버튼보다 약하게 보이도록 보조 링크 스타일로 둔다.
 *
 * KPA / GlycoPharm / K-Cosmetics 3개 store 서비스 공통 — 각 서비스의 실제 Guide route 만 연결한다.
 */
import { Link } from 'react-router-dom';

export interface GuideBackLinkProps {
  /** 기존에 존재하는 /guide/* route (anchor 포함 가능). */
  to: string;
  /** 링크 라벨. 미지정 시 기본 문구. */
  label?: string;
}

export function GuideBackLink({ to, label = '이용 방법 보기' }: GuideBackLinkProps) {
  return (
    <Link
      to={to}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 4,
        fontSize: 13,
        color: '#2563eb',
        textDecoration: 'none',
        whiteSpace: 'nowrap',
      }}
    >
      📘 {label} →
    </Link>
  );
}
