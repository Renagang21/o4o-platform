import { Link } from 'react-router-dom';
import { BRAND } from '../config/service';

export default function HomePage() {
  return (
    <div className="page">
      <div className="hero">
        <span className="eyebrow">Neture · Hospital Pharmacy</span>
        <h1>{BRAND.name}</h1>
        <p className="muted">{BRAND.tagline}. 원내 보유 약품 확인, 동일성분·대체약 조사, 성분·주의사항 조사를 한 화면에서. 원내 목록은 이 브라우저에만 저장되고 환자 정보는 다루지 않습니다.</p>
      </div>
      <div className="cards">
        <Link to="/ward" className="tile">
          <h3>병동 — 자연어 조사</h3>
          <p>"타이레놀정 효능 조사", "우리 원내에 아세트아미노펜 있어?", "아모디핀정과 같은 성분 원내약 있어?" 처럼 물으면 조사 결과와 원내 보유 현황을 함께 확인합니다.</p>
        </Link>
        <Link to="/pharmacy" className="tile">
          <h3>약제부 — 원내 목록 연결</h3>
          <p>원내 보유 목록(xlsx·xls·csv)을 올리면 공통 파일 이해가 표 구조를 해석해 이 브라우저에 원내 데이터로 연결합니다. 이후 병동 조회가 원내 보유를 함께 답합니다.</p>
        </Link>
      </div>
    </div>
  );
}
