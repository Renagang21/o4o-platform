/**
 * GuideBackLink — Workspace → Guide 백링크 (WO-O4O-NETURE-WORKSPACE-TO-GUIDE-BACKLINK-V1)
 *
 * 실제 작업 화면에서 관련 공개 Guide(/guide/*)로 바로 이동할 수 있는 경량 텍스트 링크.
 * 신규 Guide·route 추가가 아니라 기존 Guide 로의 동선만 제공한다.
 * IR-O4O-GUIDE-REAL-WORKFLOW-VALIDATION-AUDIT-V1 판정 D 해소용.
 */
import { Link } from 'react-router-dom';

interface Props {
  /** 기존에 존재하는 /guide/* route (anchor 포함 가능). */
  to: string;
  /** 링크 라벨. 미지정 시 기본 문구. */
  label?: string;
}

export function GuideBackLink({ to, label = '이용 안내 보기' }: Props) {
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
